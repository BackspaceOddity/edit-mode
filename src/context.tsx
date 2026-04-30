'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

/* ── Thread-based text editing ── */

export interface EditThread {
  id: string;
  sourceText: string;
  activeText: string;
  variants: string[];
  archived: string[];
  status: 'open' | 'approved' | 'applied';
}

/* ── Visual edit requests ── */

export interface VisualEditElement {
  component: string;
  tag: string;
  className: string;
  textContent: string;
  selector: string;
  styles: Record<string, string>;
}

export interface VisualEditRequest {
  id: string;
  prompt: string;
  element: VisualEditElement;
  status: 'pending' | 'applied';
  createdAt: string;
}

/* ── Context type ── */

type Mode = 'off' | 'text' | 'visual';

interface EditModeContextType {
  mode: Mode;
  isEditing: boolean;
  isVisualMode: boolean;
  toggleTextMode: () => void;
  toggleVisualMode: () => void;

  threads: Record<string, EditThread>;
  activePopupId: string | null;
  openPopup: (id: string, sourceText: string) => void;
  closePopup: () => void;
  addVariant: (id: string, text: string) => void;
  swapVariant: (id: string, variantIndex: number) => void;
  swapSource: (id: string) => void;
  approveThread: (id: string) => void;
  reopenThread: (id: string) => void;
  removeVariant: (id: string, variantIndex: number) => void;
  getActiveText: (id: string, sourceText: string) => string;
  pendingCount: number;
  approvedCount: number;

  visualEdits: VisualEditRequest[];
  addVisualEdit: (edit: { prompt: string; element: VisualEditElement }) => void;
  removeVisualEdit: (id: string) => void;
  updateVisualEdit: (id: string, prompt: string) => void;

  saveAll: () => Promise<boolean>;
}

const EditModeContext = createContext<EditModeContextType | null>(null);

export interface EditModeProviderProps {
  children: ReactNode;
  /** URL prefix for API calls (e.g. "/stape-website"). Defaults to "" */
  basePath?: string;
  /** API endpoint path. Defaults to "/api/save-draft" */
  apiPath?: string;
}

export function EditModeProvider({ children, basePath = '', apiPath = '/api/save-draft' }: EditModeProviderProps) {
  const [mode, setMode] = useState<Mode>('off');
  const [threads, setThreads] = useState<Record<string, EditThread>>({});
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const [visualEdits, setVisualEdits] = useState<VisualEditRequest[]>([]);

  const isEditing = mode === 'text';
  const isVisualMode = mode === 'visual';
  const apiUrl = `${basePath}${apiPath}`;

  // Load saved data on mount.
  // Text-edit threads are a long-lived workspace — rehydrate from disk.
  // Visual edits are fire-and-forget: once sent to Claude via saveAll(),
  // they're gone from the UI. Reloading the page SHOULD NOT resurrect them;
  // they live on disk only as a pickup point for Claude. Skip rehydration.
  useEffect(() => {
    fetch(apiUrl)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.threads) setThreads(data.threads);
      })
      .catch(() => {});
  }, [apiUrl]);

  const toggleTextMode = useCallback(() => setMode(m => m === 'text' ? 'off' : 'text'), []);
  const toggleVisualMode = useCallback(() => {
    setMode(m => m === 'visual' ? 'off' : 'visual');
    setActivePopupId(null);
  }, []);

  /* ── Text thread methods ── */

  const openPopup = useCallback((id: string, sourceText: string) => {
    setThreads(prev => {
      if (prev[id]) return prev;
      return { ...prev, [id]: { id, sourceText, activeText: sourceText, variants: [], archived: [], status: 'open' } };
    });
    setActivePopupId(id);
  }, []);

  const closePopup = useCallback(() => setActivePopupId(null), []);

  const addVariant = useCallback((id: string, text: string) => {
    setThreads(prev => {
      const t = prev[id];
      if (!t) return prev;
      return { ...prev, [id]: { ...t, variants: [...t.variants, text.trim()] } };
    });
  }, []);

  const swapVariant = useCallback((id: string, variantIndex: number) => {
    setThreads(prev => {
      const t = prev[id];
      if (!t) return prev;
      const newVariants = [...t.variants];
      const swappedText = newVariants.splice(variantIndex, 1)[0];
      if (t.activeText !== t.sourceText) newVariants.push(t.activeText);
      return { ...prev, [id]: { ...t, activeText: swappedText, variants: newVariants } };
    });
  }, []);

  const swapSource = useCallback((id: string) => {
    setThreads(prev => {
      const t = prev[id];
      if (!t || t.activeText === t.sourceText) return prev;
      return { ...prev, [id]: { ...t, activeText: t.sourceText, variants: [...t.variants, t.activeText] } };
    });
  }, []);

  const approveThread = useCallback((id: string) => {
    setThreads(prev => {
      const t = prev[id];
      if (!t) return prev;
      return { ...prev, [id]: { ...t, status: 'approved', archived: [...t.archived, ...t.variants], variants: [] } };
    });
    setActivePopupId(null);
  }, []);

  const reopenThread = useCallback((id: string) => {
    setThreads(prev => {
      const t = prev[id];
      if (!t) return prev;
      return { ...prev, [id]: { ...t, status: 'open', variants: [...t.archived], archived: [] } };
    });
  }, []);

  const removeVariant = useCallback((id: string, variantIndex: number) => {
    setThreads(prev => {
      const t = prev[id];
      if (!t) return prev;
      return { ...prev, [id]: { ...t, variants: t.variants.filter((_, i) => i !== variantIndex) } };
    });
  }, []);

  const getActiveText = useCallback((id: string, sourceText: string) => {
    const t = threads[id];
    return t ? t.activeText : sourceText;
  }, [threads]);

  const pendingCount = Object.values(threads).filter(t => t.status === 'open' && (t.variants.length > 0 || t.activeText !== t.sourceText)).length;
  const approvedCount = Object.values(threads).filter(t => t.status === 'approved').length;

  /* ── Visual edit methods ── */

  const addVisualEdit = useCallback((edit: { prompt: string; element: VisualEditElement }) => {
    const request: VisualEditRequest = {
      id: `ve-${Date.now()}`,
      ...edit,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setVisualEdits(prev => [...prev, request]);
  }, []);

  const removeVisualEdit = useCallback((id: string) => {
    setVisualEdits(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateVisualEdit = useCallback((id: string, prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setVisualEdits(prev => prev.map(e => (e.id === id ? { ...e, prompt: trimmed } : e)));
  }, []);

  /* ── Persistence ── */

  const saveAll = useCallback(async () => {
    const payload = { threads, visualEdits };
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // Sent successfully → clear the pending queue. Edits live in
        // _edit-threads.json for Claude; user's in-UI to-do list is done.
        setVisualEdits([]);
        // Mark approved threads as 'applied' so they're excluded from
        // pendingCount/approvedCount (counter clears) — but KEEP their
        // activeText in memory so EditableText keeps showing the chosen
        // variant on screen. Without this, display reverts to sourceText
        // after Send to Claude until next page reload.
        setThreads((prev) => {
          const updated: Record<string, EditThread> = {};
          for (const [id, t] of Object.entries(prev)) {
            updated[id] = t.status === 'approved' ? { ...t, status: 'applied' } : t;
          }
          return updated;
        });
        return true;
      }
      return false;
    } catch {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      return false;
    }
  }, [threads, visualEdits, apiUrl]);

  return (
    <EditModeContext.Provider value={{
      mode, isEditing, isVisualMode,
      toggleTextMode, toggleVisualMode,
      threads, activePopupId,
      openPopup, closePopup,
      addVariant, swapVariant, swapSource,
      approveThread, reopenThread, removeVariant,
      getActiveText, pendingCount, approvedCount,
      visualEdits, addVisualEdit, removeVisualEdit, updateVisualEdit,
      saveAll,
    }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const ctx = useContext(EditModeContext);
  if (!ctx) throw new Error('useEditMode must be used within EditModeProvider');
  return ctx;
}
