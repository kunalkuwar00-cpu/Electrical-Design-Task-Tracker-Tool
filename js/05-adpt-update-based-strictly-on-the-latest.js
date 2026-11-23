/* ADPT update based strictly on the latest user-attached HTML.
   Keeps the existing Supabase email login, cloud adapter, data model and logo. */
(function(){
  const MODULES=['Daily Tasks','Task Management','Project Review','Project Setup','Team Capacity','Project Hub','EPLAN Planning','Project Date Change','Settings','Announcements'];
  const ACTIONS=['View','Add','Edit','Update','Delete'];
  const ROLE_DEFAULTS={
    'AGM':{'Daily Tasks':['View','Add','Edit','Update','Delete'],'Task Management':['View','Add','Edit','Update'],'Project Review':['View','Add','Edit','Update'],'Project Setup':['View','Add','Edit','Update','Delete'],'Team Capacity':['View','Add','Edit','Update'],'Project Hub':['View', 'Add', 'Edit', 'Update', 'Delete'],'EPLAN Planning':['View','Add','Edit','Update','Delete'],'Project Date Change':['View','Edit'],'Settings':['View'],'Announcements':['View','Add','Edit','Update','Delete']},
    'Manager':{'Daily Tasks':['View','Add','Edit','Update','Delete'],'Task Management':['View','Add','Edit','Update','Delete'],'Project Review':['View','Add','Edit','Update','Delete'],'Project Setup':['View','Add','Edit','Update','Delete'],'Team Capacity':['View','Add','Edit','Update','Delete'],'Project Hub':['View', 'Add', 'Edit', 'Update', 'Delete'],'EPLAN Planning':['View','Add','Edit','Update','Delete'],'Project Date Change':['View','Edit'],'Settings':['View'],'Announcements':['View','Add','Edit','Update','Delete']},
    'Team Leader':{'Daily Tasks':['View','Add','Edit','Update','Delete'],'Task Management':['View','Add','Edit','Update'],'Project Review':['View','Add','Edit','Update'],'Project Setup':['View','Add','Edit','Update','Delete'],'Team Capacity':['View','Add','Edit','Update'],'Project Hub':['View', 'Add', 'Edit', 'Update', 'Delete'],'EPLAN Planning':['View','Add','Edit','Update','Delete'],'Project Date Change':['View','Edit'],'Settings':['View'],'Announcements':['View','Add','Edit','Update','Delete']},
    'Member':{'Daily Tasks':['View'],'Task Management':['View','Add','Edit','Update'],'Project Review':['View'],'Project Setup':['View','Add','Edit','Update'],'Team Capacity':['View'],'Project Hub':['View', 'Add', 'Edit', 'Update'],'EPLAN Planning':[],'Project Date Change':[],'Settings':[],'Announcements':['View','Add']},
    'Common ID':{'Daily Tasks':['View','Add','Update'],'Task Management':['View','Edit','Update'],'Project Review':['View','Update'],'Project Setup':['View'],'Team Capacity':['View'],'Project Hub':['View'],'EPLAN Planning':[],'Project Date Change':[],'Settings':['View'],'Announcements':['View','Add']}
  };
  function acInit(){
    db.accessControl ||= {roles:{},users:{}};
    db.accessControl.roles ||= {};
    db.accessControl.users ||= {};
    Object.keys(ROLE_DEFAULTS).forEach(role=>{
      db.accessControl.roles[role] ||= {};
      MODULES.forEach(mod=>{
        if(!Array.isArray(db.accessControl.roles[role][mod]))
          db.accessControl.roles[role][mod]=[...ROLE_DEFAULTS[role][mod]];
      });
    });
    if(!db.accessControl.projectSetupDefaultsV2){
      ['AGM','Manager','Team Leader'].forEach(role=>{
        const cur=db.accessControl.roles[role]['Project Setup'];
        if(Array.isArray(cur)&&cur.length===1&&cur[0]==='View')db.accessControl.roles[role]['Project Setup']=[...ROLE_DEFAULTS[role]['Project Setup']];
      });
      db.accessControl.projectSetupDefaultsV2=true;
    }
  }
  const acNorm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  /* An individual override saved on a legacy ID (e.g. poonam.patole) also applies to the
     same person's Supabase login ID (poonam.patole@task.com), and vice versa. */
  function acUserOverride(id,module){
    const U=db.accessControl.users||{}, own=U[id]?.[module];
    if(Array.isArray(own))return own;
    const al=window.EDPT_ALIAS_TO_PROFILE||{}, low=acNorm(id);
    for(const [k,v] of Object.entries(U)){
      if(!Array.isArray(v?.[module]))continue; const kl=acNorm(k);
      if(acNorm(al[kl])===low||acNorm(al[low])===kl)return v[module];
    }
    const nm=acNorm(db.users?.[id]?.name);
    if(nm)for(const [k,v] of Object.entries(U)){
      if(k!==id&&Array.isArray(v?.[module])&&db.users?.[k]&&acNorm(db.users[k].name)===nm)return v[module];
    }
    return undefined;
  }
  window.edptUserOverride=(id,module)=>{acInit();return acUserOverride(id,module);};
  function acCan(module,action,user){
    user=user||twU(); if(!user)return false; if(user.admin)return true;
    acInit();
    const id=TW.me, act=(window.edptIsCommon&&window.edptIsCommon(id)&&typeof window.edptActor==='function')?window.edptActor():'';
    /* v35.18: on the common login, the chosen person's individual permissions come first, then the common login's own, then "Common ID" */
    const own=act?acUserOverride(act,module):undefined, individual=Array.isArray(own)?own:acUserOverride(id,module);
    const role=(window.edptIsCommon&&window.edptIsCommon(id))?'Common ID':String(user.role||user.designation||'Member').trim();
    const granted=Array.isArray(individual)?individual:(db.accessControl.roles[role]?.[module]||ROLE_DEFAULTS[role]?.[module]||['View']);
    return granted.includes(action) || (action==='View' && granted.length>0);
  }
  window.edptCan=acCan;
  /* Task Management Add permission controls subtask creation for every main task. */
  const _addSubtask = window.addSubtask, _saveSubtask = window.saveSubtask;
  window.addSubtask = function(tid){
    if(!acCan('Task Management','Add')) return toast('You do not have permission to add subtasks.');
    return _addSubtask.apply(this,arguments);
  };
  window.saveSubtask = function(tid){
    if(!acCan('Task Management','Add')) return toast('You do not have permission to add subtasks.');
    return _saveSubtask.apply(this,arguments);
  };
  window.twAddReviewTask=function(pid){
    const p=pbyid(pid); if(!p)return toast('Project not found.');
    if(!acCan('Project Review','Add'))return toast('You do not have permission to add Project Review tasks.');
    const leadName=String(p.lead||'').trim().toLowerCase();
    const leadEntry=Object.entries(db.users||{}).find(([id,u])=>
      id.toLowerCase()===leadName || String(u.name||'').trim().toLowerCase()===leadName ||
      String(u.owner||'').trim().toLowerCase()===leadName);
    if(!leadEntry)return toast('This project lead does not have a login account. Please link a login to the Project Lead in Team & Access.');
    const [assigneeId]=leadEntry;
    twModal('Add Project Review Task',`<div class="tw-f"><label for="prTaskName">Task</label><input id="prTaskName" maxlength="160" required></div>
      <div class="tw-2"><div class="tw-f"><label for="prTaskStart">Start Date</label><input id="prTaskStart" type="date" required></div>
      <div class="tw-f"><label for="prTaskEnd">End Date</label><input id="prTaskEnd" type="date" required></div></div>`,
      m=>{
        const title=m.querySelector('#prTaskName').value.trim();
        const start=m.querySelector('#prTaskStart').value, end=m.querySelector('#prTaskEnd').value;
        if(!title)return 'Enter the task.';
        if(!start||!end)return 'Select both start and end dates.';
        if(end<start)return 'End Date cannot be earlier than Start Date.';
        db.daily ||= [];
        db.daily.push({id:uid(),title,notes:'',assigneeId,assignerId:TW.me,date:end,start,priority:'Medium',projectId:p.id,status:'Open',source:'Project Review',at:Date.now()});
        save(false); if(typeof twDailyRender==='function')twDailyRender(); if(typeof twHomeRender==='function')twHomeRender(); if(typeof twTopRender==='function')twTopRender();
        toast('Project Review task assigned to '+twName(assigneeId));
      },'Add Task');
  };
  /* Role and individual permissions are stored in the shared tracker data. */
  window.edptSaveRolePermission=function(role,module,action,checked){
    if(!twAdmin())return toast('Only Admin can change access permissions.');
    acInit(); const a=db.accessControl.roles[role][module];
    db.accessControl.roles[role][module]=checked?[...new Set([...a,action])]:a.filter(x=>x!==action);
    save(false); toast('Designation permission saved.');
  };
  window.edptSaveUserPermission=function(id,module,action,value){
    if(!twAdmin())return toast('Only Admin can change access permissions.');
    acInit(); db.accessControl.users[id] ||= {};
    const base=[...(db.accessControl.roles[(window.edptRoleOf?edptRoleOf(id):db.users[id]?.role)]?.[module]||ROLE_DEFAULTS[(window.edptRoleOf?edptRoleOf(id):db.users[id]?.role)]?.[module]||['View'])];
    if(value==='default'){delete db.accessControl.users[id][module];}
    else {const a=Array.isArray(db.accessControl.users[id][module])?[...db.accessControl.users[id][module]]:base;
      db.accessControl.users[id][module]=action?(a.includes(action)?a:[...a,action]):a.filter(x=>x!=='__none__');
    }
    save(false); toast('Individual permission saved.');
  };
  function acRender(){
    if(!twAdmin())return;
    acInit();
    const host=document.getElementById('twAccessControl'); if(!host)return;
    const roles=['AGM','Manager','Team Leader','Member','Common ID'];
    const roleRows=roles.map(role=>MODULES.map(mod=>`<tr><td>${role}</td><td>${mod}</td><td>${ACTIONS.map(a=>`<label style="display:inline-flex;align-items:center;gap:4px;margin:0 9px 0 0;font-weight:400"><input type="checkbox" style="width:auto" ${db.accessControl.roles[role][mod].includes(a)?'checked':''} onchange="edptSaveRolePermission('${role}','${mod}','${a}',this.checked)">${a}</label>`).join('')}</td></tr>`).join('')).join('');
    const userRows=(typeof edptPeopleIds==='function'?edptPeopleIds().map(id=>[id,db.users[id]]):Object.entries(db.users||{})).filter(([id,u])=>u&&!u.admin).map(([id,u])=>MODULES.map(mod=>{
      const ov=acUserOverride(id,mod), effective=Array.isArray(ov)?ov:(db.accessControl.roles[u.role]?.[mod]||ROLE_DEFAULTS[u.role]?.[mod]||['View']);
      return `<tr><td>${esc(u.name)} <span class="muted">(${esc(id)})</span></td><td>${esc(u.role)}</td><td>${mod}</td><td><select onchange="edptSetUserMode('${esc(id)}','${mod}',this.value)"><option value="default" ${!Array.isArray(ov)?'selected':''}>Use designation defaults</option><option value="custom" ${Array.isArray(ov)?'selected':''}>Individual override</option></select><div class="actions" style="margin-top:6px;flex-wrap:wrap">${ACTIONS.map(a=>`<label style="display:inline-flex;align-items:center;gap:4px;margin:0 7px 0 0;font-weight:400"><input type="checkbox" style="width:auto" ${effective.includes(a)?'checked':''} ${!Array.isArray(ov)?'disabled':''} onchange="edptToggleUserPermission('${esc(id)}','${mod}','${a}',this.checked)">${a}</label>`).join('')}</div></td></tr>`;
    }).join('')).join('');
    host.innerHTML=`<div class="panel"><h3>Access Management</h3><p class="muted">Admin only. Individual permissions override designation defaults. Admin always has full access.</p><h4>Designation-wise default permissions</h4><div class="tablewrap"><table><thead><tr><th>Designation</th><th>Module</th><th>Permissions</th></tr></thead><tbody>${roleRows}</tbody></table></div><h4 style="margin-top:18px">Individual employee permissions</h4><div class="tablewrap"><table><thead><tr><th>Employee</th><th>Designation</th><th>Module</th><th>Permission settings</th></tr></thead><tbody>${userRows}</tbody></table></div></div>`;
  }
  window.edptSetUserMode=function(id,module,mode){
    if(!twAdmin())return;
    acInit(); db.accessControl.users[id] ||= {};
    if(mode==='default')delete db.accessControl.users[id][module];
    else db.accessControl.users[id][module]=[...(acUserOverride(id,module)||db.accessControl.roles[(window.edptRoleOf?edptRoleOf(id):db.users[id]?.role)]?.[module]||ROLE_DEFAULTS[(window.edptRoleOf?edptRoleOf(id):db.users[id]?.role)]?.[module]||['View'])];
    save(false); acRender();
  };
  window.edptToggleUserPermission=function(id,module,action,checked){
    if(!twAdmin())return; acInit(); db.accessControl.users[id] ||= {};
    let a=db.accessControl.users[id][module];
    if(!Array.isArray(a))a=[...(acUserOverride(id,module)||db.accessControl.roles[(window.edptRoleOf?edptRoleOf(id):db.users[id]?.role)]?.[module]||ROLE_DEFAULTS[(window.edptRoleOf?edptRoleOf(id):db.users[id]?.role)]?.[module]||['View'])];
    db.accessControl.users[id][module]=checked?[...new Set([...a,action])]:a.filter(x=>x!==action);
    save(false); acRender();
  };
  /* Keep Team & Access but make it Admin-only and add the permission panel there. */
  window.twNav=function(){const n=[['dashboard','Dashboard'],['daily','Daily Tasks'],['tasks','Task Management'],['projectList','Project List'],['person','Person-wise Task List'],['workload','Workload'],['report','Project Review'],['setup','Project Setup'],['issues','Dependencies & Issues'],['history','Date Change History']];if(twAdmin())n.push(['team','Team & Access'],['backup','Backup & Restore'],['settings','Settings']);return n};
  if(Array.isArray(TW_LEAD_TABS))TW_LEAD_TABS.splice(0,TW_LEAD_TABS.length);
  if(Array.isArray(TW_ADMIN_TABS)&&!TW_ADMIN_TABS.includes('team'))TW_ADMIN_TABS.push('team');
  const team0=window.twTeamRender;
  if(typeof team0==='function')window.twTeamRender=function(){
    if(!twAdmin())return;
    team0();
    let host=document.getElementById('twAccessControl');
    if(!host){host=document.createElement('div');host.id='twAccessControl';const anchor=document.getElementById('team');if(anchor)anchor.appendChild(host);}
    acRender();
  };
  /* Daily task assignment/deletion and Project Review updates follow Admin-managed access. */
  const newDaily0=window.twNewDaily;
  if(typeof newDaily0==='function')window.twNewDaily=function(){if(!acCan('Daily Tasks','Add'))return toast('You do not have permission to assign Daily Tasks.');return newDaily0()};
  const delDaily0=window.twDDel;
  if(typeof delDaily0==='function')window.twDDel=function(id){if(!acCan('Daily Tasks','Delete'))return toast('You do not have permission to delete Daily Tasks.');return delDaily0(id)};
  const reviewEdit0=window.twReviewEdit;
  if(typeof reviewEdit0==='function')window.twReviewEdit=function(pid){if(!acCan('Project Review','Update')&&!acCan('Project Review','Edit'))return toast('You do not have permission to update Project Review.');return reviewEdit0(pid)};
  /* Existing cloud data is loaded asynchronously; initialise access settings after cloud load. */
  const load0=window.edptLoadCloudState;
  if(typeof load0==='function')window.edptLoadCloudState=async function(){const r=await load0.apply(this,arguments);acInit();return r};
  acInit();
})();
