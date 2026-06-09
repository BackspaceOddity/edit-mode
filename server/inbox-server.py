#!/usr/bin/env python3
"""
Inbox server for proposal-workspace Edit Mode.

Endpoints (all CORS-open, for localhost dev only):
  GET  /edit-mode.js — serves the ALWAYS-CANONICAL Edit Mode panel, built live
                       from the installed @backspace-oddity/edit-mode package by
                       calling buildScriptInner(config). A static prototype
                       (hand-authored index.html served by `python -m http.server`)
                       references it with one tag:
                         <script src="http://localhost:8002/edit-mode.js?slug=x"></script>
                       Config comes from edit-mode.config.json beside the server
                       (tweaks / tokenMap / theme); ?slug= overrides the slug.
                       This replaces the old "inline a frozen snapshot into the
                       HTML" path — update the package + restart this server and
                       every static prototype refreshes. No inlining, no drift.
  POST /inbox        — edit threads / tweaks. MERGES into _edit-inbox.json
                       (per-comment "Send to Claude" sends one thread at a
                       time, so overwrite would clobber earlier sends).
  POST /tov-request  — queue a ToV-lint request {text, selector, lang, slug}.
                       Returns {id}. Appended to _tov-requests.json.
  GET  /tov-pending  — CC session reads the pending request queue.
  POST /tov-result   — CC session writes a result {id, verdict, score,
                       suggestions[]}; moves it out of pending into results.
  GET  /tov-poll?id= — browser polls for a result. {pending:true} until ready.

Run: python3 inbox-server.py 8002
"""
import json, os, sys, uuid, subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
INBOX = os.path.join(HERE, '_edit-inbox.json')
TOV_REQ = os.path.join(HERE, '_tov-requests.json')
TOV_RES = os.path.join(HERE, '_tov-results.json')
CONFIG = os.path.join(HERE, 'edit-mode.config.json')

# Node ESM that imports the installed package and prints the inner panel JS.
# Config arrives on stdin; the build-script path is argv[1].
_RENDER_SRC = (
    "import{readFileSync}from'node:fs';"
    "import{pathToFileURL}from'node:url';"
    "const cfg=JSON.parse(readFileSync(0,'utf8')||'{}');"
    "const m=await import(pathToFileURL(process.argv[1]).href);"
    "process.stdout.write(m.buildScriptInner(cfg));"
)


def _find_build_script():
    """Locate the installed package's server-safe build-script entry."""
    candidates = [
        os.path.join(HERE, 'node_modules/@backspace-oddity/edit-mode/dist/build-script.js'),
        # server running from inside the package (Tools/edit-mode/server/)
        os.path.join(HERE, '..', 'dist', 'build-script.js'),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return os.path.abspath(c)
    return None


def _render_panel(slug):
    """Build the canonical inner JS for this project. Returns (ok, js_or_error)."""
    bs = _find_build_script()
    if not bs:
        return False, ('console.error("[edit-mode] package not found — run '
                       '`npm install github:BackspaceOddity/edit-mode` in this project");')
    cfg = _read(CONFIG, {})
    if slug:
        cfg['slug'] = slug
    cfg.setdefault('slug', 'prototype')
    cfg.setdefault('inboxBase', f'http://localhost:{PORT}')
    try:
        r = subprocess.run(
            ['node', '--input-type=module', '-e', _RENDER_SRC, bs],
            input=json.dumps(cfg).encode(), cwd=HERE,
            capture_output=True, timeout=25,
        )
    except Exception as e:
        return False, f'console.error("[edit-mode] node render failed: {e}");'
    if r.returncode != 0:
        err = r.stderr.decode(errors='replace').replace('"', "'")[:400]
        return False, f'console.error("[edit-mode] build failed: {err}");'
    return True, r.stdout.decode()

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def _read(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return default


def _write(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload=None):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        for k, v in CORS.items():
            self.send_header(k, v)
        self.end_headers()
        if payload is not None:
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode())

    def _send_js(self, js):
        self.send_response(200)
        self.send_header('Content-Type', 'application/javascript; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        for k, v in CORS.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(js.encode())

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in CORS.items():
            self.send_header(k, v)
        self.end_headers()

    def _body(self):
        length = int(self.headers.get('Content-Length', 0))
        try:
            return json.loads(self.rfile.read(length) or b'{}')
        except Exception:
            return {}

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/edit-mode.js':
            slug = (parse_qs(u.query).get('slug') or [''])[0]
            ok, js = _render_panel(slug)
            return self._send_js(js)
        if u.path == '/tov-pending':
            return self._send(200, _read(TOV_REQ, []))
        if u.path == '/tov-poll':
            rid = (parse_qs(u.query).get('id') or [''])[0]
            res = _read(TOV_RES, {})
            if rid in res:
                return self._send(200, res[rid])
            return self._send(200, {'pending': True})
        if u.path == '/health':
            return self._send(200, {'ok': True})
        return self._send(404)

    def do_POST(self):
        if self.path == '/inbox':
            body = self._body()
            # font-tweaks payloads are stored whole under a 'tweaks' key;
            # edit threads are MERGED so per-comment sends accumulate.
            cur = _read(INBOX, {'threads': {}})
            if body.get('type') == 'font-tweaks':
                cur['tweaks'] = body
            else:
                cur.setdefault('threads', {})
                for tid, thread in (body.get('threads') or {}).items():
                    cur['threads'][tid] = thread
                if body.get('source'):
                    cur['source'] = body['source']
            _write(INBOX, cur)
            return self._send(200, {'ok': True})

        if self.path == '/tov-request':
            body = self._body()
            rid = 'tov-' + uuid.uuid4().hex[:10]
            req = {
                'id': rid,
                'text': body.get('text', ''),
                'selector': body.get('selector', ''),
                'lang': body.get('lang', 'en'),
                'slug': body.get('slug', ''),
            }
            q = _read(TOV_REQ, [])
            q.append(req)
            _write(TOV_REQ, q)
            return self._send(200, {'id': rid})

        if self.path == '/tov-result':
            body = self._body()
            rid = body.get('id')
            if not rid:
                return self._send(400, {'error': 'no id'})
            res = _read(TOV_RES, {})
            res[rid] = {
                'verdict': body.get('verdict', ''),
                'score': body.get('score'),
                'suggestions': body.get('suggestions', []),
            }
            _write(TOV_RES, res)
            # drop it from the pending queue
            q = [r for r in _read(TOV_REQ, []) if r.get('id') != rid]
            _write(TOV_REQ, q)
            return self._send(200, {'ok': True})

        return self._send(404)

    def log_message(self, *_):
        pass  # silent


PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8002
print(f'inbox-server listening on :{PORT}', flush=True)
HTTPServer(('', PORT), Handler).serve_forever()
