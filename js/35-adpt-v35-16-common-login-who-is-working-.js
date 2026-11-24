/* ===== ADPT v35.16 — common login, who-is-working, daily task windows, access, stay signed in, loading screen =====
   - The common Electrical Design login is an account, not a person: it never appears in people lists.
     Whoever uses it picks their own name ("Working as"); updates, leave, announcements and date changes are
     recorded with that person's name.
   - Daily task: no Remarks in the Assign window; the Update window shows only Status (+ finished date), Remarks
     and Updated by. Help requests show in the task name, not in remarks.
   - Settings (colours): Admin, AGM, Manager, Team Leader and the common login.
   - Announcements: everyone can post; the author or the Admin can delete.
   - Project Setup: hidden for the common login; project start / end dates only by Admin, AGM, Manager, Team Leader;
     every date change records who changed it.
   - Refresh keeps you signed in (until Sign out); a loading screen shows while data loads. */
(function(){
  'use strict';
  const E=s=>(typeof esc==='function'?esc(s):String(s??''));
  const norm=s=>String(s||'').trim().toLowerCase();
  const SS={get:k=>{ try{ return sessionStorage.getItem(k)||''; }catch(e){ return ''; } }, set:(k,v)=>{ try{ v?sessionStorage.setItem(k,v):sessionStorage.removeItem(k); }catch(e){} }};

  /* ---------- the common login ---------- */
  const COMMON_RE=/^electrical\s*design(\s*(team|common|id|login))?$/i;
  function isCommonId(id){
    if(!id) return false;
    try{ if(typeof window.edptIsSharedLogin==='function'&&window.edptIsSharedLogin(id)) return true; }catch(e){}
    const u=db&&db.users&&db.users[id];
    if(u&&u.teamMember) return false;
    return /^electrical[._-]?design(@|$)/i.test(String(id)) || (!!u&&COMMON_RE.test(String(u.name||'').trim()));
  }
  window.edptIsCommon=isCommonId;
  const common=()=>{ try{ return !!TW.me&&isCommonId(TW.me); }catch(e){ return false; } };
  const lead=()=>{ try{ const u=twU(); return !!u&&!common()&&(u.admin||twLead(u)); }catch(e){ return false; } };
  /* v35.17: everything follows Team & Access (designation defaults + individual overrides); Admin always allowed */
  const can=(m,a)=>{ try{ const u=twU(); if(!u) return false; if(u.admin) return true; return typeof window.edptCan==='function'?!!window.edptCan(m,a):false; }catch(e){ return false; } };
  window.edptAllow=can;
  /* people lists never include the common login */
  const pe0=window.edptPeopleIds;
  if(typeof pe0==='function') window.edptPeopleIds=function(){ return pe0.apply(this,arguments).filter(id=>!isCommonId(id)); };
  const as0=window.twAssignable;
  if(typeof as0==='function') window.twAssignable=function(){ return as0.apply(this,arguments).filter(id=>!isCommonId(id)); };
  const people=()=>{ try{ return (typeof edptPeopleIds==='function'?edptPeopleIds():Object.keys(db.users||{})).filter(id=>!isCommonId(id)); }catch(e){ return []; } };

  /* ---------- "Working as" for the common login ---------- */
  const ACT='adptActAs';
  function actAs(){ const id=SS.get(ACT); return id&&db.users&&db.users[id]&&!isCommonId(id)?id:''; }
  /* the person doing the work now: own login = me; common login = the chosen name */
  function actor(){ try{ return common()?(actAs()||''):TW.me; }catch(e){ return ''; } }
  window.edptActor=actor;
  const actorName=()=>{ const a=actor(); return a?twName(a):(common()?twName(TW.me):''); };
  window.edptActorName=actorName;
  function pickActor(then){
    const notLead=id=>{ const u=db.users[id]||{}; return !u.admin&&!['AGM','Manager','Team Leader','Admin'].includes(String(u.role||'').trim()); };
    const TMs=db.teamMembers||{}, tm=people().filter(id=>Object.prototype.hasOwnProperty.call(TMs,id)&&notLead(id));
    const ps=(tm.length?tm:people().filter(notLead)).sort((a,b)=>twName(a).localeCompare(twName(b))), cur=actAs();
    const m=twModal('Who is using the common login?',`<p class="muted" style="margin:0">Several people use the Electrical Design login. Choose your name — the tool then works as you: your tasks, your leave and your updates show <b>your</b> name.</p>
      <div class="tw-f"><label for="caWho">Your name</label><select id="caWho" required><option value="">— choose your name —</option>${ps.map(id=>`<option value="${E(id)}" ${id===cur?'selected':''}>${E(twName(id))}</option>`).join('')}</select></div>`,
      mm=>{ const v=mm.querySelector('#caWho').value; if(!v) return 'Choose your name.'; SS.set(ACT,v); try{ twTopRender(); }catch(e){} if(typeof then==='function') setTimeout(then,0); },'Continue');
    return m;
  }
  window.edptPickActor=pickActor;
  /* top bar chip */
  const top0=window.twTopRender;
  if(typeof top0==='function') window.twTopRender=function(){
    const r=top0.apply(this,arguments);
    try{ if(common()){ const l=document.querySelector('#twTop .sb-l'); if(l&&!l.querySelector('.ca-chip')){ const b=document.createElement('button'); b.className='ca-chip'; b.title='The common login is used by several people. Click to change your name.'; b.innerHTML=actAs()?`Working as <b>${E(twName(actAs()))}</b> ▾`:'<b>Choose your name</b> ▾'; b.onclick=()=>pickActor(); l.appendChild(b); } } }catch(e){}
    return r;
  };
  const enter0=window.twEnter;
  if(typeof enter0==='function') window.twEnter=function(){ const r=enter0.apply(this,arguments); try{ if(common()&&!actAs()) setTimeout(()=>{ if(!document.querySelector('#caWho')) pickActor(); },300); applyNav(); }catch(e){} return r; };

  /* ---------- styles ---------- */
  const st=document.createElement('style'); st.textContent=`
    .ca-chip{margin-left:10px;border:1px solid var(--sb-line2,#d4d4d8);background:var(--sb-panel,#fff);color:var(--sb-fg,#18181b);border-radius:16px;padding:3px 10px;font-size:12px;cursor:pointer;white-space:nowrap}
    .ca-chip b{font-weight:600}
    #adptLoad{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:var(--tw-bg,#f6f7f9);transition:opacity .25s}
    #adptLoad.out{opacity:0;pointer-events:none}
    #adptLoad .al-box{width:min(420px,88vw);text-align:center;color:var(--tw-fg,#18181b);font-family:inherit}
    #adptLoad .al-logo{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--tw-muted,#71717a);margin-bottom:18px}
    #adptLoad .al-logo b{color:var(--tw-brand,#1f9d61);letter-spacing:.12em}
    #adptLoad .al-ring{width:64px;height:64px;margin:0 auto 18px;position:relative}
    #adptLoad .al-ring i{position:absolute;inset:0;border-radius:50%;border:4px solid transparent;border-top-color:var(--tw-brand,#1f9d61);animation:alSpin 1s linear infinite}
    #adptLoad .al-ring i:nth-child(2){inset:9px;border-top-color:#2563eb;animation-duration:1.4s;animation-direction:reverse}
    #adptLoad .al-ring i:nth-child(3){inset:18px;border-top-color:#f59e0b;animation-duration:1.9s}
    #adptLoad h3{margin:0 0 6px;font-size:17px;font-weight:600}
    #adptLoad .al-msg{min-height:20px;font-size:14px;color:var(--tw-muted,#71717a);transition:opacity .2s}
    #adptLoad .al-bar{height:4px;border-radius:4px;background:color-mix(in srgb,var(--tw-muted,#71717a) 18%,transparent);overflow:hidden;margin:18px auto 0;width:70%}
    #adptLoad .al-bar span{display:block;height:100%;width:35%;border-radius:4px;background:var(--tw-brand,#1f9d61);animation:alSlide 1.3s ease-in-out infinite}
    #adptLoad .al-tip{margin-top:16px;font-size:12px;color:var(--tw-muted,#71717a)}
    @keyframes alSpin{to{transform:rotate(360deg)}} @keyframes alSlide{0%{transform:translateX(-110%)}100%{transform:translateX(310%)}}
    body.adpt-resuming #twLogin .ew-wrap{visibility:hidden}
    .du-help{color:#b45309;font-weight:600}`;
  document.head.appendChild(st);

  /* ---------- loading screen ---------- */
  const MSGS=['Connecting to the shared ADPT workspace…','Loading projects and schedules…','Counting milestones and sub milestones…','Checking who is on leave…','Lining up today’s daily tasks…','Working out what is on track and what is at risk…','Almost there — polishing the dashboard…'];
  const TIPS=['Tip: click a day in Team Capacity to see that day’s tasks.','Tip: book leave in Team Capacity so the plan stays honest.','Tip: tick “Project schedule received” in Project Schedule.','Tip: use Export Excel on any register to share it.','Tip: press Ctrl + F5 after a new version is uploaded.'];
  let LT=null, LN=0;
  function showLoad(title){
    let el=document.getElementById('adptLoad');
    if(!el){ el=document.createElement('div'); el.id='adptLoad'; el.innerHTML=`<div class="al-box"><div class="al-logo"><b>ADPT</b> · Armstrong Dematic Project Tracker</div><div class="al-ring"><i></i><i></i><i></i></div><h3></h3><div class="al-msg"></div><div class="al-bar"><span></span></div><div class="al-tip"></div></div>`; document.body.appendChild(el); }
    el.classList.remove('out'); el.querySelector('h3').textContent=title||'Please wait a moment';
    const msg=el.querySelector('.al-msg'); LN=0; msg.textContent=MSGS[0]; el.querySelector('.al-tip').textContent=TIPS[Math.floor(Math.random()*TIPS.length)];
    clearInterval(LT); LT=setInterval(()=>{ LN=Math.min(LN+1,MSGS.length-1); msg.style.opacity=0; setTimeout(()=>{ msg.textContent=MSGS[LN]; msg.style.opacity=1; },180); },1500);
  }
  function hideLoad(){ clearInterval(LT); document.body.classList.remove('adpt-resuming'); const el=document.getElementById('adptLoad'); if(el){ el.classList.add('out'); setTimeout(()=>el.remove(),300); } }
  window.edptShowLoading=showLoad; window.edptHideLoading=hideLoad;

  /* ---------- stay signed in after refresh ---------- */
  const li0=window.edptLoginWithCloud;
  if(typeof li0==='function') window.edptLoginWithCloud=async function(){ showLoad('Signing you in'); try{ return await li0.apply(this,arguments); } finally{ hideLoad(); } };
  window.edptResume=async function(){
    let s=null;
    try{ const r=await EDPT_SB.auth.getSession(); s=r&&r.data&&r.data.session; }catch(e){ console.warn('ADPT session check',e); }
    if(!s||!s.user){ hideLoad(); return; }
    showLoad('Welcome back');
    try{ await window.edptFinishLogin(s.user); }
    catch(e){ console.warn('ADPT resume failed',e); try{ await EDPT_SB.auth.signOut(); }catch(_){} try{ twLoginRender(); const er=document.getElementById('twLerr'); if(er) er.textContent='Your session has ended. Please sign in again.'; }catch(_){} }
    finally{ hideLoad(); }
  };
  const lo0=window.twLogout;
  if(typeof lo0==='function') window.twLogout=async function(){ SS.set(ACT,''); return lo0.apply(this,arguments); };

  /* ---------- menu & access ---------- */
  try{ if(Array.isArray(TW_ADMIN_TABS)){ const i=TW_ADMIN_TABS.indexOf('settings'); if(i>=0) TW_ADMIN_TABS.splice(i,1); } }catch(e){}
  const canSettings=()=>can('Settings','View');
  const nav0=window.twNav;
  window.twNav=function(){
    let n=typeof nav0==='function'?nav0.apply(this,arguments):[];
    if(!can('Project Setup','View')) n=n.filter(x=>x[0]!=='setup');
    if(canSettings()&&!n.some(x=>x[0]==='settings')) n.push(['settings','Settings']);
    if(!canSettings()) n=n.filter(x=>x[0]!=='settings');
    return n;
  };
  function applyNav(){ try{ if(typeof twShell==='function'&&!document.querySelector('[data-twgo="settings"]')&&canSettings()){} }catch(e){} }
  const sw0=window.switchTab;
  window.switchTab=function(name){
    if(TW.me&&((name==='setup'&&!can('Project Setup','View'))||(name==='settings'&&!canSettings()))) name='dashboard';
    return sw0.call(this,name);
  };

  /* ---------- Daily task: Assign window ---------- */
  const last=()=>{ const l=document.querySelectorAll('.tw-modal'); return l[l.length-1]||null; };
  function blankFirst(sel,label,val){ if(!sel) return; [...sel.options].forEach(o=>{ if(isCommonId(o.value)) o.remove(); }); if(![...sel.options].some(o=>o.value==='')) sel.insertAdjacentHTML('afterbegin',`<option value="">${E(label)}</option>`); sel.value=val&&[...sel.options].some(o=>o.value===val)?val:''; }
  function onlyMe(sel){ if(!sel) return; const me=TW.me; if(![...sel.options].some(o=>o.value===me)) sel.insertAdjacentHTML('afterbegin',`<option value="${E(me)}">${E(twName(me))}</option>`); sel.value=me; }
  const nd0=window.twNewDaily;
  if(typeof nd0==='function') window.twNewDaily=function(){
    if(common()&&!actAs()) return pickActor(()=>window.twNewDaily.apply(this,arguments));
    const r=nd0.apply(this,arguments), m=last(); if(!m||!m.querySelector('#twDt')) return r;
    try{
      const dn=m.querySelector('#twDn'); if(dn){ dn.value=''; dn.closest('.tw-f').style.display='none'; }
      const t=m.querySelector('#twDt'); if(t){ t.placeholder='Write the task in detail — what has to be done'; const lb=m.querySelector('label[for="twDt"]'); if(lb) lb.textContent='Task (write the details here)'; }
      const by=m.querySelector('#twDby'), to=m.querySelector('#twDa'), hp=m.querySelector('#twDh');
      [by,to,hp].forEach(s=>s&&[...s.options].forEach(o=>{ if(isCommonId(o.value)) o.remove(); }));
      if(common()){ if(by){ by.innerHTML=`<option value="${E(actAs())}">${E(twName(actAs()))}</option>`; by.value=actAs(); by.disabled=true; } blankFirst(to,'— choose person —',actAs()); }
      else onlyMe(by);
      const form=m.querySelector('form'), orig=form&&form.onsubmit; if(form&&orig) form.onsubmit=function(e){ if(by) by.disabled=false; const res=orig.call(form,e); if(by&&common()) by.disabled=true; return res; };
    }catch(e){ console.warn(e); }
    return r;
  };

  /* ---------- Daily task: Update window ---------- */
  const ud0=window.twDUpdate;
  /* who may do what in the Update window (v35.17, follows Team & Access):
     - Daily Tasks "Edit"   → change status, start / finish dates and remarks of any task (Admin, AGM, Manager, Team Leader by default)
     - own login            → status and remarks of tasks assigned to / by / helped by that person
     - common login         → remarks only (Daily Tasks "Update"), recorded under the chosen name; "Edit" for the common login also allows status / dates */
  const isMine=t=>!common()&&[t.assigneeId,t.assignerId,...(t.helpIds||[])].some(k=>k&&(k===TW.me||(typeof edptPersonMatch==='function'&&edptPersonMatch(TW.me,k))));
  if(typeof ud0==='function') window.twDUpdate=function(id,pre){
    const t=(db.daily||[]).find(x=>x.id===id); if(!t) return;
    if(common()&&!actAs()) return pickActor(()=>window.twDUpdate(id,pre));
    const full=can('Daily Tasks','Edit'), mine=isMine(t), rem=common()&&can('Daily Tasks','Update');
    if(!full&&!mine&&!rem) return alert(common()?'You do not have permission to update daily tasks. Contact the ADPT Admin.':`Only ${twName(t.assigneeId)} (the person it is assigned to), the person who assigned it, or a Team Leader / Manager can update this task.`);
    const statusOK=full||mine;
    window.__caWhy=common()?`Common login · working as ${twName(actAs())} · ${full?'may change status, dates and remarks (Daily Tasks: Edit)':'remarks only'}`:'';
    const r=ud0.apply(this,arguments), m=last(); if(!m||!m.querySelector('#twUs')) return r;
    try{
      const hide=el=>{ if(el) el.style.display='none'; };
      hide(m.querySelector('#twUh')?.closest('.tw-f'));
      hide(m.querySelector('#wpPlanRow')); hide(m.querySelector('#wpWarn'));
      [...m.querySelectorAll('p.muted')].forEach(p=>{ if(/^Dates:/.test(p.textContent.trim())) hide(p); });
      const st=m.querySelector('#twUs'), fdw=m.querySelector('#twUf')?.closest('.tw-f');
      if(!statusOK){ st.value=t.status==='Closed'?'Closed':(t.status||'Open'); st.disabled=true; st.title='Only the remarks can be updated from this login.'; }
      const sync=()=>{ if(fdw) fdw.style.display=(statusOK&&st.value==='Closed')?'':'none'; }; st.addEventListener('change',sync); sync();
      let dS=null,dE=null;
      if(full){ const row=document.createElement('div'); row.className='tw-2';
        row.innerHTML=`<div class="tw-f"><label for="caDs">Start date</label><input id="caDs" type="date" value="${E(t.start||'')}"></div><div class="tw-f"><label for="caDe">Finish (due) date</label><input id="caDe" type="date" value="${E(t.date||'')}"></div>`;
        (st.closest('.tw-2')||st.closest('.tw-f')).before(row); dS=row.querySelector('#caDs'); dE=row.querySelector('#caDe'); }
      const ub=m.querySelector('#twUb');
      if(ub){ const who=common()?actAs():TW.me; ub.innerHTML=`<option value="${E(who)}">${E(twName(who))}</option>`; ub.value=who; ub.disabled=true;
        const lb=m.querySelector('label[for="twUb"]'); if(lb) lb.textContent='Updated by'; }
      const lg=(t.log||[]).slice(-1)[0];
      if(lg&&lg.by){ const p=document.createElement('p'); p.className='muted'; p.style.cssText='margin:0;font-size:12px'; p.textContent=`Last update: ${twName(lg.by)} · ${new Date(lg.at).toLocaleString()}`; m.querySelector('.tw-foot')?.before(p); }
      if(!statusOK){ const p=document.createElement('p'); p.className='muted'; p.style.cssText='margin:0;font-size:12px'; p.textContent='This login can update the remarks only. Status and dates are changed by the Team Leader / Manager.'; m.querySelector('.tw-foot')?.before(p); }
      if(window.__caWhy){ const p=document.createElement('p'); p.className='muted'; p.style.cssText='margin:0;font-size:11.5px'; p.textContent='Access: '+window.__caWhy; m.querySelector('.tw-foot')?.before(p); }
      const form=m.querySelector('form'), orig=form.onsubmit, err=m.querySelector('[data-err]');
      form.onsubmit=function(e){
        if(dS&&dE){ const a=dS.value, b=dE.value; if(!a||!b||b<a){ e.preventDefault(); if(err) err.textContent=!a||!b?'Enter the start and finish dates.':'Finish date cannot be before the start date.'; return; }
          if(a!==t.start||b!==t.date){ (t.log=t.log||[]).push({at:Date.now(),by:actor()||TW.me,status:t.status,remark:`Dates changed: ${t.start?fmtDate(t.start):'—'} → ${fmtDate(a)} … ${t.date?fmtDate(t.date):'—'} → ${fmtDate(b)}`}); t.start=a; t.date=b; } }
        if(ub) ub.disabled=false; st.disabled=false; const res=orig.call(form,e); ub&&(ub.disabled=true); if(!statusOK) st.disabled=true; return res; };
    }catch(e){ console.warn(e); }
    return r;
  };
  /* Project Review tasks shown in Daily Tasks: same rule (common login = remarks only) */
  const pr0=window.twUpdateProjectReviewDaily;
  if(typeof pr0==='function') window.twUpdateProjectReviewDaily=function(id){
    const t=(db.daily||[]).find(x=>x.id===id); if(!t) return pr0.apply(this,arguments);
    if(common()&&!actAs()) return pickActor(()=>window.twUpdateProjectReviewDaily(id));
    const n0=(t.log||[]).length, r=pr0.apply(this,arguments), m=last(); if(!m||!m.querySelector('#pruRemarks')) return r;
    try{
      const full=can('Daily Tasks','Edit')||(!common()&&isMine(t));
      if(!full){ ['#pruTitle','#pruStart','#pruEnd','#pruStatus','#pruFinished'].forEach(q=>{ const el=m.querySelector(q); if(el){ el.readOnly=true; if(el.tagName==='SELECT') el.disabled=true; el.style.opacity=.7; } });
        const p=document.createElement('p'); p.className='muted'; p.style.cssText='margin:0;font-size:12px'; p.textContent='This login can update the remarks only.'; m.querySelector('.tw-foot')?.before(p); }
      const form=m.querySelector('form'), orig=form.onsubmit;
      form.onsubmit=function(e){ const s=m.querySelector('#pruStatus'); if(s) s.disabled=false; const res=orig.call(form,e);
        try{ if(common()&&actAs()){ (t.log||[]).slice(n0).forEach(l=>{ if(l.by===TW.me) l.by=actAs(); }); if(t.closedBy===TW.me) t.closedBy=actAs(); save(false); twDailyRender(); } }catch(_){}
        if(s&&!full) s.disabled=true; return res; };
    }catch(e){ console.warn(e); }
    return r;
  };
  const ds0=window.twDStart;
  if(typeof ds0==='function') window.twDStart=function(id){ const r=ds0.apply(this,arguments); try{ const t=(db.daily||[]).find(x=>x.id===id), lg=t&&(t.log||[]).slice(-1)[0]; if(lg&&common()&&actAs()&&lg.by===TW.me){ lg.by=actAs(); save(false); } }catch(e){} return r; };

  const tc0=window.twCan;
  if(typeof tc0==='function') window.twCan=function(x,f){
    if(common()){ const a=actAs(); if(!a||!x) return false; const own=String(x.owner||'').trim().toLowerCase(), me=String((db.users[a]||{}).owner||twName(a)).trim().toLowerCase();
      if(own!==me) return false; if(!can('Task Management','Update')&&!can('Task Management','Edit')) return /remark/i.test(f); return (typeof TW_OWNER_FIELDS!=='undefined'?TW_OWNER_FIELDS:['status','pct','actualHours','remarks']).includes(f); }
    return tc0.apply(this,arguments); };

  /* ---------- Leave: the common login books for a chosen person ---------- */
  const bl0=window.edptBookLeave;
  if(typeof bl0==='function') window.edptBookLeave=function(pre){
    if(common()&&!actAs()&&!pre) return pickActor(()=>window.edptBookLeave());
    const r=bl0.apply(this,arguments), m=last(), sel=m&&m.querySelector('#lvP'); if(!sel) return r;
    try{
      [...sel.options].forEach(o=>{ if(isCommonId(o.value)) o.remove(); });
      if(common()){ const me=actAs(); if(![...sel.options].some(o=>o.value===me)&&me) sel.insertAdjacentHTML('afterbegin',`<option value="${E(me)}">${E(twName(me))}</option>`); sel.value=me; sel.disabled=true; sel.title='Leave is booked for the name chosen at sign-in. Click “Working as” at the top to change it.'; sel.dispatchEvent(new Event('change')); }
      const form=m.querySelector('form'), orig=form.onsubmit, n0=((db.capacity||{}).leaves||[]).length;
      form.onsubmit=function(e){ if(common()) sel.disabled=false; if(!sel.value){ e.preventDefault(); m.querySelector('[data-err]').textContent='Choose the person going on leave.'; return; } const res=orig.call(form,e); try{ const L=(db.capacity||{}).leaves||[]; if(L.length>n0&&common()){ const l=L[L.length-1]; l.by=actor()||l.by; l.byName=actorName(); save(false); } }catch(_){} return res; };
    }catch(e){ console.warn(e); }
    return r;
  };

  /* ---------- Announcements: everyone can post ---------- */
  window.twNewAnn=function(){
    if(!twU()) return;
    if(!can('Announcements','Add')) return alert('You do not have permission to post announcements. Contact the ADPT Admin.');
    if(common()&&!actAs()) return pickActor(()=>window.twNewAnn());
    twModal('Post Announcement',`<div class="tw-f"><label for="twAt">Title</label><input id="twAt" required maxlength="120"></div><div class="tw-f"><label for="twAb">Message</label><textarea id="twAb" rows="5" required></textarea></div><div class="tw-2"><div class="tw-f"><label for="twAp">Priority</label><select id="twAp"><option>Normal</option><option>High</option></select></div>${can('Announcements','Edit')?`<div class="tw-f"><label for="twApin">Pin to top</label><select id="twApin"><option value="0">No</option><option value="1">Yes</option></select></div>`:''}</div>`,
      m=>{ const ti=m.querySelector('#twAt').value.trim(), bo=m.querySelector('#twAb').value.trim(); if(!ti||!bo) return 'Enter a title and a message.';
        db.announcements.push({id:uid(),title:ti,body:bo,priority:m.querySelector('#twAp').value,pinned:!!(m.querySelector('#twApin')&&m.querySelector('#twApin').value==='1'),by:actor()||TW.me,byName:actorName(),login:TW.me,at:Date.now()}); save(false); twHomeRender(); },'Post');
  };
  const own=a=>{ try{ return can('Announcements','Delete')||(can('Announcements','Add')&&(a.login||a.by)===TW.me&&(!common()||a.by===actAs())); }catch(e){ return false; } };
  window.twAnnList=function(){
    const a=db.announcements.slice().sort((x,y)=>(y.pinned?1:0)-(x.pinned?1:0)||(y.at||0)-(x.at||0));
    if(!a.length) return `<div class="tw-empty"><h3>No Announcements Available</h3><p>Nothing posted yet. Post one with “Post Announcement”.</p></div>`;
    return `<div class="tw-ann">${a.map(x=>`<article class="tw-ai ${x.priority==='High'?'high':''} ${x.pinned?'pin':''}"><h4>${E(x.title)}${x.pinned?' <span class="tw-chip blue">Pinned</span>':''}${x.priority==='High'?' <span class="tw-chip red">Important</span>':''}</h4><p>${E(x.body)}</p><div class="tw-meta"><span>${E(x.byName||twName(x.by))}</span><span>${twTime(x.at)}</span>${can('Announcements','Edit')?`<button class="small" data-pin="${x.id}">${x.pinned?'Unpin':'Pin'}</button>`:''}${own(x)?`<button class="small danger" data-delown="${x.id}">Delete</button>`:''}</div></article>`).join('')}</div>`;
  };
  const hr0=window.twHomeRender;
  if(typeof hr0==='function') window.twHomeRender=function(){
    const r=hr0.apply(this,arguments);
    try{
      const host=document.getElementById('twHome'); if(!host||!twU()) return r;
      const h2=[...host.querySelectorAll('.tw-ch h2')].find(h=>/Announcements/.test(h.textContent)), ch=h2&&h2.closest('.tw-ch');
      if(ch&&!ch.querySelector('[data-twt="+ann"]')&&can('Announcements','Add')){ const b=document.createElement('button'); b.className='primary small'; b.dataset.twt='+ann'; b.textContent='Post Announcement'; b.onclick=()=>window.twNewAnn(); ch.appendChild(b); }
      host.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>{ if(!can('Announcements','Edit')) return; const a=db.announcements.find(x=>x.id===b.dataset.pin); if(a){ a.pinned=!a.pinned; save(false); twHomeRender(); } });
      host.querySelectorAll('[data-delown]').forEach(b=>b.onclick=()=>{ const a=db.announcements.find(x=>x.id===b.dataset.delown); if(!a||!own(a)||!confirm('Delete this announcement for everyone?')) return; db.announcements=db.announcements.filter(x=>x!==a); save(false); twHomeRender(); });
    }catch(e){ console.warn(e); }
    return r;
  };

  /* ---------- Project Setup: dates only by leads; record who changed dates ---------- */
  function lockDates(){
    try{ const isNew=typeof creatingProject!=='undefined'&&!!creatingProject, ro=!can('Project Date Change','Edit')&&!isNew;
      ['projectStart','projectEnd'].forEach(id=>{ const el=document.getElementById(id); if(!el) return; if(ro){ el.disabled=true; el.title='You do not have permission to change project dates (Team & Access → Project Date Change).'; } else if(el.title){ el.title=''; if(typeof twSetupCanSave!=='function'||twSetupCanSave()) el.disabled=false; } });
      let n=document.getElementById('caDateNote'); const host=document.getElementById('projectEnd')?.closest('.field');
      if(ro&&host&&!n){ n=document.createElement('div'); n.id='caDateNote'; n.className='muted'; n.style.cssText='font-size:11.5px;margin-top:3px'; n.textContent='Project dates are locked for your login'; host.appendChild(n); }
      if(!ro&&n) n.remove();
    }catch(e){}
  }
  ['renderSetup','selectProject','newProject','cancelNewProject','twSetupLock'].forEach(nm=>{ const f=window[nm]; if(typeof f!=='function') return; window[nm]=function(){ const r=f.apply(this,arguments); setTimeout(lockDates,0); return r; }; });
  const ss0=window.saveProjectSetup;
  if(typeof ss0==='function') window.saveProjectSetup=function(){
    try{ const isNew=typeof creatingProject!=='undefined'&&!!creatingProject;
      if(!isNew&&!can('Project Date Change','Edit')){ const p=project(); ['projectStart','projectEnd'].forEach(id=>{ const el=document.getElementById(id), k=id==='projectStart'?'start':'end'; if(el&&p&&(el.value||'')!==(p[k]||'')) el.value=p[k]||''; }); } }catch(e){}
    return ss0.apply(this,arguments);
  };
  /* every new date-change record gets the name of the person who made it */
  let KNOWN=new WeakSet();
  const markAll=()=>{ KNOWN=new WeakSet(); (db.history||[]).forEach(h=>h&&typeof h==='object'&&KNOWN.add(h)); };
  const stamp=()=>{ try{ if(!TW.me) return; const nm=actorName()||twName(TW.me); (db.history||[]).forEach(h=>{ if(h&&typeof h==='object'&&!KNOWN.has(h)){ if(!h.by) h.by=nm; KNOWN.add(h); } }); }catch(e){} };
  const sv0=window.save;
  let BASE=new Map();
  const snap=()=>{ BASE=new Map((db.daily||[]).map(t=>[t.id,{status:t.status,start:t.start,date:t.date,closedAt:t.closedAt,closedBy:t.closedBy}])); };
  function guard(){
    try{ if(!common()||can('Daily Tasks','Edit')) return; let n=0;
      (db.daily||[]).forEach(t=>{ const b=BASE.get(t.id); if(!b) return; if(t.status!==b.status||t.start!==b.start||t.date!==b.date){ Object.assign(t,b); n++; } });
      if(n) alert('This login can update the remarks only. The status / date change was not saved — ask your Team Leader or Manager.');
    }catch(e){ console.warn(e); } }
  window.save=save=function(){ stamp(); guard(); const r=sv0.apply(this,arguments); snap(); return r; };
  const ld0=window.edptLoadCloudState;
  if(typeof ld0==='function') window.edptLoadCloudState=async function(){ const r=await ld0.apply(this,arguments); markAll(); snap(); return r; };
  markAll(); snap();
  /* show "Changed by" in the date change table */
  const rh0=window.renderHistory;
  if(typeof rh0==='function') window.renderHistory=function(){
    const r=rh0.apply(this,arguments);
    try{ const tb=document.getElementById('historyTable'), table=tb&&tb.closest('table'); if(!table) return r;
      const hr=table.querySelector('thead tr'); if(hr&&![...hr.cells].some(c=>c.dataset.by)){ const th=document.createElement('th'); th.dataset.by='1'; th.textContent='Changed by'; hr.appendChild(th); }
      const q=(document.getElementById('historySearch')?.value||'').toLowerCase(), rows=db.history.filter(h=>JSON.stringify(h).toLowerCase().includes(q));
      [...tb.rows].forEach((tr,i)=>{ if(tr.cells.length<=1) return; const h=rows[i]; const td=document.createElement('td'); td.textContent=h&&h.by?h.by:'—'; tr.appendChild(td); });
    }catch(e){ console.warn(e); }
    return r;
  };
})();
