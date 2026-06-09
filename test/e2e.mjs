#!/usr/bin/env node
/**
 * End-to-end harness for the canonical Edit Mode (@backspace-oddity/edit-mode).
 *
 * Proves the whole chain works, repeatably:
 *   1. The built package exports buildScript / buildScriptInner.
 *   2. buildScript renders the full canonical panel (Visual/Copy/ToV, per-comment
 *      Send/Resolve, doc-absolute markers, amber highlight, Tweaks, theme inject).
 *   3. The server-safe entry has NO 'use client' (callable from a server context);
 *      buildScriptInner has no <script> wrapper (React-safe); buildScript wraps it.
 *   4. Chrome vars are namespaced --emc-* (no bare host var() leaks in body).
 *   5. The inbox server round-trips: /inbox merges per-comment sends; the full ToV
 *      loop request → pending → result → poll works.
 *   6. (optional, E2E_GITHUB=1) a clean `npm install github:BackspaceOddity/edit-mode`
 *      in a throwaway project builds dist and renders the panel — proving ANY project
 *      can source it.
 *
 * Run:  npm run test:e2e          (local dist + inbox round-trip)
 *       E2E_GITHUB=1 npm run test:e2e   (+ clean github-install proof)
 *
 * Exits non-zero on the first failed assertion.
 */
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync, rmSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); fail++; }
};
const section = (s) => console.log(`\n── ${s} ──`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  // Ensure dist is built.
  if (!existsSync(join(ROOT, 'dist/build-script.cjs'))) {
    console.log('building package (dist missing)…');
    execSync('npm run build', { cwd: ROOT, stdio: 'ignore' });
  }

  section('1-4. Package exports + panel markup + isolation');
  const { buildScript, buildScriptInner } = require(join(ROOT, 'dist/build-script.cjs'));
  ok('buildScript is a function', typeof buildScript === 'function');
  ok('buildScriptInner is a function', typeof buildScriptInner === 'function');

  const full = buildScript({
    slug: 'e2e',
    tweaks: { sizes: [{ k: '--fs-h1', l: 'H1', d: 48, min: 24, max: 72 }], lineHeights: [], weightStyles: [] },
    tokenMap: [{ match: 'h1', token: '--fs-h1', label: 'H1' }],
  });
  const inner = buildScriptInner({ slug: 'e2e' });

  ok('Visual / Copy / Rewrite / ToV tabs present', full.includes('em-mode-v') && full.includes('em-mode-c') && full.includes('em-mode-r') && full.includes('em-mode-t'));
  ok('Rewrite: inline contenteditable + commit', full.includes('renderRewriteBody') && full.includes("setAttribute('contenteditable','true')") && full.includes('commitRewrite'));
  ok("Rewrite: type:'rewrite' + (original→rewritten) capture", full.includes("type:'rewrite'") && full.includes('rwOrig') && full.includes('rewritten:rewritten'));
  ok('Rewrite: Send fires ToV-learn round-trip', full.includes('startLearn') && full.includes("kind:'rewrite-learn'") && full.includes('pollLearn'));
  ok('per-comment Send to Claude + Resolve', full.includes('data-send') && full.includes('data-resolve'));
  ok('document-absolute markers', full.includes('position:absolute'));
  ok('amber inline highlight', full.includes('rgba(214,168,84'));
  ok('comment-bubble marker svg', full.includes('M21 11.5a8.5'));
  ok('Tweaks panel rendered when tweaks supplied', full.includes('Font sizes') && full.includes('--fs-h1'));
  ok('chrome vars namespaced --emc-*', full.includes('var(--emc-ink)'));
  ok('theme inject keeps host fallback', full.includes('--emc-ink:var(--ink'));
  ok('full output is a <script> block', full.trimStart().startsWith('<script>') && full.trimEnd().endsWith('</script>'));
  ok('buildScriptInner has NO <script> wrapper (React-safe)', !inner.includes('<script>'));
  ok('buildScript wraps buildScriptInner', full.includes(inner.slice(0, 120)));

  // Server-safe entry must not carry the React 'use client' banner.
  const buildScriptSrc = readFileSync(join(ROOT, 'dist/build-script.cjs'), 'utf8');
  ok('build-script entry has NO \'use client\' banner', !buildScriptSrc.startsWith("'use client'") && !buildScriptSrc.startsWith('"use client"'));
  const reactEntry = readFileSync(join(ROOT, 'dist/index.cjs'), 'utf8');
  ok('React index entry DOES carry \'use client\'', /^['"]use client['"]/.test(reactEntry));

  // no-tweaks variant hides the Tweaks panel
  ok('no-tweaks variant omits Tweaks panel', !buildScript({ slug: 'x' }).includes('Font sizes'));

  const withFonts = buildScript({
    slug: 'ff-test',
    tweaks: { fontFamilies: [{ k: '--font-body', l: 'Body font', d: 'Inter' }, { k: '--font-heading', l: 'Heading', d: 'GT Eesti Pro' }] },
  });
  ok('Font families section rendered', withFonts.includes('Font families'));
  ok('font input rendered with data-key (em-ff-inp class present)', withFonts.includes('em-ff-inp'));
  ok('datalist rendered (em-font-dl class)', withFonts.includes('em-font-dl'));
  ok('queryLocalFonts call present', withFonts.includes('queryLocalFonts'));
  ok('FONTFAMS config injected', withFonts.includes('"--font-body"') && withFonts.includes('"Body font"'));
  ok('FONTFAMS restore on load', withFonts.includes('FONTFAMS.forEach') && withFonts.includes('twSaved[f.k]'));

  section('5. Inbox server round-trip (merge + ToV loop)');
  const PORT = 8042;
  const BASE = `http://localhost:${PORT}`;
  const server = join(ROOT, 'server/inbox-server.py');
  // clean any stale state files next to the server
  for (const f of ['_edit-inbox.json', '_tov-requests.json', '_tov-results.json']) {
    const p = join(ROOT, 'server', f); if (existsSync(p)) rmSync(p);
  }
  const proc = spawn('python3', [server, String(PORT)], { cwd: join(ROOT, 'server'), stdio: 'ignore' });
  try {
    // wait for health
    let up = false;
    for (let i = 0; i < 25; i++) {
      try { const r = await fetch(`${BASE}/health`); if (r.ok) { up = true; break; } } catch {}
      await sleep(200);
    }
    ok('inbox server responds on /health', up);

    // per-comment merge: two separate sends must accumulate, not clobber
    await fetch(`${BASE}/inbox`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threads: { a: { id: 'a', type: 'visual', prompt: 'first' } }, source: 'e2e' }) });
    await fetch(`${BASE}/inbox`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threads: { b: { id: 'b', type: 'copy', prompt: 'second' } } }) });
    const inboxState = JSON.parse(readFileSync(join(ROOT, 'server/_edit-inbox.json'), 'utf8'));
    ok('/inbox MERGES per-comment sends (both threads present)', !!inboxState.threads?.a && !!inboxState.threads?.b);

    // ToV loop: request → pending → result → poll → drained
    const reqRes = await (await fetch(`${BASE}/tov-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'тестовый текст', lang: 'ru', slug: 'e2e', selector: 'p' }) })).json();
    ok('ToV /tov-request returns an id', typeof reqRes.id === 'string' && reqRes.id.startsWith('tov-'));
    const pending = await (await fetch(`${BASE}/tov-pending`)).json();
    ok('ToV request appears in /tov-pending', Array.isArray(pending) && pending.some(r => r.id === reqRes.id));
    const pollBefore = await (await fetch(`${BASE}/tov-poll?id=${reqRes.id}`)).json();
    ok('/tov-poll is pending before result', pollBefore.pending === true);
    await fetch(`${BASE}/tov-result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: reqRes.id, verdict: 'ok', score: 82, suggestions: [{ from: 'a', to: 'b', why: 'c' }] }) });
    const pollAfter = await (await fetch(`${BASE}/tov-poll?id=${reqRes.id}`)).json();
    ok('/tov-poll returns the verdict after /tov-result', pollAfter.verdict === 'ok' && pollAfter.score === 82 && pollAfter.suggestions?.length === 1);
    const pendingAfter = await (await fetch(`${BASE}/tov-pending`)).json();
    ok('request drained from /tov-pending after result', Array.isArray(pendingAfter) && !pendingAfter.some(r => r.id === reqRes.id));

    // rewrite-learn loop: kind discriminator + original/rewritten passthrough → learn- id
    const learnRes = await (await fetch(`${BASE}/tov-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'rewrite-learn', text: 'мой переписанный текст', original: 'AI draft text', rewritten: 'мой переписанный текст', lang: 'ru', slug: 'e2e', selector: 'p' }) })).json();
    ok('rewrite-learn request gets a learn- id', typeof learnRes.id === 'string' && learnRes.id.startsWith('learn-'));
    const learnPending = await (await fetch(`${BASE}/tov-pending`)).json();
    const lr = Array.isArray(learnPending) ? learnPending.find(r => r.id === learnRes.id) : null;
    ok('rewrite-learn carries kind + original + rewritten', !!lr && lr.kind === 'rewrite-learn' && lr.original === 'AI draft text' && lr.rewritten === 'мой переписанный текст');
    await fetch(`${BASE}/tov-result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: learnRes.id, verdict: 'saved to corpus', patterns: ['prefers active verbs', 'drops hedges'] }) });
    const learnPoll = await (await fetch(`${BASE}/tov-poll?id=${learnRes.id}`)).json();
    ok('rewrite-learn report polls back (verdict + patterns)', learnPoll.verdict === 'saved to corpus' && Array.isArray(learnPoll.suggestions || learnPoll.patterns));
  } finally {
    proc.kill('SIGKILL');
    for (const f of ['_edit-inbox.json', '_tov-requests.json', '_tov-results.json']) {
      const p = join(ROOT, 'server', f); if (existsSync(p)) rmSync(p);
    }
  }

  if (process.env.E2E_GITHUB === '1') {
    section('6. Clean github install (any project can source it)');
    const dir = mkdtempSync(join(tmpdir(), 'em-e2e-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{"name":"em-e2e-probe","version":"1.0.0"}');
      execSync('npm install github:BackspaceOddity/edit-mode', { cwd: dir, stdio: 'ignore' });
      const probe = `const {buildScript}=require("@backspace-oddity/edit-mode/build-script");const s=buildScript({slug:"p"});process.stdout.write(String(typeof buildScript==="function" && s.includes("em-mode-t") && s.includes("M21 11.5a8.5")));`;
      const out = execSync(`node -e '${probe}'`, { cwd: dir }).toString().trim();
      ok('github-installed package builds + renders panel', out === 'true');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } else {
    console.log('\n(skip 6: set E2E_GITHUB=1 to also prove a clean github install)');
  }

  console.log(`\n${'='.repeat(40)}\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
