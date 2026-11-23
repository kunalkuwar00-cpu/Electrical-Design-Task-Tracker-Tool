/* ===== v37 — Project Schedule: no reason pop-ups for task dates, automatic linked dates =====
   In plain words:
   1. Changing a milestone / sub milestone Start Date, Target Date or Days no longer asks "why".
      The reason pop-up now appears ONLY when the PROJECT END DATE is changed (Project Setup),
      and only after the project already had an end date. Everyone is asked, including AGM / Manager / TL.
   2. Linked tasks follow automatically (no confirm box):
      if B is linked after A, then  B Start = next working day after A's Target (end) date,
      and B Target = B Start + B's number of days. This runs down the whole chain (A → B → C …),
      forwards and backwards, whenever any date or Days changes.
      Changing a task's Start Date keeps its number of Days (the Target Date moves with it).
      Completed and Cancelled tasks never move.
*/
(function(){
  'use strict';
  const DONE=['Completed','Cancelled'];

  /* ---------- 1. Reason only for Project End Date ---------- */
  const dc0=window.dateChange;
  if(typeof dc0==='function') window.dateChange=function(p,record,field,oldv,newv){
    if(field==='Project End Date') return dc0.apply(this,arguments);   // keeps the "why" pop-up + history
    return true;                                                          // every other date: no pop-up
  };

  /* ---------- 2. Automatic linked dates ---------- */
  function daysOf(o){ return (o.start&&o.target&&o.target>=o.start)?wdCount(o.start,o.target):0; }

  /* Re-plan every linked task of project p. Returns how many tasks moved. */
  function autoSchedule(p){
    if(!p||!Array.isArray(p.tasks)) return 0;
    const moved=new Set();
    for(let pass=0; pass<60; pass++){
      lkRoll(p);
      const recs=lkRecs(p), by=Object.fromEntries(recs.map(r=>[r.id,r]));
      let changed=false;
      for(const r of recs){
        const links=(r.o.links||[]).filter(i=>by[i]&&i!==r.id); if(!links.length) continue;
        if(DONE.includes(r.o.status)) continue;
        const last=links.map(i=>by[i].o.target||'').filter(Boolean).sort().pop(); if(!last) continue;
        const want=lkNext(last);                        // next working day after the linked task ends
        if(r.o.start===want) continue;
        const isMain=!r.main, subs=isMain?(r.o.subs||[]).filter(s=>!DONE.includes(s.status)):[];
        if(isMain&&subs.length){
          // a milestone with sub milestones: move all its sub milestones together
          const n=r.o.start?wdDiff(r.o.start,want):0; if(!n) continue;
          subs.forEach(s=>['start','target'].forEach(f=>{ if(s[f]) s[f]=wdStep(s[f],n); }));
        }else{
          const d=daysOf(r.o);
          r.o.start=want;
          if(d) r.o.target=wdStep(want,d-1);
        }
        moved.add(r.id); changed=true;
      }
      if(!changed) break;
    }
    lkRoll(p);
    return moved.size;
  }
  window.edptAutoSchedule=autoSchedule;

  function finish(p,n){
    try{ lkFinish(p); }catch(e){ try{ save(false); renderTasks(); }catch(_){} }
    if(n){ try{ toast(`${n} linked task${n>1?'s':''} moved automatically`); }catch(_){} }
    try{ if(p.end&&lkRecs(p).some(r=>r.o.target&&r.o.target>p.end)) toast('⚠ Some tasks now end after the project end date'); }catch(_){}
  }
  const curP=()=>{ try{ return lkP(); }catch(e){ return null; } };

  /* old "linked tasks follow this change? OK / Cancel" box → now automatic */
  window.lkAfter=function(p){ try{ lkRoll(p); const n=autoSchedule(p); finish(p,n); }catch(e){ console.warn(e); } };

  /* Days: no pop-up, Target = Start + Days, then linked tasks follow */
  window.tmSetDays=function(tid,sid,v){
    const p=curP(), t=p&&p.tasks.find(x=>x.id===tid), s=t&&(t.subs||[]).find(x=>x.id===sid); if(!s) return;
    const n=parseInt(v,10);
    if(!(n>=1&&n<=999)){ alert('Enter the number of working days (1 or more).'); renderTasks(); return; }
    if(!s.start){ alert('Set the Start Date first, then enter the days.'); renderTasks(); return; }
    const nt=wdStep(s.start,n-1); if(s.target===nt) return;
    try{ const m=window.edptLeaveMsg&&edptLeaveMsg(s.owner,nt,'Target date'); if(m){ alert(m); renderTasks(); return; } }catch(_){}
    s.target=nt; finish(p,autoSchedule(p));
  };

  /* inline edits on the schedule */
  const qu0=window.quickUpdateSubtask;
  if(typeof qu0==='function') window.quickUpdateSubtask=function(tid,sid,f,v){
    if(f!=='start'&&f!=='target') return qu0.apply(this,arguments);
    const p=curP(), t=p&&p.tasks.find(x=>x.id===tid), s=t&&(t.subs||[]).find(x=>x.id===sid);
    if(!s) return qu0.apply(this,arguments);
    // Start Date change keeps the number of Days: move the Target Date with it
    if(f==='start'&&v&&s.start&&s.target&&v!==s.start){
      const d=daysOf(s), nt=d?wdStep(v,d-1):'';
      if(nt){
        const later=v>s.start;
        // order matters so "Target must be on or after Start" never blocks the change
        if(later){ qu0.call(this,tid,sid,'target',nt); if(s.target!==nt) return; qu0.call(this,tid,sid,'start',v); }
        else{ qu0.call(this,tid,sid,'start',v); if(s.start!==v) return; qu0.call(this,tid,sid,'target',nt); }
        finish(p,autoSchedule(p)); return;
      }
    }
    const r=qu0.apply(this,arguments);
    finish(p,autoSchedule(p));
    return r;
  };

  /* forms (Add / Edit milestone and sub milestone) */
  ['saveTask','saveSubtask'].forEach(nm=>{
    const f0=window[nm]; if(typeof f0!=='function') return;
    window[nm]=function(){ const r=f0.apply(this,arguments); try{ const p=curP(); const n=autoSchedule(p); if(n) finish(p,n); }catch(e){ console.warn(e); } return r; };
  });

  /* saving links: the linked task is placed right after the task it follows */
  window.lkSave=function(){
    const {pid,id}=window._lk||{}, p=pbyid(pid), rec=p&&lkRecs(p).find(r=>r.id===id); if(!rec) return lkClose();
    rec.o.links=[...document.querySelectorAll('#lkList input:checked')].map(i=>i.value);
    lkClose(); const n=autoSchedule(p); finish(p,n); if(!n) toast('Links saved');
  };

  /* "Linked From" box typed in the schedule (e.g. "3, 5"): no pop-ups, the task is placed automatically */
  window.edptSetLinksTyped=function(tid,sid,text,el){
    try{
      const p=lkP(), id=sid||tid, R=lkRecs(p), rec=R.find(r=>r.id===id); if(!rec) return;
      const nums=lkNums(p), byNum={}; Object.entries(nums).forEach(([k,n])=>{ byNum[String(n)]=k; });
      const parts=String(text||'').split(/[,;\s]+/).map(x=>x.replace(/^#/,'').trim()).filter(Boolean);
      const bad=lkDesc(p,id), ids=[], errs=[];
      parts.forEach(n=>{ const k=byNum[n]; if(!/^\d+$/.test(n)||!k) errs.push(`#${n} does not exist`); else if(k===id) errs.push(`#${n} is this sub milestone itself`); else if(bad.has(k)) errs.push(`#${n} is linked after this one, so it would create a loop`); else if(!ids.includes(k)) ids.push(k); });
      if(errs.length){ alert('Linked From not saved for #'+nums[id]+' '+rec.name+':\n\n• '+errs.join('\n• ')+'\n\nUse the numbers shown in the No. column, separated by commas.'); if(el) el.value=(rec.o.links||[]).map(x=>nums[x]).filter(Boolean).join(', '); return; }
      if(JSON.stringify([...(rec.o.links||[])].sort())===JSON.stringify([...ids].sort())) return;
      rec.o.links=ids;
      finish(p,autoSchedule(p));
    }catch(e){ console.error(e); alert('Could not save the links: '+e.message); }
  };

  /* "Move by N working days" button: no reason pop-up */
  const sh0=window.lkShiftTask;
  if(typeof sh0==='function') window.lkShiftTask=function(pid,id,n,reason){
    const r=sh0.call(this,pid,id,n,reason||`Moved by ${n>0?'+':''}${n} working days`);
    try{ const p=pbyid(pid); const m=autoSchedule(p); if(m) finish(p,m); }catch(e){}
    return r;
  };
})();
