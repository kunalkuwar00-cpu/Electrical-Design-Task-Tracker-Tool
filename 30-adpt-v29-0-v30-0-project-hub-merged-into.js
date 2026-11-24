/* ===== ADPT v29.0/v30.0 — Project Hub (merged into the Project Dashboard in v30.0) =====
   One place per project: budget, timeline, unplanned tasks and the quality/cost registers
   (Change Notes, Site Issues, RCA & CAPA, Cost of Poor Quality, Cost Saving, Good Practices).
   Columns follow the Quality Command Centre exports, so old Excel files can be imported.
   Data lives in db.qms.{cn,si,rca,copq,cs,gp}; budget/actual on each project (p.budget, p.actualCost). */
(function(){
  'use strict';
  const E=s=>(typeof esc==='function'?esc(s):String(s??''));
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const T=()=>typeof twToday==='function'?twToday():iso(new Date());
  const fd=s=>s?(typeof fmtDate==='function'?fmtDate(s):s):'—';
  const N=v=>{ if(typeof v==='number') return isFinite(v)?v:0; const n=Number(String(v??'').replace(/[₹,\s]|Rs\.?/gi,'')); return isFinite(n)?n:0; };
  const inr=v=>'₹ '+Math.round(N(v)).toLocaleString('en-IN');
  const key=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const pad=n=>String(n).padStart(2,'0');
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /* ---------- registers ---------- */
  const F=(k,l,t,x)=>Object.assign({k,l,t:t||'text'},x||{});
  const SR=F('sr','Sr. No.','sr',{list:true,w:7}), SAVED=F('at','Saved At','saved',{w:20});
  const STAR=[F('S','S — Situation','area'),F('Tk','T — Task','area'),F('A','A — Action','area'),F('R','R — Result','area')];
  const REG={
    cn:{name:'Change Notes',one:'change note',numKey:'no',dateKey:'date',color:'#2563eb',
      open:r=>!r.status||r.status==='Raised', money:r=>N(r.cost),
      fields:[SR,F('proj','Project Code','proj',{list:true,req:true,w:12}),F('dept','Dept.','list',{o:['Project Engineering','Solution','Electrical Design','Automation','Mechanical','Other'],list:true,w:18}),
        F('no','Change Note Number','text',{list:true,req:true,w:18,auto:'cn'}),F('reason','Reason & Change in Brief','area',{list:true,req:true,w:50}),
        F('cost','Cost Effect (Rs)','num',{list:true,w:14}),F('preparedBy','Prepared By','person',{list:true,w:18}),F('approvedBy','CN Approved By','person',{list:true,w:18}),
        F('link','Hyperlink for Change Note','url',{w:40}),F('date','CN Date','date',{list:true,def:T,w:12}),F('status','Status','sel',{o:['Raised','Approved','Rejected','Implemented'],def:()=>'Approved',list:true,w:12}),SAVED]},
    si:{name:'Site Issues',one:'site issue',numKey:'no',dateKey:'date',color:'#e5484d',
      open:r=>r.status!=='Closed',
      fields:[SR,F('proj','Project Code','proj',{list:true,req:true,w:12}),F('no','Issue Number','text',{list:true,req:true,auto:'si',w:16}),F('date','Date Reported','date',{list:true,req:true,def:T,w:12}),
        F('reportedBy','Reported By','person',{list:true,w:18}),F('location','Location / Area','text',{w:20}),
        F('category','Category','sel',{o:['Design','Wiring / Installation','Material / Part','Commissioning','Safety','Customer change','Other'],list:true,w:16}),
        F('severity','Severity','sel',{o:['Low','Medium','High','Critical'],def:()=>'Medium',list:true,w:10}),
        F('desc','Issue Description','area',{list:true,req:true,w:50}),F('action','Action Taken','area',{w:40}),F('owner','Owner','person',{list:true,w:18}),
        F('target','Target Date','date',{list:true,w:12}),F('closed','Closed Date','date',{w:12}),F('status','Status','sel',{o:['Open','In Progress','Closed'],def:()=>'Open',list:true,w:12}),
        F('rcaNo','Linked RCA / CAPA #','text',{w:16}),F('link','Attachment Link','url',{w:40}),SAVED]},
    rca:{name:'RCA & CAPA',one:'RCA / CAPA',numKey:'no',dateKey:'dateOccurred',color:'#7c3aed',
      open:r=>r.lifecycle!=='Closed',
      fields:[SR,F('no','RCA / CAPA #','text',{list:true,req:true,auto:'rca',w:16,sec:'Basics'}),F('proj','Project Code','proj',{list:true,req:true,w:12}),
        F('dateOccurred','Date Problem Occurred','date',{list:true,req:true,def:T,w:12}),F('team','Team Member(s)','person',{list:true,w:24}),
        F('type','Type of Problem','sel',{o:['Quality','Delivery','Cost','Safety','Other'],list:true,w:12}),F('link','Attachment Link (photo / sketch / document URL)','url',{w:40}),
        F('lifecycle','Lifecycle Status','sel',{o:['Open','In Progress','Closed'],def:()=>'Open',list:true,w:12}),
        F('describe','Describe the problem (specific, measurable: deviation, area, station). Has it occurred before?','area',{list:true,req:true,w:50,sec:'1. Problem'}),
        F('containment','Does the customer need to be protected? Immediate containment action','area',{w:40}),
        F('gemba','Go to Gemba — collect data & questions. 6M Analysis','area',{w:40,sec:'2. Analysis (Gemba, 6M, Fishbone)',cols:2,nf:1}),F('sixm','6M / 5W1H analysis to localise the cause','area',{w:40,nf:1}),
        F('fbMan','Fishbone — Man (people, training, error)','area',{w:30,nf:1}),F('fbMachine','Fishbone — Machine (equipment, tooling)','area',{w:30,nf:1}),
        F('fbMethod','Fishbone — Method (process, procedure)','area',{w:30,nf:1}),F('fbMaterial','Fishbone — Material (parts, supplier)','area',{w:30,nf:1}),
        F('fbMeasure','Fishbone — Measurement (inspection, gauges)','area',{w:30,nf:1}),F('fbEnv','Fishbone — Environment (workplace, conditions)','area',{w:30,nf:1}),
        ...[1,2,3,4,5].flatMap(i=>[F('wm'+i,'Why Made? #'+i+(i===5?' (Root Cause)':''),'area',{w:30,nf:1,cols:i===1?2:undefined,sec:i===1?'3. 5-Why (Made / Missed)':undefined}),F('wx'+i,'Why Missed? #'+i+(i===5?' (Root Cause)':''),'area',{w:30,nf:1})]),
        F('rootCause','Identified Root Cause (summary)','area',{list:true,w:40,sec:'4. Root cause'}),
        ...[1,2,3,4].flatMap(i=>[F('ca'+i,'Corrective Action #'+i,'area',{w:36,nf:1,sec:i===1?'Corrective actions':undefined,cols:i===1?'2fr 1fr 1fr':undefined}),F('owner'+i,'Owner #'+i,'person',{w:18}),F('due'+i,'Due Date #'+i,'date',{w:12})]),
        F('effective','Are actions effective? Has the root cause been eliminated? How is Built-In Quality ensured?','area',{w:40,sec:'5. Effectiveness & standard work'}),
        F('stdExists','Does a standard exist / been updated?','sel',{o:['Yes','No'],w:10}),F('stdWork','How will actions become Standard Work? Communicated / Yokoten shared?','area',{w:40}),
        F('obs','Observations','area',{w:30}),
        F('approval','Approval Status','approval',{o:['Pending','Approved','Rejected'],def:()=>'Pending',list:true,w:12,sec:'6. Approval'}),F('approvedBy','Approved / Rejected By','ro',{w:24}),
        F('approvalDate','Approval Date','ro',{w:18}),F('approverComment','Approver Comment','area',{w:30,approver:true}),
        F('siNo','Linked Site Issue #','text',{w:16}),SAVED]},
    copq:{name:'Cost of Poor Quality',short:'COPQ',one:'COPQ entry',dateKey:'dateId',color:'#b45309',
      open:r=>!r.resolution, money:r=>calc.copqC(r),
      fields:[SR,F('proj','Project Code','proj',{list:true,req:true,w:12}),F('customer','Customer Name','text',{list:true,w:20,fromProj:'customer'}),
        F('supplier','Supplier Name','list',{o:['Automation','Project Engineering','Electrical Design','Mechanical','Vendor','Customer'],w:18}),
        F('desc','Issue Description','area',{list:true,req:true,w:50}),F('failure','Type of Failure','sel',{o:['Internal','External'],def:()=>'Internal',list:true,w:12}),
        F('dateId','Date Identified','date',{list:true,req:true,def:T,w:12}),F('month','Month Identified','calc',{w:12,fn:r=>{ const d=String(r.dateId||''); return /^\d{4}-\d{2}/.test(d)?MON[Number(d.slice(5,7))-1]+' '+d.slice(0,4):''; }}),
        F('resolution','Resolution Date','date',{w:12}),F('responsible','Person Responsible','person',{list:true,w:20}),
        F('func','Function Impacted','list',{o:['Electrical','Mechanical','Automation','Project Engineering','Site'],w:16}),
        ...[[1,'L4'],[2,'L3'],[3,'L2']].flatMap(([i,l])=>[F('s'+i+'p','Stage '+i+' — Person Impacted','text',{w:16,sec:i===1?'Hours and cost by stage':undefined}),F('s'+i+'h','Stage '+i+' — Person Hours Lost','num',{w:12}),F('s'+i+'c','Stage '+i+' ('+l+') — Cost Impact (Rs)','num',{w:14})]),
        F('totalH','Total Hours Lost (Hrs)','calc',{list:true,num:true,w:12,fn:r=>calc.copqH(r)}),F('appraisal','Appraisal Cost (Rs)','num',{w:14}),
        F('totalC','Total Cost Impact (Rs)','calc',{list:true,num:true,money:true,w:14,fn:r=>calc.copqC(r)}),
        F('remarks','Remarks / Root Cause','area',{w:40}),F('escalation','Customer Escalation','sel',{o:['No','Yes'],def:()=>'No',w:10}),F('rcaNo','Linked RCA / CAPA #','text',{w:16}),SAVED]},
    cs:{name:'Cost Saving',one:'cost saving',dateKey:'date',color:'#1f9d61',
      open:()=>false, money:r=>calc.saving(r),
      fields:[SR,F('proj','Project code','proj',{list:true,req:true,w:12}),F('designer','Designer Name','person',{list:true,w:22}),F('partName','Part Name','text',{list:true,req:true,w:18}),
        F('oPart','Part','text',{w:22,sec:'Earlier / planned part'}),F('oMake','Make','text',{w:12}),F('oCode','Part Code','text',{w:22}),F('oQty','Qty','num',{w:8}),F('oUnit','Unit Cost (₹)','num',{w:12}),
        F('oTotal','Total Cost (₹)','calc',{num:true,money:true,w:14,fn:r=>calc.tot(r,'o')}),
        F('nMake','Make','text',{w:12,sec:'New / selected part'}),F('nCode','Part Code','text',{w:22}),F('nQty','Qty','num',{w:8}),F('nUnit','Unit Cost (₹)','num',{w:12}),
        F('nTotal','Total Cost (₹)','calc',{num:true,money:true,w:14,fn:r=>calc.tot(r,'n')}),
        F('indent','Indent Number','text',{w:14,sec:'Saving'}),F('entry','Saving Entry','sel',{o:['Calculated','Manual'],def:()=>'Calculated',w:12}),
        F('saving','Total Saving (₹)','saving',{list:true,money:true,w:14}),F('stype','Saving Type','sel',{o:['Actual Saving','Potential Saving'],def:()=>'Actual Saving',list:true,w:14}),
        ...STAR.map((f,i)=>Object.assign({},f,i===0?{sec:'STAR description'}:{})),F('date','Saving Date','date',{list:true,def:T,w:12}),SAVED]},
    gp:{name:'Good Practices',one:'good practice',dateKey:'date',color:'#0891b2',
      open:()=>false,
      fields:[SR,F('date','Date','date',{list:true,req:true,def:T,w:12}),F('proj','Project / Department','proj',{list:true,req:true,w:16,dept:true}),F('designer','Designer Name','person',{list:true,w:22}),
        F('category','Category','list',{o:['Cost Saving','Standardization','Delivery','Innovation','Safety','Quality','Other'],list:true,w:16}),
        ...STAR.map((f,i)=>Object.assign({},f,i===0?{list:true}:{})),F('team','Team / Individual Involved','person',{w:22}),SAVED]}
  };
  const KEYS=Object.keys(REG);
  const has=(r,ks)=>ks.some(k=>r[k]!==''&&r[k]!=null);
  const calc={
    copqH:r=>has(r,['s1h','s2h','s3h'])?N(r.s1h)+N(r.s2h)+N(r.s3h):N(r.totalH),
    copqC:r=>has(r,['s1c','s2c','s3c','appraisal'])?N(r.s1c)+N(r.s2c)+N(r.s3c)+N(r.appraisal):N(r.totalC),
    tot:(r,p)=>has(r,[p+'Qty',p+'Unit'])?N(r[p+'Qty'])*N(r[p+'Unit']):N(r[p+'Total']),
    saving:r=>r.entry==='Manual'||!has(r,['oQty','oUnit','oTotal','nQty','nUnit','nTotal'])?N(r.saving):calc.tot(r,'o')-calc.tot(r,'n')
  };
  window.EDPT_QMS_REG=REG;

  /* ---------- data ---------- */
  function store(){ db.qms ||= {}; KEYS.forEach(k=>{ if(!Array.isArray(db.qms[k])) db.qms[k]=[]; }); return db.qms; }
  const projects=()=>(db.projects||[]).filter(p=>String(p.code||'').trim()).sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
  /* v38: Dashboard — choose which projects are included (saved per browser) */
  const DSEL_KEY='edptDashSel';
  const dsGet=()=>{ try{ const v=JSON.parse(localStorage.getItem(DSEL_KEY)||'null'); return v&&typeof v==='object'?{seg:v.seg||'',off:Array.isArray(v.off)?v.off:[]}:{seg:'',off:[]}; }catch(e){ return {seg:'',off:[]}; } };
  const dsPut=v=>{ try{ localStorage.setItem(DSEL_KEY,JSON.stringify(v)); }catch(e){} };
  const dashOn=p=>{ if(!p) return true; const s=dsGet(); if(s.seg&&String(p.segment||'').trim()!==s.seg) return false; return !s.off.includes(p.id); };
  const dashProjects=()=>projects().filter(dashOn);
  const projByCode=c=>{ const k=key(String(c||'').split(/\s+[—-]\s+/)[0]); return k?projects().find(p=>key(p.code)===k):null; };
  const projOf=r=>(r.projectId&&(db.projects||[]).find(p=>p.id===r.projectId))||projByCode(r.projectCode);
  const codeOf=r=>{ const p=projOf(r); return p?p.code:(r.projectCode||''); };
  const val=(reg,r,f)=>f.t==='calc'?f.fn(r):f.t==='saving'?calc.saving(r):f.t==='proj'?codeOf(r):f.t==='saved'?savedTxt(r.at):r[f.k];
  const savedTxt=v=>{ if(!v) return ''; const d=new Date(v); return isNaN(d)?String(v):d.toLocaleString('en-IN'); };
  const recDate=(reg,r)=>String(r[REG[reg].dateKey]||'').slice(0,10)||(r.at&&!isNaN(new Date(r.at))?iso(new Date(r.at)):'');
  const me=()=>{ try{ return twName(TW.me); }catch(e){ return ''; } };
  const people=()=>{ try{ return (typeof edptPeopleIds==='function'?edptPeopleIds():Object.keys(db.users||{})).map(id=>twName(id)).filter(Boolean).sort(); }catch(e){ return []; } };

  /* ---------- access ---------- */
  const QM=window.QM={};
  QM.can=a=>{ try{ return typeof window.edptCan==='function'?window.edptCan('Project Hub',a):!!(twU()&&twU().admin); }catch(e){ return false; } };
  QM.approver=()=>{ const u=twU&&twU(); if(!u) return false; if(u.admin) return true; const r=String(u.role||u.designation||'').trim().toLowerCase(); return r==='manager'||r==='agm'; };
  QM.budgetCan=()=>{ try{ return typeof window.twSetupCan==='function'?window.twSetupCan('Edit'):!!twU().admin; }catch(e){ return false; } };

  /* ---------- state ---------- */
  let H={proj:'',tab:'overview',per:'all',from:'',to:'',q:'',subs:false};
  try{ const s=JSON.parse(localStorage.getItem('edptHubView')||'{}'); if(s&&typeof s==='object') H=Object.assign(H,{proj:s.proj||'',tab:s.tab||'overview',per:s.per||'all'}); }catch(e){}
  const keep=()=>{ try{ localStorage.setItem('edptHubView',JSON.stringify({proj:H.proj,tab:H.tab,per:H.per})); }catch(e){} };
  QM.H=H;
  function period(){
    if(typeof twPerBounds==='function'&&document.getElementById('twPer')){ const b=twPerBounds(); return {a:b.start||'0000-01-01',b:b.end||'9999-12-31',label:b.per==='all'?'All dates':(b.label||'')}; }
    const t=T(), d=new Date(t+'T12:00:00'), y=d.getFullYear(), m=d.getMonth();
    if(H.per==='month') return {a:iso(new Date(y,m,1,12)),b:iso(new Date(y,m+1,0,12)),label:'This month'};
    if(H.per==='lastmonth') return {a:iso(new Date(y,m-1,1,12)),b:iso(new Date(y,m,0,12)),label:'Last month'};
    if(H.per==='quarter'){ const q=Math.floor(m/3)*3; return {a:iso(new Date(y,q,1,12)),b:iso(new Date(y,q+3,0,12)),label:'This quarter'}; }
    if(H.per==='fy'){ const fy=m>=3?y:y-1; return {a:fy+'-04-01',b:(fy+1)+'-03-31',label:'FY '+fy+'-'+String(fy+1).slice(2)}; }
    if(H.per==='custom'){ const a=H.from||'0000-01-01', b=H.to||'9999-12-31'; return {a,b,label:(H.from?fd(H.from):'Start')+' – '+(H.to?fd(H.to):'Today')}; }
    return {a:'0000-01-01',b:'9999-12-31',label:'All dates'};
  }
  function list(reg,opt){
    opt=opt||{}; const R=period(), q=(opt.q??H.q).toLowerCase(), pid=opt.proj??H.proj;
    return store()[reg].filter(r=>{
      if(pid){ const p=projOf(r); if(!p||p.id!==pid) return false; }
      if(!opt.allDates){ const d=recDate(reg,r); if(R.a>'0000-01-01'||R.b<'9999-12-31'){ if(!d||d<R.a||d>R.b) return false; } }
      if(q){ const s=REG[reg].fields.map(f=>val(reg,r,f)).join(' ').toLowerCase(); if(!s.includes(q)) return false; }
      return true;
    }).sort((a,b)=>N(b.sr)-N(a.sr));
  }
  QM.list=list;

  /* ---------- screen ---------- */
  const st=document.createElement('style'); st.textContent=`
  #qmRoot .qm-head{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;justify-content:space-between;margin-bottom:12px}
  #qmRoot .qm-filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  #qmRoot .qm-filters select,#qmRoot .qm-filters input{width:auto;min-width:130px}
  #qmRoot .qm-tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--sb-line,#e4e4e7);margin:4px 0 14px}
  #qmRoot .qm-tabs button{border:0;background:none;border-bottom:2px solid transparent;border-radius:0;padding:8px 12px;font-weight:600;color:var(--sb-mut,#71717a)}
  #qmRoot .qm-tabs button.on{border-bottom-color:var(--tw-green,#1f9d61);color:inherit}
  #qmRoot .qm-tabs .n{font-weight:400;font-size:12px;margin-left:4px;opacity:.8}
  #qmRoot .qm-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:14px}
  #qmRoot .qm-tile{border:1px solid var(--sb-line,#e4e4e7);border-radius:10px;padding:12px 14px;text-align:left;background:none;cursor:pointer;display:flex;flex-direction:column;gap:4px}
  #qmRoot .qm-tile span{font-size:12px;color:var(--sb-mut,#71717a)} #qmRoot .qm-tile b{font-size:20px} #qmRoot .qm-tile small{font-size:12px;color:var(--sb-mut,#71717a)}
  #qmRoot .qm-card{border:1px solid var(--sb-line,#e4e4e7);border-radius:10px;padding:14px 16px;margin-bottom:14px}
  #qmRoot .qm-card h3{margin:0 0 10px;font-size:15px}
  #qmRoot .qm-bar{height:8px;border-radius:5px;background:var(--sb-line,#e4e4e7);overflow:hidden;margin-top:4px} #qmRoot .qm-bar i{display:block;height:100%}
  #qmRoot table.qm-t{width:100%;border-collapse:collapse;font-size:13px} #qmRoot table.qm-t th{text-align:left;font-weight:600;color:var(--sb-mut,#71717a);padding:7px 8px;border-bottom:1px solid var(--sb-line,#e4e4e7);white-space:nowrap}
  #qmRoot table.qm-t td{padding:7px 8px;border-bottom:1px solid var(--sb-line,#e4e4e7);vertical-align:top}
  #qmRoot table.qm-t tbody tr{cursor:pointer} #qmRoot table.qm-t tbody tr:hover{background:color-mix(in srgb,var(--tw-green,#1f9d61) 7%,transparent)}
  #qmRoot .qm-clip{max-width:360px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  #qmRoot .qm-n{text-align:right;white-space:nowrap} #qmRoot .neg{color:#e5484d} #qmRoot .pos{color:#1f9d61}
  .qm-chip{display:inline-block;white-space:nowrap;padding:1px 8px;border-radius:10px;font-size:12px;background:color-mix(in srgb,currentColor 12%,transparent)}
  #qmRoot .qm-tl{position:relative;font-size:12px}
  #qmRoot .qm-tl .row{display:grid;grid-template-columns:230px 1fr;align-items:center;min-height:26px;border-bottom:1px dashed color-mix(in srgb,var(--sb-line,#e4e4e7) 70%,transparent)}
  #qmRoot .qm-tl .lab{padding-right:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #qmRoot .qm-tl .lab.sub{padding-left:16px;color:var(--sb-mut,#71717a)}
  #qmRoot .qm-tl .lane{position:relative;height:26px}
  #qmRoot .qm-tl .bar{position:absolute;top:7px;height:12px;border-radius:6px;min-width:4px;opacity:.9}
  #qmRoot .qm-tl .bar.sub{top:9px;height:8px;opacity:.7}
  #qmRoot .qm-tl .dot{position:absolute;top:6px;width:14px;height:14px;margin-left:-7px;border-radius:50%;border:2px solid var(--tw-surface,#fff);cursor:pointer;box-shadow:0 0 0 1px rgba(0,0,0,.15)}
  #qmRoot .qm-tl .ax{position:relative;height:20px;color:var(--sb-mut,#71717a)} #qmRoot .qm-tl .ax span{position:absolute;transform:translateX(-50%);white-space:nowrap;font-size:11px}
  #qmRoot .qm-tl .grid{position:absolute;top:0;bottom:0;border-left:1px solid color-mix(in srgb,var(--sb-line,#e4e4e7) 60%,transparent);pointer-events:none}
  #qmRoot .qm-tl .today{position:absolute;top:0;bottom:0;border-left:2px solid #e5484d;pointer-events:none;z-index:2}
  #qmRoot .qm-tl .pe{position:absolute;top:0;bottom:0;border-left:2px dashed var(--sb-mut,#71717a);pointer-events:none;opacity:.6}
  #qmRoot .qm-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:12px;color:var(--sb-mut,#71717a)} #qmRoot .qm-legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}
  .qm-form .qm-sec{font-weight:700;margin:14px 0 6px;padding-top:10px;border-top:1px solid var(--sb-line,#e4e4e7);font-size:14px}
  .qm-form .qm-sec:first-child{border-top:0;margin-top:0;padding-top:0}
  .qm-form .qm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px 14px}
  .qm-form .qm-grid .full{grid-column:1/-1}
  .qm-form label{display:block;font-size:12px;font-weight:600;margin-bottom:3px}
  .qm-form textarea{min-height:64px;width:100%} .qm-form input,.qm-form select{width:100%}
  .qm-form input[readonly]{background:color-mix(in srgb,var(--sb-line,#e4e4e7) 45%,transparent)}
  .qm-form .req{color:#e5484d}
  .qm-form .qm-tools{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
  .qm-gone{display:none!important}
  #qmRoot .qm-ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px}
  #qmRoot .qm-k{border:1px solid var(--sb-line,#e4e4e7);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:0}
  #qmRoot .qm-k.wide{grid-column:span 2} @media(max-width:1100px){#qmRoot .qm-ks{grid-template-columns:repeat(2,minmax(0,1fr))!important}} @media(max-width:640px){#qmRoot .qm-ks{grid-template-columns:1fr!important}#qmRoot .qm-k.wide{grid-column:auto}}
  #qmRoot .qm-kt{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sb-mut,#71717a)}
  #qmRoot .qm-kb{font-size:24px;font-weight:700;line-height:1.1} #qmRoot .qm-kb small{font-size:12px;font-weight:400;color:var(--sb-mut,#71717a);margin-left:6px}
  #qmRoot .qm-kl{display:grid;gap:3px;font-size:13px} #qmRoot .qm-k.wide .qm-kl{grid-template-columns:1fr 1fr;column-gap:18px}
  #qmRoot .qm-kl>div{display:flex;justify-content:space-between;gap:8px;padding:2px 0;border-bottom:1px dashed color-mix(in srgb,var(--sb-line,#e4e4e7) 70%,transparent)}
  #qmRoot .qm-kl>div span{color:var(--sb-mut,#71717a)} #qmRoot .qm-kl>div.go{cursor:pointer} #qmRoot .qm-kl>div.go:hover span{text-decoration:underline}
  #qmRoot .qm-seg{display:flex;height:8px;border-radius:5px;overflow:hidden;background:var(--sb-line,#e4e4e7)} #qmRoot .qm-seg i{display:block;height:100%}
  #qmRoot .qm-pg{position:relative;height:8px;border-radius:5px;background:var(--sb-line,#e4e4e7);overflow:visible;margin-top:4px} #qmRoot .qm-pg i{display:block;height:100%;border-radius:5px}
  #qmRoot .qm-pg u{position:absolute;top:-3px;bottom:-3px;width:2px;background:#e5484d;margin-left:-1px} #qmRoot .qm-pg.big{height:10px;margin-top:12px}
  #qmRoot .qm-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px 18px}
  #qmRoot .qm-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:14px} #qmRoot .qm-two>.qm-card{margin-bottom:14px}
  #qmRoot .qm-tl .lab{display:flex;flex-direction:column;justify-content:center;line-height:1.2;padding:3px 10px 3px 0} #qmRoot .qm-tl .lab .tp{font-size:11px;color:var(--sb-mut,#71717a);font-weight:400}
  #qmRoot .qm-tl .row{min-height:34px} #qmRoot .qm-tl .lane{height:34px} #qmRoot .qm-tl .bar{top:11px} #qmRoot .qm-tl .bar.sub{top:13px} #qmRoot .qm-tl .dot{top:10px}
  #qmRoot .qm-tl .nodate{position:absolute;left:8px;top:9px;font-size:11px;color:var(--sb-mut,#71717a);font-style:italic}
  #qmRoot #qmSel select{min-width:110px}
  #qmRoot .qm-k.qm-pk{grid-column:1/-1!important;flex-direction:row;align-items:flex-start;gap:18px} #qmRoot .qm-k.qm-pk>.qm-kt,#qmRoot .qm-k.qm-pk>.qm-kb{min-width:90px} #qmRoot .qm-k.qm-pk .qm-kl{flex:1;grid-template-columns:repeat(5,minmax(0,1fr))!important;column-gap:22px} @media(max-width:1100px){#qmRoot .qm-k.qm-pk .qm-kl{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
  #qmGrpDlg .qm-pp{position:relative;height:16px} #qmGrpDlg .qm-pp .pl{position:absolute;left:0;top:0;height:7px;border-radius:0 4px 4px 0;background:#cbd5e1} #qmGrpDlg .qm-pp .ac{position:absolute;left:0;top:9px;height:7px;border-radius:0 4px 4px 0} #qmGrpDlg .qm-chip{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;background:color-mix(in srgb,currentColor 12%,transparent)} #qmGrpDlg td,#qmGrpDlg th{padding:6px 8px;border-bottom:1px solid var(--sb-line,#e4e4e7);text-align:left} #qmGrpDlg .neg{color:#e5484d}
  #qmRoot tr.qm-cur td{background:color-mix(in srgb,#e5484d 7%,transparent)}
  #qmRoot .qm-segb{display:inline-flex;border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;overflow:hidden} #qmRoot .qm-segb button{border:0;border-radius:0;background:none;padding:6px 12px} #qmRoot .qm-segb button.on{background:var(--tw-green,#1f9d61);color:#fff}
  #qmRoot .qm-tp tr.qm-tpm td{background:color-mix(in srgb,var(--sb-line,#e4e4e7) 22%,transparent)} #qmRoot .qm-tp tr.qm-tps{cursor:default}
  #qmRoot .qm-car{display:inline-block;width:16px;color:var(--sb-mut,#71717a);transition:transform .15s} #qmRoot .qm-car.op{transform:rotate(90deg)}
  #qmRoot .qm-sts{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:8px}
  #qmRoot .qm-st{border:1px solid var(--sb-line,#e4e4e7);border-radius:8px;padding:8px 10px;background:none;text-align:left;display:flex;flex-direction:column;gap:2px;cursor:pointer}
  #qmRoot .qm-st span{font-size:12px;color:var(--sb-mut,#71717a)} #qmRoot .qm-st b{font-size:20px} #qmRoot .qm-st.on{border-color:var(--tw-green,#1f9d61);box-shadow:inset 0 0 0 1px var(--tw-green,#1f9d61)}
  #qmRoot .qm-pp{position:relative;height:16px} #qmRoot .qm-pp .pl{position:absolute;left:0;top:0;height:7px;border-radius:0 4px 4px 0;background:#cbd5e1}
  #qmRoot .qm-pp .ac{position:absolute;left:0;top:9px;height:7px;border-radius:0 4px 4px 0}
  #setup .qm-t{width:100%;border-collapse:collapse;font-size:13px} #setup .qm-t th{text-align:left;font-weight:600;color:var(--sb-mut,#71717a);padding:7px 8px;border-bottom:1px solid var(--sb-line,#e4e4e7);white-space:nowrap}
  #setup .qm-t td{padding:7px 8px;border-bottom:1px solid var(--sb-line,#e4e4e7);vertical-align:top} #setup .qm-t tbody tr{cursor:pointer} #setup .qm-t tbody tr:hover{background:color-mix(in srgb,var(--tw-green,#1f9d61) 7%,transparent)}
  #setup .qm-n{text-align:right;white-space:nowrap} #setup .neg{color:#e5484d} #setup .pos{color:#1f9d61}
  #setup .qm-pg{position:relative;height:8px;border-radius:5px;background:var(--sb-line,#e4e4e7);margin-top:4px} #setup .qm-pg i{display:block;height:100%;border-radius:5px} #setup .qm-pg u{position:absolute;top:-3px;bottom:-3px;width:2px;background:#e5484d;margin-left:-1px}
  `; document.head.appendChild(st);

  function ensureSection(){
    if(document.getElementById('hub')) return;
    const anchor=document.getElementById('daily'); const sec=document.createElement('section'); sec.id='hub'; sec.className='view hidden'; sec.innerHTML='<div class="panel" id="qmRoot"></div>';
    (anchor&&anchor.parentNode?anchor.parentNode:document.body).appendChild(sec);
  }
  ensureSection();
  try{
    if(typeof SBI==='object') SBI.hub='<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 13h8M8 16h5"/>';
    if(typeof SB_ICON==='object') SB_ICON.hub='hub';
    if(typeof SB_KEYS==='object') SB_KEYS.hub='j';
    if(Array.isArray(SB_GROUPS)) SB_GROUPS.forEach(g=>{ const i=g.indexOf('hub'); if(i>=0) g.splice(i,1); });
  }catch(e){}
  const nav0=window.twNav;
  window.twNav=function(){ return (typeof nav0==='function'?nav0.apply(this,arguments):[]).filter(x=>!['hub','issues','history'].includes(x[0])).map(x=>x[0]==='dashboard'?['dashboard','Project Dashboard']:x); };
  const sw0=window.switchTab;
  window.switchTab=function(name){
    if(name==='issues'){ H.tab='dep'; keep(); name='hub'; }
    if(name==='history'){ if(window.AL) AL.type='history'; name='activity'; }
    if(name==='hub'){ name='dashboard'; setTimeout(()=>document.getElementById('qmRoot')?.scrollIntoView({behavior:'smooth',block:'start'}),60); } const r=sw0.call(this,name); if(name==='dashboard'){ try{ placeHub(); render(); }catch(e){ console.warn(e); } } return r; };
  const ref0=window.twRefresh;
  if(typeof ref0==='function') window.twRefresh=function(){ const r=ref0.apply(this,arguments); try{ if(TW.tab==='dashboard'||TW.tab==='hub') render(); }catch(e){} return r; };

  const dashSel=()=>document.getElementById('dashProject');
  const curProj=()=>{ const v=dashSel()?.value; return v&&v!=='ALL'?v:''; };
  QM.set=function(k,v){
    if(k==='proj'){ H.subs=false; const el=dashSel(); if(el){ el.value=v||'ALL'; if(!el.value) el.value='ALL'; } if(typeof renderDashboard==='function') renderDashboard(); else render(); document.getElementById('qmRoot')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    H[k]=v; keep(); render();
  };
  QM.open=function(pid,tab){ if(tab) H.tab=tab; keep(); if(typeof twGo==='function') twGo('dashboard'); else switchTab('dashboard'); QM.set('proj',pid||''); };

  function render(){
    const root=document.getElementById('qmRoot'); if(!root) return;
    if(!twU||!twU()) return;
    const keepSel=['dashProject','twPer','twPerPick'].map(id=>document.getElementById(id)).filter(Boolean);
    if(!QM.can('View')){ root.innerHTML='<h2>Project Dashboard</h2><p class="muted">You do not have access. Contact the ADPT Admin.</p>'; return; }
    store(); ACT=null; H.proj=curProj();
    if(H.proj&&!(db.projects||[]).some(p=>p.id===H.proj)) H.proj='';
    if(H.tab!=='overview'&&H.tab!=='dep'&&!REG[H.tab]) H.tab='overview';
    const P=H.proj?(db.projects||[]).find(p=>p.id===H.proj):null, R=period();
    const counts=Object.fromEntries(KEYS.map(k=>[k,list(k).length])); counts.dep=depRows().length; counts.week='';
    const tab=(k,l)=>`<button class="${H.tab===k?'on':''}" onclick="QM.set('tab','${k}')">${l}${k!=='overview'&&counts[k]!==''?`<span class="n">${counts[k]}</span>`:''}</button>`;
    const reg=REG[H.tab];
    root.innerHTML=`<div class="qm-head"><div><h2 style="margin:0">Project Dashboard</h2><span class="muted">${P?E(P.code+' — '+(P.name||'')):'All projects'} · ${E(R.label)}</span></div>
      <div class="qm-filters" id="qmSel"><label class="muted" style="margin:0;font-size:12px">Project</label><span data-slot="dashProject"></span><label class="muted" style="margin:0 0 0 4px;font-size:12px">Period</label><span data-slot="twPer"></span><span data-slot="twPerPick"></span>
        <input type="search" placeholder="Search projects and records…" value="${E(H.q)}" onchange="QM.set('q',this.value)" style="min-width:200px"></div></div>
      <div class="qm-tabs">${tab('overview',P?'Project overview':'Overview')}${tab('dep','Dependencies')}${KEYS.map(k=>tab(k,REG[k].name)).join('')}</div>
      <div class="actions" style="margin-bottom:12px;justify-content:flex-end">
        ${H.tab==='dep'?`<button class="small" onclick="QM.exportDep()">Export Dependencies to Excel</button>`:''}
        ${H.tab==='week'?`<button class="small" onclick="QM.exportPer()">Export period status to Excel</button>`:''}
        ${reg&&QM.can('Add')?`<button class="primary" onclick="QM.edit('${H.tab}')">+ Add ${E(reg.one)}</button>`:''}
        ${reg?`<button class="small" onclick="QM.exportReg('${H.tab}')">Export ${E(reg.short||reg.name)} to Excel</button>`:''}
        ${reg&&QM.can('Add')?`<button class="small" onclick="QM.importPick('${H.tab}')">Import from Excel</button>`:''}
        <button class="small" onclick="QM.exportAll()">Export everything (one workbook)</button>
      </div>
      <div id="qmBody"></div>`;
    keepSel.forEach(el=>{ const slot=root.querySelector(`[data-slot="${el.id}"]`); if(slot) slot.replaceWith(el); });
    const ps=document.getElementById('dashProject'); if(ps){ ps.style.minWidth='240px'; ps.style.width='auto'; }
    const body=document.getElementById('qmBody');
    body.innerHTML=H.tab==='week'?perView():H.tab==='dep'?depTable():reg?regTable(H.tab):(P?overviewOne(P):overviewAll());
  }
  QM.render=render;
  /* ---------- Dashboard period: Overall / Week / Month / Quarter / Custom (v35.1) ---------- */
  (function(){
    const sel=document.getElementById('twPer'); if(!sel) return;
    const cur=sel.value; sel.innerHTML=[['all','Overall'],['week','Week'],['month','Month'],['quarter','Quarter'],['custom','Custom']].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
    sel.value=['all','week','month','quarter','custom'].includes(cur)?cur:'all';
    const isoWeek=d=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+3-((x.getDay()+6)%7)); const y=x.getFullYear(), w1=new Date(y,0,4); const w=1+Math.round(((x-w1)/864e5-3+((w1.getDay()+6)%7))/7); return y+'-W'+String(w).padStart(2,'0'); };
    const weekStart=v=>{ const m=String(v||'').match(/^(\d{4})-W(\d{2})$/); if(!m) return null; const y=+m[1], w=+m[2], j4=new Date(y,0,4,12); const mon=new Date(j4); mon.setDate(j4.getDate()-((j4.getDay()+6)%7)+(w-1)*7); return mon; };
    const pb0=window.twPerBounds, pp0=window.twPerPick;
    window.twPerBounds=function(){
      const per=(document.getElementById('twPer')||{}).value||'all';
      if(per==='week'){ const a=weekStart((document.getElementById('twPerW')||{}).value)||weekStart(isoWeek(T())); const b=new Date(a); b.setDate(a.getDate()+6); return {per,start:iso(a),end:iso(b),label:`Week ${String((document.getElementById('twPerW')||{}).value||isoWeek(T())).split('-W')[1]} · ${fd(iso(a))} – ${fd(iso(b))}`}; }
      if(per==='custom'){ const a=(document.getElementById('twPerA')||{}).value||T(), b0=(document.getElementById('twPerB')||{}).value||a, b=b0<a?a:b0; return {per,start:a,end:b,label:`${fd(a)} – ${fd(b)}`}; }
      return pb0?pb0.apply(this,arguments):{per:'all',start:null,end:null,label:'Overall (all dates)'};
    };
    window.twPerPick=function(){
      const per=(document.getElementById('twPer')||{}).value||'all', box=document.getElementById('twPerPick'); if(!box) return;
      if(per==='week'){ box.innerHTML=`<input type="week" id="twPerW" value="${isoWeek(T())}" onchange="renderDashboard()" aria-label="Week" style="width:auto">`; return; }
      if(per==='custom'){ const a=T(); box.innerHTML=`<input type="date" id="twPerA" value="${a.slice(0,8)}01" onchange="renderDashboard()" aria-label="From" style="width:auto"> <input type="date" id="twPerB" value="${a}" onchange="renderDashboard()" aria-label="To" style="width:auto">`; return; }
      return pp0?pp0.apply(this,arguments):undefined;
    };
  })();

  /* ---------- Period status: week / month / quarter / custom (tab removed in v35.1; kept for export) ---------- */
  const addD=(d,n)=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return iso(x); };
  const mon=d=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()-((x.getDay()+6)%7)); return iso(x); };
  const wkNo=d=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+3-((x.getDay()+6)%7)); const y=new Date(x.getFullYear(),0,4); return 1+Math.round(((x-y)/864e5-3+((y.getDay()+6)%7))/7); };
  const hDate=v=>{ const m=String(v||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`; const d=new Date(v); return isNaN(d)?'':iso(d); };
  QM.pm=v=>{ H.pm=v; H.po=0; if(v==='custom'&&!H.pa){ const r=perRange(); H.pa=r.a; H.pb=r.b; } H.pm=v; keep(); render(); };
  QM.po=n=>{ H.po=(H.po||0)+n; render(); };
  QM.pc=(k,v)=>{ H[k]=v; render(); };
  function perRange(){
    const t=T(), d=new Date(t+'T12:00:00'), o=H.po||0, m=H.pm||'week';
    if(m==='month'){ const a=new Date(d.getFullYear(),d.getMonth()+o,1,12), b=new Date(a.getFullYear(),a.getMonth()+1,0,12); return {a:iso(a),b:iso(b),label:MON[a.getMonth()]+' '+a.getFullYear()}; }
    if(m==='quarter'){ const q=Math.floor(d.getMonth()/3)+o, a=new Date(d.getFullYear(),q*3,1,12), b=new Date(a.getFullYear(),a.getMonth()+3,0,12); return {a:iso(a),b:iso(b),label:`Q${Math.floor(a.getMonth()/3)+1} ${a.getFullYear()} (${MON[a.getMonth()]}–${MON[b.getMonth()]})`}; }
    if(m==='custom'){ const a=H.pa||mon(t), b=H.pb&&H.pb>=a?H.pb:a; return {a,b,label:fd(a)+' – '+fd(b)}; }
    const a=addD(mon(t),7*o), b=addD(a,6); return {a,b,label:`Week ${wkNo(a)} · ${fd(a)} – ${fd(b)}`};
  }
  function perStats(ps,R0){
    const t0=T(), cut=R0.b<t0?R0.b:t0;
    const items=ps.flatMap(p=>typeof projectLeafItems==='function'?projectLeafItems(p):[]).filter(x=>x.status!=='Cancelled');
    const doneOn=x=>x.status==='Completed'?String(x.item.completedAt||x.target||'').slice(0,10):'';
    const inP=d=>d&&d>=R0.a&&d<=R0.b;
    const plan=items.filter(x=>inP(x.target)), fin=items.filter(x=>inP(doneOn(x)));
    const onTime=fin.filter(x=>!x.target||doneOn(x)<=x.target), late=fin.filter(x=>x.target&&doneOn(x)>x.target);
    const missed=plan.filter(x=>x.status!=='Completed'&&x.target<t0), coming=plan.filter(x=>x.status!=='Completed'&&x.target>=t0);
    const total=items.length, pc=total?Math.round(items.filter(x=>x.target&&x.target<=R0.b).length/total*100):0;
    const ac=R0.a>t0?null:(total?Math.round(items.filter(x=>{ const d=doneOn(x); return d&&d<=cut; }).length/total*100):0);
    const pids=new Set(ps.map(p=>p.id));
    const un=(db.unplanned||[]).filter(u=>pids.has(u.projectId)&&inP(u.date)), unH=un.reduce((n,u)=>n+(Number(u.hours)||0),0);
    const codes=new Set(ps.map(p=>key(p.code)));
    const hist=(db.history||[]).filter(h=>inP(hDate(h.at))&&codes.has(key(String(h.project||'').split(/\s+[—-]\s+/)[0])));
    const st=ac==null?['Upcoming','#71717a']:(ac>=pc?['On track','#1f9d61']:(pc-ac<=10?['Slightly behind','#b45309']:['Behind plan','#e5484d']));
    return {items,plan,fin,onTime,late,missed,coming,total,pc,ac,un,unH,hist,st,doneOn};
  }
  function perView(){
    const R0=perRange(), pid=curProj(), P=pid?(db.projects||[]).find(p=>p.id===pid):null, ps=P?[P]:projects().filter(p=>p.stage!=='Completed');
    const S=perStats(ps,R0), m=H.pm||'week', r1v=v=>Math.round(v*10)/10;
    const seg=(k,l)=>`<button class="${m===k?'on':''}" onclick="QM.pm('${k}')">${l}</button>`;
    const nav=m==='custom'?`<input type="date" value="${E(R0.a)}" onchange="QM.pc('pa',this.value)" style="width:auto"><span class="muted">to</span><input type="date" value="${E(R0.b)}" onchange="QM.pc('pb',this.value)" style="width:auto">`
      :`<button class="small" onclick="QM.po(-1)" title="Previous">‹</button><b style="min-width:200px;text-align:center">${E(R0.label)}</b><button class="small" onclick="QM.po(1)" title="Next">›</button>${(H.po||0)?`<button class="small" onclick="QM.pc('po',0)">Current ${m}</button>`:''}`;
    const tiles=[['Planned to finish',S.plan.length,''],['Finished',S.fin.length,'#1f9d61'],['Finished on time',S.onTime.length,'#1f9d61'],['Finished late',S.late.length,S.late.length?'#b45309':''],['Missed (still open)',S.missed.length,S.missed.length?'#e5484d':''],['Still to come',S.coming.length,'#2563eb'],['Unplanned work',r1v(S.unH)+' h',''],['Date changes',S.hist.length,S.hist.length?'#b45309':'']]
      .map(([l,v,c])=>`<div class="qm-st" style="cursor:default"><span>${l}</span><b ${c?`style="color:${c}"`:''}>${v}</b></div>`).join('');
    const pr=`<div class="qm-card" style="display:flex;flex-wrap:wrap;gap:14px 28px;align-items:center"><div><span class="muted" style="font-size:12px">Status at end of period</span><div><span class="qm-chip" style="color:${S.st[1]};font-size:14px">${S.st[0]}</span></div></div>
      <div style="flex:1;min-width:260px"><span class="muted" style="font-size:12px">Planned ${S.pc}% · Actual ${S.ac==null?'—':S.ac+'%'} (cumulative, ${S.total} sub milestones)</span><div class="qm-pp" style="margin-top:4px"><div class="pl" style="width:${S.pc}%"></div><div class="ac" style="width:${S.ac||0}%;background:${S.ac!=null&&S.ac+10<S.pc?'#f59e0b':'#28a8f4'}"></div></div></div></div>`;
    let table='';
    if(!P){
      const rows=ps.map(p=>{ const x=perStats([p],R0); return {p,x}; }).filter(r=>r.x.plan.length||r.x.fin.length||r.x.un.length||r.x.hist.length||H.pall)
        .map(({p,x})=>`<tr onclick="QM.set('proj','${E(p.id)}')"><td><b>${E(p.code)}</b></td><td>${E(p.name||'')}</td><td class="qm-n">${x.plan.length||'—'}</td><td class="qm-n">${x.fin.length||'—'}</td><td class="qm-n">${x.late.length||'—'}</td><td class="qm-n ${x.missed.length?'neg':''}">${x.missed.length||'—'}</td><td class="qm-n">${x.pc}%</td><td class="qm-n"><b>${x.ac==null?'—':x.ac+'%'}</b></td><td><span class="qm-chip" style="color:${x.st[1]}">${x.st[0]}</span></td><td class="qm-n">${x.unH?r1v(x.unH)+' h':'—'}</td><td class="qm-n">${x.hist.length||'—'}</td></tr>`).join('');
      table=`<div class="qm-card"><div class="toprow" style="margin-bottom:6px"><h3 style="margin:0">Projects in this period</h3><label style="display:flex;gap:6px;align-items:center;margin:0;font-size:12px"><input type="checkbox" ${H.pall?'checked':''} onchange="QM.pc('pall',this.checked)"> Show projects with no activity</label></div>
        <div class="tablewrap"><table class="qm-t"><thead><tr><th>Project Code</th><th>Project Name</th><th class="qm-n">Planned to finish</th><th class="qm-n">Finished</th><th class="qm-n">Finished late</th><th class="qm-n">Missed</th><th class="qm-n">Planned</th><th class="qm-n">Actual</th><th>Status</th><th class="qm-n">Unplanned</th><th class="qm-n">Date changes</th></tr></thead><tbody>${rows||'<tr><td colspan="11" class="muted">No sub milestones due or finished in this period.</td></tr>'}</tbody></table></div></div>`;
    } else {
      const list=[...S.plan,...S.fin.filter(x=>!S.plan.includes(x))].sort((a,b)=>String(a.target).localeCompare(String(b.target)));
      const rowSt=x=>{ const d=S.doneOn(x); if(d) return d>x.target?['Finished late','#b45309']:['Finished','#1f9d61']; return x.target<T()?['Missed','#e5484d']:['Due','#2563eb']; };
      const rv=(db.reviews||[]).filter(r=>r.projectId===P.id&&(String(r.week||'').slice(0,10)>=R0.a&&String(r.week||'').slice(0,10)<=R0.b||(R0.a<=ms2(r.at)&&ms2(r.at)<=R0.b))).sort((a,b)=>String(b.week).localeCompare(String(a.week)));
      table=`<div class="qm-card"><h3>Sub milestones due or finished in this period <span class="muted" style="font-weight:400;font-size:12px">${list.length}</span></h3>
        <div class="tablewrap"><table class="qm-t"><thead><tr><th>Milestone</th><th>Sub milestone</th><th>Owner</th><th>Target</th><th>Finished on</th><th>Progress</th><th>Result</th></tr></thead><tbody>
        ${list.map(x=>{ const r=rowSt(x); return `<tr style="cursor:default"><td>${E(x.t.name)}</td><td><b>${E(x.item.name)}</b></td><td><b>${E(x.owner||'—')}</b></td><td style="white-space:nowrap">${fd(x.target)}</td><td style="white-space:nowrap">${fd(S.doneOn(x))}</td><td class="qm-n">${x.progress||0}%</td><td><span class="qm-chip" style="color:${r[1]}">${r[0]}</span></td></tr>`; }).join('')||'<tr><td colspan="7" class="muted">Nothing due or finished in this period.</td></tr>'}</tbody></table></div></div>
        <div class="qm-two">
        <div class="qm-card"><h3>Project Review status</h3>${rv.length?rv.map(r=>`<div style="padding:6px 0;border-bottom:1px dashed var(--sb-line,#e4e4e7)"><span class="qm-chip" style="color:#7c3aed">${E(r.status||'Reviewed')}</span> <span class="muted" style="font-size:12px">week of ${fd(r.week)}</span>${r.current?`<div style="font-size:13px">Current: ${E(r.current)}</div>`:''}${r.pending?`<div style="font-size:13px">Pending: ${E(r.pending)}</div>`:''}${r.deps?`<div style="font-size:13px">Dependency: ${E(r.deps)}</div>`:''}</div>`).join(''):'<p class="muted">No weekly review saved in this period.</p>'}</div>
        <div class="qm-card"><h3>Date changes</h3>${S.hist.length?`<div class="tablewrap"><table class="qm-t"><thead><tr><th>When</th><th>Record</th><th>Field</th><th>From → To</th><th>Reason</th></tr></thead><tbody>${S.hist.map(h=>`<tr style="cursor:default"><td style="white-space:nowrap">${E(String(h.at||'').split(',')[0])}</td><td>${E(h.record||'')}</td><td>${E(h.field||'')}</td><td style="white-space:nowrap">${fd(h.old)} → ${fd(h.next)}</td><td>${E(h.reason||'')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No date changes in this period.</p>'}</div></div>`;
    }
    return `<div class="qm-card"><div class="toprow" style="margin-bottom:10px;align-items:center"><div><h3 style="margin:0">Period status</h3><span class="muted" style="font-size:12px">${P?E(P.code+' — '+(P.name||'')):'All open projects ('+ps.length+')'} · ${fd(R0.a)} – ${fd(R0.b)}</span></div>
      <div class="actions" style="align-items:center"><div class="qm-segb">${seg('week','Week')}${seg('month','Month')}${seg('quarter','Quarter')}${seg('custom','Custom')}</div>${nav}</div></div>
      <div class="qm-sts" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${tiles}</div></div>${pr}${table}`;
  }
  const ms2=v=>{ if(!v) return ''; const d=new Date(typeof v==='number'?v:v); return isNaN(d)?'':iso(d); };
  QM.exportPer=function(){ try{ const R0=perRange(), pid=curProj(), P=pid?(db.projects||[]).find(p=>p.id===pid):null, ps=P?[P]:projects().filter(p=>p.stage!=='Completed');
      const head=['Project Code','Project Name','Planned to finish','Finished','Finished on time','Finished late','Missed (still open)','Still to come','Planned %','Actual %','Status','Unplanned hours','Date changes'];
      const rows=ps.map(p=>{ const x=perStats([p],R0); return [p.code,p.name||'',x.plan.length,x.fin.length,x.onTime.length,x.late.length,x.missed.length,x.coming.length,x.pc,x.ac==null?'':x.ac,x.st[0],Math.round(x.unH*10)/10,x.hist.length]; });
      const sheets=[{name:'Period status',head:2,widths:[14,30,14,10,14,12,16,12,10,10,16,14,12],rows:[[`Period status — ${R0.label} (${fd(R0.a)} – ${fd(R0.b)}) — exported ${fd(T())}`],head,...rows]}];
      const S=perStats(ps,R0), list=[...S.plan,...S.fin.filter(x=>!S.plan.includes(x))];
      sheets.push({name:'Sub milestones',head:2,widths:[12,28,36,20,12,12,10],rows:[[`Sub milestones due or finished — ${R0.label}`],['Project','Milestone','Sub milestone','Owner','Target','Finished on','Progress %'],...list.map(x=>[x.p.code,x.t.name,x.item.name,x.owner||'',x.target||'',S.doneOn(x)||'',x.progress||0])]});
      download(RP.workbook(sheets),'Period_status_'+R0.a+'_'+R0.b+'.xlsx'); toast('Excel downloaded'); }catch(e){ console.error(e); toast('Export failed: '+e.message); } };

  /* ---------- Dependencies (was its own page) ---------- */
  function depRows(){
    const q=H.q.toLowerCase(), pid=curProj();
    return projects().filter(p=>!pid||p.id===pid).flatMap(p=>typeof projectLeafItems==='function'?projectLeafItems(p):[])
      .filter(x=>x.status!=='Completed'&&(x.dependency||x.status==='Pending Dependency'))
      .map(x=>({x,d:typeof depDelay==='function'?depDelay(x.item.depDue):0}))
      .filter(r=>!q||[r.x.p.code,r.x.t.name,r.x.item.name,r.x.owner,r.x.dependency,r.x.fromWhom].join(' ').toLowerCase().includes(q))
      .sort((a,b)=>b.d-a.d||String(a.x.item.depDue||'9').localeCompare(String(b.x.item.depDue||'9')));
  }
  function depTable(){
    const rows=depRows(), late=rows.filter(r=>r.d>0).length;
    return `<p class="muted" style="margin:0 0 8px;font-size:12px">${rows.length} pending dependenc${rows.length===1?'y':'ies'}${late?` · <b style="color:#e5484d">${late} past due</b>`:''}. These come from the Dependency, From Whom and Dep. Due fields of sub milestones; change them in Task Management or in Daily Tasks.</p>
      <div class="tablewrap"><table class="qm-t"><thead><tr><th>Project</th><th>Milestone</th><th>Sub milestone</th><th>Owner</th><th>Status</th><th>Dependency</th><th>From Whom</th><th>Due</th><th class="qm-n">Dependency Delay</th></tr></thead><tbody>
      ${rows.map(({x,d})=>`<tr style="cursor:default"><td><b>${E(x.p.code)}</b></td><td>${E(x.t.name)}</td><td>${E(x.item.name)}</td><td><b>${E(x.owner||'Unassigned')}</b></td><td>${E(x.status)}</td><td>${E(x.dependency||'(not entered)')}</td><td>${E(x.fromWhom||'—')}</td><td style="white-space:nowrap">${fd(x.item.depDue)}</td><td class="qm-n ${d?'neg':''}">${d?d+' days':'—'}</td></tr>`).join('')||'<tr><td colspan="9" class="muted">No pending dependencies.</td></tr>'}
      </tbody></table></div>`;
  }
  QM.exportDep=function(){ try{ const rows=depRows(); download(RP.workbook([{name:'Dependencies',head:2,widths:[12,26,30,20,16,36,20,12,14],rows:[[`Pending dependencies — ${scopeTxt()} — exported ${fd(T())}`],['Project','Milestone','Sub milestone','Owner','Status','Dependency','From Whom','Due','Dependency Delay (days)'],...rows.map(({x,d})=>[x.p.code,x.t.name,x.item.name,x.owner||'',x.status,x.dependency||'',x.fromWhom||'',x.item.depDue||'',d])]}]),'Dependencies_'+T()+'.xlsx'); toast(`Excel downloaded: ${rows.length} row(s).`); }catch(e){ console.error(e); toast('Export failed: '+e.message); } };

  /* ---------- overview ---------- */
  let ACT=null;
  const unplannedOf=pid=>{ try{ if(!ACT) ACT=window.edptActivityRows?window.edptActivityRows():[]; return ACT.filter(r=>r.kind==='unplanned'&&r.project&&(!pid||r.project.id===pid)); }catch(e){ return []; } };
  function inPeriod(d){ const R=period(); return !(R.a>'0000-01-01'||R.b<'9999-12-31')||(d&&d>=R.a&&d<=R.b); }
  function sums(pid){
    const L=k=>list(k,{proj:pid,q:''}).filter(r=>pid||dashOn(projOf(r)));
    const cn=L('cn'), si=L('si'), rca=L('rca'), copq=L('copq'), cs=L('cs'), gp=L('gp');
    const un=unplannedOf(pid).filter(r=>inPeriod(r.start));
    return {cn,si,rca,copq,cs,gp,un,
      cnCost:cn.reduce((n,r)=>n+N(r.cost),0), cnOpen:cn.filter(REG.cn.open).length,
      siOpen:si.filter(REG.si.open).length, rcaOpen:rca.filter(REG.rca.open).length, rcaPend:rca.filter(r=>(r.approval||'Pending')==='Pending').length,
      copqC:copq.reduce((n,r)=>n+calc.copqC(r),0), copqH:copq.reduce((n,r)=>n+calc.copqH(r),0),
      csAct:cs.filter(r=>r.stype!=='Potential Saving').reduce((n,r)=>n+calc.saving(r),0), csPot:cs.filter(r=>r.stype==='Potential Saving').reduce((n,r)=>n+calc.saving(r),0),
      unH:un.reduce((n,r)=>n+(r.hours||0),0)};
  }
  const tile=(l,v,sub,go,color)=>`<button class="qm-tile" ${go?`onclick="${go}"`:''}><span>${l}</span><b ${color?`style="color:${color}"`:''}>${v}</b>${sub?`<small>${sub}</small>`:''}</button>`;
  function moneyTiles(s,budget,actual){
    const has=budget>0||actual>0, varc=budget-actual, used=budget?Math.round(actual/budget*100):0;
    return [
      tile('Allocated budget',budget?inr(budget):'—',has?'':'Not set yet'),
      tile('Actual cost',actual?inr(actual):'—',budget?`<span class="qm-bar" style="display:block"><i style="width:${Math.min(used,100)}%;background:${used>100?'#e5484d':used>85?'#f59e0b':'#1f9d61'}"></i></span>${used}% of budget used`:''),
      tile('Variance (budget − actual)',has?inr(varc):'—',has?(varc<0?'Over budget':'Within budget'):'',null,has?(varc<0?'#e5484d':'#1f9d61'):''),
      tile('Change notes',s.cn.length,`Cost effect ${inr(s.cnCost)}${s.cnOpen?` · ${s.cnOpen} raised`:''}`,"QM.set('tab','cn')",REG.cn.color),
      tile('Site issues',s.si.length,`${s.siOpen} open`,"QM.set('tab','si')",REG.si.color),
      tile('RCA & CAPA',s.rca.length,`${s.rcaOpen} open · ${s.rcaPend} awaiting approval`,"QM.set('tab','rca')",REG.rca.color),
      tile('Cost of poor quality',inr(s.copqC),`${s.copq.length} entries · ${Math.round(s.copqH*10)/10} h lost`,"QM.set('tab','copq')",REG.copq.color),
      tile('Cost saving',inr(s.csAct),`${s.cs.length} entries${s.csPot?` · potential ${inr(s.csPot)}`:''}`,"QM.set('tab','cs')",REG.cs.color),
      tile('Good practices',s.gp.length,'',"QM.set('tab','gp')",REG.gp.color),
      tile('Unplanned tasks',s.un.length,`${Math.round(s.unH*10)/10} h`,"document.getElementById('qmUnpl')?.scrollIntoView({behavior:'smooth'})")
    ].join('');
  }
  /* ---------- KPI strip (one card per subject, no repeats) ---------- */
  const inPer=d=>{ const R=period(); if(R.a==='0000-01-01'&&R.b==='9999-12-31') return true; d=String(d||'').slice(0,10); return !!d&&d>=R.a&&d<=R.b; };
  function subStats(ps){
    const items=ps.flatMap(p=>typeof projectLeafItems==='function'?projectLeafItems(p):[]).filter(x=>inPer(x.target)||period().a==='0000-01-01');
    const c=st=>items.filter(x=>st.includes(x.status)).length;
    return {n:items.length,done:c(['Completed']),ip:c(['In Progress','Under Review']),ns:c(['Not Started','Pending Dependency']),hold:c(['On Hold']),over:items.filter(x=>x.delay>0).length,
      prog:items.length?Math.round(items.reduce((a,x)=>a+(x.progress||0),0)/items.length):0};
  }
  function unplStats(pid){
    const l=(db.unplanned||[]).filter(e=>(pid?e.projectId===pid:dashOn((db.projects||[]).find(p=>p.id===e.projectId)))&&inPer(e.date)), h=l.reduce((n,e)=>n+(Number(e.hours)||0),0), lost=l.reduce((n,e)=>n+(Number(e.lost)||0),0);
    return {n:l.length,h,days:h/8,lost};
  }
  const r1=v=>Math.round(v*10)/10;
  const kcard=(title,big,lines,extra,cls)=>`<div class="qm-k ${cls||''}"><div class="qm-kt">${title}</div><div class="qm-kb">${big}</div>${extra||''}<div class="qm-kl">${lines.map(([l,v,c,go])=>`<div ${go?`class="go" onclick="${go}"`:''}><span>${l}</span><b ${c?`style="color:${c}"`:''}>${v}</b></div>`).join('')}</div></div>`;
  const seg=(parts)=>{ const t=parts.reduce((n,p)=>n+p[0],0)||1; return `<div class="qm-seg">${parts.map(([v,c])=>v?`<i style="width:${v/t*100}%;background:${c}"></i>`:'').join('')}</div>`; };
  function kpis(ps,pid){
    const s=sums(pid), u=unplStats(pid), st=subStats(ps), b=ps.reduce((n,p)=>n+N(p.budget),0), a=ps.reduce((n,p)=>n+N(p.actualCost),0), v=b-a, used=b?Math.round(a/b*100):0;
    const cards=[];
    if(!pid){ const cnt=f=>ps.filter(f).length;
      const G=projGroups(ps), line=k=>{ const g=G.find(x=>x.k===k); return [(H.sf===k?'▸ ':'')+g.l,g.n,g.c,`QM.grp('${k}')`]; };
      cards.push(kcard('Projects',ps.length,G.filter(g=>g.always||g.n).map(g=>line(g.k)),'','wide qm-pk')); }
    cards.push(kcard('Sub milestones',`${st.n}<small>${st.prog}% complete</small>`,[['Completed',st.done,'#1f9d61'],['In progress',st.ip,'#2563eb'],['Not started / pending',st.ns],['On hold',st.hold,'#b45309'],['Overdue',st.over,st.over?'#e5484d':'',"twGo('daily');setTimeout(()=>document.querySelectorAll('#twDailyList tr.dt-s2')[1]?.scrollIntoView({behavior:'smooth'}),150)"]],seg([[st.done,'#22c55e'],[st.ip,'#28a8f4'],[st.ns,'#9aa8bb'],[st.hold,'#f59e0b']])));
    /* v38: Budget card removed from the dashboard */
    cards.push(kcard('Unplanned work',`${u.n}<small>task${u.n===1?'':'s'}</small>`,[['Hours',r1(u.h)],['Days',r1(u.days)],['Schedule slip',r1(u.lost)+' h',u.lost?'#e5484d':'']],'',''));
    cards.push(kcard('Quality & cost',inr(s.copqC)+'<small>COPQ</small>',[
      ['Change notes',`${s.cn.length}${s.cnCost?' · '+inr(s.cnCost):''}`,REG.cn.color,"QM.set('tab','cn')"],
      ['Site issues open',`${s.siOpen} / ${s.si.length}`,s.siOpen?REG.si.color:'',"QM.set('tab','si')"],
      ['RCA & CAPA open',`${s.rcaOpen} / ${s.rca.length}${s.rcaPend?` · ${s.rcaPend} to approve`:''}`,REG.rca.color,"QM.set('tab','rca')"],
      ['COPQ entries',`${s.copq.length} · ${r1(s.copqH)} h lost`,REG.copq.color,"QM.set('tab','copq')"],
      ['Cost saving',inr(s.csAct)+(s.csPot?` <span class="muted" style="font-weight:400">+ ${inr(s.csPot)} potential</span>`:''),REG.cs.color,"QM.set('tab','cs')"],
      ['Good practices',s.gp.length,REG.gp.color,"QM.set('tab','gp')"]],'','wide'));
    return `<div class="qm-ks" style="grid-template-columns:repeat(${cards.filter(c=>!/qm-pk/.test(c)).length+cards.filter(c=>/class="qm-k wide/.test(c)&&!/qm-pk/.test(c)).length},minmax(0,1fr))">${cards.join('')}</div>`;
  }
  const STAGES=['DAP','Design & Indenting','Drawing','Design Handover','Installation','Commissioning','Completed','On Hold'];
  const stageOf=p=>{ const s0=p.stage||'Design & Indenting'; return s0==='Design'?'Design & Indenting':s0==='Closed'?'Completed':s0; };
  QM.stageOf=stageOf;
  window.EDPT_STAGES=STAGES;
  /* Projects card groups (v35.10): stages, then status. Click a line to list its projects. */
  function projGroups(ps){
    const info=new Map(ps.map(p=>[p.id,pInfo(p)])), stg=stageOf;
    const G=[
      ['dap','DAP',p=>stg(p)==='DAP','',1],['di','Design & Indenting',p=>stg(p)==='Design & Indenting','',1],['dr','Drawing',p=>stg(p)==='Drawing','',1],['dh','Design Handover',p=>stg(p)==='Design Handover','',1],['ins','Installation',p=>stg(p)==='Installation','',1],
      ['ok','On track',p=>info.get(p.id).s0==='ok','#1f9d61',1],['risk','At risk',p=>info.get(p.id).s0==='risk','#d97706',1],['unpl','Delay — unplanned task',p=>info.get(p.id).s0==='unpl','#e5484d',1],['dep','Delay — dependency',p=>info.get(p.id).s0==='dep','#b45309',1],['over','Delay — overdue',p=>info.get(p.id).s0==='over','#e5484d',1],
      ['com','Commissioning',p=>stg(p)==='Commissioning','',1],['done','Completed',p=>stg(p)==='Completed','#1f9d61',1],['hold','On hold',p=>stg(p)==='On Hold','#b45309',1]
    ];
    return G.map(([k,l,f,c,always])=>{ const list=ps.filter(f); return {k,l,c,always,list,n:list.length,info}; });
  }
  QM.grp=function(k){ H.sf=(H.sf===k?'':k); render(); setTimeout(()=>document.getElementById('qmSum')?.scrollIntoView({behavior:'smooth',block:'start'}),30); };
  QM.stage=v=>{ H.stage=v; window.psListRender(); };
  QM.psq=v=>{ H.sq=v; window.psListRender(); };
  /* v38: selection bar shown above the dashboard tiles */
  const SEGMENTS=['ASRS','Tote & Carton','Slit Roll','Robotics & Palletizer'];
  function dashBar(){
    const all=projects(), s=dsGet(), segs=[...new Set([...SEGMENTS,...all.map(p=>String(p.segment||'').trim()).filter(Boolean)])];
    const inSeg=all.filter(p=>!s.seg||String(p.segment||'').trim()===s.seg), on=inSeg.filter(p=>!s.off.includes(p.id)).length;
    return `<div class="qm-card" id="dashSelBar" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px 14px">
      <label style="margin:0;font-weight:600">Segment</label>
      <select style="width:auto;min-width:180px" onchange="QM.dseg(this.value)"><option value="">All segments</option>${segs.map(x=>`<option ${x===s.seg?'selected':''}>${E(x)}</option>`).join('')}</select>
      <label style="margin:0 0 0 8px;font-weight:600">Projects</label>
      <button class="small" onclick="QM.dpick()">${on} of ${inSeg.length} selected ▾</button>
      <button class="small" onclick="QM.dall(true)">Select all</button><button class="small" onclick="QM.dall(false)">Clear all</button>
      <div id="dashPick" style="display:${QM._dopen?'block':'none'};flex-basis:100%;max-height:260px;overflow:auto;border-top:1px solid rgba(127,127,127,.25);padding-top:8px">
        ${inSeg.map(p=>`<label style="display:flex;gap:8px;align-items:center;margin:3px 0;font-weight:400"><input type="checkbox" style="width:auto" ${s.off.includes(p.id)?'':'checked'} onchange="QM.dtog('${E(p.id)}',this.checked)"><b>${E(p.code)}</b> ${E(p.name||'')} <span class="muted">${E(p.segment||'')}</span></label>`).join('')||'<span class="muted">No projects in this segment.</span>'}
      </div></div>`;
  }
  QM.dseg=v=>{ const s=dsGet(); s.seg=v||''; dsPut(s); render(); };
  QM.dtog=(id,on)=>{ const s=dsGet(); s.off=s.off.filter(x=>x!==id); if(!on) s.off.push(id); dsPut(s); render(); };
  QM.dall=on=>{ const s=dsGet(), ids=projects().filter(p=>!s.seg||String(p.segment||'').trim()===s.seg).map(p=>p.id); s.off=on?s.off.filter(x=>!ids.includes(x)):[...new Set([...s.off,...ids])]; dsPut(s); render(); };
  QM.dpick=()=>{ QM._dopen=!QM._dopen; render(); };
  function overviewAll(){
    const ps=dashProjects();
    return `${dashBar()}${kpis(ps,'')}${allSummary()}${orphans()?`<div class="qm-card">${orphans()}</div>`:''}`;
  }
  /* one project list (was Project Setup → Project List + the hub table) */
  function projRow(p){
    const x=sums(p.id), b=N(p.budget), a=N(p.actualCost), v=b-a, orig=(typeof projEndOrig==='function'?projEndOrig(p):p.end)||p.end, rev=orig&&p.end&&orig!==p.end;
    const dl=typeof projDelay==='function'?projDelay(p):0, ud=typeof projUnplDays==='function'?projUnplDays(p):0, days=typeof lkDays==='function'&&p.start&&p.end?lkDays(p.start,p.end):'';
    const nm=id=>id?(typeof twName==='function'&&db.users&&db.users[id]?twName(id):id):'—';
    return {p,x,b,a,v,orig,rev,dl,ud,days,nm};
  }
  function elapsed(p){ if(!p.start||!p.end) return null; const a=new Date(p.start+'T00:00:00'), b=new Date(p.end+'T00:00:00'), t=new Date(T()+'T00:00:00'); return b>a?Math.max(0,Math.min(100,Math.round((t-a)/(b-a)*100))):(t>=b?100:0); }
  function progOfProj(p){ const it=typeof projectLeafItems==='function'?projectLeafItems(p):[]; return it.length?Math.round(it.reduce((a,x)=>a+(x.progress||0),0)/it.length):0; }
  /* v35.12 schedule received: ticked in Project Schedule; until then planned vs actual shows "Schedule not received" */
  const schedOK=p=>!!(p&&p.schedRecv&&p.schedRecv.on)||stageOf(p)==='Completed';
  const noSched='<span class="qm-chip" style="color:#b45309;white-space:nowrap" title="Tick “Project schedule received” in Project Schedule">Schedule not received</span>';
  QM.schedOK=schedOK;
  function progCell(p){ if(!schedOK(p)) return noSched; const pr=progOfProj(p), el=elapsed(p), behind=el!=null&&pr+10<el;
    return `<div class="qm-pg" title="${pr}% work done${el!=null?' · '+el+'% of project time used':''}"><i style="width:${pr}%;background:${behind?'#f59e0b':'#28a8f4'}"></i>${el!=null?`<u style="left:${el}%"></u>`:''}</div><div class="muted" style="font-size:11px;white-space:nowrap">${pr}% done${el!=null?' · '+el+'% time':''}</div>`; }
  QM.projList=projList;
  function projList(ps,o){
    o=o||{}; const q=String(o.q??H.q).toLowerCase(), stg=o.stage??H.stage, canEd=typeof twSetupCan==='function'?twSetupCan('Edit'):false, canDel=typeof twSetupCan==='function'?twSetupCan('Delete'):false, canAdd=typeof twSetupCan==='function'?twSetupCan('Add'):false;
    const list0=ps.filter(p=>(!stg||stageOf(p)===stg)&&(!q||[p.code,p.name,p.customer,p.segment,p.lead,p.face,p.pace,p.panelEngineer,p.fieldEngineer].join(' ').toLowerCase().includes(q))).map(projRow);
    const sum=k=>list0.reduce((n,r)=>n+(Number(r.p[k])||0),0), S=f=>list0.reduce((n,r)=>n+f(r),0);
    const money=v=>v?inr(v):'—';
    const rows=list0.map(r=>{ const p=r.p;
      return `<tr onclick="if(!event.target.closest('button'))QM.editProject('${E(p.id)}')" title="Click to edit in the form above"><td><b>${E(p.code)}</b></td><td>${E(p.name||'')}</td><td>${E(stageOf(p))}</td><td style="min-width:120px">${progCell(p)}</td><td>${E(p.segment||'—')}</td><td><b>${E(r.nm(p.lead))}</b></td>
        <td style="white-space:nowrap">${fd(p.start)}</td><td style="white-space:nowrap">${fd(p.end)}${r.rev?`<div class="muted">planned ${fd(r.orig)}</div>`:''}</td><td>${E(r.nm(p.panelEngineer))}</td><td>${E(r.nm(p.fieldEngineer))}</td><td>${E(r.nm(p.face))}</td><td>${E(r.nm(p.pace))}</td>
        <td class="qm-n">${Number(p.totalVfd)||0}</td><td class="qm-n">${Number(p.totalPanels)||0}</td><td class="qm-n">${r.days}</td><td class="qm-n ${r.dl?'neg':''}">${r.dl}</td><td class="qm-n">${r.ud||0}</td>
        <td class="qm-n">${money(r.b)}</td><td class="qm-n">${money(r.a)}</td><td class="qm-n ${r.b||r.a?(r.v<0?'neg':'pos'):''}">${r.b||r.a?inr(r.v):'—'}</td>
        <td class="qm-n">${r.x.cn.length}${r.x.cnCost?`<div class="muted">${inr(r.x.cnCost)}</div>`:''}</td><td class="qm-n">${r.x.siOpen}/${r.x.si.length}</td><td class="qm-n">${r.x.rcaOpen}/${r.x.rca.length}</td><td class="qm-n">${money(r.x.copqC)}</td><td class="qm-n">${money(r.x.csAct)}</td><td class="qm-n">${r.x.gp.length}</td>
        <td><div class="actions" style="flex-wrap:nowrap"><button class="small" onclick="QM.open('${E(p.id)}','overview')">Open</button>${canEd?`<button class="small" onclick="QM.editProject('${E(p.id)}')">Edit</button>`:''}${canDel?`<button class="small danger" onclick="deleteProjectById('${E(p.id)}');setTimeout(()=>window.psListRender(),50)">Delete</button>`:''}</div></td></tr>`; }).join('');
    return `<div class="toprow" style="margin-bottom:6px"><div><h3 style="margin:0">Project list</h3><span class="muted" style="font-size:12px">${list0.length} project${list0.length===1?'':'s'} · click a row to edit it in the form above · <b>Open</b> shows it on the Project Dashboard. Site issues and RCA & CAPA show open / total.</span></div>
      <div class="actions"><input type="search" placeholder="Search projects…" value="${E(o.q??H.q)}" onchange="QM.psq(this.value)" style="width:auto;min-width:180px"><select onchange="QM.stage(this.value)" style="width:auto" title="Stage">${['',...STAGES].map(x=>`<option value="${x}" ${(stg||'')===x?'selected':''}>${x||'All stages'}</option>`).join('')}</select>${canAdd?`<button class="primary small" onclick="QM.newProject()">+ Add Project</button>`:''}<button class="small" onclick="QM.exportProjects()">Export Excel</button></div></div>
      <div class="tablewrap"><table class="qm-t qm-plist"><thead><tr><th>Project Code</th><th>Project Name</th><th>Stage</th><th>Progress</th><th>Segment</th><th>Project Lead</th><th>Start Date</th><th>End Date</th><th>Panel Design Engineer</th><th>Field Design Engineer</th><th>FACE</th><th>PACE</th><th class="qm-n">Total VFD</th><th class="qm-n">Total No. of Panel</th><th class="qm-n">Project Days</th><th class="qm-n">Delay</th><th class="qm-n">Unplanned Days</th><th class="qm-n">Budget</th><th class="qm-n">Actual</th><th class="qm-n">Variance</th><th class="qm-n">Change notes</th><th class="qm-n">Site issues</th><th class="qm-n">RCA & CAPA</th><th class="qm-n">COPQ</th><th class="qm-n">Saving</th><th class="qm-n">Good practices</th><th></th></tr></thead>
      <tbody>${rows||'<tr><td colspan="27" class="muted">No projects match.</td></tr>'}</tbody>
      ${list0.length?`<tfoot><tr class="tw-gtotal"><td colspan="12"><b>Total</b></td><td class="qm-n"><b>${sum('totalVfd')}</b></td><td class="qm-n"><b>${sum('totalPanels')}</b></td><td colspan="3"></td><td class="qm-n"><b>${money(S(r=>r.b))}</b></td><td class="qm-n"><b>${money(S(r=>r.a))}</b></td><td class="qm-n"><b>${inr(S(r=>r.v))}</b></td><td class="qm-n"><b>${S(r=>r.x.cn.length)}</b></td><td class="qm-n"><b>${S(r=>r.x.siOpen)}/${S(r=>r.x.si.length)}</b></td><td class="qm-n"><b>${S(r=>r.x.rcaOpen)}/${S(r=>r.x.rca.length)}</b></td><td class="qm-n"><b>${money(S(r=>r.x.copqC))}</b></td><td class="qm-n"><b>${money(S(r=>r.x.csAct))}</b></td><td class="qm-n"><b>${S(r=>r.x.gp.length)}</b></td><td></td></tr></tfoot>`:''}</table></div>`;
  }
  QM.editProject=function(id){ if(typeof twGo==='function') twGo('setup'); else switchTab('setup'); if(typeof selectProject==='function') selectProject(id); setTimeout(()=>{ try{ switchTab('setup'); document.getElementById('projectSelect').value=id; renderSetup(); window.scrollTo(0,0); }catch(e){} },0); };
  QM.newProject=function(){ if(typeof twGo==='function') twGo('setup'); if(typeof newProject==='function') newProject(); };
  QM.exportProjects=function(){
    try{ ACT=null; const ps=projects().filter(p=>{ const q=String(H.sq||'').toLowerCase(); if(H.stage&&(p.stage||'Design')!==H.stage) return false; return !q||[p.code,p.name,p.customer,p.segment,p.lead,p.face,p.pace,p.panelEngineer,p.fieldEngineer].join(' ').toLowerCase().includes(q); }).map(projRow);
      const head=['Project Code','Project Name','Customer','Project Stage','Project Segment','Project Lead','Project Start Date','Project End Date','Planned End Date','Panel Design Engineer','Field Design Engineer','FACE','PACE','Total VFD','Total No. of Panel','Total Project Days','Total Delay','Unplanned Days','Allocated Budget (Rs)','Actual Cost (Rs)','Variance (Rs)','Change Notes','CN Cost Effect (Rs)','Site Issues','Open Site Issues','RCA & CAPA','Open RCA & CAPA','COPQ (Rs)','Actual Saving (Rs)','Good Practices'];
      const rows=ps.map(r=>{ const p=r.p; return [p.code,p.name||'',p.customer||'',p.stage||'Design',p.segment||'',r.nm(p.lead).replace('—',''),p.start||'',p.end||'',r.orig||'',r.nm(p.panelEngineer).replace('—',''),r.nm(p.fieldEngineer).replace('—',''),r.nm(p.face).replace('—',''),r.nm(p.pace).replace('—',''),Number(p.totalVfd)||0,Number(p.totalPanels)||0,Number(r.days)||0,r.dl,r.ud||0,N(p.budget),N(p.actualCost),r.v,r.x.cn.length,r.x.cnCost,r.x.si.length,r.x.siOpen,r.x.rca.length,r.x.rcaOpen,r.x.copqC,r.x.csAct,r.x.gp.length]; });
      download(RP.workbook([{name:'Project List',head:2,widths:[14,28,20,14,18,20,14,14,14,22,22,18,18,10,12,12,10,12,16,16,16,10,16,10,10,10,10,14,16,10],rows:[[`Project List — ${period().label} — exported ${fd(T())}`],head,...rows]}]),'Project_List_'+T()+'.xlsx'); toast(`Excel downloaded: ${rows.length} project(s).`);
    }catch(e){ console.error(e); toast('Export failed: '+e.message); }
  };
  window.psExportExcel=QM.exportProjects;
  function orphans(){
    const codes={}; let n=0; KEYS.forEach(k=>list(k,{proj:'',q:''}).forEach(r=>{ if(!projOf(r)){ n++; const c=r.projectCode||'(blank)'; codes[c]=(codes[c]||0)+1; } }));
    if(!n) return '';
    const cs=Object.keys(codes).sort();
    return `<p class="muted" style="font-size:12px;margin:10px 0 0"><b>${n}</b> record(s) use project codes that are not in Project Setup: ${E(cs.slice(0,25).join(', '))}${cs.length>25?' …':''}. They are counted in the totals above and listed in each register. Add the project in Project Setup with the same code and they link automatically.</p>`;
  }
  function overviewOne(P){
    const s=sums(P.id), items=typeof projectLeafItems==='function'?projectLeafItems(P):[], pr=progOfProj(P), el=elapsed(P), dl=typeof projDelay==='function'?projDelay(P):0;
    const late=P.end&&P.stage!=='Completed'&&items.some(x=>x.status!=='Completed')&&P.end<T()?Math.round((new Date(T())-new Date(P.end))/864e5):0;
    const health=late?[`${late} days late`,'#e5484d']:(dl?[`${dl} days delay on tasks`,'#b45309']:(el!=null&&pr+10<el?['Behind plan','#b45309']:['On track','#1f9d61']));
    const nm=id=>id?(typeof twName==='function'&&db.users&&db.users[id]?twName(id):id):'—', orig=(typeof projEndOrig==='function'?projEndOrig(P):P.end)||P.end;
    const un=s.un.sort((x,y)=>String(y.start).localeCompare(String(x.start)));
    const f=(l,v)=>`<div><span class="muted" style="font-size:12px">${l}</span><div><b>${v}</b></div></div>`;
    return `<div class="qm-card qm-phead">
        <div class="toprow" style="margin-bottom:10px;align-items:flex-start"><div><h3 style="margin:0;font-size:18px">${E(P.code)} — ${E(P.name||'')}</h3>
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="qm-chip" style="color:#2563eb">${E(P.stage||'Design')}</span><span class="qm-chip" style="color:${health[1]}">${E(health[0])}</span>${P.segment?`<span class="qm-chip" style="color:#71717a">${E(P.segment)}</span>`:''}</div></div>
          <div class="actions">${typeof twSetupCan==='function'&&twSetupCan('Edit')?`<button class="small" onclick="QM.editProject('${E(P.id)}')">Edit project</button>`:''}${QM.budgetCan()?`<button class="small" onclick="QM.editBudget('${E(P.id)}')">Edit budget / actual cost</button>`:''}<button class="small" onclick="QM.set('proj','')">← All projects</button></div></div>
        <div class="qm-facts">${f('Customer',E(P.customer||'—'))}${f('Project lead',E(nm(P.lead)))}${f('Panel design',E(nm(P.panelEngineer)))}${f('Field design',E(nm(P.fieldEngineer)))}
          ${f('Start',fd(P.start))}${f('End',fd(P.end)+(orig&&orig!==P.end?` <span class="muted" style="font-weight:400">(planned ${fd(orig)})</span>`:''))}${f('Project days',typeof lkDays==='function'&&P.start&&P.end?lkDays(P.start,P.end):'—')}
          ${f('Work done',`${pr}%`)}${f('Time used',el!=null?el+'%':'—')}${f('VFD / Panels',`${Number(P.totalVfd)||0} / ${Number(P.totalPanels)||0}`)}</div>
        <div class="qm-pg big" title="Work done vs time used"><i style="width:${pr}%;background:${el!=null&&pr+10<el?'#f59e0b':'#28a8f4'}"></i>${el!=null?`<u style="left:${el}%"></u>`:''}</div>
      </div>
      ${kpis([P],P.id)}
      ${taskProgress(P)}
      <div class="qm-two"><div class="qm-card" id="qmUnpl"><h3>Unplanned tasks <span class="muted" style="font-weight:400;font-size:12px">${un.length} · ${r1(s.unH)} h</span></h3>
        <div class="tablewrap"><table class="qm-t"><thead><tr><th>Date</th><th>Person</th><th>Task</th><th class="qm-n">Hours</th><th>Status</th></tr></thead><tbody>
        ${un.map(r=>`<tr style="cursor:default" title="${E(r.remarks||'')}"><td style="white-space:nowrap">${fd(r.start)}</td><td><b>${E(typeof twName==='function'?twName(r.person):r.person)}</b></td><td>${E(r.task)}</td><td class="qm-n">${r.hours||0}</td><td>${E(r.status)}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">No unplanned tasks for this project in this period.</td></tr>'}
        </tbody></table></div></div>
      <div class="qm-card"><h3>Latest records</h3>${latest(P.id)}</div></div>`;
  }
  /* ---------- task progress (main tasks + subtasks, % based) ---------- */
  QM.tpT=id=>{ H.tpo=H.tpo||{}; H.tpo[id]=!H.tpo[id]; render(); };
  QM.tpAll=v=>{ const P=(db.projects||[]).find(p=>p.id===H.proj); H.tpo={}; if(v&&P) (P.tasks||[]).forEach(t=>H.tpo[t.id]=1); render(); };
  const STC2={'Completed':'#22c55e','In Progress':'#28a8f4','Under Review':'#8b5cf6','Pending Dependency':'#f59e0b','On Hold':'#f59e0b','Not Started':'#9aa8bb'};
  function pbar(pr,c){ return `<div class="qm-pg" style="flex:1;min-width:80px"><i style="width:${Math.max(0,Math.min(100,pr))}%;background:${c||'#28a8f4'}"></i></div>`; }
  function taskProgress(P){
    const items=typeof projectLeafItems==='function'?projectLeafItems(P):[], tasks=(P.tasks||[]).filter(t=>String(t.name||'').trim()); H.tpo=H.tpo||{};
    if(!tasks.length) return `<div class="qm-card"><h3>Task progress</h3><p class="muted">No milestones yet. Add them in Task Management.</p></div>`;
    const all=items.length?Math.round(items.reduce((a,x)=>a+(x.progress||0),0)/items.length):0;
    const rows=tasks.map(t=>{ const its=items.filter(x=>x.t===t||x.t.id===t.id), n=its.length, d=its.filter(x=>x.status==='Completed').length, pr=n?Math.round(its.reduce((a,x)=>a+(x.progress||0),0)/n):(typeof progress==='function'?progress(t.status):0);
      const st=typeof taskStatus==='function'?taskStatus(t):(t.status||''), dl=Math.max(0,...its.map(x=>x.delay||0)), tg=its.map(x=>x.target).filter(Boolean).sort().pop()||t.target, op=!!H.tpo[t.id];
      return `<tr class="qm-tpm" onclick="QM.tpT('${E(t.id)}')"><td><span class="qm-car ${op?'op':''}">▸</span><b>${E(t.name)}</b></td><td><div style="display:flex;align-items:center;gap:8px">${pbar(pr,STC2[st])}<b style="width:38px;text-align:right">${pr}%</b></div></td><td class="qm-n">${d} / ${n}</td><td><span class="qm-chip" style="color:${STC2[st]||'#71717a'}">${E(st||'—')}</span></td><td style="white-space:nowrap">${fd(tg)}</td><td class="qm-n ${dl?'neg':''}">${dl||'—'}</td></tr>`
        +(op?its.map(x=>`<tr class="qm-tps"><td style="padding-left:30px">${E(x.item.name)}${x.owner?` <span class="muted">· ${E(x.owner)}</span>`:''}</td><td><div style="display:flex;align-items:center;gap:8px">${pbar(x.progress||0,STC2[x.status])}<span style="width:38px;text-align:right">${x.progress||0}%</span></div></td><td></td><td><span class="qm-chip" style="color:${STC2[x.status]||'#71717a'}">${E(x.status)}</span></td><td style="white-space:nowrap">${fd(x.target)}</td><td class="qm-n ${x.delay?'neg':''}">${x.delay||'—'}</td></tr>`).join('')||'<tr class="qm-tps"><td colspan="6" class="muted" style="padding-left:30px">No sub milestones</td></tr>':''); }).join('');
    return `<div class="qm-card"><div class="toprow" style="margin-bottom:8px"><div><h3 style="margin:0">Task progress</h3><span class="muted" style="font-size:12px">Overall ${all}% · click a milestone to see its sub milestones</span></div><div class="actions"><button class="small" onclick="QM.tpAll(1)">Expand all</button><button class="small" onclick="QM.tpAll(0)">Collapse all</button></div></div>
      <div class="tablewrap"><table class="qm-t qm-tp"><thead><tr><th style="width:34%">Milestone / sub milestone</th><th>Progress</th><th class="qm-n">Sub milestones done</th><th>Status</th><th>Target</th><th class="qm-n">Delay (days)</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  /* ---------- all-project summary (always at the bottom of the dashboard) ---------- */
  const addD5=d=>{ const x=new Date(d+'T12:00:00'); let n=0; while(n<5){ x.setDate(x.getDate()+1); const g=x.getDay(); if(g>0&&g<6) n++; } return iso(x); };
  function pInfo(p){
    const st=p.stage||'Design', items=typeof projectLeafItems==='function'?projectLeafItems(p):[], t0=T();
    const pr=progOfProj(p), el=elapsed(p), ud=typeof projUnplDays==='function'?projUnplDays(p):0;
    const orig=(typeof projEndOrig==='function'?projEndOrig(p):p.end)||p.end, moved=orig&&p.end&&orig!==p.end?Math.round((new Date(p.end+'T12:00:00')-new Date(orig+'T12:00:00'))/864e5):0;
    const open=items.filter(x=>x.status!=='Completed'&&x.status!=='Cancelled');
    const over=open.filter(x=>(x.delay||0)>0), byP={}; over.forEach(x=>{ const n=x.owner||'Unassigned'; (byP[n] ||= {n:0,d:0}); byP[n].n++; byP[n].d=Math.max(byP[n].d,x.delay||0); });
    const deps=open.filter(x=>x.status==='Pending Dependency'||x.dependency).filter(x=>!x.item.depDue||(typeof depDelay==='function'?depDelay(x.item.depDue):0)>0||x.status==='Pending Dependency');
    const depBy={}; deps.forEach(x=>{ const n=x.fromWhom||x.dependency||'not named'; depBy[n]=(depBy[n]||0)+1; });
    const pastEnd=p.end&&p.end<t0&&pr<100&&st!=='Completed', behind=el!=null&&pr+10<el;
    const lastH=(db.history||[]).filter(h=>key(String(h.project||'').split(/\s+[—-]\s+/)[0])===key(p.code)&&/end|target/i.test(String(h.field||''))&&/project/i.test(String(h.record||'')+' '+String(h.field||''))).slice(-1)[0]||null;
    let s0='ok';
    if(st==='Completed'||st==='Closed') s0='closed'; else if(st==='On Hold') s0='hold';
    else if(ud>0) s0='unpl'; else if(Object.keys(depBy).length&&deps.length) s0='dep'; else if(over.length) s0='over';
    /* v35.11 At risk: not delayed yet, but work is more than 10 points behind time used, or the end date is within 14 days with under 90% done, or a sub milestone is due in the next 5 working days and not started */
    const daysLeft=p.end?Math.round((new Date(p.end+'T12:00:00')-new Date(t0+'T12:00:00'))/864e5):null;
    const soon=open.filter(x=>x.target&&x.target>=t0&&x.target<=addD5(t0)&&(x.status==='Not Started'||(x.progress||0)===0));
    const riskWhy=[]; if(behind) riskWhy.push(`work ${pr}% vs time used ${el}%`); if(daysLeft!=null&&daysLeft>=0&&daysLeft<=14&&pr<90) riskWhy.push(`${daysLeft} day(s) to end date, ${pr}% done`); if(soon.length) riskWhy.push(`${soon.length} sub milestone(s) due within 5 days not started: ${[...new Set(soon.map(x=>x.owner||'Unassigned'))].join(', ')}`);
    if(s0==='ok'&&riskWhy.length) s0='risk';
    const people=Object.entries(byP).sort((a,b)=>b[1].n-a[1].n).map(([n,v])=>`${n} (${v.n} overdue, up to ${v.d} d)`);
    const depTxt=Object.entries(depBy).map(([n,c])=>`${n}${c>1?` (${c})`:''}`);
    const reason={risk:'At risk: '+riskWhy.join(' · '),closed:'Completed',hold:'On hold',ok:'—',unpl:`${ud} working day(s) added by unplanned tasks`+(people.length?` · overdue: ${people.join(', ')}`:''),dep:`Waiting on: ${depTxt.join(', ')}`+(people.length?` · overdue: ${people.join(', ')}`:''),over:`Overdue: ${people.join(', ')}`,end:`End date ${fd(p.end)} passed, ${100-pr}% work left`,behind:`Work ${pr}% vs plan ${el}%`}[s0];
    return {s0,pr,el,ud,orig,moved,reason,lastH,over,people};
  }
  const PST={risk:['At risk','#d97706'],ok:['On track','#1f9d61'],unpl:['Delayed — unplanned tasks','#e5484d'],dep:['Delayed — pending dependency','#b45309'],over:['Delayed — overdue sub milestones','#e5484d'],hold:['On hold','#71717a'],closed:['Completed','#1f9d61']};
  QM.sumF=v=>{ H.sf=H.sf===v?'':v; render(); setTimeout(()=>document.getElementById('qmSum')?.scrollIntoView({block:'start'}),0); };
  function allSummary(){
    const ps=dashProjects(), G=projGroups(ps), g=G.find(x=>x.k===H.sf), list=(g?g.list:ps), info=G[0].info;
    const ord=['unpl','dep','over','risk','ok','hold','closed'];
    const rs=list.map(p=>Object.assign({p},info.get(p.id))).sort((a,b)=>ord.indexOf(a.s0)-ord.indexOf(b.s0)||((b.el||0)-b.pr)-((a.el||0)-a.pr));
    const rows=rs.map(r=>{ const behind=r.el!=null&&r.pr+10<r.el, gap=r.el!=null?r.pr-r.el:null, st=PST[r.s0]||PST.ok;
      return `<tr onclick="QM.set('proj','${E(r.p.id)}')"><td><b>${E(r.p.code)}</b></td><td>${E(r.p.name||'')}</td><td>${E(stageOf(r.p))}</td><td><span class="qm-chip" style="color:${st[1]}">${E(st[0])}</span></td>
        <td style="min-width:200px;max-width:340px;font-size:12px">${E(r.reason)}</td>
        <td style="min-width:200px">${schedOK(r.p)?`<div class="qm-pp" title="Actual ${r.pr}% · Planned ${r.el==null?'—':r.el+'%'}"><div class="pl" style="width:${r.el||0}%"></div><div class="ac" style="width:${r.pr}%;background:${behind?'#f59e0b':'#28a8f4'}"></div></div>`:noSched}</td>
        <td class="qm-n">${r.el==null?'—':r.el+'%'}</td><td class="qm-n"><b>${r.pr}%</b></td><td class="qm-n ${gap!=null&&gap<-10?'neg':''}">${gap==null?'—':(gap>0?'+':'')+gap}</td>
        <td style="white-space:nowrap">${r.moved?`<span class="muted" style="text-decoration:line-through">${fd(r.orig)}</span> → <b>${fd(r.p.end)}</b>`:fd(r.p.end)}</td>
        <td class="qm-n ${r.moved>0?'neg':''}" title="${E(r.lastH&&r.lastH.reason?'Last reason: '+r.lastH.reason:'')}">${r.moved?(r.moved>0?'+':'')+r.moved+' days':'—'}</td></tr>`; }).join('');
    return `<div class="qm-card" id="qmSum"><div class="toprow" style="margin-bottom:6px"><div><h3 style="margin:0">Project status${g?` — ${E(g.l)}`:''} <span class="muted" style="font-weight:400;font-size:12px">${rs.length} project${rs.length===1?'':'s'}</span></h3>
        <span class="muted" style="font-size:12px">Click a line in the Projects block above to filter${g?' · <a href="#" onclick="event.preventDefault();QM.grp(\''+E(g.k)+'\')">show all projects</a>':''}. Click a row to open the project.</span></div></div>
      <div class="qm-legend" style="margin:4px 0 8px"><span><i style="background:#cbd5e1;border-radius:2px;width:16px;height:8px"></i>Planned (time used)</span><span><i style="background:#28a8f4;border-radius:2px;width:16px;height:8px"></i>Actual (work done)</span><span><i style="background:#f59e0b;border-radius:2px;width:16px;height:8px"></i>Actual, more than 10 points behind plan</span></div>
      <div class="tablewrap" style="max-height:560px;overflow:auto"><table class="qm-t"><thead><tr><th>Project Code</th><th>Project Name</th><th>Stage</th><th>Status</th><th>Reason / delayed by</th><th>Planned vs actual</th><th class="qm-n">Planned</th><th class="qm-n">Actual</th><th class="qm-n">Gap</th><th>End date (planned → now)</th><th class="qm-n">Date moved</th></tr></thead><tbody>${rows||'<tr><td colspan="11" class="muted">No projects in this group.</td></tr>'}</tbody></table></div></div>`;
  }
  function latest(pid){
    const all=KEYS.flatMap(k=>list(k,{proj:pid,q:''}).map(r=>({k,r,d:recDate(k,r)}))).sort((a,b)=>String(b.d).localeCompare(String(a.d))).slice(0,10);
    if(!all.length) return '<p class="muted">Nothing recorded for this project yet. Pick a tab above and click + Add.</p>';
    const title=(k,r)=>({cn:r.no+' — '+(r.reason||''),si:r.no+' — '+(r.desc||''),rca:r.no+' — '+(r.describe||''),copq:r.desc,cs:(r.partName||'')+' — '+inr(calc.saving(r)),gp:(r.category?r.category+' — ':'')+(r.S||'')}[k]);
    return `<div class="tablewrap"><table class="qm-t"><thead><tr><th>Date</th><th>Register</th><th>Record</th></tr></thead><tbody>${all.map(x=>`<tr onclick="QM.edit('${x.k}','${E(x.r.id)}')"><td>${fd(x.d)}</td><td><span class="qm-chip" style="color:${REG[x.k].color}">${E(REG[x.k].name)}</span></td><td><div class="qm-clip">${E(title(x.k,x.r)||'')}</div></td></tr>`).join('')}</tbody></table></div>`;
  }

  /* ---------- timeline ---------- */
  const STC={'Completed':'#22c55e','In Progress':'#28a8f4','Under Review':'#8b5cf6','Pending Dependency':'#f59e0b','On Hold':'#f59e0b','Not Started':'#9aa8bb','Cancelled':'#c4c4c4'};
  QM.toggleSubs=()=>{ H.subs=!H.subs; render(); };
  function timeline(P,s){
    const tasks=(P.tasks||[]).filter(t=>String(t.name||'').trim());
    const ev=[
      ['cn','Change notes',s.cn.map(r=>({d:r.date||recDate('cn',r),r,t:r.no+': '+(r.reason||'')}))],
      ['si','Site issues',s.si.map(r=>({d:r.date,r,t:r.no+' ('+(r.status||'Open')+'): '+(r.desc||'')}))],
      ['rca','RCA & CAPA',s.rca.map(r=>({d:r.dateOccurred,r,t:r.no+' ('+(r.lifecycle||'Open')+'): '+(r.describe||'')}))],
      ['copq','Cost of poor quality',s.copq.map(r=>({d:r.dateId,r,t:inr(calc.copqC(r))+': '+(r.desc||'')}))],
      ['cs','Cost saving',s.cs.map(r=>({d:recDate('cs',r),r,t:inr(calc.saving(r))+': '+(r.partName||'')}))],
      ['gp','Good practices',s.gp.map(r=>({d:r.date,r,t:(r.category||'')+': '+(r.S||'')}))],
      ['un','Unplanned tasks',s.un.map(r=>({d:r.start,r,t:(typeof twName==='function'?twName(r.person):r.person)+' · '+(r.hours||0)+' h: '+(r.task||'')}))]
    ];
    const ds=[P.start,P.end,T()]; tasks.forEach(t=>{ ds.push(t.start,t.target); (t.subs||[]).forEach(x=>ds.push(x.start,x.target)); }); ev.forEach(e=>e[2].forEach(x=>ds.push(x.d)));
    const ok=ds.map(d=>String(d||'').slice(0,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if(!tasks.length&&!ev.some(e=>e[2].length)) return `<div class="qm-card"><h3>Project timeline</h3><p class="muted">No main tasks or records with dates yet. Add main tasks in Task Management to see the timeline.</p></div>`;
    let a=ok[0], b=ok[ok.length-1]; const ms=d=>new Date(d+'T00:00:00').getTime();
    const A=new Date(a+'T00:00:00'); A.setDate(1); const B=new Date(b+'T00:00:00'); B.setMonth(B.getMonth()+1,0);
    a=iso(A); b=iso(B); const span=Math.max(ms(b)-ms(a),864e5);
    const pos=d=>Math.max(0,Math.min(100,(ms(String(d).slice(0,10))-ms(a))/span*100));
    const months=[]; for(const d=new Date(A);d<=B;d.setMonth(d.getMonth()+1)) months.push(iso(d));
    const step=Math.ceil(months.length/12);
    const axis=`<div class="row" style="border:0"><div></div><div class="ax">${months.map((m,i)=>i%step?'':`<span style="left:${pos(m)}%">${MON[Number(m.slice(5,7))-1]} ${m.slice(0,4)}</span>`).join('')}</div></div>`;
    const grid=months.map(m=>`<div class="grid" style="left:${pos(m)}%"></div>`).join('')+`<div class="today" style="left:${pos(T())}%" title="Today"></div>`+(P.start?`<div class="pe" style="left:${pos(P.start)}%" title="Project start"></div>`:'')+(P.end?`<div class="pe" style="left:${pos(P.end)}%" title="Project end"></div>`:'');
    const bar=(x,cls)=>{ const st=typeof taskStatus==='function'&&!cls?taskStatus(x):(x.status||'Not Started'); const s0=x.start||x.target, e0=x.target||x.start; if(!s0) return ''; const l=pos(s0), w=Math.max(pos(e0)-l,0.6); return `<div class="bar ${cls||''}" style="left:${l}%;width:${w}%;background:${STC[st]||'#9aa8bb'}" title="${E((x.name||'')+' · '+st+' · '+fd(x.start)+' – '+fd(x.target))}"></div>`; };
    const lane=inner=>`<div class="lane">${grid}${inner}</div>`;
    const span0=t=>{ const ss=(t.subs||[]).filter(x=>x.status!=='Cancelled'); const st=[t.start,...ss.map(x=>x.start||x.target)].filter(Boolean).sort(), en=[t.target,...ss.map(x=>x.target||x.start)].filter(Boolean).sort(); return Object.assign({},t,{start:t.start||st[0]||'',target:t.target||en[en.length-1]||''}); };
    const tprog=t=>{ const ss=(t.subs||[]).filter(x=>x.status!=='Cancelled'&&String(x.name||'').trim()); const n=ss.length, d=ss.filter(x=>x.status==='Completed').length, pr=n?Math.round(ss.reduce((a,x)=>a+(typeof progOf==='function'?progOf(x):0),0)/n):(typeof progress==='function'?progress(t.status):0); return {n,d,pr}; };
    const trows=tasks.map(t=>{ const g=tprog(t), sp=span0(t); return `<div class="row"><div class="lab" title="${E(t.name)} · ${g.pr}% · ${g.d}/${g.n} subtasks completed"><b>${E(t.name)}</b><span class="tp">${g.pr}%${g.n?` · ${g.d}/${g.n}`:''}</span></div>${lane(sp.start?bar(sp):'<span class="nodate">No dates yet</span>')}</div>`; }).map((h,ix)=>h+(H.subs?(tasks[ix].subs||[]).filter(x=>x.status!=='Cancelled'&&String(x.name||'').trim()).map(x=>`<div class="row"><div class="lab sub" title="${E(x.name)}">${E(x.name)}${x.owner?' · '+E(typeof twName==='function'?twName(x.owner):x.owner):''}</div>${lane(bar(x,'sub'))}</div>`).join(''):'')).join('');
    const col=k=>k==='un'?'#f59e0b':REG[k].color;
    const erows=ev.filter(e=>e[2].length).map(([k,l,xs])=>`<div class="row"><div class="lab" style="flex-direction:row;align-items:center;justify-content:flex-start;white-space:nowrap"><i style="display:inline-block;flex:none;width:9px;height:9px;border-radius:50%;background:${col(k)};margin-right:6px"></i>${E(l)} <span class="muted">(${xs.length})</span></div>${lane(xs.filter(x=>x.d).map(x=>`<div class="dot" style="left:${pos(x.d)}%;background:${col(k)}" title="${E(fd(x.d)+' · '+String(x.t).slice(0,160))}" ${k!=='un'?`onclick="QM.edit('${k}','${E(x.r.id)}')"`:''}></div>`).join(''))}</div>`).join('');
    return `<div class="qm-card"><div class="toprow" style="margin-bottom:6px"><h3 style="margin:0">Project timeline</h3>${tasks.some(t=>(t.subs||[]).length)?`<button class="small" onclick="QM.toggleSubs()">${H.subs?'Hide subtasks':'Show subtasks'}</button>`:''}</div>
      <div class="qm-tl">${axis}${trows}${erows?`<div class="row" style="border:0;min-height:12px"><div></div><div></div></div>${erows}`:''}${axis}</div>
      <div class="qm-legend">${Object.entries(STC).filter(([k])=>k!=='Cancelled'&&k!=='Pending Dependency').map(([k,c])=>`<span><i style="background:${c};border-radius:3px"></i>${k}</span>`).join('')}<span><i style="background:#e5484d;width:2px;border-radius:0"></i>Today</span><span>Dashed lines: project start / end · click a dot to open the record</span></div></div>`;
  }

  /* ---------- register table ---------- */
  function cell(reg,r,f){
    const v=val(reg,r,f);
    if(f.t==='num'||f.num||f.t==='saving') return `<td class="qm-n">${f.money||/Rs|₹/.test(f.l)?(N(v)?inr(v):'—'):(N(v)||'—')}</td>`;
    if(f.t==='date') return `<td style="white-space:nowrap">${fd(v)}</td>`;
    if(f.t==='area') return `<td><div class="qm-clip" title="${E(v)}">${E(v||'')}</div></td>`;
    if(f.t==='proj') return `<td><b>${E(v||'—')}</b></td>`;
    if(f.k===REG[reg].numKey) return `<td style="white-space:nowrap">${E(v??'')}</td>`;
    if(f.k==='status'||f.k==='lifecycle'||f.k==='approval'||f.k==='severity'){ const c={Open:'#2563eb','In Progress':'#b45309',Closed:'#1f9d61',Approved:'#1f9d61',Rejected:'#e5484d',Pending:'#b45309',Raised:'#2563eb',Implemented:'#1f9d61',Critical:'#e5484d',High:'#e5484d',Medium:'#b45309',Low:'#71717a'}[v]||'inherit'; return `<td>${v?`<span class="qm-chip" style="color:${c}">${E(v)}</span>`:'—'}</td>`; }
    if(f.t==='person') return `<td><b>${E(v||'')}</b></td>`;
    return `<td>${E(v??'')}</td>`;
  }
  function regTable(reg){
    const D=REG[reg], rows=list(reg), cols=D.fields.filter(f=>f.list);
    const tot=D.money?rows.reduce((n,r)=>n+D.money(r),0):null, open=rows.filter(D.open).length;
    return `<p class="muted" style="margin:0 0 8px;font-size:12px">${rows.length} record${rows.length===1?'':'s'}${open?` · ${open} open`:''}${tot!=null?` · total ${inr(tot)}`:''}. Click a row to open it. Excel export and import use the same columns as your Quality Command Centre sheet.</p>
      <div class="tablewrap"><table class="qm-t"><thead><tr>${cols.map(f=>`<th class="${f.t==='num'||f.num||f.t==='saving'?'qm-n':''}">${E(shortLabel(f))}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r=>`<tr onclick="QM.edit('${reg}','${E(r.id)}')">${cols.map(f=>cell(reg,r,f)).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}" class="muted">No ${E(D.name.toLowerCase())} ${H.proj?'for this project ':''}in this period.${QM.can('Add')?' Click + Add to create one, or Import from Excel.':''}</td></tr>`}</tbody></table></div>`;
  }
  const shortLabel=f=>({describe:'Problem',containment:'Containment',reason:'Reason & change in brief'}[f.k])||f.l.replace(/\s*\(.*?\)\s*$/,'')||f.l;

  /* ---------- add / edit ---------- */
  function nextSr(reg){ return store()[reg].reduce((n,r)=>Math.max(n,N(r.sr)),0)+1; }
  function autoNo(kind,code){
    const L=store()[kind==='cn'?'cn':kind==='si'?'si':'rca'];
    if(kind==='rca'){ const g={}; L.forEach(r=>{ const m=String(r.no||'').match(/^(.*?)(\d+)$/); if(m){ const o=(g[m[1]] ||= {n:0,mx:0}); o.n++; o.mx=Math.max(o.mx,Number(m[2])); } }); const best=Object.entries(g).sort((x,y)=>y[1].n-x[1].n||y[1].mx-x[1].mx)[0]; return best?best[0]+(best[1].mx+1):(code?code+'-RCA-01':'RCA-01'); }
    const tag=kind==='cn'?'CN':'SI'; const n=L.filter(r=>key(codeOf(r))===key(code)).length+1; return code?`${code}-${tag}-${pad(n)}`:'';
  }
  function input(f,r,ro){
    const v=f.t==='proj'?codeOf(r):f.t==='calc'?f.fn(r):f.t==='saving'?calc.saving(r):f.t==='saved'?savedTxt(r.at):(r[f.k]??'');
    const id=`data-k="${f.k}"`, dis=ro?'disabled':'';
    if(f.t==='area') return `<textarea ${id} ${dis}>${E(v)}</textarea>`;
    if(f.t==='sel'||(f.t==='approval')){ const lock=ro||(f.t==='approval'&&!QM.approver()); return `<select ${id} ${lock?'disabled':''}>${(f.t==='sel'?['',...f.o]:f.o).map(o=>`<option ${String(v)===o?'selected':''}>${E(o)}</option>`).join('')}</select>`; }
    if(f.t==='list') return `<input ${id} ${dis} list="qmL_${f.k}" value="${E(v)}"><datalist id="qmL_${f.k}">${f.o.map(o=>`<option value="${E(o)}">`).join('')}</datalist>`;
    if(f.t==='person') return `<input ${id} ${dis} list="qmPeople" value="${E(v)}" placeholder="Name (or several, separated by commas)">`;
    if(f.t==='proj') return `<input ${id} ${dis} list="qmProjects" value="${E(v)}" placeholder="${f.dept?'Project code or department':'Project code'}">`;
    if(f.t==='calc'||f.t==='ro'||f.t==='saved'||f.t==='sr') return `<input ${id} readonly value="${E(f.num&&f.money?(N(v)?inr(v):''):v)}">`;
    if(f.t==='saving') return `<input ${id} type="number" step="any" value="${E(N(v)||'')}" ${r.entry==='Manual'&&!ro?'':'readonly'}>`;
    if(f.t==='num') return `<input ${id} ${dis} type="number" step="any" value="${E(v)}">`;
    if(f.t==='date') return `<input ${id} ${dis} type="date" value="${E(String(v).slice(0,10))}">`;
    if(f.t==='url') return `<div style="display:flex;gap:6px"><input ${id} ${dis} type="url" value="${E(v)}" placeholder="https://…">${v?`<a class="small" href="${E(v)}" target="_blank" rel="noopener" style="align-self:center;white-space:nowrap">Open</a>`:''}</div>`;
    return `<input ${id} ${dis} value="${E(v)}">`;
  }
  QM.edit=function(reg,id){
    const D=REG[reg]; if(!D) return;
    const old=id?store()[reg].find(r=>r.id===id):null;
    if(!old&&!QM.can('Add')) return toast('You do not have permission to add records.');
    const canSave=old?QM.can('Edit')||QM.approver():true, ro=old&&!QM.can('Edit');
    const P=H.proj?(db.projects||[]).find(p=>p.id===H.proj):null;
    const r=old?Object.assign({},old):{sr:nextSr(reg),projectId:P?P.id:'',projectCode:P?P.code:''};
    if(!old) D.fields.forEach(f=>{ if(f.def&&r[f.k]==null) r[f.k]=f.def(); if(f.fromProj&&P) r[f.k]=P[f.fromProj]||''; if(f.auto&&P) r[f.k]=autoNo(f.auto,P.code); });
    let sec='', html=`<datalist id="qmPeople">${people().map(n=>`<option value="${E(n)}">`).join('')}</datalist><datalist id="qmProjects">${projects().map(p=>`<option value="${E(p.code)}">${E(p.name||'')}</option>`).join('')}</datalist><div class="qm-form">`;
    let open=false;
    D.fields.forEach(f=>{
      if(f.k==='sr') return;
      if(f.t==='saved'&&!old) return;
      if(f.sec||!open){ if(open) html+='</div>'; html+=`${f.sec?`<div class="qm-sec">${E(f.sec)}</div>`:''}<div class="qm-grid" ${f.cols?`style="grid-template-columns:${typeof f.cols==='number'?`repeat(${f.cols},1fr)`:f.cols}"`:''}>`; open=true; }
      const lock=ro||(f.approver&&!QM.approver());
      html+=`<div class="${f.t==='area'&&!f.nf?'full':''}"><label>${E(f.l)}${f.req?' <span class="req">*</span>':''}</label>${input(f,r,lock)}</div>`;
    });
    html+='</div>';
    const tools=[];
    if(old&&QM.can('Delete')) tools.push(`<button type="button" class="small danger" data-del>Delete</button>`);
    if(old&&reg==='si'&&QM.can('Add')) tools.push(`<button type="button" class="small" data-mk="rca">Raise RCA & CAPA from this issue</button>`);
    if(old&&reg==='rca'&&QM.can('Add')) tools.push(`<button type="button" class="small" data-mk="copq">Add COPQ for this RCA</button>`);
    if(old) html+=`<p class="muted" style="font-size:12px;margin:10px 0 0">Sr. No. ${E(old.sr)} · saved ${E(savedTxt(old.at))}${old.by?' by '+E(old.by):''}${old.editedAt?` · last edited ${E(savedTxt(old.editedAt))}${old.editedBy?' by '+E(old.editedBy):''}`:''}</p>`;
    html+=(tools.length?`<div class="qm-tools" style="margin-top:10px">${tools.join('')}</div>`:'')+'</div>';
    const title=(old?(ro?'View ':'Edit '):'Add ')+D.one+(old&&old.no?' — '+old.no:'')+(old&&!old.no?' — Sr. '+old.sr:'');
    const m=twModal(E(title),html,canSave?(m)=>doSave(m):null,old?'Save changes':'Save',true);
    const dlg=m.querySelector('.tw-dlg'); if(dlg) dlg.style.width='min(980px,100%)';
    const get=()=>{ const o={}; m.querySelectorAll('[data-k]').forEach(el=>{ o[el.dataset.k]=el.value; }); return o; };
    const live=()=>{ const x=Object.assign({},r,get()); D.fields.forEach(f=>{ const el=m.querySelector(`[data-k="${f.k}"]`); if(!el) return;
      if(f.t==='calc'){ const v=f.fn(x); el.value=f.num&&f.money?(N(v)?inr(v):''):v; }
      if(f.t==='saving'){ if(x.entry==='Manual'){ el.readOnly=!!ro; } else { el.readOnly=true; el.value=calc.saving(x)||''; } } }); };
    m.addEventListener('input',live); m.addEventListener('change',e=>{
      const el=e.target; if(!el.dataset||el.dataset.k!=='proj'||old) return; const p=projByCode(el.value); if(!p) return;
      D.fields.forEach(f=>{ const x=m.querySelector(`[data-k="${f.k}"]`); if(!x) return; if(f.auto) x.value=autoNo(f.auto,p.code); if(f.fromProj&&!x.value) x.value=p[f.fromProj]||''; }); live(); });
    live();
    m.querySelector('[data-del]')?.addEventListener('click',()=>{ if(!confirm(`Delete this ${D.one}? This cannot be undone.`)) return; store()[reg]=store()[reg].filter(x=>x.id!==old.id); save0(); m.remove(); toast(D.one[0].toUpperCase()+D.one.slice(1)+' deleted'); render(); });
    m.querySelectorAll('[data-mk]').forEach(b=>b.addEventListener('click',()=>{ const to=b.dataset.mk; m.remove(); QM.edit(to); setTimeout(()=>{ const n=document.querySelectorAll('.tw-modal'); const mm=n[n.length-1]; if(!mm) return; const set=(k,v)=>{ const el=mm.querySelector(`[data-k="${k}"]`); if(el&&v!=null&&v!==''){ el.value=v; el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new Event('input',{bubbles:true})); } };
        set('proj',codeOf(old));
        if(to==='rca'){ set('describe',old.desc); set('dateOccurred',old.date); set('link',old.link); set('siNo',old.no); set('team',old.owner||old.reportedBy); }
        if(to==='copq'){ set('desc',old.describe); set('dateId',old.dateOccurred); set('remarks',old.rootCause); set('rcaNo',old.no); set('responsible',old.team); }
      },30); }));
    function doSave(m){
      const x=get(), rec=old||{id:(typeof uid==='function'?uid():String(Date.now())),at:new Date().toISOString(),by:me()};
      for(const f of D.fields){ if(f.req&&!String(x[f.k]??'').trim()) return `${f.l} is required.`; }
      if(x.proj!==undefined){ const p=projByCode(x.proj); const f=D.fields.find(y=>y.t==='proj'); if(!p&&!f.dept) return `Project code "${x.proj}" is not in the tool. Pick one from the list.`; rec.projectId=p?p.id:''; rec.projectCode=p?p.code:String(x.proj).trim(); }
      if(D.numKey&&x[D.numKey]){ const dup=store()[reg].find(y=>y.id!==rec.id&&key(y[D.numKey])===key(x[D.numKey])); if(dup) return `${D.fields.find(f=>f.k===D.numKey).l} "${x[D.numKey]}" already exists.`; }
      const prevAppr=rec.approval;
      D.fields.forEach(f=>{ if(['proj','calc','ro','saved','sr'].includes(f.t)) return; if(f.k in x&&(!ro||(f.t==='approval'||f.approver))){ if(f.t==='approval'&&!QM.approver()) return; if(f.approver&&!QM.approver()) return; rec[f.k]=f.t==='num'||f.t==='saving'?(x[f.k]===''?'':N(x[f.k])):x[f.k]; } });
      D.fields.forEach(f=>{ if(f.t==='calc') rec[f.k]=f.fn(rec); });
      if(reg==='cs'&&rec.entry!=='Manual') rec.saving=calc.saving(rec);
      if(reg==='rca'&&!rec.approval) rec.approval='Pending';
      if(reg==='rca'&&rec.approval!==prevAppr&&QM.approver()){ if(rec.approval==='Pending'){ rec.approvedBy=''; rec.approvalDate=''; } else { rec.approvedBy=me()||String(TW.me||''); rec.approvalDate=new Date().toLocaleString('en-IN'); } }
      if(!old){ rec.sr=nextSr(reg); store()[reg].push(rec); } else { rec.editedAt=new Date().toISOString(); rec.editedBy=me(); }
      save0(); toast(old?'Saved':D.one[0].toUpperCase()+D.one.slice(1)+' added'); setTimeout(render,0);
    }
  };
  function save0(){ if(typeof save==='function') save(false); }

  QM.editBudget=function(pid){
    const p=(db.projects||[]).find(x=>x.id===pid); if(!p) return;
    if(!QM.budgetCan()) return toast('You need Project Setup Edit access to change the budget.');
    twModal(`Budget — ${E(p.code)}`,`<div class="qm-form"><div class="qm-grid"><div><label>Allocated budget (₹)</label><input type="number" min="0" step="any" data-b value="${E(p.budget??'')}"></div><div><label>Actual cost (₹)</label><input type="number" min="0" step="any" data-a value="${E(p.actualCost??'')}"></div></div><p class="muted" style="font-size:12px">Project-level figures in INR, entered by hand. Also editable in Project Setup.</p></div>`,
      m=>{ const b=m.querySelector('[data-b]').value, a=m.querySelector('[data-a]').value; if(N(b)<0||N(a)<0) return 'Amounts cannot be negative.'; p.budget=b===''?'':N(b); p.actualCost=a===''?'':N(a); p.costUpdatedAt=new Date().toISOString(); save0(); toast('Budget saved'); setTimeout(render,0); },'Save');
  };

  /* ---------- Excel export ---------- */
  function sheetOf(reg,rows,scope){
    const D=REG[reg], fs=D.fields;
    return {name:D.name.replace('&','and'),head:2,widths:fs.map(f=>f.w||16),rows:[[`${D.name} — ${scope} — exported ${fd(T())}`],fs.map(f=>f.l),...rows.map(r=>fs.map(f=>{ const v=val(reg,r,f); return (f.t==='num'||f.num||f.t==='saving'||f.t==='sr')&&v!==''&&v!=null&&!isNaN(N(v))?N(v):(v??''); }))]};
  }
  const scopeTxt=()=>{ const P=H.proj&&(db.projects||[]).find(p=>p.id===H.proj); return (P?P.code+' — '+(P.name||''):'All projects')+' — '+period().label; };
  function download(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(a.href); },500); }
  const fname=s=>s.replace(/[^A-Za-z0-9_-]+/g,'_');
  QM.exportReg=function(reg){
    try{ if(!window.RP||!RP.workbook) throw new Error('Excel writer not loaded'); const rows=list(reg).sort((a,b)=>N(a.sr)-N(b.sr));
      download(RP.workbook([sheetOf(reg,rows,scopeTxt())]),fname(`EDPT_${REG[reg].name}_${H.proj?codeOf({projectId:H.proj}):'All'}_${T()}`)+'.xlsx'); toast(`Excel downloaded: ${rows.length} row(s).`);
    }catch(e){ console.error(e); toast('Export failed: '+e.message); }
  };
  QM.exportAll=function(){
    try{ ACT=null;
      const ps=H.proj?projects().filter(p=>p.id===H.proj):projects();
      const sum={name:'Project summary',head:2,widths:[12,30,20,12,16,16,16,12,16,12,12,12,16,16,12,12,12],rows:[[`Project summary — ${scopeTxt()} — exported ${fd(T())}`],
        ['Project code','Project','Customer','Stage','Allocated budget (Rs)','Actual cost (Rs)','Variance (Rs)','Change notes','CN cost effect (Rs)','Site issues','Open site issues','RCA & CAPA','COPQ (Rs)','Actual saving (Rs)','Good practices','Unplanned tasks','Unplanned hours'],
        ...ps.map(p=>{ const x=sums(p.id); return [p.code,p.name||'',p.customer||'',p.stage||'',N(p.budget),N(p.actualCost),N(p.budget)-N(p.actualCost),x.cn.length,x.cnCost,x.si.length,x.siOpen,x.rca.length,x.copqC,x.csAct,x.gp.length,x.un.length,Math.round(x.unH*10)/10]; })]};
      const un={name:'Unplanned tasks',head:2,widths:[12,12,22,36,10,14,40],rows:[[`Unplanned tasks — ${scopeTxt()}`],['Project code','Date','Person','Task','Hours','Status','Reason / remarks'],
        ...unplannedOf(H.proj).filter(r=>inPeriod(r.start)).map(r=>[r.project?r.project.code:'',r.start||'',typeof twName==='function'?twName(r.person):r.person,r.task||'',r.hours||0,r.status||'',r.remarks||''])]};
      download(RP.workbook([sum,...KEYS.map(k=>sheetOf(k,list(k).sort((a,b)=>N(a.sr)-N(b.sr)),scopeTxt())),un]),fname(`EDPT_Project_Hub_${H.proj?codeOf({projectId:H.proj}):'All'}_${T()}`)+'.xlsx');
      toast('Excel downloaded: summary, all registers and unplanned tasks.');
    }catch(e){ console.error(e); toast('Export failed: '+e.message); }
  };

  /* ---------- Excel import (reads .xlsx in the browser) ---------- */
  async function readXlsx(buf){
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
    let path='xl/worksheets/sheet1.xml';
    try{ const wb=X(await get('xl/workbook.xml')), sh=tags(wb,'sheet')[0], rid=sh.getAttribute('r:id'), rel=tags(X(await get('xl/_rels/workbook.xml.rels')),'Relationship').find(r=>r.getAttribute('Id')===rid);
      if(rel){ const t=rel.getAttribute('Target'); path=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,''); } }catch(er){}
    const doc=X(await get(path)||''), out=[];
    const ci=ref=>{ const m=String(ref).match(/^[A-Z]+/); let n=0; for(const ch of m?m[0]:'A') n=n*26+ch.charCodeAt(0)-64; return n-1; };
    tags(doc,'row').forEach(r=>{ const ri=Number(r.getAttribute('r'))-1, a=[]; tags(r,'c').forEach(c=>{ const t=c.getAttribute('t'); let v='';
      if(t==='s') v=ss[Number(tags(c,'v')[0]?.textContent)]??''; else if(t==='inlineStr') v=tags(c,'t').map(x=>x.textContent).join(''); else { const vv=tags(c,'v')[0]; v=vv?vv.textContent:''; if(t!=='str'&&t!=='e'&&v!==''&&!isNaN(v)) v=Number(v); }
      a[ci(c.getAttribute('r'))]=v; }); out[ri]=a; });
    return [...out].map(r=>r||[]);
  }
  QM.readXlsx=readXlsx;
  const toIsoDate=v=>{ if(v===''||v==null) return ''; if(typeof v==='number'&&v>20000&&v<80000){ const d=new Date(Math.round((v-25569)*864e5)); return d.toISOString().slice(0,10); }
    const s=String(v).trim(); let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/); if(m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`; return s; };
  const toIsoTime=v=>{ if(v===''||v==null) return ''; if(typeof v==='number') return new Date(Math.round((v-25569)*864e5)).toISOString();
    const m=String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if(m){ let h=Number(m[4]); if(m[7]){ const pm=/pm/i.test(m[7]); if(pm&&h<12) h+=12; if(!pm&&h===12) h=0; } return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),h,Number(m[5]),Number(m[6]||0)).toISOString(); }
    const d=new Date(v); return isNaN(d)?String(v):d.toISOString(); };
  function mapRows(reg,rows){
    const D=REG[reg]; let hi=-1, map=null, best=0;
    for(let i=0;i<Math.min(rows.length,8);i++){ const used=new Set(), mp=[]; let hits=0;
      (rows[i]||[]).forEach((h,c)=>{ const k=key(h); if(!k) return; const f=D.fields.find(f=>!used.has(f.k)&&key(f.l)===k); if(f){ used.add(f.k); mp[c]=f; hits++; } });
      if(hits>best){ best=hits; hi=i; map=mp; } }
    if(best<3) throw new Error(`The columns do not match the ${D.name} sheet. The first row of headings must match the export from this tool (for example "${D.fields[1].l}", "${D.fields[2].l}").`);
    const recs=[];
    rows.slice(hi+1).forEach(row=>{ if(!row||!row.some(v=>String(v??'').trim()!=='')) return; const r={};
      map.forEach((f,c)=>{ if(!f) return; let v=row[c]; if(v==null) v='';
        if(f.t==='date') v=toIsoDate(v); else if(f.t==='saved') v=toIsoTime(v); else if(f.t==='num'||f.t==='saving'||f.t==='sr'||f.num) v=v===''?'':N(v); else v=String(v).trim();
        if(f.t==='saved') r.at=v; else if(f.t==='proj') r.projectCode=String(v); else r[f.k]=v; });
      recs.push(r); });
    return recs;
  }
  QM.mapRows=mapRows;
  QM.importRows=function(reg,rows){
    const D=REG[reg], recs=mapRows(reg,rows), L=store()[reg]; let added=0, skipped=0, noProj=0;
    recs.forEach(r=>{ const p=projByCode(r.projectCode); r.projectId=p?p.id:''; if(p) r.projectCode=p.code; else if(r.projectCode) noProj++;
      const dup=L.find(y=>D.numKey&&r[D.numKey]?key(y[D.numKey])===key(r[D.numKey])&&key(codeOf(y))===key(r.projectCode):(r.sr!==''&&N(y.sr)===N(r.sr)&&key(codeOf(y))===key(r.projectCode)));
      if(dup){ skipped++; return; }
      if(r.sr===''||r.sr==null||L.some(y=>N(y.sr)===N(r.sr))) r.sr=nextSr(reg);
      r.id=(typeof uid==='function'?uid():String(Math.random()).slice(2)); r.at=r.at||new Date().toISOString(); r.by=r.by||('Imported by '+me()); r.imported=true;
      D.fields.forEach(f=>{ if(f.def&&(r[f.k]==null||r[f.k]==='')&&f.k!=='approval'&&f.k!=='lifecycle'&&f.k!=='status') r[f.k]=f.k==='date'&&r.at?iso(new Date(r.at)):f.def(); });
      if(reg==='cn'&&!r.status) r.status=r.approvedBy?'Approved':'Raised';
      if(reg==='rca'&&!r.approval) r.approval='Pending';
      if(reg==='rca'&&!r.lifecycle) r.lifecycle='Open';
      if(reg==='si'&&!r.status) r.status='Open';
      L.push(r); added++; });
    return {added,skipped,noProj,total:recs.length};
  };
  QM.importPick=function(reg){
    if(!QM.can('Add')) return toast('You do not have permission to import.');
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx'; inp.style.display='none'; document.body.appendChild(inp);
    inp.onchange=async()=>{ const f=inp.files[0]; inp.remove(); if(!f) return;
      try{ const rows=await readXlsx(await f.arrayBuffer()); const n=mapRows(reg,rows).length; if(!n) return toast('No rows found under the headings.');
        if(!confirm(`Import ${n} row(s) from "${f.name}" into ${REG[reg].name}?\nRows that are already in the tool (same number and project) are skipped.`)) return;
        const res=QM.importRows(reg,rows); save0(); render();
        twModal('Import finished',`<p><b>${res.added}</b> added, <b>${res.skipped}</b> skipped (already in the tool) out of ${res.total} row(s).</p>${res.noProj?`<p class="muted">${res.noProj} row(s) have a project code that is not in Project Setup. They are kept and shown under All projects. Add the project in Project Setup with the same code and they link automatically.</p>`:''}`);
      }catch(e){ console.error(e); twModal('Import failed',`<p>${E(e.message)}</p>`); }
    };
    inp.click();
  };

  /* ---------- v30.0: one Project Dashboard (Dashboard + Project Hub) ---------- */
  function placeHub(){
    const dash=document.getElementById('dashboard'), root=document.getElementById('qmRoot'); if(!dash||!root) return;
    const home=document.getElementById('twHome');
    if(home&&home.parentNode===dash){ if(home.nextElementSibling!==root) home.after(root); } else if(root.parentNode!==dash) dash.appendChild(root);
    /* the old panels are replaced by the Project Dashboard; they stay in the page (hidden) because other features read from them */
    [document.getElementById('metrics'),document.getElementById('projectOverviewRows'),document.getElementById('selectedProjectPanel')].forEach(el=>{ const p=el&&(el.id==='selectedProjectPanel'?el:el.closest('.panel')); if(p&&p!==root) p.classList.add('qm-gone'); });
    document.getElementById('hub')?.classList.add('hidden');
  }
  QM.placeHub=placeHub;
  const rd0=window.renderDashboard;
  if(typeof rd0==='function') window.renderDashboard=function(){ const r=rd0.apply(this,arguments); try{ placeHub(); moveSubtasks(); render(); }catch(e){ console.warn('Project Dashboard',e); } return r; };

  /* Subtask Workload Details → Daily Tasks, below the task list (same update format) */
  function moveSubtasks(){
    const body=document.getElementById('subtaskDetails'), daily=document.getElementById('daily'); if(!body||!daily) return null;
    const panel=body.closest('.panel'); if(!panel) return null;
    panel.classList.add('qm-gone');
    if(panel.parentNode!==daily){ panel.id='dtSubPanel'; daily.appendChild(panel);
      const acts=panel.querySelector('.toprow .actions');
      if(acts&&!document.getElementById('dtSubProj')){ const s0=document.createElement('select'); s0.id='dtSubProj'; s0.title='Project'; s0.style.cssText='width:auto;min-width:200px;max-width:300px'; s0.onchange=()=>window.renderSubtaskDetails(); acts.insertBefore(s0,acts.firstChild); }
      const p=panel.querySelector('p.muted'); if(p) p.textContent='Plan and update your subtasks here: status, progress, dates and hours. Changes save straight to Task Management.';
    } else if(daily.lastElementChild!==panel) daily.appendChild(panel);
    const s0=document.getElementById('dtSubProj');
    if(s0){ const v=s0.value||'ALL'; s0.innerHTML='<option value="ALL">All projects</option>'+projects().map(p=>`<option value="${E(p.id)}">${E(p.code+' — '+(p.name||''))}</option>`).join(''); s0.value=[...s0.options].some(o=>o.value===v)?v:'ALL'; }
    return panel;
  }
  QM.moveSubtasks=moveSubtasks;
  const rsd0=window.renderSubtaskDetails;
  let dBusy=false;
  if(typeof rsd0==='function') window.renderSubtaskDetails=function(){
    /* On Daily Tasks the editable subtasks live in section 2; rebuild that so row numbers always match */
    try{ if(TW.tab==='daily'&&!dBusy&&typeof window.twDailyRender==='function'){ window.twDailyRender(); return; } }catch(e){}
    if(dBusy) return;
    return rsd0.apply(this,arguments);
  };
  const dr0=window.twDailyRender;
  /* Daily Tasks: three sections (Daily tasks, Subtasks, Project Review tasks), people inside each section; both collapse */
  const DKEY='edptDailySections';
  const dState=()=>{ try{ const o=JSON.parse(localStorage.getItem(DKEY)||'{}'); return {sec:o.sec||{},per:o.per||{}}; }catch(e){ return {sec:{},per:{}}; } };
  const dSave=o=>{ try{ localStorage.setItem(DKEY,JSON.stringify(o)); }catch(e){} };
  function dApply(){
    const tb=document.querySelector('#twDailyList table.tw-dtab tbody'); if(!tb) return; const st=dState();
    let sk=null, pk=null;
    [...tb.children].forEach(r=>{
      if(r.classList.contains('dt-s2')){ sk=r.dataset.k; pk=null; const c=!!st.sec[sk]; r.classList.toggle('closed',c); return; }
      const sc=!!st.sec[sk];
      if(r.classList.contains('dt-p2')){ pk=sk+'|'+r.dataset.p; r.style.display=sc?'none':''; r.classList.toggle('closed',!!st.per[pk]); return; }
      r.style.display=sc||(pk&&st.per[pk])?'none':'';
    });
  }
  QM.dToggle=(type,key)=>{ const st=dState(); st[type][key]=!st[type][key]; dSave(st); dApply(); };
  QM.dAll=open=>{ const tb=document.querySelector('#twDailyList table.tw-dtab tbody'); const st={sec:{},per:{}};
    if(!open&&tb){ tb.querySelectorAll('tr.dt-p2').forEach(r=>{ st.per[r.dataset.k+'|'+r.dataset.p]=true; }); }
    dSave(st); dApply(); };
  QM.dSecOnly=()=>{ const tb=document.querySelector('#twDailyList table.tw-dtab tbody'); const st={sec:{},per:{}}; tb?.querySelectorAll('tr.dt-s2').forEach(r=>{ st.sec[r.dataset.k]=true; }); dSave(st); dApply(); };
  function dtSections(){
    const tb=document.querySelector('#twDailyList table.tw-dtab tbody'); if(!tb) return;
    const people=[], byP={}; let cur=null;
    [...tb.children].forEach(r=>{
      if(r.classList.contains('dt-grp')){ const name=((r.querySelector('b')||r).textContent||'').trim(); cur=byP[name]||(byP[name]={name,rows:[]}); if(!people.includes(cur)) people.push(cur); return; }
      if(r.classList.contains('dt-s2')||r.classList.contains('dt-p2')) return;
      if(cur&&r.cells.length>3) cur.rows.push(r);
    });
    if(!people.length) return;
    const srcOf=r=>{ const t=(r.cells[3]?.textContent||'').trim(); return t==='Daily'?0:(t==='Task Mgmt'||t==='Project Schedule')?1:2; };
    const isClosed=r=>/Closed/i.test(r.cells[11]?.textContent||''), isOver=r=>!isClosed(r)&&Number((r.cells[10]?.textContent||'0').trim())>0;
    const chips=l=>{ const o=l.filter(r=>!isClosed(r)).length, c=l.length-o, v=l.filter(isOver).length; return `<span class="tw-chip blue">${o} open</span> <span class="tw-chip green">${c} closed</span>${v?` <span class="tw-chip red">${v} overdue</span>`:''}`; };
    const L=['Daily tasks','Sub milestones (Task Management)','Project Review tasks'], C=['#1f9d61','#2563eb','#7c3aed'];
    const frag=document.createDocumentFragment(); let n=0; const LIST=[];
    const pd=t=>{ const m=String(t||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m?new Date(+m[3],+m[2]-1,+m[1],12):null; };
    const openDays=r=>{ const c=r.cells; if(!c||c.length<12) return; const s0=pd(c[6]?.textContent), closed=isClosed(r), e0=closed?pd(c[7]?.textContent):new Date(T()+'T12:00:00'); if(s0&&e0&&c[9]){ const d=Math.max(0,Math.round((e0-s0)/864e5)); c[9].textContent=d; c[9].title=closed?'Days from start to finish':'Days open since start'; } };
    const itemOf=r=>{ const m=(r.innerHTML.match(/dtOpenTM\('([^']*)','([^']*)','([^']*)'\)/)||[]); if(!m[3]) return null; const p=(db.projects||[]).find(x=>x.id===m[1]); if(!p||typeof projectLeafItems!=='function') return null; return projectLeafItems(p).find(x=>x.item.id===m[3])||null; };
    const sub=(fn,...a)=>{ try{ return typeof fn==='function'?fn(...a):''; }catch(e){ return ''; } };
    const ed=(x,f)=>{ try{ return typeof twCan==='function'&&twCan(x,f)?'':'disabled'; }catch(e){ return 'disabled'; } };
    const adm=(()=>{ try{ return typeof twAdmin==='function'&&twAdmin(); }catch(e){ return false; } })();
    const editPct=(()=>{ try{ return typeof TW_EDIT_PCT!=='undefined'?TW_EDIT_PCT:null; }catch(e){ return null; } })();
    const STL=(()=>{ try{ return typeof TW_ST!=='undefined'?TW_ST:['Not Started','In Progress','Under Review','Pending Dependency','Completed','On Hold','Cancelled']; }catch(e){ return ['Not Started','In Progress','Under Review','Pending Dependency','Completed','On Hold','Cancelled']; } })();
    function subTable(items){
      const body=items.map(x=>{ const i=LIST.push(x)-1, s0=x.item, pr=typeof progOf==='function'?progOf(s0):(s0.pct||0);
        return `<tr><td>${E(sub(window.lkN||(typeof lkN==='function'?lkN:null),x.p,s0.id)||'')}</td><td title="${E(x.p.name||'')}"><b>${E(x.p.code||'—')}</b></td><td>${E(x.t.name)}</td><td><b>${E(s0.name)}</b></td>
        <td><select class="tm-in" ${ed(x,'status')} onchange="twQU(${i},'status',this.value)" aria-label="Status">${STL.map(v=>`<option ${v===(s0.status||'Not Started')?'selected':''}>${v}</option>`).join('')}</select></td>
        <td class="tm-nw"><input class="tm-in tm-num" type="number" min="0" max="100" step="5" value="${pr}" ${ed(x,'pct')===''&&(!editPct||editPct.includes(s0.status))?'':'disabled'} onchange="twQU(${i},'pct',this.value)" aria-label="Progress">%</td>
        <td><input type="date" class="tm-in tm-date" value="${E(s0.start||'')}" ${ed(x,'start')} onchange="twQU(${i},'start',this.value)" aria-label="Start date"></td>
        <td><input type="date" class="tm-in tm-date" value="${E(s0.target||'')}" ${ed(x,'target')} onchange="twQU(${i},'target',this.value)" aria-label="Target date"></td>
        <td class="tm-c"><input class="tm-in tm-num" type="number" min="1" step="1" value="${s0.start&&s0.target&&typeof lkDays==='function'?lkDays(s0.start,s0.target):''}" ${adm?'':'disabled'} onchange="twQD(${i},this.value)" aria-label="Days"></td>
        <td class="tm-c">${E(sub(typeof lkFromTxt==='function'?lkFromTxt:null,x.p,s0)||'—')}</td><td class="tm-c">${E(sub(typeof lkToTxt==='function'?lkToTxt:null,x.p,s0.id)||'—')}</td><td class="tm-c ${x.delay?'overdue':''}">${x.delay||0}</td>
        <td><input class="tm-in tm-num" type="number" min="0" step="0.5" value="${Number(s0.plannedHours||0)}" ${ed(x,'plannedHours')} onchange="twQU(${i},'plannedHours',this.value)" aria-label="Estimated hours"></td>
        <td><input class="tm-in tm-num" type="number" min="0" step="0.5" value="${Number(s0.actualHours||0)}" ${ed(x,'actualHours')} onchange="twQU(${i},'actualHours',this.value)" aria-label="Actual hours"></td>
        <td><input class="tm-in" value="${E(s0.dependency||'')}" placeholder="Dependency / remark" ${ed(x,'dependency')} onchange="twQU(${i},'dependency',this.value)" aria-label="Dependency"></td>
        <td><button class="small" onclick="twOpenRow(${i})">Open</button></td></tr>`; }).join('');
      return `<div class="tablewrap"><table class="dt-subt"><thead><tr><th title="Number in Task Management">TM No.</th><th>Project</th><th>Milestone</th><th>Sub milestone / Activity</th><th>Status</th><th>Progress</th><th>Start</th><th>Target</th><th>Days</th><th>Linked From</th><th>Linked To</th><th>Delay</th><th>Est. Hrs</th><th>Actual Hrs</th><th>Dependency</th><th></th></tr></thead><tbody>${body}</tbody></table></div>`;
    }
    [0,1,2].forEach(k=>{
      const ps=people.map(p=>({p,l:p.rows.filter(r=>srcOf(r)===k)})).filter(x=>x.l.length), all=ps.flatMap(x=>x.l);
      if(!all.length&&typeof DT==='object'&&DT.src&&DT.src!=='all') return;
      const h=document.createElement('tr'); h.className='dt-s2'; h.dataset.k=String(k);
      h.innerHTML=`<td colspan="13"><span class="dt-car">▾</span><span class="dt-dot" style="background:${C[k]}"></span><b>${k+1}. ${L[k]}</b> <span class="muted">${all.length} task${all.length===1?'':'s'} · ${ps.length} ${ps.length===1?'person':'people'}</span> ${all.length?chips(all):''}</td>`;
      h.onclick=()=>QM.dToggle('sec',String(k)); frag.appendChild(h);
      if(!all.length){ const e=document.createElement('tr'); e.className='dt-empty'; e.innerHTML=`<td colspan="13" class="muted" style="padding-left:34px">No ${L[k].toLowerCase()} for the selected people and dates.</td>`; frag.appendChild(e); return; }
      ps.forEach(({p,l})=>{
        const pr=document.createElement('tr'); pr.className='dt-p2'; pr.dataset.k=String(k); pr.dataset.p=p.name;
        pr.innerHTML=`<td colspan="13"><span class="dt-car">▾</span><b>${E(p.name)}</b> ${chips(l)}</td>`;
        pr.onclick=()=>QM.dToggle('per',k+'|'+p.name); frag.appendChild(pr);
        if(k===1){ const its=[], rest=[]; l.forEach(r=>{ const x=itemOf(r); if(x) its.push(x); else rest.push(r); });
          rest.forEach(r=>{ n++; if(r.cells[0]) r.cells[0].textContent=n; r.style.display=''; frag.appendChild(r); });
          if(its.length){ const tr=document.createElement('tr'); tr.className='dt-subrow'; tr.innerHTML=`<td colspan="13" style="padding:4px 8px 10px 30px">${subTable(its)}</td>`; frag.appendChild(tr); }
          return; }
        l.forEach(r=>{ n++; if(r.cells[0]) r.cells[0].textContent=n; openDays(r); r.style.display=''; frag.appendChild(r); });
      });
    });
    tb.innerHTML=''; tb.appendChild(frag); window._twRows=LIST;
    const box=document.getElementById('twDailyList');
    box.querySelectorAll('.dt-colbar').forEach(b=>b.remove());
    const bar=document.createElement('div'); bar.className='dt-colbar dt-colbar2';
    bar.innerHTML='<button class="small" onclick="QM.dAll(true)">Expand all</button><button class="small" onclick="QM.dAll(false)">Collapse people</button><button class="small" onclick="QM.dSecOnly()">Collapse sections</button>';
    const wrap=tb.closest('.tablewrap')||tb.closest('table'); wrap.parentNode.insertBefore(bar,wrap);
    dApply();
  }
  function dtMonth(){
    const bar=document.querySelector('#twDailyTabs .dt-bar'); if(!bar||bar.querySelector('#dtMonth')) return;
    const ds=[...bar.querySelectorAll('select')].find(x=>x.getAttribute('aria-label')==='Date');
    const m=(typeof TWD==='object'&&TWD.rng==='custom'&&TWD.from&&TWD.to&&TWD.from.slice(0,7)===TWD.to.slice(0,7)&&TWD.from.endsWith('-01'))?TWD.from.slice(0,7):'';
    const w=document.createElement('label'); w.style.cssText='display:flex;align-items:center;gap:6px;margin:0;font-size:12px;color:var(--sb-mut,#71717a)';
    w.innerHTML=`Month <input type="month" id="dtMonth" value="${m}" style="width:auto">`;
    (ds?ds.after(w):bar.appendChild(w));
    w.querySelector('input').onchange=e=>{ const v=e.target.value; if(!v) return; const [y,mo]=v.split('-').map(Number); TWD.rng='custom'; TWD.from=v+'-01'; TWD.to=iso(new Date(y,mo,0,12)); twDailyRender(); };
  }
  if(typeof dr0==='function') window.twDailyRender=function(){ if(dBusy) return; dBusy=true; let r; try{ r=dr0.apply(this,arguments); try{ moveSubtasks(); dtSections(); dtMonth(); }catch(e){ console.warn(e); } } finally{ dBusy=false; } return r; };
  const dsc=document.createElement('style'); dsc.textContent=`
    #twDailyList tr.dt-s2 td{cursor:pointer;user-select:none;font-size:14px;padding:10px 10px;background:color-mix(in srgb,var(--sb-line,#e4e4e7) 40%,transparent);border-top:2px solid var(--sb-line,#e4e4e7)}
    #twDailyList tr.dt-p2 td{cursor:pointer;user-select:none;padding:7px 10px 7px 30px;background:color-mix(in srgb,var(--sb-line,#e4e4e7) 16%,transparent)}
    #twDailyList tr.dt-s2 .dt-car,#twDailyList tr.dt-p2 .dt-car{display:inline-block;width:16px;color:var(--sb-mut,#71717a);transition:transform .15s}
    #twDailyList tr.dt-s2.closed .dt-car,#twDailyList tr.dt-p2.closed .dt-car{transform:rotate(-90deg)}
    #twDailyList .dt-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px}
    #twDailyList tr.dt-s2 .tw-chip,#twDailyList tr.dt-p2 .tw-chip{margin-left:4px}
    #twDailyList table.dt-subt{width:100%;border-collapse:collapse;font-size:13px} #twDailyList table.dt-subt th{font-size:12px;font-weight:600;color:var(--sb-mut,#71717a);text-align:left;padding:6px;white-space:nowrap;border-bottom:1px solid var(--sb-line,#e4e4e7)} #twDailyList table.dt-subt td{padding:5px 6px;border-bottom:1px solid var(--sb-line,#e4e4e7);vertical-align:middle} #twDailyList table.dt-subt .tm-num{width:70px} #twDailyList table.dt-subt .tm-date{width:140px} #twDailyList tr.dt-subrow>td{background:transparent}`; document.head.appendChild(dsc);

  /* Project Setup: one project list (setup columns + budget and register columns) */
  const ps0=window.psListRender;
  window.psListRender=function(){
    const old=document.getElementById('psList'); if(old) old.remove(); document.getElementById('psMoved')?.remove();
    const sec=document.getElementById('setup'); if(!sec) return;
    let n=document.getElementById('psList2'); if(!n){ n=document.createElement('div'); n.id='psList2'; n.className='panel'; sec.appendChild(n); }
    try{ store(); ACT=null; n.innerHTML=projList(projects(),{q:H.sq||'',stage:H.stage||''}); }catch(e){ console.warn(e); }
  };
  try{ window.psListRender(); }catch(e){}
  const del0=window.deleteProjectById;
  if(typeof del0==='function') window.deleteProjectById=function(){ const r=del0.apply(this,arguments); try{ if(TW.tab==='dashboard') renderDashboard(); }catch(e){} return r; };

  /* main window: Dependencies tile opens the dashboard tab; subtask tile goes to Daily Tasks */
  const hr0=window.twHomeRender;
  if(typeof hr0==='function') window.twHomeRender=function(){
    const r=hr0.apply(this,arguments);
    try{
      const tiles=document.querySelector('#twHome .tw-tiles');
      tiles?.querySelector('[data-twt="hub"]')?.remove();
      document.querySelectorAll('#twHome [data-twt="issues"]').forEach(b=>{ b.onclick=e=>{ e.stopPropagation(); H.tab='dep'; keep(); render(); document.getElementById('qmRoot')?.scrollIntoView({behavior:'smooth',block:'start'}); }; });
      document.querySelectorAll('#twHome [data-twt="#subs"]').forEach(b=>{ b.onclick=e=>{ e.stopPropagation(); twGo('daily'); setTimeout(()=>document.querySelectorAll('#twDailyList tr.dt-s2')[1]?.scrollIntoView({behavior:'smooth'}),150); }; });
    }catch(e){ console.warn(e); }
    return r;
  };
  try{ placeHub(); moveSubtasks(); }catch(e){}

  /* ---------- Project Setup: budget fields ---------- */
  function setupFields(){
    const end=document.getElementById('projectEnd'); if(!end||document.getElementById('projectBudget')) return;
    const fld=end.closest('.field'); if(!fld) return;
    fld.insertAdjacentHTML('afterend',`<div class="field"><label>Allocated Budget (₹)</label><input type="number" min="0" step="any" id="projectBudget" placeholder="Project budget in INR"></div><div class="field"><label>Actual Cost (₹)</label><input type="number" min="0" step="any" id="projectActual" placeholder="Actual cost so far in INR"></div><div class="field"><label>Total VFD</label><input type="number" min="0" step="1" id="projectVfd" placeholder="0"></div><div class="field"><label>Total No. of Panel</label><input type="number" min="0" step="1" id="projectPanels" placeholder="0"></div>`);
    const stg=document.getElementById('projectStage'); if(stg&&!stg.dataset.v10){ const cur=stg.value; stg.innerHTML=STAGES.map(x=>`<option>${x}</option>`).join(''); stg.dataset.v10='1'; stg.value=cur==='Design'?'Design & Indenting':cur==='Closed'?'Completed':(cur||'DAP'); }
  }
  setupFields();
  const rs0=window.renderSetup;
  if(typeof rs0==='function') window.renderSetup=function(){ const r=rs0.apply(this,arguments); try{ setupFields(); const p=project(); const b=document.getElementById('projectBudget'), a=document.getElementById('projectActual'); if(b) b.value=p&&p.budget!=null?p.budget:''; if(a) a.value=p&&p.actualCost!=null?p.actualCost:''; const v=document.getElementById('projectVfd'), pn=document.getElementById('projectPanels'); if(v) v.value=p&&p.totalVfd!=null&&p.totalVfd!==''?p.totalVfd:''; if(pn) pn.value=p&&p.totalPanels!=null&&p.totalPanels!==''?p.totalPanels:''; if(p&&p.stage&&document.getElementById('projectStage')) document.getElementById('projectStage').value=stageOf(p); }catch(e){} return r; };
  const np0=window.newProject;
  if(typeof np0==='function') window.newProject=function(){ const r=np0.apply(this,arguments); try{ ['projectBudget','projectActual','projectVfd','projectPanels'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); }catch(e){} return r; };
  const sp0=window.saveProjectSetup;
  if(typeof sp0==='function') window.saveProjectSetup=function(){
    try{ const p=project(), b=document.getElementById('projectBudget'), a=document.getElementById('projectActual');
      if(p&&b&&a){ if(N(b.value)<0||N(a.value)<0) return alert('Budget and actual cost cannot be negative.');
        const nb=b.value===''?'':N(b.value), na=a.value===''?'':N(a.value); if(String(p.budget??'')!==String(nb)||String(p.actualCost??'')!==String(na)) p.costUpdatedAt=new Date().toISOString(); p.budget=nb; p.actualCost=na; }
      const v=document.getElementById('projectVfd'), pn=document.getElementById('projectPanels'); if(p&&v&&pn){ if(N(v.value)<0||N(pn.value)<0) return alert('VFD and panel count cannot be negative.'); p.totalVfd=v.value===''?0:Math.round(N(v.value)); p.totalPanels=pn.value===''?0:Math.round(N(pn.value)); } }catch(e){ console.warn(e); }
    return sp0.apply(this,arguments);
  };
})();
