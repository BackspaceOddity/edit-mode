import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Edit-mode visual-edit + thread store. Two files:
//   _edit-threads.json          — only items with status="pending" (live state).
//   _edit-threads.processed.jsonl — append-only log of everything that ever
//                                   got "surfaced", "applied", or other non-pending
//                                   state. The Claude session that picks edits up
//                                   reads this to know history.
//
// Why split? With one flat file the picker panel "comes back from the dead"
// after reload — the bundle hydrates all visualEdits from disk on mount, and
// even items the user already addressed re-appear. Keeping only pending on
// disk makes the panel honest: empty when there is nothing to do.
//
// Threads (text-mode edit threads) live in _edit-threads.json alongside
// pending visualEdits. They have their own internal status flow; bundle
// clears them locally after a successful save.
//
// Merge-on-write: a stale client snapshot must not clobber items the client
// never loaded (e.g. reload-between-saves race). We read prior file, merge
// thread maps, dedupe visualEdits by id with incoming-wins.

const FILE_PATH = path.join(process.cwd(), '_edit-threads.json');
const PROCESSED_PATH = path.join(process.cwd(), '_edit-threads.processed.jsonl');

type VisualEdit = { id?: string; status?: string; [k: string]: unknown };

export async function GET() {
  try {
    const data = await fs.readFile(FILE_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ threads: {}, visualEdits: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  let prior: { threads?: Record<string, unknown>; visualEdits?: VisualEdit[] } = {};
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8');
    prior = JSON.parse(raw);
  } catch {
    // first save — no prior file
  }

  const mergedThreads = { ...(prior.threads || {}), ...((body && body.threads) || {}) };

  const incoming: VisualEdit[] = Array.isArray(body?.visualEdits) ? body.visualEdits : [];
  const incomingIds = new Set(incoming.map((e) => e.id).filter(Boolean));
  const survivors = (prior.visualEdits || []).filter((e) => e.id && !incomingIds.has(e.id));
  const merged = [...survivors, ...incoming];

  const pending = merged.filter((e) => (e.status || 'pending') === 'pending');
  const archived = merged.filter((e) => (e.status || 'pending') !== 'pending');

  if (archived.length > 0) {
    const lines = archived
      .map((e) => JSON.stringify({ ...e, archivedAt: new Date().toISOString() }))
      .join('\n') + '\n';
    await fs.appendFile(PROCESSED_PATH, lines, 'utf-8');
  }

  const payload = {
    savedAt: new Date().toISOString(),
    threads: mergedThreads,
    visualEdits: pending,
  };
  await fs.writeFile(FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');

  return NextResponse.json({
    ok: true,
    pendingCount: pending.length,
    archivedThisRun: archived.length,
  });
}
