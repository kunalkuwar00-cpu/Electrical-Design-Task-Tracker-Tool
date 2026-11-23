/* User-requested cleanup: remove Project List and Person-wise Task List; preserve their underlying data. */
(function(){
  const priorNav=window.twNav;
  window.twNav=function(){
    const items=typeof priorNav==='function'?priorNav():[];
    return items.filter(x=>!['projectList','person'].includes(x[0]));
  };
  /* Do not allow old quick links or legacy tabs to reopen removed screens. */
  const switch0=window.switchTab;
  if(typeof switch0==='function')window.switchTab=function(name){
    if(name==='projectList'||name==='person')name='dashboard';
    return switch0.apply(this,[name,...Array.prototype.slice.call(arguments,1)]);
  };
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('[data-tab="projectList"],[data-tab="person"]').forEach(el=>el.remove());
    ['projectList','person'].forEach(id=>{const el=document.getElementById(id);if(el)el.remove();});
  });
  const style=document.createElement('style');
  style.textContent='#projectList,#person,[data-tab="projectList"],[data-tab="person"]{display:none!important}';
  document.head.appendChild(style);
})();
