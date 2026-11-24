/* ADPT fix: keep inserted unplanned-task duration, log and workload allocation in sync. */
(function(){
  function findInsertedLog(subId){return (db.unplanned||[]).find(e=>e.subId===subId);}
  function syncInsertedLog(sub){
    if(!sub||!sub.unplanned)return false;
    const entry=findInsertedLog(sub.id);
    if(!entry)return false;
    const start=sub.start||entry.date;
    const end=sub.target||start;
    const days=(start&&end&&start<=end&&typeof lkDays==='function')?Number(lkDays(start,end)):1;
    const capacity=(typeof wlCapacity==='function'?(Number(wlCapacity(sub.owner))||8):8);
    const hours=Math.max(0,days)*capacity;
    entry.date=start; entry.endDate=end; entry.days=days; entry.person=sub.owner||entry.person;
    entry.hours=hours; entry.lost=hours;
    sub.plannedHours=hours;
    /* Inserted work is recorded as completed actual work; keep the log totals consistent. */
    sub.actualHours=hours;
    return true;
  }
  function findSub(tid,sid){const p=(typeof pbyid==='function'?(pbyid(val('taskProjectFilter'))||project()):null);const t=p&&p.tasks.find(x=>x.id===tid);return t&&(t.subs||[]).find(x=>x.id===sid);}
  function wrapAfter(name,getSub){
    const original=window[name]; if(typeof original!=='function'||original.__edptUnplannedSync)return;
    const wrapped=function(){const result=original.apply(this,arguments);try{const sub=getSub.apply(this,arguments);if(syncInsertedLog(sub)){save(false);refreshTaskViews();if(typeof ulLogRender==='function')ulLogRender();}}catch(err){console.error('ADPT unplanned workload sync:',err)}return result};
    wrapped.__edptUnplannedSync=true;window[name]=wrapped;
  }
  wrapAfter('tmSetDays',function(tid,sid){return findSub(tid,sid)});
  wrapAfter('quickUpdateSubtask',function(tid,sid){return findSub(tid,sid)});
  wrapAfter('saveSubtask',function(tid){const p=pbyid(val('taskProjectFilter'))||project(),t=p&&p.tasks.find(x=>x.id===tid),sid=val('subid-'+tid);return t&&(t.subs||[]).find(x=>x.id===sid)});
  /* Workload: spread inserted-task hours over its current working-day range, not only its original start date. */
  window.wxUnpl=function(P,dates){
    const projects=typeof wxSelProjects==='function'?wxSelProjects():[],assignee=val('wlAssignee'),query=(val('wlSearch')||'').toLowerCase(),hol=typeof wxHol==='function'?wxHol():[];
    (db.unplanned||[]).forEach(u=>{
      if(projects.length&&u.projectId&&!projects.includes(u.projectId))return;
      if(assignee&&u.person!==assignee)return;
      if(typeof wxPplOK==='function'&&!wxPplOK(u.person))return;
      if(query&&!String(u.person||'').toLowerCase().includes(query))return;
      let span=[u.date];
      if(u.subId){const sub=(db.projects||[]).flatMap(p=>(p.tasks||[]).flatMap(t=>t.subs||[])).find(x=>x.id===u.subId);if(sub){const a=sub.start||u.date,b=sub.target||a;span=[];for(let d=a,g=0;d&&d<=b&&g++<900;d=wlDateAdd(d,1))if(wxWork(d,hol))span.push(d);}}
      span=span.filter(d=>dates.includes(d));if(!span.length)return;
      const per=Number(u.hours||0)/span.length;(P[u.person]??={n:u.person,days:{}});span.forEach(d=>P[u.person].days[d]=(P[u.person].days[d]||0)+per);
    });
  };
  window.ulLogRender=function(){
    const host=document.getElementById('ulPanel');if(!host)return;
    const rows=[...(db.unplanned||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.at||0)-(a.at||0)).slice(0,60);
    const subFor=e=>e.subId?(db.projects||[]).flatMap(p=>(p.tasks||[]).flatMap(t=>t.subs||[])).find(x=>x.id===e.subId):null;
    host.innerHTML=`<div class=\"toprow\"><div><h3 style=\"margin:0\">Unplanned tasks</h3><span class=\"muted\">Logged from Task Management. Duration and workload follow the current task dates.</span></div></div><div class=\"tablewrap\" style=\"margin-top:12px\"><table class=\"tm-table\"><thead><tr><th>No.</th><th>Affected Project</th><th>Unplanned Task</th><th>Work was for</th><th>Owner</th><th>Status</th><th>Progress</th><th>Start</th><th>Target</th><th>Days</th><th>Est. Hrs</th><th>Actual Hrs</th><th>Delay caused</th><th>Logged by</th><th></th></tr></thead><tbody>${rows.map((e,i)=>{const p=pbyid(e.projectId),sub=subFor(e),start=sub?.start||e.date,end=sub?.target||e.endDate||e.date,days=sub&&start&&end?lkDays(start,end):+(Number(e.hours||0)/8).toFixed(2),status=sub?.status||'Completed',progress=sub?(sub.pct??(status==='Completed'?100:0)):100,est=sub?.plannedHours??e.hours,actual=sub?.actualHours??e.hours;return `<tr><td>${i+1}</td><td><b>${p?esc(p.code):'—'}</b>${p?`<div class=\"muted\">${esc(p.name||'')}</div>`:''}</td><td>${esc(e.note)}</td><td>${esc(e.rel||'—')}</td><td>${esc(sub?.owner||e.person)}</td><td>${badge(status)}</td><td>${progress}%</td><td>${fmtDate(start)}</td><td>${fmtDate(end)}</td><td>${days}</td><td>${Number(est||0)}</td><td>${Number(actual||0)}</td><td>${e.shift?`+${e.shift} day(s)`:e.lost?`Slip ${e.lost} h`:'None (absorbed)'}</td><td>${esc(twName(e.by))}</td><td>${(twLead(twU())||e.by===TW.me)?`<button class=\"small danger\" onclick=\"ulDel('${e.id}')\">Delete</button>`:''}</td></tr>`}).join('')||'<tr><td colspan=\"15\">No unplanned tasks logged.</td></tr>'}</tbody></table></div>`;
  };
  window.wxUnplA=function(per,proj,dates){
    const hol=typeof wxHol==='function'?wxHol():[];
    (db.unplanned||[]).forEach(u=>{if(typeof wxPplOK==='function'&&!wxPplOK(u.person))return;let span=[u.date];
      if(u.subId){const sub=(db.projects||[]).flatMap(p=>(p.tasks||[]).flatMap(t=>t.subs||[])).find(x=>x.id===u.subId);if(sub){const a=sub.start||u.date,b=sub.target||a;span=[];for(let d=a,g=0;d&&d<=b&&g++<900;d=wlDateAdd(d,1))if(wxWork(d,hol))span.push(d);}}
      span=span.filter(d=>dates.includes(d));if(!span.length)return;const perDay=Number(u.hours||0)/span.length;
      (per[u.person]??={});((proj[u.person]??={}));span.forEach(d=>{per[u.person][d]=(per[u.person][d]||0)+perDay;((proj[u.person][d]??={}).Unplanned)=((proj[u.person][d]||{}).Unplanned||0)+perDay;});
    });
  };
})();
