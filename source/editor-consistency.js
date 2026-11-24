'use strict';
// Keep audit metadata separate from business records and published snapshots.
const EditorConsistency=(()=>{
 let records=structuredClone(data.operationAudit||{}),context=null,scheduled=false;
 let stagedRecords=records;
 const movedButtons=new Map();
 const key=(...parts)=>JSON.stringify(parts.map(String));
 function snapshot(state){
  const out=new Map();
  function visit(value,path,depth){
   if(value===null||typeof value!=='object'||depth>5)return;
   if(depth===1||(!Array.isArray(value)&&(value.id!=null||depth<=3)))out.set(key(...path),JSON.stringify(value));
   for(const [name,child] of Object.entries(value)){
    if(['operationAudit','published','lastPublished','finalSnapshot','history','noteHistory'].includes(name))continue;
    if(child&&typeof child==='object')visit(child,[...path,Array.isArray(value)&&child.id!=null?String(child.id):name],depth+1);
   }
  }
  for(const [name,value] of Object.entries(state))if(name!=='operationAudit'){if(value&&typeof value==='object')visit(value,[name],1);else out.set(key(name),JSON.stringify(value))}
  return out;
 }
 let baseline=snapshot(data);
 const originalPersist=persistAppData;
 persistAppData=function(value){
  const next=snapshot(value),changed=[...next].filter(([k,v])=>baseline.get(k)!==v).map(([k])=>k);
  for(const k of baseline.keys())if(!next.has(k))changed.push(k);
  const nextRecords={...stagedRecords};
  if(changed.length){const record={actor:bookFlowActor(),at:new Date().toISOString()};for(const k of changed)nextRecords[k]=record;
   // Child edits count as an operation on the containing material/word/suite/book.
   const materials=new Set(),resources=new Set();
   for(const k of changed){const path=JSON.parse(k);
    if(path[0]==='listeningBank'&&path[1]==='materials'&&path.length===3)materials.add(path[2]);
    if(path[0]==='listeningBank'&&path[1]==='questions'&&path.length===3){const q=value.listeningBank?.questions?.[path[2]]||JSON.parse(baseline.get(k)||'null');if(q?.scriptId)materials.add(q.scriptId)}
    if(path[0]==='teachingLibrary'&&path.length===3)resources.add(path[1]+':'+path[2]);
    if(path[0]==='vocabularyEdits'&&path.length===3){const item=value.vocabularyEdits?.[path[1]]?.[path[2]];if(item?.wordId)nextRecords[key('vocabularyEdits','words',item.wordId)]=record}
   }
   for(const id of materials)nextRecords[key('listeningBank','materials',id)]=record;
   for(const [kind,collection] of Object.entries(value.teachingLibrary||{}))for(const item of Object.values(collection||{}))if(item?.materialIds?.some(id=>materials.has(id))){nextRecords[key('teachingLibrary',kind,item.id)]=record;resources.add(kind+':'+item.id)}
   for(const book of value.books||[])if((book.directoryNodes||[]).some(n=>changed.includes(key('directoryContents',n.contentId))||value.directoryContents?.[n.contentId]?.items.some(item=>resources.has(item.kind+':'+item.id))))nextRecords[key('books',book.id)]=record;
   nextRecords[key('page',page)]=record;
   const active=[...document.querySelectorAll('dialog[open][data-audit-key],.ant-modal[data-audit-key]')].at(-1)||document.querySelector('#listening-create[data-audit-key]');if(active)nextRecords[active.dataset.auditKey]=record;
  }
  const prior=value.operationAudit;value.operationAudit=nextRecords;
  try{originalPersist(value)}catch(error){if(prior===undefined)delete value.operationAudit;else value.operationAudit=prior;throw error}
  stagedRecords=nextRecords;baseline=next;
  if(window.AppStorage?.flush){window.AppStorage.flush().then(()=>{records=nextRecords;schedule()},()=>{})}else{records=nextRecords;schedule()}
 };
 function pageKey(){
  if(typeof resourceTrail!=='undefined'&&resourceTrail.length){const r=resourceTrail.at(-1);return key(r.kind==='papers'?'listeningBank':'teachingLibrary',r.kind,r.id)}
  if(page==='books'&&activeBook)return key('books',activeBook);
  if(page==='vocabulary'&&typeof vocabularyDetailId!=='undefined'&&vocabularyDetailId)return key('vocabularyEdits','words',vocabularyDetailId);
  if(page==='listening-bank'&&bankMaterialId)return key('listeningBank','materials',bankMaterialId);
  return key('page',page);
 }
 function markup(k){const r=JSON.parse(k).at(-1)==='new'?null:records[k];return r?`<span>最近操作人：${esc(r.actor)}</span><span>操作时间：<time datetime="${esc(r.at)}">${esc(bookFlowTime(r.at))}</time></span>`:'<span>暂无操作记录</span>'}
 function addMeta(footer,k){
  if(footer.closest('[data-audit-mode="create"], .personal-permission-dialog')||footer.closest('dialog')?.querySelector('#simple-account-form')){footer.querySelector(':scope > .editor-operation-meta')?.remove();return;}
  let node=footer.querySelector(':scope > .editor-operation-meta');if(!node){node=document.createElement('div');node.className='editor-operation-meta';footer.prepend(node)}
  const html=markup(k);if(node.auditMarkup!==html){node.auditMarkup=html;node.innerHTML=html}
 }
 function refresh(){
  scheduled=false;
  if(!window.document?.body)return;
  for(const [button,anchor] of movedButtons){if(!button.isConnected||!anchor.isConnected){button.remove();movedButtons.delete(button)}}
  const host=document.querySelector('#page');
  if(host){
   for(const b of host.querySelectorAll('#blocks-back,#standalone-back,#suite-back')){
    if(b.hidden)continue;
    if(b.textContent!=='返回书籍目录')b.textContent='返回书籍目录';
    const bar=b.parentElement;
    if(bar.lastElementChild!==b)bar.append(b);
    b.classList.add('editor-section-back');
   }
   const editingButtons=[...host.querySelectorAll('button')].filter(b=>!b.matches('.linkbtn,#scene-save')&&!b.closest('dialog,footer,.inline-directory-form,.book-stage-flow')&&(/^(保存|保存修改|保存全部修改)$/.test(b.textContent.trim())||['cancel-book-info','save-book-words'].includes(b.id)));
   let footer=host.querySelector(':scope > .editor-page-footer');
   const hideSchoolStatusFooter=!!host.querySelector('.school-publication-panel,.scene-directory-editor');
   if(hideSchoolStatusFooter&&footer){footer.remove();footer=null;}
   if(!hideSchoolStatusFooter&&(editingButtons.length||page==='books'&&activeBook||host.querySelector('#bank-back,#vocab-back,#legacy-back,#paper-back,[data-resource-action="back"]'))&&!footer){footer=document.createElement('footer');footer.className='editor-page-footer';host.append(footer)}
   if(footer){
    for(const b of editingButtons){const anchor=document.createComment('editor action');b.before(anchor);movedButtons.set(b,anchor);if(b.form&&!b.hasAttribute('form')){if(!b.form.id)b.form.id='editor-page-form';b.setAttribute('form',b.form.id)}footer.append(b)}
    const buttons=[...footer.querySelectorAll(':scope>button')];buttons.sort((a,b)=>Number(/^保存/.test(a.textContent.trim()))-Number(/^保存/.test(b.textContent.trim())));for(const b of buttons)if(b!==footer.lastElementChild&&buttons.indexOf(b)===buttons.length-1)footer.append(b);
    addMeta(footer,pageKey());
   }
  }
  for(const footer of document.querySelectorAll('.lc-footer,dialog[open]>footer,.ant-modal-footer>div')){
   const owner=footer.closest('.ant-modal')||footer.parentElement;if((owner.tagName==='DIALOG'||owner.classList.contains('ant-modal'))&&!owner.querySelector('form')&&![...footer.querySelectorAll('button')].some(b=>b.textContent.trim().startsWith('保存')))continue;const k=owner.dataset.auditKey||(footer.classList.contains('lc-footer')?key('listeningBank','materials','new'):pageKey());
   addMeta(footer,k);
   if(footer.classList.contains('lc-footer')){const header=owner.querySelector(':scope>.lc-header'),back=owner.querySelector('#lc-close');if(header&&!header.classList.contains('lc-modal-header')&&back&&header.firstElementChild!==back){back.className='btn';header.prepend(back)}}
  }
 }
 function schedule(){if(!scheduled){scheduled=true;queueMicrotask(refresh)}}
 window.addEventListener('app-data-saved',event=>{records=parseAppData(event.detail).operationAudit||{};schedule()});
 const oldDialog=openDialog;
 openDialog=function(...args){const previous=document.querySelector('#dialog'),inherited=previous?.open&&previous.querySelector('#dialog-title')?.textContent===args[0]?previous.dataset.auditKey:null;oldDialog(...args);const dialog=document.querySelector('#dialog');delete dialog.dataset.auditMode;dialog.dataset.auditKey=context||inherited||pageKey();schedule()};
 const oldComponentDialog=BookUI.openDialog;
 BookUI.openDialog=function(...args){oldComponentDialog(...args);const dialog=[...document.querySelectorAll('.ant-modal')].at(-1);if(dialog)dialog.dataset.auditKey=context||pageKey();schedule()};
 function wrap(name,getKey){const original=window[name];if(typeof original!=='function')return;window[name]=function(...args){const previous=context;context=getKey(...args);try{return original.apply(this,args)}finally{context=previous;schedule()}}}
 wrap('editWord',id=>key('editorial','words',id||'new'));
 wrap('openTask',id=>key('editorial','tasks',id));
 wrap('editTask',id=>key('editorial','tasks',id||'new'));
 wrap('editGaokaoPaper',p=>key('listeningBank','papers',p?.id||'new'));
 wrap('editSharedAnalysis',(collection,id)=>key('listeningBank',collection,id));
 wrap('editMember',id=>key('members',id||'new'));
 wrap('editPersonalPermissions',id=>key('members',id));
 wrap('editProjectLeader',id=>key('members',id));
 wrap('editDepartment',()=>key('departments','new'));
 wrap('editItem',id=>key(page,id||'new'));
 wrap('editBankMaterial',id=>key('listeningBank','materials',id));
 wrap('editBankQuestion',id=>key('listeningBank','questions',id));
 wrap('editBankAnalyses',id=>key('listeningBank','materials',id));
 wrap('editInteractiveTeaching',id=>key('interactiveTeaching',id||'new'));
 wrap('vocabularyEditAll',id=>key('vocabularyEdits','words',id||'new'));
 wrap('vocabularyEdit',(kind,id)=>key('vocabularyEdits',kind,id||'new'));
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 schedule();
 return {key,markup,refresh,snapshot,get records(){return records}};
})();
