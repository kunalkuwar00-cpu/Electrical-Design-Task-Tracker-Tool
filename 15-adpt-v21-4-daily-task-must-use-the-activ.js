/* ADPT v21.4 — Daily Task must use the active Team & Access roster as its source of people.
   Legacy task records for deleted/orphaned owners remain stored, but are not shown as active people.
   No task records are deleted; cloud changes are saved through the existing Supabase adapter. */
(function(){
  const norm = v => String(v || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  const aliases = () => window.EDPT_ALIAS_TO_PROFILE || {};
  function isActiveId(id){
    const raw=String(id||'').trim().toLowerCase();
    if(!raw) return false;
    const map=aliases(), canonical=String(map[raw]||raw).toLowerCase();
    const removed=new Set((db.edptRemovedPeople||[]).map(x=>String(x).trim().toLowerCase()));
    if(removed.has(raw)||removed.has(canonical)) return false;
    // Only profiles that still exist in Team & Access are active. Alias IDs resolve to that profile.
    return !!(db.users && (db.users[canonical] || db.users[raw]));
  }
  const dailyRender0=window.twDailyRender;
  if(typeof dailyRender0==='function'){
    window.twDailyRender=function(){
      const originalDaily=db.daily, originalUsers=db.users;
      try {
        // Keep historical records untouched in storage; exclude orphaned/removed owners only while rendering.
        db.daily=(originalDaily||[]).filter(t=>isActiveId(t.assigneeId));
        const allowed=new Set(Object.keys(originalUsers||{}).filter(isActiveId));
        const map=aliases();
        if(typeof DT!=='undefined' && DT.people instanceof Set){
          DT.people=new Set([...DT.people].filter(id=>{
            const raw=String(id||'').toLowerCase(), canonical=String(map[raw]||raw).toLowerCase();
            return isActiveId(id) && (allowed.has(id)||allowed.has(canonical));
          }));
        }
        return dailyRender0.apply(this,arguments);
      } finally {
        db.daily=originalDaily; db.users=originalUsers;
      }
    };
  }
  // Remove the legacy special-case that kept Vaibhav selectable after removal.
  const assignable0=window.twAssignable;
  if(typeof assignable0==='function'){
    window.twAssignable=function(){
      return assignable0.apply(this,arguments).filter(id=>isActiveId(id));
    };
  }
  window.EDPT_V214_ACTIVE_ROSTER_FILTER=true;
})();
