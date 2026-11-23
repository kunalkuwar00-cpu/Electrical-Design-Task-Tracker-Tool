/* ===== ADPT v35.9 — Leave: book leave, show it in the calendars, review and shift the schedule after returning =====
   Stored in db.capacity.leaves = [{id, person, key, name, a, b, reason, by, at, reviewed, reviewedAt, shifted}]
   Leave days count as non-working days in Team Capacity (no capacity, booked hours spread over the other days).
   Dates in the Project Schedule are NOT moved when leave is booked. When the person is back, the tool shows which
   sub milestones fell in the leave and lets them shift those (and everything linked after them) or keep the dates. */
(function(){
  'use strict';
  const E=s=>(typeof esc==='function'?esc(s):String(s??''));
  const T=()=>typeof twToday==='function'?twToday():new Date().toISOString().slice(0,10);
  const fd=s=>s?(typeof fmtDate==='function'?fmtDate(s):s):'—';
  const uidL=()=>(typeof uid==='function'?uid():'lv'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  const LV=()=>{ db.capacity ||= {}; if(!Array.isArray(db.capacity.leaves)) db.capacity.leaves=[]; return db.capacity.leaves; };
  const me=()=>{ try{ return TW.me; }catch(e){ return ''; } };
  const isLead=()=>{ try{ const u=twU(); return !!u&&(u.admin||twLead(u)); }catch(e){ return false; } };
  const isShared=()=>{ try{ return typeof window.edptIsSharedLogin==='function'&&window.edptIsSharedLogin(TW.me); }catch(e){ return false; } };
  const anyone=()=>isLead()||isShared();
  const wd=(a,b)=>(window.RP&&RP.workDays?RP.workDays(a,b):[]);
  function people(){
    try{ const M=RP.build({}); return Object.values(M.P).filter(p=>!p.exclude&&p.id).sort((a,b)=>a.name.localeCompare(b.name)); }catch(e){ return []; }
  }
  const personOf=id=>people().find(p=>p.id===id);
  /* sub milestones of this person planned inside the leave */
  function affected(L){
    try{
      const M=RP.build({}), p=Object.values(M.P).find(x=>x.id===L.person||x.key===L.key); if(!p) return [];
      const seen=new Set();
      return (p.all||[]).filter(x=>x.p&&x.p.id!=='daily'&&!x.unplanned&&!['Completed','Cancelled'].includes(x.status)&&x.start&&x.end&&x.start<=L.b&&x.end>=L.a)
        .filter(x=>{ const k=x.p.id+'|'+x.item.id; if(seen.has(k)) return false; seen.add(k); return true; })
        .map(x=>{ const a=x.start>L.a?x.start:L.a, b=x.end<L.b?x.end:L.b; return {x,n:wd(a,b).length}; }).filter(r=>r.n>0)
        .sort((m,n)=>String(m.x.start).localeCompare(String(n.x.start)));
    }catch(e){ console.warn(e); return []; }
  }
  window.edptLeaveAffected=affected;
  const pending=()=>LV().filter(l=>!l.cancelled&&!l.reviewed&&(l.b||l.a)<T());

  /* ---------- book leave ---------- */
  window.edptBookLeave=function(presetId){
    const ps=people(), mine=ps.find(p=>p.id===me());
    const list=anyone()?ps:(mine?[mine]:[]);
    if(!list.length) return alert('Your name is not in the team list, so leave cannot be booked. Contact your Team Leader or the ADPT Admin.');
    const sel=presetId&&list.find(p=>p.id===presetId)?presetId:(mine&&list.includes(mine)?mine.id:list[0].id);
    const t=T();
    const m=twModal('Book leave',`<div class="lv-form">
      <div class="lv-g"><label>Person</label><select id="lvP" ${list.length===1?'disabled':''}>${list.map(p=>`<option value="${E(p.id)}" ${p.id===sel?'selected':''}>${E(p.name)}</option>`).join('')}</select></div>
      <div class="lv-g2"><div><label>From</label><input type="date" id="lvA" value="${t}"></div><div><label>To</label><input type="date" id="lvB" value="${t}"></div></div>
      <div class="lv-g"><label>Reason</label><input id="lvR" list="lvRs" placeholder="Leave, sick, training…"><datalist id="lvRs"><option value="Planned leave"><option value="Sick leave"><option value="Training"><option value="Site visit"><option value="Comp off"></datalist></div>
      <div id="lvInfo" class="lv-info"></div></div>`,mm=>doSave(mm),'Book leave',true);
    const info=()=>{ const pid=m.querySelector('#lvP').value, a=m.querySelector('#lvA').value, b=m.querySelector('#lvB').value||a, box=m.querySelector('#lvInfo'); if(!a){ box.innerHTML=''; return; }
      if(b<a){ box.innerHTML='<p class="lv-bad">"To" is before "From".</p>'; return; }
      const p=list.find(x=>x.id===pid), n=wd(a,b).length, af=affected({person:pid,key:p&&p.key,a,b});
      const clash=LV().filter(l=>!l.cancelled&&l.person===pid&&l.a<=b&&(l.b||l.a)>=a);
      box.innerHTML=`<p><b>${n}</b> working day${n===1?'':'s'} of leave (weekends and holidays not counted).</p>${clash.length?`<p class="lv-bad">Already on leave ${clash.map(l=>fd(l.a)+(l.b&&l.b!==l.a?' – '+fd(l.b):'')).join(', ')} — overlapping days are counted once.</p>`:''}
        ${af.length?`<p style="margin:8px 0 4px"><b>${af.length}</b> sub milestone${af.length===1?' is':'s are'} planned during this leave:</p><ul class="lv-ul">${af.map(r=>`<li><b>${E(r.x.p.code||'')}</b> ${E(r.x.t.name)} › ${E(r.x.item.name)} <span class="muted">(${fd(r.x.start)} – ${fd(r.x.end)}, ${r.n} day${r.n===1?'':'s'} in leave)</span></li>`).join('')}</ul>
        <p class="muted" style="font-size:12px">Dates are not moved now. When ${p&&p.id===me()?'you are':E(p?p.name:'the person')+' is'} back, the tool asks to shift these (and the tasks linked after them) or keep the dates.</p>`:'<p class="muted">No sub milestones are planned during this leave.</p>'}`; };
    ['#lvP','#lvA','#lvB'].forEach(s=>m.querySelector(s).addEventListener('change',info)); info();
    function doSave(mm){
      const pid=mm.querySelector('#lvP').value, a=mm.querySelector('#lvA').value, b=mm.querySelector('#lvB').value||a, r=mm.querySelector('#lvR').value.trim();
      if(!a) return 'Choose the first day of leave.'; if(b<a) return '"To" is before "From".';
      if(!wd(a,b).length) return 'These dates have no working days (only weekend or holidays).';
      const p=list.find(x=>x.id===pid); if(!p) return 'Choose a person.';
      LV().push({id:uidL(),person:p.id,key:p.key,name:p.name,a,b,reason:r||'Leave',by:me(),at:new Date().toISOString(),reviewed:false});
      save(false); setTimeout(()=>{ try{ if(TW.tab==='capacity'&&RP.render) RP.render(); if(TW.tab==='daily') twDailyRender(); }catch(e){} },0);
    }
  };

  /* ---------- leave list ---------- */
  window.edptLeaveList=function(){
    const t=T(), rows=LV().filter(l=>!l.cancelled).sort((x,y)=>String(y.a).localeCompare(String(x.a))).slice(0,200);
    const st=l=>{ const b=l.b||l.a; if(l.a>t) return ['Upcoming','#2563eb']; if(b>=t) return ['On leave','#7c3aed']; return l.reviewed?['Back · schedule reviewed','#1f9d61']:['Back · review schedule','#b45309']; };
    const common=()=>!!(window.edptIsCommon&&TW.me&&edptIsCommon(TW.me));
    const canEdit=l=>{ if(common()){ const a=window.edptActor&&edptActor(); return !!a&&(l.person===a||l.by===a); } return anyone()||l.person===me()||l.by===me(); };
    const isAdm=()=>typeof twAdmin==='function'&&twAdmin();
    const canChange=l=>canEdit(l)&&((l.b||l.a)>=t||isAdm());
    const html=`<div class="actions" style="justify-content:space-between;margin-bottom:8px"><span class="muted" style="font-size:12px">Leave shows in Team Capacity (Team · days and Person · week) and is not counted as working time.</span><button class="primary small" onclick="document.querySelectorAll('.tw-modal').forEach(m=>m.remove());edptBookLeave()">+ Book leave</button></div>
      <div class="tablewrap"><table class="tc-t lv-t"><thead><tr><th>Person</th><th>From</th><th>To</th><th class="n">Working days</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map(l=>{ const s0=st(l), af=(l.b||l.a)<t&&!l.reviewed?affected(l).length:0; return `<tr><td><b>${E(l.name||(personOf(l.person)||{}).name||l.person)}</b></td><td>${fd(l.a)}</td><td>${fd(l.b||l.a)}</td><td class="n">${wd(l.a,l.b||l.a).length}</td><td>${E(l.reason||'')}</td><td><span class="tc-chip" style="color:${s0[1]}">${s0[0]}</span>${af?` <span class="muted" style="font-size:12px">${af} task(s)</span>`:''}</td>
        <td style="white-space:nowrap">${!l.reviewed&&canEdit(l)?`<button class="small" onclick="document.querySelectorAll('.tw-modal').forEach(m=>m.remove());edptLeaveReview('${E(l.id)}')">Review schedule</button>`:''}${canChange(l)?` <button class="small" onclick="edptLeaveEdit('${E(l.id)}')">Change dates</button> <button class="small danger" onclick="edptLeaveCancel('${E(l.id)}')">Cancel leave</button>`:''}</td></tr>`; }).join('')||'<tr><td colspan="7" class="muted">No leave booked yet.</td></tr>'}
      </tbody></table></div>`;
    twModal('Leave',html,null,'Close',true);
  };
  /* v35.23: change the dates of a booked leave (also while it is running) */
  window.edptLeaveEdit=function(id){
    const l=LV().find(x=>x.id===id); if(!l) return;
    document.querySelectorAll('.tw-modal').forEach(m=>m.remove());
    twModal('Change leave dates',`<p class="muted" style="margin:0">${E(l.name||'')}</p>
      <div class="tw-2"><div class="tw-f"><label for="leA">From</label><input id="leA" type="date" value="${E(l.a)}" required></div><div class="tw-f"><label for="leB">To</label><input id="leB" type="date" value="${E(l.b||l.a)}" required></div></div>
      <div class="tw-f"><label for="leR">Reason</label><input id="leR" value="${E(l.reason||'')}"></div>
      <p class="muted" style="font-size:12px;margin:0">To end a leave early, set "To" to the last day of leave.</p>`,
      m=>{ const a=m.querySelector('#leA').value, b=m.querySelector('#leB').value; if(!a||!b) return 'Enter both dates.'; if(b<a) return '"To" cannot be before "From".';
        l.a=a; l.b=b; l.reason=m.querySelector('#leR').value.trim()||l.reason; l.changedAt=new Date().toISOString(); l.changedBy=me(); l.reviewed=false; save(false);
        setTimeout(()=>{ window.edptLeaveList(); try{ if(TW.tab==='capacity'&&RP.render) RP.render(); }catch(e){} },0); },'Save');
  };
  window.edptLeaveCancel=function(id){
    const l=LV().find(x=>x.id===id); if(!l) return;
    if(!confirm(`Cancel the leave of ${l.name||''} on ${fd(l.a)}${l.b&&l.b!==l.a?' – '+fd(l.b):''}?`)) return;
    l.cancelled=true; l.cancelledAt=new Date().toISOString(); l.cancelledBy=me(); save(false);
    document.querySelectorAll('.tw-modal').forEach(m=>m.remove()); window.edptLeaveList();
    try{ if(TW.tab==='capacity'&&RP.render) RP.render(); }catch(e){}
  };

  /* ---------- review after returning ---------- */
  function shiftMany(sel,reason){
    const by={}; sel.forEach(s=>(by[s.pid] ||= []).push(s)); let moved=0, follow=0;
    Object.entries(by).forEach(([pid,arr])=>{
      const p=pbyid(pid); if(!p) return; const done=new Set();
      arr.sort((x,y)=>String(x.start).localeCompare(String(y.start))).forEach(({id,n})=>{
        if(done.has(id)) return; const R=lkRecs(p), map=Object.fromEntries(R.map(r=>[r.id,r])); if(!map[id]) return;
        const before=lkTargets(p), log=[]; lkShiftRec(map[id],n,log); log.push(...lkRun(p,[id],n,before,new Set([id])));
        lkLog(p,log,reason); const ids=new Set(log.map(l=>l.r.id)); ids.forEach(i=>done.add(i)); moved++; follow+=Math.max(0,ids.size-1);
      });
      try{ if(typeof lkRoll==='function') lkRoll(p); }catch(e){}
      lkFinish(p);
    });
    return {moved,follow};
  }
  window.edptLeaveReview=function(id){
    const l=LV().find(x=>x.id===id); if(!l) return;
    const af=affected(l), nm=l.name||(personOf(l.person)||{}).name||'';
    if(!af.length){ l.reviewed=true; l.reviewedAt=new Date().toISOString(); l.shifted=0; save(false); return alert(`No open sub milestones of ${nm} were planned during this leave. Nothing to shift.`); }
    const html=`<p style="margin:0 0 8px">${E(nm)} was on leave <b>${fd(l.a)}${l.b&&l.b!==l.a?' – '+fd(l.b):''}</b> (${wd(l.a,l.b||l.a).length} working day${wd(l.a,l.b||l.a).length===1?'':'s'}). These sub milestones were planned in that time. Tick the ones that need more time and set by how many working days to move them. Tasks linked after them move too; the project end date moves only if the linked chain reaches it.</p>
      <div class="tablewrap"><table class="tc-t lv-t"><thead><tr><th></th><th>Project</th><th>Sub milestone</th><th>Start</th><th>Target</th><th>Status</th><th class="n">Move by (working days)</th></tr></thead><tbody>
      ${af.map((r,i)=>`<tr><td><input type="checkbox" data-i="${i}" checked style="width:auto"></td><td><b>${E(r.x.p.code||'')}</b></td><td>${E(r.x.t.name)} › <b>${E(r.x.item.name)}</b></td><td>${fd(r.x.start)}</td><td>${fd(r.x.end)}</td><td>${E(r.x.status)} · ${Math.round(r.x.pct||r.x.progress||0)}%</td><td class="n"><input type="number" min="0" max="60" step="1" data-n="${i}" value="${r.n}" style="width:72px"></td></tr>`).join('')}
      </tbody></table></div><p class="muted" style="font-size:12px;margin:8px 0 0">The suggested days are the leave days inside each task's dates. Use 0 (or untick) if the work was done anyway or is not affected.</p>`;
    const m=twModal('Review schedule after leave',html,mm=>{
      const sel=af.map((r,i)=>({r,on:mm.querySelector(`[data-i="${i}"]`).checked,n:Math.round(Number(mm.querySelector(`[data-n="${i}"]`).value)||0)})).filter(z=>z.on&&z.n>0).map(z=>({pid:z.r.x.p.id,id:z.r.x.item.id,n:z.n,start:z.r.x.start,name:z.r.x.item.name}));
      if(sel.length&&!confirm(`Move ${sel.length} sub milestone(s) later?\n\n${sel.map(s=>'• '+s.name+': +'+s.n+' working day(s)').join('\n')}\n\nTasks linked after them move too.`)) return 'Nothing moved.';
      const res=sel.length?shiftMany(sel,`Leave ${fd(l.a)}${l.b&&l.b!==l.a?' – '+fd(l.b):''}${l.reason?' ('+l.reason+')':''}`):{moved:0,follow:0};
      l.reviewed=true; l.reviewedAt=new Date().toISOString(); l.reviewedBy=me(); l.shifted=res.moved; save(false);
      setTimeout(()=>{ try{ if(TW.tab==='daily') twDailyRender(); }catch(e){} },0);
    },'Save — shift ticked tasks',true);
    const b=document.createElement('button'); b.type='button'; b.textContent='No change needed'; b.onclick=()=>{ l.reviewed=true; l.reviewedAt=new Date().toISOString(); l.reviewedBy=me(); l.shifted=0; save(false); m.remove(); try{ if(TW.tab==='daily') twDailyRender(); }catch(e){} };
    const foot=m.querySelector('.tw-foot'); if(foot) foot.insertBefore(b,foot.firstChild);
  };

  /* ---------- Daily Tasks: button + "back from leave" banner ---------- */
  function daily(){
    const acts=document.getElementById('twDailyActs');
    if(acts&&!acts.querySelector('[data-lv]')){ const b=document.createElement('button'); b.dataset.lv='1'; b.textContent='Book leave'; b.onclick=()=>window.edptBookLeave(); acts.appendChild(b); const c=document.createElement('button'); c.dataset.lv='2'; c.textContent='Leave'; c.title='See booked leave'; c.onclick=()=>window.edptLeaveList(); acts.appendChild(c); }
    const box=document.getElementById('twDailyList'); if(!box) return;
    box.querySelector('.lv-banner')?.remove();
    const mine=pending().filter(l=>l.person===me()), others=anyone()?pending().filter(l=>l.person!==me()):[];
    const list=[...mine,...others].map(l=>({l,n:affected(l).length})).filter(z=>z.n>0);
    if(!list.length) return;
    const d=document.createElement('div'); d.className='lv-banner';
    d.innerHTML=`<b>Back from leave — check the schedule</b>${list.slice(0,6).map(({l,n})=>`<div>${E(l.person===me()?'You were':(l.name||'')+' was')} on leave ${fd(l.a)}${l.b&&l.b!==l.a?' – '+fd(l.b):''}: <b>${n}</b> sub milestone${n===1?' was':'s were'} planned in that time. <button class="small" onclick="edptLeaveReview('${E(l.id)}')">Review schedule</button></div>`).join('')}${list.length>6?`<div class="muted">and ${list.length-6} more — open Leave to see all.</div>`:''}`;
    box.insertBefore(d,box.firstChild);
  }
  const dr0=window.twDailyRender; if(typeof dr0==='function') window.twDailyRender=function(){ const r=dr0.apply(this,arguments); try{ daily(); }catch(e){ console.warn(e); } return r; };

  /* ---------- Team Capacity: Leave + Book leave buttons ---------- */
  function cap(){
    const acts=document.querySelector('#capacity .toprow .actions')||document.querySelector('#capacity .actions'); if(!acts||acts.querySelector('[data-lv]')) return;
    const b=document.createElement('button'); b.dataset.lv='1'; b.textContent='Leave'; b.title='Book and see leave'; b.onclick=()=>window.edptLeaveList(); acts.insertBefore(b,acts.firstChild);
  }
  if(window.RP&&typeof RP.render==='function'){ const rr0=RP.render; RP.render=function(){ const r=rr0.apply(this,arguments); try{ cap(); }catch(e){} return r; }; }

  const css=document.createElement('style'); css.textContent=`
    .lv-form .lv-g{margin-bottom:10px} .lv-form .lv-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px} .lv-form label{display:block;font-size:12px;font-weight:600;margin-bottom:3px}
    .lv-info{border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;padding:10px 12px;font-size:13px} .lv-info p{margin:0 0 4px} .lv-bad{color:#e5484d}
    .lv-ul{margin:0 0 6px 18px;padding:0;font-size:13px} .lv-t td,.lv-t th{padding:6px 8px}
    .lv-banner{border:1px solid #7c3aed55;background:color-mix(in srgb,#7c3aed 9%,transparent);border-radius:10px;padding:10px 14px;margin:0 0 12px;font-size:13px;display:grid;gap:6px}
    .lv-banner button{margin-left:8px}`; document.head.appendChild(css);
})();
