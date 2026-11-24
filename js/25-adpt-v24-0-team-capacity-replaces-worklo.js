/* ===== ADPT v24.0 — Team Capacity (replaces Workload + Resource Planning in the menu) =====
   Day-based view: each working day is Free, ½ day, Busy or Overloaded.
   Uses the same calculation engine (RP.build) as v23.0; tasks keep their hours underneath. */
(function(){
  'use strict';
  const RP=window.RP; if(!RP) return;
  const U=RP.util, {norm,addDays,todayIso,monthKey,monthStart,monthEnd,addMonths,monthLabel,weekStart,fd,E}=U;
  const half=n=>Math.round((Number(n)||0)*2)/2;
  const dfmt=n=>{ const v=half(n); return (v%1? v.toFixed(1):String(v))+(v===1?' day':' days'); };
  const dnum=n=>{ const v=half(n); return v%1? v.toFixed(1):String(v); };
  const isAdmin=()=>typeof twAdmin==='function'&&twAdmin();
  RP.view = RP.view || {tab:'today', search:'', dept:'', proj:'', cal:'days', range:'week', from:'', to:'', months:6, checkSel:''};
  const V=RP.view;
  try{ V.unit = V.unit || localStorage.getItem('edptTcUnit') || 'days'; }catch(e){ V.unit = V.unit || 'days'; }
  const H=()=>V.unit==='hours';
  const hfmt=n=>Math.round(Number(n)||0).toLocaleString('en-GB')+' h';
  const hnum=n=>{ const v=Math.round((Number(n)||0)*10)/10; return v%1? v.toFixed(1):String(v); };
  // amount in the chosen unit: d = days value, h = hours value
  const amt=(d,h)=>H()?hfmt(h):dfmt(d);
  const anum=(d,h)=>H()?hnum(h):dnum(d);
  RP.setUnit=function(u){ V.unit=u; try{ localStorage.setItem('edptTcUnit',u); }catch(e){} RP.render(); };

  /* v35.29: the project check worked out with its own numbers */
  function checkExample(r){
    const hrs=r.unit==='hours', u=hrs?'h':'days', n=v=>r1(v);
    const per=r.wdAll?r.need/r.wdAll:0, needD=hrs?r.need/8:r.need;
    const lines=r.rows.map(x=>{ const sh=Math.max(x.req-x.free,0), cap1=hrs?x.wd*8:x.wd;
      return `<li><b>${monthLabel(x.mk)}:</b> ${x.wd} working days × ${n(per)} ${u} = <b>${n(x.req)} ${u} needed</b> · team free ${n(x.free)} ${u} · ${sh>0.05?`short = ${n(x.req)} − ${n(x.free)} = <b>${n(sh)} ${u}</b>`:`${n(x.req)} needed ≤ ${n(x.free)} free → short <b>0</b> (it fits)`}${sh>0.05?` · extra engineers = ${n(sh)} ÷ ${n(cap1)} ${u} (one person for the month) = ${n(sh/cap1)} → <b>${x.ex}</b>`:''}</li>`; }).join('');
    return `<div style="margin-top:6px"><b>This check worked out with its own numbers</b><ul>
      <li>Work needed <b>${n(r.need)} ${u}</b> ÷ <b>${r.wdAll}</b> working days in the period = <b>${n(per)} ${u}</b> of work per working day.</li>${lines}
      <li><b>People full-time</b> = ${n(needD)} days ÷ ${r.wdAll} working days = <b>${n(r.fte)} people</b>.</li></ul></div>`;
  }
  /* v35.27: the calculation behind each number, shown on hover */
  const r1=v=>Math.round((Number(v)||0)*10)/10;
  function calcTip(k,r){ const capH=r1(r.capH), bookH=r1(r.bookH), freeH=r1(r.freeH), wd=r1((r.capH||0)/8);
    if(k==='cap') return `${wd} working days × 8 h = ${capH} h = ${r1(r.capD)} days (weekends, holidays and leave not counted)`;
    if(k==='book') return `${r1(r.bookD)} days = each working day with work counts 1 (more than 5 h) or ½ (up to 5 h) · in hours: ${bookH} h of tasks planned in these dates`;
    if(k==='free') return `${r1(r.capD)} working days − ${r1(r.bookD)} booked days = ${r1(r.freeD)} days · in hours: 8 h minus the hours booked on each day = ${freeH} h`;
    if(k==='util') return `Booked ${bookH} h ÷ Capacity ${capH} h = ${Math.round(r.util||0)}%`;
    if(k==='pend') return `${r1(r.pendH)} h of unfinished work (any date) ÷ 8 h = ${r1(r.pendD)} days`;
    return ''; }
  /* ---------- day states ---------- */
  function dayInfo(M,per,d){
    const wd=(()=>{ const g=new Date(d+'T12:00:00').getDay(); return g>0&&g<6; })();
    if(!wd) return {s:'off',label:'',cls:'tc-off'};
    if(M.hol.has(d)) return {s:'hol',label:'Hol',cls:'tc-off',t:'Holiday'};
    if(per.leave.has(d)){ const lv=((db.capacity&&db.capacity.leaves)||[]).find(l=>!l.cancelled&&(l.person===per.id||l.key===per.key)&&l.a<=d&&(l.b||l.a)>=d); return {s:'leave',label:'Leave',cls:'tc-leave',t:'Leave'+(lv&&lv.reason?' · '+lv.reason:'')}; }
    const f=(per.load[d]||0)/(per.daily||8);
    if(f<=0.001) return {s:'free',label:'Free',cls:'tc-free',free:1,busy:0};
    if(f<=0.625) return {s:'half',label:'½',cls:'tc-half',free:0.5,busy:0.5};
    if(f<=1.0001) return {s:'busy',label:'Busy',cls:'tc-full',free:0,busy:1};
    return {s:'over',label:'Over 8 h',cls:'tc-over',free:0,busy:1};
  }
  function sumDays(M,per,a,b){
    let free=0,busy=0,work=0,over=0;
    for(let d=a,g=0; d<=b && g++<800; d=addDays(d,1)){ const x=dayInfo(M,per,d); if(x.free===undefined) continue; work++; free+=x.free; busy+=x.busy; if(x.s==='over') over++; }
    return {free,busy,work,over};
  }
  RP.dayInfo=dayInfo; RP.sumDays=sumDays;
  const projCodes=(per,a,b)=>[...RP.projectsIn(per,a,b)].map(id=>{if(id==='daily')return 'Daily tasks';const p=(db.projects||[]).find(x=>x.id===id);return p?(p.code||p.name):'Unplanned';});

  /* ---------- styles ---------- */
  const css=`
  #capacity .tc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
  #capacity .tc-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:14px 0}
  #capacity .tc-tile{background:var(--sb-panel,#fff);border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;padding:12px 14px}
  #capacity .tc-tile span{font-size:12px;color:var(--sb-mut,#71717a)} #capacity .tc-tile b{display:block;font-size:24px;font-weight:600;margin-top:2px}
  #capacity .tc-tile small{font-size:11.5px;color:var(--sb-mut,#71717a)}
  #capacity .tc-tabs{display:flex;gap:4px;border-bottom:1px solid var(--sb-line,#e4e4e7);margin-bottom:12px}
  #capacity .tc-tabs button{border:0;background:none;border-radius:0;border-bottom:2px solid transparent;padding:9px 14px;font-size:14px;color:var(--sb-mut,#71717a)}
  #capacity .tc-tabs button.on{border-bottom-color:var(--tw-green,#1f9d61);color:var(--sb-fg,#18181b);font-weight:600}
  #capacity .tc-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px}
  #capacity .tc-bar label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--sb-mut,#71717a)}
  #capacity .tc-seg{display:inline-flex;border:1px solid var(--sb-line,#e4e4e7);border-radius:7px;overflow:hidden}
  #capacity .tc-seg button{border:0;border-radius:0;padding:6px 11px;background:none;font-size:13px}
  #capacity .tc-seg button.on{background:var(--tw-green,#1f9d61);color:#fff}
  #capacity .tc-head .tc-seg{align-self:center}
  #workload > .panel:not(#ulPanel){display:none!important}
  #tcBack{margin:0 0 12px}
  #capacity .tc-wrap{overflow:auto;max-height:68vh;border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;background:var(--sb-panel,#fff)}
  #capacity table.tc-t,.tw-modal table.tc-t{width:100%;border-collapse:collapse;font-size:13px;min-width:0!important}
  #capacity table.tc-t th,#capacity table.tc-t td,.tw-modal table.tc-t th,.tw-modal table.tc-t td{padding:8px 9px;border-bottom:1px solid var(--sb-line,#e4e4e7);text-align:left;white-space:nowrap}
  #capacity table.tc-t th{font-size:12px;font-weight:600;color:var(--sb-mut,#71717a);position:sticky;top:0;background:var(--sb-panel,#fff);z-index:2}
  #capacity table.tc-t .n,.tw-modal table.tc-t .n{text-align:right}
  #capacity table.tc-cal td.c,.tw-modal table.tc-cal td.c{text-align:center;font-size:11.5px;font-weight:600;padding:7px 4px;min-width:46px;border-left:2px solid var(--sb-panel,#fff)}
  #capacity table.tc-cal td.nm,#capacity table.tc-cal th.nm{position:sticky;left:0;background:var(--sb-panel,#fff);z-index:1}
  #capacity table.tc-cal th.nm{z-index:3}
  #capacity table.tc-cal th.d{text-align:center;font-size:11px;padding:6px 3px;line-height:1.2}
  #capacity table.tc-cal th.today{color:var(--tw-green,#1f9d61)}
  .tc-chip{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600}
  .tc-free{background:#1f9d6129;color:#137a49} .tc-half{background:#e8b40033;color:#8a6a00} .tc-busy{background:#e5484d30;color:#b4232a} .tc-over{background:#e5484d;color:#fff;font-weight:600} .tc-how{margin:10px 0 0;padding:10px 12px;border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;font-size:12.5px;line-height:1.5} .tc-how ul{margin:4px 0 6px 18px;padding:0} .tc-how li{margin:1px 0} .tc-full{background:#2563eb26;color:#1d4ed8} html[data-theme=dark] .tc-full{color:#8fb4ff} .tc-namered,.tc-namered b{color:#e5484d!important} .tc-off{background:#71717a14;color:#a1a1aa} .tc-leave{background:repeating-linear-gradient(135deg,#7c3aed22 0 6px,#7c3aed12 6px 12px);color:#6d28d9;font-weight:600}
  html[data-theme=dark] .tc-free{color:#4fd08f} html[data-theme=dark] .tc-half{color:#e8cc3a} html[data-theme=dark] .tc-busy{color:#ff8a8f} html[data-theme=dark] .tc-off{color:#71717a} html[data-theme=dark] .tc-leave{color:#c4b5fd}
  #capacity .tc-legend{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px}
  #capacity .tc-note{font-size:12px;color:var(--sb-mut,#71717a);margin:8px 0}
  #capacity .tc-link{background:none;border:0;padding:0;font-family:inherit;font-size:14px;font-weight:700;color:inherit;text-decoration:none;cursor:pointer;text-align:left}
  #capacity .tc-link:hover{text-decoration:underline}
  #capacity .tc-link b{font-weight:700}
  #capacity .tc-card{background:var(--sb-panel,#fff);border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;padding:14px 16px;margin-bottom:12px}
  #capacity .tc-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;align-items:end}
  #capacity .tc-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--sb-mut,#71717a)}
  #capacity .tc-answer{border-radius:8px;padding:14px 16px;font-size:15px;font-weight:600;margin:12px 0 10px}
  #capacity .tc-answer small{display:block;font-weight:400;font-size:13px;margin-top:4px;opacity:.9}
  #capacity .tc-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  /* ---------- menu: Team Capacity replaces Workload + Resource Planning ---------- */
  try{
    if(typeof SB_GROUPS!=='undefined'&&Array.isArray(SB_GROUPS)) SB_GROUPS.forEach(g=>{ const i=g.indexOf('workload'); if(i>=0) g.splice(i,1); });
  }catch(e){}
  const navPrev=window.twNav;
  window.twNav=function(){
    let n=(typeof navPrev==='function'?navPrev.apply(this,arguments):[]).filter(x=>x[0]!=='workload'&&x[0]!=='capacity');
    if(RP.can('View')){ const i=n.findIndex(x=>x[0]==='tasks'); n.splice(i>=0?i+1:n.length,0,['capacity','Team Capacity']); }
    return n;
  };
  const swPrev=window.switchTab;
  window.switchTab=function(name){
    if(name==='workload' && !RP.can('View')) name='dashboard';
    const r=swPrev.apply(this,[name,...Array.prototype.slice.call(arguments,1)]);
    if(name==='workload'){
      addBackLink();
      try{ if(typeof ulLogRender==='function') ulLogRender(); }catch(e){ console.error(e); }
      setTimeout(()=>{ document.querySelectorAll('#sbPage b, .sb-crumb.static:last-of-type b').forEach(b=>b.textContent='Unplanned Tasks'); },0);
    }
    return r;
  };
  function addBackLink(){
    const log=document.getElementById('ulPanel'); if(!log||document.getElementById('tcBack')) return;
    const b=document.createElement('div'); b.id='tcBack';
    b.innerHTML='<button class="small" onclick="twGo(\'capacity\')">← Back to Team Capacity</button>';
    log.parentNode.insertBefore(b,log);
  }

  /* ---------- main render (replaces the v23 Resource Planning render) ---------- */
  RP.render=function(){
    const root=document.getElementById('rpRoot'); if(!root) return;
    if(!RP.can('View')){ root.innerHTML='<div class="panel"><h2>Team Capacity</h2><p class="muted">You do not have access. Contact the ADPT Admin.</p></div>'; return; }
    let M; try{ M=RP.build({proj:V.proj}); }catch(e){ console.error('Team Capacity',e); root.innerHTML='<div class="panel"><h2>Team Capacity</h2><p>Could not calculate: '+E(e.message)+'</p></div>'; return; }
    const ppl=peopleList(M);
    root.innerHTML=`<div class="panel">
      <div class="tc-head"><div><h2 style="margin:0">Team Capacity</h2><span class="muted">Who is busy, who is free, and whether a new project fits — in ${H()?'hours':'working days'}, from the live task schedule.</span></div>
      <div class="actions"><div class="tc-seg" title="Show planning in days or hours"><button class="${!H()?'on':''}" onclick="RP.setUnit('days')">Days</button><button class="${H()?'on':''}" onclick="RP.setUnit('hours')">Hours</button></div><button onclick="RP.exportAll()">Export Excel</button>${RP.canEdit()?'<button onclick="RP.openSettings()">⚙ Settings</button>':''}</div></div>
      ${tiles(M,ppl)}
      <div class="tc-tabs">${[['today','Today'],['calendar','Calendar'],['check','New Project Check']].map(([k,l])=>`<button class="${V.tab===k?'on':''}" onclick="RP.vset('tab','${k}')">${l}</button>`).join('')}</div>
      ${V.tab==='check'?checkTab(M):V.tab==='calendar'&&V.cal==='week'?calendarTab(M,ppl):filterBar(M)+(V.tab==='calendar'?calendarTab(M,ppl):todayTab(M,ppl))}
    </div>`;
  };
  RP.vset=function(k,v){ V[k]=v; RP.render(); };

  function peopleList(M){
    let l=Object.values(M.P).filter(p=>!p.exclude);
    if(V.search) l=l.filter(p=>norm(p.name).includes(norm(V.search)));
    if(V.dept) l=l.filter(p=>norm(p.dept)===norm(V.dept));
    if(V.proj) l=l.filter(p=>p.items.length);
    return l.sort((a,b)=>a.name.localeCompare(b.name));
  }

  /* ---------- summary: period chips + team boxes + people-wise block ---------- */
  function sumPeriod(){
    const t=todayIso(), mk=monthKey(t), k=V.sumP||'today';
    if(k==='today') return {a:t,b:t,label:'Today'};
    if(k==='month') return {a:monthStart(mk),b:monthEnd(mk),label:monthLabel(mk)};
    if(k==='next'){ const m=addMonths(mk,1); return {a:monthStart(m),b:monthEnd(m),label:monthLabel(m)}; }
    if(k==='quarter'){ const y=Number(t.slice(0,4)), q=Math.floor((Number(t.slice(5,7))-1)/3); const m0=`${y}-${String(q*3+1).padStart(2,'0')}`; return {a:monthStart(m0),b:monthEnd(addMonths(m0,2)),label:`Q${q+1} ${y}`}; }
    const a=V.sumFrom||t, b=V.sumTo&&V.sumTo>=a?V.sumTo:a; return {a,b,label:`${fd(a)} – ${fd(b)}`};
  }
  RP.sumPeriod=sumPeriod;
  function noHoursCount(p){
    let n=0; const keys=new Set([p.key,norm(p.name)]);
    (db.projects||[]).forEach(pr=>(pr.tasks||[]).forEach(t=>{ const subs=(t.subs||[]).filter(x=>String(x.name||'').trim()); (subs.length?subs:[t]).forEach(x=>{
      if(['Completed','Cancelled'].includes(x.status)) return; if(Number(x.plannedHours||x.estimatedHours||0)>0) return;
      const o=norm(x.owner||(subs.length?t.owner:'')); if(o&&keys.has(o)) n++; }); }));
    return n;
  }
  function personStats(M,p,R){
    const capH=RP.capacityIn(M,p,R.a,R.b), bookH=RP.bookedIn(p,R.a,R.b), freeH=RP.freeIn(M,p,R.a,R.b), sd=sumDays(M,p,R.a,R.b), d=p.daily||8;
    return {p,capH,bookH,freeH,capD:sd.work,bookD:sd.busy,freeD:sd.free,overDays:sd.over,util:capH?bookH/capH*100:0,pendH:p.pending,pendD:p.pending/d,noHours:noHoursCount(p)};
  }
  function tiles(M,ppl){
    const R=sumPeriod(), all=Object.values(M.P).filter(p=>!p.exclude);
    const rows=all.map(p=>personStats(M,p,R));
    const sum=k=>rows.reduce((n,r)=>n+r[k],0);
    const busy=rows.filter(r=>r.bookH>0.05).length, full=rows.filter(r=>r.capH>0&&r.util>=90).length;
    const over=rows.filter(r=>r.overDays>0).length, halfFree=rows.filter(r=>r.capH>0&&r.freeH>=r.capH/2).length;
    const noH=sum('noHours');
    const A=(dv,hv)=>H()?hfmt(hv):dfmt(dv);
    const seg=(v,l)=>`<button class="${(V.sumP||'today')===v?'on':''}" onclick="RP.vset('sumP','${v}')">${l}</button>`;
    const tile=(l,v,sub,go)=>`<div class="tc-tile" ${go?`style="cursor:pointer" onclick="${go}"`:''}><span>${l}</span><b>${v}</b><small>${sub}</small></div>`;
    const single=R.a===R.b;
    const head=`<div class="tc-bar" style="margin:14px 0 0"><div class="tc-seg">${seg('today','Today')}${seg('month','This month')}${seg('next','Next month')}${seg('quarter','This quarter')}${seg('custom','Custom')}</div>
      ${(V.sumP==='custom')?`<label>From<input type="date" value="${E(V.sumFrom||todayIso())}" onchange="RP.vset('sumFrom',this.value)"></label><label>To<input type="date" value="${E(V.sumTo||V.sumFrom||todayIso())}" onchange="RP.vset('sumTo',this.value)"></label>`:''}
      <span class="muted" style="font-size:12.5px">${E(R.label)}${single?'':` · ${fd(R.a)} – ${fd(R.b)}`}</span></div>`;
    const boxes=`<div class="tc-tiles">
      ${tile(single?'Busy today':'Busy in this period',`${busy} of ${all.length}`,`${full} fully booked · ${all.length-busy} with nothing booked`)}
      ${tile('Booked work',A(sum('bookD'),sum('bookH')),`of ${A(sum('capD'),sum('capH'))} team capacity (${sum('capH')?Math.round(sum('bookH')/sum('capH')*100):0}%)`)}
      ${tile('Free time',A(sum('freeD'),sum('freeH')),`${halfFree} people at least half free`)}
      ${tile('Overloaded',over,over?'people booked over a full day on some day':'nobody over a full day')}
      ${tile('Tasks without hours',noH,noH?'open tasks not counted — enter Estimated Hours':'every open task has hours','RP.vset(\'pwOpen\',true)')}
    </div>`;
    rows.sort((a,b)=>b.util-a.util||a.p.name.localeCompare(b.p.name));
    const bar=r=>{ const w=Math.min(r.util,100), c=r.util>100.5?'#7f1d1d':r.util>=90?'#e5484d':r.util>=70?'#e8b400':'#1f9d61';   /* v35.28: 100% = full bar; over 100% = full dark-red bar */ return `<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:90px;height:8px;border-radius:4px;background:var(--sb-line,#e4e4e7);overflow:hidden"><div style="width:${w}%;height:100%;background:${c}"></div></div><span style="min-width:40px;text-align:right">${Math.round(r.util)}%</span></div>`; };
    const open=V.pwOpen!==false;
    const people=`<details class="tc-card" style="padding:10px 14px" ${open?'open':''} ontoggle="RP.view.pwOpen=this.open"><summary style="cursor:pointer;font-weight:600">People-wise · ${E(R.label)} (${rows.length})</summary>
      <div style="overflow:auto;margin-top:8px"><table class="tc-t"><thead><tr><th>Person</th><th>${single?'Today':'Status'}</th><th class="n" title="Working days in the period (no weekends, holidays or leave) × 8 h">Capacity</th><th class="n" title="Hours of tasks planned inside the period, ÷ 8 h">Booked</th><th class="n" title="Capacity − Booked">Free</th><th style="min-width:150px" title="Booked ÷ Capacity">Utilization</th><th class="n" title="Days in the period with more than 8 h booked">Overloaded days</th><th class="n" title="All unfinished task hours of the person, any date, ÷ 8 h">Pending (all open)</th><th title="First working day with nothing booked">Free from</th><th class="n" title="Open tasks with dates but no Estimated Hours — not counted">Tasks without hours</th></tr></thead><tbody>
      ${rows.map(r=>{ const st=single?dayInfo(M,r.p,R.a):null; const chip=single?`<span class="tc-chip ${st.cls}">${st.s==='half'?'½ day':st.s==='off'?'Weekend':st.label}</span>`:(r.capH<=0?'<span class="tc-chip tc-off">Leave</span>':r.util>110?'<span class="tc-chip tc-over">Overloaded</span>':r.util>=90?'<span class="tc-chip tc-busy">Full</span>':r.bookH>0.05?'<span class="tc-chip tc-half">Partly free</span>':'<span class="tc-chip tc-free">Free</span>');
        return `<tr><td><button class="tc-link ${r.overDays>0?'tc-namered':''}" ${r.overDays>0?`title="Booked over 8 h on ${r.overDays} day${r.overDays===1?'':'s'}"`:''} onclick="RP.personDays('${E(r.p.key)}')"><b>${E(r.p.name)}</b></button></td><td>${chip}</td><td class="n" title="${E(calcTip('cap',r))}">${A(r.capD,r.capH)}</td><td class="n" title="${E(calcTip('book',r))}">${A(r.bookD,r.bookH)}</td><td class="n" title="${E(calcTip('free',r))}">${A(r.freeD,r.freeH)}</td><td title="${E(calcTip('util',r))}">${bar(r)}</td><td class="n" title="Days with more than 8 h booked">${r.overDays||'—'}</td><td class="n" title="${E(calcTip('pend',r))}">${r.pendH>0.05?A(r.pendD,r.pendH):'—'}</td><td>${r.p.fullyFree<=M.t0?'Now':r.p.fullyFree>M.horizonEnd?'After '+fd(M.horizonEnd):fd(r.p.fullyFree)}</td><td class="n">${r.noHours?`<span class="tc-chip tc-half" title="Open tasks with dates but no Estimated Hours — they do not book time">${r.noHours}</span>`:'—'}</td></tr>`; }).join('')}
      </tbody><tfoot><tr><td><b>Team</b></td><td></td><td class="n"><b>${A(sum('capD'),sum('capH'))}</b></td><td class="n"><b>${A(sum('bookD'),sum('bookH'))}</b></td><td class="n"><b>${A(sum('freeD'),sum('freeH'))}</b></td><td>${bar({util:sum('capH')?sum('bookH')/sum('capH')*100:0})}</td><td class="n">${sum('overDays')||'—'}</td><td class="n"><b>${A(sum('pendD'),sum('pendH'))}</b></td><td></td><td class="n"><b>${noH||'—'}</b></td></tr></tfoot></table></div>
      </details>`;
    return head+boxes+people;
  }

  function filterBar(M){
    const all=Object.values(M.P).filter(p=>!p.exclude), depts=[...new Set(all.map(p=>p.dept).filter(Boolean))].sort();
    const o=(v,l,c)=>`<option value="${E(v)}" ${String(v)===String(c)?'selected':''}>${E(l)}</option>`;
    return `<div class="tc-bar"><label>Find person<input type="search" value="${E(V.search)}" placeholder="Name" oninput="clearTimeout(RP._st);RP._st=setTimeout(()=>{RP.view.search=this.value;RP.render();const i=document.querySelector('#capacity input[type=search]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)"></label>
      ${depts.length>1?`<label>Department<select onchange="RP.vset('dept',this.value)">${o('','All',V.dept)}${depts.map(d=>o(d,d,V.dept)).join('')}</select></label>`:''}
      <label>Project<select onchange="RP.vset('proj',this.value)">${o('','All projects',V.proj)}${(db.projects||[]).filter(p=>String(p.code||'').trim()).map(p=>o(p.id,p.code+' — '+(p.name||''),V.proj)).join('')}</select></label>
      <div class="tc-legend" style="margin-left:auto"><span class="tc-chip tc-free">Free</span><span class="tc-chip tc-half">½ day</span><span class="tc-chip tc-full">Busy (8 h)</span><span class="tc-chip tc-over">Over 8 h</span><span class="tc-chip tc-leave">Leave</span><span class="tc-chip tc-off">Holiday / weekend</span></div></div>`;
  }

  /* ---------- Tab 1: Today ---------- */
  function todayTab(M,ppl){
    const t=M.t0, wa=weekStart(t), wb=addDays(wa,4), order={over:0,busy:1,half:2,free:3,leave:4,hol:4,off:4};
    const rows=ppl.map(p=>({p, d:dayInfo(M,p,t), w:sumDays(M,p,wa,wb), pend:p.pending/(p.daily||8), proj:projCodes(p,t,addDays(t,30))}));
    rows.sort((a,b)=>(order[a.d.s]-order[b.d.s])||(b.pend-a.pend));
    return `<div class="tc-wrap"><table class="tc-t"><thead><tr><th>Person</th><th>Today</th><th>This week</th><th class="n">Pending work</th><th>Free from</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td><button class="tc-link" onclick="RP.personDays('${E(r.p.key)}')"><b>${E(r.p.name)}</b></button>${r.p.linked?'':' <span class="muted">(no login)</span>'}</td>
        <td><span class="tc-chip ${r.d.cls}">${r.d.s==='half'?'½ day':r.d.s==='off'?'Weekend':r.d.label}</span></td>
        <td>${r.w.work?(H()?`${hnum(RP.bookedIn(r.p,wa,wb))} of ${hnum(RP.capacityIn(M,r.p,wa,wb))} h booked`:`${dnum(r.w.busy)} of ${r.w.work} days busy`):'—'}</td>
        <td class="n">${r.pend>0?amt(r.pend,r.p.pending):'—'}${r.p.overdue>0?` <span class="tc-chip tc-busy" title="Work past its target date">${H()?hfmt(r.p.overdue):dnum(r.p.overdue/(r.p.daily||8))+' d'} overdue</span>`:''}</td>
        <td>${r.p.fullyFree<=t?'<b>Now</b>':r.p.fullyFree>M.horizonEnd?'After '+fd(M.horizonEnd):fd(r.p.fullyFree)}</td></tr>`).join('')||'<tr><td colspan="5">No people match.</td></tr>'}
      </tbody></table></div>
      <p class="tc-note">${H()?'Hours = estimated task hours spread over working days.':`1 day = 8 h standard working time. ½ day = up to 5 h booked. More than 8 h on a day shows red.`} Free from = first working day with nothing booked. Click a name to see their next 4 weeks and tasks.</p>`;
  }

  RP.personDays=function(key){
    const M=RP.build({proj:V.proj}), p=M.P[key]; if(!p) return;
    const t=M.t0, days=[]; for(let d=weekStart(t),g=0; days.length<20 && g<40; d=addDays(d,1),g++){ const w=new Date(d+'T12:00:00').getDay(); if(w>0&&w<6) days.push(d); }
    const items=p.items.filter(x=>x.status!=='Completed'&&x.pend>0).sort((a,b)=>String(a.end).localeCompare(String(b.end)));
    twModal(E(p.name),`<p class="muted">${E([p.dept,p.designation].filter(Boolean).join(' · '))} · ${p.daily} h per day · pending ${amt(p.pending/(p.daily||8),p.pending)} · free from ${p.fullyFree<=t?'now':fd(p.fullyFree)}</p>
      <div style="overflow:auto"><table class="tc-t tc-cal"><thead><tr>${days.map(d=>`<th class="d" style="text-align:center">${new Date(d+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short'})}<br>${d.slice(8)}/${d.slice(5,7)}</th>`).join('')}</tr></thead><tbody><tr>${days.map(d=>{const x=dayInfo(M,p,d);return `<td class="c ${x.cls}" title="${Math.round((p.load[d]||0)*10)/10} h booked">${H()&&x.free!==undefined?((p.load[d]||0)>0.05?hnum(p.load[d])+'h':'Free'):x.label}</td>`}).join('')}</tr></tbody></table></div>
      <h4 style="margin:14px 0 6px">Open tasks (${items.length})</h4>
      <div style="max-height:45vh;overflow:auto"><table class="tc-t"><thead><tr><th>Project</th><th>Task</th><th>Target</th><th class="n">Pending</th></tr></thead><tbody>
      ${items.map(x=>`<tr><td><b>${E(x.p.code||'')}</b></td><td>${E((x.t&&x.t!==x.item?x.t.name+' / ':'')+(x.item.name||''))}${x.overdue?' <span class="tc-chip tc-busy">Overdue</span>':''}${x.est?' <span class="muted" title="No planned hours entered">*</span>':''}</td><td>${fd(x.end)}</td><td class="n">${amt(x.pend/(p.daily||8),x.pend)}</td></tr>`).join('')||'<tr><td colspan="4">No open tasks.</td></tr>'}
      </tbody></table></div>${items.some(x=>x.est)?'<p class="muted" style="font-size:12px">* No planned hours entered; counted as full working days.</p>':''}`,null,'Close',true);
  };

  /* ---------- Tab 2: Calendar ---------- */
  function calRange(){
    const t=todayIso(), mk=monthKey(t);
    if(V.range==='week') return {a:weekStart(t), b:addDays(weekStart(t),4)};
    if(V.range==='2weeks') return {a:weekStart(t), b:addDays(weekStart(t),11)};
    if(V.range==='month') return {a:monthStart(mk), b:monthEnd(mk)};
    if(V.range==='nextmonth'){ const m=addMonths(mk,1); return {a:monthStart(m), b:monthEnd(m)}; }
    const a=V.from||t, b=V.to&&V.to>=a?V.to:addDays(a,27); return {a, b:b>addDays(a,92)?addDays(a,92):b};
  }
  RP.dayTasks=function(key,d){
    const M=RP.build({proj:V.proj}), p=M.P[key]; if(!p) return;
    const x0=dayInfo(M,p,d), di=(p.di&&p.di[d])||{}, cap=(p.leave&&p.leave.has(d))?0:p.daily;
    const act=(p.all||[]).filter(x=>x.status!=='Cancelled'&&((di[x.item.id]||0)>0.01||(x.start&&x.end&&x.start<=d&&d<=x.end&&x.status!=='Completed')));
    const seen=new Set(), list=act.filter(x=>{ const k=x.p.id+'|'+x.item.id; if(seen.has(k)) return false; seen.add(k); return true; }).sort((a,b)=>(di[b.item.id]||0)-(di[a.item.id]||0));
    const booked=Math.round((p.load[d]||0)*10)/10;
    const kind=x=>x.p.id==='daily'?'Daily task':x.unplanned?'Unplanned':'Project schedule';
    const rows=list.map(x=>{ const h=Math.round((di[x.item.id]||0)*10)/10, pj=x.p.id==='daily'?(x.p.realProject?(x.p.realProject.code||x.p.realProject.name):'—'):(x.p.code||x.p.name||'—');
      return `<tr><td><b>${E(pj)}</b></td><td>${x.p.id==='daily'?E(x.item.name):E(x.t.name)+' › <b>'+E(x.item.name)+'</b>'}</td><td><span class="tc-chip ${x.p.id==='daily'?'tc-half':x.unplanned?'tc-over':'tc-free'}">${kind(x)}</span></td><td class="n">${h>0?(H()?h+' h':(Math.round(h/(p.daily||8)*100)/100)+' d'):'<span class="muted" title="No estimated hours, so it does not book time">no hours</span>'}</td><td>${E(x.status||'')}</td><td style="white-space:nowrap">${fd(x.start)} – ${fd(x.end)}</td></tr>`; }).join('');
    twModal(`${E(p.name)} · ${new Date(d+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'})} ${fd(d)}`,
      `<p style="margin:0 0 10px"><span class="tc-chip ${x0.cls}">${x0.s==='half'?'½ day':x0.label}</span> <span class="muted">Booked ${booked} h of ${cap} h${cap>0?` · free ${Math.max(0,Math.round((cap-booked)*10)/10)} h`:''}</span></p>
       <div class="tc-wrap"><table class="tc-t"><thead><tr><th>Project</th><th>Task</th><th>Type</th><th class="n">${H()?'Hours':'Days'} this day</th><th>Status</th><th>Dates</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="muted">No tasks on this day — the person is free.</td></tr>'}</tbody></table></div>
       <p class="muted" style="font-size:12px;margin:8px 0 0">Tasks with "no hours" are scheduled on this day but have no estimated hours, so they do not book time. <a href="#" onclick="event.preventDefault();document.querySelectorAll('.tw-modal').forEach(m=>m.remove());RP.openWeek('${E(key)}','${d}')">Open ${E(p.name)}'s week to plan</a></p>`,null,'Close',true);
  };
  RP.openWeek=function(key,start){ V.tab='calendar'; V.cal='week'; V.wkPerson=key; if(start) V.wkStart=weekStart(start); RP.render(); };
  function calendarTab(M,ppl){
    const seg=(k,v,l)=>`<button class="${V[k]===v?'on':''}" onclick="RP.vset('${k}','${v}')">${l}</button>`;
    if(V.cal!=='week') V.cal='days';
    const views=`<div class="tc-seg">${seg('cal','days','Team · days')}${seg('cal','week','Person · week (plan)')}</div>`;
    if(V.cal==='week') return `<div class="tc-bar">${views}</div>`+(typeof RP.weekTab==='function'?RP.weekTab(M):'');
    let head=`<div class="tc-bar">${views}`;
    if(V.cal==='months'){
      head+=`<div class="tc-seg">${seg('months',6,'6 months')}${seg('months',12,'12 months')}</div></div>`;
      const ms=[...Array(Number(V.months)||6)].map((_,i)=>addMonths(monthKey(M.t0),i));
      const cell=(p,m)=>{ const a=m===monthKey(M.t0)?M.t0:monthStart(m), s=sumDays(M,p,a,monthEnd(m)); const fr=s.work?s.free/s.work:0;
        const cls=!s.work?'tc-off':s.over>2&&fr<0.2?'tc-over':fr>=0.5?'tc-free':fr>=0.2?'tc-half':'tc-busy';
        return `<td class="c ${cls}" title="${E(p.name)} · ${monthLabel(m)}${m===monthKey(M.t0)?' (from today)':''}\n${dnum(s.free)} of ${s.work} working days free (${hnum(RP.freeIn(M,p,a,monthEnd(m)))} h)\n${E(projCodes(p,a,monthEnd(m)).join(', '))}">${s.work?(H()?hnum(RP.freeIn(M,p,a,monthEnd(m)))+' h free':dnum(s.free)+' free'):'—'}</td>`; };
      const team=ms.map(m=>{ const a=m===monthKey(M.t0)?M.t0:monthStart(m); let f=0,w=0,fh=0; ppl.forEach(p=>{const s=sumDays(M,p,a,monthEnd(m)); f+=s.free; w+=s.work; fh+=RP.freeIn(M,p,a,monthEnd(m));}); return `<td class="c" title="${dnum(f)} of ${w} person-days free (${hnum(fh)} h)">${H()?hnum(fh):dnum(f)}</td>`; }).join('');
      return head+`<div class="tc-wrap"><table class="tc-t tc-cal"><thead><tr><th class="nm">Person</th>${ms.map(m=>`<th class="d">${monthLabel(m)}</th>`).join('')}</tr></thead><tbody>
        ${ppl.map(p=>`<tr><td class="nm"><button class="tc-link" title="Open ${E(p.name)}'s week" onclick="RP.openWeek('${E(p.key)}')">${E(p.name)}</button></td>${ms.map(m=>cell(p,m)).join('')}</tr>`).join('')||'<tr><td>No people match.</td></tr>'}
        </tbody>${ppl.length>1?`<tfoot><tr><td class="nm"><b>Team free ${H()?'hours':'days'}</b></td>${team}</tr></tfoot>`:''}</table></div>
        <p class="tc-note">Free ${H()?'hours':'working days'} per person in each month (the current month counts from today). Green = at least half the month free, yellow = some free days, red = almost fully booked. Hover for projects.</p>`;
    }
    head+=`<div class="tc-seg">${seg('range','week','This week')}${seg('range','2weeks','2 weeks')}${seg('range','month','This month')}${seg('range','nextmonth','Next month')}${seg('range','custom','Custom')}</div>`;
    if(V.range==='custom') head+=`<label>From<input type="date" value="${E(V.from||todayIso())}" onchange="RP.vset('from',this.value)"></label><label>To<input type="date" value="${E(V.to||'')}" onchange="RP.vset('to',this.value)"></label>`;
    head+='</div>';
    const r=calRange(), days=[]; for(let d=r.a,g=0; d<=r.b&&g<120; d=addDays(d,1),g++){ const w=new Date(d+'T12:00:00').getDay(); if(w>0&&w<6) days.push(d); }
    const projName=id=>{if(id==='daily')return 'Daily tasks';const p=(db.projects||[]).find(x=>x.id===id);return p?(p.code||p.name):'Unplanned';};
    const cell=(p,d)=>{ const x=dayInfo(M,p,d); const pj=p.proj[d]?Object.entries(p.proj[d]).map(([k,h])=>`${projName(k)}: ${Math.round(h*10)/10} h`).join('\n'):'';
      return `<td class="c ${x.cls}" style="cursor:pointer" onclick="RP.dayTasks('${E(p.key)}','${d}')" title="Click to see the tasks · ${E(p.name)} · ${fd(d)}\n${x.t||((Math.round((p.load[d]||0)*10)/10)+' h of '+p.daily+' h booked')}${pj?'\n'+E(pj):''}">${H()&&x.free!==undefined?((p.load[d]||0)>0.05?hnum(p.load[d])+'h':'Free'):x.label}</td>`; };
    const freeCount=d=>ppl.reduce((n,p)=>n+(dayInfo(M,p,d).free||0),0);
    return head+`<div class="tc-wrap"><table class="tc-t tc-cal"><thead><tr><th class="nm">Person</th>${days.map(d=>`<th class="d ${d===M.t0?'today':''}">${new Date(d+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short'})}<br>${d.slice(8)}/${d.slice(5,7)}</th>`).join('')}<th class="n">Free ${H()?'hours':'days'}</th></tr></thead><tbody>
      ${ppl.map(p=>{ const s=sumDays(M,p,days[0]||r.a,days[days.length-1]||r.b); return `<tr><td class="nm"><button class="tc-link ${s.over>0?'tc-namered':''}" title="${s.over>0?`Booked over 8 h on ${s.over} day${s.over===1?'':'s'} · `:''}Open ${E(p.name)}'s week to plan" onclick="RP.openWeek('${E(p.key)}','${days[0]||r.a}')">${E(p.name)}</button></td>${days.map(d=>cell(p,d)).join('')}<td class="n"><b>${H()?hnum(RP.freeIn(M,p,days[0]||r.a,days[days.length-1]||r.b)):dnum(s.free)}</b></td></tr>`; }).join('')||'<tr><td>No people match.</td></tr>'}
      </tbody>${ppl.length>1?`<tfoot><tr><td class="nm"><b>${H()?'Free hours':'People free'}</b></td>${days.map(d=>`<td class="c">${H()?hnum(ppl.reduce((n,p)=>{const x=dayInfo(M,p,d);return n+(x.free===undefined?0:Math.max((p.daily||8)-(p.load[d]||0),0));},0)):dnum(freeCount(d))}</td>`).join('')}<td></td></tr></tfoot>`:''}</table></div>
      <p class="tc-note">${H()?'Each cell shows hours booked that day against the 8 h standard: Free, ½ day, Busy (8 h) or red when over 8 h. ':''}Click a name to open that person's week and plan in free time. Hover a day to see hours and projects. Past days show what was scheduled; from today, only remaining work on the latest task dates is counted.</p>`;
  }

  /* ---------- Tab 3: New Project Check (days) ---------- */
  function migrate(fc){ if(!(Number(fc.days)>0) && Number(fc.hours)>0) fc.days=half(Number(fc.hours)/(Number(RP.cap().settings.dailyHours)||8)); if(!(Number(fc.hours)>0) && Number(fc.days)>0) fc.hours=Number(fc.days)*(Number(RP.cap().settings.dailyHours)||8); return fc; }
  function eligible(M,fc){ return Object.values(M.P).filter(p=>!p.exclude && (!fc.dept||norm(p.dept)===norm(fc.dept)) && (!fc.designation||norm(p.designation)===norm(fc.designation))); }
  function check(fc,unit){
    unit=unit||V.unit; migrate(fc);
    const hrs=unit==='hours', dh=(Number(RP.cap().settings.dailyHours)||8);
    const M=RP.build({}), days=hrs?Number(fc.hours)||0:Number(fc.days)||0, res={ok:false};
    if(!fc.start||!fc.end||fc.end<fc.start||!(days>0)) return res;
    const freeOf=(p,a,b)=>hrs?RP.freeIn(M,p,a,b):sumDays(M,p,a,b).free;
    const team=eligible(M,fc), wdAll=RP.workDays(fc.start,fc.end).length;
    const months=[]; let m=monthKey(fc.start); while(m<=monthKey(fc.end)&&months.length<36){ months.push(m); m=addMonths(m,1); }
    let short=0, extra=0, tight=false, freeTot=0;
    const rows=months.map(mk=>{ const a=monthStart(mk)<fc.start?fc.start:monthStart(mk), b=monthEnd(mk)>fc.end?fc.end:monthEnd(mk);
      const wd=RP.workDays(a,b).length, req=wdAll?days*wd/wdAll:0; let free=0; team.forEach(p=>free+=freeOf(p,a,b));
      const sh=Math.max(req-free,0), ex=sh>0&&wd?Math.ceil(sh/(wd*(hrs?dh:1))):0; short+=sh; extra=Math.max(extra,ex); freeTot+=free; if(free>0&&req/free>0.9) tight=true;
      return {mk,wd,req,free,sh,ex}; });
    const best=team.map(p=>({p, free:freeOf(p,fc.start,fc.end)})).filter(x=>x.free>0.25).sort((a,b)=>b.free-a.free);
    const busy=team.filter(p=>{const s=sumDays(M,p,fc.start,fc.end); return s.work&&s.free/s.work<0.3;});
    const freeing=team.filter(p=>p.fullyFree>fc.start&&p.fullyFree<=fc.end).sort((a,b)=>a.fullyFree.localeCompare(b.fullyFree));
    return {ok:true, unit, need:days, rows, short, extra, tight, freeTot, wdAll, fte:wdAll?(hrs?days/dh:days)/wdAll:0, best, busy, freeing, team, verdict: short>(hrs?2:0.25)?'no':tight?'tight':'yes'};
  }
  RP.checkProject=check;
  const answer=(fc,r)=>{
    const U=r.unit==='hours'?hfmt:dfmt;
    const fte=r.fte, fteTxt=`${fte<=1?'about 1 person':'about '+(Math.round(fte*10)/10)+' people'} working full-time for the whole period (${r.wdAll} working days)`;
    if(r.verdict==='yes') return {cls:'tc-free', t:`Yes — the team can take ${E(fc.code||'this project')}.`, s:`${U(r.need)} needed, ${U(r.freeTot)} free in the team during these dates. That is ${fteTxt}. No confirmed work needs to move.`};
    if(r.verdict==='tight') return {cls:'tc-half', t:`Possible, but tight.`, s:`${U(r.need)} needed and ${U(r.freeTot)} free, but at least one month uses over 90% of the free time. Any delay or unplanned work could push it over. That is ${fteTxt}.`};
    return {cls:'tc-busy', t:`No — the team is short by ${U(r.short)}. You need ${r.extra} more engineer${r.extra>1?'s':''}.`, s:`${U(r.need)} needed but only ${U(r.freeTot)} free during these dates. That is ${fteTxt}. Alternatively, start later or allow a longer design period.`};
  };
  function deptOpts(sel){ const M=RP.build({}), ps=Object.values(M.P).filter(p=>!p.exclude); return {d:[...new Set(ps.map(p=>p.dept).filter(Boolean))].sort(), g:[...new Set(ps.map(p=>p.designation).filter(Boolean))].sort()}; }
  function checkTab(M){
    const fcs=RP.cap().forecasts.map(migrate);
    const cur=V.draft||(V.checkSel&&fcs.find(f=>f.id===V.checkSel))||{code:'',name:'',start:'',end:'',days:'',dept:'',designation:''};
    const o=deptOpts(), sel=(id,list,v,l)=>`<select id="${id}"><option value="">${l}</option>${list.map(x=>`<option ${x===v?'selected':''}>${E(x)}</option>`).join('')}</select>`;
    const r=check(cur), a=r.ok?answer(cur,r):null;
    const canSave=RP.can('Add')||isAdmin();
    return `<div class="tc-card"><div class="tc-form">
        <label>Project code<input id="tcCode" value="${E(cur.code)}" placeholder="e.g. A1750"></label>
        <label>Project name<input id="tcName" value="${E(cur.name||'')}" placeholder="optional"></label>
        <label>Expected start<input id="tcStart" type="date" value="${E(cur.start)}"></label>
        <label>Design completion<input id="tcEnd" type="date" value="${E(cur.end)}"></label>
        <label>Work needed (${H()?'hours':'days'})<input id="tcDays" type="number" min="${H()?1:0.5}" step="${H()?1:0.5}" value="${E(H()?(cur.hours||''):(cur.days||''))}" placeholder="${H()?'e.g. 400':'e.g. 50'}"></label>
        ${o.d.length>1?`<label>Department${sel('tcDept',o.d,cur.dept,'Any')}</label>`:''}
        ${o.g.length>1?`<label>Designation${sel('tcDesig',o.g,cur.designation,'Any')}</label>`:''}
        <div class="actions" style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><button class="primary" onclick="RP.runCheck()">Check</button>${canSave?`<button onclick="RP.saveCheck()">${cur.id?'Save changes':'Save'}</button>`:''}${(cur.id||V.draft)?'<button onclick="RP.newCheck()">New</button>':''}</div>
      </div><p class="tc-note">${H()?`Enter the total design work in hours (1 day = ${(Number(RP.cap().settings.dailyHours)||8)} h).`:`Enter the total design work in person-days (e.g. 400 hours ≈ ${Math.round(400/(Number(RP.cap().settings.dailyHours)||8))} days).`} Switch Days / Hours at the top at any time. Checking never changes confirmed projects.</p></div>
      ${a?`<div class="tc-answer ${a.cls}">${a.t}<small>${a.s}</small></div>
      <div class="tc-grid2"><div class="tc-card"><h4 style="margin:0 0 8px">Month by month</h4><table class="tc-t"><thead><tr><th>Month</th><th class="n">Working days</th><th class="n">Needed (${H()?'h':'days'})</th><th class="n">Team free</th><th class="n">Short</th><th class="n">Extra engineers</th></tr></thead><tbody>
        ${r.rows.map(x=>`<tr><td>${monthLabel(x.mk)}</td><td class="n">${x.wd}</td><td class="n">${anum(x.req,x.req)}</td><td class="n">${anum(x.free,x.free)}</td><td class="n">${x.sh>(H()?2:0.25)?'<b>'+anum(x.sh,x.sh)+'</b>':'0'}</td><td class="n">${x.ex}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="tc-card"><h4 style="margin:0 0 8px">Best people for it</h4>${r.best.length?(()=>{ const row=x=>`<tr><td><b>${E(x.p.name)}</b>${x.p.designation||x.p.role?`<div class="muted" style="font-size:11.5px">${E(x.p.designation||x.p.role)}</div>`:''}</td><td class="n">${anum(x.free,x.free)}</td><td>${x.p.fullyFree<=M.t0?'Now':fd(x.p.fullyFree)}</td></tr>`;
          const head=`<thead><tr><th>Person</th><th class="n">Free ${H()?'hours':'days'} in these dates</th><th>Free from</th></tr></thead>`;
          return `<table class="tc-t">${head}<tbody>${r.best.slice(0,6).map(row).join('')}</tbody></table>${r.best.length>6?`<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12.5px">Show all ${r.best.length} people with free time</summary><table class="tc-t">${head}<tbody>${r.best.slice(6).map(row).join('')}</tbody></table></details>`:''}`; })():'<p class="muted">Nobody has free time in these dates.</p>'}
        <p class="tc-note">Sorted by most free time (same free time → A–Z). Everyone in Team Capacity is included, AGM, Managers and Team Leaders too, except people ticked “Not a design resource” in Team Capacity → Settings${r.team&&r.team.length?` (${r.team.length} people checked)`:''}.</p>
        ${''}${r.busy.length?`<p class="tc-note"><b>Mostly busy:</b> ${r.busy.map(p=>E(p.name)).join(', ')}</p>`:''}${r.freeing.length?`<p class="tc-note"><b>Become free during the period:</b> ${r.freeing.map(p=>E(p.name)+' ('+fd(p.fullyFree)+')').join(', ')}</p>`:''}</div></div>
      <div class="tc-how"><b>How this check is calculated</b> (1 day = 8 h)
        <ul><li><b>Needed</b> = the work you entered, spread evenly over the working days between start and design completion. Per month = work ÷ all working days × working days in that month.</li>
        <li><b>Team free</b> = for every designer, each working day's 8 h minus the hours already booked on that day; leave, holidays and weekends count as 0. Added up for the month.</li>
        <li><b>Short</b> = Needed − Team free (0 when it fits). <b>Extra engineers</b> = Short ÷ (working days in that month × 8 h), rounded up. The answer is <b>Tight</b> when a month needs more than 90% of the team's free time.</li>
        <li><b>People full-time</b> = work needed ÷ working days in the period (for example 50 days ÷ 20 working days = 2.5 people).</li>
        <li><b>Best people</b> = most free days between the dates. <b>Free from</b> = first day with nothing booked.</li></ul>
        ${checkExample(r)}
        <span class="muted">Nothing is booked by a check — confirmed projects never move.</span></div>`
      :'<p class="tc-note">Fill in the dates and work needed, then press Check.</p>'}
      ${fcs.length?`<h4 style="margin:18px 0 8px">Saved checks</h4><div class="tc-wrap" style="max-height:none"><table class="tc-t"><thead><tr><th>Project</th><th>Dates</th><th class="n">Work needed</th><th>Result</th><th></th></tr></thead><tbody>
        ${fcs.map(f=>{ const c=check(f); const chip=!c.ok?'<span class="tc-chip tc-off">Incomplete</span>':c.verdict==='yes'?'<span class="tc-chip tc-free">Fits</span>':c.verdict==='tight'?'<span class="tc-chip tc-half">Tight</span>':`<span class="tc-chip tc-busy">Needs ${c.extra} more</span>`;
          return `<tr><td><button class="tc-link" onclick="RP.openCheck('${f.id}')"><b>${E(f.code)}</b></button> ${E(f.name||'')}</td><td>${fd(f.start)} – ${fd(f.end)}</td><td class="n">${amt(f.days,f.hours)}</td><td>${chip}</td><td>${(RP.can('Delete')||isAdmin())?`<button class="small danger" onclick="RP.delForecast('${f.id}')">Delete</button>`:''}</td></tr>`; }).join('')}
        </tbody></table></div><p class="tc-note">Results update automatically as tasks move, finish or new work is added.</p>`:''}`;
  }
  function readForm(){ const g=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
    const v=Number(g('tcDays'))||0, dh=(Number(RP.cap().settings.dailyHours)||8); return {code:g('tcCode'), name:g('tcName'), start:g('tcStart'), end:g('tcEnd'), days:v?(H()?half(v/dh):v):'', hours:v?(H()?v:v*dh):'', dept:g('tcDept'), designation:g('tcDesig')}; }
  function validate(f){ if(!f.start||!f.end) return 'Enter the expected start and design completion dates.'; if(f.end<f.start) return 'Completion cannot be before the start.'; if(!(f.days>0||f.hours>0)) return 'Enter the work needed in '+(H()?'hours.':'days.'); return ''; }
  RP.runCheck=function(){ const f=readForm(), err=validate(f); if(err) return toast(err); const id=V.draft?.id||(V.checkSel&&RP.cap().forecasts.some(x=>x.id===V.checkSel)?V.checkSel:''); V.draft={...f, id}; RP.render(); };
  RP.saveCheck=function(){
    if(!(RP.can('Add')||isAdmin())) return toast('You do not have permission to save project checks.');
    const f=readForm(), err=validate(f); if(err) return toast(err); if(!f.code) return toast('Enter a project code to save the check.');
    const fcs=RP.cap().forecasts, id=V.draft?.id||V.checkSel, ex=id&&fcs.find(x=>x.id===id);
    const rec={...f, split:{}, updatedBy:TW.me, updatedAt:Date.now()};
    if(ex){ if(!(RP.can('Edit')||isAdmin())) return toast('You do not have permission to edit saved checks.'); Object.assign(ex,rec); V.checkSel=ex.id; }
    else { rec.id=(typeof uid==='function'?uid():String(Date.now())); rec.by=TW.me; rec.at=Date.now(); fcs.push(rec); V.checkSel=rec.id; }
    V.draft=null; RP.invalidate(); save(false); toast('Project check saved. Confirmed projects were not changed.'); RP.render();
  };
  RP.openCheck=function(id){ V.checkSel=id; V.draft=null; RP.render(); };
  RP.newCheck=function(){ V.checkSel=''; V.draft={code:'',name:'',start:'',end:'',days:'',hours:'',dept:'',designation:''}; RP.render(); };
  const delPrev=RP.delForecast;
  RP.delForecast=function(id){ delPrev(id); if(V.checkSel===id) V.checkSel=''; RP.render(); };
  RP.go=function(){ V.tab='check'; RP.render(); };

  /* ---------- Settings (gear) ---------- */
  RP.openSettings=function(){
    if(!RP.canEdit()) return toast('You do not have permission to change capacity settings.');
    const M=RP.build({}), s=RP.cap().settings, ppl=Object.values(M.P).sort((a,b)=>a.name.localeCompare(b.name));
    const hol=(db.holidays||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const m=twModal('Team Capacity settings',`
      <p class="muted" style="margin:0 0 8px"><b>Standard working time: 8 h per day</b> for everyone (fixed). People can still book more; any day above 8 h shows red in the calendar.</p><input id="tcSh" type="hidden" value="8">
      <div class="tw-2">
      <div class="tw-f"><label for="tcDs">Working day starts at</label><input id="tcDs" type="time" value="${E(s.dayStart||'09:00')}"></div></div><div class="tw-2"><div class="tw-f"><label style="display:flex;gap:8px;align-items:center;margin-top:4px"><input id="tcSe" type="checkbox" ${s.estimateMissing?'checked':''} style="width:auto"> Count tasks without planned hours as full days</label></div></div>
      <h4 style="margin:14px 0 6px">People</h4><div style="max-height:36vh;overflow:auto"><table class="tc-t" id="tcPpl"><thead><tr><th>Person</th><th>Leave (dates or ranges)</th><th>Not a design resource</th></tr></thead><tbody>
      ${ppl.map(p=>{ const c=RP.cap().people[p.key]||{}; return `<tr data-k="${E(p.key)}"><td>${E(p.name)}</td><td><input class="l" value="${E(c.leave||'')}" placeholder="2026-12-24..2026-12-31" style="min-width:220px"></td><td style="text-align:center"><input class="x" type="checkbox" ${c.exclude?'checked':''} style="width:auto"></td></tr>`; }).join('')}
      </tbody></table></div><p class="muted" style="font-size:12px">Tick "Not a design resource" for people who do not take design work (e.g. Admin, HOD). Leave example: 2026-12-24..2026-12-31, 2027-01-15</p>
      <h4 style="margin:14px 0 6px">Company holidays</h4><div class="tw-2"><div class="tw-f"><input id="tcHd" type="date"></div><div class="tw-f" style="display:flex;gap:6px"><input id="tcHn" placeholder="Holiday name"><button type="button" onclick="RP.addHoliday()">Add</button></div></div>
      <div id="tcHolList" style="max-height:20vh;overflow:auto">${holList(hol)}</div>`,mm=>{
        const h=Number(mm.querySelector('#tcSh').value); if(!(h>=1&&h<=24)) return 'Working hours per day must be between 1 and 24.';
        let bad='';
        const c=RP.cap();
        mm.querySelectorAll('#tcPpl tr[data-k]').forEach(tr=>{ const k=tr.dataset.k, hh=0, l=tr.querySelector('.l').value.trim(), x=tr.querySelector('.x').checked;
          if(l && !l.split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean).every(v=>/^\d{4}-\d{2}-\d{2}(\s*\.\.\s*\d{4}-\d{2}-\d{2})?$/.test(v))) bad=bad||tr.cells[0].textContent;
          const rec={}; if(hh>0&&hh<=24) rec.hours=hh; if(l) rec.leave=l; if(x) rec.exclude=true; if(Object.keys(rec).length) c.people[k]=rec; else delete c.people[k]; });
        if(bad) return 'Leave dates for '+bad+' must be YYYY-MM-DD or YYYY-MM-DD..YYYY-MM-DD.';
        c.settings.dailyHours=8; c.settings.estimateMissing=mm.querySelector('#tcSe').checked; const dsv=mm.querySelector('#tcDs').value; if(/^\d{2}:\d{2}$/.test(dsv)) c.settings.dayStart=dsv;
        RP.invalidate(); save(false); toast('Settings saved for everyone.'); RP.render(); if(typeof renderWorkloadPlanner==='function') try{renderWorkloadPlanner()}catch(e){}
      },'Save settings',true);
  };
  function holList(hol){ return hol.length?`<table class="tc-t"><tbody>${hol.map(h=>`<tr><td>${fd(h.date)}</td><td>${E(h.name||'')}</td><td class="n"><button type="button" class="small danger" onclick="RP.delHoliday('${E(h.date)}')">Remove</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No holidays added.</p>'; }
  RP.addHoliday=function(){
    const d=document.getElementById('tcHd').value, n=document.getElementById('tcHn').value.trim();
    if(!d) return toast('Choose the holiday date.'); db.holidays ||= [];
    if(db.holidays.some(h=>h.date===d)) return toast('That date is already a holiday.');
    db.holidays.push({date:d,name:n||'Holiday'}); RP.invalidate(); save(false);
    document.getElementById('tcHolList').innerHTML=holList(db.holidays.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)))); document.getElementById('tcHd').value=''; document.getElementById('tcHn').value='';
  };
  RP.delHoliday=function(d){
    db.holidays=(db.holidays||[]).filter(h=>h.date!==d); RP.invalidate(); save(false);
    document.getElementById('tcHolList').innerHTML=holList(db.holidays.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))));
  };

  /* ---------- Export: one workbook, one sheet per view ---------- */
  RP.exportAll=function(){
    try{
      const M=RP.build({proj:V.proj}), ppl=peopleList(M), t=M.t0, ms=[...Array(12)].map((_,i)=>addMonths(monthKey(t),i));
      const u=H()?'hours':'days', dd=(d,h)=>H()?Math.round(h*10)/10:half(d);
      const meta=title=>[`${title} — in ${u} — exported ${fd(t)}${V.proj?' — project filter: '+((db.projects||[]).find(p=>p.id===V.proj)?.code||''):''}`];
      const s1={name:'Today',head:2,widths:[26,14,18,16,16,40],rows:[meta('Team Capacity — today'),['Person','Today',H()?'Booked hours this week':'Busy days this week',`Pending (${u})`,'Free from'],
        ...ppl.map(p=>{ const d=dayInfo(M,p,t), w=sumDays(M,p,weekStart(t),addDays(weekStart(t),4)); return [p.name,d.s==='half'?'½ day':d.label||'Weekend',H()?Math.round(RP.bookedIn(p,weekStart(t),addDays(weekStart(t),4))*10)/10:w.busy,dd(p.pending/(p.daily||8),p.pending),p.fullyFree<=t?'Now':p.fullyFree]; })]};
      const s2={name:H()?'Free hours by month':'Free days by month',head:2,widths:[26,...ms.map(()=>12)],rows:[meta('Free time per person per month'),['Person',...ms.map(monthLabel)],
        ...ppl.map(p=>[p.name,...ms.map(m=>{const a=m===monthKey(t)?t:monthStart(m); return H()?Math.round(RP.freeIn(M,p,a,monthEnd(m))*10)/10:sumDays(M,p,a,monthEnd(m)).free;})])]};
      const s3={name:'Pending tasks',head:2,widths:[24,12,40,14,12,12,10],rows:[meta('Pending work per person'),['Person','Project','Task','Status','Target',`Pending (${u})`,'Overdue'],
        ...ppl.flatMap(p=>p.items.filter(x=>x.status!=='Completed'&&x.pend>0).sort((a,b)=>String(a.end).localeCompare(String(b.end))).map(x=>[p.name,x.p.code||'',(x.t&&x.t!==x.item?x.t.name+' / ':'')+(x.item.name||''),x.status,x.end,dd(x.pend/(p.daily||8),x.pend),x.overdue?'Yes':'']))]};
      const fcs=RP.cap().forecasts.map(migrate);
      const s4={name:'New project checks',head:2,widths:[14,26,12,12,14,16,14,16],rows:[meta('New project checks'),['Project','Name','Start','Completion',`Needed (${u})`,`Team free (${u})`,`Short (${u})`,'Extra engineers'],
        ...fcs.map(f=>{ const c=check(f); const r=v=>H()?Math.round(v*10)/10:half(v); return [f.code,f.name||'',f.start,f.end,c.ok?r(c.need):(H()?Number(f.hours)||0:Number(f.days)||0),c.ok?r(c.freeTot):'',c.ok?r(c.short):'',c.ok?c.extra:'']; })]};
      [s1,s2,s3,s4].forEach(s=>{ if(s.rows.length===2) s.rows.push(['No rows']); });
      const blob=RP.workbook([s1,s2,s3,s4]); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='Team_Capacity_'+t+'.xlsx'; document.body.appendChild(a); a.click(); setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},500);
      toast('Excel downloaded.');
    }catch(e){ console.error(e); toast('Export failed: '+e.message); }
  };

  // Re-render if the user is on the screen when this loads
  try{ if(typeof TW!=='undefined'&&TW.tab==='capacity') RP.render(); }catch(e){}
})();
