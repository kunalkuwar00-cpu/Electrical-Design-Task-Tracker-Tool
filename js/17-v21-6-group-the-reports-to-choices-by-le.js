/* v21.6: Group the Reports To choices by leadership level in Add Person. */
(function(){
  const normName = s => String(s || '').trim().toLowerCase().replace(/[._,]+/g,' ').replace(/\s+/g,' ');
  window.twNewUser = function(owner){
    if (!twLead(twU())) return toast('Only Team Leaders, Managers and the admin can manage team access.');
    const removed = new Set((db.edptRemovedPeople || []).map(normName));
    const groups = [
      ['AGM', u => String(u.role || '').toLowerCase() === 'agm' || String(u.designation || '').toLowerCase() === 'agm'],
      ['Manager', u => String(u.role || '').toLowerCase() === 'manager' || String(u.designation || '').toLowerCase() === 'manager'],
      ['Team Leader', u => String(u.role || '').toLowerCase() === 'team leader' || String(u.designation || '').toLowerCase() === 'team leader']
    ];
    const all = Object.entries(db.users || {}).filter(([id,u]) => {
      const nm = normName(u.owner || u.name);
      return u && !removed.has(normName(id)) && !removed.has(nm);
    });
    const opts = groups.map(([label, test]) => {
      const members = all.filter(([,u]) => test(u)).sort((a,b) => String(a[1].name||'').localeCompare(String(b[1].name||'')));
      return members.length ? `<optgroup label="${label}">${members.map(([id,u]) => `<option value="${esc(id)}">${esc(u.name || id)} (${label})</option>`).join('')}</optgroup>` : '';
    }).join('');
    twModal('Add Person', `<div class="tw-2">
      <div class="tw-f"><label for="twUn">Full name</label><input id="twUn" required value="${esc(owner || '')}"></div>
      <div class="tw-f"><label for="twUid">Login ID</label><input id="twUid" required value="${esc(twSlug(owner))}" placeholder="firstname.lastname"></div>
      <div class="tw-f"><label for="twUr">Access role</label><select id="twUr"><option>Member</option><option>Team Leader</option><option>Manager</option><option>AGM</option></select></div>
      <div class="tw-f"><label for="twUdes">Designation</label><input id="twUdes" placeholder="e.g. Design Engineer"></div>
      <div class="tw-f"><label for="twUd">Department</label><input id="twUd" value="Electrical Design"></div>
      <div class="tw-f"><label for="twUrt">Reports to</label><select id="twUrt"><option value="">— Select reporting manager —</option>${opts}</select></div>
    </div><p class="muted" style="margin:0">They sign in first with <span class="tw-mono">${TW_PW}</span> and then set their own password.</p>`, m => {
      const id = m.querySelector('#twUid').value.trim().toLowerCase();
      const name = m.querySelector('#twUn').value.trim();
      if (!name) return "Enter the person's full name.";
      if (!/^[a-z0-9._-]+$/.test(id)) return 'Login ID can use lowercase letters, digits, dot, dash and underscore.';
      if (db.users[id]) return 'That Login ID already exists.';
      const role = m.querySelector('#twUr').value;
      db.users[id] = { name, role, designation: m.querySelector('#twUdes').value.trim() || role, dept: m.querySelector('#twUd').value.trim(), reportsTo: m.querySelector('#twUrt').value, owner: owner || name, admin: false, pw: twHash(id, TW_PW), mustChange: true };
      if (typeof edptReactivateNewPerson === 'function') edptReactivateNewPerson(id, db.users[id]);
      save(false); twTeamRender(); if (typeof twDailyRender === 'function') twDailyRender(); if (typeof renderWorkloadPlanner === 'function') renderWorkloadPlanner();
      toast('Login created for ' + name);
    }, 'Add Person');
  };
  window.EDPT_V216_REPORTING_GROUPS = true;
})();
