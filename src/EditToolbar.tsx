'use client';

import { useEffect, useState } from 'react';
import { useEditMode } from './context';

export function EditToolbar() {
  const {
    mode, toggleTextMode, toggleVisualMode,
    pendingCount, approvedCount, visualEdits, saveAll,
  } = useEditMode();

  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    setVisible(new URLSearchParams(window.location.search).has('edit'));
  }, []);

  if (!visible) return null;

  async function handleSave() {
    setSaving(true);
    setSavedMsg('');
    const ok = await saveAll();
    setSavedMsg(ok ? '✓ Saved' : '✓ Copied to clipboard');
    setSaving(false);
    setTimeout(() => setSavedMsg(''), 3000);
  }

  const threadTotal = pendingCount + approvedCount;
  const veCount = visualEdits.filter(e => e.status === 'pending').length;
  const hasChanges = threadTotal > 0 || veCount > 0;

  const btnBase = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 9999, border: 'none',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
    transition: 'background 0.15s',
  } as const;

  return (
    <div data-edit-toolbar="true" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8,
      background: '#111827', color: '#f9fafb', padding: '10px 18px',
      borderRadius: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      border: '1px solid #374151', fontSize: 13,
      fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap',
    }}>
      {/* Text mode toggle */}
      <button
        onClick={toggleTextMode}
        style={{
          ...btnBase,
          background: mode === 'text' ? '#3b82f6' : '#374151',
          color: mode === 'text' ? '#fff' : '#d1d5db',
        }}
      >
        ✏️ Text
      </button>

      {/* Visual mode toggle */}
      <button
        onClick={toggleVisualMode}
        style={{
          ...btnBase,
          background: mode === 'visual' ? '#8b5cf6' : '#374151',
          color: mode === 'visual' ? '#fff' : '#d1d5db',
        }}
      >
        🎨 Visual
      </button>

      {/* Separator */}
      {hasChanges && <div style={{ width: 1, height: 20, background: '#374151' }} />}

      {/* Thread counters */}
      {pendingCount > 0 && <span style={{ color: '#fbbf24' }}>{pendingCount} open</span>}
      {approvedCount > 0 && <span style={{ color: '#86efac' }}>{approvedCount} approved</span>}
      {veCount > 0 && <span style={{ color: '#c4b5fd' }}>{veCount} visual</span>}

      {/* Save */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...btnBase,
            background: '#22c55e', color: '#fff',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}

      {savedMsg && <span style={{ color: '#86efac', fontWeight: 500 }}>{savedMsg}</span>}
    </div>
  );
}
