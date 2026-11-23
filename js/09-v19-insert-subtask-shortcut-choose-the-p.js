/* v19: Insert Subtask shortcut — choose the parent Main Task and enter the new subtask name. */
(function(){
  function canAdd(){ return typeof window.edptCan==='function' ? window.edptCan('Task Management','Add') : !!(window.twAdmin&&window.twAdmin()); }
  function currentProject(){ return (typeof pbyid==='function' ? pbyid(val('taskProjectFilter')) : null) || (typeof project==='function' ? project() : null); }
  function addButton(){
    const actions=document.querySelector('#tasks .toprow .actions');
    if(!actions || document.getElementById('insertSubtaskShortcut')) return;
    const b=document.createElement('button'); b.id='insertSubtaskShortcut'; b.className='primary'; b.textContent='+ Insert Subtask';
    b.title='Choose the main task and enter the subtask to add'; b.onclick=openPicker;
    const before=document.getElementById('insertUnplannedBtn');
    if(before && before.parentElement===actions) actions.insertBefore(b,before); else actions.appendChild(b);
    b.style.display=canAdd()?'':'none';
  }
  function openPicker(){
    if(!canAdd()) return toast('You do not have permission to add subtasks.');
    const p=currentProject(); if(!p) return toast('Select a project first.');
    const tasks=(p.tasks||[]);
    if(!tasks.length) return toast('Add a Main Task before inserting a subtask.');
    let modal=document.getElementById('insertSubtaskModal');
    if(!modal){
      modal=document.createElement('div'); modal.id='insertSubtaskModal';
      modal.style.cssText='position:fixed;inset:0;z-index:10050;background:#0009;display:flex;align-items:center;justify-content:center;padding:18px';
      modal.innerHTML='<div style="background:var(--panel,#202020);border:1px solid var(--border,#444);border-radius:12px;padding:20px;width:min(520px,100%);box-shadow:0 18px 60px #0009"><h3 style="margin:0 0 16px">Insert Subtask</h3><div class="field" style="margin-bottom:12px"><label for="insertSubtaskMain">Select Main Task</label><select id="insertSubtaskMain" style="width:100%"></select></div><div class="field"><label for="insertSubtaskName">Subtask / Activity to Add</label><input id="insertSubtaskName" style="width:100%" placeholder="Enter subtask name"></div><p class="muted" style="margin:10px 0 16px">The subtask will be added under the selected Main Task. You can then fill owner, dates and other details.</p><div class="actions" style="justify-content:flex-end"><button id="insertSubtaskCancel">Cancel</button><button id="insertSubtaskContinue" class="primary">Continue</button></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
      modal.querySelector('#insertSubtaskCancel').onclick=()=>modal.remove();
      modal.querySelector('#insertSubtaskContinue').onclick=continueInsert;
    }
    const sel=modal.querySelector('#insertSubtaskMain');
    sel.innerHTML=tasks.map(t=>`<option value="${String(t.id).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${esc(t.name)}</option>`).join('');
    modal.querySelector('#insertSubtaskName').value=''; modal.style.display='flex';
    modal.querySelector('#insertSubtaskName').focus();
  }
  function continueInsert(){
    if(!canAdd()) return toast('You do not have permission to add subtasks.');
    const modal=document.getElementById('insertSubtaskModal'); if(!modal)return;
    const tid=modal.querySelector('#insertSubtaskMain').value;
    const name=modal.querySelector('#insertSubtaskName').value.trim();
    if(!tid)return toast('Please select a Main Task.');
    if(!name)return toast('Please enter the subtask name.');
    modal.remove();
    window.addSubtask(tid);
    const input=document.getElementById('subname-'+tid);
    if(input){ input.value=name; input.focus(); }
  }
  const oldRender=window.renderTasks;
  if(typeof oldRender==='function') window.renderTasks=function(){const r=oldRender.apply(this,arguments);addButton();const b=document.getElementById('insertSubtaskShortcut');if(b)b.style.display=canAdd()?'':'none';return r};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButton);else addButton();
  window.openInsertSubtaskPicker=openPicker;
})();
