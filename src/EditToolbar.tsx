'use client';

import { useEffect, useState } from 'react';
import { useEditMode } from './context';

/**
 * EditToolbar — bottom-center pill toggle for Text / Visual edit modes.
 * Visible only when URL has `?edit` query param.
 *
 * Styled in BSO aesthetic (cream bg / accent-green / Inter / mono counters).
 * On save, shows a large top-center toast so the confirmation is hard to miss.
 */

const C = {
  bg: '#FAF9F6',
  bgSecondary: '#F1EFE9',
  bgTertiary: '#E8E5DD',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9A9A9A',
  borderDefault: '#E5E3DC',
  borderStrong: '#CFCCC2',
  accent: '#4A7C5E',
  accentSoft: '#E8F0EA',
  accentHover: '#3D6A4E',
  accentBorder: '#C4D8C9',
};

const FONT_SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const FONT_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export function EditToolbar() {
  const {
    mode,
    toggleTextMode,
    toggleVisualMode,
    pendingCount,
    approvedCount,
    visualEdits,
    saveAll,
  } = useEditMode();

  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'saved' | 'copied' | 'error'; n: number } | null>(
    null,
  );

  useEffect(() => {
    // Visibility logic — localhost defaults to ON (dev convenience), prod
    // defaults to OFF (don't leak editor UI to end users). Overrides:
    //   ?edit    — force on (useful for remote debugging on prod)
    //   ?noedit  — force off (hide even on localhost)
    const host = window.location.hostname;
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local');
    const params = new URLSearchParams(window.location.search);
    if (params.has('noedit')) setVisible(false);
    else if (params.has('edit')) setVisible(true);
    else setVisible(isLocal);
  }, []);

  // Global Esc handler — exit whichever edit mode is active.
  // Inner textareas (picker, thread popup) stopPropagation on their Esc
  // so their local cancel runs first; only unfocused Esc bubbles here.
  useEffect(() => {
    if (!visible || mode === 'off') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Skip if focus is in an editable control — let it handle Esc itself.
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (el && el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (mode === 'visual') toggleVisualMode();
      else if (mode === 'text') toggleTextMode();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, mode, toggleVisualMode, toggleTextMode]);

  if (!visible) return null;

  async function handleSave() {
    const veCount = visualEdits.filter((e) => e.status === 'pending').length;
    const total = pendingCount + approvedCount + veCount;
    setSaving(true);
    setToast(null);
    const ok = await saveAll();
    setSaving(false);
    setToast({ kind: ok ? 'saved' : 'copied', n: total });
    setTimeout(() => setToast(null), 4000);
  }

  const threadTotal = pendingCount + approvedCount;
  const veCount = visualEdits.filter((e) => e.status === 'pending').length;
  const hasChanges = threadTotal > 0 || veCount > 0;

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: FONT_SANS,
    fontWeight: 500,
    transition: 'all 0.12s',
    whiteSpace: 'nowrap',
  };

  const modeBtn = (active: boolean): React.CSSProperties => ({
    ...btnBase,
    background: active ? C.accent : 'transparent',
    color: active ? '#FFFFFF' : C.textSecondary,
    borderColor: active ? C.accent : C.borderDefault,
  });

  const counterStyle: React.CSSProperties = {
    fontFamily: FONT_MONO,
    fontSize: 11,
    color: C.textSecondary,
    letterSpacing: '0.04em',
  };

  return (
    <>
      {/* Bottom-center toolbar pill */}
      <div
        data-edit-toolbar="true"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: C.bg,
          color: C.textPrimary,
          padding: '8px 14px',
          borderRadius: 999,
          boxShadow: '0 8px 28px -6px rgba(26, 26, 26, 0.16), 0 0 0 1px ' + C.borderDefault,
          fontFamily: FONT_SANS,
          fontSize: 13,
          whiteSpace: 'nowrap',
        }}
      >
        {/* Eyebrow label */}
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: C.textMuted,
            fontWeight: 500,
            paddingRight: 4,
          }}
        >
          EDIT
        </span>

        <button onClick={toggleTextMode} style={modeBtn(mode === 'text')}>
          Text
        </button>

        <button onClick={toggleVisualMode} style={modeBtn(mode === 'visual')}>
          Visual
        </button>

        {hasChanges && (
          <div style={{ width: 1, height: 20, background: C.borderDefault, margin: '0 2px' }} />
        )}

        {pendingCount > 0 && <span style={counterStyle}>{pendingCount} open</span>}
        {approvedCount > 0 && <span style={counterStyle}>{approvedCount} approved</span>}
        {veCount > 0 && <span style={counterStyle}>{veCount} visual</span>}

        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...btnBase,
              background: C.accent,
              color: '#FFFFFF',
              borderColor: C.accent,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : `Send to Claude`}
          </button>
        )}
      </div>

      {/* Top-center confirmation toast — hard to miss */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10002,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: C.bg,
            color: C.textPrimary,
            padding: '12px 20px',
            borderRadius: 12,
            border: '1px solid ' + (toast.kind === 'error' ? '#E4C9C1' : C.accentBorder),
            boxShadow: '0 12px 40px -8px rgba(26, 26, 26, 0.16)',
            fontFamily: FONT_SANS,
            fontSize: 14,
            maxWidth: 500,
            animation: 'bsoToastIn 0.25s ease-out',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              background: C.accent,
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div style={{ lineHeight: '20px' }}>
            <div style={{ fontWeight: 500, color: C.textPrimary }}>
              {toast.kind === 'saved' && `${toast.n} edit${toast.n === 1 ? '' : 's'} saved for Claude`}
              {toast.kind === 'copied' && `${toast.n} edit${toast.n === 1 ? '' : 's'} copied to clipboard`}
              {toast.kind === 'error' && 'Save failed'}
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.textSecondary,
                fontFamily: FONT_MONO,
                marginTop: 2,
              }}
            >
              {toast.kind === 'saved' && 'written to _edit-threads.json · ask Claude to read it'}
              {toast.kind === 'copied' && 'paste into Claude prompt'}
              {toast.kind === 'error' && 'check console'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
