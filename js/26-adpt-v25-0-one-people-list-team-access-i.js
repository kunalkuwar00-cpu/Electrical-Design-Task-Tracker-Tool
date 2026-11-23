/* ===== ADPT v25.0 — One people list: Team & Access is the master =====
   Rule: a person appears anywhere in the tool (Team & Access, every dropdown, Daily Tasks,
   Task Management owner lists, Project Setup, Team Capacity, search) ONLY if they have an
   ACTIVE Supabase login (edpt_profiles.is_active = true) and have not been removed.
   Old tracker-only records (e.g. legacy IDs, task owners with no login) are hidden, not deleted:
   their records, tasks and history stay in the saved data and in backups. */
(function(){
  'use strict';
  const norm=v=>String(v||'').trim().toLowerCase();
  const nameKey=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  window.EDPT_VERSION='v35.31';
  console.info('ADPT',window.EDPT_VERSION);
  // One spelling per role, whatever is typed in Supabase (TL, Team Lead, team leader, Sr. Manager, AGM …).
  function canonRole(v){
    const x=String(v||'').trim().toLowerCase().replace(/[._\-\/]+/g,' ').replace(/\s+/g,' ');
    if(!x) return '';
    if(/^admin/.test(x)) return 'Admin';
    if(/^a ?g ?m$|assistant general manager|asst\.? ?general manager|deputy general manager|^dgm$/.test(x)) return 'AGM';
    if(/^t ?l$|team ?lead|^lead$|group lead/.test(x)) return 'Team Leader';
    if(/manager|^mgr$|^pm$/.test(x)) return 'Manager';
    if(/^hod$|member|engineer|designer|draughts|trainee|intern/.test(x)) return 'Member';
    return '';
  }
  window.edptCanonRole=canonRole;
  function normaliseRoles(){
    Object.getOwnPropertyNames(db.users||{}).forEach(k=>{
      const u=db.users[k]; if(!u) return;
      const c=canonRole(u.role)||canonRole(u.designation)||'Member';
      if(u.role!==c){ if(u.roleRaw===undefined) u.roleRaw=u.role; u.role=c; }
      if(c==='Admin') u.admin=true;
    });
  }
  // Project Setup must work for AGM, Manager and Team Leader: clear any individual override that blocks it (one time).
  function fixProjectSetupAccess(){
    try{
      const ac=db.accessControl; if(!ac||ac.projectSetupAccessV6) return;
      ac.roles ||= {};
      [['Manager',['View','Add','Edit','Update','Delete']],['AGM',['View','Add','Edit','Update']],['Team Leader',['View','Add','Edit','Update']],['Member',['View','Add','Edit','Update']]].forEach(([r,acts])=>{
        ac.roles[r] ||= {}; const cur=Array.isArray(ac.roles[r]['Project Setup'])?ac.roles[r]['Project Setup']:[];
        ac.roles[r]['Project Setup']=[...new Set([...cur,...acts])];
      });
      const al=window.EDPT_ALIAS_TO_PROFILE||{};
      Object.keys(ac.users||{}).forEach(id=>{
        const u=db.users[id]||db.users[al[norm(id)]]; const role=u?(canonRole(u.role)||canonRole(u.designation)):'';
        const ov=ac.users[id]&&ac.users[id]['Project Setup'];
        if(['Manager','AGM','Team Leader','Member'].includes(role) && Array.isArray(ov) && !ov.includes('Edit')) delete ac.users[id]['Project Setup'];
      });
      ac.projectSetupAccessV4=true; ac.projectSetupAccessV6=true;
    }catch(e){ console.warn('ADPT project setup access',e); }
  }
  // Task Management for everyone: AGM, Manager, Team Leader and Member get View/Add/Edit/Update
  // (add main tasks, subtasks, unplanned tasks, insert before task). Delete stays with Manager and Admin.
  function fixTaskManagementAccess(){
    try{
      const ac=db.accessControl; if(!ac||ac.taskMgmtAccessV5) return;
      ac.roles ||= {};
      [['Manager',['View','Add','Edit','Update','Delete']],['AGM',['View','Add','Edit','Update']],['Team Leader',['View','Add','Edit','Update']],['Member',['View','Add','Edit','Update']]].forEach(([r,acts])=>{
        ac.roles[r] ||= {}; const cur=Array.isArray(ac.roles[r]['Task Management'])?ac.roles[r]['Task Management']:[];
        ac.roles[r]['Task Management']=[...new Set([...cur,...acts])];
      });
      Object.keys(ac.users||{}).forEach(id=>{ const ov=ac.users[id]&&ac.users[id]['Task Management']; if(Array.isArray(ov)&&!ov.includes('Add')) delete ac.users[id]['Task Management']; });
      ac.taskMgmtAccessV5=true;
    }catch(e){ console.warn('ADPT task management access',e); }
  }
  const ulOpen0=window.ulOpen;
  if(typeof ulOpen0==='function') window.ulOpen=function(){ if(typeof twTaskCan==='function'&&!twTaskCan('Add')) return toast('You do not have permission to add unplanned tasks. Contact the ADPT Admin.'); return ulOpen0.apply(this,arguments); };
  // Hide Delete buttons for people without Task Management Delete.
  const rt0=window.renderTasks;
  if(typeof rt0==='function') window.renderTasks=function(){ const r=rt0.apply(this,arguments); try{ document.getElementById('tmUnplannedBtn')?.remove(); }catch(e){} try{ if(typeof twTaskCan==='function'&&!twTaskCan('Delete')) document.querySelectorAll('#tasks button[onclick^="deleteSubtask"],#tasks button[onclick^="deleteMainTask"]').forEach(b=>b.style.display='none'); }catch(e){} return r; };
  // Project delete: Admin, Manager, AGM and Team Leader — not Members (one time; you can still change it in Access Management).
  function fixProjectDeleteAccess(){
    try{
      const ac=db.accessControl; if(!ac||ac.projectDeleteAccessV7) return;
      ac.roles ||= {};
      ['Manager','AGM','Team Leader'].forEach(r=>{ ac.roles[r] ||= {}; const cur=Array.isArray(ac.roles[r]['Project Setup'])?ac.roles[r]['Project Setup']:['View']; ac.roles[r]['Project Setup']=[...new Set([...cur,'View','Add','Edit','Update','Delete'])]; });
      ac.roles.Member ||= {}; if(Array.isArray(ac.roles.Member['Project Setup'])) ac.roles.Member['Project Setup']=ac.roles.Member['Project Setup'].filter(a=>a!=='Delete');
      const al=window.EDPT_ALIAS_TO_PROFILE||{};
      Object.keys(ac.users||{}).forEach(id=>{
        const ov=ac.users[id]&&ac.users[id]['Project Setup']; if(!Array.isArray(ov)) return;
        const u=db.users[id]||db.users[al[norm(id)]]; const role=u?(canonRole(u.role)||canonRole(u.designation)):'';
        if(['Manager','AGM','Team Leader'].includes(role) && !ov.includes('Delete')) delete ac.users[id]['Project Setup'];
        if(role==='Member') ac.users[id]['Project Setup']=ov.filter(a=>a!=='Delete');
      });
      ac.projectDeleteAccessV7=true;
    }catch(e){ console.warn('ADPT project delete access',e); }
  }
  function setupButtons(){
    try{
      const can=a=>typeof twSetupCan==='function'?twSetupCan(a):(typeof twAdmin==='function'&&twAdmin());
      const creating=typeof creatingProject!=='undefined'&&!!creatingProject;
      const rule=(b,ok)=>{ if(!ok){ b.style.display='none'; b.dataset.permHidden='1'; } else if(b.dataset.permHidden){ b.style.display=''; delete b.dataset.permHidden; } };
      document.querySelectorAll('#setup button[onclick^="newProject"]').forEach(b=>rule(b,can('Add')));
      document.querySelectorAll('#setup button[onclick^="saveProjectSetup"]').forEach(b=>rule(b,creating?can('Add'):(can('Edit')||can('Update'))));
      document.querySelectorAll('#setup button[onclick^="deleteProject("],#setup button[onclick="deleteProject()"]').forEach(b=>rule(b,creating||can('Delete')));
      document.querySelectorAll('button[onclick^="editProject"]').forEach(b=>rule(b,can('Edit')||can('Update')));
      document.querySelectorAll('button[onclick^="deleteProjectById"]').forEach(b=>rule(b,can('Delete')));
    }catch(e){ console.warn('ADPT setup buttons',e); }
  }
  window.edptSetupButtons=setupButtons;
  // Keep "Selected Project" on the project that was opened (the list's Edit button used to jump back to the first one,
  // so Save went to the wrong project).
  const sel0=window.selectProject;
  if(typeof sel0==='function') window.selectProject=function(id){
    const r=sel0.apply(this,arguments);
    try{ const el=document.getElementById('projectSelect'); if(el && id && [...el.options].some(o=>o.value===id) && el.value!==id){ el.value=id; if(typeof renderSetup==='function') renderSetup(); el.value=id; } }catch(e){ console.warn(e); }
    return r;
  };
  const saveSetup0=window.saveProjectSetup;
  if(typeof saveSetup0==='function') window.saveProjectSetup=function(){
    const el=document.getElementById('projectSelect'), before=el&&el.value, wasNew=typeof creatingProject!=='undefined'&&!!creatingProject;
    const r=saveSetup0.apply(this,arguments);
    try{ if(!wasNew && before && el && el.value!==before && [...el.options].some(o=>o.value===before)){ el.value=before; if(typeof renderSetup==='function') renderSetup(); el.value=before; } }catch(e){}
    return r;
  };
  ['renderSetup','psListRender','newProject','cancelNewProject','selectProject','saveProjectSetup'].forEach(n=>{
    const f=window[n]; if(typeof f!=='function') return;
    window[n]=function(){ const r=f.apply(this,arguments); setTimeout(setupButtons,0); return r; };
  });
  const sw1=window.switchTab;
  if(typeof sw1==='function') window.switchTab=function(name){ const r=sw1.apply(this,arguments); if(name==='setup') setTimeout(setupButtons,0); return r; };
  let ACTIVE=null;            // Set of active login ids from edpt_profiles (null = not known → hide nothing)
  const HIDDEN=new Set();

  async function fetchActive(){
    try{
      if(typeof EDPT_SB==='undefined'||!EDPT_SB||typeof EDPT_CLOUD_READY==='undefined'||!EDPT_CLOUD_READY) return null;
      const {data,error}=await EDPT_SB.from('edpt_profiles').select('login_id,is_active').eq('is_active',true);
      if(error||!Array.isArray(data)) { console.warn('ADPT roster: could not read active profiles',error); return null; }
      return new Set(data.map(p=>norm(p.login_id)).filter(Boolean));
    }catch(e){ console.warn('ADPT roster',e); return null; }
  }
  function removedSet(){
    const al=window.EDPT_ALIAS_TO_PROFILE||{}, s=new Set();
    (db.edptRemovedPeople||[]).forEach(x=>{ const k=norm(x); if(!k) return; s.add(k); if(al[k]) s.add(norm(al[k])); Object.keys(al).forEach(o=>{ if(norm(al[o])===k) s.add(norm(o)); }); });
    return s;
  }
  function setVis(k,vis){
    const d=Object.getOwnPropertyDescriptor(db.users,k); if(!d) return;
    if(d.enumerable!==vis) Object.defineProperty(db.users,k,{value:d.value,writable:true,configurable:true,enumerable:vis});
    if(vis) HIDDEN.delete(k); else HIDDEN.add(k);
  }
  /* v28: team members without their own login use the common Electrical Design login. */
  function TM(){ db.teamMembers ||= {}; return db.teamMembers; }
  function sharedSet(){ const s=new Set((((db.teamSettings||{}).sharedLogins)||[]).map(norm)); /* v35.16: the Electrical Design common login is recognised even when it is not set in Team & Access */ try{ Object.entries(db.users||{}).forEach(([k,u])=>{ if(u&&!u.teamMember&&(/^electrical[._-]?design(@|$)/i.test(k)||/^electrical\s*design(\s*(team|common|id|login))?$/i.test(String(u.name||'').trim()))) s.add(norm(k)); }); }catch(e){} return s; }
  window.edptIsSharedLogin=id=>!!id&&sharedSet().has(norm(id));
  function isRemoved(k,u){ const rm=removedSet(); return rm.has(norm(k)) || !!(u && (rm.has(nameKey(u.name)) || rm.has(nameKey(u.owner)))); }
  function isActivePerson(k,u){
    if(!ACTIVE) return true;
    if(isRemoved(k,u)) return false;
    if(sharedSet().has(norm(k))) return false;                 // the common login is an account, not a person
    if(Object.prototype.hasOwnProperty.call(TM(),k)) return true; // team member (no own login)
    return ACTIVE.has(norm(k));
  }
  function loginAllowed(k,u){ return !isRemoved(k,u) && (!ACTIVE || ACTIVE.has(norm(k))); }
  function injectMembers(){
    if(!db||!db.users) return;
    // an old ID added back as a team member is a person in its own right: drop its link to an inactive login
    const al=window.EDPT_ALIAS_TO_PROFILE||{};
    Object.keys(TM()).forEach(id=>{ const k=norm(id); if(al[k] && !(ACTIVE&&ACTIVE.has(norm(al[k])))) delete al[k]; });
    // the common login may assign and plan daily tasks for the whole team
    try{ const sh=[...sharedSet()]; if(sh.length && db.accessControl){ db.accessControl.users ||= {}; sh.forEach(id=>{ const k=Object.getOwnPropertyNames(db.users).find(x=>norm(x)===id)||id; const cur=db.accessControl.users[k]||{}; const dt=Array.isArray(cur['Daily Tasks'])?cur['Daily Tasks']:[]; if(!['View','Add','Edit','Update'].every(a=>dt.includes(a))) db.accessControl.users[k]={...cur,'Daily Tasks':[...new Set([...dt,'View','Add','Edit','Update'])]}; }); } }catch(e){}
    Object.entries(TM()).forEach(([id,m])=>{
      const d=Object.getOwnPropertyDescriptor(db.users,id), base=d?d.value:{};
      const rec=Object.assign(base,m,{teamMember:true,admin:false,owner:m.owner||m.name});
      if(d) Object.defineProperty(db.users,id,{value:rec,writable:true,configurable:true,enumerable:true}); else db.users[id]=rec;
    });
  }
  window.edptInjectMembers=injectMembers;
  function apply(){
    if(!ACTIVE||!db||!db.users) return false;
    HIDDEN.clear();
    Object.getOwnPropertyNames(db.users).forEach(k=>setVis(k,isActivePerson(k,db.users[k])));
    window.EDPT_ROSTER_ACTIVE=true;
    try{ if(window.RP&&RP.invalidate) RP.invalidate(); }catch(e){}
    return true;
  }
  window.edptRosterApply=apply;
  window.edptIsActivePerson=id=>!!(db.users&&Object.getOwnPropertyDescriptor(db.users,id)&&isActivePerson(id,db.users[id]));
  window.edptHiddenPeople=()=>[...HIDDEN];

  // Hidden records must still be saved and backed up exactly as before (no data loss).
  function unhideAll(){ const ks=[...HIDDEN]; ks.forEach(k=>{ const d=Object.getOwnPropertyDescriptor(db.users||{},k); if(d) Object.defineProperty(db.users,k,{value:d.value,writable:true,configurable:true,enumerable:true}); }); return ks; }
  function rehide(ks){ ks.forEach(k=>{ const d=Object.getOwnPropertyDescriptor(db.users||{},k); if(d) Object.defineProperty(db.users,k,{value:d.value,writable:true,configurable:true,enumerable:false}); }); }
  const withAll=fn=>function(){ const ks=unhideAll(); try{ return fn.apply(this,arguments); } finally{ rehide(ks); } };
  ['save','edptCloudSave','exportBackup'].forEach(n=>{ if(typeof window[n]==='function') window[n]=withAll(window[n]); });

  // Access scheme: Admin & Manager = all actions; AGM & Team Leader = View/Add/Edit/Update; Member = limited.
  // One-time, add-only upgrade of the role table (never removes anything you already ticked).
  function upgradeRoles(){
    try{
      if(typeof window.edptCan==='function') window.edptCan('Daily Tasks','View');
      const ac=db.accessControl; if(!ac||!ac.roles||ac.roleDefaultsV3) return;
      const mods=['Daily Tasks','Task Management','Project Review','Project Setup','Team Capacity'];
      const want={Manager:['View','Add','Edit','Update','Delete'],AGM:['View','Add','Edit','Update'],'Team Leader':['View','Add','Edit','Update']};
      Object.entries(want).forEach(([role,acts])=>{ ac.roles[role] ||= {}; mods.forEach(m=>{ const cur=Array.isArray(ac.roles[role][m])?ac.roles[role][m]:[]; ac.roles[role][m]=[...new Set([...cur,...acts])]; }); });
      ac.roleDefaultsV3=true;
    }catch(e){ console.warn('ADPT role upgrade',e); }
  }

  let blocking=false;
  function blockRemovedSelf(){
    if(blocking||!ACTIVE||!TW||!TW.me) return blocking;
    const me=db.users&&db.users[TW.me];
    if(me&&me.admin) return false;
    if(!loginAllowed(TW.me,me)){
      blocking=true;
      toast('Your access to ADPT has been removed. Contact the ADPT Admin.');
      setTimeout(()=>{ try{ if(typeof twLogout==='function') twLogout(); }catch(e){} blocking=false; },1500);
      return true;
    }
    return false;
  }

  const load0=window.edptLoadCloudState;
  if(typeof load0==='function'){
    window.edptLoadCloudState=async function(){
      const r=await load0.apply(this,arguments);
      const a=await fetchActive();
      if(a) ACTIVE=a;
      injectMembers(); normaliseRoles(); apply(); upgradeRoles(); fixProjectSetupAccess(); fixTaskManagementAccess(); fixProjectDeleteAccess();
      if(!blockRemovedSelf() && typeof twRefresh==='function') twRefresh();
      return r;
    };
  }

  const can0=window.edptCan;
  /* v35.17: the common login now follows Team & Access like everyone else (designation "Common ID" + individual overrides) */
  if(typeof can0==='function') window.edptCan=function(){ return can0.apply(this,arguments); };
  const enter0=window.twEnter;
  if(typeof enter0==='function') window.twEnter=function(){ normaliseRoles(); fixProjectSetupAccess(); fixTaskManagementAccess(); fixProjectDeleteAccess(); if(window.RP&&RP.invalidate) RP.invalidate(); if(blockRemovedSelf()) return; return enter0.apply(this,arguments); };
  const refresh0=window.twRefresh;
  if(typeof refresh0==='function') window.twRefresh=function(){ normaliseRoles(); if(blockRemovedSelf()) return; return refresh0.apply(this,arguments); };

  const uset0=window.twUset;
  if(typeof uset0==='function') window.twUset=function(id,k,v){ if(isLeadOnly() && !Object.prototype.hasOwnProperty.call(TM(),id)) return toast('Login accounts are managed by the Admin.'); if(Object.prototype.hasOwnProperty.call(TM(),id) && ['name','role','designation','dept','reportsTo','owner'].includes(k) && !(k==='name'&&!v)) TM()[id][k]=v; return uset0.apply(this,arguments); };
  window.edptSetSharedLogin=function(id){
    if(!(typeof twAdmin==='function'&&twAdmin())) return toast('Only the Admin can set the common team login.');
    db.teamSettings ||= {}; db.teamSettings.sharedLogins = id ? [norm(id)] : [];
    injectMembers(); save(false); apply(); try{ twRefresh(); }catch(e){} toast(id?`${id} is now the common team login — hidden from people lists, can plan for everyone.`:'Common team login cleared.');
  };

  // Remove → hidden everywhere immediately
  const del0=window.twDelUser;
  if(typeof del0==='function') window.twDelUser=function(id){ if(isLeadOnly() && !Object.prototype.hasOwnProperty.call(TM(),id)) return toast('Only the Admin can remove people with their own login.'); const r=del0.apply(this,arguments); apply(); try{ twRefresh(); }catch(e){} return r; };
  RosterRestore();
  function RosterRestore(){
    window.edptRestorePerson=function(key){
      if(!(typeof twLead==='function'&&twLead(twU()))) return toast('Only Admin, Managers and Team Leaders can restore people.');
      const al=window.EDPT_ALIAS_TO_PROFILE||{}, k=norm(key);
      const drop=new Set([k, norm(al[k])]); Object.keys(al).forEach(o=>{ if(norm(al[o])===k) drop.add(norm(o)); });
      const u=db.users[key]; if(u){ drop.add(nameKey(u.name)); drop.add(nameKey(u.owner)); }
      db.edptRemovedPeople=(db.edptRemovedPeople||[]).filter(x=>!drop.has(norm(x))&&!drop.has(nameKey(x)));
      save(false); apply(); try{ twRefresh(); }catch(e){}
      toast(`${(u&&u.name)||key} restored. They appear everywhere again.`);
    };
  }

  // Team & Access: show removed people (with a login) so they can be restored; explain hidden records.
  const isLeadOnly=()=>typeof twLead==='function'&&twLead(twU())&&!(typeof twAdmin==='function'&&twAdmin())&&!(window.edptIsSharedLogin&&edptIsSharedLogin(TW.me));
  try{ if(Array.isArray(TW_ADMIN_TABS)){ const i=TW_ADMIN_TABS.indexOf('team'); if(i>=0) TW_ADMIN_TABS.splice(i,1); } if(Array.isArray(TW_LEAD_TABS)&&!TW_LEAD_TABS.includes('team')) TW_LEAD_TABS.push('team'); }catch(e){}
  const navT=window.twNav;
  if(typeof navT==='function') window.twNav=function(){ const n=navT.apply(this,arguments); if(isLeadOnly()&&!n.some(x=>x[0]==='team')){ const i=n.findIndex(x=>x[0]==='history'); n.splice(i>=0?i+1:n.length,0,['team','Team & Access']); } return n; };
  const team0=window.twTeamRender;
  if(typeof team0==='function') window.twTeamRender=function(){
    let r;
    if(isLeadOnly()){
      // older code shows this screen to the Admin only: draw it as Admin for this moment, then lock it down
      const me=twU(), prevAdmin=me.admin; me.admin=true;
      try{ r=team0.apply(this,arguments); } finally{ me.admin=prevAdmin; }
      try{ document.querySelectorAll('#twTeamRows tr').forEach(row=>{ const id=row.querySelector('.tw-mono')?.textContent.trim(); if(id===TW.me) row.querySelectorAll('.tw-chip.red').forEach(c=>c.remove()); }); }catch(e){}
      try{ [...document.querySelectorAll('#team .panel, #team > div')].forEach(pn=>{ if(/Pending Task Reallocation/.test(pn.querySelector('h2,h3')?.textContent||'')) pn.style.display='none'; }); }catch(e){}
      try{
        document.getElementById('twAccessControl')?.remove();
        document.querySelectorAll('#twTeamRows tr').forEach(row=>{ const id=row.querySelector('.tw-mono')?.dataset.id||row.querySelector('.tw-mono')?.textContent.trim(); if(id&&Object.prototype.hasOwnProperty.call(TM(),id)) return;
          row.querySelectorAll('input,select').forEach(el=>{ el.disabled=true; el.title='Login accounts are managed by the Admin'; }); row.querySelectorAll('button[onclick^="twDelUser"]').forEach(b=>b.style.display='none'); });
      }catch(e){}
    } else r=team0.apply(this,arguments);
    try{
      const body=document.getElementById('twTeamRows'); if(!body) return r;
      const host=body.closest('table')?.parentElement; if(!host) return r;
      document.getElementById('edptRosterNote')?.remove();
      if(!ACTIVE) return r;
      // Shared workspace: logins and passwords live in Supabase, so hide the old local-login tools.
      const nl=document.getElementById('twNoLogin'); if(nl){ nl.innerHTML=''; nl.style.display='none'; }
      document.querySelectorAll('button[onclick^="twBulkAdd"],button[onclick^="twResetPw"]').forEach(b=>b.style.display='none');
      const note=document.getElementById('twTeamNote'); if(note) note.innerHTML=isLeadOnly()?'You can add, edit and remove <b>team members</b>. People with their own login and access permissions are managed by the Admin.':'Logins and passwords are managed in Supabase. "Access role" decides what each person can do (see Access Management below). Use "Task Owner Name" to link a login to the name used on older tasks.';
      const rm=removedSet();
      const removed=Object.getOwnPropertyNames(db.users).filter(k=>(ACTIVE.has(norm(k))||Object.prototype.hasOwnProperty.call(TM(),k))&&!sharedSet().has(norm(k))&&isRemoved(k,db.users[k]));
      const box=document.createElement('div'); box.id='edptRosterNote'; box.style.cssText='margin-top:12px;font-size:13px';
      body.querySelectorAll('tr').forEach(row=>{ const cell=row.querySelector('.tw-mono'); const id=cell&&cell.textContent.trim(); if(id&&Object.prototype.hasOwnProperty.call(TM(),id)){ cell.dataset.id=id; cell.innerHTML=`<span class="tw-chip" title="Has no own login — opens ADPT with the common Electrical Design login">Team member · common login</span>`; } });
      const shared=[...sharedSet()][0]||'', logins=Object.getOwnPropertyNames(db.users).filter(k=>ACTIVE.has(norm(k))).sort();
      box.innerHTML=`<p class="muted" style="margin:6px 0">ADPT ${window.EDPT_VERSION} · People listed here appear everywhere in the tool: those with their own login, and <b>team members</b> who open ADPT with the common Electrical Design login. Anyone not listed is not shown anywhere.</p>`+
        ((typeof twAdmin==='function'&&twAdmin())?`<div style="margin:8px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>Common team login:</b><select onchange="edptSetSharedLogin(this.value)"><option value="">— not set —</option>${logins.map(k=>`<option value="${esc(k)}" ${norm(k)===shared?'selected':''}>${esc(k)}</option>`).join('')}</select><span class="muted" style="font-size:12px">The shared Electrical Design account. It is not shown as a person, and can assign and plan daily tasks for every team member.</span></div>`:'')+

        (removed.length?`<details><summary><b>Removed people (${removed.length})</b> — hidden everywhere</summary><table style="min-width:0;width:auto;margin-top:6px"><tbody>${removed.map(k=>`<tr><td style="padding:4px 10px 4px 0">${esc(db.users[k].name||k)}</td><td class="tw-mono" style="padding:4px 10px">${esc(k)}</td><td><button class="small" onclick="edptRestorePerson('${esc(k)}')">Restore</button></td></tr>`).join('')}</tbody></table></details>`:'');
      host.after(box);
    }catch(e){ console.warn(e); }
    return r;
  };

  // Add Person: in the shared workspace a person needs a real Supabase login to appear.
  const newUser0=window.twNewUser;
  window.twNewUser=function(owner){
    if(typeof EDPT_CLOUD_READY==='undefined'||!EDPT_CLOUD_READY) return typeof newUser0==='function'?newUser0.apply(this,arguments):undefined;
    if(!(typeof twLead==='function'&&twLead(twU())) || (window.edptIsSharedLogin&&edptIsSharedLogin(TW.me))) return toast('Only Admin, Team Leaders, Managers and AGMs can add people.');
    const leads=Object.entries(db.users).filter(([,u])=>['agm','manager','team leader','admin'].includes(norm(u.role))).sort((a,b)=>String(a[1].name).localeCompare(String(b[1].name)));
    const m=twModal('Add Person',`<div class="tw-f"><label>Type of person</label>
        <label style="display:flex;gap:8px;align-items:flex-start;font-weight:400;margin:4px 0"><input type="radio" name="apType" value="member" checked style="width:auto;margin-top:3px" onchange="document.getElementById('apLoginWrap').style.display='none';document.getElementById('apOut').innerHTML=''"> <span><b>Team member</b> — opens ADPT with the common Electrical Design login. No own login needed.</span></label>
        <label style="display:flex;gap:8px;align-items:flex-start;font-weight:400;margin:4px 0"><input type="radio" name="apType" value="login" style="width:auto;margin-top:3px" ${(typeof twAdmin==='function'&&twAdmin())?'':'disabled'} onchange="document.getElementById('apLoginWrap').style.display='block'"> <span><b>Own login</b> (TL, AGM, Manager, Admin) — needs a Supabase login${(typeof twAdmin==='function'&&twAdmin())?'':' (Admin only)'}.</span></label></div>
      <div class="tw-2"><div class="tw-f"><label for="apN">Full name</label><input id="apN" value="${esc(owner||'')}" required></div>
      <div class="tw-f" id="apLoginWrap" style="display:none"><label for="apL">Login (email)</label><input id="apL" placeholder="firstname.lastname@task.com"></div>
      <div class="tw-f"><label for="apR">Access role</label><select id="apR"><option>Member</option><option>Team Leader</option><option>AGM</option><option>Manager</option><option>Admin</option></select></div>
      <div class="tw-f"><label for="apD">Designation</label><input id="apD" placeholder="e.g. Design Engineer"></div>
      <div class="tw-f"><label for="apDep">Department</label><input id="apDep" value="Electrical Design"></div>
      <div class="tw-f"><label for="apRt">Reports to</label><select id="apRt"><option value="">—</option>${leads.map(([k,u])=>`<option value="${esc(k)}">${esc(u.name)} (${esc(u.role)})</option>`).join('')}</select></div></div>
      <div id="apOut" class="muted" style="font-size:12.5px"></div>`,mm=>{
        const g=s=>mm.querySelector(s).value.trim(), q=v=>String(v).replace(/'/g,"''");
        const n=g('#apN'), l=g('#apL').toLowerCase(), type=(mm.querySelector('input[name=apType]:checked')||{}).value||'member';
        if(!n) return 'Enter the full name.';
        if(type==='member'){
          const all=Object.getOwnPropertyNames(db.users||{}).map(norm);
          if(Object.values(db.users||{}).some(u=>nameKey(u.name)===nameKey(n))) return 'A person with this name is already listed.';
          let id=(typeof twSlug==='function'?twSlug(n):nameKey(n).replace(/[^a-z0-9]+/g,'.'))||'member', base=id, i=2; while(all.includes(norm(id))&&!Object.prototype.hasOwnProperty.call(TM(),id)&&!isRemoved(id,db.users[id])) id=base+'.'+(i++);
          TM()[id]={name:n,role:g('#apR')==='Admin'?'Member':g('#apR'),designation:g('#apD')||g('#apR'),dept:g('#apDep'),reportsTo:g('#apRt'),owner:n,addedBy:TW.me,addedAt:Date.now()};
          db.edptRemovedPeople=(db.edptRemovedPeople||[]).filter(x=>norm(x)!==norm(id)&&nameKey(x)!==nameKey(n));
          save(false); injectMembers(); apply(); try{ twRefresh(); }catch(e){}
          toast(`${n} added as a team member. They now appear in every list.`); return '';
        }
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l)) return 'Enter the login as an email address, e.g. firstname.lastname@task.com';
        if(!(typeof twAdmin==='function'&&twAdmin())) return 'Only the Admin can create own logins.';
        if(ACTIVE&&ACTIVE.has(l)) return 'This login already exists and is active.';
        const sql=`insert into public.edpt_profiles (user_id, full_name, login_id, role, is_active, designation, department, reports_to_login_id)\nselect id, '${q(n)}', '${q(l)}', '${q(g('#apR'))}', true, '${q(g('#apD')||g('#apR'))}', '${q(g('#apDep'))}', ${g('#apRt')?`'${q(g('#apRt'))}'`:'null'}\nfrom auth.users where email = '${q(l)}';`;
        mm.querySelector('#apOut').innerHTML=`<ol style="padding-left:18px;margin:10px 0"><li>Supabase → <b>Authentication → Users → Add user</b>: email <b>${esc(l)}</b>, set a first password and tick <i>Auto confirm</i>.</li><li>Supabase → <b>SQL Editor</b>: run this, then come back and press <b>Refresh people</b>.</li></ol><textarea readonly rows="5" style="width:100%;font-family:monospace;font-size:12px">${esc(sql)}</textarea><div class="actions" style="margin-top:6px"><button type="button" class="small" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.closest('#apOut').querySelector('textarea').value).then(()=>toast('SQL copied'))">Copy SQL</button><button type="button" class="small" onclick="edptRefreshPeople()">Refresh people</button></div>`;
        return ' ';
      },'Add Person',true);
    const err=m&&m.querySelector('[data-err]'); if(err) err.style.display='none';
  };
  ['twBulkAdd','twResetPw'].forEach(n=>{ const f=window[n]; if(typeof f==='function') window[n]=function(){ if(ACTIVE) return toast(n==='twResetPw'?'Passwords are managed in Supabase (Authentication → Users → reset password).':'Add people one at a time with + Add Person; each needs a Supabase login.'); return f.apply(this,arguments); }; });
  window.edptRefreshPeople=async function(){
    try{ await window.edptLoadCloudState(); toast('People list refreshed.'); }catch(e){ console.error(e); toast('Refresh failed: '+e.message); }
  };
})();
