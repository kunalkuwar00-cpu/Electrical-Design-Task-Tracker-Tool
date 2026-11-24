/* ===== ADPT v36.2 — multi-user guard (front-end only, no database change) =====
   What this fixes, in plain words (all found by testing the real code with two users):
   1. UNSAVED TYPING IS NEVER WIPED. When another person saved, every screen was redrawn and the boxes were
      refilled from saved data, so anything typed but not yet saved (Project Setup, Project Review ...) vanished.
      Now every box you edit is remembered until you save it; after any background redraw it is put back
      (orange outline = "not saved yet"). A redraw also waits while your cursor is inside a box or a window is open.
   2. NO SAVE IS DROPPED. A save asked for while a refresh was loading used to be skipped silently.
      It now waits for the refresh and is then saved. Duplicate clicks are merged into one save.
   3. YOU SEE THE RESULT. "Saved" appears after Supabase confirms. Failures keep the red "Not saved" bar (37) with Retry.
   4. SAME-FIELD CONFLICTS ARE SHOWN. If two people change the same value, your value is kept, the other person's
      value is NOT lost silently: a notice lists it, with "Use theirs" to take it instead.
   Nothing here changes who may do what: permissions are still decided by Supabase. */
(function(){
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const ready=()=>{ try{ return !!EDPT_CLOUD_READY; }catch(e){ return false; } };
  const loading=()=>{ try{ return !!EDPT_REMOTE_LOADING; }catch(e){ return false; } };
  const version=()=>{ try{ return Number(EDPT_CLOUD_VERSION||0); }catch(e){ return 0; } };
  const E=s=>(typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  let SAVING=0, QUEUED=false, WAITING=false, WAIT_T=null, MANUAL=0, BG=0, TIMER=null, TOLD=false, BUSY=false;

  /* ------------------------------------------------------------------ unsaved input memory */
  const DIRTY=new Map();                       /* field id -> { v: value, c: container id } */
  const skipEl=e=>!e||!e.id||e.type==='file'||e.type==='button'||e.type==='submit'||e.type==='password'||(e.closest&&e.closest('#twLogin,#adptIdle,#adptConf'));
  const boxOf=e=>{ let n=e&&e.parentElement; while(n&&!n.id) n=n.parentElement; return n?n.id:''; };
  function mark(e){
    if(skipEl(e)||!/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) return;
    const v=(e.type==='checkbox'||e.type==='radio')?(e.checked?'1':'0'):e.value;
    DIRTY.set(e.id,{v,c:boxOf(e),k:(e.type==='checkbox'||e.type==='radio')?'c':'v'});
    e.classList.add('adpt-unsaved');
  }
  document.addEventListener('input',ev=>mark(ev.target),true);
  document.addEventListener('change',ev=>mark(ev.target),true);
  function clearDirty(from){                    /* the person saved: forget their boxes in that area (or everything) */
    if(!from||from===document.body){ DIRTY.clear(); }
    else{ const key=boxOf(from);
      for(const [id,o] of [...DIRTY]) if(!key||o.c===key||id===from.id) DIRTY.delete(id); }
    document.querySelectorAll('.adpt-unsaved').forEach(e=>{ if(!DIRTY.has(e.id)) e.classList.remove('adpt-unsaved'); });
  }
  function restoreDirty(){
    let n=0;
    DIRTY.forEach((o,id)=>{ const e=document.getElementById(id); if(!e||skipEl(e)) return;
      if(o.k==='c'){ const want=o.v==='1'; if(e.checked!==want){ e.checked=want; n++; } }
      else if(e.value!==o.v){ e.value=o.v; if(e.value!==o.v&&e.tagName==='SELECT') return; n++; }
      e.classList.add('adpt-unsaved'); });
    return n;
  }
  /* switching page = the person left that form: do not carry their text around */
  ['switchTab','twGo'].forEach(f=>{ const f0=window[f]; if(typeof f0==='function') window[f]=function(){ DIRTY.clear(); return f0.apply(this,arguments); }; });
  /* background redraws (another user saved / my own merged save) must not wipe the boxes */
  ['refreshAll','twRefresh','renderSetup','renderReport','renderHistory'].forEach(f=>{
    const f0=window[f]; if(typeof f0!=='function') return;
    window[f]=function(){ const r=f0.apply(this,arguments); if(BG>0&&DIRTY.size) restoreDirty(); return r; };
  });

  /* ------------------------------------------------------------------ is the person in the middle of something? */
  function editing(){
    if(document.querySelector('.tw-modal')) return true;
    if(document.querySelector('dialog[open]')) return true;
    const a=document.activeElement;
    if(a&&a!==document.body&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)){
      if(a.closest&&a.closest('#twLogin,#adptIdle')) return false;
      if(a.type==='checkbox'||a.type==='radio'||a.type==='button'||a.type==='file') return false;
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------ saving: never dropped, never duplicated */
  const save0=window.save;
  if(typeof save0==='function') window.save=save=function(){
    if(ready()&&loading()){ QUEUED=true; return; }                      /* saved right after the refresh ends */
    try{ const a=document.activeElement; clearDirty(a&&a!==document.body?a:null); }catch(e){}
    if(ready()){
      if(WAITING) return;                                              /* a save is already queued: it will carry this change too */
      WAITING=true; clearTimeout(WAIT_T); WAIT_T=setTimeout(()=>{ WAITING=false; },20000);
    }
    return save0.apply(this,arguments);
  };
  const cs0=window.edptCloudSave;
  if(typeof cs0==='function') window.edptCloudSave=async function(){
    WAITING=false; clearTimeout(WAIT_T);
    for(let i=0;i<75&&loading();i++) await sleep(200);
    SAVING++; BG++;
    try{ const r=await cs0.apply(this,arguments); flashSaved(); return r; }
    finally{ SAVING--; BG--; }
  };
  const ld0=window.edptLoadCloudState;
  if(typeof ld0==='function') window.edptLoadCloudState=async function(){
    BG++;
    try{ const r=await ld0.apply(this,arguments); if(DIRTY.size) restoreDirty(); return r; }
    finally{ BG--; if(QUEUED){ QUEUED=false; setTimeout(()=>{ try{ save(false); }catch(e){ console.warn(e); } },0); } }
  };

  /* ------------------------------------------------------------------ "Saved" confirmation */
  const st=document.createElement('style'); st.textContent=`
    .adpt-unsaved{outline:2px solid #f59e0b!important;outline-offset:1px}
    #adptSaved{position:fixed;left:16px;bottom:16px;z-index:149;padding:8px 14px;border-radius:10px;font-size:13px;background:var(--sb-panel,#fff);color:var(--sb-fg,#18181b);border:1px solid #1f9d61;box-shadow:0 6px 24px rgba(0,0,0,.18);display:none}
    #adptConf{position:fixed;right:16px;bottom:16px;z-index:151;width:min(460px,calc(100vw - 32px));max-height:60vh;overflow:auto;padding:14px 16px;border-radius:12px;font-size:13px;background:var(--sb-panel,#fff);color:var(--sb-fg,#18181b);border:1px solid #f59e0b;box-shadow:0 10px 36px rgba(0,0,0,.28);display:none}
    #adptConf h4{margin:0 0 6px;font-size:14px} #adptConf .ci{padding:8px 0;border-top:1px solid var(--sb-line,#e4e4e7)} #adptConf .ci b{display:block;margin-bottom:2px}
    #adptConf .v{font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-word} #adptConf .acts{margin-top:6px;display:flex;gap:6px} #adptConf button{font-size:12px;padding:3px 10px}`;
  document.head.appendChild(st);
  let savedT=null;
  function flashSaved(){
    try{ const bar=document.getElementById('adptSaveBar'); if(bar&&bar.style.display==='flex'&&bar.classList.contains('err')) return;
      let p=document.getElementById('adptSaved'); if(!p){ p=document.createElement('div'); p.id='adptSaved'; document.body.appendChild(p); }
      p.textContent='✓ Saved to shared workspace'; p.style.display='block'; clearTimeout(savedT); savedT=setTimeout(()=>{ p.style.display='none'; },2200); }catch(e){}
  }

  /* ------------------------------------------------------------------ same-field conflicts */
  let CONF=[];
  const tokId=t=>typeof t==='string'&&t[0]==='#'?t.slice(1):null;
  function walk(path,upto){ let node=db; for(let i=0;i<upto&&node!=null;i++){ const t=path[i], id=tokId(t); node=id!==null?(Array.isArray(node)?node.find(x=>x&&String(x.id)===id):null):node[t]; } return node; }
  function labelOf(path){
    const names=[]; let node=db;
    for(let i=0;i<path.length-1&&node!=null;i++){ const t=path[i], id=tokId(t);
      node=id!==null?(Array.isArray(node)?node.find(x=>x&&String(x.id)===id):null):node[t];
      if(id!==null&&node){ const n=node.name||node.title||node.code||node.week||''; if(n) names.push(String(n)); } }
    const f=path[path.length-1];
    return (names.slice(-2).join(' › ')||'Shared data')+' — '+(tokId(f)!==null?'item':f);
  }
  function setAt(path,val){
    const parent=walk(path,path.length-1); const k=path[path.length-1];
    if(parent&&typeof parent==='object'&&tokId(k)===null){ parent[k]=val; return true; } return false;
  }
  const show=v=>{ const s=v===undefined||v===''?'(empty)':typeof v==='object'?JSON.stringify(v):String(v); return s.length>120?s.slice(0,117)+'…':s; };
  window.edptShowConflicts=function(list){
    try{ (list||[]).forEach(c=>{ if(!CONF.some(x=>JSON.stringify(x.path)===JSON.stringify(c.path)&&JSON.stringify(x.theirs)===JSON.stringify(c.theirs))) CONF.push(c); }); draw(); }catch(e){ console.warn(e); }
  };
  function draw(){
    let p=document.getElementById('adptConf');
    if(!CONF.length){ if(p) p.style.display='none'; return; }
    if(!p){ p=document.createElement('div'); p.id='adptConf'; document.body.appendChild(p); }
    p.innerHTML=`<h4>This record was updated by another user</h4>
      <div class="muted" style="margin-bottom:6px">Your changes have not been lost: your values were saved. The other person changed the same field at the same time — their value is listed below. Review it; use theirs only if it is the right one.</div>
      ${CONF.slice(0,20).map((c,i)=>`<div class="ci"><b>${E(labelOf(c.path))}</b>Yours (saved): <span class="v">${E(show(c.mine))}</span><br>Theirs: <span class="v">${E(show(c.theirs))}</span>
        <div class="acts"><button class="small" onclick="edptConfUse(${i})">Use theirs</button><button class="small" onclick="edptConfKeep(${i})">Keep mine</button></div></div>`).join('')}
      ${CONF.length>20?`<div class="muted">+ ${CONF.length-20} more</div>`:''}
      <div class="acts" style="margin-top:10px"><button class="small" onclick="edptConfClose()">Keep all mine and close</button></div>`;
    p.style.display='block';
  }
  window.edptConfKeep=i=>{ CONF.splice(i,1); draw(); };
  window.edptConfClose=()=>{ CONF=[]; draw(); };
  window.edptConfUse=i=>{
    const c=CONF[i]; if(!c) return;
    if(setAt(c.path,c.theirs)){ CONF.splice(i,1); draw(); try{ if(typeof refreshAll==='function') refreshAll(); if(typeof twRefresh==='function') twRefresh(); }catch(e){} save(false); }
    else { try{ toast('That item no longer exists; nothing changed.'); }catch(e){} CONF.splice(i,1); draw(); }
  };

  /* ------------------------------------------------------------------ refreshes from other people */
  async function refreshNow(){
    await window.edptLoadCloudState();
    if(typeof TW!=='undefined'&&TW.me&&db.users&&db.users[TW.me]){ try{ twRefresh(); toast('Shared tracker refreshed from another user.'); }catch(e){} }
  }
  function later(){ clearTimeout(TIMER); TIMER=setTimeout(()=>{ TIMER=null; onRemote(); },2500); }
  async function onRemote(payload){
    if(!ready()) return;
    if(BUSY) return later();
    const hinted=Number(payload&&payload.new&&payload.new.version||0);
    if(hinted&&hinted<=version()) return;
    if(editing()||SAVING>0||MANUAL>0||loading()){
      if(!TOLD){ TOLD=true; try{ toast('Another user saved. Their changes will appear as soon as you finish typing.'); }catch(e){} }
      return later();
    }
    BUSY=true;
    try{
      if(!hinted){
        const r=await EDPT_SB.from('edpt_state').select('version').eq('id',1).single();
        if(r.error||Number(r.data&&r.data.version||0)<=version()){ TOLD=false; return; }
      }
      TOLD=false;
      await refreshNow();
    }catch(e){ try{ edptCloudError(e,'refresh'); }catch(_){ console.error(e); } }
    finally{ BUSY=false; }
  }
  function resubscribe(){
    try{
      if(!window.EDPT_STATE_CHANNEL) return;
      EDPT_SB.removeChannel(window.EDPT_STATE_CHANNEL);
      window.EDPT_STATE_CHANNEL=EDPT_SB.channel('edpt-shared-state')
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'edpt_state',filter:'id=eq.1'},p=>{ onRemote(p); })
        .subscribe();
    }catch(e){ console.warn('ADPT guard: could not re-subscribe',e); }
  }
  const fin0=window.edptFinishLogin;
  if(typeof fin0==='function') window.edptFinishLogin=async function(){
    const r=await fin0.apply(this,arguments); resubscribe(); return r;
  };
  const man0=window.edptRefreshSharedWorkspace;
  if(typeof man0==='function') window.edptRefreshSharedWorkspace=async function(){
    MANUAL++; try{ return await man0.apply(this,arguments); } finally{ MANUAL--; }
  };
  document.addEventListener('focusout',()=>{ if(TIMER) setTimeout(()=>{ if(!editing()){ clearTimeout(TIMER); TIMER=null; onRemote(); } },400); },true);
  window.edptGuardState=()=>({editing:editing(),saving:SAVING,queued:QUEUED,waiting:WAITING,unsavedFields:[...DIRTY.keys()],conflicts:CONF.length});
})();
