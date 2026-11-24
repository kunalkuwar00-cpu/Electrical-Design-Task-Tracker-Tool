/* ===== ADPT v26.0 — Activity Log: Daily tasks, Project Review tasks, Unplanned tasks and Review updates in one place =====
   Read-only view over existing data (db.daily, db.unplanned, db.reviews). Export to Excel for any date range.
   Also: "Yesterday" in Daily Tasks, a Task Activity panel on the Dashboard, and the Dashboard shortcut to Team Capacity. */
(function(){
  'use strict';
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const today=()=>typeof twToday==='function'?twToday():iso(new Date());
  const add=(s,n)=>{ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return iso(d); };
  const wk=s=>{ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()-((d.getDay()+6)%7)); return iso(d); };
  const ms2d=v=>v?iso(new Date(v)):'';
  const E=s=>typeof esc==='function'?esc(s):String(s??'');
  const fd=s=>s?(typeof fmtDate==='function'?fmtDate(s):s):'—';
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  const AL=window.AL={type:'all',range:'today',from:'',to:'',basis:'active',person:'',status:'',proj:'',q:''};

  function rangeOf(k,from,to){
    const t=today(), d=new Date(t+'T12:00:00');
    if(k==='all') return {a:'0000-01-01',b:'9999-12-31',label:'All dates'};
    if(k==='today') return {a:t,b:t,label:'Today'};
    if(k==='yesterday'){ let y=add(t,-1); return {a:y,b:y,label:'Yesterday'}; }
    if(k==='week'){ const a=wk(t); return {a,b:add(a,6),label:'This week'}; }
    if(k==='lastweek'){ const a=add(wk(t),-7); return {a,b:add(a,6),label:'Last week'}; }
    if(k==='month'){ return {a:iso(new Date(d.getFullYear(),d.getMonth(),1,12)),b:iso(new Date(d.getFullYear(),d.getMonth()+1,0,12)),label:'This month'}; }
    if(k==='lastmonth'){ return {a:iso(new Date(d.getFullYear(),d.getMonth()-1,1,12)),b:iso(new Date(d.getFullYear(),d.getMonth(),0,12)),label:'Last month'}; }
    const a=from||t, b=to&&to>=a?to:a; return {a,b,label:`${fd(a)} – ${fd(b)}`};
  }
  window.edptRangeOf=rangeOf;

  /* ---------- people (only active logins when the roster is on) ---------- */
  function personKey(id){ const al=window.EDPT_ALIAS_TO_PROFILE||{}; const k=String(id||'').toLowerCase(); return al[k]||id; }
  function activeId(id){ const k=personKey(id); if(typeof window.edptIsActivePerson!=='function'||!window.EDPT_ROSTER_ACTIVE) return !!k; return window.edptIsActivePerson(k); }
  function idForName(name){ const n=norm(name); if(!n) return ''; const hit=Object.entries(db.users||{}).find(([id,u])=>norm(u.owner)===n||norm(u.name)===n); if(hit) return hit[0];
    const al=window.EDPT_ALIAS_TO_PROFILE||{}; const any=Object.getOwnPropertyNames(db.users||{}).find(id=>{const u=db.users[id];return u&&(norm(u.owner)===n||norm(u.name)===n);}); return any?(al[any.toLowerCase()]||any):''; }
  const nameOf=id=>id?(typeof twName==='function'?twName(personKey(id)):id):'—';
  const projOf=id=>(db.projects||[]).find(p=>p.id===id);

  /* ---------- collect all activity as rows ---------- */
  function rows(){
    const t0=today(), out=[];
    (db.daily||[]).forEach(t=>{
      if(!activeId(t.assigneeId)) return;
      const review=t.source==='Project Review', closed=t.status==='Closed', closedOn=closed?ms2d(t.closedAt)||t.date||'':'';
      const created=ms2d(t.at)||t.start||'', start=t.start||created, due=t.date||'';
      out.push({kind:review?'review':'daily', typeLabel:review?'Project Review task':'Daily task', id:t.id, ref:t,
        project:projOf(t.projectId), task:t.title||'', person:personKey(t.assigneeId), by:t.assignerId?personKey(t.assignerId):'',
        created, start, due, status:t.status||'Open', closedOn, closedBy:t.closedBy?personKey(t.closedBy):'',
        remarks:t.closeNote||(t.log&&t.log.length?t.log[t.log.length-1].remark:'')||t.notes||'', priority:t.priority||'',
        hours:null, overdue:!closed&&due&&due<t0,
        activeTo: closed?(closedOn||due||start):(due&&due>t0?due:t0)});
    });
    const subs={}; (db.projects||[]).forEach(p=>(p.tasks||[]).forEach(mt=>(mt.subs||[]).forEach(s=>subs[s.id]={s,p,mt})));
    (db.unplanned||[]).forEach(u=>{
      const pid=idForName(u.person); if(window.EDPT_ROSTER_ACTIVE && (!pid||!activeId(pid))) return;
      const link=u.subId&&subs[u.subId], s=link&&link.s, st=s?(s.status||'Not Started'):'Completed', closed=st==='Completed';
      const start=u.date||'', end=(s&&s.target)||u.endDate||u.date||'';
      out.push({kind:'unplanned', typeLabel:'Unplanned task', id:u.id, ref:u, project:projOf(u.projectId), task:(s&&s.name)||u.note||'Unplanned task',
        person:pid||u.person, by:u.by?personKey(u.by):'', created:ms2d(u.at)||start, start, due:end, status:st, closedOn:closed?(s&&s.completedAt?ms2d(s.completedAt):end):'',
        closedBy:'', remarks:u.reason||u.note||'', priority:'', hours:Number(u.hours)||0, overdue:!closed&&end&&end<t0, activeTo:closed?end:(end>t0?end:t0)});
    });
    /* weekly Project Review status entries are kept in Project Review, not in this log (v33.4) */
    return out;
  }
  window.edptActivityRows=rows;

  function inRange(r,a,b,basis){
    if(a==='0000-01-01'&&b==='9999-12-31') return basis==='closed'?!!r.closedOn:basis==='due'?!!r.due:true;
    if(basis==='created') return r.created>=a && r.created<=b;
    if(basis==='closed') return !!r.closedOn && r.closedOn>=a && r.closedOn<=b;
    if(basis==='due') return !!r.due && r.due>=a && r.due<=b;
    // active: worked on / open during the period, created, or closed in it
    const s=r.start||r.created||'', e=r.activeTo||s;
    return (s<=b && e>=a) || (r.created>=a&&r.created<=b) || (r.closedOn&&r.closedOn>=a&&r.closedOn<=b);
  }
  function filtered(opts){
    const o=opts||AL, R=rangeOf(o.range,o.from,o.to), q=norm(o.q);
    return {R, list:rows().filter(r=>inRange(r,R.a,R.b,o.basis)
      && (!o.person || r.person===o.person || personKey(r.person)===o.person)
      && (!o.proj || (r.project&&r.project.id===o.proj))
      && (!o.status || (o.status==='open'?r.status!=='Closed'&&r.status!=='Completed'&&r.kind!=='update':o.status==='closed'?(r.status==='Closed'||r.status==='Completed'):o.status==='overdue'?r.overdue:true))
      && (!q || norm([r.task,nameOf(r.person),r.project&&r.project.code,r.project&&r.project.name,r.remarks].join(' ')).includes(q)))
      .sort((x,y)=>String(y.start||y.created).localeCompare(String(x.start||x.created)))};
  }

  /* ---------- styles + section + menu ---------- */
  const st=document.createElement('style'); st.textContent=`
  #activity .al-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:10px 0 12px}
  #activity .al-bar label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--sb-mut,#71717a)}
  #activity .al-seg{display:inline-flex;border:1px solid var(--sb-line,#e4e4e7);border-radius:7px;overflow:hidden;flex-wrap:wrap}
  #activity .al-seg button{border:0;border-radius:0;padding:6px 11px;background:none;font-size:13px}
  #activity .al-seg button.on{background:var(--tw-green,#1f9d61);color:#fff}
  #activity .al-tiles,.al-dash .al-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0 14px}
  .al-tile{background:var(--sb-panel,#fff);border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;padding:10px 14px;cursor:pointer;text-align:left}
  .al-tile span{font-size:12px;color:var(--sb-mut,#71717a)} .al-tile b{display:block;font-size:22px;font-weight:600;margin-top:2px}
  #activity .al-wrap{overflow:auto;max-height:65vh;border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;background:var(--sb-panel,#fff)}
  #activity table.al-t,.al-dash table.al-t{width:100%;border-collapse:collapse;font-size:13px;min-width:0!important}
  #activity table.al-t th,#activity table.al-t td,.al-dash table.al-t th,.al-dash table.al-t td{padding:8px 9px;border-bottom:1px solid var(--sb-line,#e4e4e7);text-align:left;vertical-align:top}
  #activity table.al-t th{position:sticky;top:0;background:var(--sb-panel,#fff);font-size:12px;color:var(--sb-mut,#71717a);font-weight:600;z-index:1}
  .al-chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:600;white-space:nowrap}
  .al-daily{background:#3b82f622;color:#2563eb} .al-review{background:#8b5cf622;color:#7c3aed} .al-unplanned{background:#f59e0b26;color:#b45309} .al-update{background:#71717a1f;color:#71717a}
  .al-open{background:#3b82f622;color:#2563eb} .al-closed{background:#1f9d6126;color:#137a49} .al-over{background:#e5484d26;color:#b4232a}
  html[data-theme=dark] .al-daily,html[data-theme=dark] .al-open{color:#7aa7ff} html[data-theme=dark] .al-review{color:#b59cff} html[data-theme=dark] .al-unplanned{color:#f5b35a} html[data-theme=dark] .al-closed{color:#4fd08f} html[data-theme=dark] .al-over{color:#ff8a8f}
  #activity .al-rm{max-width:340px;white-space:pre-wrap;color:var(--sb-mut,#71717a)}
  #activity .al-bulk{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:10px 0 6px;padding:8px 10px;border:1px dashed var(--sb-line,#e4e4e7);border-radius:8px}
  #activity .al-bulk label{display:flex;align-items:center;gap:6px;margin:0;font-size:13px}
  .al-dash{margin-top:14px}
  `; document.head.appendChild(st);
  function ensureSection(){
    if(document.getElementById('activity')) return;
    const anchor=document.getElementById('daily'); const sec=document.createElement('section'); sec.id='activity'; sec.className='view hidden'; sec.innerHTML='<div class="panel" id="alRoot"></div>';
    (anchor&&anchor.parentNode?anchor.parentNode:document.body).appendChild(sec);
  }
  ensureSection();
  try{
    if(typeof SBI==='object') SBI.alog='<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>';
    if(typeof SB_ICON==='object') SB_ICON.activity='alog';
    if(typeof SB_KEYS==='object') SB_KEYS.activity='l';
    if(Array.isArray(SB_GROUPS)){ SB_GROUPS.forEach(g=>{ const i=g.indexOf('activity'); if(i>=0) g.splice(i,1); }); const g=SB_GROUPS.find(x=>x.includes('team'))||SB_GROUPS.find(x=>x.includes('history'))||SB_GROUPS[SB_GROUPS.length-1]; const i=g.indexOf('team')>=0?g.indexOf('team'):g.indexOf('history'); g.splice(i>=0?i+1:g.length,0,'activity'); }
  }catch(e){}
  const nav0=window.twNav;
  window.twNav=function(){ const n=(typeof nav0==='function'?nav0.apply(this,arguments):[]).filter(x=>x[0]!=='activity'); let i=n.findIndex(x=>x[0]==='team'); if(i<0) i=n.findIndex(x=>x[0]==='history'); n.splice(i>=0?i+1:n.length,0,['activity','Activity Log']); return n; };
  const sw0=window.switchTab;
  window.switchTab=function(name){ const r=sw0.apply(this,arguments); if(name==='activity') AL_render(); return r; };
  const ref0=window.twRefresh;
  if(typeof ref0==='function') window.twRefresh=function(){ const r=ref0.apply(this,arguments); try{ if(TW.tab==='activity') AL_render(); }catch(e){} return r; };

  /* ---------- Activity Log screen ---------- */
  function AL_render(){
    const root=document.getElementById('alRoot'); if(!root||!twU()) return;
    const hp=document.getElementById('alHistPanel')||document.querySelector('#history > .panel'); if(hp&&root.contains(hp)) document.getElementById('history')?.appendChild(hp);
    const hist=AL.type==='history'; if(AL.type==='update') AL.type='all';
    const {R,list}=filtered(AL);
    const byType=k=>list.filter(r=>k==='all'||r.kind===k);
    const shown=byType(AL.type);
    const seg=(key,v,l,n)=>`<button class="${AL[key]===v?'on':''}" onclick="AL.${key}='${v}';edptActivityRender()">${l}${n!==undefined?` (${n})`:''}</button>`;
    const people=(typeof edptPeopleIds==='function'?edptPeopleIds():Object.keys(db.users||{})).map(id=>[id,nameOf(id)]).sort((a,b)=>a[1].localeCompare(b[1]));
    const closedN=shown.filter(r=>r.status==='Closed'||r.status==='Completed').length, openN=shown.filter(r=>r.kind!=='update'&&r.status!=='Closed'&&r.status!=='Completed').length, overN=shown.filter(r=>r.overdue).length;
    const unplH=shown.filter(r=>r.kind==='unplanned').reduce((n,r)=>n+(r.hours||0),0);
    const chip=r=>r.kind==='update'?`<span class="al-chip al-update">${E(r.status||'Update')}</span>`:(r.status==='Closed'||r.status==='Completed')?'<span class="al-chip al-closed">Closed</span>':r.overdue?'<span class="al-chip al-over">Overdue</span>':`<span class="al-chip al-open">${E(r.status==='Not Started'?'Open':r.status)}</span>`;
    const act=r=>r.kind==='daily'?`<button class="small" onclick="twDUpdate('${E(r.id)}')">Update</button>`:r.kind==='review'?`<button class="small" onclick="twUpdateProjectReviewDaily('${E(r.id)}')">Update</button>`:r.kind==='unplanned'&&typeof ulDel==='function'&&(twLead(twU())||(r.ref&&r.ref.by===TW.me))?`<button class="small danger" onclick="ulDel('${E(r.id)}');edptActivityRender()">Delete</button>`:'';
    const okDel=r=>window.edptALCanDel(r), canAny=shown.some(okDel)||rows().some(okDel); AL._shown=shown.filter(okDel);
    const hiddenN=rows().filter(r=>r.kind!=='update'&&okDel(r)).length-AL._shown.length;
    const daysOpen=r=>{ if(r.kind==='update') return ''; const s=r.start||r.created; const e=r.closedOn||today(); if(!s) return ''; return Math.max(0,Math.round((new Date(e+'T12:00:00')-new Date(s+'T12:00:00'))/864e5)); };
    root.innerHTML=`<div class="toprow"><div><h2 style="margin:0">Activity Log</h2><span class="muted">Daily tasks, Project Review tasks, unplanned tasks and date changes in one place · ${E(R.label)}${AL.range==='all'?'':` (${fd(R.a)}${R.b!==R.a?' – '+fd(R.b):''})`}</span></div>
      <div class="actions"><button class="primary" onclick="edptActivityExport()">Export Excel</button></div></div>
      <div class="al-bar"><div class="al-seg">${seg('range','today','Today')}${seg('range','yesterday','Yesterday')}${seg('range','week','This week')}${seg('range','lastweek','Last week')}${seg('range','month','This month')}${seg('range','lastmonth','Last month')}${seg('range','custom','Custom')}${seg('range','all','All dates')}</div>
      ${AL.range==='custom'?`<label>From<input type="date" value="${E(AL.from||today())}" onchange="AL.from=this.value;edptActivityRender()"></label><label>To<input type="date" value="${E(AL.to||AL.from||today())}" onchange="AL.to=this.value;edptActivityRender()"></label>`:''}
      <label>Show tasks<select onchange="AL.basis=this.value;edptActivityRender()">${[['active','Worked on in this period'],['created','Created in this period'],['closed','Closed in this period'],['due','Due in this period']].map(([v,l])=>`<option value="${v}" ${AL.basis===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
      <div class="al-bar"><div class="al-seg">${seg('type','all','All',list.length)}${seg('type','daily','Daily tasks',byType('daily').length)}${seg('type','review','Project Review tasks',byType('review').length)}${seg('type','unplanned','Unplanned tasks',byType('unplanned').length)}${seg('type','history','Date changes',(db.history||[]).length)}</div>
      <label>Person<select onchange="AL.person=this.value;edptActivityRender()"><option value="">Everyone</option>${people.map(([id,n])=>`<option value="${E(id)}" ${AL.person===id?'selected':''}>${E(n)}</option>`).join('')}</select></label>
      <label>Project<select onchange="AL.proj=this.value;edptActivityRender()"><option value="">All projects</option>${(db.projects||[]).filter(p=>String(p.code||'').trim()).map(p=>`<option value="${E(p.id)}" ${AL.proj===p.id?'selected':''}>${E(p.code)}</option>`).join('')}</select></label>
      <label>Status<select onchange="AL.status=this.value;edptActivityRender()">${[['','All'],['open','Open'],['closed','Closed'],['overdue','Overdue']].map(([v,l])=>`<option value="${v}" ${AL.status===v?'selected':''}>${l}</option>`).join('')}</select></label>
      <label>Search<input type="search" value="${E(AL.q)}" placeholder="Task, person, project" onchange="AL.q=this.value;edptActivityRender()"></label></div>
      ${hist?'<div id="alHist"></div>':`<div class="al-tiles"><div class="al-tile" onclick="AL.status='';edptActivityRender()"><span>Total</span><b>${shown.length}</b></div><div class="al-tile" onclick="AL.status='closed';edptActivityRender()"><span>Closed / completed</span><b style="color:#1f9d61">${closedN}</b></div><div class="al-tile" onclick="AL.status='open';edptActivityRender()"><span>Still open</span><b style="color:#2563eb">${openN}</b></div><div class="al-tile" onclick="AL.status='overdue';edptActivityRender()"><span>Overdue</span><b style="color:#e5484d">${overN}</b></div><div class="al-tile" onclick="AL.type='unplanned';edptActivityRender()"><span>Unplanned hours</span><b>${Math.round(unplH*10)/10}</b></div></div>
      ${canAny?`<div class="al-bulk"><label><input type="checkbox" onchange="edptALSelAll(this.checked)"> Select all shown</label><span class="muted" id="alSelN">0 selected</span><button class="small danger" onclick="edptALDelete('sel')">Delete selected</button><button class="small danger" onclick="edptALDelete('all')">Delete all shown (${shown.filter(okDel).length})</button><span class="muted" style="font-size:12px">Use the period, type, person, project and status filters to choose what to delete.${hiddenN?` <b style="color:#b45309">${hiddenN} more record(s) are outside these filters</b> — choose <b>All dates</b> and type <b>All</b> to see and delete everything.`:''}</span></div>`:''}
      <div class="al-wrap"><table class="al-t"><thead><tr>${canAny?'<th style="width:28px"></th>':''}<th>Type</th><th>Project</th><th>Task</th><th>Person</th><th>Assigned by</th><th>Start</th><th>Due / Target</th><th>Status</th><th>Closed on</th><th>Days</th><th>Remarks</th><th></th></tr></thead><tbody>
      ${shown.map(r=>`<tr>${canAny?`<td>${okDel(r)?`<input type="checkbox" class="al-ck" data-kind="${r.kind}" data-id="${E(r.id)}" onchange="edptALCount()">`:''}</td>`:''}<td><span class="al-chip al-${r.kind}">${E(r.typeLabel)}</span></td><td><b>${E(r.project?r.project.code:'—')}</b></td><td>${E(r.task)}${r.hours?` <span class="muted">(${r.hours} h)</span>`:''}</td><td><b>${E(nameOf(r.person))}</b></td><td>${E(r.by?nameOf(r.by):'—')}</td><td>${fd(r.start)}</td><td>${fd(r.due)}</td><td>${chip(r)}</td><td>${fd(r.closedOn)}</td><td>${daysOpen(r)}</td><td class="al-rm">${E(r.remarks||'')}</td><td>${act(r)}</td></tr>`).join('')||`<tr><td colspan="${canAny?13:12}" class="muted">Nothing in this period with these filters.</td></tr>`}
      </tbody></table></div>
      <p class="muted" style="font-size:12px;margin-top:8px">A task is closed when the person clicks <b>Update</b>, sets Status to <b>Closed</b>, enters the finished date and remarks. It then shows as Closed here, in Daily Tasks and on the Dashboard. Unplanned tasks are added in Task Management (so the project schedule moves); this is their log. Export includes one sheet per type for the selected period and filters.</p>`}`;
    if(hist){ const h=document.getElementById('alHistPanel')||document.querySelector('#history > .panel'), box=document.getElementById('alHist'); if(h&&box){ h.id='alHistPanel'; box.appendChild(h); try{ renderHistory(); }catch(e){ console.warn(e); } } }
  }
  window.edptActivityRender=AL_render;

  /* ---------- bulk delete (v33.4) ---------- */
  window.edptALCanDel=function(r){
    const u=twU(); if(!u) return false;
    if(r.kind==='daily'||r.kind==='review'){ try{ return typeof window.edptCan==='function'?window.edptCan('Daily Tasks','Delete'):twLead(u); }catch(e){ return false; } }
    if(r.kind==='unplanned') return twLead(u)||(r.ref&&r.ref.by===TW.me);
    return false;
  };
  window.edptALCount=function(){ const n=document.querySelectorAll('#alRoot .al-ck:checked').length; const el=document.getElementById('alSelN'); if(el) el.textContent=n+' selected'; };
  window.edptALSelAll=function(on){ document.querySelectorAll('#alRoot .al-ck').forEach(c=>c.checked=on); window.edptALCount(); };
  window.edptALDelete=function(mode){
    const pick=mode==='all'?(AL._shown||[]).map(r=>({kind:r.kind,id:r.id})):[...document.querySelectorAll('#alRoot .al-ck:checked')].map(c=>({kind:c.dataset.kind,id:c.dataset.id}));
    if(!pick.length) return toast(mode==='all'?'Nothing to delete with these filters.':'Tick the rows you want to delete first.');
    const nD=pick.filter(x=>x.kind!=='unplanned').length, nU=pick.length-nD;
    const msg=`Delete ${pick.length} record(s)?\n\n`+(nD?`• ${nD} daily / Project Review task(s) will be removed from Daily Tasks.\n`:'')+(nU?`• ${nU} unplanned task(s) will be removed from Task Management. Dates already moved because of them are NOT moved back.\n`:'')+'\nThis cannot be undone. Export to Excel first if you need a copy.';
    if(!confirm(msg)) return;
    const dIds=new Set(pick.filter(x=>x.kind!=='unplanned').map(x=>x.id)), uIds=new Set(pick.filter(x=>x.kind==='unplanned').map(x=>x.id));
    if(dIds.size) db.daily=(db.daily||[]).filter(t=>!dIds.has(t.id));
    if(uIds.size){ const subIds=new Set((db.unplanned||[]).filter(e=>uIds.has(e.id)).map(e=>e.subId).filter(Boolean));
      db.unplanned=(db.unplanned||[]).filter(e=>!uIds.has(e.id));
      (db.projects||[]).forEach(p=>{ (p.tasks||[]).forEach(t=>{ if(t.subs) t.subs=t.subs.filter(s=>!subIds.has(s.id)); }); p.tasks=(p.tasks||[]).filter(t=>!(t.unplanned&&!(t.subs||[]).length)); });
      try{ if(typeof lkClean==='function') lkClean(); }catch(e){} }
    save(false);
    try{ if(typeof refreshTaskViews==='function') refreshTaskViews(); }catch(e){}
    try{ if(typeof twHomeRender==='function') twHomeRender(); if(typeof twTopRender==='function') twTopRender(); }catch(e){}
    AL_render(); toast(`${pick.length} record(s) deleted`);
  };

  /* ---------- Excel export (selected period + filters; one sheet per type) ---------- */
  window.edptActivityExport=function(opts){
    try{
      if(!(window.RP&&RP.workbook)) return toast('Excel export is not available.');
      const o=Object.assign({},AL,opts||{}), {R,list}=filtered(o);
      const head=['Type','Project code','Project','Task','Person','Assigned by','Created','Start','Due / Target','Status','Closed on','Closed by','Days open','Hours','Priority','Remarks'];
      const toRow=r=>[r.typeLabel,r.project?r.project.code:'',r.project?r.project.name:'',r.task,nameOf(r.person),r.by?nameOf(r.by):'',r.created,r.start,r.due,r.overdue?'Overdue':r.status,r.closedOn,r.closedBy?nameOf(r.closedBy):'',
        (()=>{ if(r.kind==='update') return ''; const s=r.start||r.created, e=r.closedOn||today(); return s?Math.max(0,Math.round((new Date(e+'T12:00:00')-new Date(s+'T12:00:00'))/864e5)):''; })(), r.hours==null?'':r.hours, r.priority, r.remarks];
      const meta=`ADPT Activity Log — ${R.label} (${R.a} to ${R.b}) — ${({active:'worked on',created:'created',closed:'closed',due:'due'})[o.basis]} in period — exported ${today()}`;
      const sheet=(name,rs)=>({name, head:2, widths:[18,12,26,40,20,20,12,12,13,12,12,18,10,8,10,60], rows:[[meta],head,...(rs.length?rs.map(toRow):[['No rows for this period']])]});
      const blob=RP.workbook([sheet('All activity',list),sheet('Daily tasks',list.filter(r=>r.kind==='daily')),sheet('Project Review tasks',list.filter(r=>r.kind==='review')),sheet('Unplanned tasks',list.filter(r=>r.kind==='unplanned'))]);
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`EDPT_Activity_${R.a}_to_${R.b}.xlsx`; document.body.appendChild(a); a.click(); setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},500);
      toast(`Excel downloaded: ${list.length} row(s), ${R.a} to ${R.b}.`);
    }catch(e){ console.error(e); toast('Export failed: '+e.message); }
  };

  /* ---------- Daily Tasks: add "Yesterday" + link to the log ---------- */
  const rng0=window.twDRange;
  if(typeof rng0==='function') window.twDRange=function(k){
    if(k==='yesterday'){ const y=add(today(),-1); TWD.rng='yesterday'; TWD.from=TWD.to=y; return twDailyRender(); }
    return rng0.apply(this,arguments);
  };
  const daily0=window.twDailyRender;
  if(typeof daily0==='function') window.twDailyRender=function(){
    const r=daily0.apply(this,arguments);
    try{
      document.querySelectorAll('#daily select[onchange^="twDRange"]').forEach(sel=>{
        if(![...sel.options].some(o=>o.value==='yesterday')){ const o=document.createElement('option'); o.value='yesterday'; o.textContent='Yesterday'; const t=[...sel.options].find(x=>x.value==='today'); sel.insertBefore(o,t?t.nextSibling:null); }
        if(TWD.rng==='yesterday') sel.value='yesterday';
      });
      document.getElementById('alFromDaily')?.remove();
    }catch(e){ console.warn(e); }
    return r;
  };

  /* ---------- Dashboard: Task Activity panel + shortcut fix ---------- */
  let DASH='today';
  window.edptDashActivity=function(k){ DASH=k; dashPanel(); };
  function dashPanel(){
    const host=document.getElementById('twHome'); if(!host||!twU()) return;
    let box=document.getElementById('alDash'); if(!box){ box=document.createElement('div'); box.id='alDash'; box.className='tw-card al-dash'; host.after(box); }
    const o={range:DASH,basis:'active',person:'',proj:'',status:'',q:''}, {R,list}=filtered(o);
    const created=list.filter(r=>r.kind!=='update'&&r.created>=R.a&&r.created<=R.b).length;
    const closed=list.filter(r=>r.closedOn&&r.closedOn>=R.a&&r.closedOn<=R.b);
    const open=rows().filter(r=>(r.kind==='daily'||r.kind==='review')&&r.status!=='Closed');
    const over=open.filter(r=>r.overdue).length;
    const unpl=list.filter(r=>r.kind==='unplanned'&&r.start>=R.a&&r.start<=R.b);
    const tile=(l,v,c,go)=>`<button class="al-tile" onclick="${go}"><span>${l}</span><b style="${c?'color:'+c:''}">${v}</b></button>`;
    const goLog=(range,extra)=>`AL.range='${range}';AL.basis='active';AL.type='all';AL.status='';${extra||''}twGo('activity')`;
    box.innerHTML=`<div class="toprow" style="margin-bottom:0"><div><h3 style="margin:0">Task activity</h3><span class="muted">Daily, Project Review and unplanned tasks · ${E(R.label)}</span></div>
      <div class="actions"><div class="tc-seg" style="display:inline-flex;border:1px solid var(--sb-line,#e4e4e7);border-radius:7px;overflow:hidden">${[['today','Today'],['yesterday','Yesterday'],['week','This week']].map(([k,l])=>`<button style="border:0;border-radius:0;padding:5px 10px;${DASH===k?'background:var(--tw-green,#1f9d61);color:#fff':'background:none'}" onclick="edptDashActivity('${k}')">${l}</button>`).join('')}</div><button class="small" onclick="${goLog(DASH)}">Open Activity Log</button></div></div>
      <div class="al-tiles">${tile('Assigned',created,'',goLog(DASH,"AL.basis='created';"))}${tile('Closed',closed.length,'#1f9d61',goLog(DASH,"AL.basis='closed';"))}${tile('Open now',open.length,'#2563eb',"AL.range='month';AL.basis='active';AL.status='open';AL.type='all';twGo('activity')")}${tile('Overdue',over,'#e5484d',"AL.range='month';AL.basis='active';AL.status='overdue';AL.type='all';twGo('activity')")}${tile('Unplanned',unpl.length+(unpl.length?` · ${Math.round(unpl.reduce((n,r)=>n+(r.hours||0),0)*10)/10} h`:''),'#b45309',goLog(DASH,"AL.type='unplanned';"))}</div>
      ${closed.length?`<table class="al-t"><thead><tr><th>Closed</th><th>Person</th><th>Task</th><th>Project</th><th>Remarks</th></tr></thead><tbody>${closed.sort((a,b)=>b.closedOn.localeCompare(a.closedOn)).slice(0,6).map(r=>`<tr><td>${fd(r.closedOn)}</td><td>${E(nameOf(r.person))}</td><td>${E(r.task)} <span class="al-chip al-${r.kind}">${E(r.typeLabel)}</span></td><td>${E(r.project?r.project.code:'—')}</td><td class="muted">${E(r.remarks||'')}</td></tr>`).join('')}</tbody></table>`:'<p class="muted" style="margin:4px 0 0">No tasks closed in this period yet.</p>'}`;
  }
  const home0=window.twHomeRender;
  if(typeof home0==='function') window.twHomeRender=function(){
    const r=home0.apply(this,arguments);
    try{
      document.querySelectorAll('#twHome [data-twt="workload"]').forEach(b=>{ b.dataset.twt='capacity'; const txt=[...b.childNodes].find(n=>n.nodeType===3&&/Workload/.test(n.textContent)); if(txt) txt.textContent='Team Capacity'; b.onclick=e=>{ e.stopPropagation(); twGo('capacity'); }; });
      document.getElementById('alDash')?.remove(); /* v28.3: Task activity panel removed from Dashboard */
    }catch(e){ console.warn(e); }
    return r;
  };
})();
