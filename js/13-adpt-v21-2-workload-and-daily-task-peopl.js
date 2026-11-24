/* ADPT v21.2 — Workload and Daily Task people lists hide every removed employee, including manually-added users without login profiles. */
(function(){
  const normName = v => String(v || '').trim().toLowerCase().replace(/\s+/g,' ');
  const protectedNames = new Set(); // Removed employees must be hidden even if they were manually added without a login profile.
  function removedNames(){
    const removed = new Set((db.edptRemovedPeople || []).map(x=>String(x).toLowerCase()));
    const aliases = window.EDPT_ALIAS_TO_PROFILE || {};
    const names = new Set();
    for (const id0 of removed) {
      const canonical = aliases[id0] || id0;
      const user = db.users?.[canonical] || db.users?.[id0];
      if (!user) continue;
      for (const value of [user.name,user.owner]) {
        const n = normName(value);
        if (n && !protectedNames.has(n)) names.add(n);
      }
    }
    return names;
  }
  const activeName = name => {
    const n = normName(name);
    return !!n && !removedNames().has(n);
  };
  const wxTeam0 = window.wxTeam;
  if (typeof wxTeam0 === 'function') {
    window.wxTeam = function(){ return wxTeam0.apply(this,arguments).filter(activeName); };
  }
  const wxFiltered0 = window.wxFiltered;
  if (typeof wxFiltered0 === 'function') {
    window.wxFiltered = function(){ return wxFiltered0.apply(this,arguments).filter(x=>activeName(x.owner)); };
  }
  const wxUnpl0 = window.wxUnpl;
  if (typeof wxUnpl0 === 'function') {
    window.wxUnpl = function(P,dates){
      const before = (db.unplanned || []).filter(x=>activeName(x.person));
      const original = db.unplanned;
      try { db.unplanned = before; return wxUnpl0.apply(this,arguments); }
      finally { db.unplanned = original; }
    };
  }
  // Keep the selected-person filter clean after an employee is removed.
  if (typeof WX !== 'undefined' && WX.people instanceof Set) {
    WX.people = new Set([...WX.people].filter(activeName));
  }
  const render0 = window.renderWorkloadPlanner;
  if (typeof render0 === 'function') {
    window.renderWorkloadPlanner = function(){
      if (typeof WX !== 'undefined' && WX.people instanceof Set) WX.people = new Set([...WX.people].filter(activeName));
      return render0.apply(this,arguments);
    };
  }
})();
