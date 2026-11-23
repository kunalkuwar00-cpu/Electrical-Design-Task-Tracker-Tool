/* ADPT v21.5 — newly-added Team & Access people are immediately active in Daily Tasks and Workload. */
(function(){
  const norm = v => String(v||'').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  window.edptReactivateNewPerson = function(id,user){
    const keys = new Set([norm(id),norm(user&&user.name),norm(user&&user.owner)].filter(Boolean));
    // A newly-created profile must not inherit a stale removal marker from an earlier employee record.
    db.edptRemovedPeople = (db.edptRemovedPeople||[]).filter(x=>!keys.has(norm(x)));
    if(typeof WX!=='undefined' && WX.people instanceof Set && !WX.peopleNone){
      const owner=String(user&& (user.owner||user.name) || '').trim();
      if(owner) WX.people.add(owner);
    }
    if(typeof DT!=='undefined' && DT.people instanceof Set && !DT.all) DT.people.add(id);
  };
  // Ensure a newly-created Team & Access login is part of the active roster even when the workload
  // person filter had a previous manual selection. Existing removal markers for other users remain.
  const wx0=window.wxTeam;
  if(typeof wx0==='function') window.wxTeam=function(){
    const removed=new Set((db.edptRemovedPeople||[]).map(norm));
    return [...new Set(wx0.apply(this,arguments))].filter(name=>!removed.has(norm(name)));
  };
  const workload0=window.renderWorkloadPlanner;
  if(typeof workload0==='function') window.renderWorkloadPlanner=function(){
    if(typeof WX!=='undefined' && WX.people instanceof Set && !WX.peopleNone){
      const removed=new Set((db.edptRemovedPeople||[]).map(norm));
      Object.values(db.users||{}).forEach(u=>{
        const n=String(u.owner||u.name||'').trim();
        if(n && !removed.has(norm(n))) WX.people.add(n);
      });
    }
    return workload0.apply(this,arguments);
  };
  window.EDPT_V215_ACTIVE_NEW_PEOPLE=true;
})();
