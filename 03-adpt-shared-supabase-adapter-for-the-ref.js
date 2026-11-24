/* ===== ADPT shared Supabase adapter for the refreshed interface =====
   Authentication uses the email registered in Supabase Auth.
   Shared tracker writes use the version-checked edpt_save_tracker RPC.
*/
/* v35.21: index.html?env=test uses a separate TEST Supabase project (set in this browser); index.html?env=live goes back */
const EDPT_LIVE_URL = window.EDPT_CONFIG.supabaseUrl;
const EDPT_LIVE_KEY = window.EDPT_CONFIG.supabasePublishableKey;
const EDPT_TEST = (() => { try { const q = new URLSearchParams(location.search).get('env'); if (q === 'test') sessionStorage.setItem('adptEnv', 'test'); if (q === 'live') sessionStorage.removeItem('adptEnv'); return sessionStorage.getItem('adptEnv') === 'test'; } catch (e) { return false; } })();
const EDPT_TEST_CFG = (() => { if (!EDPT_TEST) return null; try { const c = JSON.parse(localStorage.getItem('adptTestSupabase') || 'null'); return c && c.url && c.key && c.url.toLowerCase() !== EDPT_LIVE_URL.toLowerCase() ? c : null; } catch (e) { return null; } })();
/* test mode without settings never falls back to live: it points at an empty placeholder until the test project is entered */
const EDPT_SUPABASE_URL = EDPT_TEST ? (EDPT_TEST_CFG ? EDPT_TEST_CFG.url : 'https://test-not-configured.supabase.co') : EDPT_LIVE_URL;
const EDPT_SUPABASE_ANON_KEY = EDPT_TEST ? (EDPT_TEST_CFG ? EDPT_TEST_CFG.key : 'not-configured') : EDPT_LIVE_KEY;
const EDPT_SB = window.supabase.createClient(EDPT_SUPABASE_URL, EDPT_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
let EDPT_CLOUD_READY = false, EDPT_CLOUD_VERSION = 0, EDPT_SAVE_CHAIN = Promise.resolve(), EDPT_REMOTE_LOADING = false;
// Keep the canonical shared login records separate from the signed-in profile overlay.
// Non-admin saves must not submit profile-derived changes to db.users.
let EDPT_CLOUD_USERS = {};

function edptIsVersionConflict(err) {
  return /version conflict|changed by another user/i.test(String(err?.message || err || ''));
}
function edptCloudMessage(err) {
  const msg = String(err?.message || err || 'Unknown error');
  const code = String(err?.code || '');
  // Specific edpt_save_tracker outcomes first, so they are never hidden behind a generic message.
  if (edptIsVersionConflict(err)) return 'The shared tracker was changed by another user. The latest data has been reloaded; please re-apply your last change.';
  if (/active user profile not found/i.test(msg)) return 'Your ADPT profile is missing or inactive. Contact the ADPT Admin. (' + msg + ')';
  if (/^unauthorized role/i.test(msg)) return 'Your ADPT role is not allowed to save tracker changes. Contact the ADPT Admin. (' + msg + ')';
  if (/^only admin can/i.test(msg)) return msg;
  if (/invalid tracker data|tracker record not found|tracker save failed/i.test(msg)) return msg;
  // Database-level denials (RLS / missing EXECUTE grant / JWT problems).
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Your account does not have permission for this action. Contact the ADPT Admin. (' + msg + ')';
  if (/jwt|not authorized|unauthorized/i.test(msg)) return 'Your sign-in session is not valid. Sign out and sign in again. (' + msg + ')';
  return msg;
}
function edptCloudError(err, action) {
  // Log the full PostgREST error so the real cause is always visible in the Console.
  console.error('ADPT cloud ' + action, {
    message: err?.message, code: err?.code, details: err?.details, hint: err?.hint, error: err
  });
  toast('Cloud ' + action + ' failed: ' + edptCloudMessage(err));
}
async function edptLoadCloudState() {
  EDPT_REMOTE_LOADING = true;
  try {
    const { data, error } = await EDPT_SB.from('edpt_state')
      .select('id,version,data').eq('id', 1).single();
    if (error) throw error;
    if (!data?.data || !Array.isArray(data.data.projects)) throw new Error('Shared tracker data is missing or invalid.');
    db = data.data;
    EDPT_CLOUD_USERS = JSON.parse(JSON.stringify(db.users || {}));
    EDPT_CLOUD_VERSION = Number(data.version || 0);
    twEnsure();
    EDPT_CLOUD_READY = true;
  } finally {
    EDPT_REMOTE_LOADING = false;
  }
  if (typeof refreshAll === 'function') refreshAll();
  if (typeof twRefresh === 'function') twRefresh();
  if (typeof renderReport === 'function') renderReport();
  if (typeof renderProjectList === 'function') renderProjectList();
  if (typeof renderWorkloadPlanner === 'function') renderWorkloadPlanner();
}
async function edptCloudSave() {
  if (!EDPT_CLOUD_READY || EDPT_REMOTE_LOADING) return;
  const snapshot = JSON.parse(JSON.stringify(db));
  // Managers/Team Leaders may save operational data, but login records remain Admin-managed.
  // The Supabase login profile is overlaid into db.users for the UI; do not send that overlay
  // back as a login-record change during a normal non-admin save.
  if (typeof twAdmin === 'function' && !twAdmin()) {
    snapshot.users = JSON.parse(JSON.stringify(EDPT_CLOUD_USERS || {}));
  }
  const { data, error } = await EDPT_SB.rpc('edpt_save_tracker', {
    p_data: snapshot,
    p_expected_version: EDPT_CLOUD_VERSION
  });
  if (error) throw error;
  if (data == null) throw new Error('Cloud save did not return a new version.');
  EDPT_CLOUD_VERSION = Number(data);
  if (typeof twAdmin === 'function' && twAdmin()) {
    EDPT_CLOUD_USERS = JSON.parse(JSON.stringify(snapshot.users || {}));
  }
}
save = function(notify = true) {
  if (EDPT_CLOUD_READY && !EDPT_REMOTE_LOADING) {
    EDPT_SAVE_CHAIN = EDPT_SAVE_CHAIN.then(edptCloudSave).catch(async e => {
      edptCloudError(e, 'save');
      // Never overwrite another user's change: on a version conflict, reload the current
      // shared state (and its version) so the next save is made against fresh data.
      if (edptIsVersionConflict(e)) {
        try { await window.edptLoadCloudState(); }
        catch (re) { console.error('ADPT reload after version conflict failed', re); }
      }
    });
    if (notify) toast('Saving to shared ADPT workspace…');
  } else if (TW.me && !EDPT_REMOTE_LOADING) {
    if (notify) toast('Cloud connection is not ready. Please refresh and sign in again; changes were not saved.');
    console.error('ADPT save blocked: signed-in user has no active cloud connection.');
  } else if (!EDPT_REMOTE_LOADING) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn(e); }
    if (notify) toast('Saved locally (not connected to shared workspace)');
  }
};

async function edptLoginWithCloud(email, password) {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Enter the email address registered for your ADPT account.');
  const { data: authData, error: authError } = await EDPT_SB.auth.signInWithPassword({ email: cleanEmail, password });
  if (authError || !authData?.user) throw new Error('Email ID or password is incorrect. Use the password registered in Supabase Authentication.');
  return edptFinishLogin(authData.user);
}
/* v35.16: shared by sign-in and by "stay signed in" after a refresh */
async function edptFinishLogin(user) {
  const { data: profile, error: profileError } = await EDPT_SB.from('edpt_profiles')
    .select('user_id,full_name,login_id,role,is_active,designation,department,reports_to_login_id')
    .eq('user_id', user.id).single();
  if (profileError || !profile || !profile.is_active || !profile.login_id) {
    await EDPT_SB.auth.signOut();
    throw new Error('Your active ADPT profile is not linked correctly. Please contact the Admin.');
  }

  await edptLoadCloudState();
  const id = String(profile.login_id).trim().toLowerCase();
  db.users ||= {};
  const existing = db.users[id] || {};
  const role = String(profile.role || 'Member');
  db.users[id] = {
    ...existing,
    name: profile.full_name || existing.name || id,
    role: role === 'HOD' ? 'Member' : role,
    designation: profile.designation || existing.designation || role,
    dept: profile.department || existing.dept || '',
    reportsTo: profile.reports_to_login_id || existing.reportsTo || '',
    owner: profile.full_name || existing.owner || id,
    admin: role.toLowerCase() === 'admin',
    pw: undefined,
    mustChange: false
  };
  TW.me = id;
  twSS.set('twMe', id);
  twEnter();
  toast('Connected to shared ADPT workspace');

  if (window.EDPT_STATE_CHANNEL) EDPT_SB.removeChannel(window.EDPT_STATE_CHANNEL);
  window.EDPT_STATE_CHANNEL = EDPT_SB.channel('edpt-shared-state')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'edpt_state', filter: 'id=eq.1' }, async payload => {
      if (Number(payload.new?.version || 0) > EDPT_CLOUD_VERSION) {
        try {
          await edptLoadCloudState();
          if (TW.me && db.users?.[TW.me]) { twRefresh(); toast('Shared tracker refreshed from another user.'); }
        } catch (e) { edptCloudError(e, 'refresh'); }
      }
    }).subscribe();
}

twLoginRender = function() {
  const L = document.getElementById('twLogin');
  L.hidden = false;
  document.body.classList.add('tw-locked');
  L.classList.add('edpt-welcome');
  L.innerHTML = `<div class="ew-wrap">
  <aside class="ew-side">
    <div class="ew-grid" aria-hidden="true"></div>
    <div class="ew-brand"><span class="ew-mark">${twMark(30)}</span><div><b>ADPT</b><small>Armstrong Dematic</small></div></div>
    <div class="ew-pitch">
      <h1>Armstrong Dematic<br>Project Tracker</h1>
      <p>Plan, track and deliver every electrical design project with your team.</p>
      <ul>
        <li><span>▣</span>Projects, task progress and schedules</li>
        <li><span>✓</span>Daily tasks, subtasks and team capacity</li>
        <li><span>₹</span>Budget, change notes, RCA &amp; CAPA, COPQ and savings</li>
      </ul>
    </div>
    <p class="ew-sidefoot">For the Electrical Design team</p>
  </aside>
  <main class="ew-main">
    <div class="ew-card">
      <h2>Sign in</h2>
      <p class="ew-sub">Use your ADPT email ID and password.</p>
      <form id="twLf" autocomplete="on">
        <label class="ew-l" for="twLid">Email ID</label>
        <div class="ew-f"><input id="twLid" name="username" type="email" autocomplete="username" placeholder="name@company.com" required></div>
        <div class="ew-row"><label class="ew-l" for="twLpw">Password</label><a href="#" class="ew-link" id="ewForgot">Forgot password?</a></div>
        <div class="ew-f ew-pw"><input id="twLpw" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required>
          <button type="button" class="ew-eye" id="ewEye" aria-label="Show password" title="Show password"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
        <div class="tw-err ew-err" id="twLerr"></div>
        <button class="primary ew-btn" id="edptSignIn" type="submit">Sign in</button>
        <p class="ew-note">New to ADPT? <a href="#" class="ew-link" id="ewNoAcc">How to get access</a></p>
      </form>
    </div>
    <p class="ew-foot">Armstrong Dematic Project Tracker${window.EDPT_VERSION?' · '+EDPT_VERSION:''}</p>
  </main></div>`;
  (function(){
    const pw=document.getElementById('twLpw'), eye=document.getElementById('ewEye');
    eye.onclick=()=>{ const show=pw.type==='password'; pw.type=show?'text':'password'; eye.classList.toggle('on',show); eye.title=eye.ariaLabel=show?'Hide password':'Show password'; pw.focus(); };
    const msg=t=>{ const e=document.getElementById('twLerr'); e.textContent=t; e.classList.add('ew-info'); };
    document.getElementById('ewForgot').onclick=e=>{ e.preventDefault(); msg('To reset your password, contact the ADPT Admin. Team members using the common Electrical Design login can ask their Team Leader.'); };
    document.getElementById('ewNoAcc').onclick=e=>{ e.preventDefault(); msg('Only the Admin, AGM, Manager or a Team Leader can add people. Team members can use the common Electrical Design login.'); };
    setTimeout(()=>document.getElementById('twLid')?.focus(),50);
  })();
  document.getElementById('twLf').onsubmit = async e => {
    e.preventDefault();
    const email = document.getElementById('twLid').value.trim();
    const password = document.getElementById('twLpw').value;
    const button = document.getElementById('edptSignIn');
    const errorBox = document.getElementById('twLerr');
    button.disabled = true; button.textContent = 'Signing in…'; errorBox.textContent = ''; errorBox.classList.remove('ew-info');
    try { await edptLoginWithCloud(email, password); }
    catch (err) { errorBox.textContent = edptCloudMessage(err); console.error(err); }
    finally {
      const b = document.getElementById('edptSignIn');
      if (b) { b.disabled = false; b.textContent = 'Sign in'; }
    }
  };
};

twLogout = async function() {
  try { await EDPT_SB.auth.signOut(); } catch (e) { console.warn(e); }
  EDPT_CLOUD_READY = false; EDPT_CLOUD_VERSION = 0;
  TW.me = null; TW.drawer = false; TW.prof = false; twSS.set('twMe', null);
  document.body.classList.remove('tw-admin', 'tw-lead', 'tw-drawer-open');
  twDrawerRender(); twProfRender(); twLoginRender();
};
twPwSave = function() {
  return 'Password changes for this cloud-connected account must be managed through Supabase Authentication.';
};

/* Always require a fresh email/password login on opening or refreshing ADPT. */
(function edptCloudBoot() {
  try {
    twEnsure();
    TW.me = null;
    twSS.set('twMe', null);
    EDPT_CLOUD_READY = false;
    EDPT_CLOUD_VERSION = 0;
    document.body.classList.remove('tw-admin', 'tw-lead', 'tw-drawer-open');
    twShell();
    twLoginRender();
    /* v35.16: keep the person signed in after a refresh — resume the saved Supabase session (Sign out clears it) */
    try { if (Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k) || k === 'stubSess')) document.body.classList.add('adpt-resuming'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', () => { if (typeof window.edptResume === 'function') window.edptResume(); else document.body.classList.remove('adpt-resuming'); });
  } catch (e) {
    console.error('ADPT startup error', e);
    toast('ADPT could not start. Check browser console.');
  }
})();
