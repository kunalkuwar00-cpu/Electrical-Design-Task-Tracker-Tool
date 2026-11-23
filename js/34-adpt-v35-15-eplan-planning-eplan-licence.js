/* ===== ADPT v35.15 — EPLAN Planning (EPLAN licences + electrical drawing schedule) =====
   Data lives in db.eplan = {licenses:[...], rows:[...]} and is saved with the rest of the tracker (Supabase).
   Access: module 'EPLAN Planning' in Team & Access (AGM, Manager, Team Leader and Admin by default; Members none). */
(function(){
  'use strict';
  const MOD='EPLAN Planning';
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const T=()=>iso(new Date());
  const D=s=>new Date(s+'T12:00:00');
  const addD=(s,n)=>{ const x=D(s); x.setDate(x.getDate()+n); return iso(x); };
  const isISO=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
  const fd=v=>{ if(!v) return ''; const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}/${m[2]}/${m[1]}`:String(v); };
  const monday=s=>{ const x=D(s), g=(x.getDay()+6)%7; x.setDate(x.getDate()-g); return iso(x); };
  const can=a=>{ try{ return typeof window.edptCan==='function'?!!window.edptCan(MOD,a):!!(window.twAdmin&&window.twAdmin()); }catch(e){ return false; } };
  const me=()=>{ try{ const u=twU(); return u?(u.owner||u.name||''):''; }catch(e){ return ''; } };
  const STATUS=['','Done','WIP','Pending','Not done','NA'];
  /* stage fields: date + status (keeps the sheet's mix of dates and DONE / WIP / NA) */
  const STAGES=[
    ['design','Project design',false],['planned','Planned date (Project Schedule)',true],
    ['pStart','Panel drawing start',true],['pEnd','Panel drawing end',true],
    ['fStart','Field drawing start',true],['fEnd','Field drawing end',true],
    ['release','Release to panel assembly',true],['autobom','AutoBOM',false],
    ['asbP','As-built (panel assembly)',true],['asbS','As-built (after site handover)',true]
  ];
  const DEF_LIC=[{no:1,type:'Network-1'},{no:2,type:'Network-2'},{no:3,type:'Network-3'},{no:4,type:'Pro Panel - Laptop'},{no:5,type:'Perpetual'}];
  const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
  function store(){
    db.eplan=db.eplan||{};
    const S=db.eplan;
    if(!Array.isArray(S.licenses)) S.licenses=DEF_LIC.map(x=>({id:uid(),no:x.no,type:x.type,serial:'',device:'',usedBy:'',holdFrom:'',busyTill:'',notes:''}));
    if(!Array.isArray(S.rows)) S.rows=[];
    return S;
  }
  const UI={q:'',seg:'',lic:'',show:'active',w0:null,open:{lic:true,tl:true,list:true}};

  /* ---------- styles ---------- */
  if(!document.getElementById('epCss')){ const st=document.createElement('style'); st.id='epCss'; st.textContent=`
  #eplan .ep-card{border:1px solid var(--sb-line,#e4e4e7);border-radius:12px;padding:14px 16px;margin:0 0 14px;background:var(--sb-panel,#fff)}
  #eplan .ep-h{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 8px}
  #eplan .ep-h h3{margin:0;font-size:15px;cursor:pointer;user-select:none} #eplan .ep-h h3 .car{display:inline-block;width:14px;transition:transform .15s} #eplan .ep-h h3 .car.cl{transform:rotate(-90deg)}
  #eplan .ep-tiles{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px}
  #eplan .ep-tile{border:1px solid var(--sb-line,#e4e4e7);border-radius:10px;padding:9px 14px;min-width:130px;background:var(--sb-panel,#fff)}
  #eplan .ep-tile span{display:block;font:11px ui-monospace,Consolas,monospace;letter-spacing:.07em;text-transform:uppercase;color:var(--sb-mut,#71717a)} #eplan .ep-tile b{font-size:22px;font-weight:600}
  #eplan table.ep-t{width:100%;border-collapse:collapse;font-size:13px} #eplan .ep-t th,#eplan .ep-t td{padding:6px 8px;border-bottom:1px solid var(--sb-line,#e4e4e7);text-align:left;vertical-align:top}
  #eplan .ep-t th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--sb-mut,#71717a);font-weight:600;white-space:nowrap;position:sticky;top:0;background:var(--sb-panel,#fff);z-index:1}
  #eplan .ep-t tr.ep-r:hover td{background:var(--sb-hover,#f4f4f5)} #eplan .ep-t td.n{text-align:right}
  #eplan .ep-st{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:9px;white-space:nowrap}
  #eplan .s-done{background:#1f9d6122;color:#137a49} #eplan .s-wip{background:#f59e0b26;color:#b45309} #eplan .s-pending,#eplan .s-not{background:#e5484d1f;color:#c0262d} #eplan .s-na{background:#71717a1f;color:#71717a} #eplan .s-other{background:#3b82f61f;color:#2563eb}
  #eplan .ep-d{white-space:nowrap} #eplan .w-last{color:#c0262d;font-weight:600} #eplan .w-cur{color:#b45309;font-weight:600} #eplan .w-next{color:#2563eb;font-weight:600}
  #eplan .ep-lg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--sb-mut,#71717a);margin:2px 0 8px} #eplan .ep-lg i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:5px}
  #eplan .ep-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px} #eplan .ep-bar input,#eplan .ep-bar select{width:auto;min-width:120px}
  #eplan .ep-tl{overflow:auto;border:1px solid var(--sb-line,#e4e4e7);border-radius:8px}
  #eplan .ep-tl table{border-collapse:collapse;font-size:11px} #eplan .ep-tl th,#eplan .ep-tl td{border-right:1px solid var(--sb-line,#e4e4e7);border-bottom:1px solid var(--sb-line,#e4e4e7);padding:0;height:30px;min-width:22px;width:22px;text-align:center}
  #eplan .ep-tl th{height:22px;font-weight:500;color:var(--sb-mut,#71717a);background:var(--sb-panel,#fff)} #eplan .ep-tl th.wk{font-weight:600;color:var(--sb-fg,#18181b)}
  #eplan .ep-tl td.lab,#eplan .ep-tl th.lab{position:sticky;left:0;z-index:2;background:var(--sb-panel,#fff);min-width:170px;width:170px;text-align:left;padding:0 8px;white-space:nowrap}
  #eplan .ep-tl .we{background:color-mix(in srgb,var(--sb-line,#e4e4e7) 45%,transparent)} #eplan .ep-tl .td{box-shadow:inset 2px 0 0 #e5484d}
  #eplan .ep-tl .cw{background:color-mix(in srgb,#f59e0b 10%,transparent)}
  #eplan .ep-tl td.bk{cursor:pointer;color:#fff;font-weight:600;overflow:hidden;white-space:nowrap;font-size:10px}
  #eplan .ep-tl td.bk.k-panel{background:#2563eb} #eplan .ep-tl td.bk.k-field{background:#7c3aed} #eplan .ep-tl td.bk.k-hold{background:repeating-linear-gradient(45deg,#71717a,#71717a 4px,#a1a1aa 4px,#a1a1aa 8px)} #eplan .ep-tl td.bk.done{opacity:.45}
  #eplan .ep-tl td.bk.clash{background:#e5484d!important;opacity:1}
  #eplan .ep-warn{color:#c0262d;font-weight:600}
  .ep-dlg .ep-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px} @media(max-width:700px){.ep-dlg .ep-grid{grid-template-columns:1fr}}
  .ep-dlg .ep-sg{display:grid;grid-template-columns:1fr 1fr;gap:10px} @media(max-width:700px){.ep-dlg .ep-sg{grid-template-columns:1fr}}
  .ep-dlg .ep-pair{display:flex;gap:6px} .ep-dlg .ep-pair input{flex:1;min-width:0} .ep-dlg .ep-pair select{width:110px}
  .ep-dlg .ep-av{display:flex;gap:6px;flex-wrap:wrap} .ep-dlg .ep-av span{font-size:12px;padding:3px 9px;border-radius:12px;border:1px solid var(--tw-line,#e4e4e7);cursor:pointer}
  .ep-dlg .ep-av .free{color:#137a49;border-color:#1f9d6166;background:#1f9d6112} .ep-dlg .ep-av .busy{color:#c0262d;border-color:#e5484d55;background:#e5484d10} .ep-dlg .ep-av .sel{outline:2px solid var(--tw-brand,#1f9d61)}
  .ep-dlg h4{margin:6px 0 0;font-size:13px}
  `; document.head.appendChild(st); }

  /* ---------- screen + menu ---------- */
  function ensureSection(){
    if(document.getElementById('eplan')) return;
    const anchor=document.getElementById('daily'); const sec=document.createElement('section'); sec.id='eplan'; sec.className='view hidden'; sec.innerHTML='<div class="panel" id="epRoot"></div>';
    (anchor&&anchor.parentNode?anchor.parentNode:document.body).appendChild(sec);
  }
  ensureSection();
  try{
    if(typeof SBI==='object') SBI.eplan='<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M7 9l3 3-3 3M12 15h5"/>';
    if(typeof SB_ICON==='object') SB_ICON.eplan='eplan';
    if(typeof SB_KEYS==='object') SB_KEYS.eplan='n';
    if(Array.isArray(SB_GROUPS)&&!SB_GROUPS.flat().includes('eplan')){ const g=SB_GROUPS.find(x=>x.includes('capacity'))||SB_GROUPS[1]; const i=g.indexOf('capacity'); g.splice(i>=0?i+1:g.length,0,'eplan'); }
  }catch(e){}
  const nav0=window.twNav;
  window.twNav=function(){ const n=(typeof nav0==='function'?nav0.apply(this,arguments):[]).filter(x=>x[0]!=='eplan'); if(can('View')){ let i=n.findIndex(x=>x[0]==='capacity'); n.splice(i>=0?i+1:n.length,0,['eplan','EPLAN Planning']); } return n; };
  const sw0=window.switchTab;
  window.switchTab=function(name){ if(name==='eplan'&&!can('View')){ return sw0.call(this,'dashboard'); } const r=sw0.apply(this,arguments); if(name==='eplan') render(); return r; };
  const ref0=window.twRefresh;
  if(typeof ref0==='function') window.twRefresh=function(){ const r=ref0.apply(this,arguments); try{ if(TW.tab==='eplan') render(); }catch(e){} return r; };

  /* ---------- helpers ---------- */
  const stCls=s=>{ const k=String(s||'').toLowerCase(); return k==='done'||k==='yes'?'s-done':k==='wip'?'s-wip':k==='pending'?'s-pending':k==='not done'?'s-not':k==='na'?'s-na':'s-other'; };
  const wkCls=d=>{ if(!isISO(d)) return ''; const m=monday(T()), w=monday(d); return w===addD(m,-7)?'w-last':w===m?'w-cur':w===addD(m,7)?'w-next':''; };
  function cell(r,k){ const d=r[k]||'', s=r[k+'S']||''; if(!d&&!s) return '<span class="muted">—</span>';
    return `${s?`<span class="ep-st ${stCls(s)}">${E(s)}</span>`:''}${d?`${s?'<br>':''}<span class="ep-d ${s==='Done'?'':wkCls(d)}">${E(fd(d))}</span>`:''}`; }
  const codeOf=r=>{ const m=String(r.code||'').toUpperCase().match(/[A-Z]{1,2}\d{3,5}/); return m?m[0]:''; };
  function projOf(r){ const c=codeOf(r); if(!c) return null; return (db.projects||[]).find(p=>String(p.code||'').toUpperCase().trim()===c)||null; }
  /* planned drawing date from the Project Schedule: latest target of a sub milestone / milestone named "drawing" */
  function schedDate(r){ const p=projOf(r); if(!p) return ''; let best='';
    try{ const items=typeof projectLeafItems==='function'?projectLeafItems(p):[]; items.forEach(x=>{ const nm=(x.item&&x.item.name||'')+' '+(x.t&&x.t.name||''); if(/draw|drg|drw/i.test(nm)&&x.target&&x.target>best) best=x.target; }); }catch(e){}
    return best; }
  const plannedOf=r=>r.planned||schedDate(r);
  function bookings(){
    const S=store(), out=[];
    S.rows.forEach(r=>{ const lic=Number(r.lic)||0; if(!lic) return;
      [['panel','pStart','pEnd'],['field','fStart','fEnd']].forEach(([kind,a,b])=>{ const s=isISO(r[a])?r[a]:(isISO(r[b])?r[b]:''), e=isISO(r[b])?r[b]:s; if(!s) return;
        out.push({lic,kind,s:s<=e?s:e,e:s<=e?e:s,row:r,done:(r[b+'S']||'')==='Done',label:(codeOf(r)||r.code||'')+' · '+(r.resource||'')}); }); });
    S.licenses.forEach(l=>{ if(isISO(l.busyTill)){ const s=isISO(l.holdFrom)?l.holdFrom:T(); out.push({lic:Number(l.no),kind:'hold',s:s<=l.busyTill?s:l.busyTill,e:l.busyTill,lic0:l,label:'Hold · '+(l.usedBy||'')}); } });
    return out;
  }
  const ov=(a,b)=>a.s<=b.e&&b.s<=a.e;
  function clashes(B){ const set=new Set(); for(let i=0;i<B.length;i++) for(let j=i+1;j<B.length;j++){ const a=B[i], b=B[j]; if(a.lic===b.lic&&ov(a,b)&&a.row!==b.row&&!(a.done&&b.done)){ set.add(a); set.add(b); } } return set; }
  function licState(no,B){ const t=T(), mine=B.filter(b=>b.lic===no&&!b.done);
    let d=t, using=[]; for(let guard=0;guard<400;guard++){ const cov=mine.filter(b=>b.s<=d&&b.e>=d); if(!cov.length) break; if(d===t) using=cov; d=addD(cov.reduce((m,b)=>b.e>m?b.e:m,d),1); }
    const next=mine.filter(b=>b.s>d).sort((a,b)=>a.s<b.s?-1:1)[0]||null;
    return {busy:d!==t, till:d!==t?addD(d,-1):'', freeFrom:d, using, next}; }

  /* ---------- render ---------- */
  function render(){
    const root=document.getElementById('epRoot'); if(!root||!twU()) return;
    if(!can('View')){ root.innerHTML='<h2>EPLAN Planning</h2><p class="muted">You do not have access to EPLAN Planning.</p>'; return; }
    const S=store(), B=bookings(), CL=clashes(B), t=T();
    const st=S.licenses.map(l=>({l,s:licState(Number(l.no),B)}));
    const inUse=st.filter(x=>x.s.busy).length, rowsCl=new Set([...CL].map(b=>b.row).filter(Boolean));
    const soon=S.rows.filter(r=>['pStart','fStart'].some(k=>isISO(r[k])&&r[k]>=t&&r[k]<=addD(t,14)&&r[k+'S']!=='Done')).length;
    const noLic=S.rows.filter(r=>!Number(r.lic)&&(isISO(r.pStart)||isISO(r.fStart))&&!isDone(r)).length;
    const tile=(l,v,c,tt)=>`<div class="ep-tile" ${tt?`title="${E(tt)}"`:''}><span>${l}</span><b ${c?`style="color:${c}"`:''}>${v}</b></div>`;
    const car=k=>`<span class="car ${UI.open[k]?'':'cl'}">▾</span>`;
    root.innerHTML=`<div class="toprow"><div><h2>EPLAN Planning</h2><p class="muted" style="margin:0">EPLAN licences and the electrical drawing schedule. A licence is booked from the drawing start date to the end date of each panel or field drawing.</p></div>
      <div class="actions">${can('Add')?'<button class="primary" onclick="EP.edit()">+ Add drawing</button>':''}${can('Add')?'<button onclick="EP.importX()">Import Excel</button>':''}<button onclick="EP.exportX()">Export Excel</button></div></div>
      <div class="ep-tiles" style="margin-top:12px">${tile('Licences',S.licenses.length)}${tile('In use today',inUse,inUse?'#2563eb':'')}${tile('Free today',S.licenses.length-inUse,'#1f9d61')}${tile('Clashes',rowsCl.size,rowsCl.size?'#e5484d':'','Drawings booked on the same licence on the same days')}${tile('Starting in 14 days',soon)}${tile('No licence given',noLic,noLic?'#d97706':'','Drawings with dates but no licence number')}</div>
      <div class="ep-card"><div class="ep-h"><h3 onclick="EP.tog('lic')">${car('lic')} Licences</h3>${can('Add')?'<button class="primary small" onclick="EP.editLic(\'new\')">+ Add licence</button>':''}</div>${UI.open.lic?licTable(st):''}</div>
      <div class="ep-card"><div class="ep-h"><h3 onclick="EP.tog('tl')">${car('tl')} Licence timeline</h3>${UI.open.tl?tlNav():''}</div>${UI.open.tl?timeline(B,CL):''}</div>
      <div class="ep-card"><div class="ep-h"><h3 onclick="EP.tog('list')">${car('list')} Drawing schedule</h3></div>${UI.open.list?listView(rowsCl):''}</div>`;
  }
  function licTable(st){
    const ed=can('Edit');
    return `<div class="tablewrap"><table class="ep-t"><thead><tr><th>No.</th><th>Type</th><th>Licence serial no.</th><th>Laptop / desktop</th><th>Now</th><th>Busy till</th><th>Free from</th><th>Next booking</th><th>Notes</th>${ed?'<th></th>':''}</tr></thead><tbody>
      ${st.map(({l,s})=>{ const now=s.using.length?s.using.map(b=>`<span class="ep-st ${b.kind==='hold'?'s-na':'s-other'}">${E(b.label)}</span>`).join(' '):'<span class="ep-st s-done">Free</span>';
        return `<tr class="ep-r"><td><b>${E(l.no)}</b></td><td>${E(l.type)}</td><td>${E(l.serial||'—')}</td><td>${E(l.device||'—')}</td><td>${now}</td><td class="ep-d">${s.till?E(fd(s.till)):'—'}</td><td class="ep-d"><b>${s.busy?E(fd(s.freeFrom)):'Now'}</b></td>
          <td>${s.next?`${E(fd(s.next.s))} · ${E(s.next.label)}`:'—'}</td><td style="max-width:220px">${E(l.notes||'')}${l.usedBy&&l.busyTill?`<div class="muted" style="font-size:12px">Hold for ${E(l.usedBy)} till ${E(fd(l.busyTill))}</div>`:''}</td>${ed||can('Delete')?`<td style="white-space:nowrap">${ed?`<button class="small" onclick="EP.editLic('${E(l.id)}')">Edit</button>`:''}${can('Delete')?` <button class="small danger" onclick="EP.delLic('${E(l.id)}')">Delete</button>`:''}</td>`:''}</tr>`; }).join('')}
      </tbody></table></div>`;
  }
  function tlNav(){ return `<div class="ep-bar" style="margin:0"><button class="small" onclick="EP.wk(-4)">‹ 4 weeks</button><button class="small" onclick="EP.wk(0)">This week</button><button class="small" onclick="EP.wk(4)">4 weeks ›</button></div>`; }
  function timeline(B,CL){
    const t=T(), w0=UI.w0||addD(monday(t),-7), days=[]; for(let i=0;i<56;i++) days.push(addD(w0,i));
    const cw=monday(t), S=store();
    const wkLab=w=>w===addD(cw,-7)?'Last week':w===cw?'Current week':w===addD(cw,7)?'Next week':'Week of '+fd(w).slice(0,5);
    let h=`<div class="ep-lg"><span><i style="background:#2563eb"></i>Panel drawing</span><span><i style="background:#7c3aed"></i>Field drawing</span><span><i style="background:repeating-linear-gradient(45deg,#71717a,#71717a 3px,#a1a1aa 3px,#a1a1aa 6px)"></i>Hold (licence edit)</span><span><i style="background:#e5484d"></i>Clash — same licence, same day</span><span><i style="background:#2563eb;opacity:.45"></i>Finished</span><span>Red line = today · click a bar to open the drawing</span></div>`;
    h+='<div class="ep-tl"><table><thead><tr><th class="lab"></th>';
    for(let i=0;i<56;i+=7) h+=`<th class="wk ${days[i]===cw?'cw':''}" colspan="7">${wkLab(days[i])}</th>`;
    h+='</tr><tr><th class="lab">Licence</th>'+days.map(d=>{ const g=D(d).getDay(); return `<th class="${g===0||g===6?'we':''} ${d===t?'td':''} ${monday(d)===cw?'cw':''}">${D(d).getDate()}</th>`; }).join('')+'</tr></thead><tbody>';
    S.licenses.forEach(l=>{ const no=Number(l.no), mine=B.filter(b=>b.lic===no);
      /* lanes so overlapping bookings stay visible */
      const lanes=[]; mine.sort((a,b)=>a.s<b.s?-1:1).forEach(b=>{ let ln=lanes.find(L=>L.every(x=>!ov(x,b))); if(!ln){ ln=[]; lanes.push(ln); } ln.push(b); });
      if(!lanes.length) lanes.push([]);
      lanes.forEach((ln,li)=>{
        h+=`<tr>${li===0?`<td class="lab" rowspan="${lanes.length}"><b>${E(no)}</b> · ${E(l.type)}</td>`:''}`;
        for(let i=0;i<56;i++){ const d=days[i], b=ln.find(x=>x.s<=d&&x.e>=d), g=D(d).getDay(), base=`${g===0||g===6?'we':''} ${d===t?'td':''}`;
          if(!b){ h+=`<td class="${base}"></td>`; continue; }
          let span=1; while(i+span<56&&b.e>=days[i+span]) span++;
          const tip=`${b.label} · ${b.kind==='hold'?'hold':b.kind+' drawing'} ${fd(b.s)} → ${fd(b.e)}${CL.has(b)?' · CLASH':''}`;
          h+=`<td class="bk k-${b.kind} ${b.done?'done':''} ${CL.has(b)?'clash':''} ${d===t?'td':''}" colspan="${span}" title="${E(tip)}" onclick="${b.row?`EP.edit('${E(b.row.id)}')`:`EP.editLic('${E(l.id)}')`}">${span>=3?E(b.label):''}</td>`;
          i+=span-1; }
        h+='</tr>'; });
    });
    return h+'</tbody></table></div>';
  }
  function isDone(r){ const fin=k=>['Done','NA'].includes(r[k+'S']||''); const hasP=r.pStart||r.pEnd||r.pStartS||r.pEndS, hasF=r.fStart||r.fEnd||r.fStartS||r.fEndS;
    if(!hasP&&!hasF) return fin('design'); return (!hasP||fin('pEnd'))&&(!hasF||fin('fEnd')); }
  function listView(rowsCl){
    const S=store(), segs=[...new Set(S.rows.map(r=>String(r.segment||'').trim()).filter(Boolean))].sort(), q=UI.q.toLowerCase();
    let L=S.rows.filter(r=>(!UI.seg||String(r.segment||'').trim()===UI.seg)&&(!UI.lic||(UI.lic==='0'?!Number(r.lic):String(Number(r.lic))===UI.lic))
      &&(UI.show==='all'||(UI.show==='active'?!isDone(r):UI.show==='done'?isDone(r):rowsCl.has(r)))
      &&(!q||[r.code,r.customer,r.resource,r.segment,r.panels,r.remarks].join(' ').toLowerCase().includes(q)));
    const ed=can('Edit'), del=can('Delete');
    const opt=(v,l,cur)=>`<option value="${E(v)}" ${String(cur)===String(v)?'selected':''}>${E(l)}</option>`;
    const bar=`<div class="ep-bar"><input placeholder="Search code, customer, resource…" value="${E(UI.q)}" oninput="EP.f('q',this.value)" style="min-width:240px">
      <select onchange="EP.f('seg',this.value)">${opt('','All segments',UI.seg)}${segs.map(s=>opt(s,s,UI.seg)).join('')}</select>
      <select onchange="EP.f('lic',this.value)">${opt('','All licences',UI.lic)}${store().licenses.map(l=>opt(String(l.no),'Licence '+l.no+' · '+l.type,UI.lic)).join('')}${opt('0','No licence',UI.lic)}</select>
      <select onchange="EP.f('show',this.value)">${opt('active','Open drawings',UI.show)}${opt('done','Finished',UI.show)}${opt('clash','Clashes only',UI.show)}${opt('all','All',UI.show)}</select>
      <span class="muted" style="font-size:12px">${L.length} of ${S.rows.length}</span></div>
      <div class="ep-lg"><span><b class="w-last">dd/mm</b> last week</span><span><b class="w-cur">dd/mm</b> current week</span><span><b class="w-next">dd/mm</b> next week</span><span><i style="background:#1f9d6155"></i>Done</span><span><i style="background:#f59e0b55"></i>WIP</span><span><i style="background:#e5484d44"></i>Pending / Not done</span></div>`;
    const rows=L.map((r,i)=>{ const pl=plannedOf(r), auto=!r.planned&&pl, cl=rowsCl.has(r);
      return `<tr class="ep-r" ${ed?`style="cursor:pointer" onclick="if(!event.target.closest('button'))EP.edit('${E(r.id)}')"`:''}><td>${i+1}</td><td>${E(r.segment||'')}</td><td style="min-width:150px;max-width:240px"><b>${E(r.code||'')}</b></td><td>${E(r.customer||'')}</td><td>${E(r.panels||'')}</td><td>${E(r.resource||'')}</td>
        <td class="n">${Number(r.lic)?`<b>${E(r.lic)}</b>`:'<span class="muted">—</span>'}${cl?' <span class="ep-warn" title="Same licence booked by another drawing on the same days">⚠</span>':''}</td>
        <td>${cell(r,'design')}</td><td>${auto?`<span class="ep-d muted" title="From Project Schedule (drawing sub milestone target)">${E(fd(pl))}*</span>`:cell(r,'planned')}</td>
        <td>${cell(r,'pStart')}</td><td>${cell(r,'pEnd')}</td><td>${cell(r,'fStart')}</td><td>${cell(r,'fEnd')}</td><td>${cell(r,'release')}</td><td>${cell(r,'autobom')}</td><td>${cell(r,'asbP')}</td><td>${cell(r,'asbS')}</td>
        <td style="max-width:220px;font-size:12px">${E(r.remarks||'')}</td>${del?`<td><button class="small danger" onclick="EP.del('${E(r.id)}')">Delete</button></td>`:''}</tr>`; }).join('');
    return bar+`<div class="tablewrap" style="max-height:640px;overflow:auto"><table class="ep-t"><thead><tr><th>Sr.</th><th>Segment</th><th>Project code</th><th>Customer</th><th>No. of panels</th><th>Resource</th><th>Licence</th><th>Project design</th><th>Planned (Project Schedule)</th><th>Panel drw start</th><th>Panel drw end</th><th>Field drw start</th><th>Field drw end</th><th>Release to panel assembly</th><th>AutoBOM</th><th>As-built (panel assembly)</th><th>As-built (after site handover)</th><th>Remarks</th>${del?'<th></th>':''}</tr></thead>
      <tbody>${rows||`<tr><td colspan="19" class="muted">No drawings${S.rows.length?' match the filters':' yet. Use “+ Add drawing” or “Import Excel”'}.</td></tr>`}</tbody></table></div>
      <p class="muted" style="font-size:12px;margin:6px 0 0">* Planned date taken from the project's Project Schedule (latest target of a drawing sub milestone) when no date is entered here.</p>`;
  }

  /* ---------- actions ---------- */
  const EP=window.EP={};
  EP.tog=k=>{ UI.open[k]=!UI.open[k]; render(); };
  EP.f=(k,v)=>{ UI[k]=v; render(); if(k==='q'){ const i=document.querySelector('#eplan .ep-bar input'); if(i){ i.focus(); i.setSelectionRange(v.length,v.length); } } };
  EP.wk=n=>{ UI.w0=n===0?null:addD(UI.w0||addD(monday(T()),-7),n*7); render(); };
  function save1(){ try{ save(false); }catch(e){ console.warn(e); } render(); }
  EP.edit=function(id){
    const S=store(), r0=id?S.rows.find(x=>x.id===id):null;
    if(r0&&!can('Edit')) return; if(!r0&&!can('Add')) return alert('You do not have permission to add drawings.');
    const r=Object.assign({},r0||{});
    const names=[...new Set(Object.values(db.users||{}).map(u=>u&&(u.owner||u.name)).filter(Boolean))].sort();
    const codes=(db.projects||[]).filter(p=>String(p.code||'').trim()).map(p=>`<option value="${E(p.code)}">${E(p.name||'')}</option>`).join('');
    const stOpts=v=>{ const l=STATUS.includes(v||'')?STATUS:[...STATUS,v]; return l.map(x=>`<option value="${E(x)}" ${x===(v||'')?'selected':''}>${x?E(x):'— status —'}</option>`).join(''); };
    const fld=([k,l,hasDate])=>`<div class="tw-f"><label>${l}</label><div class="ep-pair">${hasDate?`<input type="date" name="${k}" value="${E(isISO(r[k])?r[k]:'')}">`:''}<select name="${k}S">${stOpts(r[k+'S'])}</select></div></div>`;
    const sd=schedDate(r);
    const body=`<div class="ep-grid">
      <div class="tw-f"><label>Project code *</label><input name="code" list="epCodes" value="${E(r.code||'')}" placeholder="e.g. A1625 or A1604-field"><datalist id="epCodes">${codes}</datalist></div>
      <div class="tw-f"><label>Customer</label><input name="customer" value="${E(r.customer||'')}"></div>
      <div class="tw-f"><label>Segment</label><input name="segment" list="epSegs" value="${E(r.segment||'')}"><datalist id="epSegs">${['ASRS','SLITROLL','CARTON','ECOMMERCE','PALLET','ROBOT','AMR','Other'].map(s=>`<option value="${s}">`).join('')}</datalist></div>
      <div class="tw-f"><label>No. of panels</label><input name="panels" value="${E(r.panels||'')}" placeholder="e.g. 5 CP + 2 VRC"></div>
      <div class="tw-f"><label>Resource</label><input name="resource" list="epNames" value="${E(r.resource||'')}" placeholder="One or more names"><datalist id="epNames">${names.map(n=>`<option value="${E(n)}">`).join('')}</datalist></div>
      <div class="tw-f"><label>Licence no.</label><select name="lic"><option value="">— none —</option>${S.licenses.map(l=>`<option value="${E(l.no)}" ${String(r.lic||'')===String(l.no)?'selected':''}>${E(l.no)} · ${E(l.type)}</option>`).join('')}</select></div></div>
      <h4>Licence availability for the dates below</h4><div class="ep-av" id="epAv"></div>
      <h4>Stages</h4><div class="ep-sg">${STAGES.map(fld).join('')}</div>
      ${sd?`<p class="muted" style="font-size:12px;margin:0">Project Schedule drawing target for this project: <b>${E(fd(sd))}</b> (used when Planned date is empty).</p>`:''}
      <div class="tw-f"><label>Remarks</label><textarea name="remarks" rows="2">${E(r.remarks||'')}</textarea></div>`;
    const m=twModal(r0?'Edit drawing':'Add drawing',body,mm=>{
      const g=n=>mm.querySelector(`[name="${n}"]`); const x={code:g('code').value.trim(),customer:g('customer').value.trim(),segment:g('segment').value.trim(),panels:g('panels').value.trim(),resource:g('resource').value.trim(),lic:g('lic').value,remarks:g('remarks').value.trim()};
      if(!x.code) return 'Project code is required.';
      STAGES.forEach(([k,,hd])=>{ if(hd) x[k]=g(k).value||''; else x[k]=''; x[k+'S']=g(k+'S').value||''; });
      for(const [a,b,l] of [['pStart','pEnd','Panel drawing'],['fStart','fEnd','Field drawing']]) if(x[a]&&x[b]&&x[a]>x[b]) return `${l}: end date must be on or after the start date.`;
      if(r0){ Object.assign(r0,x,{updatedBy:me(),updatedAt:new Date().toISOString()}); } else S.rows.push(Object.assign({id:uid(),createdBy:me(),createdAt:new Date().toISOString()},x));
      save1();
    },r0?'Save':'Add',true);
    m.querySelector('.tw-dlg')?.classList.add('ep-dlg');
    const av=()=>{ const g=n=>m.querySelector(`[name="${n}"]`); const segs=[[g('pStart').value,g('pEnd').value],[g('fStart').value,g('fEnd').value]].map(([a,b])=>a||b?{s:(a||b)<=(b||a)?(a||b):(b||a),e:(a||b)<=(b||a)?(b||a):(a||b)}:null).filter(Boolean);
      const box=m.querySelector('#epAv'); if(!box) return;
      if(!segs.length){ box.innerHTML='<span class="muted" style="border:0;cursor:default">Enter panel or field drawing dates to see which licences are free.</span>'; return; }
      const B=bookings().filter(b=>!r0||b.row!==r0), cur=g('lic').value;
      box.innerHTML=store().licenses.map(l=>{ const hit=B.filter(b=>b.lic===Number(l.no)&&!b.done&&segs.some(s=>ov(s,b)));
        return `<span class="${hit.length?'busy':'free'} ${String(l.no)===cur?'sel':''}" data-no="${E(l.no)}" title="${E(hit.map(b=>b.label+' '+fd(b.s)+'→'+fd(b.e)).join('\n')||'Free for these dates')}">${E(l.no)} · ${E(l.type)} — ${hit.length?'busy: '+E([...new Set(hit.map(b=>b.label))].join(', ')):'free'}</span>`; }).join('');
      box.querySelectorAll('span[data-no]').forEach(s=>s.onclick=()=>{ g('lic').value=s.dataset.no; av(); }); };
    m.querySelectorAll('input[type=date],select[name=lic]').forEach(i=>i.addEventListener('change',av)); av();
  };
  EP.del=function(id){ if(!can('Delete')) return; const S=store(), r=S.rows.find(x=>x.id===id); if(!r) return; if(!confirm(`Delete the drawing row ${r.code}${r.resource?' ('+r.resource+')':''}?`)) return; S.rows=S.rows.filter(x=>x!==r); save1(); };
  EP.editLic=function(id){
    const S=store(), isNew=id==='new';
    if(isNew?!can('Add'):!can('Edit')) return alert('You do not have permission to '+(isNew?'add':'change')+' licences.');
    const l=isNew?{id:uid(),no:Math.max(0,...S.licenses.map(x=>Number(x.no)||0))+1,type:'',serial:'',device:'',usedBy:'',holdFrom:'',busyTill:'',notes:''}:S.licenses.find(x=>x.id===id); if(!l) return;
    const body=`<div class="tw-2"><div class="tw-f"><label>Licence no.</label><input name="no" type="number" min="1" value="${E(l.no)}"></div><div class="tw-f"><label>Type</label><input name="type" value="${E(l.type)}" placeholder="Network-1, Perpetual, Pro Panel…"></div>
      <div class="tw-f"><label>Licence EPLAN serial no.</label><input name="serial" value="${E(l.serial||'')}"></div><div class="tw-f"><label>Laptop / desktop serial no.</label><input name="device" value="${E(l.device||'')}"></div></div>
      <h4 style="margin:4px 0 0">Hold (work not in the drawing schedule — exports, training, modifications)</h4>
      <div class="tw-2"><div class="tw-f"><label>Used by</label><input name="usedBy" value="${E(l.usedBy||'')}" placeholder="Name / purpose"></div><div class="tw-f"><label>From</label><input type="date" name="holdFrom" value="${E(l.holdFrom||'')}"></div>
      <div class="tw-f"><label>Busy till</label><input type="date" name="busyTill" value="${E(l.busyTill||'')}"></div><div class="tw-f"><label>Notes</label><input name="notes" value="${E(l.notes||'')}"></div></div>
      <p class="muted" style="font-size:12px;margin:0">Leave “Busy till” empty to remove the hold.</p>`;
    const m=twModal(isNew?'Add licence':'Edit licence '+E(l.no),body,mm=>{ const g=n=>mm.querySelector(`[name="${n}"]`).value.trim(); const no=Number(g('no'));
      if(!no) return 'Licence no. is required.'; if(!g('type')) return 'Enter the licence type (e.g. Network-4, Perpetual).'; if(S.licenses.some(x=>x!==l&&Number(x.no)===no)) return 'Another licence already has this number.';
      if(g('holdFrom')&&g('busyTill')&&g('holdFrom')>g('busyTill')) return 'Hold: “Busy till” must be on or after “From”.';
      const old=Number(l.no); Object.assign(l,{no,type:g('type'),serial:g('serial'),device:g('device'),usedBy:g('usedBy'),holdFrom:g('busyTill')?g('holdFrom'):'',busyTill:g('busyTill'),notes:g('notes')});
      if(!isNew&&old!==no) S.rows.forEach(r=>{ if(Number(r.lic)===old) r.lic=String(no); });
      if(isNew) S.licenses.push(l); S.licenses.sort((a,b)=>Number(a.no)-Number(b.no));
      save1(); },isNew?'Add':'Save');
    m.querySelector('.tw-dlg')?.classList.add('ep-dlg');
  };

  EP.delLic=function(id){
    if(!can('Delete')) return alert('You do not have permission to delete licences.');
    const S=store(), l=S.licenses.find(x=>x.id===id); if(!l) return;
    const used=S.rows.filter(r=>Number(r.lic)===Number(l.no));
    if(!confirm(`Delete licence ${l.no} (${l.type||'no type'})?`+(used.length?`\n\n${used.length} drawing${used.length===1?' uses':'s use'} this licence; they will show “No licence” until you choose another one.`:''))) return;
    used.forEach(r=>{ r.lic=''; }); S.licenses=S.licenses.filter(x=>x!==l); save1();
  };

  /* ---------- Excel export (same columns as the planning sheet) ---------- */
  const xv=(r,k)=>{ const d=r[k]||'', s=r[k+'S']||''; return [s, d?fd(d):''].filter(Boolean).join(' '); };
  EP.exportX=function(){
    try{
      const S=store(), B=bookings(), st=S.licenses.map(l=>({l,s:licState(Number(l.no),B)}));
      const lic=[['EPLAN LICENCES — exported '+fd(T())],['No.','Type','Licence EPLAN serial no.','Laptop / desktop serial no.','In use now','Busy till','Free from','Hold — used by','Hold till','Notes'],
        ...st.map(({l,s})=>[l.no,l.type,l.serial||'',l.device||'',s.using.map(b=>b.label).join(', ')||'Free',s.till?fd(s.till):'',fd(s.freeFrom),l.usedBy||'',l.busyTill?fd(l.busyTill):'',l.notes||''])];
      const head=['SR.NO.','SEGMENT','PROJECT CODE','CUSTOMER','NO.OF PANEL','RESOURCE','LICENSE NO.','PROJECT DESIGN','Planned date as per Project schedule','PANEL DRW-START DATE','PANEL DRW-END DATE','FIELD DRW-START DATE','FIELD DRW-END DATE','RELEASE TO PANEL ASSEMBLY','Autobom status','Asbuilt Drawing (Panel Assembly)','Asbuilt Drawing (After site handover)','Remarks'];
      const rows=S.rows.map((r,i)=>[i+1,r.segment||'',r.code||'',r.customer||'',r.panels||'',r.resource||'',r.lic||'',xv(r,'design'),r.planned||r.plannedS?xv(r,'planned'):(schedDate(r)?fd(schedDate(r))+' (schedule)':''),xv(r,'pStart'),xv(r,'pEnd'),xv(r,'fStart'),xv(r,'fEnd'),xv(r,'release'),xv(r,'autobom'),xv(r,'asbP'),xv(r,'asbS'),r.remarks||'']);
      const blob=RP.workbook([{name:'Drawing schedule',head:2,widths:[7,12,22,20,18,18,9,12,16,14,14,14,14,16,12,16,18,30],rows:[['EPLAN LICENSE & ELECTRICAL DRAWING SCHEDULE — exported '+fd(T())],head,...rows]},{name:'Licences',head:2,widths:[6,18,22,26,30,12,12,18,12,26],rows:lic}]);
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='EPLAN_Planning_'+T()+'.xlsx'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
    }catch(e){ console.error(e); alert('Export failed: '+e.message); }
  };

  /* ---------- Excel import (the planning sheet: licence block at the top + drawing schedule) ---------- */
  async function readBook(buf){
    const u8=new Uint8Array(buf), dv=new DataView(buf); let e=u8.length-22;
    while(e>=0&&dv.getUint32(e,true)!==0x06054b50) e--; if(e<0) throw new Error('This is not an Excel (.xlsx) file.');
    const cnt=dv.getUint16(e+10,true); let p=dv.getUint32(e+16,true); const files={}, td=new TextDecoder();
    for(let i=0;i<cnt;i++){ const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), lho=dv.getUint32(p+42,true);
      files[td.decode(u8.subarray(p+46,p+46+nl))]={method,csize,lho}; p+=46+nl+xl+cl; }
    const get=async n=>{ const f=files[n]; if(!f) return null; const nl=dv.getUint16(f.lho+26,true), xl=dv.getUint16(f.lho+28,true), s=f.lho+30+nl+xl, data=u8.slice(s,s+f.csize);
      if(f.method===0) return td.decode(data); if(typeof DecompressionStream!=='function') throw new Error('This browser cannot read Excel files. Use Chrome or Edge.');
      return td.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); };
    const X=s=>new DOMParser().parseFromString(s,'application/xml'), tags=(d,t)=>[...d.getElementsByTagName(t)];
    const ss=[]; const sx=await get('xl/sharedStrings.xml'); if(sx) tags(X(sx),'si').forEach(si=>ss.push(tags(si,'t').map(t=>t.textContent).join('')));
    const wb=X(await get('xl/workbook.xml')), rels=tags(X(await get('xl/_rels/workbook.xml.rels')),'Relationship');
    const sheets=[];
    for(const sh of tags(wb,'sheet')){ const rid=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'), rel=rels.find(r=>r.getAttribute('Id')===rid); if(!rel) continue;
      const t=rel.getAttribute('Target'), path=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,''); const doc=X(await get(path)||'<x/>'), out=[];
      const ci=ref=>{ const m=String(ref).match(/^[A-Z]+/); let n=0; for(const ch of m?m[0]:'A') n=n*26+ch.charCodeAt(0)-64; return n-1; };
      tags(doc,'row').forEach(r=>{ const ri=Number(r.getAttribute('r'))-1, a=[]; tags(r,'c').forEach(c=>{ const ty=c.getAttribute('t'); let v='';
        if(ty==='s') v=ss[Number(tags(c,'v')[0]?.textContent)]??''; else if(ty==='inlineStr') v=tags(c,'t').map(x=>x.textContent).join(''); else { const vv=tags(c,'v')[0]; v=vv?vv.textContent:''; if(ty!=='str'&&ty!=='e'&&v!==''&&!isNaN(v)) v=Number(v); }
        a[ci(c.getAttribute('r'))]=v; }); out[ri]=a; });
      sheets.push({name:sh.getAttribute('name'),rows:[...out].map(r=>r||[])}); }
    return sheets;
  }
  const xDate=v=>{ if(typeof v==='number'&&v>20000&&v<80000){ const d=new Date(Math.round((v-25569)*864e5)); return d.toISOString().slice(0,10); }
    const s=String(v??'').trim(); let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`; m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); if(m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`; return ''; };
  const xStat=v=>{ const s=String(v??'').trim(); if(!s) return ''; const k=s.toLowerCase(); return k==='done'?'Done':k==='wip'?'WIP':k==='na'||k==='n/a'?'NA':k==='pending'?'Pending':k==='not done'?'Not done':k==='yes'?'Done':k==='not updated'?'':s; };
  function parseSheet(rows){
    const hi=rows.findIndex(r=>r.some(c=>/project\s*code/i.test(String(c||'')))); if(hi<0) return null;
    const H=rows[hi].map(c=>String(c||'').replace(/\s+/g,' ').trim().toLowerCase());
    const col=re=>H.findIndex(h=>re.test(h));
    const C={sr:col(/^sr/),seg:col(/segment/),code:col(/project code/),cust:col(/customer/),pan:col(/no\.? ?of panel/),res:col(/resource/),lic:col(/licen[sc]e no/),design:col(/project design/),planned:col(/planned date/),
      pStart:col(/panel drw-? ?start/),pEnd:col(/panel drw-? ?end/),fStart:col(/field drw-? ?start/),fEnd:col(/field drw-? ?end/),release:col(/release to panel/),autobom:col(/autobom/),asbP:col(/asbuilt.*panel/),asbS:col(/asbuilt.*(commis|site|handover)/)};
    const last=Math.max(...Object.values(C)); const out=[];
    for(let i=hi+1;i<rows.length;i++){ const r=rows[i]; const v=k=>C[k]>=0?r[C[k]]:'';
      const code=String(v('code')??'').trim(); if(!code){ if(/remark/i.test(String(r[1]||''))) break; continue; }
      const x={id:uid(),segment:String(v('seg')??'').trim(),code,customer:String(v('cust')??'').trim(),panels:String(v('pan')??'').trim(),resource:String(v('res')??'').trim(),lic:Number(v('lic'))?String(Number(v('lic'))):'',remarks:String(r[last+1]||r[last+2]||r[last+3]||'').trim(),createdBy:me(),createdAt:new Date().toISOString()};
      STAGES.forEach(([k,,hd])=>{ const raw=v(k), d=xDate(raw); x[k]=hd?d:''; x[k+'S']=d?'':xStat(raw); });
      out.push(x); }
    /* licence block above the schedule: rows with a licence type */
    const lic=[]; rows.slice(0,hi).forEach(r=>{ const ty=String(r[6]||'').trim(); const no=Number(r[7]||r[0]); if(!ty||!no||!/network|perpetual|pro ?panel|subscription|propanel/i.test(ty)) return;
      lic.push({no,type:ty,serial:String(r[5]||'').trim(),device:String(r[4]||'').trim(),usedBy:String(r[2]||'').trim(),busyTill:xDate(r[3])}); });
    return {rows:out,lic};
  }
  EP.importX=function(){
    if(!can('Add')) return alert('You do not have permission to import.');
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx';
    inp.onchange=async()=>{ const f=inp.files[0]; if(!f) return;
      let book; try{ book=await readBook(await f.arrayBuffer()); }catch(e){ return alert('Could not read the file: '+e.message); }
      const ok=book.map(s=>({s,p:parseSheet(s.rows)})).filter(x=>x.p&&x.p.rows.length);
      if(!ok.length) return alert('No drawing schedule found. The sheet needs a header row with “PROJECT CODE”.');
      const S=store();
      const body=`<div class="tw-f"><label>Sheet</label><select name="sh">${ok.map((x,i)=>`<option value="${i}" ${i===ok.length-1?'selected':''}>${E(x.s.name)} — ${x.p.rows.length} drawings</option>`).join('')}</select></div>
        <div class="tw-f"><label>How</label><select name="mode"><option value="replace">Replace the current drawing schedule (${S.rows.length} rows)</option><option value="add">Add to the current drawing schedule</option></select></div>
        <label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" name="lic" checked style="width:auto"> Also update licence type / serial numbers from the sheet</label>`;
      const m=twModal('Import EPLAN planning sheet',body,mm=>{ const x=ok[Number(mm.querySelector('[name=sh]').value)]; const mode=mm.querySelector('[name=mode]').value;
        if(mode==='replace'&&S.rows.length&&!confirm(`Replace all ${S.rows.length} drawing rows with ${x.p.rows.length} rows from sheet “${x.s.name}”?`)) return 'Import cancelled.';
        S.rows=mode==='replace'?x.p.rows:[...S.rows,...x.p.rows];
        if(mm.querySelector('[name=lic]').checked) x.p.lic.forEach(n=>{ const l=S.licenses.find(y=>Number(y.no)===n.no); const val={type:n.type,serial:n.serial||'',device:n.device||''};
          if(n.busyTill&&n.busyTill>=T()) Object.assign(val,{usedBy:n.usedBy,busyTill:n.busyTill,holdFrom:''});
          if(l) Object.assign(l,Object.fromEntries(Object.entries(val).filter(([k,v])=>v))); else S.licenses.push(Object.assign({id:uid(),no:n.no,usedBy:'',holdFrom:'',busyTill:'',notes:''},val)); });
        S.licenses.sort((a,b)=>a.no-b.no); save1(); },'Import');
      m.querySelector('.tw-dlg')?.classList.add('ep-dlg');
    };
    inp.click();
  };
  window.EP_render=render;
})();
