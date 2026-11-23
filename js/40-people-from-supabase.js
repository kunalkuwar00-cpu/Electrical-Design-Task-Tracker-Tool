/* ===== v36.1 — People are managed in Supabase only =====
   In plain words:
   - Only people with an ACTIVE account in Supabase (table edpt_profiles) appear in the tool:
     every "Assign to" list, Team Capacity, Team & Access, filters.
   - New joiner: create their login in Supabase (Authentication → Users), add their row in edpt_profiles,
     and give their permissions in edpt_user_permissions. They appear in the tool automatically.
   - Someone leaves: set is_active = false in edpt_profiles. They disappear from the tool.
   - Team & Access in the tool is now read-only: no Add Person / Remove / editing people here.
   - Old tasks of old IDs still show the right person (see the ID links in 10-adpt-v18-test-patch.js).
*/
(function(){
  'use strict';
  const NOTE='People and their details are managed in Supabase (edpt_profiles). To add someone, create their login in Supabase; to remove someone, set is_active = false.';
  const team0=window.twTeamRender;
  if(typeof team0==='function') window.twTeamRender=function(){
    const r=team0.apply(this,arguments);
    try{
      const box=document.getElementById('team'); if(!box) return r;
      // no adding or removing people in the tool
      box.querySelectorAll('button').forEach(b=>{
        const t=b.textContent.trim(), oc=b.getAttribute('onclick')||'';
        if(/add person/i.test(t)||/^remove$/i.test(t)||/twDelUser|twAddUser|twNewUser/.test(oc)) b.style.display='none';
      });
      // people's details are read-only (they come from Supabase)
      box.querySelectorAll('#twTeamRows input, #twTeamRows select').forEach(el=>{ el.disabled=true; el.title='Managed in Supabase (edpt_profiles)'; });
      if(!document.getElementById('edptPeopleNote')){
        const rows=document.getElementById('twTeamRows'), host=rows?rows.closest('.panel')||box:box;
        host.insertAdjacentHTML('afterbegin',`<div id="edptPeopleNote" class="muted" style="margin:0 0 10px;padding:8px 12px;border-radius:8px;background:rgba(127,127,127,.12)">${NOTE}</div>`);
      }
    }catch(e){ console.warn(e); }
    return r;
  };
})();
