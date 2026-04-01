'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEditMode } from './context';

/**
 * Visual Edit mode: hover to highlight elements, click to select, type a prompt.
 * Saves structured { element context + prompt } for Claude to apply.
 */
export function VisualEditPicker() {
  const { isVisualMode, addVisualEdit, visualEdits, removeVisualEdit } = useEditMode();

  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [prompt, setPrompt] = useState('');
  const [flash, setFlash] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Element picker (hover + click) ──
  useEffect(() => {
    if (!isVisualMode || selectedEl) return;

    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el || el.closest('[data-visual-picker]') || el.closest('[data-edit-toolbar]')) {
        setHoveredRect(null);
        return;
      }
      setHoveredRect(el.getBoundingClientRect());
    };

    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el || el.closest('[data-visual-picker]') || el.closest('[data-edit-toolbar]')) return;
      setSelectedEl(el);
      setSelectedRect(el.getBoundingClientRect());
      setHoveredRect(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [isVisualMode, selectedEl]);

  // ── Escape to deselect ──
  useEffect(() => {
    if (!isVisualMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEl(null);
        setSelectedRect(null);
        setPrompt('');
        setHoveredRect(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isVisualMode]);

  // ── Clear state when mode turns off ──
  useEffect(() => {
    if (!isVisualMode) {
      setSelectedEl(null);
      setSelectedRect(null);
      setHoveredRect(null);
      setPrompt('');
    }
  }, [isVisualMode]);

  // ── Build element context for the selected element ──
  const captureContext = useCallback((el: HTMLElement) => {
    // Walk up to find data-component
    let component = '';
    let current: HTMLElement | null = el;
    while (current) {
      if (current.dataset?.component) { component = current.dataset.component; break; }
      current = current.parentElement;
    }

    // CSS selector path (up to 4 levels)
    const selectorParts: string[] = [];
    let node: HTMLElement | null = el;
    while (node && node !== document.body && selectorParts.length < 5) {
      let sel = node.tagName.toLowerCase();
      if (node.id) sel += `#${node.id}`;
      else if (node.className && typeof node.className === 'string') {
        const cls = node.className.split(/\s+/).filter(c => c && !c.startsWith('__')).slice(0, 3);
        if (cls.length) sel += '.' + cls.join('.');
      }
      selectorParts.unshift(sel);
      node = node.parentElement;
    }

    // Key computed styles
    const computed = window.getComputedStyle(el);
    const styles: Record<string, string> = {};
    const props = ['color', 'background-color', 'font-size', 'font-weight', 'padding', 'margin',
      'border-radius', 'display', 'gap', 'width', 'height', 'max-width'];
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
    setFlash('✓ Edit saved');
    setTimeout(() => setFlash(''), 2000);
    setSelectedEl(null);
    setSelectedRect(null);
    setPrompt('');
  };

  if (!isVisualMode) return null;

  const pendingEdits = visualEdits.filter(e => e.status === 'pending');

  return createPortal(
    <div data-visual-picker="true">
      {/* ── Hover highlight ── */}
      {hoveredRect && !selectedEl && (
        <div style={{
          position: 'fixed', top: hoveredRect.top - 2, left: hoveredRect.left - 2,
          width: hoveredRect.width + 4, height: hoveredRect.height + 4,
          border: '2px solid #3b82f6', borderRadius: 4,
          pointerEvents: 'none', zIndex: 10000,
          transition: 'top 0.06s, left 0.06s, width 0.06s, height 0.06s',
        }} />
      )}

      {/* ── Selected element highlight ── */}
      {selectedRect && (
        <div style={{
          position: 'fixed', top: selectedRect.top - 2, left: selectedRect.left - 2,
          width: selectedRect.width + 4, height: selectedRect.height + 4,
          border: '2px solid #3b82f6', borderRadius: 4,
          background: 'rgba(59,130,246,0.04)',
          pointerEvents: 'none', zIndex: 10000,
        }} />
      )}

      {/* ── Prompt bar (after selecting element) ── */}
      {selectedEl && selectedRect && (
        <div
          style={{
            position: 'fixed',
            top: Math.min(selectedRect.bottom + 10, window.innerHeight - 70),
            left: Math.max(16, Math.min(selectedRect.left, window.innerWidth - 520)),
            zIndex: 10001, width: 500,
            display: 'flex', gap: 8, alignItems: 'center',
            background: '#fff', padding: '8px 12px', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          onClick={e => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Describe the change…"
            style={{
              flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb',
              borderRadius: 8, outline: 'none', fontSize: 14, background: '#fafafa',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#93c5fd'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: prompt.trim() ? '#3b82f6' : '#e5e7eb',
              color: prompt.trim() ? '#fff' : '#9ca3af',
              cursor: prompt.trim() ? 'pointer' : 'not-allowed',
              fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            Send
          </button>
          <button
            onClick={() => { setSelectedEl(null); setSelectedRect(null); setPrompt(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: 16, padding: '2px 6px',
            }}
          >✕</button>
        </div>
      )}

      {/* ── Pending edits indicator (top-right) ── */}
      {pendingEdits.length > 0 && !selectedEl && (
        <div style={{
          position: 'fixed', top: 80, right: 20, zIndex: 10000,
          background: '#fff', borderRadius: 12, padding: '12px 16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
          fontFamily: 'system-ui, sans-serif', fontSize: 13, maxWidth: 320,
          maxHeight: '50vh', overflowY: 'auto',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>
            Visual edits ({pendingEdits.length})
          </div>
          {pendingEdits.map(edit => (
            <div key={edit.id} style={{
              padding: '8px 0', borderBottom: '1px solid #f3f4f6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>
                  {edit.element.component || edit.element.tag} → {edit.element.textContent.slice(0, 40)}{edit.element.textContent.length > 40 ? '…' : ''}
                </div>
                <div style={{ color: '#1f2937' }}>{edit.prompt}</div>
              </div>
              <button
                onClick={() => removeVisualEdit(edit.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#d1d5db', fontSize: 14, padding: '2px', flexShrink: 0,
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Flash message ── */}
      {flash && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10002, background: '#111827', color: '#86efac',
          padding: '8px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {flash}
        </div>
      )}

      {/* ── Crosshair cursor when picking ── */}
      {!selectedEl && (
        <style>{`body, body * { cursor: crosshair !important; }`}</style>
      )}
    </div>,
    document.body,
  );
}
