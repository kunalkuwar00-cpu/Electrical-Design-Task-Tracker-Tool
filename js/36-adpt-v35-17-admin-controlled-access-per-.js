/* ===== ADPT v35.17 — Admin-controlled access per person, company holidays, holiday-safe schedule dates ===== */
(function(){
  'use strict';
  const E=s=>(typeof esc==='function'?esc(s):String(s??''));
  const ACTIONS=['View','Add','Edit','Update','Delete'];
  const NOTES={
    'Daily Tasks':'Add = assign tasks · Update = remarks · Edit = status, dates and remarks of any task · Delete = delete tasks',
    'Task Management':'Project Schedule: Add = milestones / sub milestones · Edit / Update = change them · Delete',
    'Project Review':'Add = review tasks · Update / Edit = update them',
    'Project Setup':'View only = read-only screen (no Add / Save / Delete buttons)',
    'Team Capacity':'Edit = capacity settings',
    'Project Hub':'Project Dashboard registers (change notes, site issues …)',
    'EPLAN Planning':'View = open the screen · Add / Edit / Delete drawings and licences',
    'Project Date Change':'Edit = change project start / end dates in Project Setup',
    'Settings':'View = open Settings (colours, theme)',
    'Announcements':'Add = post (and delete own) · Edit = pin · Delete = delete anyone’s'
  };
  const all=a=>{ try{ return Object.getOwnPropertyNames(a||{}); }catch(e){ return Object.keys(a||{}); } };
  const isTM=id=>{ try{ const u=db.users[id]||{}; return Object.prototype.hasOwnProperty.call(db.teamMembers||{},id)&&!u.admin&&!['AGM','Manager','Team Leader','Admin'].includes(String(u.role||'').trim()); }catch(e){ return false; } };
  const roleOf=id=>{ try{ if(window.edptIsCommon&&edptIsCommon(id)) return 'Common ID'; if(isTM(id)) return 'Common ID'; const u=db.users[id]||{}; return String(u.role||u.designation||'Member').trim(); }catch(e){ return 'Member'; } };
  window.edptRoleOf=roleOf;
  const mods=()=>{ try{ const r=db.accessControl.roles; return Object.keys(r['Manager']||r[Object.keys(r)[0]]||{}); }catch(e){ return []; } };
  const roleSet=(id,mod)=>{ const r=(db.accessControl.roles||{})[roleOf(id)]||{}; return Array.isArray(r[mod])?r[mod]:['View']; };

  /* ---------- Team & Access: per-person permission editor ---------- */
  const UI={who:''};
  function personIds(){
    const base=(typeof edptPeopleIds==='function'?edptPeopleIds():[]).concat(Object.keys(db.users||{}));
    const seen=new Map();
    base.forEach(id=>{ const u=db.users[id]; if(!u||u.admin) return; const k=String(twName(id)).trim().toLowerCase(); const cur=seen.get(k); if(!cur||(!/@/.test(cur)&&/@/.test(id))) seen.set(k,id); });
    const ids=[...seen.values()];
    all(db.users).forEach(id=>{ if(window.edptIsCommon&&edptIsCommon(id)&&!ids.includes(id)) ids.push(id); });
    return ids.sort((a,b)=>twName(a).localeCompare(twName(b)));
  }
  function personPanel(){
    const ids=personIds(); if(!UI.who||!ids.includes(UI.who)) UI.who=ids[0]||'';
    const id=UI.who, U=(db.accessControl.users||{});
    const rows=mods().map(mod=>{ const ov=typeof edptUserOverride==='function'?edptUserOverride(id,mod):undefined, custom=Array.isArray(ov), eff=custom?ov:roleSet(id,mod);
      return `<tr><td><b>${E(mod)}</b><div class="muted" style="font-size:11.5px">${E(NOTES[mod]||'')}</div></td>
        <td>${ACTIONS.map(a=>`<label style="display:inline-flex;align-items:center;gap:4px;margin:0 10px 0 0;font-weight:400"><input type="checkbox" style="width:auto" ${eff.includes(a)?'checked':''} onchange="ACX.tog('${E(mod)}','${a}',this.checked)">${a}</label>`).join('')}</td>
        <td>${custom?`<span class="tw-chip orange">Custom for this person</span> <button class="small" onclick="ACX.reset('${E(mod)}')">Use ${E(roleOf(id))} default</button>`:`<span class="muted">${E(roleOf(id))} default</span>`}</td></tr>`; }).join('');
    return `<div class="panel" id="acxPanel"><h3>Individual permissions</h3>
      <p class="muted" style="margin-top:0">Choose a person and tick or untick what they may do. Team members who use the common login start from the <b>Common ID</b> defaults; a setting here applies to them after they choose their name. A change here applies only to that person and overrides the designation default above. Buttons the person may not use are hidden on their screen. Admin always has full access.</p>
      <div class="tw-f" style="max-width:420px"><label for="acxWho">Person</label><select id="acxWho" onchange="ACX.who(this.value)">${ids.map(x=>`<option value="${E(x)}" ${x===id?'selected':''}>${E(twName(x))} — ${window.edptIsCommon&&edptIsCommon(x)?'the common login itself':isTM(x)?'team member · uses the common login':E(roleOf(x))}</option>`).join('')}</select></div>
      ${id?`<div class="tablewrap"><table><thead><tr><th>Module</th><th>Allowed</th><th>Setting</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="actions" style="margin-top:8px"><button class="small" onclick="ACX.resetAll()">Reset ${E(twName(id))} to ${E(roleOf(id))} defaults</button></div>`:'<p class="muted">No people.</p>'}</div>`;
  }
  const ACX=window.ACX={};
  const savePerm=()=>{ try{ save(false); }catch(e){} draw(); };
  ACX.who=v=>{ UI.who=v; draw(); };
  ACX.tog=(mod,a,on)=>{ if(!twAdmin()) return; const id=UI.who; db.accessControl.users||={}; const u=db.accessControl.users[id]||={};
    const ov=typeof edptUserOverride==='function'?edptUserOverride(id,mod):undefined; let cur=Array.isArray(u[mod])?[...u[mod]]:Array.isArray(ov)?[...ov]:[...roleSet(id,mod)];
    cur=on?[...new Set([...cur,a])]:cur.filter(x=>x!==a); if(a==='View'&&!on) cur=[]; if(on&&a!=='View'&&!cur.includes('View')) cur.unshift('View');
    u[mod]=cur; savePerm(); };
  ACX.reset=mod=>{ if(!twAdmin()) return; const u=(db.accessControl.users||{})[UI.who]; if(u) delete u[mod];
    /* also clear an override kept on another ID of the same person */
    try{ Object.entries(db.accessControl.users||{}).forEach(([k,v])=>{ if(k!==UI.who&&v&&Array.isArray(v[mod])&&twName(k)===twName(UI.who)) delete v[mod]; }); }catch(e){}
    savePerm(); };
  ACX.resetAll=()=>{ if(!twAdmin()||!confirm(`Remove all individual permissions of ${twName(UI.who)}?`)) return; mods().forEach(m=>{ const u=(db.accessControl.users||{})[UI.who]; if(u) delete u[m]; try{ Object.entries(db.accessControl.users||{}).forEach(([k,v])=>{ if(k!==UI.who&&v&&Array.isArray(v[m])&&twName(k)===twName(UI.who)) delete v[m]; }); }catch(e){} }); savePerm(); };
  function draw(){
    const host=document.getElementById('twAccessControl'); if(!host||!twAdmin()) return;
    /* replace the long "Individual employee permissions" table with the per-person editor */
    const h4=[...host.querySelectorAll('h4')].find(h=>/Individual employee permissions/i.test(h.textContent));
    if(h4){ const tw=h4.nextElementSibling; if(tw&&tw.classList.contains('tablewrap')) tw.remove(); h4.remove(); }
    let p=document.getElementById('acxPanel'); const html=personPanel();
    if(p) p.outerHTML=html; else host.insertAdjacentHTML('beforeend',html);
    /* role table notes */
    host.querySelectorAll('table tbody tr').forEach(tr=>{ const c=tr.cells; if(c.length===3&&NOTES[c[1]?.textContent]&&!c[1].querySelector('.muted')) c[1].insertAdjacentHTML('beforeend',`<div class="muted" style="font-size:11px;font-weight:400">${E(NOTES[c[1].textContent])}</div>`); });
  }
  const tr0=window.twTeamRender;
  if(typeof tr0==='function') window.twTeamRender=function(){ const r=tr0.apply(this,arguments); try{ draw(); }catch(e){ console.warn(e); } return r; };

  /* one-time: the common login updates remarks only — remove "Edit" from an older individual Daily Tasks setting
     (status / dates stay with Team Leader, Manager, AGM, Admin; the Admin can give it back in Team & Access) */
  function migrate(){ try{ const ac=db.accessControl; if(!ac||ac.commonIdDailyV17) return; ac.users=ac.users||{};
      all(db.users).forEach(id=>{ if(!(window.edptIsCommon&&edptIsCommon(id))) return; const u=ac.users[id]; if(u&&Array.isArray(u['Daily Tasks'])) u['Daily Tasks']=u['Daily Tasks'].filter(a=>a!=='Edit'&&a!=='Delete'); if(u&&Array.isArray(u['Project Setup'])) delete u['Project Setup']; });
      ac.commonIdDailyV17=true; }catch(e){ console.warn(e); } }
  const ld0=window.edptLoadCloudState;
  if(typeof ld0==='function') window.edptLoadCloudState=async function(){ const r=await ld0.apply(this,arguments); migrate(); return r; };
  migrate();

  /* ---------- Daily task Delete follows Team & Access ---------- */
  window.twDDel=function(id){
    const t=(db.daily||[]).find(x=>x.id===id); if(!t) return;
    if(!(twAdmin()||(typeof edptCan==='function'&&edptCan('Daily Tasks','Delete')))) return alert('You do not have permission to delete daily tasks.');
    if(!confirm('Delete this daily task?')) return;
    db.daily=db.daily.filter(x=>x.id!==id); save(false);
    if(typeof twDailyRender==='function') twDailyRender(); if(typeof twHomeRender==='function') twHomeRender(); if(typeof twTopRender==='function') twTopRender();
  };
  const dr0=window.twDailyRender;
  if(typeof dr0==='function') window.twDailyRender=function(){ const r=dr0.apply(this,arguments);
    try{ const ok=twAdmin()||(typeof edptCan==='function'&&edptCan('Daily Tasks','Delete')); if(!ok) document.querySelectorAll('#daily button[onclick^="twDDel"]').forEach(b=>b.style.display='none');
      const add=twAdmin()||(typeof edptCan==='function'&&edptCan('Daily Tasks','Add')); if(!add) document.querySelectorAll('#daily button[onclick^="twNewDaily"],#daily [data-twt="+daily"]').forEach(b=>b.style.display='none'); }catch(e){}
    return r; };

  /* ---------- Company holidays: Admin only ---------- */
  const hol=d=>(db.holidays||[]).find(h=>(h.date||h)===d);
  window.edptHoliday=hol;
  ['addHoliday','delHoliday'].forEach(k=>{ const f=RP&&RP[k]; if(typeof f==='function') RP[k]=function(){ if(!twAdmin()) return alert('Only the Admin can add or remove company holidays.'); return f.apply(this,arguments); }; });
  ['wxAddHol','wxDelHol'].forEach(k=>{ const f=window[k]; if(typeof f==='function') window[k]=function(){ if(!twAdmin()) return alert('Only the Admin can add or remove company holidays.'); return f.apply(this,arguments); }; });
  if(RP&&typeof RP.openSettings==='function'){ const os0=RP.openSettings; RP.openSettings=function(){ const r=os0.apply(this,arguments);
    try{ if(!twAdmin()){ const l=[...document.querySelectorAll('.tw-modal h4')].pop(); const h=[...document.querySelectorAll('.tw-modal h4')].find(x=>/Company holidays/.test(x.textContent));
        if(h){ const a=h.nextElementSibling; if(a&&a.querySelector('#tcHd')) a.remove(); document.querySelectorAll('#tcHolList button').forEach(b=>b.remove()); h.insertAdjacentHTML('beforeend',' <span class="muted" style="font-weight:400;font-size:12px">— added by the Admin</span>'); } } }catch(e){}
    return r; }; }
  /* the Project Schedule cannot book a sub milestone start / target on a company holiday */
  const holMsg=(d,label)=>{ const h=hol(d); return h?`${fmtDate(d)} is a company holiday${h.name?' ('+h.name+')':''}. ${label} cannot be on a holiday — choose a working day.`:''; };
  /* v35.24: nobody can be given work that starts or finishes on their own leave day */
  const nrm=v=>String(v||'').trim().toLowerCase();
  function leaveOn(person,d){
    if(!person||!d) return null;
    const ids=new Set(), names=new Set();
    if(db.users&&db.users[person]){ ids.add(person); names.add(nrm(twName(person))); }
    else { names.add(nrm(person)); try{ Object.keys(db.users||{}).forEach(k=>{ const u=db.users[k]; if(u&&(nrm(u.owner)===nrm(person)||nrm(u.name)===nrm(person))) ids.add(k); }); }catch(e){} }
    const L=((db.capacity||{}).leaves||[]).find(l=>!l.cancelled&&(ids.has(l.person)||names.has(nrm(l.key))||names.has(nrm(l.name)))&&l.a<=d&&(l.b||l.a)>=d);
    if(L) return {reason:L.reason||'Leave'};
    try{ const c=(RP.cap().people||{}); for(const n of names){ const str=(c[n]||{}).leave; if(!str) continue;
      for(const part of String(str).split(/[,;\n]+/)){ const m=part.trim().match(/^(\d{4}-\d{2}-\d{2})(?:\s*\.\.\s*(\d{4}-\d{2}-\d{2}))?$/); if(m&&m[1]<=d&&(m[2]||m[1])>=d) return {reason:'Leave'}; } } }catch(e){}
    return null;
  }
  window.edptLeaveOn=leaveOn;
  const leaveMsg=(person,d,label)=>{ const l=leaveOn(person,d); if(!l) return ''; const nm=db.users&&db.users[person]?twName(person):person;
    return `${nm} is on leave on ${fmtDate(d)} (${l.reason}). ${label} cannot be on a leave day — choose another date or another person.`; };
  window.edptLeaveMsg=leaveMsg;
  const subOf=(tid,sid)=>{ try{ const p=pbyid(document.getElementById('taskProjectFilter').value)||project(); const t=p.tasks.find(x=>x.id===tid); return t&&t.subs.find(x=>x.id===sid); }catch(e){ return null; } };
  const subCheck=(owner,start,target)=>leaveMsg(owner,start,'Start date')||leaveMsg(owner,target,'Target date');
  const qu0=window.quickUpdateSubtask;
  if(typeof qu0==='function') window.quickUpdateSubtask=function(tid,sid,f,v){
    if((f==='start'||f==='target')&&v){ const m=holMsg(v,f==='start'?'Start date':'Target date'); if(m){ alert(m); try{ renderTasks(); }catch(e){} return; } }
    const sb=subOf(tid,sid);
    if(sb){ const m=f==='owner'?subCheck(v,sb.start,sb.target):(f==='start'||f==='target')&&v?leaveMsg(sb.owner,v,f==='start'?'Start date':'Target date'):''; if(m){ alert(m); try{ renderTasks(); }catch(e){} return; } }
    return qu0.apply(this,arguments); };
  const ss0=window.saveSubtask;
  if(typeof ss0==='function') window.saveSubtask=function(tid){
    try{ for(const [k,l] of [['substart-','Start date'],['subtarget-','Target date']]){ const v=(document.getElementById(k+tid)||{}).value; const m=v&&holMsg(v,l); if(m) return alert(m); } }catch(e){}
    try{ const ow=(document.getElementById('subowner-'+tid)||{}).value, m=ow&&subCheck(ow,(document.getElementById('substart-'+tid)||{}).value,(document.getElementById('subtarget-'+tid)||{}).value); if(m) return alert(m); }catch(e){}
    return ss0.apply(this,arguments); };
  const q0=window.twQU;
  if(typeof q0==='function') window.twQU=function(i,f,v){
    if((f==='start'||f==='target')&&v){ const m=holMsg(v,f==='start'?'Start date':'Target date'); if(m){ alert(m); try{ twDailyRender(); }catch(e){} return; } }
    try{ const x=(window._twRows||[])[i], sb=x&&x.item; if(sb){ const m=f==='owner'?subCheck(v,sb.start,sb.target):(f==='start'||f==='target')&&v?leaveMsg(sb.owner,v,f==='start'?'Start date':'Target date'):''; if(m){ alert(m); try{ twDailyRender(); }catch(e){} return; } } }catch(e){}
    return q0.apply(this,arguments); };
  /* daily tasks: assign window and the date change in the update window */
  const last=()=>{ const l=document.querySelectorAll('.tw-modal'); return l[l.length-1]||null; };
  const nd0=window.twNewDaily;
  if(typeof nd0==='function') window.twNewDaily=function(){ const r=nd0.apply(this,arguments); const m=last(), f=m&&m.querySelector('form');
    if(f&&m.querySelector('#twDa')){ const o=f.onsubmit; f.onsubmit=function(e){ const a=m.querySelector('#twDa').value, s1=(m.querySelector('#twDs')||{}).value, d1=(m.querySelector('#twDd')||{}).value;
      const msg=a&&(leaveMsg(a,s1,'The start date')||leaveMsg(a,d1,'The finish date')); if(msg){ e.preventDefault(); const er=m.querySelector('[data-err]'); if(er) er.textContent=msg; else alert(msg); return; } return o.call(f,e); }; }
    return r; };
  const du0=window.twDUpdate;
  if(typeof du0==='function') window.twDUpdate=function(id){ const r=du0.apply(this,arguments); const m=last(), f=m&&m.querySelector('form'), t=(db.daily||[]).find(x=>x.id===id);
    if(f&&t&&m.querySelector('#caDs')){ const o=f.onsubmit; f.onsubmit=function(e){ const s1=m.querySelector('#caDs').value, d1=m.querySelector('#caDe').value;
      const msg=(s1!==t.start&&leaveMsg(t.assigneeId,s1,'The start date'))||(d1!==t.date&&leaveMsg(t.assigneeId,d1,'The finish date')); if(msg){ e.preventDefault(); const er=m.querySelector('[data-err]'); if(er) er.textContent=msg; else alert(msg); return; } return o.call(f,e); }; }
    return r; };
})();
