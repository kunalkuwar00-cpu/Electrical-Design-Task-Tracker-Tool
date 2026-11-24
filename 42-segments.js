/* ===== v38 — Project Segment list =====
   Segment choices everywhere: ASRS · Tote & Carton · Slit Roll · Robotics & Palletizer.
   A project that still has an older segment (for example CBS or NBS) keeps it: that value stays
   selectable for that project, so saving the project never wipes its segment.
*/
(function(){
  'use strict';
  function keepOld(){
    try{
      const el=document.getElementById('projectSegment'), p=typeof project==='function'?project():null; if(!el) return;
      [...el.options].forEach(o=>{ if(o.dataset.old) o.remove(); });
      const v=p&&!(typeof creatingProject!=='undefined'&&creatingProject)?String(p.segment||'').trim():'';
      if(v&&![...el.options].some(o=>o.value===v)){ const o=document.createElement('option'); o.value=v; o.textContent=v+' (old)'; o.dataset.old='1'; el.appendChild(o); }
      if(v) el.value=v;
    }catch(e){ console.warn(e); }
  }
  ['renderSetup','selectProject','newProject','cancelNewProject'].forEach(n=>{ const f=window[n]; if(typeof f!=='function') return;
    window[n]=function(){ const r=f.apply(this,arguments); keepOld(); return r; }; });
})();
