/* ===== v36 — Permissions are managed in Supabase only =====
   In plain words:
   - When a person logs in, the tool reads their tick boxes from Supabase
     (table: edpt_user_permissions — one row per module: View / Add / Edit / Update / Delete).
   - Every tab and button in the tool follows those ticks.
   - Admin always has full access.
   - The old permission editor inside "Team & Access" is removed.
     To change someone's access: Supabase → Table Editor → edpt_user_permissions.
   - Changes in Supabase apply when the person refreshes the page (Ctrl + F5) or logs in again.
*/
(function(){
  'use strict';
  const FIELDS={View:'can_view',Add:'can_add',Edit:'can_edit',Update:'can_update',Delete:'can_delete'};
  let MY_PERMS=null;   // the logged-in person's ticks, e.g. {"Daily Tasks":{View:true,Add:false,...}}

  /* 1. Read the logged-in person's ticks from Supabase */
  async function loadMyPermissions(userId){
    MY_PERMS=null;
    try{
      const prof=await EDPT_SB.from('edpt_profiles').select('login_id,role').eq('user_id',userId).single();
      if(prof.error) throw prof.error;
      if(String(prof.data.role||'').toLowerCase()==='admin'){ MY_PERMS={}; return; }   // Admin: everything allowed anyway
      const res=await EDPT_SB.from('edpt_user_permissions')
        .select('module,can_view,can_add,can_edit,can_update,can_delete')
        .eq('login_id',String(prof.data.login_id||'').trim().toLowerCase());
      if(res.error) throw res.error;
      const p={};
      (res.data||[]).forEach(row=>{ p[row.module]={}; Object.entries(FIELDS).forEach(([action,col])=>{ p[row.module][action]=!!row[col]; }); });
      MY_PERMS=p;
    }catch(e){
      console.warn('Permissions could not be loaded from Supabase',e);
      MY_PERMS={};   // safe default: no permissions until the page is refreshed
      try{ toast('Your permissions could not be loaded. Please refresh the page.'); }catch(_){}
    }
  }

  /* 2. The one permission check every screen uses */
  window.edptPermissionFromSupabase=function(module,action,user){
    const me=(typeof twU==='function')?twU():null;
    if(user&&me&&user!==me) return undefined;      // question about someone else: not answered here
    if(!me) return false;
    if(me.admin) return true;                       // Admin: full access
    if(!MY_PERMS) return false;                     // not loaded yet
    const m=MY_PERMS[module]; if(!m) return false;  // no row for this module = no access
    if(action==='View') return !!(m.View||m.Add||m.Edit||m.Update||m.Delete);
    return !!m[action];
  };
  window.edptMyPermissions=()=>JSON.parse(JSON.stringify(MY_PERMS||{}));   // for checking in the browser console

  /* 3. Load the ticks at login (and at "stay signed in") before the screens are drawn */
  const finish0=window.edptFinishLogin;
  if(typeof finish0==='function') window.edptFinishLogin=async function(user){
    if(user&&user.id) await loadMyPermissions(user.id);
    return finish0.apply(this,arguments);
  };

  /* 4. Team & Access: remove the old permission editor, point to Supabase instead */
  const team0=window.twTeamRender;
  if(typeof team0==='function') window.twTeamRender=function(){
    const r=team0.apply(this,arguments);
    try{
      document.getElementById('twAccessControl')?.remove();
      document.getElementById('acxPanel')?.remove();
      document.querySelectorAll('#team p, #team div').forEach(el=>{ if(el.children.length===0&&/see Access Management below/.test(el.textContent))
        el.textContent=el.textContent.replace(/"Access role" decides what each person can do \(see Access Management below\)\./,'What each person can do is set in Supabase (edpt_user_permissions).'); });
      const host=document.getElementById('team');
      if(host&&!document.getElementById('edptPermNote')) host.insertAdjacentHTML('beforeend',
        `<div class="panel" id="edptPermNote"><h3>Access permissions</h3>
         <p class="muted" style="margin:0">Permissions are managed in Supabase: <b>Table Editor → edpt_user_permissions</b>
         (one row per person per module). Changes apply when the person refreshes the page or logs in again.</p></div>`);
    }catch(e){ console.warn(e); }
    return r;
  };
})();
