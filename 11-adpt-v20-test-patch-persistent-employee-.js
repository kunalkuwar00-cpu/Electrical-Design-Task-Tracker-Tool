/* ADPT v20 TEST PATCH — persistent employee removal from active lists.
   Removed people remain in db.users/task history so old records are preserved,
   but are hidden from Team & Access and all new Daily Task people/assignment lists.
*/
(function(){
  function removedSet(){ db.edptRemovedPeople ||= []; return new Set(db.edptRemovedPeople.map(x=>String(x).toLowerCase())); }
  function aliasesFor(id){
    const map=window.EDPT_ALIAS_TO_PROFILE||{}, key=String(id||'').toLowerCase();
    const canonical=map[key]||key;
    return [canonical,...Object.keys(map).filter(k=>String(map[k]).toLowerCase()===canonical)];
  }
  const oldAssignable=window.twAssignable;
  window.twAssignable=function(){
    const gone=removedSet();
    return (typeof oldAssignable==='function'?oldAssignable():Object.keys(db.users||{}))
      .filter(id=>!gone.has(String(id).toLowerCase()));
  };
  const oldTeamRender=window.twTeamRender;
  window.twTeamRender=function(){
    const r=oldTeamRender.apply(this,arguments);
    const gone=removedSet(), body=document.getElementById('twTeamRows');
    if(body){
      [...body.querySelectorAll('tr')].forEach(row=>{
        const id=row.querySelector('.tw-mono')?.textContent?.trim().toLowerCase();
        if(id&&gone.has(id))row.remove();
      });
      const count=document.getElementById('twTeamCount');
      if(count)count.textContent=`${body.querySelectorAll('tr').length} employees`;
    }
    return r;
  };
  window.twDelUser=function(id){
    const u=db.users&&db.users[id];
    if(!u||!twLead(twU())||u.admin||id===TW.me)return;
    if(!confirm(`Remove ${twName(id)} from Team & Access and new task assignment lists? Existing tasks and history will be preserved.`))return;
    const gone=removedSet();
    aliasesFor(id).forEach(k=>gone.add(String(k).toLowerCase()));
    db.edptRemovedPeople=[...gone];
    save(false);
    if(typeof twTeamRender==='function')twTeamRender();
    if(typeof twDailyRender==='function')twDailyRender();
    if(typeof twTopRender==='function')twTopRender();
    toast(`${twName(id)} removed from active people lists. Existing records preserved.`);
  };
  // Reconcile current selection after a removal so removed people do not remain selected.
  const daily0=window.twDailyRender;
  window.twDailyRender=function(){
    const gone=removedSet();
    if(typeof DT!=='undefined'&&DT.people)DT.people=new Set([...DT.people].filter(id=>!gone.has(String(id).toLowerCase())));
    return daily0.apply(this,arguments);
  };
})();
