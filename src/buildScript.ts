/**
 * buildScript(config) — the CANONICAL Edit Mode, as a self-contained IIFE string.
 *
 * This is the single source every project consumes (BSO Website route handler,
 * Stape/AI Skills static or React surfaces). It carries the full canonical panel:
 *   - Visual edits → in-place corner PINS on the element (Figma/Miro model)
 *   - Copy + ToV edits → right-margin RAIL markers (Notion model)
 *   - amber inline highlight on commented text; collapsed bubble → hover preview → click card
 *   - each card carries its OWN "Send to Claude" / "Resolve" (per-comment)
 *   - ToV check → posts to inbox /tov-request; the CC session runs tov-lint and
 *     writes the verdict back; the browser polls /tov-poll and renders it
 *   - Tweaks panel (font sizes / line heights / weight+style) — live CSS vars
 *
 * Panel chrome reads `--emc-*` CSS vars, injected at runtime as
 * `var(--<host-var>, <default>)` — so it inherits a host theme (and its day/night
 * toggle) when present, and falls back to the BSO palette everywhere else.
 * Tweaks targets (--fs-*, --lh-*, --w-*, --st-*) are the HOST's typography vars,
 * supplied per-project via `config.tweaks`.
 */

export interface EditModeSizeToken { k: string; l: string; d: number; min: number; max: number; }
export interface EditModeWeightToken { l: string; w: string; s: string; wd: number; sd: string; }
export interface EditModeTokenRule { match: string; token: string; label?: string; }
/** Font-family picker row. `k` = CSS var (e.g. '--font-body'), `l` = label, `d` = default value. */
export interface EditModeFontToken { k: string; l: string; d?: string; }

export interface EditModeConfig {
  /** localStorage namespace + payload `source`. Usually the client/page slug. */
  slug: string;
  /** Inbox server base URL. Default 'http://localhost:8002'. */
  inboxBase?: string;
  /** Tweaks panel targets (host typography CSS vars). Omit → no Tweaks panel. */
  tweaks?: {
    sizes?: EditModeSizeToken[];
    lineHeights?: EditModeSizeToken[];
    weightStyles?: EditModeWeightToken[];
    /** Override the default weight/style options shown in every Weight & Style dropdown.
     *  Format: [cssWeight|cssStyle, label]. Default: Regular/Medium/Bold/Italic.
     *  Use this to expose all loaded variants of the project's brand font. */
    weightOptions?: Array<[string, string]>;
    /** Font-family pickers — each row controls one CSS var via all system fonts
     *  (loaded via window.queryLocalFonts(); falls back to text input if unavailable). */
    fontFamilies?: EditModeFontToken[];
  };
  /** Declarative block→token map driving the Tweaks-row hover highlight + dialog label. */
  tokenMap?: EditModeTokenRule[];
  /** Panel chrome theme defaults (used when the host doesn't define the matching var). */
  theme?: Partial<{ ink: string; paper: string; paperSoft: string; rule: string; ruleStrong: string; ink40: string; ink55: string; surface: string; ring: string; mono: string; text: string; display: string; }>;
}

const DEFAULT_THEME = {
  ink: '#1A1A1A', paper: '#FAF9F6', paperSoft: '#F1EFE9', rule: '#E5E3DC', ruleStrong: '#CFCCC2',
  ink40: '#9A9A9A', ink55: '#6B6B6B', surface: '#FFFFFF', ring: '#4A7C5E',
  mono: 'ui-monospace,Menlo,monospace', text: 'system-ui,sans-serif', display: 'system-ui,sans-serif',
};

/** Inner IIFE JS only (no <script> wrapper) — for React dangerouslySetInnerHTML. */
export function buildScriptInner(cfg: EditModeConfig): string {
  const slug = cfg.slug;
  const inbox = (cfg.inboxBase || 'http://localhost:8002').replace(/\/$/, '');
  const T = { ...DEFAULT_THEME, ...(cfg.theme || {}) };
  const sizes = cfg.tweaks?.sizes ?? [];
  const lineHeights = cfg.tweaks?.lineHeights ?? [];
  const weightStyles = cfg.tweaks?.weightStyles ?? [];
  const fontFamilies = cfg.tweaks?.fontFamilies ?? [];
  const weightOptions = cfg.tweaks?.weightOptions ?? null; // null = use default 4 in IIFE
  const tokenMap = cfg.tokenMap ?? [];
  const hasTweaks = sizes.length > 0 || lineHeights.length > 0 || weightStyles.length > 0 || fontFamilies.length > 0;

  const twLabelMap: Record<string, string> = {};
  tokenMap.forEach(r => { twLabelMap[r.token] = r.label || r.token; });

  // tokenForEl is generated from the declarative tokenMap (data, not project code).
  const tokenForElSrc = `function tokenForEl(el){ if(!el||!el.matches) return null; var rules=${JSON.stringify(tokenMap)}; for(var i=0;i<rules.length;i++){ var r=rules[i]; try{ if(el.matches(r.match)||(el.closest&&el.closest(r.match))) return r.token; }catch(e){} } return null; }`;

  // ── theme fallback layer (NOT remapped — references host vars by their real names) ──
  const themeInject = `(function(){ var s=document.createElement('style'); s.textContent=':root{'+'--emc-ink:var(--ink,${T.ink});--emc-paper:var(--paper,${T.paper});--emc-paper-soft:var(--paper-soft,${T.paperSoft});--emc-rule:var(--rule,${T.rule});--emc-rule-strong:var(--rule-strong,${T.ruleStrong});--emc-ink-40:var(--ink-40,${T.ink40});--emc-ink-55:var(--ink-55,${T.ink55});--emc-surface:var(--surface,${T.surface});--emc-ring:var(--em-ring,${T.ring});--emc-mono:var(--mono,${T.mono});--emc-text:var(--text,${T.text});--emc-display:var(--display,${T.display});'+'}'; document.head.appendChild(s); })();`;

  // ── Tweaks panel block (only emitted when the project supplies tweak targets) ──
  const tweaksBlock = hasTweaks ? `
  /* ── Tweaks panel — live CSS-var controls (font size + line height) ── */
  var TW_STORE='pw-${slug}-tweaks';
  var TW_STAGED='pw-${slug}-tweaks-staged';
  var SIZES=${JSON.stringify(sizes)};
  var LHS=${JSON.stringify(lineHeights)};
  function twLoad(){ try{ return JSON.parse(localStorage.getItem(TW_STORE)||'{}'); }catch(e){ return {}; } }
  var twSaved=twLoad();
  SIZES.forEach(function(s){ if(twSaved[s.k]!==undefined) document.documentElement.style.setProperty(s.k,twSaved[s.k]+'px'); });
  LHS.forEach(function(h){ if(twSaved[h.k]!==undefined) document.documentElement.style.setProperty(h.k,(twSaved[h.k]/100).toFixed(2)); });
  var WSTYLE=${JSON.stringify(weightStyles)};
  var FONTFAMS=${JSON.stringify(fontFamilies)};
  FONTFAMS.forEach(function(f){ if(twSaved[f.k]) document.documentElement.style.setProperty(f.k,twSaved[f.k]); });
  /* Load all system fonts via Local Font Access API and populate datalists */
  (function loadFonts(){
    if(!window.queryLocalFonts) return;
    window.queryLocalFonts().then(function(fonts){
      var seen={}, families=[];
      fonts.forEach(function(f){ if(!seen[f.family]){ seen[f.family]=1; families.push(f.family); } });
      families.sort();
      document.querySelectorAll('.em-font-dl').forEach(function(dl){
        families.forEach(function(fam){ var opt=document.createElement('option'); opt.value=fam; dl.appendChild(opt); });
      });
    }).catch(function(){});
  })();
  WSTYLE.forEach(function(o){ if(twSaved[o.w]!==undefined) document.documentElement.style.setProperty(o.w,twSaved[o.w]); if(twSaved[o.s]!==undefined) document.documentElement.style.setProperty(o.s,twSaved[o.s]); });
  var WOPTS=${weightOptions ? JSON.stringify(weightOptions) : "[['400|normal','Regular'],['500|normal','Medium'],['700|normal','Bold'],['400|italic','Italic']]"};
  function wsRow(o){ var cw=twSaved[o.w]!==undefined?twSaved[o.w]:o.wd; var cs=twSaved[o.s]!==undefined?twSaved[o.s]:o.sd; var cur=cw+'|'+cs; var sel=WOPTS.map(function(p){return '<option value="'+p[0]+'"'+(p[0]===cur?' selected':'')+'>'+p[1]+'</option>';}).join(''); return '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;margin:0 -6px;border-bottom:1px solid var(--rule);"><span style="font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-40);min-width:80px;">'+o.l+'</span><select class="ws-sel" data-w="'+o.w+'" data-s="'+o.s+'" style="font-family:var(--mono);font-size:10px;border:1px solid var(--rule-strong);border-radius:4px;padding:4px 6px;background:var(--surface);color:var(--ink);cursor:pointer;">'+sel+'</select></div>'; }
  function twApplyPx(k,v){ document.documentElement.style.setProperty(k,v+'px'); var s=twLoad(); s[k]=Number(v); localStorage.setItem(TW_STORE,JSON.stringify(s)); }
  function twApplyLh(k,v){ document.documentElement.style.setProperty(k,(v/100).toFixed(2)); var s=twLoad(); s[k]=Number(v); localStorage.setItem(TW_STORE,JSON.stringify(s)); }
  function twStaged(){ try{ return JSON.parse(localStorage.getItem(TW_STAGED)||'{}'); }catch(e){ return {}; } }
  function twStageNow(){ localStorage.setItem(TW_STAGED, JSON.stringify(twLoad())); }
  function twStagedCount(){ return Object.keys(twStaged()).length; }
  function updateStagedInd(){ var el=document.getElementById('tw-staged-ind'); if(!el)return; var n=twStagedCount(); el.textContent=n?('staged: '+n+' value'+(n===1?'':'s')+' — ready for Claude'):'change sliders, then Save to stage'; el.style.color=n?'var(--ink)':'var(--ink-40)'; }
  function twRow(o,isLh){ var cur=twSaved[o.k]!==undefined?twSaved[o.k]:o.d; var sid='tw'+o.k.replace(/[^a-z0-9]/gi,'_'); return '<div id="'+twRowId(o.k)+'" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;margin:0 -6px;border-radius:4px;border-bottom:1px solid var(--rule);transition:background .15s,box-shadow .15s;"><span style="font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-40);min-width:92px;">'+o.l+'</span><div style="display:flex;align-items:center;gap:5px;"><input type="range" data-lh="'+(isLh?1:0)+'" data-key="'+o.k+'" min="'+o.min+'" max="'+o.max+'" value="'+cur+'" style="width:66px;cursor:pointer;accent-color:var(--ink);"><span id="'+sid+'" style="font-family:var(--mono);font-size:9px;color:var(--ink-55);min-width:30px;text-align:right;">'+(isLh?(cur/100).toFixed(2):cur+'px')+'</span></div></div>'; }
  function twLabel(t){ return '<p style="font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);margin:14px 0 6px;padding-bottom:4px;border-bottom:1.5px solid var(--ink);">'+t+'</p>'; }
  function ffRow(o){ var cur=twSaved[o.k]||o.d||''; var dlId='em-dl-'+o.k.replace(/[^a-z0-9]/gi,'_'); return '<div style="padding:6px 6px 5px;margin:0 -6px;border-bottom:1px solid var(--rule);"><span style="display:block;font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-40);margin-bottom:4px;">'+o.l+'</span><input class="em-ff-inp" data-key="'+o.k+'" list="'+dlId+'" value="'+cur+'" placeholder="Type or pick font…" style="display:block;width:100%;box-sizing:border-box;font-family:var(--text);font-size:12px;border:1px solid var(--rule-strong);border-radius:4px;padding:5px 7px;background:var(--surface);color:var(--ink);outline:none;"><datalist id="'+dlId+'" class="em-font-dl"></datalist></div>'; }
  var twPanel=mk('div'); twPanel.className='em-ui'; twPanel.style.cssText='position:fixed;bottom:74px;right:24px;z-index:9998;display:none;background:var(--paper);border:1.5px solid var(--rule-strong);border-radius:10px;padding:14px 16px;width:250px;max-height:80vh;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,.16);';
  twPanel.innerHTML=(SIZES.length?twLabel('Font sizes')+SIZES.map(function(s){return twRow(s,false);}).join(''):'')+(LHS.length?twLabel('Line heights')+LHS.map(function(h){return twRow(h,true);}).join(''):'')+(WSTYLE.length?twLabel('Weight & style')+WSTYLE.map(wsRow).join(''):'')+(FONTFAMS.length?twLabel('Font families')+FONTFAMS.map(ffRow).join(''):'')+'<p id="tw-staged-ind" style="font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-40);margin:14px 0 6px;"></p><div style="display:flex;gap:6px;"><button id="tw-stage" style="flex:1;background:var(--surface);color:var(--ink);border:1.5px solid var(--ink);border-radius:6px;padding:7px 0;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">Save</button><button id="tw-reset" style="flex:1;background:transparent;border:1px solid var(--rule-strong);border-radius:6px;padding:7px 0;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-55);cursor:pointer;">Reset</button></div><button id="tw-save" style="display:block;width:100%;margin-top:6px;background:var(--ink);color:var(--paper);border:none;border-radius:6px;padding:8px 0;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">&#8594; Save to Claude</button>';
  document.body.appendChild(twPanel);
  twPanel.querySelectorAll('input[type="range"]').forEach(function(inp){ inp.addEventListener('input',function(){ var sid='tw'+inp.dataset.key.replace(/[^a-z0-9]/gi,'_'),sp=document.getElementById(sid); if(inp.dataset.lh==='1'){ if(sp)sp.textContent=(inp.value/100).toFixed(2); twApplyLh(inp.dataset.key,inp.value); } else { if(sp)sp.textContent=inp.value+'px'; twApplyPx(inp.dataset.key,inp.value); } }); });
  twPanel.querySelectorAll('.ws-sel').forEach(function(sel){ sel.addEventListener('change',function(ev){ ev.stopPropagation(); var p=sel.value.split('|'),w=p[0],st=p[1]; document.documentElement.style.setProperty(sel.dataset.w,w); document.documentElement.style.setProperty(sel.dataset.s,st); var d=twLoad(); d[sel.dataset.w]=Number(w); d[sel.dataset.s]=st; localStorage.setItem(TW_STORE,JSON.stringify(d)); }); });
  twPanel.querySelectorAll('.em-ff-inp').forEach(function(inp){ inp.addEventListener('input',function(ev){ ev.stopPropagation(); var val=inp.value.trim(); if(!val)return; document.documentElement.style.setProperty(inp.dataset.key,val); var d=twLoad(); d[inp.dataset.key]=val; localStorage.setItem(TW_STORE,JSON.stringify(d)); }); });
  updateStagedInd();
  document.getElementById('tw-stage').addEventListener('click',function(ev){ ev.stopPropagation(); twStageNow(); updateStagedInd(); var b=document.getElementById('tw-stage'),o=b.textContent; b.textContent='✓ Saved'; b.style.background='var(--ink)'; b.style.color='var(--paper)'; setTimeout(function(){b.textContent=o;b.style.background='var(--surface)';b.style.color='var(--ink)';},1200); });
  document.getElementById('tw-reset').addEventListener('click',function(ev){ ev.stopPropagation(); localStorage.removeItem(TW_STORE); localStorage.removeItem(TW_STAGED); SIZES.forEach(function(s){ document.documentElement.style.setProperty(s.k,s.d+'px'); }); LHS.forEach(function(h){ document.documentElement.style.setProperty(h.k,(h.d/100).toFixed(2)); }); WSTYLE.forEach(function(o){ document.documentElement.style.setProperty(o.w,o.wd); document.documentElement.style.setProperty(o.s,o.sd); }); FONTFAMS.forEach(function(f){ if(f.d) document.documentElement.style.setProperty(f.k,f.d); }); twPanel.remove(); twBtn.remove(); });
  document.getElementById('tw-save').addEventListener('click',function(ev){ ev.stopPropagation(); var b=document.getElementById('tw-save'); var vals=twStagedCount()?twStaged():twLoad(); if(!Object.keys(vals).length){ b.textContent='— nothing to send'; setTimeout(function(){b.innerHTML='&#8594; Save to Claude';},1400); return; } fetch(INBOX,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'font-tweaks',source:'${slug}',values:vals,savedAt:new Date().toISOString()})}).then(function(){ localStorage.removeItem(TW_STAGED); updateStagedInd(); b.textContent='✓ Sent batch!'; setTimeout(function(){b.innerHTML='&#8594; Save to Claude';},2000); }).catch(function(){ b.textContent='✗ Server off'; setTimeout(function(){b.innerHTML='&#8594; Save to Claude';},2500); }); });
  var twBtn=mk('button'); twBtn.className='em-ui'; twBtn.textContent='Aa'; twBtn.title='Tweaks — font size & line height'; twBtn.style.cssText='position:fixed;bottom:24px;right:70px;z-index:9999;width:40px;height:40px;border-radius:50%;border:1.5px solid var(--rule-strong);background:var(--paper);color:var(--ink);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.10);font-family:var(--display);line-height:1;';
  twBtn.addEventListener('click',function(){ twPanel.style.display=twPanel.style.display==='none'?'block':'none'; });
  document.body.appendChild(twBtn);
` : '';

  // ── BODY (verbatim from the canonical chrome.ts IIFE; chrome vars remapped below) ──
  let body = `
  var INBOX='${inbox}/inbox', REQ='${inbox}/tov-request', POLL='${inbox}/tov-poll';
  var STORE='pw-${slug}-edit-threads';
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE)||'{"threads":{}}'); }catch(e){ return {threads:{}}; } }
  function persist(d){ d.savedAt=new Date().toISOString(); localStorage.setItem(STORE,JSON.stringify(d)); }
  function mk(t){ return document.createElement(t); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function cssSel(el){ if(el.id) return '#'+el.id; var path=[],n=el; while(n&&n!==document.body&&path.length<5){ if(n.id){path.unshift('#'+n.id);break;} var seg=n.tagName.toLowerCase(); var par=n.parentElement; if(par){ var same=Array.prototype.filter.call(par.children,function(c){return c.tagName===n.tagName;}); if(same.length>1) seg+=':nth-of-type('+(Array.prototype.indexOf.call(same,n)+1)+')'; } path.unshift(seg); n=par; } return path.join(' > '); }
  function findEl(t){ var sels=[t.selector,(t.element&&t.element.selector)]; for(var i=0;i<sels.length;i++){ if(!sels[i])continue; try{ var el=document.querySelector(sels[i]); if(el) return el; }catch(e){} } return null; }
  function langOf(s){ return /[\\u0400-\\u04FF]/.test(s||'') ? 'ru' : 'en'; }

  var editBtn=mk('button'); editBtn.className='em-ui'; editBtn.innerHTML='&#9998; Edit';
  editBtn.style.cssText='position:fixed;top:14px;right:16px;z-index:10000;background:var(--paper);color:var(--ink-55);border:1px solid var(--rule-strong);border-radius:6px;padding:5px 12px;font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;backdrop-filter:blur(10px);box-shadow:0 1px 6px rgba(0,0,0,.10);transition:all .12s;line-height:1;white-space:nowrap;';
  document.body.appendChild(editBtn);
  var ring=mk('div'); ring.className='em-ui'; ring.style.cssText='position:fixed;pointer-events:none;z-index:9995;display:none;outline:2px solid var(--em-ring);outline-offset:2px;background:transparent;border-radius:4px;'; document.body.appendChild(ring);
  var hl=mk('div'); hl.className='em-ui'; hl.style.cssText='position:fixed;pointer-events:none;z-index:9994;display:none;outline:2px dashed var(--em-ring);outline-offset:2px;border-radius:4px;'; document.body.appendChild(hl);
  var tip=mk('div'); tip.className='em-ui'; tip.style.cssText='position:fixed;z-index:10004;display:none;max-width:240px;background:var(--ink);color:var(--paper);border-radius:8px;padding:8px 10px;font-family:var(--text);font-size:12px;line-height:1.45;box-shadow:0 8px 28px rgba(0,0,0,.28);pointer-events:none;'; document.body.appendChild(tip);

  var dlg=mk('div'); dlg.className='em-ui'; dlg.style.cssText='position:fixed;z-index:10002;display:none;background:var(--paper);border:1.5px solid var(--rule-strong);border-radius:12px;padding:14px;width:320px;box-shadow:0 16px 48px rgba(0,0,0,.20);font-family:var(--text);';
  var MB='flex:1;border:none;border-radius:4px;padding:3px 0;font-family:var(--mono);font-size:9px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;';
  dlg.innerHTML='<div id="em-dlg-handle" style="display:flex;justify-content:center;align-items:center;height:14px;margin:-4px -4px 8px;border-radius:8px 8px 0 0;cursor:grab;opacity:.35;user-select:none;" title="Drag to move"><svg width="20" height="6" viewBox="0 0 20 6"><circle cx="4" cy="3" r="1.5" fill="currentColor"/><circle cx="10" cy="3" r="1.5" fill="currentColor"/><circle cx="16" cy="3" r="1.5" fill="currentColor"/></svg></div><div style="display:flex;gap:4px;margin-bottom:10px;background:var(--paper-soft);border-radius:6px;padding:3px;"><button id="em-mode-v" style="'+MB+'background:var(--ink);color:var(--paper);">Visual</button><button id="em-mode-c" style="'+MB+'background:transparent;color:var(--ink-40);">Copy</button><button id="em-mode-r" style="'+MB+'background:transparent;color:var(--ink-40);">Rewrite</button><button id="em-mode-t" style="'+MB+'background:transparent;color:var(--ink-40);">ToV</button></div><p id="em-lbl" style="font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-40);margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></p><div id="em-body"></div>';
  document.body.appendChild(dlg);
  /* ── dialog drag ── */
  (function(){
    var dragging=false, ox=0, oy=0;
    dlg.addEventListener('mousedown',function(e){
      var h=document.getElementById('em-dlg-handle');
      if(!h||!h.contains(e.target))return;
      e.preventDefault(); e.stopPropagation();
      dragging=true; document.body.style.userSelect='none';
      var r=dlg.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top;
      h.style.cursor='grabbing';
    });
    document.addEventListener('mousemove',function(e){
      if(!dragging)return;
      var x=Math.max(0,Math.min(window.innerWidth-dlg.offsetWidth,e.clientX-ox));
      var y=Math.max(0,Math.min(window.innerHeight-dlg.offsetHeight,e.clientY-oy));
      dlg.style.left=x+'px'; dlg.style.top=y+'px';
    });
    document.addEventListener('mouseup',function(){
      if(!dragging)return; dragging=false; document.body.style.userSelect='';
      var h=document.getElementById('em-dlg-handle'); if(h) h.style.cursor='grab';
    });
  })();

  var card=mk('div'); card.className='em-ui'; card.setAttribute('data-em-card','1'); card.style.cssText='position:fixed;z-index:10003;display:none;width:308px;max-height:72vh;overflow-y:auto;background:var(--paper);border:1.5px solid var(--rule-strong);border-radius:12px;padding:14px;box-shadow:0 16px 48px rgba(0,0,0,.22);font-family:var(--text);';
  document.body.appendChild(card);

  function ours(el){ if(!el) return false; if(el.closest&&(el.closest('.em-ui')||el.closest('[data-em-marker]')||el.closest('.theme-toggle'))) return true; return [editBtn,ring,hl,tip,dlg,card,(typeof twPanel!=='undefined'?twPanel:null),(typeof twBtn!=='undefined'?twBtn:null)].some(function(n){ return n&&n.contains&&n.contains(el); }); }

  ${tokenForElSrc}
  var twLabelMap=${JSON.stringify(twLabelMap)};
  function twRowId(k){ return 'twrow-'+k.replace(/[^a-z0-9]/gi,'_'); }
  function highlightRow(key){ document.querySelectorAll('[id^="twrow-"]').forEach(function(r){ r.style.background='transparent'; r.style.boxShadow='none'; }); if(!key) return; var row=document.getElementById(twRowId(key)); if(row){ row.style.background='var(--paper-soft)'; row.style.boxShadow='inset 2px 0 0 var(--ink)'; } }

  var active=false,pending=null,editMode='visual',copyId=null,rewriting=null,rwOrig='';
  function setMode(m){ editMode=m; var v=document.getElementById('em-mode-v'),c=document.getElementById('em-mode-c'),r=document.getElementById('em-mode-r'),tt=document.getElementById('em-mode-t'); [['visual',v],['copy',c],['rewrite',r],['tov',tt]].forEach(function(p){ if(!p[1])return; var on=editMode===p[0]; p[1].style.background=on?'var(--ink)':'transparent'; p[1].style.color=on?'var(--paper)':'var(--ink-40)'; }); if(editMode!=='rewrite'&&rewriting) endRewrite(true); if(pending&&dlg.style.display!=='none') renderBody(); }
  function activate(){ active=true; editBtn.innerHTML='&#10005; Exit'; editBtn.style.background='var(--ink)'; editBtn.style.color='var(--paper)'; document.body.style.cursor='crosshair'; document.addEventListener('mouseover',onHover,true); document.addEventListener('mouseout',onUnhover,true); document.addEventListener('click',onPick,true); }
  function deactivate(){ active=false; editBtn.innerHTML='&#9998; Edit'; editBtn.style.background='var(--paper)'; editBtn.style.color='var(--ink-55)'; document.body.style.cursor=''; ring.style.display='none'; highlightRow(null); closeDlg(); document.removeEventListener('mouseover',onHover,true); document.removeEventListener('mouseout',onUnhover,true); document.removeEventListener('click',onPick,true); }
  editBtn.addEventListener('click',function(ev){ ev.stopPropagation(); active?deactivate():activate(); });
  function onHover(ev){ if(ours(ev.target)){ring.style.display='none';return;} var r=ev.target.getBoundingClientRect(); ring.style.top=r.top+'px'; ring.style.left=r.left+'px'; ring.style.width=r.width+'px'; ring.style.height=r.height+'px'; ring.style.display='block'; highlightRow(tokenForEl(ev.target)); }
  function onUnhover(){ ring.style.display='none'; }
  function onPick(ev){ if(ours(ev.target))return; if(rewriting){ if(rewriting.contains(ev.target))return; ev.preventDefault(); ev.stopPropagation(); commitRewrite(); return; } if(card.style.display!=='none'){ ev.preventDefault(); ev.stopPropagation(); closeCard(); return; } ev.preventDefault(); ev.stopPropagation(); pending=ev.target; copyId=null; var r=ev.target.getBoundingClientRect(); var top=r.bottom+8; if(top+300>window.innerHeight) top=Math.max(8,r.top-300); var left=Math.min(ev.clientX,window.innerWidth-336); if(left<8)left=8; dlg.style.top=top+'px'; dlg.style.left=left+'px'; dlg.style.display='block'; var tag=pending.tagName.toLowerCase(); var cls=pending.classList[0]?'.'+pending.classList[0]:''; var tk=tokenForEl(pending); document.getElementById('em-lbl').textContent=(tk&&twLabelMap[tk]?twLabelMap[tk]+' · ':'')+tag+cls; renderBody(); }
  function closeDlg(){ if(rewriting) endRewrite(true); dlg.style.display='none'; pending=null; copyId=null; }

  function renderBody(){ var body=document.getElementById('em-body'); if(!body)return; if(editMode==='visual') renderVisualBody(body); else if(editMode==='copy') renderCopyBody(body); else if(editMode==='rewrite') renderRewriteBody(body); else renderTovBody(body); }

  function renderVisualBody(body){ body.innerHTML='<textarea id="em-ta" rows="3" placeholder="What layout/style change?" style="display:block;width:100%;box-sizing:border-box;border:1px solid var(--rule-strong);border-radius:6px;padding:9px 10px;font-family:var(--text);font-size:14px;line-height:1.5;resize:vertical;background:var(--surface);color:var(--ink);outline:none;"></textarea><div style="display:flex;gap:8px;margin-top:8px;"><button id="em-ok" style="flex:2;background:var(--ink);color:var(--paper);border:none;border-radius:6px;padding:8px 0;font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">Save &#8629;</button><button id="em-cancel" style="flex:1;background:transparent;color:var(--ink-55);border:1px solid var(--rule-strong);border-radius:6px;padding:8px 0;font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">Cancel</button></div>'; var ta=document.getElementById('em-ta'); setTimeout(function(){ta.focus();},40); ta.onkeydown=function(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveVisual();} if(e.key==='Escape')closeDlg(); }; document.getElementById('em-ok').onclick=function(ev){ev.stopPropagation();saveVisual();}; document.getElementById('em-cancel').onclick=function(ev){ev.stopPropagation();closeDlg();}; }
  function saveVisual(){ var ta=document.getElementById('em-ta'); if(!ta)return; var txt=ta.value.trim(); if(!txt){closeDlg();return;} var id='edit-'+Date.now(),d=load(); d.threads[id]={id:id,type:'visual',prompt:txt,selector:cssSel(pending),element:{tag:pending.tagName.toLowerCase(),className:pending.className||'',textContent:(pending.textContent||'').trim().slice(0,120),selector:cssSel(pending)},status:'pending',createdAt:new Date().toISOString()}; persist(d); closeDlg(); renderMarkers(); openCard(id); }

  function renderRewriteBody(body){ if(!pending){body.innerHTML='';return;}
    if(rewriting!==pending){ if(rewriting) endRewrite(true); rewriting=pending; rwOrig=(pending.textContent||''); pending.setAttribute('contenteditable','true'); pending.setAttribute('spellcheck','false'); pending.style.outline='2px solid var(--emc-ink)'; pending.style.outlineOffset='2px'; setTimeout(function(){ try{ pending.focus(); var rg=document.createRange(); rg.selectNodeContents(pending); rg.collapse(false); var sl=getSelection(); sl.removeAllRanges(); sl.addRange(rg); }catch(e){} },30); }
    body.innerHTML='<p style="font-family:var(--text);font-size:12px;color:var(--ink-55);margin-bottom:8px;line-height:1.45;">Rewrite the text <b>directly on the page</b>, then Save. The original is kept — your rewrite teaches your tone of voice.</p><div style="display:flex;gap:8px;"><button id="em-rw-ok" style="flex:2;background:var(--ink);color:var(--paper);border:none;border-radius:6px;padding:8px 0;font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">Save &#8629;</button><button id="em-rw-cancel" style="flex:1;background:transparent;color:var(--ink-55);border:1px solid var(--rule-strong);border-radius:6px;padding:8px 0;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">Cancel</button></div>';
    document.getElementById('em-rw-ok').onclick=function(ev){ev.stopPropagation();commitRewrite();};
    document.getElementById('em-rw-cancel').onclick=function(ev){ev.stopPropagation();cancelRewrite();};
  }
  function endRewrite(restore){ if(!rewriting)return; var el=rewriting; el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck'); el.style.outline=''; el.style.outlineOffset=''; if(restore) el.textContent=rwOrig; rewriting=null; }
  function cancelRewrite(){ endRewrite(true); closeDlg(); }
  function commitRewrite(){ if(!rewriting)return; var el=rewriting; var rewritten=(el.textContent||'').trim(); var original=(rwOrig||'').trim(); var sel=cssSel(el); endRewrite(false); if(!rewritten||rewritten===original){ closeDlg(); renderMarkers(); return; } var id='rw-'+Date.now(); var d=load(); d.threads[id]={id:id,type:'rewrite',selector:sel,element:{tag:el.tagName.toLowerCase(),className:el.className||'',selector:sel},original:original,rewritten:rewritten,lang:langOf(rewritten),status:'pending',createdAt:new Date().toISOString()}; persist(d); closeDlg(); renderMarkers(); openCard(id); }

  function ensureCopyThread(){ var d=load(),sel=cssSel(pending); for(var k in d.threads){ if(d.threads[k].type==='copy'&&d.threads[k].selector===sel){ copyId=k; return d.threads[k]; } } var id='copy-'+Date.now(); d.threads[id]={id:id,type:'copy',selector:sel,element:{tag:pending.tagName.toLowerCase(),className:pending.className||'',selector:sel},sourceText:(pending.textContent||'').trim(),variants:[],activeIndex:-1,chosenIndex:null,status:'pending',createdAt:new Date().toISOString()}; persist(d); copyId=id; return d.threads[id]; }
  function getCopy(){ return load().threads[copyId]; }
  function updCopy(fn){ var d=load(); fn(d.threads[copyId]); persist(d); }
  function previewIndex(i){ var t=getCopy(); pending.textContent=(i<0?t.sourceText:t.variants[i]); updCopy(function(c){c.activeIndex=i;}); renderCopyBody(document.getElementById('em-body')); }
  function variantRow(i,text,tag,isActive,isChosen){
    var s=(text||''); var snip=s.slice(0,64)+(s.length>64?'…':'');
    // SOURCE row (i===-1) is editable — user can fix a word directly
    if(i===-1){
      return '<div style="border-top:1px solid var(--rule);padding:6px 0 4px;"><span style="font-family:var(--mono);font-size:8px;letter-spacing:.06em;color:var(--ink-40);">'+tag+(isActive?' · previewing':'')+'</span><textarea id="em-src-ta" rows="2" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;border:1px solid var(--rule-strong);border-radius:5px;padding:6px 8px;font-family:var(--text);font-size:12px;line-height:1.45;resize:vertical;background:var(--paper-soft);color:var(--ink);outline:none;">'+esc(s)+'</textarea></div>';
    }
    return '<div style="border-top:1px solid var(--rule);padding:7px 0;display:flex;gap:6px;align-items:flex-start;'+(isActive?'background:var(--paper-soft);':'')+'border-radius:4px;"><button data-prev="'+i+'" title="Preview on page" style="background:none;border:none;cursor:pointer;text-align:left;flex:1;padding:2px 4px;"><span style="font-family:var(--mono);font-size:8px;letter-spacing:.06em;color:'+(isChosen?'var(--ink)':'var(--ink-40)')+';">'+tag+(isChosen?' ✓ CHOSEN':'')+(isActive?' · previewing':'')+'</span><br><span style="font-family:var(--text);font-size:12px;color:var(--ink);line-height:1.4;">'+esc(snip)+'</span></button>'+'<button data-use="'+i+'" title="Approve this one" style="background:none;border:none;color:var(--ink-40);cursor:pointer;font-family:var(--mono);font-size:9px;padding:2px 4px;">use</button><button data-del="'+i+'" title="Remove" style="background:none;border:none;color:var(--ink-40);cursor:pointer;font-size:13px;padding:2px 4px;">×</button>'+'</div>';
  }
  function renderCopyBody(body){ ensureCopyThread(); var t=getCopy(); var chips=variantRow(-1,t.sourceText,'SOURCE',t.activeIndex===-1,false); t.variants.forEach(function(v,i){ chips+=variantRow(i,v,'V'+(i+1),t.activeIndex===i,t.chosenIndex===i); }); body.innerHTML='<div style="max-height:150px;overflow-y:auto;margin-bottom:8px;">'+chips+'</div><textarea id="em-newv" rows="2" placeholder="Type a new copy variant…" style="display:block;width:100%;box-sizing:border-box;border:1px solid var(--rule-strong);border-radius:6px;padding:8px;font-family:var(--text);font-size:13px;line-height:1.45;resize:vertical;background:var(--surface);color:var(--ink);outline:none;"></textarea><div style="display:flex;gap:6px;margin-top:8px;"><button id="em-addv" style="flex:1;background:var(--ink);color:var(--paper);border:none;border-radius:6px;padding:7px 0;font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;">+ Add variant</button><button id="em-cdone" style="flex:1;background:transparent;color:var(--ink-55);border:1px solid var(--rule-strong);border-radius:6px;padding:7px 0;font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;">Done</button></div>'; var srcTa=body.querySelector('#em-src-ta'); if(srcTa){srcTa.addEventListener('input',function(ev){ev.stopPropagation();});srcTa.addEventListener('blur',function(ev){ev.stopPropagation();var val=srcTa.value;if(val!==getCopy().sourceText){updCopy(function(c){c.sourceText=val;});if(pending)pending.textContent=val;}});srcTa.addEventListener('keydown',function(ev){ev.stopPropagation();});}
    body.querySelectorAll('[data-prev]').forEach(function(b){ b.onclick=function(ev){ev.stopPropagation();previewIndex(Number(b.dataset.prev));}; }); body.querySelectorAll('[data-use]').forEach(function(b){ b.onclick=function(ev){ev.stopPropagation();var i=Number(b.dataset.use);updCopy(function(c){c.chosenIndex=i;});previewIndex(i);}; }); body.querySelectorAll('[data-del]').forEach(function(b){ b.onclick=function(ev){ev.stopPropagation();var i=Number(b.dataset.del);updCopy(function(c){c.variants.splice(i,1);if(c.chosenIndex===i)c.chosenIndex=null;else if(c.chosenIndex>i)c.chosenIndex--;c.activeIndex=-1;});pending.textContent=getCopy().sourceText;renderCopyBody(document.getElementById('em-body'));}; }); var nv=document.getElementById('em-newv'); document.getElementById('em-addv').onclick=function(ev){ ev.stopPropagation(); var txt=nv.value.trim(); if(!txt)return; updCopy(function(c){c.variants.push(txt);}); previewIndex(getCopy().variants.length-1); }; document.getElementById('em-cdone').onclick=function(ev){ ev.stopPropagation(); var t=getCopy(); var cid=copyId; if(t&&(!t.variants||!t.variants.length)){ var d=load(); delete d.threads[copyId]; persist(d); cid=null; } closeDlg(); renderMarkers(); if(cid&&load().threads[cid]) openCard(cid); }; nv.onkeydown=function(e){ if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();document.getElementById('em-addv').click();} }; }

  function renderTovBody(body){ var txt=(pending.textContent||'').trim(); var l=langOf(txt); body.innerHTML='<p style="font-family:var(--text);font-size:12px;font-style:italic;color:var(--ink-55);margin-bottom:8px;max-height:90px;overflow:auto;">“'+esc(txt.slice(0,260))+(txt.length>260?'…':'')+'”</p><p style="font-family:var(--mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-40);margin-bottom:8px;">Language: '+(l==='ru'?'Russian':'English')+' · ToV auto-detected</p><button id="em-tov-go" style="width:100%;background:var(--ink);color:var(--paper);border:none;border-radius:6px;padding:9px 0;font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">&#8594; Check against our ToV</button>'; document.getElementById('em-tov-go').onclick=function(ev){ ev.stopPropagation(); startTov(txt,l); }; }
  function startTov(txt,l){ if(!txt){closeDlg();return;} var sel=cssSel(pending); var id='tov-'+Date.now(); var th={id:id,type:'tov',selector:sel,element:{tag:pending.tagName.toLowerCase(),className:pending.className||'',textContent:txt.slice(0,120),selector:sel},text:txt,lang:l,tovStatus:'checking',status:'pending',createdAt:new Date().toISOString()}; var d=load(); d.threads[id]=th; persist(d); closeDlg(); renderMarkers(); openCard(id); fetch(REQ,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:txt,selector:sel,lang:l,slug:'${slug}'})}).then(function(r){return r.json();}).then(function(j){ var dd=load(); if(dd.threads[id]){ dd.threads[id].reqId=j.id; persist(dd); } pollTov(id,j.id,0); }).catch(function(){ var dd=load(); if(dd.threads[id]){ dd.threads[id].tovStatus='error'; dd.threads[id].verdict='Inbox server offline — start inbox-server.py on :8002.'; persist(dd); renderMarkers(); } }); }
  function pollTov(id,reqId,n){ if(n>60) return; setTimeout(function(){ fetch(POLL+'?id='+encodeURIComponent(reqId)).then(function(r){return r.json();}).then(function(res){ if(res&&res.pending){ pollTov(id,reqId,n+1); return; } var d=load(); if(!d.threads[id])return; d.threads[id].tovStatus='done'; d.threads[id].verdict=res.verdict||''; d.threads[id].score=res.score; d.threads[id].suggestions=res.suggestions||[]; persist(d); renderMarkers(); if(cardId===id) openCard(id); }).catch(function(){ pollTov(id,reqId,n+1); }); }, 2500); }

  var BUB='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 1 1 21 11.5z"/></svg>';
  var markerEls={}, hlEls={};
  function clearMarkers(){ var k; for(k in markerEls){ if(markerEls[k]&&markerEls[k].remove) markerEls[k].remove(); } for(k in hlEls){ if(hlEls[k]&&hlEls[k].remove) hlEls[k].remove(); } markerEls={}; hlEls={}; }
  function setHl(id,on){ var h=hlEls[id]; if(!h)return; h.style.background=on?'rgba(214,168,84,.34)':'rgba(214,168,84,.15)'; h.style.boxShadow=on?'0 0 0 1px rgba(214,168,84,.55)':'none'; }
  function showTip(it){ var t=it.t; var txt = t.type==='visual'?t.prompt : t.type==='rewrite'?(t.rewritten||'') : t.type==='copy'?((t.chosenIndex!=null?t.variants[t.chosenIndex]:t.sourceText)||'') : (t.tovStatus==='checking'?'Checking against ToV…':(t.verdict||'')); tip.textContent=(txt||'').slice(0,180); var m=markerEls[it.id]; if(!m){tip.style.display='none';return;} var r=m.getBoundingClientRect(); var top=r.top; var left=r.left-250; if(left<8) left=r.right+8; tip.style.top=Math.max(8,Math.min(top,window.innerHeight-80))+'px'; tip.style.left=left+'px'; tip.style.display='block'; }
  function hideTip(){ tip.style.display='none'; }
  function renderMarkers(){ clearMarkers(); var threads=load().threads; var rail=[]; var items=Object.keys(threads).map(function(id){ var el=findEl(threads[id]); return {id:id,t:threads[id],el:el,rect:el?el.getBoundingClientRect():null}; }); items.sort(function(a,b){ return (a.rect?a.rect.top:0)-(b.rect?b.rect.top:0); }); items.forEach(function(it){ if(it.rect) placeHighlight(it); placeMarker(it,rail); }); }
  function placeHighlight(it){ var r=it.rect,sx=window.pageXOffset,sy=window.pageYOffset; var h=mk('div'); h.setAttribute('data-em-marker','1'); h.style.cssText='position:absolute;z-index:9993;pointer-events:none;border-radius:3px;top:'+(r.top+sy-1)+'px;left:'+(r.left+sx-2)+'px;width:'+(r.width+4)+'px;height:'+(r.height+2)+'px;background:rgba(214,168,84,.15);transition:background .12s,box-shadow .12s;'; document.body.appendChild(h); hlEls[it.id]=h; }
  function placeMarker(it,rail){ var t=it.t,r=it.rect,m=mk('div'); m.setAttribute('data-em-marker','1'); m.dataset.id=it.id; m.title=(t.type==='visual'?'Visual':t.type==='tov'?'Tone of voice':t.type==='rewrite'?'Rewrite':'Copy')+' comment — click to open'; var sx=window.pageXOffset,sy=window.pageYOffset;
    var base='z-index:9996;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,.24);';
    if(!r){ var oy=64; rail.forEach(function(u){ if(u<3000&&Math.abs(oy-u)<28) oy=u+28; }); rail.push(oy); m.style.cssText='position:fixed;'+base+'top:'+Math.min(window.innerHeight-32,oy)+'px;right:12px;width:24px;height:24px;border-radius:50% 50% 3px 50%;background:var(--surface);color:var(--ink-40);border:1px dashed var(--rule-strong);'; m.innerHTML=BUB; m.title='Comment — anchor not found on page (click to open)'; }
    else if(t.type==='visual'||t.type==='rewrite'){ var top=r.top+sy-9,left=r.right+sx-9; m.style.cssText='position:absolute;'+base+'top:'+top+'px;left:'+left+'px;width:22px;height:22px;border-radius:50% 50% 50% 3px;background:var(--ink);color:var(--paper);border:2px solid var(--paper);'; m.innerHTML=BUB; }
    else { var y=r.top+sy; rail.forEach(function(u){ if(Math.abs(y-u)<28) y=u+28; }); rail.push(y); var gx=Math.min(r.right+sx+16,(document.documentElement.clientWidth+sx)-34); var badge=t.type==='tov'?(t.tovStatus==='checking'?'…':(t.tovStatus==='error'?'!':'✓')):''; m.style.cssText='position:absolute;'+base+'top:'+y+'px;left:'+gx+'px;width:24px;height:24px;border-radius:50% 50% 3px 50%;background:var(--paper);color:var(--ink);border:1px solid var(--rule-strong);'; m.innerHTML=badge?('<span style="font-family:var(--mono);font-size:11px;line-height:1;">'+badge+'</span>'):BUB; }
    m.addEventListener('mouseenter',function(){ showTip(it); setHl(it.id,true); });
    m.addEventListener('mouseleave',function(){ hideTip(); setHl(it.id,false); });
    m.addEventListener('click',function(ev){ ev.stopPropagation(); openCard(it.id); });
    document.body.appendChild(m); markerEls[it.id]=m; }

  var cardId=null;
  function closeCard(){ card.style.display='none'; cardId=null; }
  function positionCard(t,rect){ if(t.type==='visual'&&rect){ var top=Math.min(rect.bottom+8,window.innerHeight-180); var left=Math.max(8,Math.min(rect.left,window.innerWidth-324)); card.style.top=top+'px'; card.style.left=left+'px'; card.style.right='auto'; } else { var ry=rect?Math.max(54,Math.min(rect.top,window.innerHeight-220)):80; card.style.top=ry+'px'; card.style.right='52px'; card.style.left='auto'; } }
  function cardHtml(t){ var time=t.createdAt?new Date(t.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''; var lbl={visual:'VISUAL',copy:'COPY',rewrite:'REWRITE',tov:'TONE OF VOICE'}[t.type]||''; var head='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-40);">'+lbl+(time?(' · '+time):'')+'</span><button data-x style="background:none;border:none;color:var(--ink-40);cursor:pointer;font-size:15px;line-height:1;">&times;</button></div>'; var b='';
    if(t.type==='visual'){ var sn=(t.element&&t.element.textContent||'').slice(0,90); b=(sn?'<p style="font-family:var(--text);font-size:12px;font-style:italic;color:var(--ink-55);margin-bottom:6px;">“'+esc(sn)+'”</p>':'')+'<p style="font-size:13px;line-height:1.5;color:var(--ink);">'+esc(t.prompt||'')+'</p>'; }
    else if(t.type==='copy'){ var vs=t.variants||[]; var chosen=t.chosenIndex!=null?vs[t.chosenIndex]:null; b='<p style="font-family:var(--text);font-size:12px;font-style:italic;color:var(--ink-55);margin-bottom:6px;">“'+esc((t.sourceText||'').slice(0,90))+'”</p><p style="font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-40);margin-bottom:4px;">'+vs.length+' variant'+(vs.length===1?'':'s')+(chosen?' · chosen':'')+'</p>'+(chosen?'<p style="font-size:13px;line-height:1.5;color:var(--ink);">'+esc(chosen)+'</p>':''); }
    else if(t.type==='rewrite'){ b='<p style="font-size:12px;color:var(--ink-55);text-decoration:line-through;line-height:1.4;margin-bottom:4px;">'+esc((t.original||'').slice(0,180))+'</p><p style="font-size:13px;color:var(--ink);line-height:1.45;">'+esc((t.rewritten||'').slice(0,240))+'</p>'; if(t.learnStatus==='learning'){ b+='<p style="font-size:11px;color:var(--ink-40);margin-top:8px;">Teaching your tone of voice…</p>'; } else if(t.learnStatus==='error'){ b+='<p style="font-size:11px;color:var(--ink-40);margin-top:8px;">'+esc(t.learned||'Learn channel offline.')+'</p>'; } else if(t.learnStatus==='done'){ b+='<div style="border-top:1px solid var(--rule);margin-top:8px;padding-top:8px;"><p style="font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-40);margin-bottom:4px;">Learned · saved to corpus</p>'+(t.learned?'<p style="font-size:12px;color:var(--ink);line-height:1.45;">'+esc(t.learned)+'</p>':'')+((t.patterns||[]).length?('<ul style="margin:6px 0 0;padding-left:16px;font-size:12px;color:var(--ink);line-height:1.5;">'+t.patterns.map(function(p){return '<li>'+esc(typeof p==='string'?p:(p.to||p.why||JSON.stringify(p)))+'</li>';}).join('')+'</ul>'):'')+'</div>'; } }
    else { if(t.tovStatus==='checking'){ b='<p style="font-size:13px;color:var(--ink-55);">Checking against our ToV…</p>'; } else if(t.tovStatus==='error'){ b='<p style="font-size:13px;color:var(--ink);">'+esc(t.verdict||'Error')+'</p>'; } else { var sc=(t.score!=null)?(' · '+t.score+'/100'):''; b='<p style="font-family:var(--mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-40);margin-bottom:4px;">Verdict'+sc+'</p><p style="font-size:13px;line-height:1.5;color:var(--ink);margin-bottom:8px;">'+esc(t.verdict||'')+'</p>'; (t.suggestions||[]).forEach(function(s,i){ b+='<div style="border-top:1px solid var(--rule);padding:7px 0;">'+(s.from?'<p style="font-size:12px;color:var(--ink-55);text-decoration:line-through;line-height:1.4;">'+esc(s.from)+'</p>':'')+(s.to?'<p style="font-size:13px;color:var(--ink);line-height:1.45;">'+esc(s.to)+'</p>':'')+(s.why?'<p style="font-size:11px;color:var(--ink-40);margin-top:2px;line-height:1.4;">'+esc(s.why)+'</p>':'')+(s.to?'<button data-apply="'+i+'" style="margin-top:5px;background:none;border:1px solid var(--rule-strong);border-radius:5px;padding:3px 9px;font-family:var(--mono);font-size:9px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-55);cursor:pointer;">apply on page</button>':'')+'</div>'; }); } }
    var actions='<div style="display:flex;gap:6px;margin-top:10px;"><button data-send style="flex:2;background:var(--ink);color:var(--paper);border:none;border-radius:6px;padding:7px 0;font-family:var(--mono);font-size:9px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;">&#8594; Send to Claude</button><button data-resolve style="flex:1;background:transparent;color:var(--ink-55);border:1px solid var(--rule-strong);border-radius:6px;padding:7px 0;font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;">Resolve</button></div>';
    if(t.type==='tov'&&t.tovStatus==='checking') actions='';
    if(t.type==='rewrite'&&(t.learnStatus==='learning'||t.learnStatus==='done')) actions='<div style="display:flex;gap:6px;margin-top:10px;"><button data-resolve style="flex:1;background:transparent;color:var(--ink-55);border:1px solid var(--rule-strong);border-radius:6px;padding:7px 0;font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;">Done</button></div>';
    return head+b+actions; }
  function openCard(id){ var t=load().threads[id]; if(!t){closeCard();return;} cardId=id; var el=findEl(t); var rect=el?el.getBoundingClientRect():null; card.innerHTML=cardHtml(t); positionCard(t,rect); card.style.display='block'; wireCard(t,el); }
  function wireCard(t,el){ var x=card.querySelector('[data-x]'); if(x)x.onclick=function(ev){ev.stopPropagation();closeCard();}; card.querySelectorAll('[data-apply]').forEach(function(b){ b.onclick=function(ev){ ev.stopPropagation(); var s=(t.suggestions||[])[Number(b.dataset.apply)]; if(s&&s.to&&el){ el.textContent=s.to; flash(el); } }; }); var sd=card.querySelector('[data-send]'); if(sd)sd.onclick=function(ev){ev.stopPropagation();sendOne(t.id,sd);}; var rs=card.querySelector('[data-resolve]'); if(rs)rs.onclick=function(ev){ev.stopPropagation();resolveOne(t.id);}; }
  function sendOne(id,btn){ var d=load(); var t=d.threads[id]; if(!t)return; var payload={threads:{},source:'${slug}'}; payload.threads[id]=t; fetch(INBOX,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(){ if(t.type==='rewrite'){ startLearn(id); } else { var dd=load(); delete dd.threads[id]; persist(dd); closeCard(); renderMarkers(); } }).catch(function(){ if(btn){ btn.textContent='✗ Server off'; setTimeout(function(){btn.innerHTML='&#8594; Send to Claude';},2000); } }); }
  function startLearn(id){ var d=load(); var t=d.threads[id]; if(!t)return; t.learnStatus='learning'; persist(d); if(cardId===id)openCard(id); fetch(REQ,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'rewrite-learn',text:t.rewritten,original:t.original,rewritten:t.rewritten,selector:t.selector,lang:t.lang,slug:'${slug}'})}).then(function(r){return r.json();}).then(function(j){ var dd=load(); if(dd.threads[id]){ dd.threads[id].reqId=j.id; persist(dd); } pollLearn(id,j.id,0); }).catch(function(){ var dd=load(); if(dd.threads[id]){ dd.threads[id].learnStatus='error'; dd.threads[id].learned='Inbox server offline — start inbox-server.py on :8002.'; persist(dd); if(cardId===id)openCard(id); } }); }
  function pollLearn(id,reqId,n){ if(n>60)return; setTimeout(function(){ fetch(POLL+'?id='+encodeURIComponent(reqId)).then(function(r){return r.json();}).then(function(res){ if(res&&res.pending){ pollLearn(id,reqId,n+1); return; } var d=load(); if(!d.threads[id])return; d.threads[id].learnStatus='done'; d.threads[id].learned=res.verdict||res.learned||''; d.threads[id].patterns=res.patterns||res.suggestions||[]; persist(d); if(cardId===id)openCard(id); }).catch(function(){ pollLearn(id,reqId,n+1); }); }, 2500); }
  function resolveOne(id){ var d=load(); delete d.threads[id]; persist(d); closeCard(); renderMarkers(); }
  function flash(el){ var prev=el.style.outline; el.style.outline='2px solid var(--ink)'; setTimeout(function(){el.style.outline=prev;},700); }

  document.getElementById('em-mode-v').addEventListener('click',function(ev){ ev.stopPropagation(); setMode('visual'); });
  document.getElementById('em-mode-c').addEventListener('click',function(ev){ ev.stopPropagation(); setMode('copy'); });
  document.getElementById('em-mode-r').addEventListener('click',function(ev){ ev.stopPropagation(); setMode('rewrite'); });
  document.getElementById('em-mode-t').addEventListener('click',function(ev){ ev.stopPropagation(); setMode('tov'); });
  document.addEventListener('keydown',function(ev){ if(ev.key!=='Escape')return; if(card.style.display!=='none')closeCard(); else if(dlg.style.display!=='none')closeDlg(); else if(active)deactivate(); });
  /* click on empty area outside the panel collapses an open card (when not actively picking — the picker handles its own outside-click) */
  document.addEventListener('click',function(ev){ if(active)return; if(card.style.display==='none')return; if(ours(ev.target))return; closeCard(); },true);
  var rrf=null; function onResize(){ if(rrf)return; rrf=requestAnimationFrame(function(){ rrf=null; renderMarkers(); }); }
  window.addEventListener('resize',onResize);
  window.addEventListener('scroll',function(){ if(cardId){ var m=markerEls[cardId]; var t=load().threads[cardId]; if(m&&t) positionCard(t,m.getBoundingClientRect()); } },true);
${tweaksBlock}
  renderMarkers();
`;

  // Remap panel-chrome vars to the --emc-* namespace (longest-first so prefixes
  // don't clobber). Tweaks targets (--fs-*/--lh-*/--w-*/--st-*) are set via
  // setProperty (string literals), never as var(), so they're untouched.
  body = body
    .replace(/var\(--paper-soft\)/g, 'var(--emc-paper-soft)')
    .replace(/var\(--rule-strong\)/g, 'var(--emc-rule-strong)')
    .replace(/var\(--ink-40\)/g, 'var(--emc-ink-40)')
    .replace(/var\(--ink-55\)/g, 'var(--emc-ink-55)')
    .replace(/var\(--em-ring\)/g, 'var(--emc-ring)')
    .replace(/var\(--ink\)/g, 'var(--emc-ink)')
    .replace(/var\(--paper\)/g, 'var(--emc-paper)')
    .replace(/var\(--rule\)/g, 'var(--emc-rule)')
    .replace(/var\(--surface\)/g, 'var(--emc-surface)')
    .replace(/var\(--mono\)/g, 'var(--emc-mono)')
    .replace(/var\(--text\)/g, 'var(--emc-text)')
    .replace(/var\(--display\)/g, 'var(--emc-display)');

  return `(function () {\n  ${themeInject}\n${body}\n}());`;
}

/** Full <script>…</script> string — for server route handlers / static HTML injection. */
export function buildScript(cfg: EditModeConfig): string {
  return `<script>\n${buildScriptInner(cfg)}\n</script>`;
}
