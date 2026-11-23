/* v18 correction: expose permitted Add Subtask action and reliably render Project List under Project Setup. */
(function(){
  const r0=window.renderSetup;
  window.renderSetup=function(){
    if(typeof r0==='function')r0.apply(this,arguments);
    if(typeof window.psListRender==='function')window.psListRender();
  };
  const add0=window.addSubtask;
  window.addSubtask=function(tid){
    if(typeof window.edptCan==='function' && !window.edptCan('Task Management','Add')){
      if(typeof toast==='function')toast('You do not have permission to add subtasks.');
      return;
    }
    return add0.apply(this,arguments);
  };
})();
