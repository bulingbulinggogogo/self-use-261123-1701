'use strict';
// Run after seed extensions too: a prior migration marker must not exempt later fixtures.
function repairPublicIds(state){
 let changed=false;
 const used=new Set();
 for(const book of state.books||[]){
  const previous=String(book.bookId||book.sourceBookId||book.id);
  if(!/^\d+$/.test(previous)||used.has(previous)){
   book.sourceBusinessId ||= previous;
   book.bookId=nextBusinessId('books',state);
   changed=true;
  }else if(book.bookId!==previous){book.bookId=previous;changed=true}
  used.add(book.bookId);
 }
 const ids={};
 for(const old of Object.keys(state.listeningBank?.materials||{}))if(!/^\d+$/.test(old))ids[old]=nextBankMaterialId(state);
 for(const old of new Set(businessIdValues('questions',state)))if(!/^\d+$/.test(String(old)))ids[old]=nextBusinessId('questions',state);
 if(Object.keys(ids).length){
  // Exact-key/value replacement includes revisions, drafts and frozen snapshots;
  // segment keys and technical book keys are not public business numbers.
  function rewrite(value,field){
   if(field==='sourceId'||field==='sourceBusinessId')return value;
   if(typeof value==='string')return ids[value]||value;
   if(Array.isArray(value))return value.map(v=>rewrite(v));
   if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[ids[k]||k,rewrite(v,k)]));
   return value;
  }
  Object.assign(state,rewrite(state));
  for(const [old,id] of Object.entries(ids)){
   const record=state.listeningBank.materials[id]||state.listeningBank.questions[id];
   if(record)record.sourceId ||= old;
  }
  changed=true;
 }
 return changed;
}
// Number maintenance is not a content edit: preserve published/republish state.
(()=>{
const publicIdRepairCandidate=structuredClone(data);
if(repairPublicIds(publicIdRepairCandidate)){
 commitBeforePublicationTracking(state=>Object.assign(state,publicIdRepairCandidate));
 render();
}
})();
