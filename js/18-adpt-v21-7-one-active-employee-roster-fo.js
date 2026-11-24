/* ADPT v21.7 — one active employee roster for Daily Tasks, Workload and Person-wise views.
   Team & Access profiles are the source of truth. Legacy project/task records are retained,
   but an owner not in the active Team & Access roster is not rendered as an active person. */
(function(){
  const norm = v => String(v == null ? '' : v).normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  const aliasMap = () => window.EDPT_ALIAS_TO_PROFILE || {};
  function activeRoster(){
    const aliases = aliasMap();
    const aliasIds = new Set(Object.keys(aliases).map(norm));
    const removedRaw = (db.edptRemovedPeople || []).map(norm).filter(Boolean);
    const removed = new Set(removedRaw);
    const users = db.users || {};
    const rows = [];
    Object.entries(users).forEach(([id,u])=>{
      if(!u || aliasIds.has(norm(id))) return;
      const canonical = norm(aliases[String(id).toLowerCase()] || id);
      const idKey = norm(id);
      const name = String(u.name || '').trim();
      const owner = String(u.owner || u.name || '').trim();
      if(!name && !owner) return;
      if(removed.has(idKey) || removed.has(canonical) || removed.has(norm(name)) || removed.has(norm(owner))) return;
      rows.push({id, user:u, name, owner:owner || name});
    });
    // Collapse duplicate profiles/task-owner aliases by their normalized task-owner name.
    const byOwner = new Map();
    rows.forEach(r=>{
      const key = norm(r.owner);
      if(!key) return;
      const prev = byOwner.get(key);
      if(!prev || (r.id === String(TW && TW.me || '') && prev.id !== r.id)) byOwner.set(key,r);
    });
    const unique = [...byOwner.values()];
    const ids = new Set(unique.map(r=>r.id));
    const names = new Map();
    unique.forEach(r=>{
      names.set(norm(r.owner), r.owner);
      names.set(norm(r.name), r.owner);
    });
    return {rows, unique, ids, names, aliasIds, removed};
  }
  function activeId(id, roster){
    const raw=String(id||'').trim().toLowerCase(), canonical=String(aliasMap()[raw]||raw).toLowerCase();
    return !!(roster.ids.has(raw) || roster.ids.has(canonical));
  }
  function activeOwner(name, roster){ return roster.names.has(norm(name)); }
  function displayOwner(name, roster){ return roster.names.get(norm(name)) || String(name||'').trim(); }

  // Rebuild assignable users strictly from active Team & Access profiles.
  window.twAssignable = function(){ return activeRoster().rows.map(r=>r.id).sort((a,b)=>twName(a).localeCompare(twName(b))); };
  window.twTeamOpts = function(){ return window.twAssignable().map(id=>`<option value="${esc(id)}">${esc(twName(id))}</option>`).join(''); };

  // Daily Tasks: active profiles only. Keep original arrays untouched after rendering.
  const dailyRender0 = window.twDailyRender;
  if(typeof dailyRender0 === 'function') window.twDailyRender = function(){
    const roster=activeRoster(), oldUsers=db.users, oldDaily=db.daily;
    try{
      db.users=Object.fromEntries(Object.entries(oldUsers||{}).filter(([id])=>activeId(id,roster)||id===TW.me));if(typeof edptKeepMe==='function')db.users=edptKeepMe(oldUsers,db.users);
      db.daily=(oldDaily||[]).filter(t=>activeId(t.assigneeId,roster));
      if(typeof DT!=='undefined' && DT.people instanceof Set){
        DT.people=new Set([...DT.people].filter(id=>activeId(id,roster)));
      }
      return dailyRender0.apply(this,arguments);
    } finally { db.users=oldUsers; db.daily=oldDaily; }
  };

  // Person-wise Task List uses the same active employee set and cannot resurrect legacy owners.
  const personRender0 = window.twPersonRender;
  if(typeof personRender0 === 'function') window.twPersonRender = function(){
    const roster=activeRoster(), oldUsers=db.users, oldDaily=db.daily;
    try{
      db.users=Object.fromEntries(Object.entries(oldUsers||{}).filter(([id])=>activeId(id,roster)||id===TW.me));if(typeof edptKeepMe==='function')db.users=edptKeepMe(oldUsers,db.users);
      db.daily=(oldDaily||[]).filter(t=>activeId(t.assigneeId,roster));
      if(typeof TWP!=='undefined' && TWP.pp && !db.users[TWP.pp]) TWP.pp='';
      return personRender0.apply(this,arguments);
    } finally { db.users=oldUsers; db.daily=oldDaily; }
  };

  // Workload: project owners and unplanned-work owners must match active Task Owner Names.
  const wxTeam0 = window.wxTeam;
  window.wxTeam = function(){
    const roster=activeRoster();
    return [...new Set(roster.unique.map(r=>r.owner))].sort((a,b)=>a.localeCompare(b));
  };
  const wxItems0 = window.wxItems;
  if(typeof wxItems0 === 'function') window.wxItems = function(){
    const roster=activeRoster();
    return wxItems0.apply(this,arguments).filter(x=>activeOwner(x.owner,roster)).map(x=>({...x,owner:displayOwner(x.owner,roster)}));
  };
  const wxUnpl0 = window.wxUnpl;
  if(typeof wxUnpl0 === 'function') window.wxUnpl = function(P,dates){
    const roster=activeRoster(), old=db.unplanned;
    try { db.unplanned=(old||[]).filter(x=>activeOwner(x.person,roster)); return wxUnpl0.apply(this,arguments); }
    finally { db.unplanned=old; }
  };
  const wxUnplA0 = window.wxUnplA;
  if(typeof wxUnplA0 === 'function') window.wxUnplA = function(per,proj,dates){
    const roster=activeRoster(), old=db.unplanned;
    try { db.unplanned=(old||[]).filter(x=>activeOwner(x.person,roster)); return wxUnplA0.apply(this,arguments); }
    finally { db.unplanned=old; }
  };
  const workloadRender0 = window.renderWorkloadPlanner;
  if(typeof workloadRender0 === 'function') window.renderWorkloadPlanner = function(){
    const roster=activeRoster();
    if(typeof WX!=='undefined' && WX.people instanceof Set){
      const allowed=new Set(roster.unique.map(r=>r.owner));
      WX.people=new Set([...WX.people].filter(n=>allowed.has(displayOwner(n,roster))));
    }
    return workloadRender0.apply(this,arguments);
  };

  // Any stale current selection is cleared if the selected person is no longer active.
  if(typeof TWP!=='undefined' && TWP.pp && !activeRoster().ids.has(TWP.pp)) TWP.pp='';
  window.EDPT_V217_SINGLE_ACTIVE_ROSTER = true;
})();
