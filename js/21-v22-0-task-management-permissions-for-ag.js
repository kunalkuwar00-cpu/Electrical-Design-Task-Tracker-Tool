/* v22.0: Task Management permissions for AGM, Manager and Team Leader.
   This fixes the missing Task Management module in the role defaults. */
(function(){
  function allowed(action){
    return typeof window.edptCan==='function' ? window.edptCan('Task Management',action) : !!(window.twAdmin&&window.twAdmin());
  }
  const open0=window.openTaskForm;
  if(typeof open0==='function') window.openTaskForm=function(tid){
    const action=tid?'Edit':'Add';
    if(!allowed(action)) return toast('You do not have permission to '+(action==='Add'?'add':'edit')+' Task Management items. Contact Admin.');
    return open0.apply(this,arguments);
  };
  const save0=window.saveTask;
  if(typeof save0==='function') window.saveTask=function(){
    const action=String(document.getElementById('editTaskId')?.value||'').trim()?'Edit':'Add';
    if(!allowed(action)) return toast('You do not have permission to '+(action==='Add'?'add':'edit')+' Task Management items. Contact Admin.');
    return save0.apply(this,arguments);
  };
  const import0=window.importTaskTemplate;
  if(typeof import0==='function') window.importTaskTemplate=function(){
    if(!allowed('Add')) return toast('You do not have permission to add Task Management items. Contact Admin.');
    return import0.apply(this,arguments);
  };
  function syncTaskManagementButtons(){
    const add=document.querySelector('#tasks .toprow .actions button[onclick="openTaskForm()"]');
    const imp=document.querySelector('#tasks .toprow .actions button[onclick="importTaskTemplate()"]');
    if(add) add.style.display=allowed('Add')?'':'none';
    if(imp) imp.style.display=allowed('Add')?'':'none';
  }
  const render0=window.renderTasks;
  if(typeof render0==='function') window.renderTasks=function(){const r=render0.apply(this,arguments);syncTaskManagementButtons();return r;};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',syncTaskManagementButtons);
  else syncTaskManagementButtons();
})();
