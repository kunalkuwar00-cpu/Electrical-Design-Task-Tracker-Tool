/* ===== ADPT v23.0 — Resource Planning screen ===== */
(function(){
  'use strict';
  const RP=window.RP; if(!RP) return;
  const U=RP.util, {norm,addDays,todayIso,monthKey,monthStart,monthEnd,addMonths,monthLabel,weekStart,r0,r1,fmtH,fd,E}=U;

  /* ---------- styles ---------- */
  const css=`
  #capacity .rp-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:8px 0 14px}
  #capacity .rp-bar label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--sb-mut,#71717a)}
  #capacity .rp-bar select,#capacity .rp-bar input{min-width:120px}
  #capacity .rp-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:14px}
  #capacity .rp-tile{background:var(--sb-panel,#fff);border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;padding:12px 14px}
  #capacity .rp-tile b{display:block;font-size:22px;font-weight:600;margin-top:4px;color:var(--sb-fg,#18181b)}
  #capacity .rp-tile span{font-size:12px;color:var(--sb-mut,#71717a)}
  #capacity .rp-tile small{display:block;font-size:11.5px;color:var(--sb-mut,#71717a);margin-top:2px}
  #capacity .rp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--sb-line,#e4e4e7);margin-bottom:12px;flex-wrap:wrap}
  #capacity .rp-tabs button{border:0;background:none;border-bottom:2px solid transparent;border-radius:0;padding:8px 12px;color:var(--sb-mut,#71717a)}
  #capacity .rp-tabs button.on{border-bottom-color:var(--tw-green,#1f9d61);color:var(--sb-fg,#18181b);font-weight:600}
  #capacity table.rp-t{width:100%;border-collapse:collapse;font-size:13px;min-width:0!important}
  .tw-modal table.rp-t{width:100%;border-collapse:collapse;font-size:13px;min-width:0!important}
  .tw-modal table.rp-t th,.tw-modal table.rp-t td{padding:6px 7px;border-bottom:1px solid var(--sb-line,#e4e4e7);text-align:left}
  .tw-modal table.rp-t .n{text-align:right}
  #capacity table.rp-t th,#capacity table.rp-t td{padding:7px 8px;border-bottom:1px solid var(--sb-line,#e4e4e7);text-align:left;white-space:nowrap}
  #capacity table.rp-t th{font-weight:600;font-size:12px;color:var(--sb-mut,#71717a);position:sticky;top:0;background:var(--sb-panel,#fff);cursor:default}
  #capacity table.rp-t th[data-sort]{cursor:pointer}
  #capacity table.rp-t td.n,#capacity table.rp-t th.n{text-align:right}
  #capacity .rp-chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:600}
  #capacity .rp-green,.rp-legend .rp-green{background:#1f9d6129;color:#137a49}
  #capacity .rp-yellow,.rp-legend .rp-yellow{background:#e8b40033;color:#8a6a00}
  #capacity .rp-red,.rp-legend .rp-red{background:#e5484d33;color:#b4232a}
  #capacity .rp-dark,.rp-legend .rp-dark{background:#7f1d1d;color:#fff}
  #capacity .rp-grey,.rp-legend .rp-grey{background:#71717a1f;color:#71717a}
  html[data-theme=dark] #capacity .rp-green{color:#4fd08f} html[data-theme=dark] #capacity .rp-yellow{color:#e8cc3a} html[data-theme=dark] #capacity .rp-red{color:#ff8a8f} html[data-theme=dark] #capacity .rp-grey{color:#a1a1a1}
  #capacity .rp-gantt td.c{text-align:center;font-weight:600;font-size:12px;min-width:64px;border-left:2px solid var(--sb-panel,#fff)}
  #capacity .rp-gantt td.nm{position:sticky;left:0;background:var(--sb-panel,#fff);z-index:1}
  #capacity .rp-legend{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;font-size:12px}
  #capacity .rp-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:12px}
  #capacity .rp-card{background:var(--sb-panel,#fff);border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;padding:12px 14px;min-width:0;overflow-x:auto}
  #capacity .rp-card h4{margin:0 0 8px;font-size:14px}
  #capacity .rp-card table.rp-t th,#capacity .rp-card table.rp-t td{white-space:normal;padding:6px 6px}
  #capacity .rp-card ul{margin:0;padding-left:18px} #capacity .rp-card li{margin:3px 0}
  #capacity .rp-verdict{padding:12px 14px;border-radius:8px;margin:10px 0;font-weight:600}
  #capacity .rp-link{background:none;border:0;padding:0;color:inherit;text-decoration:underline dotted;cursor:pointer;font:inherit}
  #capacity .rp-note{font-size:12px;color:var(--sb-mut,#71717a);margin:6px 0}
  #capacity .rp-wrap{overflow:auto;max-height:70vh;border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;background:var(--sb-panel,#fff)}
  #capacity .rp-reports{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}
  #capacity .rp-reports .rp-card p{margin:4px 0 10px;font-size:12.5px;color:var(--sb-mut,#71717a)}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  /* ---------- section + navigation ---------- */
  function ensureSection(){
    if(document.getElementById('capacity')) return;
    const anchor=document.getElementById('workload')||document.getElementById('team');
    const sec=document.createElement('section'); sec.id='capacity'; sec.className='view hidden';
    sec.innerHTML='<div id="rpRoot"></div>';
    (anchor&&anchor.parentNode?anchor.parentNode:document.body).appendChild(sec);
  }
  ensureSection();
  try{
    if(typeof SBI==='object') SBI.gauge='<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-5"/><circle cx="12" cy="18" r="1.4"/>';
    if(typeof SB_ICON==='object') SB_ICON.capacity=(typeof SBI==='object'&&SBI.gauge)?'gauge':'chart';
    if(typeof SB_KEYS==='object') SB_KEYS.capacity='c';
    if(Array.isArray(SB_GROUPS)&&!SB_GROUPS.flat().includes('capacity')){ const g=SB_GROUPS.find(x=>x.includes('workload'))||SB_GROUPS[1]; const i=g.indexOf('workload'); g.splice(i>=0?i+1:g.length,0,'capacity'); }
  }catch(e){ console.warn('Resource Planning sidebar',e); }
  const nav0=window.twNav;
  window.twNav=function(){
    const n=typeof nav0==='function'?nav0.apply(this,arguments):[];
    if(!n.some(x=>x[0]==='capacity') && RP.can('View')){ const i=n.findIndex(x=>x[0]==='workload'); n.splice(i>=0?i+1:n.length,0,['capacity','Resource Planning']); }
    return n;
  };
  const sw0=window.switchTab;
  window.switchTab=function(name){
    if(name==='capacity' && !RP.can('View')){ toast('You do not have access to Resource Planning. Contact the ADPT Admin.'); name='dashboard'; }
    const r=sw0.apply(this,[name,...Array.prototype.slice.call(arguments,1)]);
    if(name==='capacity') RP.render();
    return r;
  };
  const ref0=window.twRefresh;
  if(typeof ref0==='function') window.twRefresh=function(){ const r=ref0.apply(this,arguments); try{ RP.invalidate(); if(TW.tab==='capacity') RP.render(); }catch(e){ console.error(e); } return r; };

  /* ---------- period from filters ---------- */
  function period(){
    const f=RP.f, t=todayIso(), mk=monthKey(t);
    if(f.period==='month'){ const m=f.month||mk; return {a:monthStart(m), b:monthEnd(m), label:monthLabel(m)}; }
    if(f.period==='nextmonth'){ const m=addMonths(mk,1); return {a:monthStart(m), b:monthEnd(m), label:monthLabel(m)}; }
    if(f.period==='quarter'){ const y=Number(f.year)||Number(t.slice(0,4)), q=Number(f.q)||Math.floor((Number(t.slice(5,7))-1)/3)+1; const m0=`${y}-${String((q-1)*3+1).padStart(2,'0')}`; return {a:monthStart(m0), b:monthEnd(addMonths(m0,2)), label:`Q${q} ${y}`}; }
    if(f.period==='year'){ const y=Number(f.year)||Number(t.slice(0,4)); return {a:`${y}-01-01`, b:`${y}-12-31`, label:String(y)}; }
    if(f.period==='next3'||f.period==='next6'){ const n=f.period==='next3'?3:6; return {a:t, b:monthEnd(addMonths(mk,n-1)), label:`Next ${n} months`}; }
    if(f.period==='custom'){ const a=f.from||t, b=f.to&&f.to>=a?f.to:monthEnd(monthKey(a)); return {a,b,label:`${fd(a)} – ${fd(b)}`}; }
    return {a:monthStart(mk), b:monthEnd(mk), label:monthLabel(mk)};
  }
  RP.period=period;

  function model(){
    const M=RP.build({proj:RP.f.proj, status:RP.f.status});
    const pr=period();
    let list=Object.values(M.P).filter(p=>!p.exclude);
    if(RP.f.emp) list=list.filter(p=>p.key===RP.f.emp);
    if(RP.f.dept) list=list.filter(p=>norm(p.dept)===norm(RP.f.dept));
    if(RP.f.proj) list=list.filter(p=>p.items.length);
    const rows=list.map(p=>{
      const capH=RP.capacityIn(M,p,pr.a,pr.b), booked=RP.bookedIn(p,pr.a,pr.b), util=capH?booked/capH*100:0;
      return {p, capH, booked, util, free:Math.max(capH-booked,0), band:RP.band(util,capH), activeProjects:p.projects.size};
    });
    return {M, pr, rows};
  }

  /* ---------- top-level render ---------- */
  RP.render=function(){
    const root=document.getElementById('rpRoot'); if(!root) return;
    if(!RP.can('View')){ root.innerHTML='<div class="panel"><h2>Resource Planning</h2><p class="muted">You do not have access to Resource Planning. Contact the ADPT Admin.</p></div>'; return; }
    let mdl; try{ mdl=model(); }catch(e){ console.error('Resource Planning',e); root.innerHTML='<div class="panel"><h2>Resource Planning</h2><p>Could not calculate capacity: '+E(e.message)+'</p></div>'; return; }
    const tabs=[['availability','Availability'],['timeline','Timeline'],['distribution','Workload Distribution'],['forecast','Future Project Forecast'],['reports','Reports']];
    if(RP.canEdit()) tabs.push(['settings','Capacity Settings']);
    if(!tabs.some(t=>t[0]===RP.tab)) RP.tab='availability';
    root.innerHTML=`<div class="panel">
      <div class="toprow"><div><h2>Resource Planning</h2><span class="muted">Live capacity from the current task schedule · ${E(mdl.pr.label)} · ${fd(mdl.pr.a)} – ${fd(mdl.pr.b)}</span></div>
      <div class="actions"><button onclick="RP.openBest()">Find best engineer</button>${RP.can('Add')?'<button class="primary" onclick="RP.editForecast()">+ Future Project Forecast</button>':''}</div></div>
      ${filterBar(mdl)}
      ${tiles(mdl)}
      <div class="rp-tabs">${tabs.map(([k,l])=>`<button class="${RP.tab===k?'on':''}" onclick="RP.go('${k}')">${l}</button>`).join('')}</div>
      <div id="rpBody">${body(mdl)}</div></div>`;
  };
  RP.go=function(k){ RP.tab=k; RP.render(); };
  RP.setF=function(k,v){ RP.f[k]=v; RP.render(); };

  function body(mdl){
    switch(RP.tab){
      case 'timeline': return timeline(mdl);
      case 'distribution': return distribution(mdl);
      case 'forecast': return forecasts();
      case 'reports': return reports();
      case 'settings': return settings(mdl);
      default: return availability(mdl);
    }
  }

  function filterBar(mdl){
    const f=RP.f, t=todayIso(), people=Object.values(mdl.M.P).filter(p=>!p.exclude).sort((a,b)=>a.name.localeCompare(b.name));
    const depts=[...new Set(people.map(p=>p.dept).filter(Boolean))].sort();
    const statuses=[...new Set((db.projects||[]).flatMap(p=>(p.tasks||[]).flatMap(t=>(t.subs||[]).map(s=>s.status||'Not Started'))))].filter(s=>s!=='Cancelled').sort();
    const y=Number(t.slice(0,4)), years=[y-1,y,y+1,y+2];
    const opt=(v,l,cur)=>`<option value="${E(v)}" ${String(v)===String(cur)?'selected':''}>${E(l)}</option>`;
    let pv='';
    if(f.period==='month') pv=`<label>Month<input type="month" value="${E(f.month||monthKey(t))}" onchange="RP.setF('month',this.value)"></label>`;
    if(f.period==='quarter') pv=`<label>Quarter<select onchange="RP.setF('q',this.value)">${[1,2,3,4].map(q=>opt(q,'Q'+q,f.q||Math.floor((Number(t.slice(5,7))-1)/3)+1)).join('')}</select></label><label>Year<select onchange="RP.setF('year',this.value)">${years.map(v=>opt(v,v,f.year||y)).join('')}</select></label>`;
    if(f.period==='year') pv=`<label>Year<select onchange="RP.setF('year',this.value)">${years.map(v=>opt(v,v,f.year||y)).join('')}</select></label>`;
    if(f.period==='custom') pv=`<label>From<input type="date" value="${E(f.from||t)}" onchange="RP.setF('from',this.value)"></label><label>To<input type="date" value="${E(f.to||'')}" onchange="RP.setF('to',this.value)"></label>`;
    return `<div class="rp-bar">
      <label>Period<select onchange="RP.setF('period',this.value)">${[['month','Month'],['nextmonth','Next month'],['quarter','Quarter'],['year','Year'],['next3','Next 3 months'],['next6','Next 6 months'],['custom','Custom dates']].map(([v,l])=>opt(v,l,f.period)).join('')}</select></label>${pv}
      <label>Employee<select onchange="RP.setF('emp',this.value)">${opt('','Whole team',f.emp)}${people.map(p=>opt(p.key,p.name,f.emp)).join('')}</select></label>
      <label>Department<select onchange="RP.setF('dept',this.value)">${opt('','All departments',f.dept)}${depts.map(d=>opt(d,d,f.dept)).join('')}</select></label>
      <label>Project<select onchange="RP.setF('proj',this.value)">${opt('','All projects',f.proj)}${(db.projects||[]).filter(p=>String(p.code||'').trim()).map(p=>opt(p.id,p.code+' — '+(p.name||''),f.proj)).join('')}</select></label>
      <label>Task status<select onchange="RP.setF('status',this.value)">${opt('','All statuses',f.status)}${statuses.map(s=>opt(s,s,f.status)).join('')}</select></label>
      ${(f.emp||f.dept||f.proj||f.status)?`<button class="small" onclick="RP.f.emp='';RP.f.dept='';RP.f.proj='';RP.f.status='';RP.render()">Clear filters</button>`:''}
    </div>`;
  }

  function tiles(mdl){
    const {M,rows}=mdl, s=RP.cap().settings, t0=M.t0;
    const wkA=weekStart(t0), wkB=addDays(wkA,6);
    const working=rows.filter(r=>RP.bookedIn(r.p,wkA,wkB)>0).length;
    const pending=rows.reduce((n,r)=>n+r.p.pending,0);
    const over=rows.filter(r=>r.band.k==='over').length;
    const free=rows.reduce((n,r)=>n+r.free,0);
    const nm=addMonths(monthKey(t0),1), na=monthStart(nm), nb=monthEnd(nm);
    const freeNext=rows.filter(r=>{ const c=RP.capacityIn(M,r.p,na,nb); return c>0 && RP.bookedIn(r.p,na,nb)/c*100 < s.availableBelow; }).length;
    const est=rows.reduce((n,r)=>n+r.p.estimated,0);
    const fcs=RP.cap().forecasts; let need=0; fcs.forEach(fc=>{ const e=RP.evaluateForecast(fc); if(e.verdict==='no') need+=1; });
    const tile=(l,v,sm)=>`<div class="rp-tile"><span>${l}</span><b>${v}</b>${sm?`<small>${sm}</small>`:''}</div>`;
    return `<div class="rp-tiles">
      ${tile('Working this week',`${working} / ${rows.length}`,'people with booked hours')}
      ${tile('Pending work',fmtH(pending),'all open tasks')}
      ${tile('Overloaded',over,`over ${s.overFrom}% in ${E(mdl.pr.label)}`)}
      ${tile('Free capacity',fmtH(free),E(mdl.pr.label))}
      ${tile('Available next month',freeNext,`under ${s.availableBelow}% booked in ${monthLabel(nm)}`)}
      ${tile('Forecasts',fcs.length?`${fcs.length - need} of ${fcs.length} fit`:'None',need?`${need} need extra engineers`:(fcs.length?'fit the current team':'add one to check feasibility'))}
    </div>${est?`<p class="rp-note">${est} open task(s) have no planned hours and are counted as full days (${s.dailyHours} h). Enter planned hours in Task Management for more accurate figures.</p>`:''}`;
  }

  /* ---------- Availability ---------- */
  RP.sort={k:'util',d:-1};
  RP.sortBy=function(k){ RP.sort = RP.sort.k===k ? {k,d:-RP.sort.d} : {k,d:-1}; RP.render(); };
  function availability(mdl){
    const {rows,pr}=mdl, s=RP.sort;
    const val=r=>({name:r.p.name,cap:r.capH,proj:r.activeProjects,asg:r.p.assigned,done:r.p.completed,pend:r.p.pending,util:r.util,next:r.p.nextFree,full:r.p.fullyFree,free:r.free}[s.k]);
    rows.sort((a,b)=>{ const x=val(a),y=val(b); return (typeof x==='string'?x.localeCompare(y):(x-y))*s.d; });
    const th=(k,l,n)=>`<th data-sort class="${n?'n':''}" onclick="RP.sortBy('${k}')">${l}${s.k===k?(s.d>0?' ▲':' ▼'):''}</th>`;
    const tot=rows.reduce((o,r)=>({cap:o.cap+r.capH,b:o.b+r.booked,asg:o.asg+r.p.assigned,done:o.done+r.p.completed,pend:o.pend+r.p.pending,free:o.free+r.free}),{cap:0,b:0,asg:0,done:0,pend:0,free:0});
    const tu=tot.cap?tot.b/tot.cap*100:0, tb=RP.band(tu,tot.cap);
    return `<div class="rp-wrap"><table class="rp-t"><thead><tr>${th('name','Employee')}<th>Department</th>${th('cap','Capacity (h)',1)}${th('proj','Active projects',1)}${th('asg','Assigned (h)',1)}${th('done','Completed (h)',1)}${th('pend','Pending (h)',1)}${th('util','Utilization',1)}<th>Status</th>${th('next','Next available')}${th('full','Fully free')}${th('free','Available (h)',1)}</tr></thead><tbody>
      ${rows.map(r=>`<tr><td><button class="rp-link" onclick="RP.person('${E(r.p.key)}')">${E(r.p.name)}</button>${r.p.linked?'':' <span class="muted">(no login)</span>'}</td><td>${E(r.p.dept||'—')}</td><td class="n">${r0(r.capH)}</td><td class="n">${r.activeProjects}</td><td class="n">${r0(r.p.assigned)}</td><td class="n">${r0(r.p.completed)}</td><td class="n">${r0(r.p.pending)}${r.p.overdue>0?` <span class="rp-chip rp-red" title="Overdue pending hours">${r0(r.p.overdue)} overdue</span>`:''}</td><td class="n">${r0(r.util)}%</td><td><span class="rp-chip ${r.band.cls}">${r.band.label}</span></td><td>${r.p.beyond?'After '+fd(mdl.M.horizonEnd):fd(r.p.nextFree)}</td><td>${r.p.fullyFree>mdl.M.horizonEnd?'After '+fd(mdl.M.horizonEnd):fd(r.p.fullyFree)}</td><td class="n">${r0(r.free)}</td></tr>`).join('')||'<tr><td colspan="12">No team members match these filters.</td></tr>'}
      </tbody>${rows.length>1?`<tfoot><tr><td><b>Team total</b></td><td></td><td class="n"><b>${r0(tot.cap)}</b></td><td></td><td class="n"><b>${r0(tot.asg)}</b></td><td class="n"><b>${r0(tot.done)}</b></td><td class="n"><b>${r0(tot.pend)}</b></td><td class="n"><b>${r0(tu)}%</b></td><td><span class="rp-chip ${tb.cls}">${tb.label}</span></td><td></td><td></td><td class="n"><b>${r0(tot.free)}</b></td></tr></tfoot>`:''}</table></div>
      <p class="rp-note">Capacity, utilization and available hours are for ${E(pr.label)}. Assigned, completed and pending hours cover all open tasks. Next available = first working day after which bookings stay under ${RP.cap().settings.freeBelow}% of the day. Fully free = no bookings at all.</p>`;
  }

  RP.person=function(key){
    const M=RP.build({proj:RP.f.proj,status:RP.f.status}), p=M.P[key]; if(!p) return;
    const items=p.items.filter(x=>x.status!=='Completed').sort((a,b)=>String(a.end).localeCompare(String(b.end)));
    const mk=monthKey(M.t0), months=[...Array(6)].map((_,i)=>addMonths(mk,i));
    const strip=months.map(m=>{ const a=monthStart(m),b=monthEnd(m),c=RP.capacityIn(M,p,a,b),bk=RP.bookedIn(p,a,b),u=c?bk/c*100:0,bd=RP.band(u,c); return `<td class="c ${bd.cls}" title="${r0(bk)} h of ${r0(c)} h">${c?r0(u)+'%':'Leave'}</td>`; }).join('');
    twModal(E(p.name)+' — workload',`<p class="muted">${E(p.dept||'')} ${p.designation?'· '+E(p.designation):''} · ${p.daily} h/day · next available ${p.beyond?'after '+fd(M.horizonEnd):fd(p.nextFree)} · fully free ${fd(p.fullyFree)}</p>
      <div class="tablewrap"><table class="rp-t rp-gantt"><thead><tr>${months.map(m=>`<th>${monthLabel(m)}</th>`).join('')}</tr></thead><tbody><tr>${strip}</tr></tbody></table></div>
      <h4 style="margin:14px 0 6px">Open tasks (${items.length})</h4>
      <div class="tablewrap" style="max-height:50vh"><table class="rp-t"><thead><tr><th>Project</th><th>Task</th><th>Status</th><th>Start</th><th>Target</th><th class="n">Planned h</th><th class="n">Done h</th><th class="n">Pending h</th></tr></thead><tbody>
      ${items.map(x=>`<tr><td><b>${E(x.p.code||'')}</b></td><td>${E((x.t&&x.t!==x.item?x.t.name+' / ':'')+(x.item.name||''))}${x.unplanned?' <span class="rp-chip rp-yellow">Unplanned</span>':''}</td><td>${E(x.status)}${x.overdue?' <span class="rp-chip rp-red">Overdue</span>':''}</td><td>${fd(x.start)}</td><td>${fd(x.end)}</td><td class="n">${r0(x.P)}${x.est?'*':''}</td><td class="n">${r0(x.done)}</td><td class="n">${r0(x.pend)}</td></tr>`).join('')||'<tr><td colspan="8">No open tasks.</td></tr>'}
      </tbody></table></div><p class="rp-note">* no planned hours entered; counted as full working days.</p>`,null,'Close',true);
  };

  /* ---------- Timeline (Gantt) ---------- */
  function buckets(pr){
    const out=[];
    if(RP.f.scale==='week'){ let a=weekStart(pr.a); for(let i=0;i<16;i++){ const b=addDays(a,6); out.push({a,b,label:new Date(a+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}); a=addDays(a,7); } }
    else { let m=monthKey(pr.a); for(let i=0;i<12;i++){ out.push({a:monthStart(m),b:monthEnd(m),label:monthLabel(m)}); m=addMonths(m,1); } }
    return out;
  }
  function timeline(mdl){
    const {M,rows,pr}=mdl, bk=buckets(pr);
    const projName=id=>{ const p=(db.projects||[]).find(x=>x.id===id); return p?(p.code||p.name):'Unplanned'; };
    rows.sort((a,b)=>a.p.name.localeCompare(b.p.name));
    const cell=(p,b)=>{ const c=RP.capacityIn(M,p,b.a,b.b), x=RP.bookedIn(p,b.a,b.b), u=c?x/c*100:0, bd=RP.band(u,c);
      const pj={}; for(const d in p.proj) if(d>=b.a&&d<=b.b) for(const k in p.proj[d]) pj[k]=(pj[k]||0)+p.proj[d][k];
      const tip=Object.entries(pj).sort((a,b)=>b[1]-a[1]).map(([k,h])=>`${projName(k)}: ${r0(h)} h`).join('\n');
      return `<td class="c ${bd.cls}" title="${E(p.name)} · ${E(b.label)}\n${r0(x)} h booked of ${r0(c)} h${tip?'\n'+E(tip):''}">${!c?'Leave':u<=0.0001?'Free':r0(u)+'%'}</td>`; };
    const teamRow=bk.map(b=>{ let c=0,x=0; rows.forEach(r=>{ c+=RP.capacityIn(M,r.p,b.a,b.b); x+=RP.bookedIn(r.p,b.a,b.b); }); const u=c?x/c*100:0, bd=RP.band(u,c); return `<td class="c ${bd.cls}" title="Team: ${r0(x)} h of ${r0(c)} h">${r0(u)}%</td>`; }).join('');
    return `<div class="rp-bar"><label>Scale<select onchange="RP.setF('scale',this.value)"><option value="month" ${RP.f.scale!=='week'?'selected':''}>Monthly (12 months)</option><option value="week" ${RP.f.scale==='week'?'selected':''}>Weekly (16 weeks)</option></select></label>
      <div class="rp-legend"><span class="rp-chip rp-green">Available &lt;${RP.cap().settings.availableBelow}%</span><span class="rp-chip rp-yellow">Partially available</span><span class="rp-chip rp-red">Fully occupied</span><span class="rp-chip rp-dark">Overloaded &gt;${RP.cap().settings.overFrom}%</span><span class="rp-chip rp-grey">No allocation / leave</span></div></div>
      <div class="rp-wrap"><table class="rp-t rp-gantt"><thead><tr><th class="nm">Employee</th>${bk.map(b=>`<th style="text-align:center">${E(b.label)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r=>`<tr><td class="nm"><button class="rp-link" onclick="RP.person('${E(r.p.key)}')">${E(r.p.name)}</button></td>${bk.map(b=>cell(r.p,b)).join('')}</tr>`).join('')||`<tr><td colspan="${bk.length+1}">No team members match these filters.</td></tr>`}
      </tbody>${rows.length>1?`<tfoot><tr><td class="nm"><b>Whole team</b></td>${teamRow}</tr></tfoot>`:''}</table></div>
      <p class="rp-note">Hover a cell to see the projects booked in that period. Past days use the scheduled hours; from today, only pending hours on the latest task dates are counted.</p>`;
  }

  /* ---------- Workload distribution ---------- */
  function distribution(mdl){
    const {M,rows,pr}=mdl, s=RP.cap().settings, t0=M.t0, soon=addDays(t0,30);
    const li=(arr,f)=>arr.length?`<ul>${arr.map(f).join('')}</ul>`:'<p class="muted" style="margin:0">None.</p>';
    const over=rows.filter(r=>r.band.k==='over').sort((a,b)=>b.util-a.util);
    const avail=rows.filter(r=>r.capH>0 && r.util<s.availableBelow).sort((a,b)=>b.free-a.free);
    const multi=rows.map(r=>({r,n:RP.projectsIn(r.p,pr.a,pr.b).size})).filter(x=>x.n>=3).sort((a,b)=>b.n-a.n);
    const freeSoon=rows.filter(r=>r.p.nextFree<=soon).sort((a,b)=>a.p.nextFree.localeCompare(b.p.nextFree));
    const overdue=rows.filter(r=>r.p.overdue>0).sort((a,b)=>b.p.overdue-a.p.overdue);
    const delayed=(db.projects||[]).filter(p=>String(p.code||'').trim()).map(p=>({p,d:(typeof projDelay==='function'?projDelay(p):0)})).filter(x=>x.d>0).sort((a,b)=>b.d-a.d);
    const utils=rows.filter(r=>r.capH>0).map(r=>r.util), avg=utils.length?utils.reduce((a,b)=>a+b,0)/utils.length:0;
    const hi=rows.filter(r=>r.capH>0).sort((a,b)=>b.util-a.util)[0], lo=rows.filter(r=>r.capH>0).sort((a,b)=>a.util-b.util)[0];
    return `<div class="rp-card" style="margin-bottom:12px"><h4>Balance in ${E(pr.label)}</h4>${utils.length?`Average utilization <b>${r0(avg)}%</b> · highest <b>${E(hi.p.name)} ${r0(hi.util)}%</b> · lowest <b>${E(lo.p.name)} ${r0(lo.util)}%</b> · spread <b>${r0(hi.util-lo.util)} points</b>${hi.util-lo.util>40?' — work is unevenly distributed; consider moving tasks from the top of the list to people with free capacity.':''}`:'No capacity in this period.'}</div>
    <div class="rp-grid2">
      <div class="rp-card"><h4>Excessive workload (over ${s.overFrom}%)</h4>${li(over,r=>`<li><b>${E(r.p.name)}</b> — ${r0(r.util)}%, ${fmtH(r.booked-r.capH)} over capacity</li>`)}</div>
      <div class="rp-card"><h4>Available capacity (under ${s.availableBelow}%)</h4>${li(avail,r=>`<li><b>${E(r.p.name)}</b> — ${fmtH(r.free)} free (${r0(r.util)}% booked)</li>`)}</div>
      <div class="rp-card"><h4>Handling 3 or more projects at once</h4>${li(multi,x=>`<li><b>${E(x.r.p.name)}</b> — ${x.n} projects in ${E(pr.label)}</li>`)}</div>
      <div class="rp-card"><h4>Free within 30 days</h4>${li(freeSoon,r=>`<li><b>${E(r.p.name)}</b> — from ${fd(r.p.nextFree)}</li>`)}</div>
      <div class="rp-card"><h4>Projects with delayed design activities</h4>${li(delayed,x=>`<li><b>${E(x.p.code)}</b> ${E(x.p.name||'')} — ${x.d} day(s) delay</li>`)}</div>
      <div class="rp-card"><h4>Overdue tasks pushing availability out</h4>${li(overdue,r=>`<li><b>${E(r.p.name)}</b> — ${fmtH(r.p.overdue)} overdue (${r.p.items.filter(i=>i.overdue).length} task(s)), free from ${r.p.beyond?'after '+fd(M.horizonEnd):fd(r.p.nextFree)}</li>`)}</div>
    </div>`;
  }

  /* ---------- Find best engineer ---------- */
  function deptDesigOpts(sel){
    const M=RP.build({}), ps=Object.values(M.P).filter(p=>!p.exclude);
    const d=[...new Set(ps.map(p=>p.dept).filter(Boolean))].sort(), g=[...new Set(ps.map(p=>p.designation).filter(Boolean))].sort();
    return {dept:`<option value="">Any department</option>${d.map(x=>`<option ${x===sel.dept?'selected':''}>${E(x)}</option>`).join('')}`, desig:`<option value="">Any designation</option>${g.map(x=>`<option ${x===sel.designation?'selected':''}>${E(x)}</option>`).join('')}`};
  }
  RP.openBest=function(){
    const t=todayIso(), o=deptDesigOpts({});
    const m=twModal('Find best available engineer',`<div class="tw-2"><div class="tw-f"><label for="rpBs">Start</label><input id="rpBs" type="date" value="${t}"></div><div class="tw-f"><label for="rpBe">Finish</label><input id="rpBe" type="date" value="${addDays(t,13)}"></div></div>
      <div class="tw-2"><div class="tw-f"><label for="rpBh">Estimated hours</label><input id="rpBh" type="number" min="1" value="40"></div><div class="tw-f"><label for="rpBd">Department</label><select id="rpBd">${o.dept}</select></div></div>
      <div class="tw-f"><label for="rpBg">Designation</label><select id="rpBg">${o.desig}</select></div><div id="rpBestOut"></div>`,m=>{
        const opts={start:m.querySelector('#rpBs').value,end:m.querySelector('#rpBe').value,hours:Number(m.querySelector('#rpBh').value),dept:m.querySelector('#rpBd').value,designation:m.querySelector('#rpBg').value};
        if(!opts.start||!opts.end||opts.end<opts.start) return 'Choose a valid date range.';
        if(!(opts.hours>0)) return 'Enter the estimated hours.';
        const list=RP.bestEngineers(opts).slice(0,5);
        m.querySelector('#rpBestOut').innerHTML=`<h4 style="margin:14px 0 6px">Best matches</h4><table class="rp-t"><thead><tr><th>#</th><th>Engineer</th><th class="n">Free h in dates</th><th class="n">Projects in dates</th><th>Next available</th><th>Can do alone?</th></tr></thead><tbody>${list.map((x,i)=>`<tr><td>${i+1}</td><td><b>${E(x.p.name)}</b></td><td class="n">${r0(x.free)}</td><td class="n">${x.projects}</td><td>${fd(x.nextFree)}</td><td>${x.canAlone?'<span class="rp-chip rp-green">Yes</span>':`<span class="rp-chip rp-yellow">Needs ${r0(opts.hours-x.free)} h more</span>`}</td></tr>`).join('')||'<tr><td colspan="6">No engineers match.</td></tr>'}</tbody></table><p class="rp-note">Ranked by: can finish alone, then most free hours, then fewest parallel projects, then earliest availability. This is a suggestion; assign the task in Task Management.</p>`;
        return ' ';
      },'Find',true);
    m.querySelector('[data-err]').style.display='none';
  };

  /* ---------- Future Project Forecast ---------- */
  const verdictChip=e=> e.verdict==='yes'?'<span class="rp-chip rp-green">Can accommodate</span>': e.verdict==='tight'?'<span class="rp-chip rp-yellow">Tight</span>': e.verdict==='no'?`<span class="rp-chip rp-red">Needs ${e.extraPeople} more engineer(s)</span>`:'<span class="rp-chip rp-grey">Incomplete</span>';
  function forecasts(){
    const fcs=RP.cap().forecasts;
    if(!fcs.length) return `<div class="rp-card"><h4>No forecasts yet</h4><p class="muted">Create a Future Project Forecast to check whether the current team can take on a new project. Forecasts never change confirmed project schedules.</p>${RP.can('Add')?'<button class="primary" onclick="RP.editForecast()">+ Future Project Forecast</button>':''}</div>`;
    if(!fcs.some(f=>f.id===RP.fcSel)) RP.fcSel=fcs[0].id;
    const sel=fcs.find(f=>f.id===RP.fcSel);
    return `<div class="rp-wrap" style="max-height:none"><table class="rp-t"><thead><tr><th>Project</th><th>Name</th><th>Start</th><th>Design completion</th><th class="n">Hours</th><th>Resource type</th><th>Result</th><th class="n">Extra hours</th><th></th></tr></thead><tbody>
      ${fcs.map(f=>{ const e=RP.evaluateForecast(f); return `<tr style="${f.id===RP.fcSel?'background:var(--sb-hover,#eeeef0)':''}"><td><button class="rp-link" onclick="RP.fcSel='${f.id}';RP.render()"><b>${E(f.code)}</b></button></td><td>${E(f.name||'')}</td><td>${fd(f.start)}</td><td>${fd(f.end)}</td><td class="n">${r0(f.hours)}</td><td>${E([f.dept,f.designation].filter(Boolean).join(' · ')||'Any')}</td><td>${verdictChip(e)}</td><td class="n">${r0(e.extraHours)}</td><td><div class="actions" style="flex-wrap:nowrap">${RP.can('Edit')||(typeof twAdmin==='function'&&twAdmin())?`<button class="small" onclick="RP.editForecast('${f.id}')">Edit</button>`:''}${RP.can('Delete')||(typeof twAdmin==='function'&&twAdmin())?`<button class="small danger" onclick="RP.delForecast('${f.id}')">Delete</button>`:''}</div></td></tr>`; }).join('')}
      </tbody></table></div>${sel?forecastDetail(sel):''}`;
  }
  function forecastDetail(fc){
    const e=RP.evaluateForecast(fc);
    if(e.verdict==='incomplete') return '<p class="rp-note">Enter start, completion date and hours to evaluate this forecast.</p>';
    const M=RP.build({});
    const tone=e.verdict==='yes'?'rp-green':e.verdict==='tight'?'rp-yellow':'rp-red';
    const totalReq=e.months.reduce((n,m)=>n+m.req,0), totalFree=e.months.reduce((n,m)=>n+m.free,0);
    const msg=e.verdict==='yes'?`Yes — ${E(fc.code)} fits. The team has ${fmtH(totalFree)} free against ${fmtH(totalReq)} required, without moving any confirmed work.`
      : e.verdict==='tight'?`Possible but tight — ${E(fc.code)} would use over 90% of the free hours in at least one month. Any new delay or unplanned task could push it over.`
      : `Not with the current team — ${E(fc.code)} is short by ${fmtH(e.extraHours)}. You need ${e.extraPeople} additional engineer(s) in the busiest month, or a later start / longer design period.`;
    const sug=Object.entries(e.suggestion).sort((a,b)=>b[1]-a[1]);
    return `<h3 style="margin:18px 0 4px">${E(fc.code)} ${E(fc.name||'')}</h3><div class="rp-verdict ${tone}">${msg}</div>
      <div class="rp-grid2"><div class="rp-card"><h4>Month by month</h4><table class="rp-t"><thead><tr><th>Month</th><th class="n">Working days</th><th class="n">Required h</th><th class="n">Team free h</th><th class="n">Shortfall h</th><th class="n">Extra engineers</th></tr></thead><tbody>
      ${e.months.map(m=>`<tr><td>${monthLabel(m.m)}</td><td class="n">${m.workDays}</td><td class="n">${r0(m.req)}</td><td class="n">${r0(m.free)}</td><td class="n">${m.short>0?`<b>${r0(m.short)}</b>`:'0'}</td><td class="n">${m.extra}</td></tr>`).join('')}
      </tbody><tfoot><tr><td><b>Total</b></td><td></td><td class="n"><b>${r0(totalReq)}</b></td><td class="n"><b>${r0(totalFree)}</b></td><td class="n"><b>${r0(e.extraHours)}</b></td><td class="n"><b>${e.extraPeople}</b></td></tr></tfoot></table></div>
      <div class="rp-card"><h4>Suggested allocation (${fmtH(sug.reduce((n,x)=>n+x[1],0))})</h4>${sug.length?`<table class="rp-t"><thead><tr><th>Engineer</th><th class="n">Hours</th><th class="n">Free in window</th></tr></thead><tbody>${sug.map(([k,h])=>{const p=M.P[k];return `<tr><td>${E(p?p.name:k)}</td><td class="n">${r0(h)}</td><td class="n">${r0(p?RP.freeIn(M,p,fc.start,fc.end):0)}</td></tr>`}).join('')}</tbody></table>`:'<p class="muted">No free hours in this window.</p>'}<p class="rp-note">Fills each month with the engineers who have the most free time. A planning aid only; nothing is booked.</p></div></div>
      <div class="rp-grid2" style="margin-top:12px">
        <div class="rp-card"><h4>Available in this period (${e.free.length})</h4>${e.free.length?`<ul>${e.free.sort((a,b)=>b.free-a.free).map(r=>`<li><b>${E(r.p.name)}</b> — ${fmtH(r.free)} free, ${r0(r.util)}% booked</li>`).join('')}</ul>`:'<p class="muted">Nobody is under '+RP.cap().settings.availableBelow+'% booked.</p>'}</div>
        <div class="rp-card"><h4>Occupied with existing projects (${e.busy.length})</h4>${e.busy.length?`<ul>${e.busy.sort((a,b)=>b.util-a.util).map(r=>`<li><b>${E(r.p.name)}</b> — ${r0(r.util)}% booked · ${[...r.projects].map(id=>{const p=(db.projects||[]).find(x=>x.id===id);return E(p?p.code:'Unplanned')}).join(', ')||'—'}</li>`).join('')}</ul>`:'<p class="muted">None.</p>'}</div>
        <div class="rp-card"><h4>Becoming free during the period (${e.freeing.length})</h4>${e.freeing.length?`<ul>${e.freeing.sort((a,b)=>a.p.nextFree.localeCompare(b.p.nextFree)).map(r=>`<li><b>${E(r.p.name)}</b> — from ${fd(r.p.nextFree)}</li>`).join('')}</ul>`:'<p class="muted">None.</p>'}</div>
      </div>${fc.notes?`<p class="rp-note">Notes: ${E(fc.notes)}</p>`:''}`;
  }
  RP.editForecast=function(id){
    const fcs=RP.cap().forecasts, fc=id?fcs.find(f=>f.id===id):null;
    if(fc && !(RP.can('Edit')||(typeof twAdmin==='function'&&twAdmin()))) return toast('You do not have permission to edit forecasts.');
    if(!fc && !RP.can('Add')) return toast('You do not have permission to add forecasts.');
    const v=fc||{code:'',name:'',start:'',end:'',hours:'',dept:'',designation:'',split:{},notes:''}, o=deptDesigOpts(v);
    const splitTxt=Object.entries(v.split||{}).filter(([,h])=>Number(h)>0).map(([m,h])=>`${m}: ${h}`).join('\n');
    twModal(fc?'Edit Future Project Forecast':'New Future Project Forecast',`<div class="tw-2"><div class="tw-f"><label for="rpFc">Project code</label><input id="rpFc" maxlength="40" value="${E(v.code)}" placeholder="e.g. A1750" required></div><div class="tw-f"><label for="rpFn">Project name</label><input id="rpFn" maxlength="120" value="${E(v.name||'')}"></div></div>
      <div class="tw-2"><div class="tw-f"><label for="rpFs">Expected start</label><input id="rpFs" type="date" value="${E(v.start)}" required></div><div class="tw-f"><label for="rpFe">Expected design completion</label><input id="rpFe" type="date" value="${E(v.end)}" required></div></div>
      <div class="tw-2"><div class="tw-f"><label for="rpFh">Estimated workload (hours)</label><input id="rpFh" type="number" min="1" step="1" value="${E(v.hours)}" required></div><div class="tw-f"><label for="rpFd">Required department</label><select id="rpFd">${o.dept}</select></div></div>
      <div class="tw-f"><label for="rpFg">Required designation</label><select id="rpFg">${o.desig}</select></div>
      <div class="tw-f"><label for="rpFsp">Monthly split (optional)</label><textarea id="rpFsp" rows="3" placeholder="2027-01: 205&#10;2027-02: 195">${E(splitTxt)}</textarea><span class="muted" style="font-size:12px">Leave empty to spread the hours evenly over the working days.</span></div>
      <div class="tw-f"><label for="rpFno">Notes</label><textarea id="rpFno" rows="2">${E(v.notes||'')}</textarea></div>`,m=>{
        const g=s=>m.querySelector(s).value.trim();
        const rec={id:fc?fc.id:(typeof uid==='function'?uid():String(Date.now())), code:g('#rpFc'), name:g('#rpFn'), start:g('#rpFs'), end:g('#rpFe'), hours:Number(g('#rpFh')), dept:g('#rpFd'), designation:g('#rpFg'), notes:g('#rpFno'), split:{}, by:fc?.by||TW.me, at:fc?.at||Date.now(), updatedBy:TW.me, updatedAt:Date.now()};
        if(!rec.code) return 'Enter the project code.';
        if(!rec.start||!rec.end) return 'Enter the expected start and completion dates.';
        if(rec.end<rec.start) return 'Completion cannot be before the start.';
        if(!(rec.hours>0)) return 'Enter the estimated hours.';
        let sum=0, bad='';
        g('#rpFsp').split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(line=>{ const mm=line.match(/^(\d{4}-\d{2})\s*[:=]\s*(\d+(?:\.\d+)?)$/); if(!mm){ bad=line; return; } if(mm[1]<monthKey(rec.start)||mm[1]>monthKey(rec.end)) bad=line; rec.split[mm[1]]=Number(mm[2]); sum+=Number(mm[2]); });
        if(bad) return `Monthly split line not understood or outside the project dates: "${bad}". Use YYYY-MM: hours.`;
        if(sum>0 && Math.abs(sum-rec.hours)>0.5) return `Monthly split adds up to ${sum} h but the estimate is ${rec.hours} h.`;
        if(fc) Object.assign(fc,rec); else fcs.push(rec);
        RP.fcSel=rec.id; RP.tab='forecast'; RP.invalidate(); save(false); toast('Forecast saved. Confirmed project schedules were not changed.'); RP.render();
      },fc?'Save':'Create forecast',true);
  };
  RP.delForecast=function(id){
    if(!(RP.can('Delete')||(typeof twAdmin==='function'&&twAdmin()))) return toast('You do not have permission to delete forecasts.');
    const fcs=RP.cap().forecasts, i=fcs.findIndex(f=>f.id===id); if(i<0) return;
    if(!confirm(`Delete forecast ${fcs[i].code}? Confirmed projects are not affected.`)) return;
    fcs.splice(i,1); save(false); toast('Forecast deleted.'); RP.render();
  };

  /* ---------- Capacity settings ---------- */
  function settings(mdl){
    const s=RP.cap().settings, people=Object.values(mdl.M.P).sort((a,b)=>a.name.localeCompare(b.name));
    const num=(k,l,min,max,step)=>`<label>${l}<input type="number" id="rpS_${k}" min="${min}" max="${max}" step="${step||1}" value="${E(s[k])}"></label>`;
    return `<div class="rp-card" style="margin-bottom:12px"><h4>Team defaults</h4><div class="rp-bar">
      ${num('dailyHours','Default hours per day',1,24,0.5)}${num('availableBelow','Available below (%)',1,200)}${num('fullFrom','Fully loaded from (%)',1,200)}${num('overFrom','Overloaded above (%)',1,300)}${num('freeBelow','"Free" when a day is under (%)',1,100)}${num('horizonMonths','Planning horizon (months)',3,36)}
      <label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="rpS_estimateMissing" ${s.estimateMissing?'checked':''} style="width:auto">Count tasks without planned hours as full days</label></div>
      <p class="rp-note">Working days are Monday–Friday excluding the holidays set in Workload. These settings are shared with every user and also drive the Workload screen's capacity.</p></div>
      <div class="rp-card"><h4>People</h4><div class="rp-wrap"><table class="rp-t"><thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th class="n">Hours / day</th><th>Leave dates</th><th>Exclude from planning</th></tr></thead><tbody>
      ${people.map(p=>{ const c=RP.cap().people[p.key]||{}; return `<tr data-k="${E(p.key)}"><td>${E(p.name)}${p.linked?'':' <span class="muted">(no login)</span>'}</td><td>${E(p.dept||'—')}</td><td>${E(p.designation||'—')}</td><td class="n"><input class="rp-h" type="number" min="0.5" max="24" step="0.5" value="${E(c.hours||'')}" placeholder="${s.dailyHours}" style="width:80px"></td><td><input class="rp-l" value="${E(c.leave||'')}" placeholder="2026-12-24..2026-12-31, 2027-01-15" style="min-width:280px"></td><td><input class="rp-x" type="checkbox" ${c.exclude?'checked':''} style="width:auto"></td></tr>`; }).join('')}
      </tbody></table></div><p class="rp-note">Leave: single dates or ranges (YYYY-MM-DD..YYYY-MM-DD), separated by commas. Exclude people who do not take design work (e.g. HOD).</p>
      <div class="actions" style="margin-top:10px"><button class="primary" onclick="RP.saveSettings()">Save capacity settings</button>${(typeof twAdmin==='function'&&twAdmin())?'<button onclick="RP.importLocal()">Import capacity saved in this browser</button>':''}</div></div>`;
  }
  RP.saveSettings=function(){
    if(!RP.canEdit()) return toast('You do not have permission to change capacity settings.');
    const c=RP.cap(), s=c.settings, q=id=>document.getElementById('rpS_'+id);
    const n=(id,min,max)=>{ const v=Number(q(id).value); return v>=min&&v<=max?v:s[id]; };
    const ns={dailyHours:n('dailyHours',1,24), availableBelow:n('availableBelow',1,200), fullFrom:n('fullFrom',1,200), overFrom:n('overFrom',1,300), freeBelow:n('freeBelow',1,100), horizonMonths:n('horizonMonths',3,36), estimateMissing:q('estimateMissing').checked};
    if(!(ns.availableBelow<ns.fullFrom && ns.fullFrom<=ns.overFrom)) return toast('Thresholds must increase: Available < Fully loaded ≤ Overloaded.');
    let bad='';
    document.querySelectorAll('#capacity tr[data-k]').forEach(tr=>{
      const k=tr.dataset.k, h=Number(tr.querySelector('.rp-h').value), l=tr.querySelector('.rp-l').value.trim(), x=tr.querySelector('.rp-x').checked;
      if(l && !l.split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean).every(v=>/^\d{4}-\d{2}-\d{2}(\s*\.\.\s*\d{4}-\d{2}-\d{2})?$/.test(v))) bad=bad||tr.cells[0].textContent;
      const rec={}; if(h>0&&h<=24) rec.hours=h; if(l) rec.leave=l; if(x) rec.exclude=true;
      if(Object.keys(rec).length) c.people[k]=rec; else delete c.people[k];
    });
    if(bad) return toast('Leave dates for '+bad+' are not in YYYY-MM-DD format.');
    Object.assign(s,ns); RP.invalidate(); save(false); toast('Capacity settings saved for everyone.'); RP.render();
  };
  RP.importLocal=function(){
    let x={}; try{ x=JSON.parse(localStorage.getItem('edptWorkloadCapacityV1')||'{}'); }catch(e){}
    const ent=Object.entries(x).filter(([,h])=>Number(h)>0&&Number(h)<=24);
    if(!ent.length) return toast('No capacity values are saved in this browser.');
    const c=RP.cap(); ent.forEach(([n,h])=>{ const k=norm(n); c.people[k]={...(c.people[k]||{}), hours:Number(h)}; });
    RP.invalidate(); save(false); toast(`Imported ${ent.length} capacity value(s) into the shared settings.`); RP.render();
  };

  /* ---------- Reports + Excel ---------- */
  function xcol(i){ let s=''; i++; while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; }
  function workbook(sheets){
    const x=t=>String(t??'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
    const sheetXml=sh=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${sh.head}" topLeftCell="A${sh.head+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${sh.rows[sh.head-1].map((_,i)=>`<col min="${i+1}" max="${i+1}" width="${(sh.widths&&sh.widths[i])||16}" customWidth="1"/>`).join('')}</cols><sheetData>${sh.rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>{ const ref=xcol(ci)+(ri+1), sty=ri===0?' s="2"':ri===sh.head-1?' s="1"':''; return (typeof v==='number'&&isFinite(v))?`<c r="${ref}"${sty}><v>${Math.round(v*10)/10}</v></c>`:`<c r="${ref}" t="inlineStr"${sty}><is><t xml:space="preserve">${x(v)}</t></is></c>`; }).join('')}</row>`).join('')}</sheetData></worksheet>`;
    const names=sheets.map((s,i)=>String(s.name).replace(/[\\\/\?\*\[\]:]/g,' ').slice(0,31)||('Sheet'+(i+1)));
    const files=[['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
      ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n,i)=>`<sheet name="${x(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F0EC"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']];
    sheets.forEach((sh,i)=>files.push([`xl/worksheets/sheet${i+1}.xml`,sheetXml(sh)]));
    return zipStore(files);
  }
  RP.workbook=workbook;
  function download(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(a.href); },500); }

  function reportDefs(){
    const mdl=model(), {M,rows,pr}=mdl, s=RP.cap().settings;
    const filt=[RP.f.emp&&('Employee: '+(M.P[RP.f.emp]?.name||'')), RP.f.dept&&('Department: '+RP.f.dept), RP.f.proj&&('Project: '+((db.projects||[]).find(p=>p.id===RP.f.proj)?.code||'')), RP.f.status&&('Status: '+RP.f.status)].filter(Boolean).join(' · ')||'Whole team, all projects';
    const meta=title=>[`${title} — ${pr.label} (${fd(pr.a)} to ${fd(pr.b)}) — ${filt} — exported ${fd(todayIso())}`];
    const mk0=monthKey(pr.a), months=[...Array(12)].map((_,i)=>addMonths(mk0,i));
    const projOf=id=>(db.projects||[]).find(p=>p.id===id);
    const ppl=rows.map(r=>r.p).sort((a,b)=>a.name.localeCompare(b.name));
    const D={};
    D.util={name:'Monthly Utilization',title:'Monthly Resource Utilization Report',w:[26,20,12,14,14,14,14,20],head:['Employee','Department','Month','Capacity (h)','Booked (h)','Free (h)','Utilization %','Status'],
      rows:()=>ppl.flatMap(p=>months.map(m=>{ const a=monthStart(m),b=monthEnd(m),c=RP.capacityIn(M,p,a,b),x=RP.bookedIn(p,a,b),u=c?x/c*100:0; return [p.name,p.dept,monthLabel(m),c,x,Math.max(c-x,0),Math.round(u),RP.band(u,c).label]; }))};
    D.pending={name:'Pending Work',title:'Employee-wise Pending Work Report',w:[24,12,28,36,14,12,12,12,12,12,10,10],head:['Employee','Project code','Project','Task','Status','Start','Target','Planned (h)','Completed (h)','Pending (h)','Estimated','Overdue'],
      rows:()=>ppl.flatMap(p=>p.items.filter(x=>x.status!=='Completed'&&x.pend>0).sort((a,b)=>String(a.end).localeCompare(String(b.end))).map(x=>[p.name,x.p.code||'',x.p.name||'',(x.t&&x.t!==x.item?x.t.name+' / ':'')+(x.item.name||''),x.status,x.start,x.end,x.P,x.done,x.pend,x.est?'Yes':'',x.overdue?'Yes':'']))};
    D.project={name:'Project Allocation',title:'Project-wise Resource Allocation Report',w:[14,30,24,14,14,14,18],head:['Project code','Project','Employee','Assigned (h)','Completed (h)','Pending (h)','Share of project pending %'],
      rows:()=>{ const by={}; ppl.forEach(p=>p.items.filter(x=>x.status!=='Completed'&&!x.logOnly).forEach(x=>{ const k=x.p.id; (by[k] ||= {p:x.p,per:{}}); const o=(by[k].per[p.key] ||= {n:p.name,a:0,d:0,r:0}); o.a+=x.P; o.d+=x.done; o.r+=x.pend; })); const out=[]; Object.values(by).sort((a,b)=>String(a.p.code).localeCompare(String(b.p.code))).forEach(g=>{ const tot=Object.values(g.per).reduce((n,o)=>n+o.r,0); Object.values(g.per).sort((a,b)=>b.r-a.r).forEach(o=>out.push([g.p.code||'',g.p.name||'',o.n,o.a,o.d,o.r,tot?Math.round(o.r/tot*100):0])); }); return out; }};
    const nm6=[...Array(6)].map((_,i)=>addMonths(monthKey(M.t0),i));
    D.future={name:'Future Availability',title:'Future Resource Availability Report',w:[24,20,20,12,16,14,...nm6.map(()=>14)],head:['Employee','Department','Designation','Hours/day','Next available','Fully free',...nm6.map(m=>'Free h '+monthLabel(m))],
      rows:()=>ppl.map(p=>[p.name,p.dept,p.designation,p.daily,p.beyond?'After '+M.horizonEnd:p.nextFree,p.fullyFree,...nm6.map(m=>RP.freeIn(M,p,monthStart(m),monthEnd(m)))])};
    D.over={name:'Overloaded',title:'Overloaded Resource Report',w:[24,12,14,14,14,14,40],head:['Employee','Month','Capacity (h)','Booked (h)','Excess (h)','Utilization %','Projects'],
      rows:()=>ppl.flatMap(p=>months.map(m=>{ const a=monthStart(m),b=monthEnd(m),c=RP.capacityIn(M,p,a,b),x=RP.bookedIn(p,a,b),u=c?x/c*100:0; if(!(c>0&&u>s.overFrom)) return null; return [p.name,monthLabel(m),c,x,x-c,Math.round(u),[...RP.projectsIn(p,a,b)].map(id=>projOf(id)?.code||'Unplanned').join(', ')]; }).filter(Boolean))};
    const fcs=RP.cap().forecasts.map(f=>({f,e:RP.evaluateForecast(f)}));
    const vt=e=>e.verdict==='yes'?'Can accommodate':e.verdict==='tight'?'Tight':e.verdict==='no'?'Cannot accommodate':'Incomplete';
    D.forecast={name:'Capacity Forecast',title:'Upcoming Project Capacity Forecast',w:[14,26,12,14,14,14,14,16,20],head:['Project code','Project','Month','Working days','Required (h)','Team free (h)','Shortfall (h)','Extra engineers','Verdict'],
      rows:()=>fcs.flatMap(({f,e})=>e.months.map(m=>[f.code,f.name||'',monthLabel(m.m),m.workDays,m.req,m.free,m.short,m.extra,vt(e)]))};
    D.extra={name:'Additional Resources',title:'Additional Resource Requirement Report',w:[30,12,18,18,40],head:['Resource type','Month','Shortfall (h)','Extra engineers','Forecasts'],
      rows:()=>{ const g={}; fcs.forEach(({f,e})=>e.months.forEach(m=>{ if(!(m.short>0)) return; const k=([f.dept,f.designation].filter(Boolean).join(' · ')||'Any')+'|'+m.m; (g[k] ||= {t:k.split('|')[0],m:m.m,h:0,wd:m.workDays,fc:[]}); g[k].h+=m.short; g[k].fc.push(f.code); })); return Object.values(g).sort((a,b)=>a.m.localeCompare(b.m)).map(x=>[x.t,monthLabel(x.m),x.h,x.wd?Math.ceil(x.h/(x.wd*(Number(s.dailyHours)||8))):0,x.fc.join(', ')]); }};
    Object.values(D).forEach(d=>d.meta=meta(d.title));
    return D;
  }
  RP.reportDefs=reportDefs;
  function sheetOf(d){ const body=d.rows(); return {name:d.name, head:2, widths:d.w, rows:[d.meta, d.head, ...(body.length?body:[['No rows for these filters.']])]}; }
  RP.exportReport=function(k){
    try{ const D=reportDefs(); const list=k==='all'?Object.values(D):[D[k]]; download(workbook(list.map(sheetOf)), (k==='all'?'Resource_Planning_Reports':list[0].name.replace(/\s+/g,'_'))+'_'+todayIso()+'.xlsx'); toast('Excel report downloaded.'); }
    catch(e){ console.error(e); toast('Export failed: '+e.message); }
  };
  function reports(){
    const info=[['util','Monthly Resource Utilization','Capacity, booked and free hours with utilization % for each person over 12 months from the selected period.'],['pending','Employee-wise Pending Work','Every open task with planned, completed and pending hours, overdue and estimated flags.'],['project','Project-wise Resource Allocation','Who is working on each project and how much of its pending work each person holds.'],['future','Future Resource Availability','Next available date and free hours per person for the next 6 months.'],['over','Overloaded Resource Report','Every person-month above the overloaded threshold, with excess hours and projects.'],['forecast','Upcoming Project Capacity Forecast','Each saved forecast month by month: required, free, shortfall and verdict.'],['extra','Additional Resource Requirement','Extra engineers needed per resource type and month across all forecasts.']];
    return `<div class="actions" style="margin-bottom:12px"><button class="primary" onclick="RP.exportReport('all')">Export all reports (one Excel workbook)</button></div><div class="rp-reports">${info.map(([k,t,d])=>`<div class="rp-card"><h4>${t}</h4><p>${d}</p><button class="small" onclick="RP.exportReport('${k}')">Export to Excel</button></div>`).join('')}</div><p class="rp-note">Reports use the period and filters selected above.</p>`;
  }
})();
