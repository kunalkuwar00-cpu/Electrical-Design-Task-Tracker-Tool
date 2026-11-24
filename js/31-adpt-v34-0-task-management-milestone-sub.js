/* ===== ADPT v34.0 — Task Management: Milestone / Sub milestone names + Excel template & plan export ===== */
(function(){
  'use strict';
  const E=s=>(typeof esc==='function'?esc(s):String(s??''));
  const T=()=>typeof twToday==='function'?twToday():new Date().toISOString().slice(0,10);
  /* UI words only (headings, buttons, labels, placeholders) — never task names typed by users */
  const RULES=[
    [/Main\s*\/\s*Subtask Template/g,'Milestone / Sub milestone Template'],[/Main\/Subtask/g,'Milestone / Sub milestone'],
    [/Main Tasks/g,'Milestones'],[/Main Task/g,'Milestone'],[/main tasks/g,'milestones'],[/main task/g,'milestone'],[/Main task/g,'Milestone'],
    [/Sub-?tasks/g,'Sub milestones'],[/Sub-?task/g,'Sub milestone'],[/sub-?tasks/g,'sub milestones'],[/sub-?task/g,'sub milestone'],[/SUBTASK/g,'SUB MILESTONE'],[/Insert Before Task/g,'Insert Unplanned Task'],[/\+ Insert Before$/g,'+ Insert Unplanned Task']
  ];
  const fix=t=>RULES.reduce((a,[r,v])=>a.replace(r,v),t);
  const SEL='h1,h2,h3,h4,th,button,label,summary,legend,.muted,.tw-note,.tm-sum,.hint,p,.tw-chip';
  function relabel(root){
    if(!root) return;
    const els=[...root.querySelectorAll(SEL)]; if(root.matches&&root.matches(SEL)) els.push(root);
    els.forEach(el=>{
      if(el.closest('td')&&!el.matches('button')) return;
      if(el.closest('[data-userdata]')) return;
      el.childNodes.forEach(n=>{ if(n.nodeType===3&&/ask/.test(n.nodeValue)){ const v=fix(n.nodeValue); if(v!==n.nodeValue) n.nodeValue=v; } });
    });
    root.querySelectorAll('span').forEach(el=>{ if(el.closest('td')||el.children.length) return; const t=el.textContent; if(t.length>30||!/ask/.test(t)) return; if(!/^\s*(Main Tasks?|Sub-?tasks?|Main task|Subtask\s*\/\s*Activity)\s*$/i.test(t)) return; el.textContent=fix(t); });
    root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{ const v=fix(el.placeholder); if(v!==el.placeholder) el.placeholder=v; });
    root.querySelectorAll('[title]').forEach(el=>{ if(el.closest('td')) return; const v=fix(el.title); if(v!==el.title) el.title=v; });
  }
  window.edptRelabel=relabel;
  function onTasks(){ try{ return TW.tab==='tasks'; }catch(e){ return false; } }
  function tasksRoot(){ return document.getElementById('tasks'); }
  function buttons(){
    const acts=document.querySelector('#tasks .toprow .actions'); if(!acts||document.getElementById('tmExpBtns')) return;
    const w=document.createElement('span'); w.id='tmExpBtns'; w.style.cssText='display:inline-flex;gap:6px;flex-wrap:wrap';
    w.innerHTML='<button type="button" onclick="edptTmExportTemplate()" title="Standard milestone and sub milestone list as an Excel template">Export template (Excel)</button><button type="button" onclick="edptTmExportPlan()" title="Milestones and sub milestones of the selected project with owners, dates, status and hours">Export project plan (Excel)</button>';
    const ref=[...acts.children].find(b=>/openTaskForm/.test(b.getAttribute('onclick')||''));
    acts.insertBefore(w,ref||null);
  }
  const rt0=window.renderTasks;
  if(typeof rt0==='function') window.renderTasks=function(){ const r=rt0.apply(this,arguments); try{ buttons(); relabel(tasksRoot()); }catch(e){ console.warn(e); } return r; };
  const sw0=window.switchTab;
  window.switchTab=function(name){ const r=sw0.apply(this,arguments); if(name==='tasks') setTimeout(()=>{ try{ buttons(); relabel(tasksRoot()); }catch(e){} },0); return r; };
  /* modals and forms opened from Task Management */
  new MutationObserver(ms=>{ if(!onTasks()) return; ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1&&(n.classList.contains('tw-modal')||n.querySelector?.('.tw-dlg'))) relabel(n); })); }).observe(document.body,{childList:true});
  const tf=document.getElementById('taskForm'); if(tf) new MutationObserver(()=>{ if(onTasks()) relabel(tf); }).observe(tf,{attributes:true,attributeFilter:['class']});
  const ot0=window.openTaskForm; if(typeof ot0==='function') window.openTaskForm=function(){ const r=ot0.apply(this,arguments); try{ relabel(tasksRoot()); }catch(e){} return r; };
  try{ relabel(tasksRoot()); buttons(); }catch(e){}

  /* ---------- Excel ---------- */
  function dl(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(a.href); },500); }
  window.edptTmExportTemplate=function(){
    try{
      const tpl=(typeof MAIN_SUBTASK_TEMPLATE!=='undefined'&&Array.isArray(MAIN_SUBTASK_TEMPLATE))?MAIN_SUBTASK_TEMPLATE:[];
      if(!tpl.length) return toast('No template found.');
      const to={}; tpl.forEach(m=>m.subs.forEach(x=>{ if(x&&x.r) (x.f||[]).forEach(f=>{ (to[f] ||= []).push(x.r); }); }));
      const rows=[]; let r=1;
      tpl.forEach((m,i)=>{ const mr=m.subs.length&&m.subs[0].r?m.subs[0].r-1:++r; rows.push([mr,m.name,'','','']); m.subs.forEach(x=>{ const n=typeof x==='string'?x:x.n; rows.push([x.r||'', '', n, (x.f||[]).join(', '), (to[x.r]||[]).sort((a,b)=>a-b).join(', ')]); r=x.r||r; }); });
      const head=['Row No.','Milestone','Sub milestone','Linked From','Linked To'];
      dl(RP.workbook([{name:'Schedule template',head:2,widths:[9,34,52,14,14],rows:[[`ADPT standard project schedule template — ${tpl.length} milestones, ${rows.filter(x=>x[2]).length} sub milestones — Linked From / Linked To use the Row No. — exported ${typeof fmtDate==='function'?fmtDate(T()):T()}`],head,...rows]}]),'ADPT_Project_Schedule_Template_'+T()+'.xlsx');
    }catch(e){ console.error(e); toast('Export failed: '+e.message); }
  };
  window.edptTmExportPlan=function(){
    try{
      const p=(typeof pbyid==='function'&&pbyid(document.getElementById('taskProjectFilter')?.value))||(typeof project==='function'&&project()); if(!p) return toast('Select a project first.');
      const items=typeof projectLeafItems==='function'?projectLeafItems(p):[]; const nm=id=>id?(typeof twName==='function'&&db.users&&db.users[id]?twName(id):id):'';
      const rows=[]; (p.tasks||[]).forEach((t,i)=>{ const its=items.filter(x=>x.t===t||x.t.id===t.id); const pr=its.length?Math.round(its.reduce((a,x)=>a+(x.progress||0),0)/its.length):'';
        rows.push([`M${i+1}`,t.name||'','','',nm(t.owner)||'',typeof taskStatus==='function'?taskStatus(t):(t.status||''),pr,t.start||'',t.target||'','','','','',t.dependency||'','','']);
        its.forEach((x,j)=>{ const s=x.item; rows.push(['',t.name||'',`M${i+1}.${j+1}`,s.name||'',x.owner||'',s.status||'Not Started',x.progress||0,s.start||'',s.target||'',s.start&&s.target&&typeof lkDays==='function'?lkDays(s.start,s.target):'',Number(s.plannedHours||0),Number(s.actualHours||0),x.delay||0,s.dependency||'',s.fromWhom||'',s.depDue||'']); }); });
      const head=['Milestone No.','Milestone','Sub milestone No.','Sub milestone','Owner','Status','Progress %','Start Date','Target Date','Days','Est. Hrs','Actual Hrs','Delay (days)','Dependency','From Whom','Dependency Due'];
      dl(RP.workbook([{name:'Project plan',head:2,widths:[12,30,16,44,20,16,10,12,12,8,10,10,10,30,18,14],rows:[[`${p.code||''} — ${p.name||''} — project plan (milestones and sub milestones) — exported ${typeof fmtDate==='function'?fmtDate(T()):T()}`],head,...rows]}]),`EDPT_${String(p.code||'Project').replace(/[^A-Za-z0-9_-]+/g,'_')}_Plan_${T()}.xlsx`);
      toast(`Project plan downloaded: ${rows.length} row(s).`);
    }catch(e){ console.error(e); toast('Export failed: '+e.message); }
  };
})();

/* ===== ADPT v35.3 — Project Review: show only the buttons the person is allowed to use ===== */
(function(){
  'use strict';
  const can=a=>{ try{ return typeof window.edptCan==='function'?!!window.edptCan('Project Review',a):true; }catch(e){ return true; } };
  function gate(){
    const host=document.getElementById('twReview')||document.getElementById('report'); if(!host) return;
    const add=can('Add'), upd=can('Update')||can('Edit');
    host.querySelectorAll('button').forEach(b=>{
      const oc=b.getAttribute('onclick')||'', id=b.id||'';
      if(/twAddReviewTask\(/.test(oc)||id==='twRvImp'||id==='twRvTpl') b.style.display=add?'':'none';
      else if(/twReviewEdit\(/.test(oc)) b.style.display=upd?'':'none';
    });
  }
  const r0=window.twReviewRender;
  if(typeof r0==='function') window.twReviewRender=function(){ const r=r0.apply(this,arguments); try{ gate(); }catch(e){ console.warn(e); } return r; };
  try{ gate(); }catch(e){}
})();

/* ===== ADPT v35.3 — Daily Tasks: "+ Assign Daily Task" / "New daily task" follow the Daily Tasks Add permission ===== */
(function(){
  'use strict';
  const canAdd=()=>{ try{ return typeof window.edptCan==='function'?!!window.edptCan('Daily Tasks','Add'):true; }catch(e){ return true; } };
  function gate(){
    const ok=canAdd(), acts=document.getElementById('twDailyActs');
    if(acts){ const b=acts.querySelector('button[onclick*="twNewDaily"]'); if(ok&&!b) acts.insertAdjacentHTML('afterbegin','<button class="primary" onclick="twNewDaily()">+ Assign Daily Task</button>'); if(!ok&&b) b.remove(); }
    document.querySelectorAll('#twTop button').forEach(b=>{ if(/New daily task/i.test(b.textContent)) b.style.display=ok?'':'none'; });
  }
  const d0=window.twDailyRender; if(typeof d0==='function') window.twDailyRender=function(){ const r=d0.apply(this,arguments); try{ gate(); }catch(e){} return r; };
  const t0=window.twTopRender; if(typeof t0==='function') window.twTopRender=function(){ const r=t0.apply(this,arguments); try{ gate(); }catch(e){} return r; };
  const e0=window.twEnter; if(typeof e0==='function') window.twEnter=function(){ const r=e0.apply(this,arguments); setTimeout(()=>{ try{ gate(); }catch(e){} },0); return r; };
  try{ gate(); }catch(e){}
})();

/* ===== ADPT v35.4 — pop-up messages only for problems (errors, warnings, missing permission) ===== */
(function(){
  'use strict';
  const t0=window.toast; if(typeof t0!=='function') return;
  /* v35.6: hide only success confirmations; anything else (errors, warnings, "add dates first"…) is shown */
  const OK=/^(✓\s*)?(task |daily task |unplanned task |project |sub ?milestone |milestone |person |record|backup |report |copied|saved|saving|added|updated|deleted|removed|closed|reopened|assigned|imported|restored|exported|downloaded|connected|loaded|latest shared data|shared tracker refreshed|excel downloaded|template downloaded|template loaded|dates moved|links saved|project plan downloaded|budget saved|capacity settings saved|login created|plan saved|settings saved|week summary copied)/i;
  const BAD=/fail|error|cannot|can't|could not|unable|not allowed|permission|denied|invalid|conflict|required|missing|not found|⚠|warning|not connected|locally|first|no open|nothing/i;
  const OKN=/^\d+\s+(record|row|task|sub ?milestone|project)\S*.*(deleted|added|downloaded|imported|saved|rescheduled)/i;
  window.toast=function(s){ const m=String(s??'').trim(); if((OK.test(m)||OKN.test(m)||/rescheduled automatically|linked task\(s\) rescheduled/i.test(m))&&!BAD.test(m)) return; return t0.apply(this,arguments); };
  window.edptToastAll=t0;
})();


/* ===== ADPT v35.6 — "Task Management" is shown as "Project Schedule" everywhere (display only;
   permission keys stored in Team & Access stay 'Task Management' so existing access is unchanged) ===== */
(function(){
  'use strict';
  const RX=[[/Task Management/g,'Project Schedule'],[/task management/g,'project schedule'],[/TASK MANAGEMENT/g,'PROJECT SCHEDULE'],[/\bTask Mgmt\b/g,'Project Schedule']];
  const fx=t=>RX.reduce((a,[r,v])=>a.replace(r,v),t);
  const has=t=>/task management|task mgmt/i.test(t);
  const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT']);
  function walk(root){
    if(!root) return;
    if(root.nodeType===3){ if(has(root.nodeValue)&&!SKIP.has(root.parentNode?.nodeName)) root.nodeValue=fx(root.nodeValue); return; }
    if(root.nodeType!==1||SKIP.has(root.nodeName)) return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>SKIP.has(n.parentNode?.nodeName)||!has(n.nodeValue)?NodeFilter.FILTER_SKIP:NodeFilter.FILTER_ACCEPT});
    const ns=[]; while(w.nextNode()) ns.push(w.currentNode); ns.forEach(n=>n.nodeValue=fx(n.nodeValue));
    root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el=>['title','placeholder','aria-label'].forEach(a=>{ const v=el.getAttribute(a); if(v&&has(v)) el.setAttribute(a,fx(v)); }));
  }
  window.edptRenameSchedule=walk;
  let q=new Set(), tick=false;
  new MutationObserver(ms=>{ ms.forEach(m=>{ if(m.type==='characterData') q.add(m.target); else m.addedNodes.forEach(n=>q.add(n)); }); if(!tick){ tick=true; requestAnimationFrame(()=>{ tick=false; const l=[...q]; q.clear(); l.forEach(walk); }); } })
    .observe(document.body,{childList:true,subtree:true,characterData:true});
  walk(document.body);
  ['alert','confirm'].forEach(k=>{ const f0=window[k]; window[k]=function(m){ return f0.call(window,typeof m==='string'?fx(m):m); }; });
  const t1=window.toast; window.toast=function(m){ return t1.call(this,typeof m==='string'?fx(m):m); };
  try{ if(Array.isArray(window.twNav&&[])){} }catch(e){}
  const n0=window.twNav; if(typeof n0==='function') window.twNav=function(){ return n0.apply(this,arguments).map(x=>x[1]==='Task Management'?[x[0],'Project Schedule']:x); };
})();

/* ===== ADPT v35.8 — Project Schedule: type the sub milestone numbers in "Linked From" (e.g. 3, 5) instead of the link picker ===== */
(function(){
  'use strict';
  const st=document.createElement('style'); st.textContent='#tasks input.lk-num{width:86px;min-width:70px;text-align:center;padding:4px 6px} #tasks input.lk-num.bad{border-color:#e5484d!important;box-shadow:0 0 0 2px rgba(229,72,77,.2)} #tasks button[onclick^="openLinkPicker("]{display:none!important}'; document.head.appendChild(st);
  function swap(){
    document.querySelectorAll('#tasks button.tw-chipbtn[onclick^="openLinkPicker("]').forEach(b=>{
      const m=(b.getAttribute('onclick')||'').match(/openLinkPicker\('([^']*)',\s*'([^']*)'\)/); if(!m) return;
      const txt=b.textContent.trim(), cur=/link/i.test(txt)?'':txt.replace(/#/g,'').replace(/\s*,\s*/g,', ');
      const i=document.createElement('input'); i.className='tm-in lk-num'; i.value=cur; i.placeholder='e.g. 3, 5'; i.title='Type the numbers of the sub milestones this one waits for, separated by commas. Leave empty for no link.';
      i.dataset.tid=m[1]; i.dataset.sid=m[2]; if(b.disabled) i.disabled=true;
      i.onchange=()=>window.edptSetLinksTyped(m[1],m[2],i.value,i);
      i.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); i.blur(); } };
      b.replaceWith(i);
    });
  }
  window.edptSetLinksTyped=function(tid,sid,text,el){
    try{
      const p=lkP(), id=sid||tid, R=lkRecs(p), rec=R.find(r=>r.id===id); if(!rec) return;
      const nums=lkNums(p), byNum={}; Object.entries(nums).forEach(([k,n])=>{ byNum[String(n)]=k; });
      const parts=String(text||'').split(/[,;\s]+/).map(x=>x.replace(/^#/,'').trim()).filter(Boolean);
      const bad=lkDesc(p,id), ids=[], errs=[];
      parts.forEach(n=>{ const k=byNum[n]; if(!/^\d+$/.test(n)||!k) errs.push(`#${n} does not exist`); else if(k===id) errs.push(`#${n} is this sub milestone itself`); else if(bad.has(k)) errs.push(`#${n} is linked after this one, so it would create a loop`); else if(!ids.includes(k)) ids.push(k); });
      if(errs.length){ if(el){ el.classList.add('bad'); } alert('Linked From not saved for #'+nums[id]+' '+rec.name+':\n\n• '+errs.join('\n• ')+'\n\nUse the numbers shown in the No. column, separated by commas.'); if(el){ el.value=(rec.o.links||[]).map(x=>nums[x]).filter(Boolean).join(', '); el.classList.remove('bad'); } return; }
      const same=JSON.stringify([...(rec.o.links||[])].sort())===JSON.stringify([...ids].sort()); if(same) return;
      rec.o.links=ids;
      const mp=lkMaxPred(p,rec.o);
      if(mp&&rec.o.start&&rec.o.start<=mp){ const n=wdDiff(rec.o.start,lkNext(mp)); if(n>0&&confirm(`“${rec.name}” starts on ${fmtDate(rec.o.start)}, before its linked task finishes (${fmtDate(mp)}).\nMove it ${n} working day(s) later (tasks linked after it move too)?`)){ lkShiftTask(p.id,id,n,'Scheduled after linked task'); return; } }
      lkFinish(p);
    }catch(e){ console.error(e); alert('Could not save the links: '+e.message); }
  };
  const r0=window.renderTasks;
  if(typeof r0==='function') window.renderTasks=function(){ const r=r0.apply(this,arguments); try{ swap(); }catch(e){ console.warn(e); } return r; };
  try{ swap(); }catch(e){}
})();

/* ===== ADPT v35.12 — Project schedule received (tick box in Project Schedule) ===== */
(function(){
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const canEdit=()=>{ try{ return typeof window.edptCan==='function'?!!window.edptCan('Task Management','Add'):!!(window.twAdmin&&window.twAdmin()); }catch(e){ return false; } };
  const cur=()=>{ try{ const id=document.getElementById('taskProjectFilter')?.value; return (db.projects||[]).find(p=>p.id===id)||(typeof project==='function'?project():null); }catch(e){ return null; } };
  const me=()=>{ try{ const u=typeof twU==='function'?twU():null; return u?(u.owner||u.name||''):''; }catch(e){ return ''; } };
  const fdt=d=>{ try{ return typeof fmtDate==='function'?fmtDate(d):d; }catch(e){ return d; } };
  if(!document.getElementById('srCss')){ const st=document.createElement('style'); st.id='srCss'; st.textContent=`
    .sr-box{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:12px 0 0;padding:10px 14px;border:1px solid var(--sb-line,#e4e4e7);border-radius:10px;background:var(--sb-panel,#fff)}
    .sr-box.no{border-color:#f59e0b;background:color-mix(in srgb,#f59e0b 8%,var(--sb-panel,#fff))}
    .sr-box label{display:flex;align-items:center;gap:8px;font-weight:600;cursor:pointer;margin:0}
    .sr-box input[type=checkbox]{width:18px;height:18px;margin:0;cursor:pointer}
    .sr-box input:disabled,.sr-box input:disabled+span{cursor:not-allowed}
    .sr-box .muted{font-size:12px}`; document.head.appendChild(st); }
  function box(){
    const host=document.getElementById('tmUnplSum'); if(!host) return;
    host.querySelector('.sr-box')?.remove();
    const p=cur(); if(!p||!String(p.code||'').trim()) return;
    const r=p.schedRecv||{}, on=!!r.on, ed=canEdit();
    const d=document.createElement('div'); d.className='sr-box';
    d.innerHTML=`<label><input type="checkbox" id="srChk" ${on?'checked':''} ${ed?'':'disabled'} onchange="edptSchedRecv(this.checked)"><span>Project schedule received</span></label>
`;
    host.prepend(d);
  }
  window.edptSchedRecv=function(on){
    if(!canEdit()){ alert('You do not have permission to change this.'); box(); return; }
    const p=cur(); if(!p) return;
    const t=new Date(), iso=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    p.schedRecv=on?{on:true,date:iso,by:me()}:{on:false,date:'',by:me()};
    try{ save(false); }catch(e){ console.warn(e); }
    box();
  };
  const t0=window.tmSummary;
  if(typeof t0==='function') window.tmSummary=function(){ const r=t0.apply(this,arguments); try{ box(); }catch(e){ console.warn(e); } return r; };
  try{ box(); }catch(e){}
})();
