'use strict';
// Product and editorial workspaces share one local data source.
const editorialPages={books:'书籍产品',vocabulary:'词库',listening:'解析编写',translation:'录音稿与翻译',audio:'音频处理',assignments:'任务分工',reviews:'审核任务','listening-bank':'听力题库','gaokao-bank':'高考真题','corpus-search':'语料查询'};
Object.assign(titles,editorialPages);
let showLegacyBooks=false;
let bookType='听力书籍',activeBook='',bookSection='基本信息',editorialQuery='',editorialBook='',editorialActor='',editorialStatus='';
function workspace(){return data.editorial||{tasks:[],words:[]}}
function commitWorkspace(change){const next=structuredClone(data);next.editorial ||= {tasks:[],words:[]};change(next);try{persistAppData(next);data=next;return true}catch(error){console.warn('Workspace persistence failed:',error.name);toast(error.name==='QuotaExceededError'?'保存失败：浏览器存储额度不足，修改尚未保存':error.name==='SecurityError'?'当前浏览器不允许保存本地页面数据，修改尚未保存':'写入浏览器存储失败，修改尚未保存');return false}}
const taskKinds=['解析编写','录音稿与翻译','音频处理'];
const taskStates=['待分配','编写中','待互审','待修改','审核通过'];
const memberName=id=>data.members.find(m=>m.id===id)?.name||'未分配';
const bookName=id=>data.books.find(b=>b.id===id)?.name||'书籍不存在';
function opts(items,value,placeholder){return (placeholder?`<option value="">${esc(placeholder)}</option>`:'')+items.map(([id,name])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(name)}</option>`).join('')}
function navEditorial(target,book=''){page=target;activeBook=book;editorialQuery='';editorialStatus='';closeMenu();render()}
const oldBooksNav=document.querySelector('.nav [data-page="books"]');
oldBooksNav.setAttribute('aria-expanded','true');oldBooksNav.setAttribute('aria-controls','book-types');oldBooksNav.insertAdjacentHTML('beforeend','<svg class="icon nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>');
oldBooksNav.insertAdjacentHTML('afterend','<div class="subnav" id="book-types"><button data-book-type="听力书籍">听力书籍</button><button data-page="gaokao-bank">高考真题</button></div>');
oldBooksNav.insertAdjacentHTML('beforebegin','<button data-page="vocabulary">'+icon('dictionary')+'词库</button><button id="question-bank-toggle" aria-expanded="true" aria-controls="question-bank-types">'+icon('file')+'题库<svg class="icon nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button><div class="subnav" id="question-bank-types"><button data-page="listening-bank">听力题库</button></div>');
$('#question-bank-toggle').onclick=()=>{const hidden=!$('#question-bank-types').hidden;$('#question-bank-types').hidden=hidden;$('#question-bank-toggle').setAttribute('aria-expanded',String(!hidden))};
const oldListeningNav=document.querySelector('.nav [data-page="listening"]');
oldListeningNav.outerHTML='';
document.querySelector('.nav [data-page="dashboard"]').insertAdjacentHTML('afterend','<button data-page="corpus-search">'+icon('search')+'语料查询</button>');
document.querySelectorAll('.nav [data-page]').forEach(b=>b.onclick=()=>{activeBook='';editorialQuery='';page=b.dataset.page;tab='全部';query='';subject='';grade='';pageNo=1;selected.clear();closeMenu();render()});
oldBooksNav.onclick=()=>{const hidden=!$('#book-types').hidden;$('#book-types').hidden=hidden;oldBooksNav.setAttribute('aria-expanded',String(!hidden))};
document.querySelectorAll('[data-book-type]').forEach(b=>b.onclick=()=>{bookType=b.dataset.bookType;navEditorial('books')});
function editorialRender(){
 const inQuestionBank=page==='listening-bank';
 const inBookProducts=['books','gaokao-bank'].includes(page);
 oldBooksNav.classList.toggle('section-active',inBookProducts);
 $('#question-bank-toggle').classList.toggle('section-active',inQuestionBank);
 if(inQuestionBank||page==='gaokao-bank'){
 document.querySelectorAll('[data-book-type]').forEach(b=>b.classList.remove('active'));
 $('#breadcrumb').innerHTML='<span>'+(page==='gaokao-bank'?'书籍产品':'题库</span><span>/</span><span>听力')+'</span><span>/</span><span>'+editorialPages[page]+'</span>';

 if(typeof renderListeningBank==='function')renderListeningBank();
 return true;
 }

 if(page==='corpus-search'){
 document.querySelectorAll('[data-book-type]').forEach(b=>b.classList.remove('active'));
 $('#breadcrumb').innerHTML='<span>语料查询</span>';
 $('#page').innerHTML=workspaceHead('语料查询')+'<section class="panel">'+emptyWorkspace('暂无语料','语料查询功能将在这里提供。')+'</section>';
 return true;
 }
 if(!(page in editorialPages)){document.querySelectorAll('[data-book-type]').forEach(b=>b.classList.remove('active'));return false;}
 const teaching=!['books','vocabulary'].includes(page);
 document.querySelectorAll('[data-book-type]').forEach(b=>b.classList.toggle('active',page==='books'&&bookType===b.dataset.bookType));
 $('#breadcrumb').innerHTML=`<button class="breadcrumb-link" id="editorial-home">${teaching?'听力教研':titles[page]}</button>${page==='books'||teaching?`<span>/</span><span>${esc(page==='books'?bookType:titles[page])}</span>`:''}${activeBook?`<span>/</span><span>${esc(bookName(activeBook))}</span>`:''}`;
 $('#editorial-home').onclick=()=>navEditorial(page==='books'?'books':teaching?'assignments':'vocabulary');
 if(page==='vocabulary')$('#breadcrumb').innerHTML='<span>词库</span><span>/</span><span>基础词库</span>';
 if(page==='books')renderBookWorkspace();else if(page==='vocabulary')renderVocabulary();else if(page==='audio')renderAudioWorkspace();else renderEditorialTasks();
 return true;
}
function workspaceHead(title,actions='',badge=''){return `<section class="page-head"><div class="page-title-row"><h1>${esc(title)}</h1>${badge}</div><div class="row">${actions}</div></section>`}
function emptyWorkspace(title,description){return `<div class="empty">${icon('file')}<h3>${esc(title)}</h3><p>${esc(description)}</p></div>`}
const bookFields=[['bookId','书籍ID','旧产品id'],['name','书籍名称','产品名称'],['shortName','产品简称','产品简称'],['version','版本','版本'],['productCategory','产品分类','产品分类'],['grade','年级分类','年级分类'],['textbookVersion','教材版本','教材版本'],['recommendedGrades','推荐使用年级（可多选）','推荐使用年级\n（可多选）'],['coverFile','书封图片','书封图片'],['vkdbuy','vkdbuy','vkdbuy']];
const bookListFields=bookFields.filter(([key])=>!['shortName','productCategory','recommendedGrades','coverFile','vkdbuy'].includes(key));
const bookStates=['启用','编写中','禁用'];
function bookState(book){return bookStates.includes(book.availability)?book.availability:({'已发布':'启用','启用':'启用','禁用':'禁用','停用':'禁用'}[book.status]||'编写中')}
function bookStateBadge(book){const status=bookState(book);return `<span class="account-status ${status==='启用'?'active':status==='禁用'?'disabled':'writing'}">${status}</span>`}
function bookStatusLabel(label){const tone=['已定稿','已发布'].includes(label)?'complete':['未发布','已下架'].includes(label)?'neutral':'pending';return `<span class="book-status-label is-${tone}"><span class="bank-status-dot ${tone==='complete'?'is-complete':tone==='pending'?'needs-review':''}" aria-hidden="true"></span>${esc(label)}</span>`}
function bookValue(book,key){if(key==='sourceBook')return data.books.find(b=>b.id===book.sourceListeningBookId)?.name||'--';if(key==='productCategory'&&book.bookType==='听力书籍')return '高中听力';if(book[key]!==undefined&&book[key]!==null)return book[key];const source=book.sourceBookId==='690'&&typeof builtinBook690!=='undefined'?builtinBook690.book:null;const f=bookFields.find(f=>f[0]===key);return source&&f?source[f[2]]??'':key==='bookId'?(book.sourceBookId||book.id):''}
const bookTableFilters={};
const bookTablePages={};
function bookListPublication(book){return typeof bookPublicationStatus==='function'?bookPublicationStatus(book):'未发布'}
function bookPublicationPill(book){const label=bookListPublication(book);return `<span class="book-publication-pill ${['基础发布','已发布'].includes(label)?'is-published':''}">${esc(label)}</span>`}
function bookManuscriptStatus(book){const stage=book.workflow?.stage||'编书中',index={'编书中':0,'解析编写中':1,'审核中':2,'已定稿':3}[stage]??0;return ['编书','编写解析','审核解析'].map((label,i)=>({label,status:i<index?'已完成':i===index?'进行中':'未开始',tone:i<index?'is-complete':i===index?'needs-review':''}))}
function schoolSourceInfo(book){const sources=schoolBookSourceIds(book).map(id=>data.books.find(b=>b.id===id)).filter(Boolean);return sources.length?{id:sources.map(b=>String(bookValue(b,'bookId'))).join('、'),details:sources.map(b=>[String(bookValue(b,'bookId')),b.name])}:book.schoolSuiteVersions?{id:'题库',details:[]}:null}
function renderBookWorkspace(){
 const book=data.books.find(b=>b.id===activeBook);
 if(book){renderBookDetail(book);return}
 const listFields=bookType==='校本书籍'?[...bookListFields.filter(([key])=>!['version','textbookVersion'].includes(key)).map(field=>field[0]==='bookId'?['bookId','校本 ID']:field),['sourceBook','来源书籍 ID']]:bookListFields;
 const allBooks=data.books.filter(b=>(showLegacyBooks||b.sharedResources)&&(b.bookType||'听力书籍')===bookType&&(!editorialQuery||[bookValue(b,'name'),bookValue(b,'bookId'),bookValue(b,'shortName')].join(' ').toLowerCase().includes(editorialQuery.toLowerCase())));
 // Audit metadata includes basic information, directory and referenced-content edits.
 if(bookType==='听力书籍')allBooks.sort((a,b)=>{
  const editedAt=book=>{const time=Date.parse(data.operationAudit?.[JSON.stringify(['books',String(book.id)])]?.at||'');return Number.isFinite(time)?time:0};
  return editedAt(b)-editedAt(a);
 });
 const filters=bookTableFilters[bookType]||{};if(bookType==='校本书籍'){delete filters.version;delete filters.textbookVersion;}const books=allBooks.filter(b=>Object.entries(filters).every(([key,value])=>!value?.length||value.includes(key==='publication'?bookListPublication(b):key==='sourcePublication'?schoolBookSourceStatus(b):String(bookValue(b,key)||'--'))));
 const paging=bookTablePages[bookType] ||= {current:1,pageSize:10};paging.current=Math.max(1,Math.min(paging.current,Math.ceil(books.length/paging.pageSize)||1));const pageBooks=books.slice((paging.current-1)*paging.pageSize,paging.current*paging.pageSize);
 window.BookUI?.disposeTable?.();
 window.BookUI?.disposeHierarchies?.($('#page'));
 $('#page').innerHTML=workspaceHead(bookType)+`<section class="panel"><div class="toolbar"><label class="search">${icon('search')}<input id="book-search" aria-label="搜索书籍" placeholder="${bookType==='校本书籍'?'搜索校本 ID、名称或简称':'搜索书籍ID、名称或简称'}" value="${esc(editorialQuery)}"></label><button type="button" class="btn" id="book-reset-filters">重置筛选</button><div class="book-toolbar-actions">${bookType!=='校本书籍'?'<button class="btn primary" id="create-book">'+icon('plus')+'新建书籍</button>':'<button class="btn primary" id="generate-school-book">生成校本书籍</button>'}</div></div><div class="table-scroll" id="book-products-grid"></div><div class="table-foot" id="book-pagination"></div></section>`;
 const filterOptions=Object.fromEntries((bookType==='校本书籍'?['grade','sourcePublication','publication']:['version','grade','textbookVersion','publication']).map(key=>{const values=[...new Set(allBooks.map(b=>key==='publication'?bookListPublication(b):key==='sourcePublication'?schoolBookSourceStatus(b):String(bookValue(b,key)||'--')))];for(const selected of filters[key]||[])if(!values.includes(selected))values.push(selected);return [key,values]}));
 BookUI.renderBookProductsTable($('#book-products-grid'),{fields:listFields,filters,filterOptions,showManuscript:bookType!=='校本书籍',showSchoolGeneration:false,rows:pageBooks.map(b=>({id:b.id,...Object.fromEntries(listFields.map(([key])=>[key,String(bookValue(b,key)||'--')])),manuscript:bookManuscriptStatus(b),publicationHtml:bookPublicationPill(b),sourcePublication:schoolBookSourceStatus(b),sourceInfo:b.bookType==='校本书籍'?schoolSourceInfo(b):null,school:bookFlow(b).published?`<button class="linkbtn" data-generate-school-book="${esc(b.id)}">生成</button>`:'',actions:`<button class="linkbtn" data-open-book="${esc(b.id)}">进入书籍</button>${b.bookType!=='校本书籍'?`<button class="linkbtn" data-copy-book="${esc(b.id)}">复制</button>`:''}${b.bookType==='校本书籍'?`<button class="linkbtn" data-school-scope="${esc(b.id)}">可用范围</button>`:''}${typeof bookListLifecycleAction==='function'?bookListLifecycleAction(b):''}`})),onChange:next=>{bookTableFilters[bookType]=next;paging.current=1;renderBookWorkspace()}});
 BookUI.renderBankPagination($('#book-pagination'),{current:paging.current,pageSize:paging.pageSize,total:books.length,summary:'共 '+books.length+' 本书籍',onChange:(current,size)=>{paging.current=size===paging.pageSize?current:1;paging.pageSize=size;renderBookWorkspace()}});
 $('#generate-school-book')?.addEventListener('click',()=>openSchoolBookBuilder());
 $('#book-reset-filters').onclick=()=>{bookTableFilters[bookType]={};editorialQuery='';paging.current=1;renderBookWorkspace()};
 document.querySelectorAll('[data-book-lifecycle]').forEach(button=>button.onclick=()=>confirmBookLifecycle(button.dataset.bookLifecycle,button.dataset.bookId));
 document.querySelectorAll('[data-copy-book]').forEach(b=>b.onclick=()=>copyWorkspaceBook(b.dataset.copyBook));
 document.querySelectorAll('[data-school-scope]').forEach(b=>b.onclick=()=>editSchoolBookScope(b.dataset.schoolScope));
 if($('#create-book'))$('#create-book').onclick=()=>editWorkspaceBook();
 document.querySelectorAll('[data-generate-school-book]').forEach(button=>button.onclick=()=>generateSchoolBook(button.dataset.generateSchoolBook));
 $('#book-search').onchange=e=>{editorialQuery=e.target.value.trim();paging.current=1;renderBookWorkspace()};
 document.querySelectorAll('[data-open-book]').forEach(b=>b.onclick=()=>{activeBook=b.dataset.openBook;bookSection='目录与题目';render()});
}
function editWorkspaceBook(id,chooseCover=false){const b=data.books.find(b=>b.id===id)||{};
 openDialog(id?'修改书籍信息':'新建'+bookType,bookEditorBody(b),`<button class="btn" data-close>取消</button><button class="btn primary" id="save-book-info" form="workspace-form">保存</button>`);
 $('#dialog').classList.add('book-info-dialog');$('#dialog').addEventListener('close',()=>$('#dialog').classList.remove('book-info-dialog'),{once:true});
 const coverDraft=setupBookCoverEditor(b);bindRecommendedYears();
 $('#workspace-form').onsubmit=e=>{e.preventDefault();const v=readBookForm(e.target);for(const k of Object.keys(v))v[k]=v[k].trim();const validation=validateBookValues(v,b);if(validation){$('#book-error').textContent=validation;return}if(!v.name||!v.bookId){$('#book-error').textContent='请填写书籍ID和书籍名称';return}if(data.books.some(x=>x.id!==id&&String(bookValue(x,'bookId'))===v.bookId)){$('#book-error').textContent='书籍ID已存在';return}if(!bookStates.includes(v.availability)){$('#book-error').textContent='请选择有效的书籍状态';return}try{Object.assign(v,coverDraft())}catch(error){$('#book-error').textContent=error.message;return}if(commitWorkspace(d=>{const original=d.books.find(x=>x.id===id);if(original)Object.assign(original,v);else d.books.push({...v,id:'BK-'+crypto.randomUUID(),subject:'英语',status:'草稿',count:0,directoryNodes:[]})})){bookType=v.bookType;closeDialog();render();toast('书籍已保存')}};
 if(chooseCover)$('#book-cover-upload').click();
}
// Copy composition containers only; bank material/question IDs remain shared.
function duplicateBookReferences(state,source,values){
 const suiteCopies=new Map();
 function copyEdge(edge){
  const original=state.directoryContents[edge.contentId];if(!original)throw Error('目录内容不存在，无法复制');
  const contentId=directoryContentId(state);
  const items=structuredClone(original.items).map(item=>{
   if(item.kind!=='suites')return item;
   if(!suiteCopies.has(item.id)){
    const suite=state.teachingLibrary.suites[item.id];if(!suite)throw Error('套题不存在，无法复制');
    const id=nextBusinessId('suites',state);
    state.teachingLibrary.suites[id]={...structuredClone(suite),id};suiteCopies.set(item.id,id);
   }
   return {...item,id:suiteCopies.get(item.id)};
  });
  state.directoryContents[contentId]={id:contentId,items,children:original.children.map(copyEdge)};
  return {...structuredClone(edge),id:nextBusinessId('directories',state),contentId};
 }
 const book={...values,id:'BK-'+crypto.randomUUID(),bookId:nextBusinessId('books',state),
  subject:source.subject||'英语',sourceBookId:source.sourceBookId,
  copiedFromBookId:source.id,recordingVersions:structuredClone(source.recordingVersions||{}),coverDataUrl:source.coverDataUrl,coverFile:source.coverFile,
  status:'草稿',availability:'编写中',sharedResources:true,count:source.count||0,
  directoryRoots:(source.directoryRoots||[]).map(copyEdge),directoryNodes:[],
  workflow:{stage:'编书中',steps:['终审'],round:0,reviews:{},history:[],published:null}};
 if(source.coverDataUrl===undefined)delete book.coverDataUrl;
 // Explicit form cover changes take precedence over inherited cover.
 for(const key of ['coverDataUrl','coverFile'])if(Object.hasOwn(values,key))book[key]=values[key];
 book.suiteRecordingOrders=Object.fromEntries([...suiteCopies].filter(([id])=>source.suiteRecordingOrders?.[id]).map(([id,newId])=>[newId,structuredClone(source.suiteRecordingOrders[id])]));
 state.books.push(book);return book.id;
}
function copyWorkspaceBook(id){
 const source=data.books.find(b=>b.id===id);if(!source||source.bookType==='校本书籍')return;
 const initial=Object.fromEntries(bookFields.map(([key])=>[key,bookValue(source,key)]));
 Object.assign(initial,{bookId:nextBookBusinessId(),bookType:source.bookType||'听力书籍',sourceBookId:source.sourceBookId,availability:'编写中'});
 for(const key of ['coverDataUrl','coverFile'])if(Object.hasOwn(source,key))initial[key]=source[key];
 // Use the same information layout as the book's Basic Information tab.
 const template=document.createElement('template');template.innerHTML=bookSummaryMarkup(initial,true);
 template.content.querySelector('.summary-action-slot').remove();
 const nameInput=template.content.querySelector('[name=name]');
 nameInput.setAttribute('aria-describedby','copy-book-name-error');
 nameInput.insertAdjacentHTML('afterend','<p id="copy-book-name-error" class="error" role="alert"></p>');
 openDialog('复制书籍',template.innerHTML,'<button class="btn" data-close>取消</button><button class="btn primary" id="save-book-info" form="workspace-form">确认复制</button>');
 $('#dialog').classList.add('book-info-dialog');$('#dialog').addEventListener('close',()=>$('#dialog').classList.remove('book-info-dialog'),{once:true});
 const cover=setupBookCoverEditor(initial);bindRecommendedYears();
 for(const key of ['name','version'])$('#workspace-form [name='+key+']').oninput=()=>{$('#copy-book-name-error').textContent='';$('#workspace-form [name=name]').removeAttribute('aria-invalid')};
 $('#workspace-form').onsubmit=e=>{
  e.preventDefault();const values=readBookForm(e.target);for(const key of Object.keys(values))values[key]=values[key].trim();
  const current=data.books.find(b=>b.id===id);if(!current){$('#book-error').textContent='原书不存在，无法复制';return}
  if(values.name===String(bookValue(current,'name')).trim()&&Number(values.version)===Number(bookValue(current,'version'))){$('#copy-book-name-error').textContent='书籍名称和版本不能同时与原书相同，请修改书籍名称或版本。';e.target.elements.name.setAttribute('aria-invalid','true');e.target.elements.name.focus();return}
  const validation=validateBookValues(values,initial);if(validation){$('#book-error').textContent=validation;return}
  try{Object.assign(values,cover())}catch(error){$('#book-error').textContent=error.message;return}
  let copiedId;
  if(commitWorkspace(state=>{copiedId=duplicateBookReferences(state,state.books.find(b=>b.id===id),values)})){
   closeDialog();activeBook=copiedId;bookType=values.bookType;bookSection='基本信息';render();toast('书籍已复制');
  }else $('#book-error').textContent='复制失败，请重试';
 };
}
let bookTaskKind='解析编写';
function renderBookDetail(book){
 const sections=book.bookType==='校本书籍'?['基本信息','状态维护','目录与内容']:['基本信息','状态维护','目录与内容','解析编写'];
 if(['目录管理','目录与题目','音频处理'].includes(bookSection))bookSection='目录与内容';
 if(bookSection==='录音稿与翻译'){bookTaskKind=bookSection;bookSection='解析编写'}
 if(!sections.includes(bookSection))bookSection='基本信息';
 $('#page').innerHTML=workspaceHead(book.name,'<button type="button" class="btn" id="back-books">返回书籍列表</button>',typeof bookWorkflowBadges==='function'?bookWorkflowBadges(book):bookStateBadge(book))+`<section class="panel"><div class="tabs">${sections.map(s=>`<button class="tab ${bookSection===s?'active':''}" data-book-section="${s}">${s==='解析编写'?'听力套题':s}</button>`).join('')}</div><div id="book-section" class="workspace-body"></div></section>`;
 $('#back-books').onclick=()=>navEditorial('books');
 document.querySelectorAll('[data-book-section]').forEach(b=>b.onclick=()=>{bookSection=b.dataset.bookSection;if(typeof bookLegacyTasks!=='undefined')bookLegacyTasks=false;render()});
 const target=$('#book-section');
 if(bookSection==='基本信息')renderBookInfo(book,target);
 else if(bookSection==='状态维护')renderBookWorkflow(book,target);
 else if(bookSection==='目录与内容'){renderBookDirectory(book,target,true);if(typeof lockBookDirectory==='function')lockBookDirectory(book,target);}
 else if(typeof renderBookAnalysisSuites==='function')renderBookAnalysisSuites(book,target);
 else {
 target.innerHTML=`<div class="row between" style="margin-bottom:18px"><label class="row">编写任务<select class="input" id="book-task-kind">${opts(taskKinds.map(k=>[k,k]),bookTaskKind)}</select></label><button class="btn primary" id="book-task">新建任务</button></div><p class="muted" style="margin-bottom:16px">保留现有编写与审核任务。录音稿、翻译及音频编辑位于目录与内容的听力板块中。</p>${book.sourceBookId?'<button class="btn" id="browse-source" style="margin-bottom:16px">查看本书原始内容</button>':''}`+taskTable(workspace().tasks.filter(t=>t.bookId===book.id&&t.kind===bookTaskKind));
 $('#book-task-kind').onchange=e=>{bookTaskKind=e.target.value;render()};
 $('#book-task').onclick=()=>editTask(null,book.id,bookTaskKind);bindTaskButtons();
 if($('#browse-source'))$('#browse-source').onclick=()=>{openDialog('本书原始内容','<div id="book-original-content"></div>','<button class="btn" data-close>关闭</button>');renderBuiltinContent(book,$('#book-original-content'))};
 }
}
function renderEditorialTasks(){
 const kind=page==='listening'?'解析编写':page==='translation'?'录音稿与翻译':'';
 const rows=workspace().tasks.filter(t=>(!kind||t.kind===kind)&&(!editorialBook||t.bookId===editorialBook)&&(!editorialStatus||t.status===editorialStatus)&&(!editorialQuery||(t.name+' '+bookName(t.bookId)+' '+t.suite).includes(editorialQuery))&&(page!=='reviews'||t.status==='待互审')&&(!editorialActor||page==='assignments'||(page==='reviews'?t.reviewerId:t.ownerId)===editorialActor));
 $('#page').innerHTML=workspaceHead(titles[page],'<button class="btn primary" id="new-editorial-task">'+icon('plus')+'新建任务</button>')+`<section class="panel"><div class="toolbar"><label class="search">${icon('search')}<input id="task-search" aria-label="搜索任务" placeholder="搜索书籍、套题或任务" value="${esc(editorialQuery)}"></label><select class="filter" id="task-book" aria-label="筛选书籍">${opts(data.books.filter(b=>(b.bookType||'听力书籍')==='听力书籍').map(b=>[b.id,b.name]),editorialBook,'全部书籍')}</select><select class="filter" id="task-status" aria-label="筛选状态">${opts(taskStates.map(s=>[s,s]),editorialStatus,'全部状态')}</select><label class="row muted">演示身份<select class="filter" id="task-actor" aria-label="演示身份">${opts(data.members.filter(m=>!isMemberDisabled(m)).map(m=>[m.id,m.name]),editorialActor,'选择成员')}</select></label></div>${taskTable(rows)}<div class="table-foot">共 ${rows.length} 项任务 · 本地原型，尚未连接多人协作服务</div></section>`;
 $('#new-editorial-task').onclick=()=>editTask(null,editorialBook,kind||'解析编写');
 for(const [sel,set] of [['#task-search',v=>editorialQuery=v],['#task-book',v=>editorialBook=v],['#task-status',v=>editorialStatus=v],['#task-actor',v=>editorialActor=v]])$(sel).onchange=e=>{set(e.target.value);renderEditorialTasks()};
 bindTaskButtons();
}
function taskTable(rows){return rows.length?`<div class="table-scroll"><table><thead><tr><th>任务 / 书籍</th><th>套题</th><th>任务类型</th><th>编写人</th><th>审核人</th><th>当前状态</th><th>发布状态</th><th>操作</th></tr></thead><tbody>${rows.map(t=>`<tr><td><strong class="bookname">${esc(t.name)}</strong><span class="bookmeta">${esc(bookName(t.bookId))}</span></td><td>${esc(t.suite)}</td><td>${esc(t.kind)}</td><td>${esc(memberName(t.ownerId))}</td><td>${esc(memberName(t.reviewerId))}</td><td>${pill(t.status)}</td><td><button class="linkbtn" data-task="${esc(t.id)}">打开任务</button>${['待分配','编写中','待修改'].includes(t.status)?`<button class="linkbtn" data-assign="${esc(t.id)}">分工</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:emptyWorkspace('暂无任务','新建任务，或调整书籍、状态和成员筛选。')}
function bindTaskButtons(){document.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>openTask(b.dataset.task));document.querySelectorAll('[data-assign]').forEach(b=>b.onclick=()=>editTask(b.dataset.assign))}
function editTask(id,bookId='',kind='解析编写'){
 const books=data.books.filter(b=>(b.bookType||'听力书籍')==='听力书籍');if(!books.length){toast('请先在书籍产品中新建听力书籍');navEditorial('books');return}
 const t=workspace().tasks.find(x=>x.id===id)||{bookId,kind};const members=data.members.filter(m=>!isMemberDisabled(m)).map(m=>[m.id,m.name]);
 const select=(label,name,items,value,placeholder)=>`<label class="field"><span>${label}</span><select class="input" name="${name}">${opts(items,value,placeholder)}</select></label>`;
 openDialog(id?'任务分工':'新建任务',`<form id="task-form"><div class="form-grid">${field('任务名称','name',t.name||'','text',true)}${select('所属书籍','bookId',books.map(b=>[b.id,b.name]),t.bookId)}${select('任务类型','kind',taskKinds.map(k=>[k,k]),t.kind)}${field('套题名称 / 编号','suite',t.suite||'','text',true)}${select('编写人','ownerId',members,t.ownerId,'暂不分配')}${select('审核人','reviewerId',members,t.reviewerId,'暂不分配')}</div><p class="error" id="task-error"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" form="task-form">保存</button>`);
 $('#task-form').onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));if(!v.name.trim()||!v.suite.trim()){ $('#task-error').textContent='请填写任务名称和套题';return}if(v.ownerId&&v.ownerId===v.reviewerId){$('#task-error').textContent='编写人与审核人不能是同一人';return}if(commitWorkspace(d=>{const old=d.editorial.tasks.find(x=>x.id===id);const status=v.ownerId&&v.reviewerId?(old?.status==='待修改'?'待修改':'编写中'):'待分配';if(old)Object.assign(old,v,{status,date:today()});else d.editorial.tasks.unshift({...v,id:'TASK-'+crypto.randomUUID(),status,content:'',translation:'',history:[],date:today()})})){closeDialog();render();toast('任务已保存')}};
}
function taskTransition(task,action,actor,note=''){
 if(action==='submit'){if(!['编写中','待修改'].includes(task.status)||actor!==task.ownerId)throw Error('请使用编写人身份提交');if(!task.ownerId||!task.reviewerId||task.ownerId===task.reviewerId)throw Error('请先指定不同的编写人和审核人');if(!task.content.trim())throw Error('请先保存任务内容');return '待互审'}
 if(task.status!=='待互审'||actor!==task.reviewerId||actor===task.ownerId)throw Error('请使用指定审核人身份处理');
 if(action==='return'&&!note.trim())throw Error('请填写退回原因');
 if(action==='approve')return '审核通过';if(action==='return')return '待修改';throw Error('无效操作');
}
function openTask(id){const t=workspace().tasks.find(x=>x.id===id);if(!t)return;
 const editable=['编写中','待修改'].includes(t.status)&&editorialActor===t.ownerId;
 const reviewer=t.status==='待互审'&&editorialActor===t.reviewerId&&t.ownerId!==t.reviewerId;
 openDialog(t.name,`${t.sourceSuiteId?'<button class="btn" id="task-source" style="margin-bottom:16px">查看原始录音稿、题目与解析</button>':''}<p class="muted">${esc(bookName(t.bookId))} / ${esc(t.suite)} · ${esc(t.kind)} · ${esc(t.status)}</p><label class="field"><span>内容${t.kind==='录音稿与翻译'?'（录音稿原文）':''}</span><textarea class="input" id="task-content" rows="8" ${editable?'':'readonly'}>${esc(t.content)}</textarea></label>${t.kind==='录音稿与翻译'?`<label class="field"><span>中文翻译</span><textarea class="input" id="task-translation" rows="6" ${editable?'':'readonly'}>${esc(t.translation)}</textarea></label>`:''}${reviewer?'<label class="field"><span>审核意见（退回必填）</span><textarea class="input" id="review-note" rows="3"></textarea></label>':''}<p class="muted">当前演示身份：${esc(memberName(editorialActor))}。${editable?'保存内容后可提交互审。':reviewer?'请审核后通过或退回。':'可在教研工作台切换演示身份。'}</p>${(t.history||[]).length?`<div class="detail-box">${t.history.map(h=>`<p>${esc(h.date)} · ${esc(h.actor)} · ${esc(h.status)} ${esc(h.note)}</p>`).join('')}</div>`:''}`,`<button class="btn" data-close>${editable||reviewer?'取消':'关闭'}</button>${editable?'<button class="btn" id="save-task">保存</button><button class="btn primary" id="submit-task">提交互审</button>':''}${reviewer?'<button class="btn" id="return-task">退回修改</button><button class="btn primary" id="approve-task">审核通过</button>':''}`);
 if(t.sourceSuiteId)$('#task-source').onclick=()=>{closeDialog();builtinSuite=t.sourceSuiteId;selectedDirectory='suite-'+t.sourceSuiteId;activeBook=t.bookId;bookSection='目录与内容';page='books';render()};
 function persistContent(){return commitWorkspace(d=>{const x=d.editorial.tasks.find(x=>x.id===id);x.content=$('#task-content').value;x.translation=$('#task-translation')?.value||'';x.date=today()})}
 if(editable){$('#save-task').onclick=()=>{if(persistContent())toast('内容已保存')};$('#submit-task').onclick=()=>{if(!$('#task-content').value.trim())return toast('请先填写任务内容');if(persistContent())transition('submit')}}
 function transition(action){const note=$('#review-note')?.value||'';try{const current=workspace().tasks.find(x=>x.id===id),status=taskTransition(current,action,editorialActor,note);if(commitWorkspace(d=>{const x=d.editorial.tasks.find(x=>x.id===id);x.status=status;x.date=today();x.history.push({status,note,actor:memberName(editorialActor),date:today()})})){closeDialog();render();toast(status)}}catch(e){toast(e.message)}}
 if(reviewer){$('#return-task').onclick=()=>transition('return');$('#approve-task').onclick=()=>transition('approve')}
}
function renderVocabulary(){const words=workspace().words.filter(w=>!editorialQuery||(w.word+' '+w.meaning).toLowerCase().includes(editorialQuery.toLowerCase()));
 $('#page').innerHTML=workspaceHead('词库','<button class="btn primary" id="new-word">'+icon('plus')+'新增词条</button>')+`<section class="panel"><div class="toolbar"><label class="search">${icon('search')}<input id="word-search" aria-label="搜索词条" placeholder="搜索单词、短语或释义" value="${esc(editorialQuery)}"></label><span class="muted">公共词库 · 共 ${words.length} 个词条</span></div>${words.length?`<table><thead><tr><th>单词 ID</th><th>单词 / 短语</th><th>词性</th><th>中文释义</th><th>操作</th></tr></thead><tbody>${words.map(w=>`<tr><td>${esc(w.wordId||w.sourceWordId||w.id)}</td><td>${esc(w.word)}</td><td>${esc(w.pos)}</td><td style="white-space:normal">${esc(w.meaning)}</td><td><button class="linkbtn" data-word="${esc(w.id)}">修改</button></td></tr>`).join('')}</tbody></table>`:emptyWorkspace('词库尚无词条','可先新增词条；Excel 中的完整词库尚未导入。')}</section>`;
 $('#new-word').onclick=()=>editWord();$('#word-search').onchange=e=>{editorialQuery=e.target.value;renderVocabulary()};document.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>editWord(b.dataset.word));
}
function editWord(id){const w=workspace().words.find(w=>w.id===id)||{};openDialog(id?'修改词条':'新增词条',`<form id="word-form">${field('单词 / 短语','word',w.word||'')}${field('词性','pos',w.pos||'','text',false,false)}<label class="field"><span>中文释义</span><textarea class="input" name="meaning" required>${esc(w.meaning||'')}</textarea></label></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" form="word-form">保存</button>`);$('#word-form').onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));v.word=v.word.trim();if(!v.word||!v.meaning.trim())return toast('请填写词条和释义');if(commitWorkspace(d=>{const old=d.editorial.words.find(x=>x.id===id);if(old)Object.assign(old,v);else d.editorial.words.push({...v,id:'WORD-'+crypto.randomUUID(),wordId:nextBusinessId('words',d)})})){closeDialog();render();toast('词条已保存')}}}
function renderBookWords(book,target){const ids=new Set(book.wordIds||[]);target.innerHTML=`<p class="muted" style="margin-bottom:16px">选择本书使用的公共词条，释义由词库统一维护。</p>${workspace().words.length?`<div class="word-picker">${workspace().words.map(w=>`<label><input type="checkbox" data-book-word="${esc(w.id)}" ${ids.has(w.id)?'checked':''}> <strong>${esc(w.word)}</strong> <span class="muted">${esc(w.meaning)}</span></label>`).join('')}</div><button class="btn primary" id="save-book-words">保存本书词汇</button>`:emptyWorkspace('公共词库尚无词条','请先到左侧词库添加词条。')}`;if($('#save-book-words'))$('#save-book-words').onclick=()=>{const wordIds=[...target.querySelectorAll('[data-book-word]:checked')].map(x=>x.dataset.bookWord);if(commitWorkspace(d=>d.books.find(b=>b.id===book.id).wordIds=wordIds))toast('本书词汇已保存')}}
function renderAudioWorkspace(){
 const books=data.books.filter(b=>(b.bookType||'听力书籍')==='听力书籍');
 $('#page').innerHTML=workspaceHead('音频处理')+`<section class="panel workspace-body"><h2>书籍录音稿与时间轴</h2><p class="muted" style="margin:12px 0 24px">在套题中上传音频、逐句试听、对照翻译、调整时间和拆分句子，保存到对应录音稿。</p>${books.length?`<div class="row"><select class="input" id="audio-workspace-book" aria-label="选择书籍" style="max-width:420px">${opts(books.map(b=>[b.id,b.name]),editorialBook||books[0].id)}</select><button class="btn primary" id="open-book-audio">进入书籍目录</button></div>`:emptyWorkspace('暂无听力书籍','请先创建听力书籍和套题。')}</section>`;
 if(books.length)$('#open-book-audio').onclick=()=>{activeBook=$('#audio-workspace-book').value;bookSection='目录与题目';page='books';render()};
}
