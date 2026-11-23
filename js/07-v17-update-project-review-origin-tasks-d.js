/* v17: Update Project Review-origin tasks directly from Daily Tasks; restrict deletion by designation. */
(function(){
  const allowedDelete = u => {
    if(!u) return false;
    if(u.admin) return true;
    const role=String(u.designation||u.role||'').trim().toLowerCase();
    return ['team leader','manager','agm'].includes(role);
  };
  window.twUpdateProjectReviewDaily=function(id){
    const t=(db.daily||[]).find(x=>x.id===id);
    if(!t)return toast('Task not found.');
    const can=window.edptCan;
    if(typeof can==='function' && !can('Project Review','Update') && !can('Project Review','Edit'))
      return toast('You do not have permission to update Project Review tasks.');
    const done=t.closedAt?twIso(new Date(t.closedAt)):twToday();
    twModal('Update Project Review Task',`
      <div class="tw-f"><label for="pruTitle">Task</label><input id="pruTitle" maxlength="160" value="${esc(t.title||'')}" required></div>
      <div class="tw-2">
        <div class="tw-f"><label for="pruStart">Start Date</label><input id="pruStart" type="date" value="${esc(t.start||'')}" required></div>
        <div class="tw-f"><label for="pruEnd">End Date</label><input id="pruEnd" type="date" value="${esc(t.date||'')}" required></div>
      </div>
      <div class="tw-2">
        <div class="tw-f"><label for="pruStatus">Status</label><select id="pruStatus">${['Open','In Progress','Closed'].map(x=>`<option ${x===(t.status||'Open')?'selected':''}>${x}</option>`).join('')}</select></div>
        <div class="tw-f"><label for="pruFinished">Finished Date</label><input id="pruFinished" type="date" value="${done}"></div>
      </div>
      <div class="tw-f"><label for="pruRemarks">Remarks</label><textarea id="pruRemarks" rows="3">${esc(t.closeNote||'')}</textarea></div>`,
      m=>{
        const title=m.querySelector('#pruTitle').value.trim(),start=m.querySelector('#pruStart').value,end=m.querySelector('#pruEnd').value,status=m.querySelector('#pruStatus').value,finished=m.querySelector('#pruFinished').value,remarks=m.querySelector('#pruRemarks').value.trim();
        if(!title)return 'Enter the task.';
        if(!start||!end)return 'Select start and end dates.';
        if(end<start)return 'End Date cannot be earlier than Start Date.';
        if(status==='Closed'&&!finished)return 'Select the finished date.';
        if(status==='Closed'&&finished<start)return 'Finished Date cannot be earlier than Start Date.';
        t.title=title;t.start=start;t.date=end;t.status=status;t.closeNote=remarks;
        t.closedAt=status==='Closed'?new Date(finished+'T12:00:00').getTime():null;
        t.closedBy=status==='Closed'?TW.me:null;
        (t.log=t.log||[]).push({at:Date.now(),by:TW.me,status,remark:remarks});
        save(false);twDailyRender();if(typeof twHomeRender==='function')twHomeRender();if(typeof twTopRender==='function')twTopRender();
        toast('Project Review task updated.');
      },'Save');
  };
  /* Deletion is restricted by designation, regardless of individual permission overrides. */
  window.twDDel=function(id){
    const t=(db.daily||[]).find(x=>x.id===id);if(!t)return;
    if(!allowedDelete(twU()))return toast('Only Admin, AGM, Manager and Team Leader can delete tasks.');
    if(!confirm('Delete this daily task?'))return;
    db.daily=db.daily.filter(x=>x.id!==id);save(false);
    if(typeof twDailyRender==='function')twDailyRender();
    if(typeof twHomeRender==='function')twHomeRender();
    if(typeof twTopRender==='function')twTopRender();
    toast('Task deleted.');
  };
})();
