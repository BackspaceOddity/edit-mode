'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEditMode } from './context';

/**
 * Visual Edit mode: hover to highlight elements, click to select, type a prompt.
 * Uses a full-viewport overlay (z-index 9998) so the toolbar (z-index 9999) sits
 * above it and receives clicks naturally — no capture-phase interception needed.
 *
 * Styling: BSO cream / accent-green / Inter / JetBrains Mono. Consistent with
 * host app's design system. Styles inlined so the package stays CSS-free.
 */

// BSO palette tokens (inlined — package ships zero CSS)
const C = {
  bg: '#FAF9F6',
  bgSecondary: '#F1EFE9',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9A9A9A',
  borderDefault: '#E5E3DC',
  borderStrong: '#CFCCC2',
  accent: '#4A7C5E',
  accentSoft: '#E8F0EA',
  accentHover: '#3D6A4E',
  accentBorder: '#C4D8C9',
  danger: '#A04A3C',
};

const FONT_SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const FONT_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export function VisualEditPicker() {
  const { isVisualMode, addVisualEdit, visualEdits, removeVisualEdit, updateVisualEdit } =
    useEditMode();

  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [prompt, setPrompt] = useState('');
  const [flash, setFlash] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Autosize helper — grows textarea with content up to maxHeight.
  const autosize = useCallback((el: HTMLTextAreaElement | null, max = 180) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, []);

  useEffect(() => {
    autosize(inputRef.current);
  }, [prompt, autosize]);

  useEffect(() => {
    autosize(editInputRef.current);
  }, [editingText, autosize]);

  // Hide overlay briefly to hit-test the element underneath, then restore.
  const getUnderlyingEl = useCallback((x: number, y: number): HTMLElement | null => {
    const overlay = overlayRef.current;
    if (!overlay) return null;
    overlay.style.display = 'none';
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    overlay.style.display = 'block';
    return el;
  }, []);

  const handleOverlayMove = useCallback(
    (e: React.MouseEvent) => {
      if (selectedEl) return;
      const el = getUnderlyingEl(e.clientX, e.clientY);
      if (!el || el.closest('[data-visual-picker]') || el.closest('[data-edit-toolbar]')) {
        setHoveredRect(null);
        return;
      }
      setHoveredRect(el.getBoundingClientRect());
    },
    [selectedEl, getUnderlyingEl],
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (selectedEl) return;
      const el = getUnderlyingEl(e.clientX, e.clientY);
      if (!el || el.closest('[data-visual-picker]') || el.closest('[data-edit-toolbar]')) return;
      setSelectedEl(el);
      setSelectedRect(el.getBoundingClientRect());
      setHoveredRect(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [selectedEl, getUnderlyingEl],
  );

  const handleOverlayLeave = useCallback(() => {
    setHoveredRect(null);
  }, []);

  // ── Build element context for the selected element ──
  const captureContext = useCallback((el: HTMLElement) => {
    let component = '';
    let current: HTMLElement | null = el;
    while (current) {
      if (current.dataset?.component) {
        component = current.dataset.component;
        break;
      }
      current = current.parentElement;
    }

    const selectorParts: string[] = [];
    let node: HTMLElement | null = el;
    while (node && node !== document.body && selectorParts.length < 5) {
      let sel = node.tagName.toLowerCase();
      if (node.id) sel += `#${node.id}`;
      else if (node.className && typeof node.className === 'string') {
        const cls = node.className
          .split(/\s+/)
          .filter((c) => c && !c.startsWith('__'))
          .slice(0, 3);
        if (cls.length) sel += '.' + cls.join('.');
      }
      selectorParts.unshift(sel);
      node = node.parentElement;
    }

    const computed = window.getComputedStyle(el);
    const styles: Record<string, string> = {};
    const props = [
      'color',
      'background-color',
      'font-size',
      'font-weight',
      'padding',
      'margin',
      'border-radius',
      'display',
      'gap',
      'width',
      'height',
      'max-width',
    ];
    for (const prop of props) {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== '0px' && val !== 'normal' && val !== 'none') {
        styles[prop] = val;
      }
    }

    return {
      component,
      tag: el.tagName.toLowerCase(),
      className: (typeof el.className === 'string' ? el.className : '').trim().slice(0, 300),
      textContent: (el.textContent || '').trim().slice(0, 200),
      selector: selectorParts.join(' > '),
      styles,
    };
  }, []);

  const handleSubmit = () => {
    if (!selectedEl || !prompt.trim()) return;
    addVisualEdit({ prompt: prompt.trim(), element: captureContext(selectedEl) });
    setFlash('Saved');
    setTimeout(() => setFlash(''), 2000);
    setSelectedEl(null);
    setSelectedRect(null);
    setPrompt('');
  };

  const cancelSelection = () => {
    setSelectedEl(null);
    setSelectedRect(null);
    setPrompt('');
  };

  const startEditing = (id: string, currentPrompt: string) => {
    setEditingId(id);
    setEditingText(currentPrompt);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const saveEditing = () => {
    if (!editingId) return;
    updateVisualEdit(editingId, editingText);
    setEditingId(null);
    setEditingText('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  if (!isVisualMode) return null;

  const pendingEdits = visualEdits.filter((e) => e.status === 'pending');

  // Shared textarea keydown — Enter submits, Shift+Enter inserts newline.
  const makeKeyHandler =
    (onSubmit: () => void, onCancel: () => void) =>
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      // Shift+Enter → default behavior (insert \n), fall through
    };

  const textareaBaseStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    border: `1px solid ${C.borderDefault}`,
    borderRadius: 8,
    outline: 'none',
    fontSize: 14,
    lineHeight: '20px',
    fontFamily: FONT_SANS,
    background: C.bg,
    color: C.textPrimary,
    resize: 'none' as const,
    minHeight: 36,
    maxHeight: 180,
    overflow: 'auto' as const,
  };

  const btnPrimary = (enabled: boolean): React.CSSProperties => ({
    height: 36,
    padding: '0 16px',
    borderRadius: 8,
    border: `1px solid ${enabled ? C.accent : C.borderDefault}`,
    background: enabled ? C.accent : C.bgSecondary,
    color: enabled ? '#FFFFFF' : C.textMuted,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: FONT_SANS,
    whiteSpace: 'nowrap' as const,
  });

  const btnSecondary: React.CSSProperties = {
    height: 36,
    width: 36,
    padding: 0,
    borderRadius: 8,
    border: `1px solid ${C.borderDefault}`,
    background: 'transparent',
    color: C.textSecondary,
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: FONT_MONO,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return createPortal(
    <div data-visual-picker="true">
      {/* ── Full-viewport overlay ── */}
      {!selectedEl && (
        <div
          ref={overlayRef}
          onMouseMove={handleOverlayMove}
          onClick={handleOverlayClick}
          onMouseLeave={handleOverlayLeave}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            cursor: 'crosshair',
            background: 'transparent',
          }}
        />
      )}

      {/* ── Hover highlight ── */}
      {hoveredRect && !selectedEl && (
        <div
          style={{
            position: 'fixed',
            top: hoveredRect.top - 2,
            left: hoveredRect.left - 2,
            width: hoveredRect.width + 4,
            height: hoveredRect.height + 4,
            border: `2px solid ${C.accent}`,
            borderRadius: 6,
            pointerEvents: 'none',
            zIndex: 10000,
            transition: 'top 0.06s, left 0.06s, width 0.06s, height 0.06s',
            boxShadow: `0 0 0 4px ${C.accentSoft}`,
          }}
        />
      )}

      {/* ── Selected element highlight ── */}
      {selectedRect && (
        <div
          style={{
            position: 'fixed',
            top: selectedRect.top - 2,
            left: selectedRect.left - 2,
            width: selectedRect.width + 4,
            height: selectedRect.height + 4,
            border: `2px solid ${C.accent}`,
            borderRadius: 6,
            background: 'rgba(74, 124, 94, 0.06)',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        />
      )}

      {/* ── Prompt input (after selecting) ── */}
      {selectedEl && selectedRect && (
        <div
          style={{
            position: 'fixed',
            top: Math.min(selectedRect.bottom + 10, window.innerHeight - 200),
            left: Math.max(16, Math.min(selectedRect.left, window.innerWidth - 520)),
            zIndex: 10001,
            width: 500,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            background: C.bg,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${C.borderDefault}`,
            boxShadow: '0 12px 40px -8px rgba(26, 26, 26, 0.16)',
            fontFamily: FONT_SANS,
          }}
        >
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={makeKeyHandler(handleSubmit, cancelSelection)}
            placeholder="Describe the change… (Shift+Enter for new line)"
            rows={1}
            style={textareaBaseStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = C.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = C.borderDefault;
            }}
          />
          <button onClick={handleSubmit} disabled={!prompt.trim()} style={btnPrimary(!!prompt.trim())}>
            Send
          </button>
          <button onClick={cancelSelection} style={btnSecondary} title="Cancel (Esc)">
            ×
          </button>
        </div>
      )}

      {/* ── Pending edits list ── */}
      {pendingEdits.length > 0 && !selectedEl && (
        <div
          style={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 10000,
            background: C.bg,
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${C.borderDefault}`,
            boxShadow: '0 8px 32px -8px rgba(26, 26, 26, 0.12)',
            fontFamily: FONT_SANS,
            fontSize: 13,
            width: 360,
            maxWidth: 'calc(100vw - 40px)',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: '0.14em',
              color: C.textMuted,
              textTransform: 'uppercase',
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            Visual edits · {pendingEdits.length}
          </div>
          {pendingEdits.map((edit, i) => {
            const isEditing = editingId === edit.id;
            return (
              <div
                key={edit.id}
                style={{
                  padding: '10px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${C.borderDefault}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      color: C.textMuted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {edit.element.component || edit.element.tag} →{' '}
                    {edit.element.textContent.slice(0, 40)}
                    {edit.element.textContent.length > 40 ? '…' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!isEditing && (
                      <button
                        onClick={() => startEditing(edit.id, edit.prompt)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: C.textMuted,
                          fontSize: 12,
                          padding: '2px 4px',
                          fontFamily: FONT_MONO,
                        }}
                        title="Edit"
                      >
                        ✎
                      </button>
                    )}
                    <button
                      onClick={() => removeVisualEdit(edit.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: C.textMuted,
                        fontSize: 14,
                        padding: '2px 4px',
                        fontFamily: FONT_MONO,
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    <textarea
                      ref={editInputRef}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={makeKeyHandler(saveEditing, cancelEditing)}
                      rows={1}
                      style={{
                        ...textareaBaseStyle,
                        fontSize: 13,
                        lineHeight: '20px',
                        minHeight: 32,
                      }}
                    />
                    <button
                      onClick={saveEditing}
                      disabled={!editingText.trim()}
                      style={{
                        ...btnPrimary(!!editingText.trim()),
                        height: 32,
                        padding: '0 12px',
                        fontSize: 12,
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      style={{
                        ...btnSecondary,
                        height: 32,
                        width: 32,
                        fontSize: 13,
                      }}
                      title="Cancel (Esc)"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      color: C.textPrimary,
                      fontSize: 13,
                      lineHeight: '20px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {edit.prompt}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Flash toast ── */}
      {flash && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10002,
            background: C.accentSoft,
            color: C.accentHover,
            border: `1px solid ${C.accentBorder}`,
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: FONT_MONO,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 500,
            boxShadow: '0 4px 16px -2px rgba(26, 26, 26, 0.12)',
          }}
        >
          ✓ {flash}
        </div>
      )}
    </div>,
    document.body,
  );
}
