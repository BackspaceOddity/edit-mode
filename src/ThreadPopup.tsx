'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEditMode } from './context';

interface Props {
  anchorEl: HTMLElement;
  threadId: string;
  sourceText: string;
}

export function ThreadPopup({ anchorEl, threadId, sourceText }: Props) {
  const {
    threads, closePopup, addVariant, swapVariant, swapSource,
    approveThread, reopenThread, removeVariant,
  } = useEditMode();

  const thread = threads[threadId];
  const [inputText, setInputText] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Position popup relative to anchor element
  useEffect(() => {
    const rect = anchorEl.getBoundingClientRect();
    const popupWidth = 400;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 300 ? rect.bottom + 8 : Math.max(16, rect.top - 400);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - popupWidth - 16);
    setPos({ top, left });
  }, [anchorEl]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopup(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closePopup]);

  // Close on click outside (delayed to skip the opening click)
  useEffect(() => {
    let active = true;
    const handler = (e: MouseEvent) => {
      if (!active) return;
      if (popupRef.current && !popupRef.current.contains(e.target as Node)
        && !anchorEl.contains(e.target as Node)) {
        closePopup();
      }
    };
    const timer = setTimeout(() => window.addEventListener('mousedown', handler), 10);
    return () => { active = false; clearTimeout(timer); window.removeEventListener('mousedown', handler); };
  }, [closePopup, anchorEl]);

  if (!thread) return null;

  const isActiveSource = thread.activeText === thread.sourceText;

  const handleAdd = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    addVariant(threadId, trimmed);
    setInputText('');
    inputRef.current?.focus();
  };

  // Shared styles
  const labelStyle = {
    fontSize: 11, fontWeight: 600 as const, textTransform: 'uppercase' as const,
    letterSpacing: '0.05em', color: '#6b7280',
  };
  const swapBtnStyle = {
    background: '#f3f4f6', border: 'none', borderRadius: 6,
    cursor: 'pointer' as const, padding: '3px 8px', fontSize: 12,
    color: '#4b5563', display: 'flex' as const, alignItems: 'center' as const, gap: 4,
  };
  const removeBtnStyle = {
    background: 'none', border: 'none', cursor: 'pointer' as const,
    color: '#d1d5db', fontSize: 14, padding: '2px 4px', lineHeight: 1,
  };
  const rowStyle = { padding: '12px 16px', borderBottom: '1px solid #f3f4f6' };
  const rowHeader = {
    display: 'flex' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, marginBottom: 6,
  };
  const textStyle = { margin: 0, lineHeight: 1.5 };

  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 10000,
        width: 400, maxHeight: '70vh', overflowY: 'auto',
        background: '#fff', borderRadius: 12,
        boxShadow: '0 12px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14, color: '#1f2937',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '14px 16px 10px', borderBottom: '1px solid #f3f4f6',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {thread.status === 'approved' ? '✅ Approved' : 'Text variants'}
        </span>
        <button onClick={closePopup} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9ca3af', fontSize: 16, padding: '2px 6px',
        }}>✕</button>
      </div>

      {/* ── Current ver. (source text) ── */}
      <div style={rowStyle}>
        <div style={rowHeader}>
          <span style={labelStyle}>Current ver.</span>
          {!isActiveSource && (
            <button onClick={() => swapSource(threadId)} title="Swap source back" style={swapBtnStyle}>←→</button>
          )}
        </div>
        <p style={{
          ...textStyle,
          color: isActiveSource ? '#111827' : '#9ca3af',
          fontWeight: isActiveSource ? 500 : 400,
        }}>
          {thread.sourceText}
          {isActiveSource && <span style={{ marginLeft: 8, fontSize: 11, color: '#22c55e', fontWeight: 600 }}>● Active</span>}
        </p>
      </div>

      {/* ── Active on page (only when different from source) ── */}
      {!isActiveSource && (
        <div style={{ ...rowStyle, background: '#f0fdf4' }}>
          <div style={rowHeader}>
            <span style={{ ...labelStyle, color: '#16a34a' }}>● Active on page</span>
          </div>
          <p style={{ ...textStyle, fontWeight: 500 }}>{thread.activeText}</p>
        </div>
      )}

      {/* ── Variants (Option 1, 2, …) ── */}
      {thread.variants.map((variant, i) => (
        <div key={i} style={rowStyle}>
          <div style={rowHeader}>
            <span style={labelStyle}>Option {i + 1}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => swapVariant(threadId, i)} title="Use this on page" style={swapBtnStyle}>←→</button>
              <button onClick={() => removeVariant(threadId, i)} title="Remove" style={removeBtnStyle}>✕</button>
            </div>
          </div>
          <p style={textStyle}>{variant}</p>
        </div>
      ))}

      {/* ── Archived ── */}
      {thread.archived.length > 0 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <button
            onClick={() => setShowArchived(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: 12, padding: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {showArchived ? '▾' : '▸'} Archived ({thread.archived.length})
          </button>
          {showArchived && thread.archived.map((text, i) => (
            <div key={i} style={{
              padding: '8px 0', color: '#9ca3af', fontSize: 13,
              borderBottom: i < thread.archived.length - 1 ? '1px solid #f9fafb' : 'none',
            }}>
              {text}
            </div>
          ))}
        </div>
      )}

      {/* ── Add new variant (open threads only) ── */}
      {thread.status === 'open' && (
        <div style={rowStyle}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Add a variant…"
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: '1px solid #e5e7eb', outline: 'none',
                fontSize: 13, background: '#f9fafb',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#93c5fd'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
            />
            <button
              onClick={handleAdd}
              disabled={!inputText.trim()}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: inputText.trim() ? '#3b82f6' : '#e5e7eb',
                color: inputText.trim() ? '#fff' : '#9ca3af',
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 600,
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* ── Approve / Reopen ── */}
      <div style={{ padding: '12px 16px' }}>
        {thread.status === 'open' ? (
          <button
            onClick={() => approveThread(threadId)}
            disabled={thread.activeText === thread.sourceText && thread.variants.length === 0}
            style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none',
              background: '#22c55e', color: '#fff',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              opacity: (thread.activeText === thread.sourceText && thread.variants.length === 0) ? 0.4 : 1,
            }}
          >
            ✓ Approve
          </button>
        ) : (
          <button
            onClick={() => reopenThread(threadId)}
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            Reopen
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
