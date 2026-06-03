#!/usr/bin/env node
/**
 * Headless-browser end-to-end proof for the canonical Edit Mode.
 *
 * Unlike test/e2e.mjs (which asserts the generated markup as a string), this
 * drives a REAL chromium: it injects buildScript() into a fixture page, clicks
 * the Edit button, picks an element, saves a Visual comment, and asserts that a
 * marker pin + amber highlight actually appear in the live DOM. Then it runs the
 * full ToV loop against a real inbox server — request from the browser, result
 * posted as the CC side would, and asserts the verdict lands back in the page.
 *
 * Run:  npm run test:e2e:browser
 * Needs: playwright (devDep) + a chromium (npx playwright install chromium),
 *        or a system Chrome (falls back to channel:'chrome').
 */
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { if (c) { console.log(`  ✓ ${n}`); pass++; } else { console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); fail++; } };

async function main() {
  if (!existsSync(join(ROOT, 'dist/build-script.cjs'))) execSync('npm run build', { cwd: ROOT, stdio: 'ignore' });
  const { buildScript } = require(join(ROOT, 'dist/build-script.cjs'));

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { console.error('playwright not installed — run: npm i -D playwright && npx playwright install chromium'); process.exit(2); }

  const PORT_INBOX = 8043, PORT_WEB = 8044;
  const inbox = `http://localhost:${PORT_INBOX}`;

  // fixture page with real elements + the injected canonical panel
  const panel = buildScript({ slug: 'e2eb', inboxBase: inbox });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>e2e</title></head>
  <body style="font-family:system-ui;padding:40px;max-width:700px;margin:auto;">
    <h1 id="t">Headline under test</h1>
    <p id="p1">First paragraph of body copy that we can comment on.</p>
    <p id="p2">Second paragraph, used for the tone-of-voice check.</p>
    ${panel}
  </body></html>`;

  for (const f of ['_edit-inbox.json', '_tov-requests.json', '_tov-results.json']) {
    const p = join(ROOT, 'server', f); if (existsSync(p)) rmSync(p);
  }
  const inboxProc = spawn('python3', [join(ROOT, 'server/inbox-server.py'), String(PORT_INBOX)], { cwd: join(ROOT, 'server'), stdio: 'ignore' });
  const web = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }).listen(PORT_WEB);

  let browser;
  try {
    // wait inbox health
    for (let i = 0; i < 25; i++) { try { if ((await fetch(`${inbox}/health`)).ok) break; } catch {} await sleep(200); }

    try { browser = await chromium.launch(); }
    catch { browser = await chromium.launch({ channel: 'chrome' }); }
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(`http://localhost:${PORT_WEB}/`, { waitUntil: 'load' });

    console.log('\n── Browser: panel renders + activates ──');
    const editHandle = await page.getByRole('button', { name: /Edit/ }).elementHandle();
    ok('Edit button is visible', !!editHandle && await editHandle.isVisible());
    await editHandle.click();
    await sleep(200);
    const btnTxt = (await editHandle.evaluate(el => el.textContent)) || '';
    ok('clicking Edit enters edit mode (→ Exit)', /Exit/.test(btnTxt), btnTxt);

    console.log('\n── Browser: Visual comment → pin + highlight in live DOM ──');
    await page.click('#p1');
    await page.waitForSelector('#em-ta', { timeout: 3000 });
    ok('element click opens the comment dialog', await page.locator('#em-mode-v').isVisible());
    await page.fill('#em-ta', 'make this paragraph smaller');
    await page.click('#em-ok');
    await page.waitForSelector('[data-em-marker]', { timeout: 3000 });
    const markerCount = await page.locator('[data-em-marker]').count();
    ok('a marker + highlight appear in the DOM after Save', markerCount >= 2); // marker + highlight overlay
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pw-e2eb-edit-threads') || '{}'));
    ok('the visual comment persisted to localStorage', Object.values(stored.threads || {}).some(t => t.type === 'visual' && /smaller/.test(t.prompt)));

    console.log('\n── Browser: card stays open after Save, collapses on outside-click ──');
    const cs1 = await page.evaluate(() => { const c = document.querySelector('[data-em-card]'); return { open: !!c && c.style.display === 'block' && c.offsetWidth > 0, htmlHasSend: !!c && c.innerHTML.includes('Send to Claude'), textHasSend: !!c && (c.innerText || '').includes('Send to Claude'), htmlLen: c ? c.innerHTML.length : 0 }; });
    ok('card STAYS OPEN after Save (shows Send to Claude)', cs1.open && cs1.htmlHasSend, JSON.stringify(cs1));
    await page.mouse.click(30, 30); // empty top-left corner, outside the panel
    await sleep(300);
    const cs2 = await page.evaluate(() => { const c = document.querySelector('[data-em-card]'); return !c || c.style.display === 'none'; });
    ok('clicking empty area outside collapses the card', cs2);
    ok('marker stays after the card collapses', (await page.locator('[data-em-marker]').count()) >= 2);

    console.log('\n── Browser: ToV loop (browser → inbox → result → poll → page) ──');
    await page.click('#p2');
    await page.waitForSelector('#em-mode-t', { timeout: 3000 });
    await page.click('#em-mode-t');
    await page.waitForSelector('#em-tov-go', { timeout: 3000 });
    await page.click('#em-tov-go');
    // grab the request the browser just sent, answer it as the CC side would
    let reqId = null;
    for (let i = 0; i < 20; i++) {
      const pend = await (await fetch(`${inbox}/tov-pending`)).json();
      if (pend.length) { reqId = pend[0].id; break; }
      await sleep(200);
    }
    ok('browser POSTed a ToV request to the inbox', !!reqId);
    await fetch(`${inbox}/tov-result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: reqId, verdict: 'Tightened; cut two filler words.', score: 88, suggestions: [{ from: 'used for the', to: 'for the', why: 'tighter' }] }) });
    // page polls every 2.5s — wait for it to apply
    let applied = false;
    for (let i = 0; i < 12; i++) {
      const s = await page.evaluate(() => JSON.parse(localStorage.getItem('pw-e2eb-edit-threads') || '{}'));
      if (Object.values(s.threads || {}).some(t => t.type === 'tov' && t.tovStatus === 'done' && /Tightened/.test(t.verdict || ''))) { applied = true; break; }
      await sleep(1000);
    }
    ok('page polled /tov-poll and stored the verdict', applied);

    ok('no uncaught page errors during the run', errs.length === 0, errs[0] || '');
  } finally {
    if (browser) await browser.close();
    web.close();
    inboxProc.kill('SIGKILL');
    for (const f of ['_edit-inbox.json', '_tov-requests.json', '_tov-results.json']) {
      const p = join(ROOT, 'server', f); if (existsSync(p)) rmSync(p);
    }
  }

  console.log(`\n${'='.repeat(40)}\nBROWSER RESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
