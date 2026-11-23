/* ADPT v18 TEST PATCH
   - Supabase edpt_profiles is the master list for active login profiles.
   - Legacy tracker IDs remain intact so historical task/review references are preserved.
   - Alias IDs are hidden from employee/assignment lists to prevent duplicate people.
   - Historical-only tracker users remain manageable and assignable; no Auth profile is created for them.
*/
(function () {
  const aliases = {
    'ganesh.joshi': 'ganesh.joshi@task.com',
    'kunal.kuwar': 'kunal.kuwar@task.com',
    'mayank.goil': 'mayank.gohil@task.com',
    'poonam.patole': 'poonam.patole@task.com',
    'sanag.sonjay': 'sagar.sonjay@task.com',
    'summit.kurade': 'sumeet.kurhade@task.com',
    'vikee.wagh': 'vikee.wagh@task.com',
    /* v36.1: old common-login entries now linked to their own logins (no duplicates, old tasks follow the person) */
    'akhil.dukre': 'akhil.dukare@task.com',
    'atharva.kasar': 'atharva.kasar@task.com',
    'gaurav.umbarkar': 'gaurav.umbarkar@task.com',
    'karan.khairnar': 'karan.khairnar@task.com',
    'prashant.gunjal': 'prashant.gunjal@task.com',
    'sakshi.shelar': 'sakshi.shelar@task.com',
    'shreyas.avhad': 'shreyas.avhad@task.com',
    'tanmay.shinde.2': 'tanmay.shinde@task.com'
  };
  window.EDPT_ALIAS_TO_PROFILE = aliases;
  const aliasIds = new Set(Object.keys(aliases));

  async function syncProfilesIntoTracker() {
    const { data, error } = await EDPT_SB.from('edpt_profiles')
      .select('user_id,full_name,login_id,role,is_active,designation,department,reports_to_login_id')
      .eq('is_active', true);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Unable to read active ADPT employee profiles.');
    db.users ||= {};
    for (const p of data) {
      if (!p.login_id) continue;
      const id = String(p.login_id).trim().toLowerCase();
      const old = db.users[id] || {};
      const role = String(p.role || 'Member');
      db.users[id] = {
        ...old,
        name: p.full_name || old.name || id,
        role: role === 'HOD' ? 'Member' : role,
        designation: p.designation || old.designation || role,
        dept: p.department || old.dept || '',
        reportsTo: p.reports_to_login_id ? String(p.reports_to_login_id).trim().toLowerCase() : (old.reportsTo || ''),
        owner: p.full_name || old.owner || id,
        admin: role.toLowerCase() === 'admin',
        profileUserId: p.user_id,
        isSupabaseProfile: true,
        pw: undefined,
        mustChange: false
      };
    }
    // Preserve legacy user records, but ensure their displayed names resolve to the master profile.
    for (const [legacyId, profileId] of Object.entries(aliases)) {
      if (db.users[legacyId] && db.users[profileId]) {
        db.users[legacyId].name = db.users[profileId].name;
        db.users[legacyId].owner = db.users[profileId].owner || db.users[profileId].name;
      }
    }
    // v22.1 fix: do NOT copy this profile overlay into EDPT_CLOUD_USERS.
    // EDPT_CLOUD_USERS must stay the exact users object read from edpt_state (captured in
    // edptLoadCloudState). The overlay adds login keys for profiles not yet in the tracker,
    // drops pw, resets mustChange and recomputes role/admin, so sending it on a non-admin
    // save made edpt_save_tracker reject the save ("Only Admin can change account
    // permissions..." / "Only Admin can create or remove login records.").
  }

  // Re-sync profiles after initial cloud load and every realtime refresh.
  const loadCloudOriginal = window.edptLoadCloudState;
  if (typeof loadCloudOriginal === 'function') {
    window.edptLoadCloudState = async function () {
      const result = await loadCloudOriginal.apply(this, arguments);
      await syncProfilesIntoTracker();
      if (typeof twRefresh === 'function') twRefresh();
      return result;
    };
  }

  // Only one selectable/displayed entry per active profile; retain all unmatched legacy people.
  window.twAssignable = function () {
    return Object.keys(db.users || {}).filter(id => !(window.EDPT_ALIAS_TO_PROFILE||{})[String(id).toLowerCase()])
      .sort((a, b) => twName(a).localeCompare(twName(b)));
  };
  window.twTeamOpts = function () {
    const ids = window.twAssignable();
    return ids.map(id => `<option value="${esc(id)}">${esc(twName(id))}</option>`).join('');
  };

  // Team & Access table: suppress legacy alias rows, but retain historical-only employee rows.
  const teamRenderOriginal = window.twTeamRender;
  if (typeof teamRenderOriginal === 'function') {
    window.twTeamRender = function () {
      const result = teamRenderOriginal.apply(this, arguments);
      const body = document.getElementById('twTeamRows');
      if (body) {
        [...body.querySelectorAll('tr')].forEach(row => {
          const id = row.querySelector('.tw-mono')?.textContent?.trim().toLowerCase();
          if (id && (window.EDPT_ALIAS_TO_PROFILE||{})[id]) row.remove();
        });
        const count = document.getElementById('twTeamCount');
        if (count) {
          const n = body.querySelectorAll('tr').length;
          count.textContent = `${n} employee${n === 1 ? '' : 's'}`;
        }
      }
      return result;
    };
  }

  // Avoid duplicate people in the global search palette.
  const sbItemsOriginal = window.sbItems;
  if (typeof sbItemsOriginal === 'function') {
    window.sbItems = function () {
      const items = sbItemsOriginal.apply(this, arguments);
      const seen = new Set();
      return items.filter(item => {
        if (item.g !== 'People') return true;
        const key = String(item.t || '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
    };
  }
})();
