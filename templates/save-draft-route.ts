import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), '_edit-threads.json');

/** GET — load previously saved threads */
export async function GET() {
  try {
    const data = await fs.readFile(FILE_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ threads: {} });
  }
}

/** POST — persist current threads to disk */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const payload = { savedAt: new Date().toISOString(), ...body };
  await fs.writeFile(FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  return NextResponse.json({ ok: true });
}
