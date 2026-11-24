/* ADPT v21.9 — explicit shared-cloud refresh and save diagnostics.
   Local redraws are not a cross-device sync. This refresh fetches edpt_state
   from Supabase, then rebuilds every view from the newly loaded shared record. */
(function(){
  if (window.EDPT_V219_CLOUD_REFRESH) return;
  window.EDPT_V219_CLOUD_REFRESH = true;
  window.EDPT_LAST_CLOUD_SAVE_ERROR = null;

  const previousCloudError = window.edptCloudError;
  window.edptCloudError = function(err, action){
    if (action === 'save') window.EDPT_LAST_CLOUD_SAVE_ERROR = err || new Error('Unknown cloud save error');
    if (typeof previousCloudError === 'function') return previousCloudError(err, action);
    console.error('ADPT cloud ' + action, err);
    if (typeof toast === 'function') toast('Cloud ' + action + ' failed: ' + String(err?.message || err));
  };

  window.edptRefreshSharedWorkspace = async function(){
    if (!window.EDPT_CLOUD_READY || typeof window.edptLoadCloudState !== 'function') {
      toast('Not connected to the shared workspace. Sign out and sign in again.');
      return false;
    }
    const buttons = [...document.querySelectorAll('button[onclick*="edptRefreshSharedWorkspace"],button[onclick*="edptRefreshAllViews"]')];
    buttons.forEach(b=>{b.disabled=true; b.dataset.oldText ||= b.textContent; b.textContent='Syncing…';});
    try {
      // Wait for queued writes from this browser before loading the latest server version.
      if (window.EDPT_SAVE_CHAIN) await window.EDPT_SAVE_CHAIN;
      await window.edptLoadCloudState();
      if (typeof localRefresh === 'function') localRefresh();
      window.EDPT_LAST_CLOUD_SAVE_ERROR = null;
      toast('Latest shared data loaded from Supabase.');
      return true;
    } catch (err) {
      console.error('ADPT shared refresh failed:', err);
      toast('Shared refresh failed: ' + String(err?.message || err));
      return false;
    } finally {
      buttons.forEach(b=>{b.disabled=false; b.textContent=b.dataset.oldText || 'Refresh'; delete b.dataset.oldText;});
    }
  };

  // Route visible refresh controls to a real server fetch, not only local rendering.
  document.querySelectorAll('button[onclick="edptRefreshAllViews()"],button[onclick="renderDashboard()"],button[onclick="renderDashboard();"]').forEach(btn=>{
    btn.setAttribute('onclick','edptRefreshSharedWorkspace()');
  });

  // Make the generic refresh entry point fetch shared state when signed in.
  const localRefresh = window.edptRefreshAllViews;
  window.edptRefreshAllViews = function(){
    if (window.EDPT_CLOUD_READY && typeof window.edptLoadCloudState === 'function') {
      return window.edptRefreshSharedWorkspace();
    }
    return typeof localRefresh === 'function' ? localRefresh() : false;
  };
})();
