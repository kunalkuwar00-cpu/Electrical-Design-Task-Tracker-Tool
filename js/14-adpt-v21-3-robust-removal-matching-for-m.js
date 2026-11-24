/* ADPT v21.3 — robust removal matching for manually-added people in Daily Task.
   Matching covers employee IDs, display names, comma/space variations and task assignee IDs.
   Source records are never deleted; filtering is temporary during rendering only.
*/
(function(){
  const norm = v => String(v || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  function removedIdentity(){
    const aliases = window.EDPT_ALIAS_TO_PROFILE || {};
    const raw = (db.edptRemovedPeople || []).map(v => String(v));
    const ids = new Set(), names = new Set();
    raw.forEach(value => {
      const key = value.toLowerCase();
      ids.add(key); ids.add(String(aliases[key] || key).toLowerCase());
      Object.entries(aliases).forEach(([alias, canonical]) => {
        if (String(canonical).toLowerCase() === String(aliases[key] || key).toLowerCase()) ids.add(String(alias).toLowerCase());
      });
      const user = db.users?.[value] || db.users?.[aliases[key]] || Object.entries(db.users || {}).find(([id])=>id.toLowerCase()===key)?.[1];
      if (user) [user.name,user.owner].forEach(n=>{if(norm(n))names.add(norm(n));});
      if (norm(value)) names.add(norm(value));
    });
    // Also resolve names from any user record whose key or alias is marked removed.
    Object.entries(db.users || {}).forEach(([id,user])=>{
      const key=id.toLowerCase(), canonical=String(aliases[key]||key).toLowerCase();
      if(ids.has(key)||ids.has(canonical)) [user.name,user.owner].forEach(n=>{if(norm(n))names.add(norm(n));});
    });
    return {ids,names};
  }
  function isRemovedId(id, identity){
    const raw=String(id||'').toLowerCase(), aliases=window.EDPT_ALIAS_TO_PROFILE||{};
    return identity.ids.has(raw)||identity.ids.has(String(aliases[raw]||raw).toLowerCase())||identity.names.has(norm(id));
  }
  const assignable0=window.twAssignable;
  if(typeof assignable0==='function') window.twAssignable=function(){
    const identity=removedIdentity();
    return assignable0.apply(this,arguments).filter(id=>{
      const u=db.users?.[id];
      return !isRemovedId(id,identity)&&!identity.names.has(norm(u?.name))&&!identity.names.has(norm(u?.owner));
    });
  };
  const daily0=window.twDailyRender;
  if(typeof daily0==='function') window.twDailyRender=function(){
    const identity=removedIdentity();
    const originalUsers=db.users, originalDaily=db.daily;
    try {
      db.users=Object.fromEntries(Object.entries(originalUsers||{}).filter(([id,u])=>
        !isRemovedId(id,identity)&&!identity.names.has(norm(u?.name))&&!identity.names.has(norm(u?.owner))
      ));
      if(typeof edptKeepMe==='function') db.users=edptKeepMe(originalUsers,db.users);
      // Do not render tasks assigned to a removed employee in the active Daily Task people view.
      // The original db.daily array is restored immediately and remains saved for history/reallocation.
      db.daily=(originalDaily||[]).filter(t=>!isRemovedId(t.assigneeId,identity));
      if(typeof DT!=='undefined'&&DT.people instanceof Set){
        DT.people=new Set([...DT.people].filter(id=>!isRemovedId(id,identity)&&!!db.users[id]));
      }
      if(typeof DT!=='undefined'&&DT.all) DT.all=true;
      return daily0.apply(this,arguments);
    } finally {
      db.users=originalUsers; db.daily=originalDaily;
    }
  };
  // Refresh the Daily Task list immediately after a removal or when the page opens.
  window.EDPT_V213_REMOVAL_FILTER=true;
})();
