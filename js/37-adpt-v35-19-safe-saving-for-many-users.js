/* ===== ADPT v35.19 — safe saving for many users =====
   1. No lost updates: when another person's save arrives, the data is updated IN PLACE, so a window that is
      already open still edits the live record. When two saves cross, the newer data is fetched and the two
      sets of changes are merged record by record (field level) and saved again — nobody's work is discarded.
   2. Failed saves (internet down, Supabase busy) are retried automatically; a banner shows "Not saved yet",
      and the browser warns before closing / refreshing with unsaved work.
   3. Every saved and loaded version is kept automatically on this computer (last 20 + one per day for 30 days)
      and can be downloaded or restored by the Admin from Backup & Restore. */
(function(){
  'use strict';
  const clone=o=>o===undefined?undefined:JSON.parse(JSON.stringify(o));
  const J=o=>JSON.stringify(o===undefined?null:o);
  const eq=(a,b)=>a===b||J(a)===J(b);
  const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const E=s=>(typeof esc==='function'?esc(s):String(s??''));
  let BASE=null;            /* the server copy the local data was last in step with */

  /* ---------- three-way merge: base (last common copy), mine (local), theirs (server now) ---------- */
  function merge3(b,l,r){
    if(eq(l,b)) return clone(r);
    if(eq(r,b)||eq(l,r)) return clone(l);
    if(isObj(l)&&isObj(r)){
      const bo=isObj(b)?b:{}, out={}, keys=new Set([...Object.keys(r),...Object.keys(l)]);
      keys.forEach(k=>{ const inB=k in bo, inL=k in l, inR=k in r;
        if(!inL){ if(inB&&eq(r[k],bo[k])) return; out[k]=clone(r[k]); return; }          /* I deleted it; keep theirs only if they changed it */
        if(!inR){ if(inB&&eq(l[k],bo[k])) return; out[k]=clone(l[k]); return; }          /* they deleted it; keep mine only if I changed it */
        out[k]=merge3(inB?bo[k]:undefined,l[k],r[k]); });
      return out;
    }
    if(Array.isArray(l)&&Array.isArray(r)){
      const ids=a=>a.every(x=>isObj(x)&&x.id!=null&&x.id!=='');
      if(ids(l)&&ids(r)&&(l.length||r.length)) return byId(Array.isArray(b)?b.filter(isObj):[],l,r);
      if(l.every(isObj)&&r.every(isObj)) return bag(Array.isArray(b)?b:[],l,r);
      return clone(l);                                                                     /* both changed a plain list: mine wins */
    }
    return clone(l);                                                                       /* both changed the same value: mine wins (last save) */
  }
  function byId(b,l,r){
    const B=new Map(b.map(x=>[String(x.id),x])), L=new Map(l.map(x=>[String(x.id),x])), R=new Map(r.map(x=>[String(x.id),x]));
    const out=[];
    r.forEach(x=>{ const id=String(x.id);
      if(L.has(id)) out.push(merge3(B.get(id),L.get(id),x));
      else if(!(B.has(id)&&eq(x,B.get(id)))) out.push(clone(x)); });                      /* deleted by me and unchanged by them → gone */
    const firstBase=l.findIndex(x=>B.has(String(x.id)));
    const front=[], back=[];
    l.forEach((x,i)=>{ const id=String(x.id); if(R.has(id)) return;
      if(B.has(id)){ if(!eq(x,B.get(id))) back.push(clone(x)); return; }                  /* they deleted it, I changed it → keep mine */
      (firstBase>=0&&i<firstBase?front:back).push(clone(x)); });                          /* my new records */
    return [...front,...out,...back];
  }
  function bag(b,l,r){
    const cnt=a=>{ const m=new Map(); a.forEach(x=>{ const k=J(x); m.set(k,(m.get(k)||0)+1); }); return m; };
    const cb=cnt(b), cl=cnt(l);
    const removed=new Map(); cb.forEach((n,k)=>{ const d=n-(cl.get(k)||0); if(d>0) removed.set(k,d); });
    const seenB=new Map(), added=[], firstBase=l.findIndex(x=>cb.has(J(x)));
    l.forEach((x,i)=>{ const k=J(x), used=seenB.get(k)||0; if(used<(cb.get(k)||0)){ seenB.set(k,used+1); return; } added.push({x,front:firstBase>=0&&i<firstBase}); });
    const out=[]; r.forEach(x=>{ const k=J(x), n=removed.get(k)||0; if(n>0){ removed.set(k,n-1); return; } out.push(clone(x)); });
    return [...added.filter(a=>a.front).map(a=>clone(a.x)),...out,...added.filter(a=>!a.front).map(a=>clone(a.x))];
  }
  window.edptMerge3=merge3;

  /* ---------- update the live data in place (open windows keep pointing at real records) ---------- */
  function patchArr(ta,sa){
    if(sa.length&&sa.every(x=>isObj(x)&&x.id!=null)){ const m=new Map(ta.filter(isObj).map(x=>[String(x.id),x]));
      const res=sa.map(x=>{ const o=m.get(String(x.id)); if(o&&o!==x){ patchObj(o,x); return o; } return x; }); ta.length=0; ta.push(...res); return ta; }
    ta.length=0; ta.push(...sa); return ta;
  }
  function patchObj(t,s){
    Object.keys(t).forEach(k=>{ if(!(k in s)) delete t[k]; });
    Object.keys(s).forEach(k=>{ const tv=t[k], sv=s[k];
      if(isObj(tv)&&isObj(sv)) patchObj(tv,sv); else if(Array.isArray(tv)&&Array.isArray(sv)) patchArr(tv,sv); else t[k]=sv; });
  }
  /* top level: everything patched in place, except the people list, which is replaced (it carries the login overlay) */
  function patchTop(t,s,keepUsers){
    Object.keys(t).forEach(k=>{ if(k==='users') return; if(!(k in s)) delete t[k]; });
    Object.keys(s).forEach(k=>{ if(k==='users'){ if(!keepUsers) t.users=s.users; return; } const tv=t[k], sv=s[k];
      if(isObj(tv)&&isObj(sv)) patchObj(tv,sv); else if(Array.isArray(tv)&&Array.isArray(sv)) patchArr(tv,sv); else t[k]=sv; });
  }
  window.edptPatchTop=patchTop;

  /* a refresh from Supabase (login, realtime, Refresh button) keeps the same objects */
  let PREV=null;
  const en0=window.twEnsure;
  if(typeof en0==='function') window.twEnsure=function(){
    try{ if(PREV&&PREV!==db&&isObj(PREV)&&isObj(db)){ const fresh=db, nu=o=>Object.assign({},o,{users:null});
           /* keep this browser's not-yet-saved changes: merge them onto the fresh copy */
           const local=BASE&&!eq(nu(PREV),nu(BASE))?merge3(nu(BASE),nu(PREV),nu(fresh)):null;
           BASE=clone(fresh);
           if(local){ local.users=fresh.users; patchTop(PREV,local,false); } else patchTop(PREV,fresh,false);
           db=PREV; } }catch(e){ console.warn('ADPT in-place refresh',e); }
    finally{ PREV=null; }
    return en0.apply(this,arguments);
  };
  const ld0=window.edptLoadCloudState;
  if(typeof ld0==='function') window.edptLoadCloudState=async function(){
    PREV=db; try{ const r=await ld0.apply(this,arguments); if(!BASE) BASE=clone(db); remember('loaded'); return r; } finally{ PREV=null; } };

  /* ---------- save: version-checked, merged on conflict, retried on network errors ---------- */
  const rerender=()=>{ ['refreshAll','twRefresh','renderReport','renderProjectList','renderWorkloadPlanner'].forEach(f=>{ try{ if(typeof window[f]==='function') window[f](); }catch(e){} }); };
  const isNet=e=>{ const m=String(e&&e.message||e||''); return !navigator.onLine||/fetch|network|timeout|timed out|load failed|offline|ECONN|503|502|504|Gateway|Service Unavailable/i.test(m); };
  let INFLIGHT=0, FAILED=null, RETRY_T=null, TRIES=0, SAVED_AT=0;
  /* Team & Access permissions and the common-login setting are Admin-only on the server (step 4):
     a non-admin save always sends the server's copy of them, so local defaults never block a save */
  const ADMIN_ONLY=['accessControl','teamSettings'];
  function adminOnly(target,server){ if(!server) return; ADMIN_ONLY.forEach(k=>{ if(k in server) target[k]=clone(server[k]); else delete target[k]; }); }
  window.edptCloudSave=async function(){
    if(!EDPT_CLOUD_READY||EDPT_REMOTE_LOADING) return;
    INFLIGHT++; banner();
    try{
      const admin=typeof twAdmin==='function'&&twAdmin(); let merged=false, usersMoved=false;
      for(let attempt=0;attempt<4;attempt++){
        const snapshot=clone(db); if(!admin){ snapshot.users=clone(EDPT_CLOUD_USERS||{}); adminOnly(snapshot,BASE); }
        const {data,error}=await EDPT_SB.rpc('edpt_save_tracker',{p_data:snapshot,p_expected_version:EDPT_CLOUD_VERSION});
        if(!error&&data!=null){
          EDPT_CLOUD_VERSION=Number(data); BASE=snapshot; if(admin) EDPT_CLOUD_USERS=clone(snapshot.users||{});
          FAILED=null; TRIES=0; SAVED_AT=Date.now(); remember('saved');
          if(merged){ rerender(); if(usersMoved&&typeof window.edptLoadCloudState==='function') setTimeout(()=>window.edptLoadCloudState().catch(()=>{}),50); }
          return;
        }
        if(!error) throw new Error('Cloud save did not return a new version.');
        if(!(typeof edptIsVersionConflict==='function'&&edptIsVersionConflict(error))) throw error;
        /* someone saved in between: fetch theirs, merge mine on top, try again */
        const r=await EDPT_SB.from('edpt_state').select('id,version,data').eq('id',1).single();
        if(r.error) throw r.error;
        const theirs=r.data&&r.data.data; if(!theirs||!Array.isArray(theirs.projects)) throw new Error('Shared tracker data is missing or invalid.');
        const base=BASE||theirs, m=merge3(base,snapshot,theirs);
        usersMoved=usersMoved||!eq(base.users,theirs.users);
        if(!admin){ m.users=theirs.users; adminOnly(m,theirs); }
        patchTop(db,m,!admin);
        if(!admin) EDPT_CLOUD_USERS=clone(theirs.users||{});
        EDPT_CLOUD_VERSION=Number(r.data.version||0); BASE=clone(theirs); merged=true;
        try{ if(typeof twEnsure==='function'){ const p=PREV; PREV=null; en0.call(window); PREV=p; } }catch(e){}
      }
      throw new Error('Tracker version conflict. Refresh before saving.');
    }catch(e){
      FAILED={e,at:Date.now(),net:isNet(e)};
      if(FAILED.net) scheduleRetry();
      throw e;
    }finally{ INFLIGHT--; banner(); }
  };
  function scheduleRetry(){
    clearTimeout(RETRY_T); const wait=[5,15,30,60,120][Math.min(TRIES,4)]*1000; TRIES++;
    FAILED.next=Date.now()+wait; RETRY_T=setTimeout(()=>{ if(FAILED&&navigator.onLine!==false) save(false); else if(FAILED) scheduleRetry(); },wait); banner();
  }
  window.edptRetrySave=()=>{ clearTimeout(RETRY_T); TRIES=0; save(false); };
  window.addEventListener('online',()=>{ if(FAILED) window.edptRetrySave(); });
  /* the shared save prints "version conflict" errors only when merging failed 4 times */
  window.addEventListener('beforeunload',e=>{ if(INFLIGHT>0||FAILED){ e.preventDefault(); e.returnValue='Your last change is not saved yet.'; return e.returnValue; } });

  /* status banner */
  const st=document.createElement('style'); st.textContent=`
    #adptSaveBar{position:fixed;left:16px;bottom:16px;z-index:150;display:none;align-items:center;gap:10px;padding:9px 14px;border-radius:10px;font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.18);border:1px solid var(--sb-line,#e4e4e7);background:var(--sb-panel,#fff);color:var(--sb-fg,#18181b)}
    #adptSaveBar.err{border-color:#e5484d;background:color-mix(in srgb,#e5484d 10%,var(--sb-panel,#fff))}
    #adptSaveBar button{font-size:12px;padding:3px 10px}
    #adptSaveBar i{width:9px;height:9px;border-radius:50%;background:#f59e0b;display:inline-block}
    #adptSaveBar.err i{background:#e5484d}
    .vh-t td,.vh-t th{padding:6px 8px;border-bottom:1px solid var(--sb-line,#e4e4e7);font-size:13px;text-align:left} .vh-t td.n{text-align:right}`;
  document.head.appendChild(st);
  let slowT=null;
  function banner(){
    let b=document.getElementById('adptSaveBar'); if(!b){ b=document.createElement('div'); b.id='adptSaveBar'; document.body.appendChild(b); }
    if(FAILED){ const s=FAILED.next?Math.max(0,Math.round((FAILED.next-Date.now())/1000)):0;
      b.className='err'; b.style.display='flex';
      b.innerHTML=FAILED.net?`<i></i><span><b>Not saved yet</b> — no connection to Supabase. ${s?`Retrying in ${s} s.`:'Retrying…'} Keep this page open.</span><button onclick="edptRetrySave()">Retry now</button>`
        :`<i></i><span><b>Not saved</b> — ${E(typeof edptCloudMessage==='function'?edptCloudMessage(FAILED.e):String(FAILED.e&&FAILED.e.message||FAILED.e))}</span><button onclick="edptRetrySave()">Try again</button>`;
      return; }
    if(INFLIGHT>0){ clearTimeout(slowT); slowT=setTimeout(()=>{ if(INFLIGHT>0&&!FAILED){ b.className=''; b.style.display='flex'; b.innerHTML='<i></i><span>Saving…</span>'; } },1500); return; }
    clearTimeout(slowT); b.style.display='none';
  }
  setInterval(()=>{ if(FAILED&&FAILED.net) banner(); },1000);

  /* ---------- automatic version history on this computer (IndexedDB) ---------- */
  const IDB='adpt-history', ST='versions';
  const open=()=>new Promise((res,rej)=>{ if(!window.indexedDB) return rej(new Error('no indexedDB')); const q=indexedDB.open(IDB,1);
    q.onupgradeneeded=()=>{ const d=q.result; if(!d.objectStoreNames.contains(ST)) d.createObjectStore(ST,{keyPath:'k',autoIncrement:true}); };
    q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); });
  const tx=async(mode,fn)=>{ const d=await open(); return new Promise((res,rej)=>{ const t=d.transaction(ST,mode), s=t.objectStore(ST); let out; Promise.resolve(fn(s)).then(v=>out=v); t.oncomplete=()=>{ d.close(); res(out); }; t.onerror=()=>{ d.close(); rej(t.error); }; }); };
  const all=()=>tx('readonly',s=>new Promise(res=>{ const q=s.getAll(); q.onsuccess=()=>res(q.result||[]); }));
  let LAST_V=null, BUSY=false;
  async function remember(kind){
    try{ if(!TW.me||!EDPT_CLOUD_READY) return; const v=Number(EDPT_CLOUD_VERSION||0); if(!v||v===LAST_V) return; LAST_V=v;
      const data=JSON.stringify(db); if(data.length>40*1024*1024) return;
      const by=kind==='saved'?((window.edptActorName&&edptActorName())||twName(TW.me)):'';
      await tx('readwrite',s=>{ s.add({version:v,at:Date.now(),kind,by,size:data.length,data}); });
      if(!BUSY){ BUSY=true; setTimeout(()=>{ prune().finally(()=>{ BUSY=false; }); },2000); }
      if(TW.tab==='backup') drawHist();
    }catch(e){ console.warn('ADPT version history',e); }
  }
  async function prune(){
    const L=(await all()).sort((a,b)=>b.at-a.at), keep=new Set(), days=new Set();
    L.slice(0,20).forEach(x=>keep.add(x.k));
    L.forEach(x=>{ const d=new Date(x.at).toISOString().slice(0,10); if(Date.now()-x.at<30*864e5&&!days.has(d)){ days.add(d); keep.add(x.k); } });
    const del=L.filter(x=>!keep.has(x.k)); if(del.length) await tx('readwrite',s=>{ del.forEach(x=>s.delete(x.k)); });
  }
  window.edptVersionHistory=all;
  const fmt=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
  async function drawHist(){
    const sec=document.getElementById('backup'); if(!sec) return;
    let p=document.getElementById('vhPanel'); if(!p){ p=document.createElement('div'); p.className='panel'; p.id='vhPanel'; sec.appendChild(p); }
    let L=[]; try{ L=(await all()).sort((a,b)=>b.at-a.at); }catch(e){ p.innerHTML='<h3>Automatic version history</h3><p class="muted">This browser does not allow local storage of versions.</p>'; return; }
    const adm=typeof twAdmin==='function'&&twAdmin();
    p.innerHTML=`<h3>Automatic version history (this computer)</h3>
      <p class="muted" style="margin-top:0">Every version this browser saved or loaded is kept here automatically: the last 20, plus one per day for 30 days. Your Supabase plan has no database backups, so also use <b>Export backup</b> every week and keep the file safe.</p>
      ${L.length?`<div class="tablewrap"><table class="vh-t"><thead><tr><th>Version</th><th>Time</th><th>How</th><th class="n">Size</th><th></th></tr></thead><tbody>
      ${L.map(x=>`<tr><td><b>${x.version}</b></td><td>${E(new Date(x.at).toLocaleString())}</td><td>${x.kind==='saved'?'Saved'+(x.by?' by '+E(x.by):''):x.kind==='before-restore'?'Kept before a restore':'Loaded from Supabase'}</td><td class="n">${fmt(x.size)}</td>
        <td><div class="actions" style="flex-wrap:nowrap"><button class="small" onclick="edptVHDownload(${x.k})">Download</button>${adm?`<button class="small danger" onclick="edptVHRestore(${x.k})">Restore</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No versions kept yet on this computer.</p>'}`;
  }
  const get=k=>tx('readonly',s=>new Promise(res=>{ const q=s.get(k); q.onsuccess=()=>res(q.result); }));
  window.edptVHDownload=async k=>{ const x=await get(k); if(!x) return; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([x.data],{type:'application/json'}));
    a.download=`ADPT_version_${x.version}_${new Date(x.at).toISOString().slice(0,16).replace(/[:T]/g,'-')}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); };
  window.edptVHRestore=async k=>{
    if(!(typeof twAdmin==='function'&&twAdmin())) return alert('Only the Admin can restore a version.');
    const x=await get(k); if(!x) return;
    if(!confirm(`Restore version ${x.version} from ${new Date(x.at).toLocaleString()} for EVERYONE?\n\nAll changes made after it will be replaced. The current data is kept in this history first, so this can be undone.`)) return;
    let d; try{ d=JSON.parse(x.data); }catch(e){ return alert('This version could not be read.'); }
    if(!d||!Array.isArray(d.projects)) return alert('This version is not valid tracker data.');
    try{ const cur=JSON.stringify(db); await tx('readwrite',s=>{ s.add({version:Number(EDPT_CLOUD_VERSION||0),at:Date.now(),kind:'before-restore',by:twName(TW.me),size:cur.length,data:cur}); }); }catch(e){}
    const users=db.users; patchTop(db,d,false); if(!d.users) db.users=users;
    rerender(); save(false);
  };
  /* server history (after step 4 SQL): edpt_state_history, Admin only */
  async function drawServer(){
    const sec=document.getElementById('backup'); if(!sec||!(typeof twAdmin==='function'&&twAdmin())||!EDPT_CLOUD_READY) return;
    let p=document.getElementById('vhServer'); if(!p){ p=document.createElement('div'); p.className='panel'; p.id='vhServer'; const a=document.getElementById('vhPanel'); a?a.before(p):sec.appendChild(p); }
    let res; try{ res=await EDPT_SB.from('edpt_state_history').select('id,version,saved_at,note').order('id',{ascending:false}).limit(60); }catch(e){ res={error:e}; }
    if(res.error){ p.innerHTML=`<h3>Server version history (Supabase)</h3><p class="muted" style="margin-top:0">Not set up yet. It starts after the step 4 SQL is run in Supabase; then the last 60 versions are kept on the server automatically.</p>`; return; }
    const L=res.data||[];
    p.innerHTML=`<h3>Server version history (Supabase)</h3><p class="muted" style="margin-top:0">A copy of the tracker is kept on the server before every save (last 60). Restore brings one back for everyone; the current version is kept first.</p>
      ${L.length?`<div class="tablewrap"><table class="vh-t"><thead><tr><th>Version</th><th>Replaced at</th><th>Note</th><th></th></tr></thead><tbody>${L.map(x=>`<tr><td><b>${x.version}</b></td><td>${E(new Date(x.saved_at).toLocaleString())}</td><td>${E(x.note||'')}</td><td><button class="small danger" onclick="edptServerRestore(${Number(x.id)},${Number(x.version)})">Restore</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No versions yet — one is added with the next save.</p>'}`;
  }
  window.edptServerRestore=async(id,ver)=>{
    if(!(typeof twAdmin==='function'&&twAdmin())) return alert('Only the Admin can restore a version.');
    if(!confirm(`Restore server version ${ver} for EVERYONE?\n\nAll changes made after it will be replaced. The current version is kept in the server history first, so this can be undone.`)) return;
    try{ if(window.EDPT_SAVE_CHAIN) await window.EDPT_SAVE_CHAIN; const {error}=await EDPT_SB.rpc('edpt_restore_version',{p_history_id:id}); if(error) throw error;
      await window.edptLoadCloudState(); drawServer(); drawHist(); }
    catch(e){ alert('Restore failed: '+(e&&e.message||e)); }
  };
  const sw0=window.switchTab;
  window.switchTab=function(name){ const r=sw0.apply(this,arguments); if(name==='backup') setTimeout(()=>{ drawHist(); drawServer(); },0); return r; };
})();
