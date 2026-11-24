/* ===== ADPT v35.21 — test environment, faster Daily Tasks, idle sign-out, old-code clean-up ===== */
(function(){
  'use strict';
  const E=s=>(typeof esc==='function'?esc(s):String(s??''));
  const TEST=typeof EDPT_TEST!=='undefined'&&EDPT_TEST;

  /* ---------- 1. Test environment (index.html?env=test) ---------- */
  const st=document.createElement('style'); st.textContent=`
    #adptTestBar{position:fixed;top:0;left:0;right:0;z-index:300;background:#d97706;color:#fff;font:600 12.5px/1.2 inherit;text-align:center;padding:5px 10px;letter-spacing:.02em}
    #adptTestBar a{color:#fff;text-decoration:underline;margin-left:10px}
    body.adpt-test{padding-top:24px}
    #adptTestCfg{position:fixed;inset:0;z-index:320;display:grid;place-items:center;background:rgba(0,0,0,.45)}
    #adptTestCfg .box{background:var(--tw-bg,#fff);color:var(--tw-fg,#18181b);border-radius:12px;padding:20px 22px;width:min(520px,92vw);box-shadow:0 12px 40px rgba(0,0,0,.3)}
    #adptTestCfg label{display:block;font-size:12px;font-weight:600;margin:10px 0 4px} #adptTestCfg input{width:100%}
    .dt-oldnote{margin:8px 0;font-size:12.5px;color:var(--tw-muted,#71717a)} .dt-oldnote button{margin-left:8px}
    #adptIdle{position:fixed;inset:0;z-index:310;display:grid;place-items:center;background:rgba(0,0,0,.4)}
    #adptIdle .box{background:var(--tw-bg,#fff);color:var(--tw-fg,#18181b);border-radius:12px;padding:20px 22px;width:min(420px,90vw);text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3)}`;
  document.head.appendChild(st);
  function testBar(){
    if(!TEST||document.getElementById('adptTestBar')) return;
    const b=document.createElement('div'); b.id='adptTestBar';
    let host=''; try{ host=new URL(EDPT_SUPABASE_URL).host.split('.')[0]; }catch(e){}
    b.innerHTML=`TEST ENVIRONMENT${host?' ('+E(host)+')':''} — changes here do not affect the live tracker <a href="?env=live">Switch to live</a> <a href="#" onclick="edptTestSetup();return false">Test settings</a>`;
    document.body.appendChild(b); document.body.classList.add('adpt-test');
    try{ document.title='[TEST] '+document.title.replace(/^\[TEST\] /,''); }catch(e){}
  }
  window.edptTestSetup=function(){
    const cfg=(()=>{ try{ return JSON.parse(localStorage.getItem('adptTestSupabase')||'null')||{}; }catch(e){ return {}; } })();
    const d=document.createElement('div'); d.id='adptTestCfg';
    d.innerHTML=`<div class="box"><h3 style="margin:0 0 4px">Test environment settings</h3>
      <p class="muted" style="margin:0;font-size:13px">Enter the <b>test</b> Supabase project (Project Settings → API). These are saved only in this browser. Never enter the live project here.</p>
      <label>Project URL</label><input id="atUrl" placeholder="https://xxxx.supabase.co" value="${E(cfg.url||'')}">
      <label>Publishable (anon) key</label><input id="atKey" placeholder="sb_publishable_…" value="${E(cfg.key||'')}">
      <p id="atErr" style="color:#c0262d;font-size:12.5px;min-height:16px;margin:8px 0 0"></p>
      <div class="actions" style="justify-content:flex-end;margin-top:6px"><a class="small" href="?env=live" style="margin-right:auto">Back to live</a><button class="small" id="atCancel">Cancel</button><button class="primary small" id="atSave">Save and reload</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector('#atCancel').onclick=()=>d.remove();
    d.querySelector('#atSave').onclick=()=>{ const url=d.querySelector('#atUrl').value.trim().replace(/\/+$/,''), key=d.querySelector('#atKey').value.trim(), er=d.querySelector('#atErr');
      if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return er.textContent='Enter the project URL, e.g. https://abcd1234.supabase.co';
      if(typeof EDPT_LIVE_URL!=='undefined'&&url.toLowerCase()===String(EDPT_LIVE_URL).toLowerCase()) return er.textContent='This is the LIVE project. Use a separate test project.';
      if(key.length<20) return er.textContent='Enter the publishable (anon) key of the test project.';
      try{ localStorage.setItem('adptTestSupabase',JSON.stringify({url,key})); }catch(e){}
      location.href=location.pathname+'?env=test'; };
  };
  if(TEST){ document.addEventListener('DOMContentLoaded',()=>{ testBar(); if(typeof EDPT_TEST_CFG==='undefined'||!EDPT_TEST_CFG) setTimeout(window.edptTestSetup,300); }); try{ if(document.body) testBar(); }catch(e){} }
  /* in the test environment the Admin may load a live backup file into the test database */
  const ib0=window.importBackup;
  window.importBackup=function(e){
    if(!TEST) return typeof ib0==='function'?ib0.apply(this,arguments):undefined;
    const f=e&&e.target&&e.target.files&&e.target.files[0]; if(!f) return;
    if(!(typeof twAdmin==='function'&&twAdmin())){ e.target.value=''; return alert('Only the Admin can import a backup.'); }
    const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result); if(!d||!Array.isArray(d.projects)) throw new Error('not a tracker backup');
        if(!confirm(`Load this backup (${d.projects.length} projects) into the TEST database?\n\nThe live tracker is not touched.`)) return;
        const users=db.users; window.edptPatchTop?edptPatchTop(db,d,false):Object.assign(db,d); if(!d.users) db.users=users;
        try{ twEnsure(); }catch(_){} save(false); ['refreshAll','twRefresh'].forEach(k=>{ try{ window[k]&&window[k](); }catch(_){} });
        }catch(x){ alert('This file is not a valid ADPT backup.'); } finally{ e.target.value=''; } };
    r.readAsText(f);
  };

  /* ---------- 2. Faster Daily Tasks: closed tasks older than 90 days are not drawn (until asked) ---------- */
  const DAYS=90, MAXP=40; let SHOW_OLD=false, FILTERING=false, HIDDEN=0;
  window.edptDailyShowOld=v=>{ SHOW_OLD=!!v; try{ twDailyRender(); }catch(e){} };
  const closedAt=t=>{ const c=t.closedAt||t.closedOn||t.finishedAt||t.finished||((t.status==='Closed')?t.date:''); if(!c) return 0; const n=typeof c==='number'?c:Date.parse(String(c).length===10?c+'T12:00:00':c); return isNaN(n)?0:n; };
  const dr0=window.twDailyRender;
  if(typeof dr0==='function') window.twDailyRender=function(){
    const all=Array.isArray(db.daily)?db.daily:null, month=(document.getElementById('dtMonth')||{}).value, q=(document.getElementById('twDq')||{}).value;
    if(!all||SHOW_OLD||month||q){ HIDDEN=0; const r=dr0.apply(this,arguments); note(); return r; }
    /* open tasks always shown; closed tasks: the last 90 days, at most 40 per person (newest first) */
    const cut=Date.now()-DAYS*864e5, per=new Map(), drop=new Set();
    all.filter(t=>t&&t.status==='Closed').sort((a,b)=>closedAt(b)-closedAt(a)).forEach(t=>{ const c=closedAt(t); if(c&&c<cut){ drop.add(t); return; } const k=t.assigneeId||''; const n=(per.get(k)||0)+1; per.set(k,n); if(n>MAXP) drop.add(t); });
    const keep=drop.size?all.filter(t=>!drop.has(t)):all;
    HIDDEN=all.length-keep.length;
    if(!HIDDEN){ const r=dr0.apply(this,arguments); note(); return r; }
    FILTERING=true; db.daily=keep;
    try{ return dr0.apply(this,arguments); } finally{ db.daily=all; FILTERING=false; note(); }
  };
  function note(){
    try{ const box=document.getElementById('twDailyList'); if(!box) return; box.querySelector('.dt-oldnote')?.remove();
      if(!HIDDEN&&!SHOW_OLD) return; const n=document.createElement('div'); n.className='dt-oldnote';
      n.innerHTML=SHOW_OLD?`Showing all closed tasks.<button class="small" onclick="edptDailyShowOld(false)">Show only recent closed tasks</button>`
        :`${HIDDEN} older closed task${HIDDEN===1?'':'s'} ${HIDDEN===1?'is':'are'} not shown, to keep this page fast (closed more than ${DAYS} days ago, or beyond the latest ${MAXP} per person). They stay in the Activity Log and in searches.<button class="small" onclick="edptDailyShowOld(true)">Show them</button>`;
      box.prepend(n); }catch(e){}
  }
  /* never save while the Daily view is drawing from the shortened list */
  const sv0=window.save;
  window.save=save=function(){ if(FILTERING){ const a=arguments; setTimeout(()=>window.save.apply(window,a),0); return; } return sv0.apply(this,arguments); };

  /* ---------- 3. Idle sign-out (shared PCs): 2 hours without any activity ---------- */
  const IDLE_MS=2*60*60*1000, WARN_MS=60*1000; let last=Date.now(), warned=false;
  ['mousemove','mousedown','keydown','touchstart','wheel','scroll'].forEach(ev=>window.addEventListener(ev,()=>{ last=Date.now(); if(warned) closeWarn(); },{passive:true,capture:true}));
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); });
  function closeWarn(){ warned=false; document.getElementById('adptIdle')?.remove(); }
  async function signOutNow(){ closeWarn(); try{ if(window.EDPT_SAVE_CHAIN) await Promise.race([window.EDPT_SAVE_CHAIN,new Promise(r=>setTimeout(r,8000))]); }catch(e){}
    try{ await twLogout(); }catch(e){ location.reload(); }
    setTimeout(()=>{ const er=document.getElementById('twLerr'); if(er) er.textContent='You were signed out after 2 hours without activity.'; },300); }
  function check(){
    try{ if(!TW.me) return; const idle=Date.now()-last;
      if(idle>=IDLE_MS) return signOutNow();
      if(idle>=IDLE_MS-WARN_MS&&!warned){ warned=true; const d=document.createElement('div'); d.id='adptIdle';
        d.innerHTML=`<div class="box"><h3 style="margin:0 0 6px">Still there?</h3><p class="muted" style="margin:0 0 14px">You will be signed out in 1 minute because there has been no activity for 2 hours.</p><div class="actions" style="justify-content:center"><button class="small" onclick="this.closest('#adptIdle').remove()">Sign out now</button><button class="primary small" id="aiStay">Stay signed in</button></div></div>`;
        document.body.appendChild(d); d.querySelector('#aiStay').onclick=()=>{ last=Date.now(); closeWarn(); }; d.querySelector('button.small:not(.primary)').onclick=signOutNow; }
    }catch(e){}
  }
  setInterval(check,15000);

  /* ---------- 4. Old code clean-up ---------- */
  /* passwords are handled only by Supabase: the old local "Reset Password" is switched off */
  window.twResetPw=function(){ alert('Passwords are managed in Supabase.\n\nSupabase → Authentication → Users → choose the person → “Send password recovery” (or set a new password there).'); };
  const tr0=window.twTeamRender;
  if(typeof tr0==='function') window.twTeamRender=function(){ const r=tr0.apply(this,arguments);
    try{ document.querySelectorAll('#team button').forEach(b=>{ if(/^Reset Password$/i.test(b.textContent.trim())) b.remove(); }); }catch(e){} return r; };
  /* old starting-password text in dialogs */
  try{ const pw=typeof TW_PW!=='undefined'?TW_PW:''; if(pw) new MutationObserver(ms=>{ ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType!==1||!n.querySelectorAll) return;
      n.querySelectorAll('p,span,div').forEach(el=>{ if(el.children.length<=2&&el.textContent.includes(pw)&&/sign in first|password/i.test(el.textContent)){ el.textContent='Create their login in Supabase (Authentication → Add user) and link it in edpt_profiles; they choose their password from the Supabase invite.'; } }); })); }).observe(document.body,{childList:true,subtree:true}); }catch(e){}
  /* the Admin's next save removes the unused local password fields from the shared data */
  const cs0=window.edptCloudSave;
  if(typeof cs0==='function') window.edptCloudSave=async function(){
    try{ if(typeof twAdmin==='function'&&twAdmin()&&db&&db.users) Object.keys(db.users).forEach(k=>{ const u=db.users[k]; if(u&&typeof u==='object'){ if('pw' in u) delete u.pw; if('mustChange' in u) delete u.mustChange; } }); }catch(e){}
    return cs0.apply(this,arguments);
  };
  /* the old offline copy kept in this browser is not used with Supabase: remove it after sign-in */
  const en0=window.twEnter;
  if(typeof en0==='function') window.twEnter=function(){ const r=en0.apply(this,arguments); try{ if(typeof EDPT_CLOUD_READY!=='undefined'&&EDPT_CLOUD_READY) localStorage.removeItem('electricalDesignTrackerCompleteV1'); }catch(e){} return r; };
})();

/* ===== ADPT v35.22 — theme (White / Black) for everyone; other Settings follow Team & Access → Settings ===== */
(function(){
  'use strict';
  const can=()=>{ try{ const u=twU(); if(!u) return true; if(u.admin) return true; return typeof window.edptCan==='function'&&!!window.edptCan('Settings','View'); }catch(e){ return false; } };
  const store=()=>{ try{ localStorage.setItem('edptSettings',JSON.stringify(WS)); }catch(e){} };
  window.wsSet=function(k,v){
    if(TW.me&&k!=='theme'&&!can()){ try{ toast(twNoPerm); }catch(e){} return; }
    if(k==='limit') v=8;   /* v35.23: standard 8 h per day, not changeable */
    WS[k]=(k==='weekends')?!!v:v; if(k==='limit') WS.limit=Math.max(1,Math.min(24,Number(v)||8));
    store(); wsApply();
    if(k==='range'){ try{ document.getElementById('wlRange').value=v; WX.off=0; wxRangeChanged(); }catch(e){} }
    try{ renderWorkloadPlanner(); }catch(e){}
    if(k==='theme'&&TW.me){ try{ twTopRender(); }catch(e){} }
  };
  /* the old Workload "Daily limit" is fixed at the 8 h standard */
  try{ if(typeof WS==='object'&&WS&&Number(WS.limit)!==8){ WS.limit=8; store(); } }catch(e){}
  const hideLimit=()=>{ const el=document.getElementById('ws-limit'); if(el){ el.value=8; el.disabled=true; const f=el.closest('.field'); if(f&&!f.querySelector('.std8')){ f.insertAdjacentHTML('beforeend','<div class="muted std8" style="font-size:11.5px">Standard 8 h per day (fixed)</div>'); } } };
  document.addEventListener('DOMContentLoaded',hideLimit); setTimeout(hideLimit,500);
  const wr0=window.wsRender; if(typeof wr0==='function') window.wsRender=function(){ const r=wr0.apply(this,arguments); hideLimit(); return r; };
  window.wsReset=function(){
    if(TW.me&&!can()){ try{ toast(twNoPerm); }catch(e){} return; }
    if(!confirm('Reset all settings to the defaults?')) return;
    WS=Object.assign({},WSD); store(); wsApply();
    try{ wsRender(); document.getElementById('wlRange').value=WS.range; renderWorkloadPlanner(); }catch(e){}
  };
})();

/* ===== ADPT v35.29 — pop-up messages: errors and warnings only (no "saved", "updated", "assigned" …) ===== */
(function(){
  'use strict';
  const t0=window.toast; if(typeof t0!=='function') return;
  const PROBLEM=/fail|error|cannot|can't|could not|unable|not allowed|no permission|permission|denied|invalid|conflict|required|missing|not found|not saved|not connected|offline|⚠|warning|must |only |choose |select |enter |pick |already|no open|nothing to|not possible|blocked|on leave|holiday|exceed|too many|limit|over 8|clash|refused|expired|sign in again/i;
  window.toast=function(s){ const m=String(s??'').trim(); if(!m||!PROBLEM.test(m)) return; return t0.apply(this,arguments); };
})();

/* ===== ADPT v35.31 — Project Schedule: milestone buttons (links, edit, delete, add sub milestone) always visible ===== */
(function(){
  const st=document.createElement('style'); st.textContent=`
    .tm-grid{grid-template-columns:44px minmax(190px,1fr) 118px 118px 96px 96px 50px 58px 70px 96px 148px;gap:8px}
    .tm-row>.tm-acts,.tm-head>span:last-child{position:sticky;right:0;z-index:2;background:var(--wl-surface,var(--sb-panel,#fff));padding-left:6px;box-shadow:-8px 0 8px -8px rgba(0,0,0,.25)}
    .tm-head>span:last-child{text-align:right;padding-right:6px}
    .tm-task{overflow:clip}`;
  document.head.appendChild(st);
})();
