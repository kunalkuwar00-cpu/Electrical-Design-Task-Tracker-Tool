/* ===== Insert an unplanned activity into an existing dependency chain ===== */
(function () {
  function addInsertButton() {
    const actions = document.querySelector('#tasks .toprow .actions');
    if (!actions || document.getElementById('insertUnplannedBtn')) return;
    const b = document.createElement('button');
    b.id = 'insertUnplannedBtn';
    b.className = 'primary';
    b.textContent = '+ Insert Unplanned Task';
    b.title = 'Insert unplanned work into a linked task sequence and reschedule downstream tasks';
    b.onclick = insertUnplannedBefore;
    actions.appendChild(b);
    b.style.display = (typeof twTaskCan === 'function' ? twTaskCan('Add') : twAdmin()) ? '' : 'none';
  }

  function insertUnplannedBefore() {
    if (!twU() || !(typeof twTaskCan === 'function' ? twTaskCan('Add') : twAdmin())) return toast('You do not have permission to insert tasks. Contact the ADPT Admin.');
    const p = pbyid(val('taskProjectFilter')) || project();
    if (!p) return toast('Select a project first.');

    const records = lkRecs(p).filter(r =>
      r.main &&
      !['Completed', 'Cancelled'].includes(r.o.status) &&
      (r.o.start || r.o.target)
    );
    if (!records.length) return alert('No open sub milestone with dates in this project.\n\nAdd start and target dates to the sub milestones (and link them in sequence) in the Project Schedule first, then use Insert Unplanned Task.');

    const nums = lkNums(p);
    const targetOptions = records.map(r =>
      `<option value="${esc(r.id)}">#${nums[r.id]} · ${esc(r.name)}${r.o.start || r.o.target ? ` (${fmtDate(r.o.start)} – ${fmtDate(r.o.target)})` : ''}</option>`
    ).join('');
    const people = [...new Set([
      ...twPeopleNames(),
      ...records.map(r => r.o.owner).filter(Boolean)
    ])].sort((a,b) => a.localeCompare(b));
    const defaultOwner = records[0].o.owner || (twU().owner || twU().name || '');

    twModal('Insert Unplanned Task Before Existing Task',
      `<p class="muted" style="margin:0 0 8px">Choose the sub milestone that should move later. The unplanned task is inserted immediately before it in the linked sequence, and that sub milestone and everything linked after it move later automatically (working days only)..</p>
       <div class="tw-f"><label for="insTarget">Insert before this sub milestone</label><select id="insTarget">${targetOptions}</select></div>
       <div class="tw-f"><label for="insName">Unplanned task name</label><input id="insName" maxlength="160" required placeholder="e.g. Urgent customer drawing revision"></div>
       <div class="tw-2">
         <div class="tw-f"><label for="insOwner">Owner</label><select id="insOwner">${people.map(n => `<option value="${esc(n)}" ${n===defaultOwner?'selected':''}>${esc(n)}</option>`).join('')}</select></div>
         <div class="tw-f"><label for="insDays">Estimated duration (working days)</label><input id="insDays" type="number" min="1" max="60" step="1" value="1" required></div>
       </div>
       <p class="muted" style="margin:0">The insertion start date is calculated from the selected task's current schedule and its existing predecessors. Saturdays, Sundays and configured holidays are excluded.</p>`,
      m => {
        const targetId = m.querySelector('#insTarget').value;
        const name = m.querySelector('#insName').value.trim();
        const owner = m.querySelector('#insOwner').value;
        const days = Number(m.querySelector('#insDays').value);
        const targetRec = lkRecs(p).find(r => r.id === targetId);

        if (!targetRec) return 'Please select a valid task.';
        if (!name) return 'Enter the unplanned task name.';
        if (!Number.isInteger(days) || days < 1 || days > 60) return 'Duration must be between 1 and 60 working days.';
        if (['Completed', 'Cancelled'].includes(targetRec.o.status)) return 'You cannot insert before a completed or cancelled task.';
        if (!targetRec.o.start && !targetRec.o.target) return 'The selected task needs a start date or target date first.';

        const oldTargetStart = targetRec.o.start || targetRec.o.target;
        const oldTargetEnd = targetRec.o.target || targetRec.o.start;
        const predecessorIds = [...(targetRec.o.links || [])];
        const predTargets = predecessorIds
          .map(id => lkRecs(p).find(r => r.id === id)?.o.target || '')
          .filter(Boolean)
          .sort();
        let insertStart = oldTargetStart;
        if (predTargets.length) {
          const afterPred = lkNext(predTargets[predTargets.length - 1]);
          if (afterPred > insertStart) insertStart = afterPred;
        }
        let guard = 0;
        while (!wxWork(insertStart, wxHol()) && guard++ < 40) insertStart = wlDateAdd(insertStart, 1);
        if (!insertStart) return 'Could not calculate an insertion date. Check the selected task dates.';

        const insertEnd = wdStep(insertStart, days - 1);
        const affectedCount = lkDesc(p, targetId).size + 1;
        if (!confirm(
          `Insert "${name}" before "${targetRec.name}"?\n\n` +
          `New task: ${fmtDate(insertStart)} to ${fmtDate(insertEnd)} (${days} working day(s))\n` +
          `Selected task currently: ${fmtDate(oldTargetStart)} to ${fmtDate(oldTargetEnd)}\n` +
          `${affectedCount} task(s) in the linked sequence will be checked and rescheduled where required.\n\n` +
          `Existing task durations and dependency links will be preserved.`
        )) return;

        const before = lkTargets(p);
        const reason = `Unplanned task inserted before ${targetRec.name}: ${name}`;
        let unplannedMain = p.tasks.find(t => t.unplanned);
        if (!unplannedMain) {
          unplannedMain = {
            id: uid(), name: 'Unplanned Work', status: 'In Progress',
            completedAt: '', subs: [], start: '', target: '', unplanned: true
          };
          p.tasks.push(unplannedMain);
        }

        const newId = uid();
        const sub = {
          /* v35.6: the inserted unplanned task is real work still to do, so it starts open and books its hours */
          id: newId, name, owner, status: insertStart <= today() ? 'In Progress' : 'Not Started', pct: 0,
          completedAt: '', start: insertStart, target: insertEnd,
          plannedHours: days * 8, actualHours: 0,
          dependency: 'Inserted before ' + targetRec.name,
          fromWhom: '', unplanned: true,
          links: predecessorIds
        };
        unplannedMain.subs.push(sub);

        /* Rewire the selected task: it now waits for the newly inserted activity. */
        targetRec.o.links = [newId];

        /* Reschedule the full dependent chain using the application's existing
           working-day/dependency engine. */
        const log = lkSnapChain(p, [newId], reason, false, before);
        const actualShift = targetRec.o.start
          ? wdDiff(oldTargetStart, targetRec.o.start)
          : wdDiff(oldTargetEnd, targetRec.o.target || targetRec.o.start);

        if (actualShift > 0 && p.end) {
          const oldEnd = p.end;
          p.end = wdStep(p.end, actualShift);
          db.history.unshift({
            at: new Date().toLocaleString(),
            project: p.code + ' — ' + p.name,
            record: 'Project',
            field: 'Project End Date (inserted unplanned task)',
            old: oldEnd, next: p.end, reason
          });
        }

        db.unplanned = db.unplanned || [];
        db.unplanned.push({
          id: uid(), projectId: p.id, person: owner || 'Unassigned',
          date: insertStart, hours: days * 8, note: name,
          by: TW.me, at: Date.now(), mode: 'insert',
          lost: days * 8, shift: actualShift, subId: newId,
          insertedBefore: targetRec.name
        });

        lkRoll(p);
        save(false);
        refreshTaskViews();
        if (typeof ulLogRender === 'function') ulLogRender();
        toast(`Unplanned task inserted. ${new Set(log.map(x => x.r.id)).size} linked task(s) rescheduled.`);
      },
      'Insert & Reschedule',
      true
    );
  }

  /* Keep the action visible after Task Management renders, but only for admins. */
  const originalRenderTasks = window.renderTasks;
  if (typeof originalRenderTasks === 'function') {
    window.renderTasks = function () {
      const result = originalRenderTasks.apply(this, arguments);
      addInsertButton();
      const b = document.getElementById('insertUnplannedBtn');
      if (b) b.style.display = (typeof twTaskCan === 'function' ? twTaskCan('Add') : twAdmin()) ? '' : 'none';
      return result;
    };
  }
  addInsertButton();
  window.insertUnplannedBefore = insertUnplannedBefore;
})();
