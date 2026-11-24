/* ===== ADPT v23.0/v24.0 — Capacity engine (Team Capacity) =====
   Self-contained module. Reads existing projects / tasks / subtasks / unplanned log / holidays.
   Stores only inputs in db.capacity (settings, per-person capacity & leave, forecasts).
   Never changes confirmed projects, tasks or dates. Saves through the existing save() → RPC. */
(function(){
  'use strict';
  const RP = window.RP = { tab:'availability', f:{period:'month', month:'', q:'', year:'', from:'', to:'', emp:'', proj:'', dept:'', status:'', scale:'month', view:'team'}, fcSel:'' };
  const norm = v => String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const addDays = (s,n) => { const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return iso(d); };
  const todayIso = () => iso(new Date());
  const monthKey = s => String(s).slice(0,7);
  const monthStart = k => k+'-01';
  const monthEnd = k => { const [y,m]=k.split('-').map(Number); return iso(new Date(y,m,0,12)); };
  const addMonths = (k,n) => { const [y,m]=k.split('-').map(Number); const d=new Date(y,m-1+n,1,12); return iso(d).slice(0,7); };
  const monthLabel = k => { const [y,m]=k.split('-').map(Number); return new Date(y,m-1,1).toLocaleString('en-GB',{month:'short',year:'numeric'}); };
  const weekStart = s => { const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()-((d.getDay()+6)%7)); return iso(d); };
  const r1 = n => Math.round((Number(n)||0)*10)/10;
  const r0 = n => Math.round(Number(n)||0);
  const fmtH = n => r0(n).toLocaleString('en-GB')+' h';
  const fd = s => (typeof fmtDate==='function') ? fmtDate(s) : (s||'—');
  const E = s => (typeof esc==='function') ? esc(s) : String(s??'');

  /* ---------- shared settings in db.capacity ---------- */
  function cap(){
    if(!db) return {settings:{},people:{},forecasts:[]};
    db.capacity ||= {};
    const c=db.capacity;
    c.settings ||= {};
    const s=c.settings;
    s.dailyHours = 8;   /* v35.27: fixed 8 h standard everywhere */ s.availableBelow ??= 70; s.fullFrom ??= 90; s.overFrom ??= 110;
    s.horizonMonths ??= 12; s.freeBelow ??= 50; s.estimateMissing ??= false;
    // v27.1: tasks with dates but no planned hours do not book anyone (one-time switch; can be turned back on in Settings)
    if(!s.noHoursV2){ s.estimateMissing=false; s.noHoursV2=true; }
    c.people ||= {}; c.forecasts ||= [];
    return c;
  }
  RP.cap = cap;
  function personCfg(key){ return cap().people[norm(key)] || {}; }
  /* v35.9: leave = Settings text + leave booked by people (db.capacity.leaves) */
  function leaveOf(key,id,cfg){ const set=parseLeave(cfg&&cfg.leave); ((db.capacity&&db.capacity.leaves)||[]).forEach(l=>{ if(!l||l.cancelled) return; if(!(norm(l.key)===norm(key)||(id&&l.person===id))) return; let a=l.a,b=l.b||l.a; if(!a) return; if(b<a)[a,b]=[b,a]; for(let d=a,g=0; d<=b && g++<400; d=addDays(d,1)) set.add(d); }); return set; }
  RP.leaveOf=leaveOf;
  /* v35.23: standard working time is fixed at 8 h per day for everyone; booking more is allowed and shows red */
  const STD_HOURS=8;
  function dailyHours(key){ return STD_HOURS; }
  RP.dailyHours = dailyHours;
  function parseLeave(txt){
    const out=new Set();
    String(txt||'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).forEach(part=>{
      const m=part.match(/^(\d{4}-\d{2}-\d{2})(?:\s*(?:\.\.|to|–|-(?=\s))\s*(\d{4}-\d{2}-\d{2}))?$/);
      if(!m) return; let a=m[1], b=m[2]||m[1]; if(b<a)[a,b]=[b,a];
      for(let d=a,g=0; d<=b && g++<800; d=addDays(d,1)) out.add(d);
    });
    return out;
  }
  RP.parseLeave = parseLeave;
  function holidays(){ return new Set((db.holidays||[]).map(h=>h.date||h).filter(Boolean)); }
  function isWork(d,hol){ const g=new Date(d+'T12:00:00').getDay(); return g>0 && g<6 && !hol.has(d); }
  function workDays(a,b,hol){ const out=[]; if(!a||!b||a>b) return out; for(let d=a,g=0; d<=b && g++<2000; d=addDays(d,1)) if(isWork(d,hol)) out.push(d); return out; }
  RP.workDays = (a,b)=>workDays(a,b,holidays());

  /* ---------- people (one per person, no duplicate records) ---------- */
  function people(){
    const users=db.users||{}, byKey=new Map();
    const ids = (typeof window.edptPeopleIds==='function') ? window.edptPeopleIds() : Object.keys(users);
    ids.forEach(id=>{
      const u=users[id]; if(!u) return;
      const key=norm(u.owner||u.name||id); if(!key || byKey.has(key)) return;
      byKey.set(key,{key, id, name:(typeof twName==='function'?twName(id):u.name)||u.name||id, dept:u.dept||'', designation:u.designation||u.role||'', role:u.role||'', linked:true});
    });
    // Map legacy/alias ids and names onto the same person
    const alias={};
    Object.entries(users).forEach(([id,u])=>{ const k=norm(u.owner||u.name); if(byKey.has(k)) { alias[norm(id)]=k; alias[norm(u.name)]=k; } });
    // Hidden legacy records (old IDs / old spellings) still map their task-owner names onto the real login.
    const amap=window.EDPT_ALIAS_TO_PROFILE||{};
    Object.getOwnPropertyNames(users).forEach(id=>{
      const u=users[id], to=amap[norm(id)]; if(!u||!to||!users[to]) return;
      const k=norm(users[to].owner||users[to].name); if(!byKey.has(k)) return;
      [id,u.name,u.owner].forEach(x=>{ if(x&&!alias[norm(x)]) alias[norm(x)]=k; });
    });
    byKey.forEach((p,k)=>{ alias[k]=k; alias[norm(p.id)]=k; alias[norm(p.name)]=k; });
    return {byKey, alias};
  }

  /* ---------- work items from the CURRENT schedule ---------- */
  function workItems(){
    const out=[];
    (db.projects||[]).forEach(p=>{
      (p.tasks||[]).forEach(t=>{
        const subs=(t.subs||[]).filter(s=>String(s.name||'').trim());
        const leaves = subs.length ? subs.map(s=>({o:s,main:t,isSub:true})) : (String(t.name||'').trim()?[{o:t,main:null,isSub:false}]:[]);
        leaves.forEach(({o,main,isSub})=>{
          const status=o.status||'Not Started'; if(status==='Cancelled') return;
          const owner=String(o.owner||(isSub?main.owner:'')||'').trim(); if(!owner) return;
          const start=o.start||(isSub?main.start:'')||p.start, end=o.target||(isSub?main.target:'')||p.end;
          if(!start||!end) return;
          out.push({p, t:isSub?main:o, item:o, owner, start:start<=end?start:end, end:start<=end?end:start, status,
            planned:Number(o.plannedHours||o.estimatedHours||0), actual:Number(o.actualHours||0), pct:Number(o.pct??(status==='Completed'?100:0)), unplanned:!!o.unplanned});
        });
      });
    });
    // Planned daily tasks (created in the Week Planner with hours per day) count toward capacity.
    const al=window.EDPT_ALIAS_TO_PROFILE||{}, hol0=holidays();
    (db.daily||[]).forEach(t=>{
      const h=Number(t.planHours||0); if(!(h>0)) return;
      const key=al[String(t.assigneeId||'').toLowerCase()]||t.assigneeId, u=db.users&&db.users[key]; if(!u) return;
      const start=t.start||t.date, end=t.date||t.start; if(!start||!end) return;
      const n=Math.max(workDays(start<=end?start:end,start<=end?end:start,hol0).length,1), planned=h*n;
      const status=t.status==='Closed'?'Completed':t.status==='In Progress'?'In Progress':'Not Started';
      const proj=(db.projects||[]).find(x=>x.id===t.projectId);
      out.push({p:{id:'daily',code:'Daily',name:'Daily tasks',realProject:proj||null}, t:{name:'Daily task'}, item:{id:t.id,name:t.title||'Daily task'}, owner:u.owner||u.name||key,
        start:start<=end?start:end, end:start<=end?end:start, status, planned, actual:status==='Completed'?planned:0, pct:status==='Completed'?100:0, unplanned:false, daily:t, perDay:h});
    });
    // Unplanned log entries that have no inserted subtask (older entries)
    const subIds=new Set(); out.forEach(x=>subIds.add(x.item.id));
    (db.unplanned||[]).forEach(u=>{
      if(u.subId && subIds.has(u.subId)) return;
      const hrs=Number(u.hours||0); if(!(hrs>0)||!u.person||!u.date) return;
      const p=(db.projects||[]).find(x=>x.id===u.projectId)||{id:u.projectId||'',code:'Unplanned',name:'Unplanned work'};
      out.push({p, t:{name:'Unplanned'}, item:{id:u.id,name:u.note||'Unplanned task'}, owner:u.person, start:u.date, end:u.endDate||u.date, status:'Completed', planned:hrs, actual:hrs, pct:100, unplanned:true, logOnly:true});
    });
    return out;
  }

  /* ---------- engine: day-by-day load map ---------- */
  const cache={key:'',val:null};
  function build(opt){
    opt=opt||{};
    const c=cap(), s=c.settings, t0=todayIso(), hol=holidays();
    const key=JSON.stringify([opt.proj||'',opt.status||'',t0,!!window.EDPT_ROSTER_ACTIVE,Object.keys(db.users||{}).length, (typeof EDPT_CLOUD_VERSION!=='undefined'?EDPT_CLOUD_VERSION:0), JSON.stringify(db.projects||[]).length, (db.unplanned||[]).length, JSON.stringify(db.daily||[]).length, JSON.stringify(c).length, (db.holidays||[]).length]);
    if(cache.key===key) return cache.val;
    const {byKey, alias}=people();
    const horizonEnd=monthEnd(addMonths(monthKey(t0), Math.max(1,Number(s.horizonMonths)||12)));
    const P={};
    const strict=!!window.EDPT_ROSTER_ACTIVE;
    const ensure=(ownerName)=>{
      const k=alias[norm(ownerName)]||norm(ownerName);
      if(strict && !byKey.has(k)) return null;   // owner has no active login → not shown anywhere
      if(!P[k]){
        const base=byKey.get(k)||{key:k,id:'',name:String(ownerName).trim(),dept:'',designation:'',role:'',linked:false};
        const cfg=personCfg(k);
        P[k]={...base, daily:dailyHours(k), leave:leaveOf(k,base.id,cfg), exclude:!!cfg.exclude, load:{}, proj:{}, di:{}, all:[], items:[], assigned:0, completed:0, pending:0, estimated:0, overdue:0, projects:new Set()};
      }
      return P[k];
    };
    byKey.forEach(p=>ensure(p.name));
    const capOn=(per,d)=> isWork(d,hol)&&!per.leave.has(d) ? per.daily : 0;
    const book=(per,d,h,pid,iid)=>{ if(!(h>0)) return; per.load[d]=(per.load[d]||0)+h; (per.proj[d] ||= {}); per.proj[d][pid]=(per.proj[d][pid]||0)+h; if(iid){ (per.di[d] ||= {}); per.di[d][iid]=(per.di[d][iid]||0)+h; } };
    const backlog=[];
    workItems().forEach(x=>{
      if(opt.proj && x.p.id!==opt.proj) return;
      if(opt.status && x.status!==opt.status) return;
      const per=ensure(x.owner); if(!per) return;
      per.all.push(x);
      const days=workDays(x.start,x.end,hol).filter(d=>!per.leave.has(d));
      let P0=x.planned, est=false;
      if(!(P0>0)){ if(!s.estimateMissing || x.logOnly) return; P0=Math.max(days.length,1)*per.daily; est=true; }
      const done = x.status==='Completed' ? P0 : Math.min(P0, x.actual>0 ? x.actual : P0*Math.max(0,Math.min(100,x.pct))/100);
      const pend = x.status==='Completed' ? 0 : Math.max(P0-done,0);
      if(x.status!=='Completed'){ per.assigned+=P0; per.completed+=done; per.pending+=pend; if(est) per.estimated++; per.projects.add(x.p.id); }
      const pastDays=days.filter(d=>d<t0);
      // Past: planned distribution (what was scheduled); keeps monthly utilization history consistent.
      if(days.length) pastDays.forEach(d=>book(per,d,P0/days.length,x.p.id,x.item.id));
      // Future: remaining (pending) hours over remaining working days on the LATEST dates.
      const futDays=days.filter(d=>d>=t0);
      const overdue = x.status!=='Completed' && x.end<t0;
      if(pend>0){
        if(futDays.length) futDays.forEach(d=>book(per,d,pend/futDays.length,x.p.id,x.item.id));
        else backlog.push({per,h:pend,pid:x.p.id,iid:x.item.id});
      }
      per.items.push({...x, P:P0, done, pend, est, overdue});
      if(overdue) per.overdue+=pend;
    });
    // Overdue backlog: placed from today onward into free capacity (pushes next-available out).
    backlog.forEach(b=>{
      let h=b.h, d=t0, g=0;
      while(h>0.001 && g++<1500){ const c0=capOn(b.per,d); const free=Math.max(c0-(b.per.load[d]||0),0); if(free>0){ const x=Math.min(free,h); book(b.per,d,x,b.pid,b.iid); h-=x; } d=addDays(d,1); }
      if(h>0.001) book(b.per,t0,h,b.pid,b.iid);
    });
    // Next available date: first working day after which load stays below freeBelow% of daily capacity.
    const thr=(Number(s.freeBelow)||50)/100;
    Object.values(P).forEach(per=>{
      let last='';
      Object.keys(per.load).forEach(d=>{ if(d>=t0 && per.load[d]>=thr*Math.max(capOn(per,d),per.daily)-1e-6 && d>last) last=d; });
      if(!last) per.nextFree=t0;
      else { let d=addDays(last,1),g=0; while(!(isWork(d,hol)&&!per.leave.has(d)) && g++<60) d=addDays(d,1); per.nextFree=d; }
      per.beyond = per.nextFree>horizonEnd;
      // Fully free: first working day after the last booked hour (no work at all).
      let lastAny=''; Object.keys(per.load).forEach(d=>{ if(d>=t0 && per.load[d]>0.01 && d>lastAny) lastAny=d; });
      if(!lastAny) per.fullyFree=t0; else { let d=addDays(lastAny,1),g=0; while(!(isWork(d,hol)&&!per.leave.has(d)) && g++<60) d=addDays(d,1); per.fullyFree=d; }
    });
    const val={P, hol, t0, horizonEnd, capOn, settings:s};
    cache.key=key; cache.val=val; return val;
  }
  RP.build = build;
  RP.invalidate = () => { cache.key=''; };

  function capacityIn(M,per,a,b){ let h=0; workDays(a,b,M.hol).forEach(d=>{ if(!per.leave.has(d)) h+=per.daily; }); return h; }
  function bookedIn(per,a,b){ let h=0; for(const d in per.load) if(d>=a&&d<=b) h+=per.load[d]; return h; }
  function freeIn(M,per,a,b){ let h=0; workDays(a,b,M.hol).forEach(d=>{ const c0=per.leave.has(d)?0:per.daily; h+=Math.max(c0-(per.load[d]||0),0); }); return h; }
  function projectsIn(per,a,b){ const s=new Set(); for(const d in per.proj) if(d>=a&&d<=b) Object.keys(per.proj[d]).forEach(k=>s.add(k)); return s; }
  RP.capacityIn=capacityIn; RP.bookedIn=bookedIn; RP.freeIn=freeIn; RP.projectsIn=projectsIn;

  function band(util, capH){
    const s=cap().settings;
    if(!(capH>0)) return {k:'leave',label:'On leave',cls:'rp-grey'};
    if(util<=0.0001) return {k:'none',label:'No allocation',cls:'rp-grey'};
    if(util<s.availableBelow) return {k:'avail',label:'Available',cls:'rp-green'};
    if(util<s.fullFrom) return {k:'partial',label:'Partially available',cls:'rp-yellow'};
    if(util<=s.overFrom) return {k:'full',label:'Fully loaded',cls:'rp-red'};
    return {k:'over',label:'Overloaded',cls:'rp-dark'};
  }
  RP.band=band;

  /* ---------- Future Project Forecast ---------- */
  function eligible(M, fc){
    return Object.values(M.P).filter(per=>!per.exclude && (
      (!fc.dept || norm(per.dept)===norm(fc.dept)) &&
      (!fc.designation || norm(per.designation)===norm(fc.designation))
    ));
  }
  function evaluateForecast(fc){
    const M=build({}), hol=M.hol, s=cap().settings;
    const start=fc.start, end=fc.end, hours=Number(fc.hours)||0;
    const res={months:[], verdict:'', extraHours:0, extraPeople:0, free:[], busy:[], freeing:[], suggestion:{}};
    if(!start||!end||end<start||!(hours>0)) { res.verdict='incomplete'; return res; }
    const team=eligible(M,fc);
    const allDays=workDays(start,end,hol);
    let mk=monthKey(start); const months=[];
    while(mk<=monthKey(end) && months.length<36){ months.push(mk); mk=addMonths(mk,1); }
    const split=fc.split||{};
    const useSplit = months.some(m=>Number(split[m])>0);
    let worst=0;
    months.forEach(m=>{
      const a=monthStart(m)<start?start:monthStart(m), b=monthEnd(m)>end?end:monthEnd(m);
      const wd=workDays(a,b,hol);
      const req = useSplit ? Number(split[m])||0 : (allDays.length? hours*wd.length/allDays.length : 0);
      let free=0; const per={};
      team.forEach(p=>{ const f=freeIn(M,p,a,b); per[p.key]=f; free+=f; });
      const short=Math.max(req-free,0);
      const oneEng=wd.length*(Number(s.dailyHours)||8);
      const extra= short>0 && oneEng>0 ? Math.ceil(short/oneEng) : 0;
      // Suggested allocation: give required hours to the engineers with most free time first
      let left=req; const alloc={};
      Object.entries(per).sort((x,y)=>y[1]-x[1]).forEach(([k,f])=>{ if(left<=0) return; const take=Math.min(f,left); if(take>0.5){ alloc[k]=take; left-=take; } });
      Object.entries(alloc).forEach(([k,h])=>res.suggestion[k]=(res.suggestion[k]||0)+h);
      if(free>0) worst=Math.max(worst, req/free); else if(req>0) worst=Infinity;
      res.months.push({m, a, b, workDays:wd.length, req, free, short, extra, per});
      res.extraHours+=short; res.extraPeople=Math.max(res.extraPeople, extra);
    });
    res.verdict = res.extraHours>0.5 ? 'no' : (worst>0.9 ? 'tight' : 'yes');
    team.forEach(p=>{
      const capH=capacityIn(M,p,start,end), bk=bookedIn(p,start,end), util=capH?bk/capH*100:0;
      const row={p, capH, booked:bk, free:freeIn(M,p,start,end), util, projects:projectsIn(p,start,end)};
      if(util<cap().settings.availableBelow) res.free.push(row);
      else res.busy.push(row);
      if(p.nextFree>start && p.nextFree<=end) res.freeing.push(row);
    });
    res.team=team;
    return res;
  }
  RP.evaluateForecast = evaluateForecast;

  /* ---------- best engineer for a task ---------- */
  function bestEngineers(opts){
    const M=build({});
    const list=eligible(M,opts).map(p=>{
      const free=freeIn(M,p,opts.start,opts.end);
      return {p, free, projects:projectsIn(p,opts.start,opts.end).size, nextFree:p.nextFree, canAlone: free+0.01>=Number(opts.hours||0)};
    });
    list.sort((a,b)=> (b.canAlone-a.canAlone) || (b.free-a.free) || (a.projects-b.projects) || String(a.nextFree).localeCompare(String(b.nextFree)));
    return list;
  }
  RP.bestEngineers = bestEngineers;

  /* ---------- shared capacity also drives the existing Workload screen ---------- */
  window.wlCapacity = function(person){ try { return dailyHours(person); } catch(e){ return 8; } };
  window.wxSaveCap = function(){
    const p=val('wlCapPerson'), h=Number(val('wlCapHours'));
    if(!p||!(h>0)||h>24){ alert('Select a person and enter capacity between 0 and 24 hours.'); return; }
    if(!RP.canEdit()) return toast('Only Admin or users with Team Capacity Edit access can change capacity.');
    cap().people[norm(p)] = {...(cap().people[norm(p)]||{}), hours:h};
    RP.invalidate(); save(false); if(typeof renderWorkloadPlanner==='function') renderWorkloadPlanner(); toast('Capacity saved for everyone');
  };

  RP.can = a => (typeof window.edptCan==='function') ? window.edptCan('Team Capacity',a) : (typeof twAdmin==='function'&&twAdmin());
  RP.canEdit = () => (typeof twAdmin==='function'&&twAdmin()) || RP.can('Edit');
  RP.util = {norm, iso, addDays, todayIso, monthKey, monthStart, monthEnd, addMonths, monthLabel, weekStart, r0, r1, fmtH, fd, E, workDays, holidays};
})();
