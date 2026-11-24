/* v22.2: one entry per person in people dropdowns (Daily Tasks Assign/Help, Team & Access Reports to).
   Legacy tracker IDs that map to a Supabase login (EDPT_ALIAS_TO_PROFILE) or share the same
   display name are collapsed to a single option. No user records or task references are changed. */
(function(){
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  const aliasMap=()=>window.EDPT_ALIAS_TO_PROFILE||{};
  window.edptPeopleIds=function(){
    const users=db.users||{}, al=aliasMap();
    let ids=typeof window.twAssignable==='function'?window.twAssignable():Object.keys(users);
    ids=ids.filter(id=>users[id]&&!al[norm(id)]);
    const score=id=>(id===TW.me?2:0)+(users[id]&&users[id].isSupabaseProfile?1:0);
    const best=new Map();
    ids.forEach(id=>{const k=norm(twName(id))||norm(id),p=best.get(k);if(!p||score(id)>score(p))best.set(k,id);});
    return [...best.values()].sort((a,b)=>twName(a).localeCompare(twName(b)));
  };
  // True when a stored value (possibly a legacy ID) refers to the person shown by optionId.
  window.edptPersonMatch=function(optionId,storedId){
    if(!storedId||!optionId)return false;
    if(optionId===storedId)return true;
    const s=norm(storedId),o=norm(optionId),al=aliasMap();
    if(norm(al[s])===o||norm(al[o])===s)return true;
    return !!(db.users&&db.users[storedId])&&norm(twName(storedId))===norm(twName(optionId));
  };
})();
