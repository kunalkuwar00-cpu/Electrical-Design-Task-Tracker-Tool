/* ===== ADPT v35.5 — Supabase connection status fixes (front-end only, no database changes) =====
   1. The footer "Local version … Not connected to a shared company database" was static HTML left from the
      original offline version. It never checked the connection. It now shows the real connection state.
   2. EDPT_CLOUD_READY / EDPT_SAVE_CHAIN / EDPT_CLOUD_VERSION are `let` variables, so window.EDPT_CLOUD_READY was
      always undefined. The Refresh button therefore said "Not connected to the shared workspace" even when
      connected. They are now readable on window (read-only mirrors of the real values).
   3. Backup & Restore text described localStorage. Import Backup while connected only replaced this browser's copy
      and the next save would then have pushed that old backup over the live shared data. It is now blocked while
      connected, to protect live Supabase data. Export Backup still works (it exports the live shared data). */
(function(){
  'use strict';
  const def=(name,get)=>{ try{ Object.defineProperty(window,name,{get,configurable:true}); }catch(e){ console.warn('ADPT: could not expose',name,e); } };
  def('EDPT_CLOUD_READY',()=>{ try{ return EDPT_CLOUD_READY; }catch(e){ return false; } });
  def('EDPT_SAVE_CHAIN',()=>{ try{ return EDPT_SAVE_CHAIN; }catch(e){ return undefined; } });
  def('EDPT_CLOUD_VERSION',()=>{ try{ return EDPT_CLOUD_VERSION; }catch(e){ return 0; } });

  const ready=()=>{ try{ return !!EDPT_CLOUD_READY; }catch(e){ return false; } };
  const host=()=>{ try{ return new URL(EDPT_SUPABASE_URL).host; }catch(e){ return 'Supabase'; } };
  function status(){
    const f=document.querySelector('.footer'); if(!f) return;
    const me=(()=>{ try{ return TW.me?(typeof twName==='function'?twName(TW.me):TW.me):''; }catch(e){ return ''; } })();
    const err=window.EDPT_LAST_CLOUD_SAVE_ERROR;
    if(ready()){
      f.innerHTML=`<span style="color:#1f9d61">●</span> Connected to the shared ADPT database (Supabase · ${host()})${me?' · signed in as '+(typeof esc==='function'?esc(me):me):''} · data version ${window.EDPT_CLOUD_VERSION||0}${err?' · <b style="color:#e5484d">last save failed — see the error message and refresh</b>':''}. Export a backup regularly from Backup &amp; Restore.`;
      f.title='All projects, tasks, people and settings are read from and saved to Supabase table edpt_state through edpt_save_tracker.';
    } else {
      f.innerHTML=`<span style="color:#b45309">●</span> Not connected yet — sign in to load the shared ADPT database (Supabase).`;
      f.title='';
    }
  }
  window.edptConnStatus=status;
  const l0=window.edptLoadCloudState;
  if(typeof l0==='function') window.edptLoadCloudState=async function(){ try{ return await l0.apply(this,arguments); } finally{ setTimeout(status,0); } };
  const o0=window.twLogout;
  if(typeof o0==='function') window.twLogout=async function(){ try{ return await o0.apply(this,arguments); } finally{ setTimeout(status,0); } };
  const s0=window.save;
  if(typeof s0==='function') window.save=function(){ const r=s0.apply(this,arguments); try{ const c=window.EDPT_SAVE_CHAIN; if(c&&c.then) c.then(()=>setTimeout(status,0)); }catch(e){} return r; };
  setInterval(status,4000); status();

  /* Backup & Restore wording + protect live data */
  function backupText(){
    const sec=document.getElementById('backup'); if(!sec) return;
    const p=sec.querySelector('.panel > p.muted'); if(p&&/localStorage/.test(p.textContent)) p.textContent='All data is stored in the shared ADPT database (Supabase). Export Backup downloads a copy of the live shared data to keep safely.';
    sec.querySelectorAll('button').forEach(b=>{ if(/Export Laptop Backup/.test(b.textContent)) b.textContent='Export Backup';
      if(/Import Backup/.test(b.textContent)){ b.title='Restoring a backup into the live shared database is switched off to protect live data.'; } });
    sec.querySelectorAll('p.muted').forEach(x=>{ if(/replaces ALL current data/.test(x.textContent)) x.textContent='Import Backup is switched off while connected to the shared database, so a backup can never overwrite live projects and tasks by mistake.'; });
  }
  backupText();
  const ib0=window.importBackup;
  window.importBackup=function(e){
    if(ready()){ try{ if(e&&e.target) e.target.value=''; }catch(x){} alert('Import Backup is switched off while connected to the shared ADPT database.\n\nRestoring a backup here would replace the live projects and tasks for everyone. Nothing was changed.'); return; }
    return typeof ib0==='function'?ib0.apply(this,arguments):undefined;
  };
  const sw0=window.switchTab;
  if(typeof sw0==='function') window.switchTab=function(name){ const r=sw0.apply(this,arguments); if(name==='backup') setTimeout(backupText,0); return r; };
})();
