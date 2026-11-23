/* ===== ADPT v27.1 — Team Capacity › Week Planner =====
   A person's week as a time calendar. Task Management work is placed automatically (latest task dates, same engine
   as the rest of Team Capacity). Free time shows as "+ Plan" slots; planning a slot creates a normal Daily Task with
   hours per day and a start time, so it appears in Daily Tasks, the calendar and all capacity figures. */
(function(){
  'use strict';
  const RP=window.RP; if(!RP||!RP.util) return;
  const {norm,addDays,todayIso,weekStart,fd,E}=RP.util;
  const V=RP.view||(RP.view={});
  const HPX=40;                                       // pixels per hour (24-hour day)
  const DN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const r1=n=>Math.round((Number(n)||0)*10)/10;
  const hh=n=>{ const v=r1(n); return (v%1?v.toFixed(1):String(v))+' h'; };
  const isAdmin=()=>typeof twAdmin==='function'&&twAdmin();
  const toMin=t=>{ const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/); return m?(+m[1])*60+(+m[2]):null; };
  const toHHMM=min=>{ min=Math.max(0,Math.round(min)); return String(Math.floor(min/60)%24).padStart(2,'0')+':'+String(min%60).padStart(2,'0'); };
  const dayStartMin=()=>toMin(RP.cap().settings.dayStart)??540;
  const projName=id=>{ if(id==='daily') return 'Daily tasks'; const p=(db.projects||[]).find(x=>x.id===id); return p?(p.code||p.name):'Unplanned'; };
  RP.projName=projName;

  // Fix labels elsewhere in Team Capacity for the new "daily" bucket
  const css=`
  #capacity .wp-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
  #capacity .wp-head .wk{font-weight:600;font-size:15px;min-width:200px}
  #capacity .wp-strip{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:14px;min-width:0!important}
  #capacity .wp-strip th,#capacity .wp-strip td{padding:6px 8px;border-bottom:1px solid var(--sb-line,#e4e4e7);text-align:center}
  #capacity .wp-strip th:first-child,#capacity .wp-strip td:first-child{text-align:left}
  #capacity .wp-strip tr.sel td{background:color-mix(in srgb,var(--tw-green,#1f9d61) 12%,transparent)}
  #capacity .wp-strip td.c{font-weight:600;cursor:pointer}
  #capacity .wp-cal{display:grid;border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;overflow:hidden;background:var(--sb-panel,#fff)}
  #capacity .wp-hcell{padding:8px 10px;border-bottom:1px solid var(--sb-line,#e4e4e7);border-left:1px solid var(--sb-line,#e4e4e7);font-size:12px;min-height:54px}
  #capacity .wp-hcell b{display:block;font-size:20px;font-weight:500;line-height:1.1}
  #capacity .wp-hcell.today b{color:var(--tw-green,#1f9d61)}
  #capacity .wp-hcell small{color:var(--sb-mut,#71717a)}
  #capacity .wp-allday{border-left:1px solid var(--sb-line,#e4e4e7);border-bottom:1px solid var(--sb-line,#e4e4e7);padding:4px;min-height:26px;font-size:11.5px}
  #capacity .wp-allday span{display:block;padding:2px 6px;margin:2px 0;border-radius:4px;background:#3b82f61f;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #capacity .wp-times{position:relative;border-right:1px solid var(--sb-line,#e4e4e7)}
  #capacity .wp-times div{position:absolute;right:6px;font-size:11px;color:var(--sb-mut,#71717a);transform:translateY(-6px)}
  #capacity .wp-day{position:relative;border-left:1px solid var(--sb-line,#e4e4e7);background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${HPX-1}px,var(--sb-line,#e4e4e7) ${HPX-1}px,var(--sb-line,#e4e4e7) ${HPX}px)}
  #capacity .wp-day.off{background-color:color-mix(in srgb,var(--sb-mut,#71717a) 9%,transparent)}
  #capacity .wp-day.leave{background:repeating-linear-gradient(135deg,#7c3aed1f 0 8px,#7c3aed0d 8px 16px)}
  #capacity .wp-leave{position:absolute;left:8px;right:8px;padding:6px 8px;border-radius:6px;background:#7c3aed;color:#fff;font-size:12px;font-weight:700;text-align:center}
  #capacity .wp-b{position:absolute;left:4px;right:4px;border-radius:5px;padding:3px 7px;font-size:11.5px;line-height:1.25;overflow:hidden;cursor:pointer;border-left:3px solid}
  #capacity .wp-tm{background:#6366f126;border-color:#6366f1;color:inherit}
  #capacity .wp-dl{background:#0ea5e926;border-color:#0ea5e9}
  #capacity .wp-dl.done{opacity:.55;text-decoration:line-through}
  #capacity .wp-ov{background:#e5484d33;border-color:#e5484d}
  #capacity .wp-free{background:#1f9d6114;border:1px dashed #1f9d6199;border-left:3px solid #1f9d61;color:#137a49}
  html[data-theme=dark] #capacity .wp-free{color:#4fd08f}
  #capacity .wp-free:hover{background:#1f9d6129}
  #capacity .wp-now{position:absolute;left:0;right:0;border-top:2px solid #e5484d;z-index:3}
  #capacity .wp-cap{position:absolute;left:0;right:0;border-top:2px dashed #e5484d88;z-index:2}
  #capacity .wp-scroll{max-height:640px;overflow-y:auto;border:1px solid var(--sb-line,#e4e4e7);border-top:0;border-radius:0 0 8px 8px;background:var(--sb-panel,#fff)}
  #capacity .wp-cal.head{border-radius:8px 8px 0 0}
  #capacity .wp-cal.body{border:0;border-radius:0}
  #capacity .wp-work{position:absolute;left:0;right:0;background:color-mix(in srgb,var(--tw-green,#1f9d61) 4%,transparent);pointer-events:none}
  #capacity .wp-hcell .ob{display:inline-block;margin-top:3px;padding:1px 6px;border-radius:999px;background:#7f1d1d;color:#fff;font-size:11px}
  #capacity .wp-dim{opacity:.28;filter:grayscale(.6)}
  #capacity .wp-hcell .pn{font-size:14px;font-weight:700;color:var(--sb-fg,#18181b)}
  #capacity .wp-legend{display:flex;gap:8px;flex-wrap:wrap;font-size:12px;margin:8px 0}
  #capacity .wp-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:4px;border-left:3px solid}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  /* ---------- who can plan for whom ---------- */
  function myKey(M){ const u=db.users&&db.users[TW.me]; const k=norm(u&&(u.owner||u.name)); return M.P[k]?k:''; }
  function canPlanFor(M,key){ if(isAdmin()) return true; if(window.edptIsSharedLogin&&edptIsSharedLogin(TW.me)) return true; if(key&&key===myKey(M)) return true; return typeof edptCan==='function'&&edptCan('Daily Tasks','Add'); }

  /* ---------- one day's blocks for a person ---------- */
  function dayModel(M,p,d){
    const wd=(()=>{const g=new Date(d+'T12:00:00').getDay();return g>0&&g<6;})();
    const off=!wd?'Weekend':M.hol.has(d)?'Holiday':p.leave.has(d)?'Leave':'';
    const cap=off?0:p.daily, t0=M.t0, blocks=[], allDay=[];
    // shares of each work item on this day (same rules as the engine)
    let sum=0; const byProj={};
    p.items.forEach(x=>{
      const days=RP.workDays(x.start,x.end).filter(z=>!p.leave.has(z)); if(!days.includes(d)) return;
      let h=0;
      if(d<t0) h=days.length?x.P/days.length:0;
      else if(x.pend>0){ const fut=days.filter(z=>z>=t0); h=fut.length?x.pend/fut.length:0; }
      if(x.daily){ if(h>0.01||x.status==='Completed'){ blocks.push({kind:'daily',x,h:Math.max(h,x.status==='Completed'?x.perDay:0),time:toMin(x.daily.planTime)}); sum+=h; } return; }
      if(h<=0.01) return;
      const k=x.p.id; (byProj[k] ||= {pid:k,h:0,names:[]}); byProj[k].h+=h; byProj[k].names.push((x.t&&x.t!==x.item&&x.t.name?x.t.name+' › ':'')+(x.item.name||'')); sum+=h;
    });
    Object.values(byProj).sort((a,b)=>b.h-a.h).forEach(b=>blocks.push({kind:'tm',...b}));
    const rest=(p.load[d]||0)-sum; if(rest>0.05) blocks.push({kind:'tm',pid:'',h:rest,names:['Overdue work carried forward'],overdue:true});
    // daily tasks without hours → all-day row
    const al=window.EDPT_ALIAS_TO_PROFILE||{};
    (db.daily||[]).forEach(t=>{ if(Number(t.planHours)>0) return; const key=al[String(t.assigneeId||'').toLowerCase()]||t.assigneeId, u=db.users&&db.users[key]; if(!u||norm(u.owner||u.name)!==p.key) return;
      const s=t.start||t.date, e=t.date||t.start; if(s&&e&&s<=d&&e>=d) allDay.push(t); });
    // place: timed daily first, then everything else into the earliest gaps
    const ds=dayStartMin(), placed=[], occ=[];
    const fits=(a,b)=>!occ.some(o=>a<o.b-0.001&&b>o.a+0.001);
    blocks.filter(b=>b.kind==='daily'&&b.time!=null).forEach(b=>{ const a=(b.time-ds)/60, e=a+b.h; placed.push({...b,a,e}); occ.push({a,b:e}); });
    const rest2=blocks.filter(b=>!(b.kind==='daily'&&b.time!=null));
    rest2.forEach(b=>{
      let need=b.h, cur=0, guard=0;
      while(need>0.01&&guard++<200){
        occ.sort((x,y)=>x.a-y.a);
        const o=occ.find(z=>cur>=z.a-0.001&&cur<z.b-0.001); if(o){ cur=o.b; continue; }
        const next=occ.filter(z=>z.a>cur+0.001).sort((x,y)=>x.a-y.a)[0];
        const room=next?next.a-cur:Infinity, take=Math.min(need,room);
        placed.push({...b,a:cur,e:cur+take,part:take<b.h-0.01}); occ.push({a:cur,b:cur+take}); need-=take; cur+=take;
      }
    });
    // free gaps inside working hours
    const free=[]; if(cap>0){ occ.sort((x,y)=>x.a-y.a); let cur=0; occ.forEach(o=>{ if(o.a>cur+0.24&&cur<cap) free.push({a:cur,e:Math.min(o.a,cap)}); cur=Math.max(cur,o.b); }); if(cur<cap-0.24) free.push({a:cur,e:cap}); }
    const booked=(p.load[d]||0);
    return {d,off,cap,placed,free:free.filter(f=>f.e-f.a>=0.24),allDay,booked,freeH:Math.max(cap-booked,0),maxE:Math.max(cap,...placed.map(x=>x.e),0)};
  }
  RP.dayModel=dayModel;

  /* ---------- tab ---------- */
  RP.weekTab=function(M){
    const t0=M.t0;
    V.wkStart=V.wkStart||weekStart(t0);
    const people=Object.values(M.P).filter(p=>!p.exclude).sort((a,b)=>a.name.localeCompare(b.name));
    if(!V.wkPerson||!M.P[V.wkPerson]) V.wkPerson=myKey(M)||(people[0]&&people[0].key)||'';
    const p=M.P[V.wkPerson];
    const nDays=V.wkWeekend?7:5, days=[...Array(nDays)].map((_,i)=>addDays(V.wkStart,i));
    const wkLabel=`${new Date(days[0]+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${new Date(days[nDays-1]+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
    // team strip
    const strip=people.map(q=>{ const cells=days.map(d=>{ const m=dayModel(M,q,d); if(m.off) return `<td class="muted" title="${m.off}">—</td>`; const f=m.booked/(m.cap||1); const cls=m.booked<=0.01?'tc-free':f<=0.625?'tc-half':f<=1.1?'tc-busy':'tc-over'; return `<td class="c" onclick="RP.openWeek('${E(q.key)}')" title="${hh(m.booked)} of ${hh(m.cap)} booked · ${hh(m.freeH)} free"><span class="tc-chip ${cls}">${m.freeH>0.05?hh(m.freeH)+' free':m.booked>m.cap+0.05?'+'+hh(m.booked-m.cap):'Full'}</span></td>`; }).join('');
      const wf=days.reduce((n,d)=>n+dayModel(M,q,d).freeH,0);
      return `<tr class="${q.key===V.wkPerson?'sel':''}"><td><button class="tc-link" onclick="RP.openWeek('${E(q.key)}')"><b>${E(q.name)}</b></button></td>${cells}<td><b>${hh(wf)}</b></td></tr>`; }).join('');
    if(!p) return '<p class="muted">No people to show.</p>';
    const dms=days.map(d=>dayModel(M,p,d));
    const ds=dayStartMin(), dsH=ds/60, H=24*HPX;
    const can=canPlanFor(M,p.key);
    const h12=i=>i===0||i===24?'12 AM':i===12?'12 PM':i<12?i+' AM':(i-12)+' PM';
    const times=[...Array(24)].map((_,i)=>`<div style="top:${i*HPX}px">${h12(i)}</div>`).join('');
    const nowLine=d=>{ if(d!==t0) return ''; const n=new Date(), min=n.getHours()*60+n.getMinutes(); return `<div class="wp-now" style="top:${min/60*HPX}px"></div>`; };
    const clip=(top,ht)=>{ const t=Math.max(0,Math.min(top,H-14)); return [t,Math.max(Math.min(ht,H-t),14)]; };
    const col=m=>{
      const blk=m.placed.map(b=>{ let [top,ht]=clip((dsH+b.a)*HPX,(b.e-b.a)*HPX-2); const over=b.e>m.cap+0.01;
        const dim=V.wkProj && ((b.kind==='daily'?(b.x.daily.projectId||''):b.pid)!==V.wkProj) ? ' wp-dim' : '';
        if(b.kind==='daily'){ const t=b.x.daily, done=t.status==='Closed'; return `<div class="wp-b wp-dl ${done?'done':''} ${over?'wp-ov':''}${dim}" style="top:${top}px;height:${ht}px" onclick="twDUpdate('${E(t.id)}')" title="${E(t.title)}\n${toHHMM(ds+b.a*60)}–${toHHMM(ds+b.e*60)} · ${hh(b.h)}${done?' · Closed':''} — click to update">${done?'✓ ':''}<b>${E(t.title||'Daily task')}</b>${ht>30?`<br>${toHHMM(ds+b.a*60)}–${toHHMM(ds+b.e*60)} · ${hh(b.e-b.a)}`:''}</div>`; }
        const lbl=b.overdue?'Overdue work':projName(b.pid);
        return `<div class="wp-b ${b.overdue||over?'wp-ov':'wp-tm'}${dim}" style="top:${top}px;height:${ht}px" onclick="${b.pid?`twGo('tasks');try{selectTaskProject('${E(b.pid)}')}catch(e){}`:''}" title="${E(lbl)} · ${hh(b.e-b.a)}${b.part?' (part)':''}\n${E(b.names.join('\n'))}"><b>${E(lbl)}</b>${ht>30?`<br>${hh(b.e-b.a)} · ${E(b.names[0]||'')}${b.names.length>1?' +'+(b.names.length-1):''}`:''}</div>`; }).join('');
      const fr=m.free.map(f=>{ const [top,ht]=clip((dsH+f.a)*HPX,(f.e-f.a)*HPX-2); return can?`<div class="wp-b wp-free" style="top:${top}px;height:${ht}px" onclick="RP.planTask('${m.d}','${toHHMM(ds+f.a*60)}',${r1(f.e-f.a)})" title="Free ${hh(f.e-f.a)} — click to plan a daily task">+ Plan · ${hh(f.e-f.a)} free</div>`:`<div class="wp-b wp-free" style="top:${top}px;height:${ht}px;cursor:default">${hh(f.e-f.a)} free</div>`; }).join('');
      const work=m.cap>0?`<div class="wp-work" style="top:${dsH*HPX}px;height:${Math.min(m.cap,24-dsH)*HPX}px"></div><div class="wp-cap" style="top:${Math.min(dsH+m.cap,24)*HPX}px" title="End of working day"></div>`:'';
      return `<div class="wp-day ${m.off?'off':''}${m.off==='Leave'?' leave':''}" style="height:${H}px">${work}${m.off==='Leave'?`<div class="wp-leave" style="top:${dsH*HPX+4}px">On leave</div>`:m.off?`<div class="muted" style="position:absolute;top:${dsH*HPX+4}px;left:8px;font-size:12px">${m.off}</div>`:''}${blk}${fr}${nowLine(m.d)}</div>`;
    };
    const cols=`64px repeat(${nDays},minmax(120px,1fr))`;
    setTimeout(()=>{ const sc=document.getElementById('wpScroll'); if(sc&&!sc.dataset.set){ sc.scrollTop=Math.max(0,(dsH-1)*HPX); sc.dataset.set='1'; } },0);
    return `<div class="wp-head"><div class="tc-seg"><button onclick="RP.wkMove(-7)">‹</button><button onclick="RP.wkMove(0)">This week</button><button onclick="RP.wkMove(7)">›</button></div><span class="wk">${wkLabel}</span>
        <label style="font-size:12px;color:var(--sb-mut,#71717a)">Person <select onchange="RP.view.wkPerson=this.value;RP.render()">${people.map(q=>`<option value="${E(q.key)}" ${q.key===V.wkPerson?'selected':''}>${E(q.name)}</option>`).join('')}</select></label>
        <label style="font-size:12px;color:var(--sb-mut,#71717a)">Project <select onchange="RP.view.wkProj=this.value;RP.render()"><option value="">All projects</option>${(db.projects||[]).filter(x=>String(x.code||'').trim()).map(x=>`<option value="${E(x.id)}" ${V.wkProj===x.id?'selected':''}>${E(x.code+' — '+(x.name||''))}</option>`).join('')}</select></label>
        <label style="font-size:12px;display:flex;gap:5px;align-items:center"><input type="checkbox" style="width:auto" ${V.wkWeekend?'checked':''} onchange="RP.view.wkWeekend=this.checked;RP.render()"> Show weekend</label>
        ${can?`<button class="primary" style="margin-left:auto" onclick="RP.planTask('${days.find(d=>d>=t0&&!dayModel(M,p,d).off)||days[0]}')">+ Plan task</button>`:''}</div>
      <div class="wp-legend"><span><i style="background:#6366f126;border-color:#6366f1"></i>Task Management (hours entered)</span><span><i style="background:#0ea5e926;border-color:#0ea5e9"></i>Daily task with hours</span><span><i style="background:#1f9d6114;border-color:#1f9d61"></i>Free — click to plan</span><span><i style="background:#e5484d33;border-color:#e5484d"></i>Over the working day / overdue</span></div>
      <div class="wp-cal head" style="grid-template-columns:${cols}">
        <div class="wp-hcell" style="border-left:0"><span class="pn">${E(p.name)}</span><br><small>${hh(p.daily)}/day</small></div>
        ${dms.map(m=>`<div class="wp-hcell ${m.d===t0?'today':''}"><small>${DN[(new Date(m.d+'T12:00:00').getDay()+6)%7]}</small><b>${m.d.slice(8)}</b><small>${m.off?m.off:`${hh(m.booked)} booked · ${hh(m.freeH)} free`}</small>${m.booked>24?`<br><span class="ob" title="More hours booked than a day has — check the planned hours / dates of these tasks">Overbooked: ${hh(m.booked)}</span>`:''}</div>`).join('')}
        <div class="wp-allday" style="border-left:0;font-size:11px;color:var(--sb-mut,#71717a)">No hours</div>
        ${dms.map(m=>`<div class="wp-allday">${m.allDay.map(t=>`<span onclick="twDUpdate('${E(t.id)}')" title="${E(t.title)} — daily task without hours (does not book time); click to update or give it hours">${t.status==='Closed'?'✓ ':''}${E(t.title)}</span>`).join('')}</div>`).join('')}
      </div>
      <div class="wp-scroll" id="wpScroll"><div class="wp-cal body" style="grid-template-columns:${cols}"><div class="wp-times" style="height:${H}px">${times}</div>${dms.map(col).join('')}</div></div>
      ${V.wkProj?`<p class="tc-note">Showing <b>${E(projName(V.wkProj))}</b> in colour; other work is faded but still counts, so free time stays correct.</p>`:''}
      <p class="tc-note">Only tasks with hours entered book the calendar: Task Management subtasks with Estimated Hours (placed from ${toHHMM(ds)}, the start of the working day) and daily tasks with "Hours per day". Tasks with dates but no hours are not booked. Click a green slot to plan a daily task in free time.</p>`;
  };
  RP.wkMove=function(n){ V.wkStart = n===0 ? weekStart(todayIso()) : addDays(V.wkStart||weekStart(todayIso()),n); RP.render(); };

  /* ---------- Daily Task windows get "Hours per day" + "Start time" (optional); the planner reuses them ---------- */
  let PLAN=null;   // context when opened from the Week Planner: {date,time,gap,personId,selfOnly}
  function lastModal(){ const l=document.querySelectorAll('.tw-modal'); return l[l.length-1]||null; }
  function planFields(h,time,required){
    return `<div class="tw-2" id="wpPlanRow"><div class="tw-f"><label for="wpH">Hours per day${required?'':' (optional — books the calendar)'}</label><input id="wpH" type="number" min="0.25" max="24" step="0.25" value="${E(h??'')}" placeholder="e.g. 1"></div><div class="tw-f"><label for="wpTm">Start time</label><input id="wpTm" type="time" value="${E(time||'')}"></div></div><div id="wpWarn" class="muted" style="font-size:12.5px"></div>`;
  }
  function overloadCheck(personId,from,to,h,selfTask){
    const M=RP.build({}), u=db.users[personId]; if(!u) return [];
    const per=M.P[norm(u.owner||u.name)]; if(!per) return [];
    return RP.workDays(from,to).filter(d=>!per.leave.has(d)).map(d=>{ const own=selfTask&&Number(selfTask.planHours)>0&&(selfTask.start||selfTask.date)<=d&&(selfTask.date||selfTask.start)>=d?Number(selfTask.planHours):0; return {d,free:per.daily-((per.load[d]||0)-own)}; }).filter(x=>x.free+0.01<h);
  }
  function readPlan(m,required){
    const hv=m.querySelector('#wpH')?.value.trim(), tv=m.querySelector('#wpTm')?.value.trim();
    if(!hv&&!tv&&!required) return {ok:true,h:0,time:''};
    const h=Number(hv); if(!(h>0&&h<=24)) return {err:'Enter hours per day between 0.25 and 24'+(required?'.':' (or leave both plan fields empty).')};
    if(toMin(tv)==null) return {err:'Choose a start time for the planned hours.'};
    return {ok:true,h,time:tv};
  }
  function afterSave(){ RP.invalidate(); try{ if(TW.tab==='capacity') RP.render(); }catch(e){} }
  // New daily task
  const newDaily0=window.twNewDaily;
  if(typeof newDaily0==='function') window.twNewDaily=function(){
    const ctx=PLAN; PLAN=null;
    const before=new Set((db.daily||[]).map(t=>t.id));
    const r=newDaily0.apply(this,arguments);
    const m=lastModal(); if(!m||!m.querySelector('#twDt')) return r;
    const dates=m.querySelector('#twDs')?.closest('.tw-2'); if(dates) dates.insertAdjacentHTML('afterend',planFields(ctx?Math.min(1,ctx.gap||1):'',ctx?ctx.time:'',!!ctx));
    if(ctx){
      const h3=m.querySelector('h3'); if(h3) h3.textContent='Assign Daily Task — plan in free time';
      ['#twDs','#twDd'].forEach(sel=>{ const el=m.querySelector(sel); if(el) el.value=ctx.date; });
      const a=m.querySelector('#twDa'); if(a&&ctx.personId){ if(ctx.selfOnly) [...a.options].forEach(o=>{ if(o.value!==ctx.personId) o.remove(); }); if([...a.options].some(o=>o.value===ctx.personId)) a.value=ctx.personId; }
      if(ctx.gap) m.querySelector('#wpWarn').innerHTML=`${E(twName(ctx.personId))} has <b>${hh(ctx.gap)}</b> free on ${fd(ctx.date)} from ${E(ctx.time)}.`;
    }
    const form=m.querySelector('form'), orig=form.onsubmit;
    form.onsubmit=function(e){
      e.preventDefault();
      const pl=readPlan(m,!!ctx), err=m.querySelector('[data-err]');
      if(pl.err){ err.textContent=pl.err; return; }
      if(pl.h>0 && !form.dataset.ok){
        const a=m.querySelector('#twDa').value, s0=m.querySelector('#twDs').value, d0=m.querySelector('#twDd').value||s0;
        const over=s0?overloadCheck(a,s0,d0,pl.h,null):[];
        if(over.length){ form.dataset.ok='1'; m.querySelector('#wpWarn').innerHTML=`<b style="color:#e5484d">Not enough free time on ${over.length} day(s):</b> ${over.slice(0,5).map(x=>fd(x.d)+' ('+hh(Math.max(x.free,0))+' free)').join(', ')}${over.length>5?'…':''}. Press <b>Assign</b> again to plan it anyway.`; return; }
      }
      orig.call(form,e);
      if(!document.body.contains(m)){
        const t=(db.daily||[]).find(x=>!before.has(x.id));
        if(t && pl.h>0){ t.planHours=pl.h; t.planTime=pl.time; if(ctx) t.source=t.source||'Week Planner'; save(false); }
        afterSave();
      }
    };
    return r;
  };
  // Update daily task: same window, plus the plan fields
  const upd0=window.twDUpdate;
  if(typeof upd0==='function') window.twDUpdate=function(id){
    const r=upd0.apply(this,arguments);
    const t=(db.daily||[]).find(x=>x.id===id), m=lastModal(); if(!t||!m||!m.querySelector('#twUs')) return r;
    const anchor=m.querySelector('#twUr')?.closest('.tw-f'); if(anchor) anchor.insertAdjacentHTML('beforebegin',planFields(t.planHours||'',t.planTime||'',false)+`<p class="muted" style="margin:0 0 6px;font-size:12px">Dates: ${fd(t.start)} – ${fd(t.date)}${t.planHours?` · booked ${hh(t.planHours)} per working day`:' · no hours (not booked in the calendar)'}</p>`);
    const form=m.querySelector('form'), orig=form.onsubmit;
    form.onsubmit=function(e){
      e.preventDefault();
      const pl=readPlan(m,false), err=m.querySelector('[data-err]');
      if(pl.err){ err.textContent=pl.err; return; }
      if(pl.h>0 && pl.h>(Number(t.planHours)||0) && !form.dataset.ok){
        const over=overloadCheck(t.assigneeId,t.start||t.date,t.date||t.start,pl.h,t);
        if(over.length){ form.dataset.ok='1'; m.querySelector('#wpWarn').innerHTML=`<b style="color:#e5484d">Not enough free time on ${over.length} day(s):</b> ${over.slice(0,5).map(x=>fd(x.d)+' ('+hh(Math.max(x.free,0))+' free)').join(', ')}. Press <b>Save</b> again to keep it anyway.`; return; }
      }
      const prevH=t.planHours, prevT=t.planTime;
      t.planHours=pl.h||undefined; t.planTime=pl.h?pl.time:undefined;
      orig.call(form,e);
      if(document.body.contains(m)){ t.planHours=prevH; t.planTime=prevT; } else afterSave();
    };
    return r;
  };
  // Planner entry point: open the normal Daily Task window for the selected person/slot
  RP.planTask=function(date,time,gap){
    const M=RP.build({}), p=M.P[V.wkPerson]; if(!p) return toast('Choose a person first.');
    const can=(typeof edptCan==='function'&&edptCan('Daily Tasks','Add'))||(window.edptIsSharedLogin&&edptIsSharedLogin(TW.me)), self=V.wkPerson===myKey(M);
    if(!can && !self && !isAdmin()) return toast('You can plan tasks in your own calendar. Planning for others needs Daily Tasks Add access.');
    PLAN={date:date||todayIso(), time:time||toHHMM(dayStartMin()), gap:Number(gap)||0, personId:p.id, selfOnly:!can&&!isAdmin()};
    if(can||isAdmin()) return window.twNewDaily();
    // own calendar without Daily Tasks Add: allow this one window for yourself only
    acTemp(()=>window.twNewDaily());
  };
  function acTemp(fn){
    const ac=db.accessControl; if(!ac) return fn();
    ac.users ||= {}; const had=Object.prototype.hasOwnProperty.call(ac.users,TW.me), prev=had?JSON.parse(JSON.stringify(ac.users[TW.me])):null;
    ac.users[TW.me]={...(prev||{}),'Daily Tasks':['View','Add']};
    try{ fn(); } finally { if(had) ac.users[TW.me]=prev; else delete ac.users[TW.me]; }
  }
})();
