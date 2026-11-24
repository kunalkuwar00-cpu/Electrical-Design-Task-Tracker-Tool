/* ADPT v21.8 — unified refresh for every employee/task view in the production build.
   A refresh must rebuild Daily Tasks, Workload and Person-wise lists from the same
   current active roster after the latest cloud state is applied. */
(function(){
  if (window.EDPT_V218_UNIFIED_REFRESH) return;
  window.EDPT_V218_UNIFIED_REFRESH = true;
  window.edptRefreshAllViews = function(){
    try {
      if (typeof refreshAll === 'function') refreshAll();
      if (typeof twRefresh === 'function') twRefresh();
      if (typeof twDailyRender === 'function') twDailyRender();
      if (typeof twTeamRender === 'function' && typeof TW !== 'undefined' && TW.tab === 'team') twTeamRender();
      if (typeof renderPersonList === 'function') renderPersonList();
      if (typeof renderPersonTasks === 'function') renderPersonTasks();
      if (typeof renderWorkloadPlanner === 'function') renderWorkloadPlanner();
      if (typeof renderReport === 'function') renderReport();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof ulLogRender === 'function') ulLogRender();
      if (typeof twAdminReallocationRender === 'function') twAdminReallocationRender();
      return true;
    } catch (e) {
      console.error('ADPT unified refresh failed:', e);
      if (typeof toast === 'function') toast('Refresh failed. Please check the browser console and try again.');
      return false;
    }
  };

  // Refreshing the shell/account also refreshes workload and person-wise views,
  // not just the Daily Task list currently visible.
  const oldTwRefresh = window.twRefresh;
  if (typeof oldTwRefresh === 'function') {
    window.twRefresh = function(){
      const result = oldTwRefresh.apply(this, arguments);
      if (typeof renderWorkloadPlanner === 'function') renderWorkloadPlanner();
      if (typeof renderPersonList === 'function') renderPersonList();
      if (typeof renderPersonTasks === 'function') renderPersonTasks();
      return result;
    };
  }

  // Include Workload in any generic full refresh used by the app.
  const oldRefreshAll = window.refreshAll;
  if (typeof oldRefreshAll === 'function') {
    window.refreshAll = function(){
      const result = oldRefreshAll.apply(this, arguments);
      if (typeof renderWorkloadPlanner === 'function') renderWorkloadPlanner();
      return result;
    };
  }

  // Dashboard Refresh button was only redrawing the dashboard. Make it refresh
  // all synchronized employee views as well.
  document.querySelectorAll('button[onclick="renderDashboard()"],button[onclick="renderDashboard();"]').forEach(btn=>{
    btn.setAttribute('onclick','edptRefreshAllViews()');
  });
})();
