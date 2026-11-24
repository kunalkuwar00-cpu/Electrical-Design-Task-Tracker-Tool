/* ===== ADPT v28.2 — Daily Tasks: collapse / expand each person ===== */
(function(){
  'use strict';
  const KEY='edptDailyCollapsed';
  let C; try{ C=new Set(JSON.parse(localStorage.getItem(KEY)||'[]')); }catch(e){ C=new Set(); }
  const keep=()=>{ try{ localStorage.setItem(KEY,JSON.stringify([...C])); }catch(e){} };
  const css=document.createElement('style'); css.textContent=`
    #twDailyList tr.dt-grp td{cursor:pointer;user-select:none}
    #twDailyList tr.dt-grp .dt-car{display:inline-block;width:16px;color:var(--sb-mut,#71717a);transition:transform .15s}
    #twDailyList tr.dt-grp.closed .dt-car{transform:rotate(-90deg)}
    #twDailyList .dt-colbar{display:flex;gap:6px;justify-content:flex-end;margin:6px 0}`;
  document.head.appendChild(css);
  /* v28.4: people summary table (Person / Open / Closed / Overdue) can collapse and expand */
  const SKEY='edptDailySumCollapsed';
  css.textContent+=`
    #twDailyList .dt-sumbar{display:flex;align-items:center;gap:8px;margin:14px 0 6px;cursor:pointer;user-select:none;font-weight:700;font-size:14px}
    #twDailyList .dt-sumbar .dt-car{display:inline-block;width:16px;color:var(--sb-mut,#71717a);transition:transform .15s}
    #twDailyList .dt-sumbar.closed .dt-car{transform:rotate(-90deg)}
    #twDailyList .dt-sumbar .muted{font-weight:400;font-size:12px}`;
  function summary(){
    const t=document.querySelector('#twDailyList table.tw-ptab'); if(!t) return;
    const wrap=t.closest('.tablewrap')||t;
    let bar=wrap.previousElementSibling&&wrap.previousElementSibling.classList.contains('dt-sumbar')?wrap.previousElementSibling:null;
    if(!bar){ bar=document.createElement('div'); bar.className='dt-sumbar'; wrap.parentNode.insertBefore(bar,wrap); wrap.style.marginTop='0'; }
    let closed=false; try{ closed=localStorage.getItem(SKEY)==='1'; }catch(e){}
    const n=t.querySelectorAll('tbody tr').length;
    bar.classList.toggle('closed',closed);
    bar.title=closed?'Click to expand':'Click to collapse';
    bar.innerHTML=`<span class="dt-car">▾</span>People summary <span class="muted">${n} ${n===1?'person':'people'} · click to ${closed?'expand':'collapse'}</span>`;
    wrap.style.display=closed?'none':'';
    bar.onclick=()=>{ try{ localStorage.setItem(SKEY,closed?'0':'1'); }catch(e){} summary(); };
  }
  function groups(){
    const t=[...document.querySelectorAll('#twDailyList table.tw-dtab')].pop(); if(!t) return [];
    const out=[]; let g=null;
    [...t.querySelectorAll('tbody tr')].forEach(tr=>{ if(tr.classList.contains('dt-grp')){ g={row:tr,name:(tr.querySelector('b')||tr).textContent.trim(),rows:[]}; out.push(g); } else if(g) g.rows.push(tr); });
    return out;
  }
  function apply(){
    try{ summary(); }catch(e){ console.warn(e); }
    const gs=groups(); if(!gs.length) return;
    gs.forEach(g=>{
      const closed=C.has(g.name);
      g.row.classList.toggle('closed',closed);
      const td=g.row.querySelector('td');
      if(td && !td.querySelector('.dt-car')) td.insertAdjacentHTML('afterbegin','<span class="dt-car">▾</span>');
      if(td) td.title=closed?'Click to expand':'Click to collapse';
      g.rows.forEach(r=>{ r.style.display=closed?'none':''; });
      g.row.onclick=e=>{ if(e.target.closest('button,a,input,select')) return; if(C.has(g.name)) C.delete(g.name); else C.add(g.name); keep(); apply(); };
    });
    const t=[...document.querySelectorAll('#twDailyList table.tw-dtab')].pop();
    const wrap=t&&(t.closest('.tablewrap')||t);
    if(wrap && !(wrap.previousElementSibling&&wrap.previousElementSibling.classList.contains('dt-colbar'))){
      const bar=document.createElement('div'); bar.className='dt-colbar';
      bar.innerHTML='<button class="small" type="button" data-a="open">Expand all</button><button class="small" type="button" data-a="close">Collapse all</button>';
      bar.onclick=e=>{ const a=e.target.dataset&&e.target.dataset.a; if(!a) return; if(a==='open') C.clear(); else groups().forEach(g=>C.add(g.name)); keep(); apply(); };
      wrap.parentNode.insertBefore(bar,wrap);
    }
  }
  window.edptDailyCollapse=apply;
  const d0=window.twDailyRender;
  if(typeof d0==='function') window.twDailyRender=function(){ const r=d0.apply(this,arguments); try{ apply(); }catch(e){ console.warn(e); } return r; };
})();
