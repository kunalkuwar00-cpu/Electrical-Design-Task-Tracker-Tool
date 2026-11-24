/* ADPT v21 PRODUCTION PATCH
   Uses the existing Supabase cloud adapter above for shared, version-checked saves.
   No browser-only test snapshot or read-only override is applied in this production build.
   Admin approval is required before any task owner is changed.
   Original assignee/owner and a reallocation audit trail are retained.
*/
(function(){
  'use strict';
  const PROTECTED_ASSIGNABLE_NAMES = new Set(['atharva','vaibhav','vishal']);
  const norm = value => String(value || '').trim().toLowerCase();

  // Ensure the three historical employees remain selectable only while their profiles are active.
  // The unified active-roster filter below remains the final authority for assignable employees.
  const assignable0 = window.twAssignable;
  window.twAssignable = function(){
    const ids = typeof assignable0 === 'function' ? assignable0() : Object.keys(db.users || {});
    return [...new Set(ids)].sort((a,b)=>twName(a).localeCompare(twName(b)));
  };

  function removedPeople(){
    const removed = new Set((db.edptRemovedPeople || []).map(norm));
    const map = window.EDPT_ALIAS_TO_PROFILE || {};
    const people = new Map();
    for (const id0 of removed) {
      const id = map[id0] || id0;
      const u = db.users[id] || db.users[id0];
      if (!u) continue;
      const key = id;
      const rec = people.get(key) || { id:key, name:u.name || u.owner || id, ids:new Set(), names:new Set() };
      rec.ids.add(id0); rec.ids.add(id);
      if (u.name) rec.names.add(norm(u.name));
      if (u.owner) rec.names.add(norm(u.owner));
      people.set(key, rec);
    }
    return [...people.values()];
  }

  function collectPending(){
    const people = removedPeople(), rows = [];
    const removedIds = new Set(people.flatMap(p=>[...p.ids]));
    for (const t of (db.daily || [])) {
      if (t.status === 'Closed' || !removedIds.has(norm(t.assigneeId))) continue;
      rows.push({kind:'daily', ref:t, employee:people.find(p=>p.ids.has(norm(t.assigneeId)))?.name || twName(t.assigneeId),
        title:t.title || 'Daily task', project:'Daily Task', due:t.date || '', status:t.status || 'Open'});
    }
    for (const p of (db.projects || [])) {
      for (const t of (p.tasks || [])) {
        for (const sub of (t.subs || [])) {
          const owner = norm(sub.owner), status = sub.status || 'Not Started';
          if (!sub.name || status === 'Completed' || status === 'Cancelled') continue;
          const person = people.find(x=>x.names.has(owner));
          if (!person) continue;
          rows.push({kind:'project', ref:sub, projectRef:p, mainRef:t, employee:person.name,
            title:sub.name, project:[p.code,p.name].filter(Boolean).join(' — '), due:sub.target || '', status});
        }
      }
    }
    return rows;
  }

  function ensurePanel(){
    const noLogin = document.getElementById('twNoLogin');
    if (!noLogin || document.getElementById('edptV21Reallocation')) return;
    noLogin.insertAdjacentHTML('afterend',
      '<div class="panel" id="edptV21Reallocation" style="margin-top:16px"><div class="toprow" style="align-items:center"><div><h3 style="margin:0">Pending Task Reallocation</h3><p class="muted" style="margin:4px 0 0">Incomplete tasks of removed employees. Select a replacement and approve each task. No task is reassigned automatically.</p></div><span class="tw-chip orange" id="edptV21PendingCount">0 pending</span></div><div id="edptV21PendingRows" style="margin-top:12px"></div></div>');
  }

  function renderPending(){
    if (!twAdmin()) return;
    ensurePanel();
    const host = document.getElementById('edptV21PendingRows');
    if (!host) return;
    const rows = collectPending(), ids = window.twAssignable().filter(id=>db.users[id]);
    const options = ids.map(id=>`<option value="${esc(id)}">${esc(twName(id))}</option>`).join('');
    const count = document.getElementById('edptV21PendingCount');
    if (count) count.textContent = `${rows.length} pending`;
    if (!rows.length) {
      host.innerHTML = '<p class="muted" style="margin:0">No incomplete tasks are waiting for reallocation.</p>';
      return;
    }
    host.innerHTML = `<div class="tablewrap"><table><thead><tr><th>Original Employee</th><th>Task</th><th>Project / Type</th><th>Due Date</th><th>Status</th><th>Reassign To</th><th>Action</th></tr></thead><tbody>${rows.map((r,i)=>`<tr>
      <td>${esc(r.employee)}</td><td>${esc(r.title)}</td><td>${esc(r.project)}</td><td>${esc(r.due || '—')}</td><td>${esc(r.status)}</td>
      <td><select class="inline-edit" data-edpt-v21-target="${i}" style="min-width:150px"><option value="">Select employee</option>${options}</select></td>
      <td><button class="small primary" data-edpt-v21-approve="${i}">Approve</button></td></tr>`).join('')}</tbody></table></div>`;
    host.querySelectorAll('[data-edpt-v21-approve]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if (!twAdmin()) return toast('Only Admin can approve task reallocation.');
        const index = Number(btn.getAttribute('data-edpt-v21-approve'));
        const select = host.querySelector(`[data-edpt-v21-target="${index}"]`);
        const replacementId = select?.value;
        if (!replacementId || !db.users[replacementId]) return toast('Please select a replacement employee.');
        const currentAssignable = window.twAssignable();
        if (!currentAssignable.includes(replacementId)) return toast('Selected employee is not available for assignment.');
        const current = collectPending()[index];
        if (!current) return toast('This pending task has already changed. Refresh the list.');
        const newOwner = db.users[replacementId].owner || db.users[replacementId].name || twName(replacementId);
        const from = current.kind === 'daily' ? current.ref.assigneeId : current.ref.owner;
        if (current.kind === 'daily') {
          const task = current.ref;
          task.originalAssigneeId ||= task.assigneeId;
          task.assigneeHistory ||= [];
          task.assigneeHistory.push({from:task.assigneeId,to:replacementId,by:TW.me,at:Date.now()});
          task.assigneeId = replacementId;
          task.reallocatedAt = Date.now();
          task.reallocatedBy = TW.me;
        } else {
          const sub = current.ref;
          sub.originalOwner ||= sub.owner;
          sub.ownerHistory ||= [];
          sub.ownerHistory.push({from:sub.owner,to:newOwner,by:TW.me,at:Date.now()});
          sub.owner = newOwner;
          sub.reallocatedAt = Date.now();
          sub.reallocatedBy = TW.me;
        }
        db.edptReallocationHistory ||= [];
        db.edptReallocationHistory.push({
          id:'realloc_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
          type:current.kind, task:current.title, project:current.project,
          from, to:current.kind === 'daily' ? replacementId : newOwner,
          fromEmployee:current.employee, toEmployee:twName(replacementId),
          approvedBy:TW.me, approvedAt:Date.now()
        });
        save(false);
        renderPending();
        if (typeof twDailyRender === 'function') twDailyRender();
        if (typeof twTeamRender === 'function') twTeamRender();
        toast(`Task reassigned to ${twName(replacementId)}. Original assignment history retained.`);
      });
    });
  }

  const teamRender0 = window.twTeamRender;
  if (typeof teamRender0 === 'function') {
    window.twTeamRender = function(){
      const result = teamRender0.apply(this,arguments);
      if (twAdmin()) renderPending();
      return result;
    };
  }
  const refresh0 = window.twRefresh;
  if (typeof refresh0 === 'function') {
    window.twRefresh = function(){
      const result = refresh0.apply(this,arguments);
      if (twAdmin()) renderPending();
      return result;
    };
  }
  window.EDPT_V21_PRODUCTION_MODE = true;
})();
