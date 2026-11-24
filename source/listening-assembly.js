function suiteStructureEditable(suiteId,bookId){
 if(!bookStructureEditable(bookId))return false;
 if(!suiteId)return true;
 const uses=resourceReferenceRows('suites',suiteId);
 const books=data.books.filter(book=>bookAnalysisSuites(book).some(s=>String(s.id)===String(suiteId))||uses.some(row=>row.bookId===book.id));
 if(books.some(book=>bookFlow(book).stage!=='编书中'))return false;
 if(data.books.some(book=>book.workflow?.published?.suites?.some(s=>String(s.id)===String(suiteId))))return false;
 // Migrated papers are represented by the gaokao book; old standalone papers have no stage yet.
 for(const paper of Object.values(bankData().papers||{}))if(paper.listeningSuiteId===suiteId){
  const migrated=data.books.some(book=>(book.directoryNodes||[]).some(node=>node.sourcePaperId===paper.id));
  if(!migrated)return false;
 }
 return true;
}
var suiteEditorDraft;
function getSuiteDraft(id){const source=resourceCollection('suites')[id];if(!source)return null;if(!suiteEditorDraft||suiteEditorDraft.id!==id)suiteEditorDraft={id,value:structuredClone(source),base:JSON.stringify({name:source.name,materialIds:source.materialIds})};return suiteEditorDraft.value}
function suiteDraftDirty(){return !!suiteEditorDraft&&suiteEditorDraft.base!==JSON.stringify({name:suiteEditorDraft.value.name,materialIds:suiteEditorDraft.value.materialIds})}
function saveSuiteDraft(){if(!suiteEditorDraft)return true;const value=suiteEditorDraft.value;const source=resourceCollection('suites')[value.id];if(!suiteStructureEditable(value.id)&&JSON.stringify(value.materialIds)!==JSON.stringify(source.materialIds)){toast('引用方已进入后续阶段，不能增删题目');return false}if(!value.name.trim()){toast('请输入套题名称');return false}if(!commitWorkspace(d=>Object.assign(resourceCollection('suites',d)[value.id],{name:value.name.trim(),materialIds:[...value.materialIds]})))return false;value.name=value.name.trim();suiteEditorDraft.base=JSON.stringify({name:value.name,materialIds:value.materialIds});return true}
function leaveSuiteEditor(next){if(!suiteDraftDirty()){suiteEditorDraft=null;next();return}openDialog('尚未保存','<p>套题有未保存的修改。</p>','<button class="btn" data-close>继续编辑</button><button class="btn" id="suite-discard">放弃修改</button><button class="btn primary" id="suite-save-leave">保存并离开</button>');$('#suite-discard').onclick=()=>{suiteEditorDraft=null;closeDialog();next()};$('#suite-save-leave').onclick=()=>{if(saveSuiteDraft()){suiteEditorDraft=null;closeDialog();next()}}}
document.addEventListener('click',e=>{const nav=e.target.closest('.nav button[data-page],.nav button[data-book-type]');if(!nav||!suiteEditorDraft)return;if(suiteDraftDirty()){e.preventDefault();e.stopImmediatePropagation();leaveSuiteEditor(()=>nav.click())}else suiteEditorDraft=null},true);
window.addEventListener('beforeunload',e=>{if(suiteDraftDirty()){e.preventDefault();e.returnValue=''}});
'use strict';
function basketIds(){return (data.listeningBasket||[]).filter(id=>bankData().materials[id])}
function basketVersion(id){return data.listeningBasketVersions?.[id]||1}
function basketSource(id){return listeningVersionSource(id,basketVersion(id))}
function basketSummary(){const ids=basketIds();return `${ids.length} 篇录音稿 · ${ids.reduce((sum,id)=>sum+basketSource(id).questions.length,0)} 道小题`}
function updateBasketButton(){const el=$('#listening-basket');if(el)el.textContent='去组成套题（'+basketSummary().replaceAll(' ','')+'）'}
window.ListeningAssembly={ids:basketIds,keys:()=>basketIds().map(id=>id+'::V'+basketVersion(id)),select(rows,checked){
 const eligible=rows.map(row=>typeof row==='string'?{id:row,version:listeningLatestVersion(row)}:row).filter(row=>!checked||listeningVersionSelectable(row.id,row.version));
 if(commitWorkspace(d=>{
  const ids=new Set(basketIds());d.listeningBasketVersions ||= {};
  for(const row of eligible){if(checked){ids.add(row.id);d.listeningBasketVersions[row.id]=row.version}else if((d.listeningBasketVersions[row.id]||1)===row.version){ids.delete(row.id);delete d.listeningBasketVersions[row.id]}}
  d.listeningBasket=[...ids];
 })){drawBankList();updateBasketButton()}
}};

function openListeningBasket(){
 const ids=basketIds();let questionNumber=0;
 const trash='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>';
 const grip='<svg width="14" height="20" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="1"/><circle cx="8" cy="4" r="1"/><circle cx="4" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="8" cy="12" r="1"/></svg>';
 openDialog('试题篮',`<div id="basket-composer">${ids.map((id,index)=>`<article class="basket-recording" data-basket-id="${esc(id)}"><div class="basket-recording-head"><button class="directory-sort-handle" draggable="true" aria-label="拖动调整录音稿顺序，也可使用上下方向键">${grip}</button><span class="basket-order">${index+1}</span><strong>录音稿 ID：${esc(id)} · V${basketVersion(id)}</strong><span class="muted">${basketSource(id).questions.length} 道小题</span><button class="basket-delete" data-basket-remove="${esc(id)}" aria-label="从试题篮移除录音稿 ${esc(id)}">${trash}</button></div><div class="basket-recording-body"><section class="basket-transcript"><h3>录音稿</h3><p>${displayTranscriptMarkup(basketSource(id).material)}</p></section><section class="basket-questions"><h3>试题</h3>${basketSource(id).questions.map(q=>`<div class="basket-question"><p><strong>${++questionNumber}.</strong> ${esc(q.text)}</p><div class="basket-options">${q.options.map(o=>`<div class="${(q.answerKey?o.key===q.answerKey:o.text===q.answer||o.key===q.answer)?'bank-correct-option':''}"><span>${esc(o.key)}.</span><span>${esc(o.text)}</span></div>`).join('')}</div></div>`).join('')||'<p class="muted">--</p>'}</section></div></article>`).join('')||'<div class="basket-empty">试题篮为空</div>'}</div>`, '<button class="btn resource-danger" id="basket-clear" '+(!ids.length?'disabled':'')+'>清空</button><button class="btn primary" id="basket-save" '+(!ids.length?'disabled':'')+'>保存为听力套题</button>');
 $('#dialog-title').insertAdjacentHTML('afterend','<span class="basket-header-count">'+basketSummary()+'</span>');
 const refresh=()=>{drawBankList();updateBasketButton();openListeningBasket()};
 document.querySelectorAll('[data-basket-remove]').forEach(button=>button.onclick=()=>{if(commitWorkspace(d=>{d.listeningBasket=basketIds().filter(id=>id!==button.dataset.basketRemove)}))refresh()});
 bindDirectorySorting([...document.querySelectorAll('[data-basket-id]')],()=>'',(from,to,after)=>{if(commitWorkspace(d=>{const next=basketIds();moveDirectoryEntry(next,next.indexOf(from.dataset.basketId),next.indexOf(to.dataset.basketId),after);d.listeningBasket=next}))refresh()});
 $('#basket-clear').onclick=()=>{if(commitWorkspace(d=>{d.listeningBasket=[]}))refresh()};
 $('#basket-save').onclick=()=>resourceNameForm('保存为听力套题','',(name)=>{let id;if(commitWorkspace(d=>{id=resourceNextId('suites',d);resourceCollection('suites',d)[id]={id,name,materialIds:ids.filter(mid=>d.listeningBank.materials[mid]),recordingVersions:Object.fromEntries(ids.map(mid=>[mid,basketVersion(mid)]))};d.listeningBasket=[]})){closeDialog();page='listening-suites';resourceOpen('suites',id)}});
}
function openDirectoryAdd(contentId,insertIndex=null){
 const active=data.books.find(b=>b.id===activeBook);if(active?.bookType==='校本书籍')return openSchoolBookBuilder(active.id,contentId,insertIndex);
 const insertItems=(items,added)=>items.splice(insertIndex===null?items.length:Math.min(insertIndex,items.length),0,...added);
 let kind='suites';const picks={suites:new Set(),wordlists:new Set(),practices:new Set()},names={},queries={};
 function createNew(){
  activate('new');$('#directory-add-panel').innerHTML=`<h3>批量新增${resourceKinds[kind]}</h3><label class="field directory-add-inline"><span>${kind==='suites'?'套题名称':'名称'}</span><input class="input" id="directory-add-name" maxlength="160" value="${esc(names[kind]||'')}"></label><p class="error" id="directory-add-error" role="alert"></p>`;
  $('#directory-add-name').oninput=e=>names[kind]=e.target.value;
  $('#directory-add-confirm').onclick=()=>{const name=(names[kind]||'').trim();if(!name){$('#directory-add-error').textContent='请输入名称';return}if(kind==='suites'){closeDialog();let created=false;openListeningCreate(true,null,{category:'普通题',onSaved:ids=>{if(created||!ids.length)return;const ok=commitWorkspace(d=>{const target=d.directoryContents[contentId];if(!target)throw Error('目标目录已不存在');const suiteId=resourceNextId('suites',d);resourceCollection('suites',d)[suiteId]={id:suiteId,name,materialIds:[...new Set(ids)]};insertItems(target.items,[{kind:'suites',id:suiteId}])});if(ok){created=true;render()}}});return}let id;if(commitWorkspace(d=>{id=resourceNextId(kind,d);resourceCollection(kind,d)[id]={id,name,...(kind==='suites'?{materialIds:[]}:kind==='wordlists'?{wordIds:[]}:{materialId:'',segmentId:'',answer:''})};insertItems(d.directoryContents[contentId].items,[{kind,id}])})){closeDialog();resourceOpen(kind,id)}};
 }
 function draw(){
  activate('existing');$('#directory-add-panel').innerHTML=`<h3>引用${resourceKinds[kind]}<small>可多选</small></h3><div id="directory-add-picker"></div><p class="error" id="directory-add-error" role="alert"></p>`;
  const attached=data.directoryContents[contentId].items;
  BookUI.renderDirectoryMultiSelect($('#directory-add-picker'),{options:Object.values(resourceCollection(kind)).filter(r=>!attached.some(i=>i.kind===kind&&i.id===r.id)).map(r=>({value:r.id,label:resourceName(kind,r.id)})),value:[...picks[kind]],onChange:ids=>{picks[kind]=new Set(ids)}});
  $('#directory-add-confirm').onclick=()=>{if(!picks[kind].size){$('#directory-add-error').textContent='请选择内容';return}if(commitWorkspace(d=>{const items=d.directoryContents[contentId].items;insertItems(items,[...picks[kind]].filter(id=>!items.some(i=>i.kind===kind&&i.id===id)).map(id=>({kind,id})))})){closeDialog();render()}};
 }
 function activate(mode){
  BookUI.disposeHierarchies($('#directory-add-panel'));
  $('#directory-add-confirm').disabled=false;
  document.querySelectorAll('[data-content-card]').forEach(card=>card.classList.toggle('is-active',card.dataset.contentCard===kind));
  document.querySelectorAll('[data-directory-reference],[data-directory-create]').forEach(button=>{const selected=mode==='existing'?button.dataset.directoryReference===kind:button.dataset.directoryCreate===kind;button.checked=selected;button.closest('.directory-mode-switch').classList.toggle('is-new',mode==='new'&&button.closest('[data-content-card]').dataset.contentCard===kind)});
 }
 function showCards(){
  openDialog('新增内容',`<div class="directory-add-cards">${(!optionalFeaturesExpanded()?['suites']:['wordlists','suites','practices']).map((k,i)=>`<section class="directory-add-card" data-content-card="${k}"><div class="directory-card-heading"><span class="directory-card-icon">${icon(k==='suites'?'headphones':k==='wordlists'?'dictionary':'file')}</span><div><h3>${resourceKinds[k]}</h3></div></div><div class="directory-mode-switch" role="group" aria-label="${resourceKinds[k]}添加方式"><label><input type="radio" name="directory-content-mode" value="${k}:existing" data-directory-reference="${k}" aria-label="${resourceKinds[k]}：引用"><span>引用</span></label><label><input type="radio" name="directory-content-mode" value="${k}:new" data-directory-create="${k}" aria-label="${resourceKinds[k]}：批量新增"><span>批量新增</span></label></div></section>`).join('')}</div><section id="directory-add-panel" aria-live="polite"></section>`,'<button class="btn" data-close>取消</button><button class="btn primary" id="directory-add-confirm" disabled>确定</button>');
  document.querySelectorAll('[data-directory-reference]').forEach(button=>button.onclick=()=>{kind=button.dataset.directoryReference;draw()});
  document.querySelectorAll('[data-directory-create]').forEach(button=>button.onclick=()=>{kind=button.dataset.directoryCreate;createNew()});
  draw();
 }
 showCards();
}
render();

function renderListeningSuiteContents(suite,host){
 const source=id=>listeningVersionSource(id,suite.recordingVersions?.[id]||1);
 const materials=suite.materialIds.map(id=>source(id).material).filter(Boolean);
 host.innerHTML='<div class="suite-material-table bank-question-table"></div>';
 BookUI.renderSuiteTable(host.querySelector('.suite-material-table'),materials.map(m=>({...m,questionType:bankMaterialType(m),topics:[...new Set([...bankTagValues(m.topics),...source(m.id).questions.flatMap(q=>bankLabels(q).topics)])],questions:source(m.id).questions.map(q=>({...q,points:bankLabels(q).points||[]}))})),id=>{
 if(!suiteStructureEditable(suite.id)){toast('引用方已进入后续阶段，不能删题');return}
 openDialog('解除引用','<p>确认解除当前套题对此录音稿的引用？</p>','<button class="btn" data-close>取消</button><button class="btn danger" id="suite-remove-confirm">解除引用</button>');
 $('#suite-remove-confirm').onclick=()=>{if(!suiteStructureEditable(suite.id))return;suite.materialIds=suite.materialIds.filter(mid=>mid!==id);closeDialog();render()};
 },id=>openListeningCreate(true,{materialId:id,version:suite.recordingVersions?.[id]||1,stage:2,readOnly:true}),id=>openWholeSuiteEditor({id:suite.id},id));
 bindDirectorySorting([...host.querySelectorAll('.ant-table-row')],()=>'',(from,to,after)=>{const ids=suite.materialIds;moveDirectoryEntry(ids,ids.indexOf(from.dataset.rowKey),ids.indexOf(to.dataset.rowKey),after);render()});
 $('#suite-add-material').onclick=()=>resourcePick('从听力题库添加录音稿',Object.values(bankData().materials).filter(m=>!suite.materialIds.includes(m.id)).map(m=>({id:m.id,name:displayTranscript(m),transcript:m})),[],ids=>{if(!suiteStructureEditable(suite.id))return false;suite.materialIds=[...new Set([...suite.materialIds,...ids])];render();return true});
}


function bookAnalysisSuites(book){
 const found=new Map(),visited=new Set();
 const add=id=>{const suite=resourceCollection('suites')[id];if(suite&&!found.has(String(id)))found.set(String(id),suite)};
 function walk(contentId){if(visited.has(contentId))return;visited.add(contentId);const content=data.directoryContents?.[contentId];if(!content)return;for(const item of content.items||[])if(item.kind==='suites')add(item.id);for(const child of content.children||[])walk(child.contentId)}
 for(const edge of book.directoryRoots||[])walk(edge.contentId);
 for(const node of bookDirectoryNodes(book)){
  if(node.contentId)walk(node.contentId);
  if(node.kind==='套题'){const id=String(node.sourceSuiteId||node.id);if(found.has(id))continue;const shared=resourceCollection('suites')[id];found.set(id,shared||{id,name:node.name,materialIds:rawSuiteContent(book,node).scripts.map(m=>m.id),legacyNode:node})}
 }
 return [...found.values()].map(suite=>({...suite,materialIds:orderedBookRecordings(book,suite)}));
}
function bookSuiteAnalysisStatus(suite){
 const materials=(suite.materialIds||[]).map(id=>bankData().materials[id]);
 if(materials.some(m=>(m?.teachingNotes||[]).some(n=>n.needsReview)))return '待复核';
 const count=materials.filter(m=>m?.teachingNotes?.length).length;
 return !count?'待编写':count===materials.length?'已完成':'编写中';
}
function renderBookAnalysisSuites(book,target){
 const suites=bookAnalysisSuites(book),flow=typeof bookFlow==='function'?bookFlow(book):{stage:'编书中'};
 target.innerHTML=`<div class="book-analysis-suites"><table><colgroup><col style="width:120px"><col><col style="width:120px"><col style="width:240px"></colgroup><thead><tr><th>套题ID</th><th>套题名称</th><th>状态</th><th>操作</th></tr></thead><tbody>${suites.map((suite,i)=>`<tr><td>${esc(suite.id)}</td><td>${esc(suite.name||'--')}</td><td><span class="pill">${flow.stage==='审核中'?(flow.reviews[suite.id]?.[flow.round]?.passed?'本轮已通过':flow.steps[flow.round]+'待审核'):bookSuiteAnalysisStatus(suite)}</span></td><td><div class="book-analysis-actions"><button class="linkbtn" data-book-suite-analysis="${i}" ${suite.materialIds?.length&&flow.stage!=='编书中'?'':'disabled'}>编写解析点拨</button><button class="linkbtn" data-book-suite-cloze="${i}" ${suite.materialIds?.length&&flow.stage!=='编书中'?'':'disabled'}>编写精听挖空</button></div></td></tr>`).join('')||'<tr><td colspan="4" class="muted" style="text-align:center;padding:40px">--</td></tr>'}</tbody></table></div>`;
 const openSuite=(suite,view)=>{
  if(bookFlow(book).stage==='编书中')return;
  const ids=orderedBookRecordings(book,suite).filter(id=>bankData().materials[id]);if(!ids.length)return;
  const open=id=>openListeningCreate(true,{materialId:id,view,readOnly:false},{bookId:book.id,onSaved:()=>{if(typeof bookRecordRevision==='function')bookRecordRevision(book.id,suite);render()},suiteMaterials:ids,suiteId:suite.id});
  open(ids[0]);
 };
 target.querySelectorAll('[data-book-suite-analysis]').forEach(button=>button.onclick=()=>openSuite(suites[Number(button.dataset.bookSuiteAnalysis)],'analysis'));
 target.querySelectorAll('[data-book-suite-cloze]').forEach(button=>button.onclick=()=>openSuite(suites[Number(button.dataset.bookSuiteCloze)],'cloze'));
}

function openWholeSuiteEditor(entry,materialId,readOnly=false){
 const suite=resourceCollection('suites')[entry.id];if(!suite)return;
 const book=data.books.find(b=>b.id===entry.bookReference?.bookId);
 if(book?.bookType==='校本书籍')readOnly=true;
 const ids=(book?orderedBookRecordings(book,suite):suite.materialIds||[]).filter(id=>bankData().materials[id]);
 openListeningCreate(true,{materialId:ids.includes(materialId)?materialId:ids[0],view:'content',readOnly},{bookId:book?.id,suiteMaterials:ids,suiteId:suite.id,onSaved:()=>{if(book&&typeof bookRecordRevision==='function')bookRecordRevision(book.id,suite);render()}});
}
function chooseSuiteEdit(entry){
 const book=data.books.find(b=>b.id===entry.bookReference?.bookId);if(book?.bookType==='校本书籍')return openWholeSuiteEditor(entry,undefined,true);
 if(book&&typeof bookFlow==='function'&&bookFlow(book).stage!=='编书中'){openWholeSuiteEditor(entry);return}
 openDialog('修改套题','<div class="suite-edit-choices"><button class="btn" id="suite-update-original">更新原套题</button><button class="btn primary" id="suite-copy-new">另存为新套题</button></div>','<button class="btn" data-close>取消</button>');
 $('#suite-update-original').onclick=()=>{closeDialog();openWholeSuiteEditor(entry)};
 $('#suite-copy-new').onclick=()=>{let nextId;const ok=commitWorkspace(d=>{nextId=copyReferencedSuite(entry,d)});if(ok){suiteEditorDraft=null;entry.id=nextId;entry.mode='view';closeDialog();render();openWholeSuiteEditor(entry)}};
}

function copyReferencedSuite(entry,state){
 if(entry.bookReference&&!bookStructureEditable(entry.bookReference.bookId))throw Error('请先退回书籍编排再复制套题');
 if(state.books.find(b=>b.id===entry.bookReference?.bookId)?.bookType==='校本书籍')throw Error('校本书籍仅可引用已有套题');
 const original=resourceCollection('suites',state)[entry.id];if(!original)throw Error('套题不存在');
 const suite=structuredClone(original),bank=bankData(state),map=new Map();suite.id=resourceNextId('suites',state);suite.name=original.name+'（副本）';
 for(const mid of original.materialIds){if(!bank.materials[mid])continue;const next=nextBankMaterialId(state);map.set(String(mid),next);bank.materials[next]={id:next};for(const q of Object.values(bank.questions).filter(q=>q.scriptId===mid))map.set(String(q.id),nextBusinessId('questions',state));}
 const remap=value=>{if(typeof value==='string')return map.get(value)||value;if(Array.isArray(value))return value.map(remap);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v)]));return value};
 for(const mid of original.materialIds){const next=map.get(String(mid));if(!next)continue;bank.materials[next]=remap(structuredClone(bank.materials[mid]));for(const q of Object.values(bank.questions).filter(q=>q.scriptId===mid)){const copy=remap(structuredClone(q));bank.questions[copy.id]=copy}}
 suite.materialIds=original.materialIds.map(id=>map.get(String(id))||id);resourceCollection('suites',state)[suite.id]=suite;
 if(entry.bookReference){const ref=entry.bookReference,book=state.books.find(b=>b.id===ref.bookId);if(!book)throw Error('书籍不存在');const nodes=projectBookDirectories(book,state).filter(n=>n.id===ref.nodeId||ref.nodeId.startsWith(n.id+'/')).sort((a,b)=>a.id.length-b.id.length);let edges=book.directoryRoots,content;for(const node of nodes){const edge=edges.find(e=>e.id===node.edgeId);if(!edge)throw Error('目录不存在');const old=state.directoryContents[edge.contentId],id=directoryContentId(state);content={...structuredClone(old),id};state.directoryContents[id]=content;edge.contentId=id;edges=content.children;}if(!content||content.items[ref.index]?.id!==entry.id)throw Error('引用已变化');content.items[ref.index]={...content.items[ref.index],id:suite.id};}
 return suite.id;
}

function orderedBookRecordings(book,suite){
 const ids=suite.materialIds||[],order=book?.suiteRecordingOrders?.[suite.id]||[];
 return [...order.filter(id=>ids.includes(id)),...ids.filter(id=>!order.includes(id))];
}
