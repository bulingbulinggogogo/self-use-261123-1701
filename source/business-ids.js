'use strict';
// Public content numbers have independent, durable high-water marks.
// Technical book/word keys remain stable for legacy hydration and storage links.
function businessIdValues(kind,state){
 if(kind==='mediaAssets')return Object.values(state.materialCenterIds||{});
 if(kind==='books')return (state.books||[]).map(b=>b.bookId||b.sourceBookId||b.id);
 if(kind==='words')return (state.editorial?.words||[]).map(w=>w.wordId||w.sourceWordId||w.id);
 if(kind==='questions')return Object.keys(state.listeningBank?.questions||{}).concat((state.books||[]).flatMap(b=>Object.values(b.suiteContent||{}).flatMap(c=>(c.questions||[]).map(q=>q.id))),typeof builtinBook690==='undefined'?[]:builtinBook690.questions.map(q=>String(q['旧小题id'])));
 if(kind==='directories')return (state.books||[]).flatMap(b=>(b.directoryNodes||[]).map(n=>n.directoryId||n.id));
 return Object.keys(kind==='papers'?state.listeningBank?.papers||{}:state.teachingLibrary?.[kind]||{});
}
function nextBusinessId(kind,state=data){
 state.businessIdSequences ||= {};
 const max=Math.max(0,Number(state.businessIdSequences[kind])||0,...businessIdValues(kind,state).filter(v=>/^\d+$/.test(String(v))).map(Number));
 if(!Number.isSafeInteger(max+1))throw Error('编号已超出安全范围');
 state.businessIdSequences[kind]=max+1;
 return String(max+1);
}
function migrateBusinessIds(state){
 if(state.businessIdVersion===1)return false;
 state.businessIdSequences ||= {};
 const lib=state.teachingLibrary;if(!lib)return false;
 const maps={};
 for(const kind of ['packages','suites','wordlists','practices','papers']){
  const objects=kind==='papers'?state.listeningBank.papers:lib[kind];maps[kind]={};
  state.businessIdSequences[kind]=Math.max(Number(state.businessIdSequences[kind])||0,...Object.keys(objects).filter(id=>/^\d+$/.test(id)).map(Number));
  for(const old of Object.keys(objects))if(!/^\d+$/.test(old)){const id=nextBusinessId(kind,state);maps[kind][old]=id;objects[id]={...objects[old],id,sourceId:objects[old].sourceId||old};delete objects[old]}
 }
 for(const p of Object.values(lib.packages))for(const item of p.items)item.id=maps[item.kind]?.[item.id]||item.id;
 const usedBookIds=new Set(),usedWordIds=new Set();
 for(const book of state.books){
  const previous=String(book.bookId||book.sourceBookId||book.id);let id=previous;
  if(!/^\d+$/.test(id)||usedBookIds.has(id)){id=nextBusinessId('books',state);book.sourceBusinessId ||= previous}book.bookId=id;usedBookIds.add(id);
  const directoryMap={};
  for(const node of book.directoryNodes||[]){
   const old=node.id;
   if(book.sharedResources&&!/^\d+$/.test(old)){node.id=nextBusinessId('directories',state);node.sourceId ||= old;directoryMap[old]=node.id}
   node.directoryId ||= /^\d+$/.test(node.id)?node.id:nextBusinessId('directories',state);
   if(node.packageId)node.packageId=maps.packages[node.packageId]||node.packageId;
  }
  for(const node of book.directoryNodes||[])node.parentId=directoryMap[node.parentId]||node.parentId;
 }
 for(const word of state.editorial.words){let id=String(word.wordId||word.sourceWordId||word.id);if(!/^\d+$/.test(id)||usedWordIds.has(id))id=nextBusinessId('words',state);word.wordId=id;usedWordIds.add(id)}
 const questionMap={};
 for(const old of new Set(businessIdValues('questions',state)))if(!/^\d+$/.test(old))questionMap[old]=nextBusinessId('questions',state);
 // Remap draft selections and legacy suite/clue references along with bank keys.
 function rewrite(value){if(typeof value==='string')return questionMap[value]||value;if(Array.isArray(value))return value.map(rewrite);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[questionMap[k]||k,rewrite(v)]));return value}
 if(Object.keys(questionMap).length){const next=rewrite(state);Object.assign(state,next);for(const [old,id] of Object.entries(questionMap))if(state.listeningBank.questions[id])state.listeningBank.questions[id].sourceId ||= old}
 for(const kind of ['books','words','directories','questions',...Object.keys(maps)])state.businessIdSequences[kind]=Math.max(Number(state.businessIdSequences[kind])||0,...businessIdValues(kind,state).filter(v=>/^\d+$/.test(String(v))).map(Number));
 state.listeningBank.lastMaterialId=Math.max(Number(state.listeningBank.lastMaterialId)||0,...Object.keys(state.listeningBank.materials).filter(id=>/^\d+$/.test(id)).map(Number));
 state.businessIdVersion=1;
 return true;
}
function ensureBusinessIds(){if(data.businessIdVersion!==1)commitWorkspace(migrateBusinessIds)}
