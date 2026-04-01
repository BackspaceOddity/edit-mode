'use client';

import { useRef } from 'react';
import { useEditMode } from './context';
import { ThreadPopup } from './ThreadPopup';

interface Props {
  id: string;
  children: string;
}

export function EditableText({ id, children }: Props) {
  const { isEditing, threads, openPopup, activePopupId, getActiveText } = useEditMode();
  const ref = useRef<HTMLSpanElement>(null);

  const displayText = getActiveText(id, children);
  const thread = threads[id];
  const hasActivity = thread && (thread.variants.length > 0 || thread.activeText !== thread.sourceText);
  const isApproved = thread?.status === 'approved';
  const isPopupOpen = activePopupId === id;

  // Always show active text (even when not editing) so approved changes are visible
  if (!isEditing) {
    return <>{displayText}</>;
  }

  const borderBottom = isApproved
    ? '2px solid #22c55e'
    : hasActivity
      ? '2px solid #f59e0b'
      : '1.5px dashed #60a5fa';

  return (
    <>
      <span
        ref={ref}
        data-edit-id={id}
        onClick={() => openPopup(id, children)}
        style={{
          borderBottom,
          borderRadius: '2px',
          cursor: 'pointer',
          outline: 'none',
          display: 'inline',
          background: isPopupOpen ? 'rgba(96,165,250,0.08)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        {displayText}
      </span>
      {isPopupOpen && ref.current && (
        <ThreadPopup anchorEl={ref.current} threadId={id} sourceText={children} />
      )}
    </>
  );
}
