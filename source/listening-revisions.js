'use strict';
function listeningRevisionNumber(id,bookId,state=data){return state.books.find(b=>b.id===bookId)?.recordingVersions?.[id]||1}
function listeningRevisionLabel(id,bookId,state=data,selectedVersion){const version=selectedVersion||listeningRevisionNumber(id,bookId,state),latest=Math.max(1,...Object.keys(state.listeningRevisions?.[id]||{}).map(Number));return id+'·V'+version+(version===latest?'（最新）':'')}
function listeningRevisionSource(id,bookId,state=data){return listeningVersionSource(id,listeningRevisionNumber(id,bookId,state),state)}
function listeningLatestVersion(id,state=data){return Math.max(1,...Object.keys(state.listeningRevisions?.[id]||{}).map(Number))}
function listeningOwnsOptimization(id,bookId,state=data){if(!bookId)return false;const version=listeningRevisionNumber(id,bookId,state);return version>1&&(state.listeningRevisions?.[id]?.[version]?.ownerBookId===bookId||state.books.find(b=>b.id===bookId)?.createdRecordingVersions?.[id]===version||(!state.listeningRevisions?.[id]?.[version]?.ownerBookId&&state.books.filter(b=>b.recordingVersions?.[id]===version).length===1))}
function listeningVersionSource(id,version,state=data){
 const saved=state.listeningRevisions?.[id]?.[version];
 if(version>1&&saved)return {material:saved.material,questions:saved.questions};
 return {material:state.listeningBank.materials[id],questions:Object.values(state.listeningBank.questions).filter(q=>q.scriptId===id)};
}
function listeningRevisionCore(record){return JSON.stringify(record,(key,value)=>['translation','analysis','analysisText','teachingNotes','clozeBlanks','clozeReview','noCloze','needsReview','translationNeedsReview','clueNeedsReview','step','batchLabel','_revisionVersion'].includes(key)?undefined:value)}
function listeningRevisionNeedsConfirmation(books){return books.some(book=>!!book.workflow?.published||bookFlow(book).stage!=='编书中')}
function listeningRevisionAffected(id,version,state=data){
 return state.books.filter(book=>{
  const suites=new Set(),seen=new Set();
  const walk=contentId=>{if(seen.has(contentId))return;seen.add(contentId);const content=state.directoryContents?.[contentId];for(const item of content?.items||[])if(item.kind==='suites')suites.add(item.id);for(const child of content?.children||[])walk(child.contentId)};
  for(const entry of [...book.directoryRoots||[],...book.directoryNodes||[]]){walk(entry.contentId);if(entry.kind==='套题')suites.add(entry.sourceSuiteId||entry.id)}
  const current=[...suites].some(suiteId=>state.teachingLibrary?.suites?.[suiteId]?.materialIds?.includes(id)&&Number(book.schoolSuiteVersions?.[suiteId]?.[id]||book.recordingVersions?.[id]||1)===Number(version));
  const published=book.workflow?.published;
  return current||!!published?.materials?.[id]&&(published.suites||[]).some(suite=>suite.materialIds?.includes(id)&&Number(suite.recordingVersions?.[id]||published.recordingVersions?.[id]||1)===Number(version));
 });
}
function persistListeningRevision(state,bookId,draft,mode){
 const tokens=value=>Array.isArray(value)?value:String(value||'').split(/[，,、;；\n]+/).map(v=>v.trim()).filter(Boolean);
 const book=state.books.find(b=>b.id===bookId);if(!book&&mode!=='update')throw Error('书籍不存在');
 if(mode==='optimized'&&bookFlow(book).stage!=='编书中')throw Error('编排已完成，请先退回书籍编排再创建优化版本');
 if(mode==='normal'&&bookFlow(book).stage==='编书中')throw Error('请先完成书籍编排');
 const id=draft.materialId,version=draft._revisionVersion||listeningRevisionNumber(id,bookId,state),prior=listeningVersionSource(id,version,state);
 if(book&&bookFlow(book).stage!=='编书中'&&JSON.stringify(prior.questions.map(q=>q.id).sort())!==JSON.stringify((draft.questions||[]).map(q=>q.id).sort()))throw Error('编排已完成，不允许增删或替换小题，请先退回书籍编排');
 if(mode!=='optimized'&&prior.questions.some(q=>!(draft.questions||[]).some(next=>next.id===q.id)))throw Error('删除小题必须保存为优化版本，硬伤修正不能删除小题');
 let material={...structuredClone(prior.material),text:draft.text,questionType:draft.questionType,topics:tokens(draft.topics),topicSecondary:draft.topicSecondary,segments:structuredClone(draft.segments),translation:draft.segments.map(s=>s.translation||'').join('\n'),teachingNotes:structuredClone(draft.teachingNotes||[]),clozeReview:structuredClone(draft.clozeReview||[]),noCloze:!!draft.noCloze,audioAssetId:draft.audioAssetId,audioUrl:draft.audioUrl||'',audioName:draft.audioName,builtinAudio:!!draft.builtinAudio};
 let questions=draft.questions.map(q=>({...structuredClone(q),scriptId:id,answer:q.options.find(o=>o.key===q.answerKey)?.text||'',examPoints:tokens(q.examPoints),abilities:tokens(q.abilities)}));
 state.listeningRevisions ||= {};const versions=state.listeningRevisions[id] ||= {};
 let affected;
 if(mode==='optimized'){
  const next=Math.max(1,...Object.keys(versions).map(Number))+1;
  versions[next]={ownerBookId:bookId,material,questions,at:new Date().toISOString(),actor:bookFlowActor()};
  book.recordingVersions ||= {};book.recordingVersions[id]=next;book.createdRecordingVersions ||= {};book.createdRecordingVersions[id]=next;for(const overrides of Object.values(book.schoolSuiteVersions||{}))if(Object.hasOwn(overrides,id))overrides[id]=next;affected=[book];
 }else{
  state.listeningRevisionCorrections ||= [];
  if(mode!=='normal')state.listeningRevisionCorrections.push({materialId:id,version,before:structuredClone(prior),at:new Date().toISOString(),actor:bookFlowActor()});
  if(version===1){state.listeningBank.materials[id]=material;for(const [qid,q] of Object.entries(state.listeningBank.questions))if(q.scriptId===id)delete state.listeningBank.questions[qid];for(const q of questions)state.listeningBank.questions[q.id]=q;}
  else versions[version]={...versions[version],material,questions,at:new Date().toISOString(),actor:bookFlowActor()};
  affected=listeningRevisionAffected(id,version,state);
 }
 for(const b of affected)if(b.workflow?.published)b.workflow.needsRepublish=true;
}

// Availability belongs to a recording version, not to whether it is historical.
function listeningVersionSelectable(id,version,state=data){
 const source=listeningVersionSource(id,version,state),revision=state.listeningRevisions?.[id]?.[version];
 return !!source.material&&![source.material,revision].some(item=>item&&(item.offline===true||['offline','下线','已下线'].includes(item.status)));
}

// Resolve reference versions from each consumer, never from the latest bank version.
function recordingReferenceRows(id,version){
 const rows=[],suites=typeof resourceStore==='function'?resourceStore().suites:{};
 const add=(row,v)=>{if(version!=null&&v!=null&&Number(v)!==Number(version))return;rows.push({...row,suiteName:suites[row.suiteId]?.name||row.relation,versionText:v==null?'版本未记录':'V'+v})};
 for(const suite of Object.values(suites))if(suite.materialIds?.includes(id))add({key:'suite/'+suite.id,type:'听力套题',name:suite.name,relation:'套题 ID：'+suite.id,suiteId:suite.id},suite.recordingVersions?.[id]||1);
 for(const paper of Object.values(data.gaokaoBookId?{}:bankData().papers||{})){const suite=suites[paper.listeningSuiteId];if(suite?.materialIds.includes(id))add({key:'paper/'+paper.id,type:'高考真题卷',name:paper.year+' '+paper.source,relation:suite.name,paperId:paper.id,suiteId:suite.id},suite.recordingVersions?.[id]||1)}
 for(const book of data.books){
  for(const suite of (typeof bookAnalysisSuites==='function'?bookAnalysisSuites(book):[]))if(suite.materialIds?.includes(id))add({key:book.id+'/'+suite.id,type:'书籍',name:book.name,relation:suite.name,stage:typeof bookCurrentStage==='function'?bookCurrentStage(book):'书籍编排中',bookId:book.id,suiteId:suite.id},book.schoolSuiteVersions?.[suite.id]?.[id]||book.recordingVersions?.[id]||1);
  const published=book.workflow?.published;
  if(published?.materials?.[id])for(const suite of published.suites||[])if(suite.materialIds?.includes(id))add({key:book.id+'/published/'+suite.id,type:'书籍',name:book.name,relation:suite.name,stage:'已发布',bookId:book.id,suiteId:suite.id},suite.recordingVersions?.[id]||published.recordingVersions?.[id]);
 }
 return rows;
}
function navigateReferenceDrawer(row){
 if(row.bookId){resourceTrail=[];bookType=data.books.find(b=>b.id===row.bookId)?.bookType||'听力书籍';bookSection='目录与内容';selectedDirectory=row.nodeId||'';navEditorial('books',row.bookId)}
 else if(row.paperId)resourceOpen('papers',row.paperId,'view');
 else if(row.suiteId)openWholeSuiteEditor({id:row.suiteId},undefined,true);
 else resourceNavigateReference(row);
}
function resourceDrawerRows(rows,context){
 if(context?.kind!=='suites')return rows;
 const suite=resourceCollection('suites')[context.id];
 const result=rows.map(row=>({...row,stage:row.bookId?bookCurrentStage(data.books.find(b=>b.id===row.bookId)):'—',versionText:(suite?.materialIds||[]).map(id=>{const book=data.books.find(b=>b.id===row.bookId);const v=book?(book.schoolSuiteVersions?.[context.id]?.[id]||book.recordingVersions?.[id]||1):(suite.recordingVersions?.[id]||1);return id+' · V'+v}).join('；')||'版本未记录'}));
 for(const book of data.books){const snapshot=book.workflow?.published,published=snapshot?.suites?.find(s=>s.id===context.id);if(published)result.push({key:book.id+'/published/'+context.id,type:'书籍',bookId:book.id,name:book.name,relation:published.name,stage:'已发布',versionText:(published.materialIds||[]).map(id=>{const v=published.recordingVersions?.[id]||snapshot.recordingVersions?.[id];return id+' · '+(v?'V'+v:'版本未记录')}).join('；')})}
 return result;
}

function recordingReferenceVersions(id){
 const versions=new Set(['V1',...Object.keys(data.listeningRevisions?.[id]||{}).map(v=>'V'+v)]);
 for(const row of recordingReferenceRows(id))versions.add(row.versionText);
 return [...versions].sort((a,b)=>a==='版本未记录'?1:b==='版本未记录'?-1:Number(a.slice(1))-Number(b.slice(1)));
}

function referenceBookBusinessId(bookId){
 const book=data.books.find(book=>book.id===bookId);
 return book?(typeof bookValue==='function'?bookValue(book,'bookId'):book.bookId||book.id):bookId;
}
