'use strict';
// Shared content objects are independent of the books which reference them.
const resourceKinds={packages:'资源包',suites:'听力套题',wordlists:'词汇表',practices:'听力练习',papers:'高考真题卷'};
let resourceTab='suites',resourceTrail=[];
function resourceStore(state=data){return state.teachingLibrary}
function resourceCollection(kind,state=data){return kind==='papers'?bankData(state).papers:resourceStore(state)[kind]}
function resourceNextId(kind,state){return nextBusinessId(kind,state)}
function ensureTeachingExample(){
 if(data.teachingLibrary?.exampleVersion)return;
 ensureListeningBankImport();ensureGaokaoListeningExample();ensureGaokaoPapers();ensureBankDemoCompletion();
 commitWorkspace(d=>{
  const lib=d.teachingLibrary ||= {packages:{},suites:{},wordlists:{},practices:{},sequence:1000};
  const bank=d.listeningBank;
  for(const m of listening686Example.materials)bank.materials[m.id] ||= structuredClone(m);
  for(const q of listening686Example.questions)bank.questions[q.id] ||= structuredClone(q);
  const vocabulary=[['headache','n [C]','令人头疼的人 / 事物；麻烦'],['salty','adj','咸的'],['oily','adj','含油多的'],['fresh','adj','新鲜的'],['save','vi & vt','节省；节约'],['go for a bicycle ride','','去骑自行车'],['be speeding','','超速驾驶'],['no wonder','','难怪'],['health service','','保健服务中心'],['run into sb','','偶然遇见 / 碰到某人'],['be into sth','','对某事物十分感兴趣'],['on offer','','提供的']];
  const wordIds=vocabulary.map(([word,pos,meaning],i)=>{let existing=d.editorial.words.find(w=>w.word===word&&w.meaning===meaning);if(existing)return existing.id;const id='WORD-686-'+(i+1);d.editorial.words.push({id,word,pos,meaning,source:'用户提供的高一专项训练1页面'});return id});
  lib.suites['14136']={id:'14136',name:'高一英语听力专项训练 1',materialIds:listening686Example.materials.map(m=>m.id),source:'听力高一专项 · 实战篇 · 旧套题 14136'};
  lib.wordlists['WL-686-1']={id:'WL-686-1',name:'难点词汇',wordIds,source:'用户提供的纸书页面，12 个词条'};
  const material=listening686Example.materials[0],segment=material.segments.find(s=>s.text.toLowerCase().includes('saturday'))||material.segments[0];
  const answer=segment.text.match(/Saturday/i)?.[0]||segment.text.match(/[a-zA-Z]{4,}/)[0];
  lib.practices['EX-686-1']={id:'EX-686-1',name:'听力练习',materialId:material.id,segmentId:segment.id,answer,source:'从本套录音稿派生的演示练习，并非纸书原始练习'};
  lib.packages['RP-686-1']={id:'RP-686-1',name:'高一英语听力专项训练 1',items:[{kind:'wordlists',id:'WL-686-1'},{kind:'suites',id:'14136'},{kind:'practices',id:'EX-686-1'}]};
  lib.packages['RP-EXAM-1']={id:'RP-EXAM-1',name:'2023 全国甲、乙卷 · 听力',items:[{kind:'papers',id:'14449'}]};
  if(!d.books.some(b=>b.id==='BK-SOURCE-686'))d.books.unshift({id:'BK-SOURCE-686',bookId:'686',sourceBookId:'686',name:'高中英语听力专项训练 高一分册',shortName:'听力高一专项',version:'2026',bookType:'听力书籍',productCategory:'高中听力',grade:'高一',textbookVersion:'通用',recommendedGrades:'2026',availability:'编写中',sharedResources:true,directoryNodes:[{id:'DIR-686-PRACTICE',parentId:'',kind:'目录',name:'实战篇'},{id:'DIR-686-1',parentId:'DIR-686-PRACTICE',kind:'资源包',name:'高一英语听力专项训练 1',packageId:'RP-686-1',visible:true}]});
  if(!d.books.some(b=>b.id==='BK-SCHOOL-686'))d.books.push({id:'BK-SCHOOL-686',bookId:'SC-686',name:'高一听力校本精选（案例）',shortName:'高一校本',bookType:'校本书籍',sourceBookId:'',sourceListeningBookId:'BK-SOURCE-686',grade:'高一',availability:'编写中',sharedResources:true,directoryNodes:[{id:'DIR-SCHOOL-1',parentId:'',kind:'目录',name:'第一周 听力训练'},{id:'DIR-SCHOOL-RP',parentId:'DIR-SCHOOL-1',kind:'资源包',name:'周末综合训练',packageId:'RP-686-1',visible:true}]});
  if(!d.books.some(b=>b.id==='BK-SOURCE-698'))d.books.push({id:'BK-SOURCE-698',bookId:'698',sourceBookId:'698',name:'高考英语听力 十年真题汇编',shortName:'十年真题汇编',bookType:'听力书籍',grade:'高三',availability:'编写中',sharedResources:true,directoryNodes:[{id:'DIR-698-1',parentId:'',kind:'目录',name:'2023 年真题'},{id:'DIR-698-RP',parentId:'DIR-698-1',kind:'资源包',name:'全国甲、乙卷听力',packageId:'RP-EXAM-1',visible:true}]});
  lib.exampleVersion=1;
 });
}
function resourceUses(kind,id,state=data){const uses=[];const lib=resourceStore(state);if(!lib)return uses;
 if(kind==='packages'){for(const b of state.books)for(const n of b.directoryNodes||[])if(n.packageId===id)uses.push(b.name+' / '+n.name)}
 else for(const p of Object.values(lib.packages))if(p.items.some(i=>i.kind===kind&&i.id===id))uses.push(p.name);
 return uses;
}
function resourceName(kind,id){const r=resourceCollection(kind)?.[id];return r?(kind==='papers'?r.year+' '+r.source:r.name):'内容不存在'}
function resourceButton(label,action,value='',cls='linkbtn',disabled=false){if(resourceTrail.at(-1)?.mode==='view'&&!['back','child','question'].includes(action))return '';if(['delete','unlink','remove','content-delete'].includes(action))cls+=' resource-danger';return `<button class="${cls}" ${disabled?'disabled':''} data-resource-action="${action}" data-value="${esc(value)}">${esc(label)}</button>`}
function resourceTable(headers,rows){return `<div class="table-scroll"><table style="width:100%"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>'<tr>'+r.map(c=>`<td style="white-space:normal">${c==null||c===''?'--':c}</td>`).join('')+'</tr>').join(''):`<tr><td colspan="${headers.length}"><div class="empty">--</div></td></tr>`}</tbody></table></div>`}
function resourceBind(actions){document.querySelectorAll('[data-resource-action]').forEach(el=>el.onclick=()=>actions[el.dataset.resourceAction]?.(el.dataset.value))}
function resourceCommit(fn,after=render){if(commitWorkspace(fn)){after();return true}return false}
function resourceOpen(kind,id,mode=resourceTrail.at(-1)?.mode||'edit'){resourceTrail.push({kind,id,mode});render()}
function resourceBackLabel(){
 const parent=resourceTrail.at(-2);
 if(parent)return '返回'+resourceKinds[parent.kind];
 if(page==='books')return '返回书籍目录';
 return '返回'+(resourceKinds[resourceTrail.at(-1)?.kind]||'内容')+'列表';
}
function resourceBack(){resourceTrail.pop();render()}
function resourceNameForm(title,value,save,extra=''){
 openDialog(title,`<form id="resource-form"><label class="field"><span>名称</span><input class="input" name="name" required maxlength="160" value="${esc(value)}"></label>${extra}<p class="error" id="resource-error"></p></form>`,'<button class="btn" data-close>取消</button><button class="btn primary" form="resource-form">保存</button>');
 $('#resource-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),name=String(f.get('name')).trim();if(!name)return;save(name,f)};
}
function resourceCreate(kind,onCreated){resourceNameForm('新建'+resourceKinds[kind],'',(name,f)=>{
 let id;const ok=commitWorkspace(d=>{id=resourceNextId(kind,d);resourceCollection(kind,d)[id]={id,name,...(kind==='packages'?{items:[]}:kind==='suites'?{materialIds:[]}:kind==='papers'?{year:Number(f.get('year')),source:name,materialIds:[]}:kind==='wordlists'?{wordIds:[]}:{materialId:'',segmentId:'',answer:''})};if(onCreated)onCreated(d,id)});
 if(ok){closeDialog();resourceOpen(kind,id)}
 },kind==='papers'?'<label class="field"><span>年份</span><input class="input" name="year" type="number" min="1900" max="2100" value="2026" required></label>':'')}
function resourcePick(title,choices,selected,onSave,multiple=true){
 openDialog(title,`<form id="resource-picker"><input class="input" id="resource-filter" aria-label="搜索候选内容" placeholder="搜索名称或 ID" style="margin-bottom:16px"><div style="max-height:50vh;overflow:auto">${choices.map(c=>`<label class="resource-choice" style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #edf1f5"><input type="${multiple?'checkbox':'radio'}" name="choice" value="${esc(c.id)}" ${selected.includes(c.id)?'checked':''}><span>${c.transcript?displayTranscriptMarkup(c.transcript):esc(c.name)}<small style="display:block;color:#8494ab">${esc(c.number||c.id)}</small></span></label>`).join('')||'<p class="muted">暂无可引用内容，请先创建。</p>'}</div></form>`,'<button class="btn" data-close>取消</button><button class="btn primary" form="resource-picker">确认选择</button>');
 $('#resource-filter').oninput=e=>document.querySelectorAll('.resource-choice').forEach(l=>l.style.display=l.textContent.toLowerCase().includes(e.target.value.toLowerCase())?'flex':'none');
 $('#resource-picker').onsubmit=e=>{e.preventDefault();const ids=new FormData(e.target).getAll('choice');if(onSave(ids)!==false)closeDialog()};
}
function resourceDelete(kind,id){const uses=resourceUses(kind,id);if(uses.length){openDialog('内容正在被引用','<p>'+ (kind==='suites'?'请先解除以下引用，再解散套题：':'请先解除以下引用，再删除独立内容：')+'</p>'+uses.map(s=>'<p>'+esc(s)+'</p>').join(''),'<button class="btn" data-close>关闭</button>');return}
 openDialog(kind==='suites'?'解散套题':'删除'+resourceKinds[kind],kind==='suites'?'<p>确认解散“'+esc(resourceName(kind,id))+'”？录音稿和小题仍保留在听力题库中。</p>':'<p>确认删除 '+esc(resourceName(kind,id))+'？其下引用的内容仍然保留。</p>','<button class="btn" data-close>取消</button><button class="btn danger" id="resource-confirm-delete">'+(kind==='suites'?'解散套题':'删除')+'</button>');$('#resource-confirm-delete').onclick=()=>{if(resourceUses(kind,id).length){toast('此内容正在被引用，请先解除引用');return}if(commitWorkspace(d=>delete resourceCollection(kind,d)[id])){closeDialog();render()}};
}
function renderResourceLibrary(){
 const kind=page==='resource-packages'?'packages':page==='listening-suites'?'suites':page==='listening-practices'?'practices':['wordlists','vocabulary-listening'].includes(page)?'wordlists':'papers';
 $('#page').innerHTML=workspaceHead(page==='vocabulary-listening'?'听力词汇':resourceKinds[kind],resourceButton('新建'+resourceKinds[kind],'create','','btn primary'))+`<section class="panel">${resourceTable([resourceKinds[kind]+' ID','名称',...(['suites','practices'].includes(kind)?[]:['内容']),'引用','操作'],Object.values(resourceCollection(kind)).filter(r=>page!=='vocabulary-listening'||listeningVocabularyCategory(r)===listeningVocabularyTab).map(r=>[esc(r.id),esc(resourceName(kind,r.id)),...(['suites','practices'].includes(kind)?[]:[kind==='wordlists'?(r.wordIds||[]).length+' 个词条':kind==='packages'?r.items.length+' 个内容板块':(r.materialIds||[]).length+' 篇录音稿']),'<span data-resource-references="'+esc(r.id)+'"></span>',resourceButton('查看','view',r.id)+resourceButton('编辑','edit',r.id)+(kind==='suites'?resourceButton('下载','download',r.id):'')+resourceButton(kind==='suites'?'解散套题':'删除','delete',r.id,'linkbtn',resourceUses(kind,r.id).length>0)]))}</section>`;
 document.querySelectorAll('[data-resource-references]').forEach(el=>BookUI.renderResourceReferences(el,resourceReferenceRows(kind,el.dataset.resourceReferences),resourceNavigateReference,{kind,id:el.dataset.resourceReferences}));
 resourceBind({tab:k=>{resourceTab=k;render()},create:()=>resourceCreate(kind,page==='vocabulary-listening'?(d,id)=>{resourceCollection(kind,d)[id].listeningCategory=listeningVocabularyTab}:undefined),view:id=>resourceOpen(kind,id,'view'),edit:id=>kind==='suites'?openWholeSuiteEditor({kind,id,mode:'edit'}):resourceOpen(kind,id,'edit'),delete:id=>resourceDelete(kind,id)});
}
function renderResourceDetail({kind,id,mode='edit'}){
 const r=kind==='suites'?getSuiteDraft(id):resourceCollection(kind)?.[id];if(!r){resourceBack();return}
 const uses=resourceUses(kind,id);
 $('#page').innerHTML=workspaceHead(resourceName(kind,id),resourceButton(resourceBackLabel(),'back','','btn'))+`<p class="muted" style="margin:0 0 20px">${esc(resourceKinds[kind])} ID：${esc(id)}</p><section class="panel" id="resource-content"></section>`;
 if(kind==='suites'){
 const materials=r.materialIds.map(mid=>bankData().materials[mid]).filter(Boolean);
 $('#page').innerHTML=`<section class="suite-detail-head suite-compact-head"><div class="suite-detail-heading"><div class="page-title-row"><h1>${esc(r.name)}</h1></div><div class="suite-detail-meta"><span>${materials.length} 篇录音稿 · ${materials.reduce((sum,m)=>sum+bankQuestions(m.id).length,0)} 道小题</span></div></div><div class="suite-detail-actions">${resourceButton(resourceBackLabel(),'back','','btn')}<button class="btn" id="suite-add-material">添加录音稿</button><button class="btn primary" id="suite-save">保存</button></div></section><section class="panel suite-detail-panel" id="resource-content"></section>`;
 }
 const host=$('#resource-content');
 const actions={back:resourceBack};
 bindResourceTitle(kind,id,mode);
 if(kind==='suites'){renderListeningSuiteContents(r,host);resourceBind({back:()=>leaveSuiteEditor(()=>{resourceTrail.pop();render()})});$('#suite-save').onclick=()=>{if(saveSuiteDraft()){if(resourceTrail.at(-1)?.bookReference)resourceTrail.at(-1).mode='view';toast('已保存');render()}};if(mode==='view'){host.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()!=='查看')b.remove()});host.querySelectorAll('[draggable]').forEach(el=>el.removeAttribute('draggable'));document.querySelectorAll('#suite-add-material,#suite-batch-add,#suite-save').forEach(el=>el.remove());const actions=document.querySelector('.suite-detail-actions');const linkedBook=data.books.find(b=>b.id===resourceTrail.at(-1)?.bookReference?.bookId);const locked=false;actions.innerHTML=resourceButton(resourceBackLabel(),'back','','btn')+(locked?'':'<button class="btn primary" id="suite-unlock">修改</button>');resourceBind({back:()=>leaveSuiteEditor(()=>{resourceTrail.pop();render()})});if(!locked)$('#suite-unlock').onclick=()=>chooseSuiteEdit(resourceTrail.at(-1));}return}
 if(kind==='packages'){
 host.innerHTML=`<div class="toolbar">${['suites','papers','wordlists','practices'].map(k=>resourceButton('引用'+resourceKinds[k],'pick',k,'btn')).join('')}<select ${mode==='view'?'hidden':''} class="input" id="resource-new-kind" aria-label="新建内容类型">${['suites','wordlists','practices','papers'].map(k=>`<option value="${k}">${resourceKinds[k]}</option>`).join('')}</select>${resourceButton('新建内容','new','','btn primary')}</div>`+resourceTable(['顺序','板块','类型','操作'],r.items.map((item,i)=>[String(i+1),esc(resourceName(item.kind,item.id)),resourceKinds[item.kind],resourceButton('进入','child',String(i))+resourceButton('上移','up',String(i))+resourceButton('解除引用','unlink',String(i))]));
 actions.child=i=>resourceOpen(r.items[i].kind,r.items[i].id);
 actions.new=()=>{const k=$('#resource-new-kind').value;resourceCreate(k,(d,newId)=>resourceStore(d).packages[id].items.push({kind:k,id:newId}))};
 actions.pick=k=>resourcePick('引用'+resourceKinds[k],Object.values(resourceCollection(k)).map(x=>({id:x.id,name:resourceName(k,x.id)})),r.items.filter(x=>x.kind===k).map(x=>x.id),ids=>resourceCommit(d=>{const p=resourceStore(d).packages[id];p.items=p.items.filter(x=>x.kind!==k||ids.includes(x.id));for(const cid of ids)if(!p.items.some(x=>x.kind===k&&x.id===cid))p.items.push({kind:k,id:cid})}));
 actions.unlink=i=>resourceCommit(d=>resourceStore(d).packages[id].items.splice(Number(i),1));
 actions.up=i=>resourceCommit(d=>{const a=resourceStore(d).packages[id].items;i=Number(i);if(i>0)[a[i-1],a[i]]=[a[i],a[i-1]]});
 }else if(kind==='suites'||kind==='papers'){
 const ms=(r.materialIds||[]).map(mid=>bankData().materials[mid]).filter(Boolean);
 host.innerHTML=(kind==='papers'?'<div class="tabs"><button class="tab active">听力</button>'+['阅读','七选五','语法填空','完形填空','写作'].map(s=>'<button class="tab" disabled>'+s+'</button>').join('')+'</div>':'')+`<div class="toolbar">${resourceButton('从听力题库选题','pick','','btn')}${resourceButton('新建听力题','new-question','','btn primary')}<span class="muted">${ms.length} 篇录音稿 · ${ms.reduce((n,m)=>n+bankQuestions(m.id).length,0)} 道小题</span></div>`+resourceTable(['顺序','录音稿 ID','录音稿','操作'],ms.map((m,i)=>[String(i+1),esc(m.id),`<details><summary>${displayTranscriptMarkup(m)}</summary><p style="white-space:pre-wrap">${displayTranscriptMarkup(m)}</p>${bankQuestions(m.id).map(q=>'<p><strong>'+esc(q.number+'. '+q.text)+'</strong><br>'+q.options.map(o=>esc(o.key+'. '+o.text)).join('<br>')+'<br>答案：'+esc(q.answerKey)+'</p>').join('')}</details>`,resourceButton(mode==='view'?'查看试题':'编辑试题','question',m.id)+resourceButton('上移','up',m.id)+resourceButton('解除引用','unlink',m.id)]));
 actions.pick=()=>resourcePick('选择录音稿（包含其全部小题）',Object.values(bankData().materials).map(m=>({id:m.id,name:displayTranscript(m),transcript:m})),r.materialIds,ids=>resourceCommit(d=>{const obj=resourceCollection(kind,d)[id];obj.materialIds=[...obj.materialIds.filter(x=>ids.includes(x)),...ids.filter(x=>!obj.materialIds.includes(x))]}));
 actions.question=mid=>openListeningCreate(false,{materialId:mid,readOnly:mode==='view'}, {onSaved:()=>render()});
 actions['new-question']=()=>openListeningCreate(true,null,{category:kind==='papers'?'高考真题':'普通题',onSaved:ids=>{resourceCommit(d=>{const obj=resourceCollection(kind,d)[id];obj.materialIds=[...new Set([...obj.materialIds,...ids])]})}});
 actions.up=mid=>resourceCommit(d=>{const a=resourceCollection(kind,d)[id].materialIds,i=a.indexOf(mid);if(i>0)[a[i-1],a[i]]=[a[i],a[i-1]]});
 actions.unlink=mid=>resourceCommit(d=>{const obj=resourceCollection(kind,d)[id];obj.materialIds=obj.materialIds.filter(x=>x!==mid)});
 }else if(kind==='wordlists'){
 const ws=r.wordIds.map(wid=>typeof vocabularyResolve==='function'?vocabularyResolve(wid):workspace().words.find(w=>w.id===wid)).filter(Boolean);
 host.innerHTML=r.groups?'<div class="toolbar">'+resourceButton('编辑词汇表','edit-grouped','','btn primary')+'</div>'+analysisWordlistPreview(id):'<div class="toolbar">'+resourceButton('从词库选择','pick','','btn primary')+'</div>'+resourceTable(['单词 / 短语','词性','释义'],ws.map(w=>[esc(w.word),esc(w.pos),esc(w.meaning)]));
 actions['edit-grouped']=()=>openAnalysisWordlistEditor(r,()=>render());
 actions.pick=()=>pickVocabularyWords(r.wordIds,ids=>resourceCommit(d=>resourceStore(d).wordlists[id].wordIds=ids));
 }else if(kind==='practices'){
 const m=bankData().materials[r.materialId],s=m?.segments.find(s=>s.id===r.segmentId);const text=s?.text||'';
 host.innerHTML=`<div style="padding:24px"><p>关联录音稿：${esc(m?.id||'--')}</p><p>${esc(text&&r.answer?text.replace(r.answer,'________'):text||'请配置练习内容')}</p><details><summary>查看答案</summary><p>${esc(r.answer)}</p></details><div class="toolbar">${resourceButton('配置听力练习','configure','','btn primary')}</div></div>`;
 actions.configure=()=>{
 const materials=Object.values(bankData().materials).filter(m=>m.segments?.length);
 openDialog('配置听力练习',`<form id="practice-form"><label class="field"><span>录音稿</span><select class="input" id="practice-material">${opts(materials.map(m=>[m.id,m.id+' · '+displayTranscript(m)]),r.materialId)}</select></label><label class="field"><span>原句</span><select class="input" id="practice-segment"></select></label><label class="field"><span>挖空词语（须与原句完全一致）</span><input class="input" id="practice-answer" required value="${esc(r.answer)}"></label><p class="error" id="practice-error"></p></form>`,'<button class="btn" data-close>取消</button><button class="btn primary" form="practice-form">保存</button>');
 const update=()=>{const material=bankData().materials[$('#practice-material').value];$('#practice-segment').innerHTML=opts((material?.segments||[]).map(s=>[s.id,s.text]),r.segmentId)};$('#practice-material').onchange=update;update();
 $('#practice-form').onsubmit=e=>{e.preventDefault();const mid=$('#practice-material').value,sid=$('#practice-segment').value,answer=$('#practice-answer').value.trim(),s=bankData().materials[mid]?.segments.find(s=>s.id===sid);if(!answer||!s?.text.includes(answer)){$('#practice-error').textContent='挖空词语必须出现在所选原句中';return}if(commitWorkspace(d=>Object.assign(resourceStore(d).practices[id],{materialId:mid,segmentId:sid,answer}))){closeDialog();render()}};
 };
 }
 resourceBind(actions);
}
const legacyBookDirectory=renderBookDirectory;
const originalEditorialRender=editorialRender;
editorialRender=function(){
 ensureTeachingExample();
 const inListening=['listening-bank','listening-suites','listening-practices','listening-settings'].includes(page);
 const group=$('#listening-nav-toggle');
 if(group){group.classList.toggle('section-active',inListening);}
 const inVocabulary=['vocabulary','wordlists','vocabulary-standard','vocabulary-textbook','vocabulary-product','vocabulary-listening'].includes(page),inTextbooks=['textbooks','textbook-texts'].includes(page);
 for(const [id,children,active] of [['vocabulary-nav-toggle','vocabulary-nav-pages',inVocabulary],['textbook-nav-toggle','textbook-nav-pages',inTextbooks]]){const toggle=$('#'+id);if(toggle){toggle.classList.toggle('section-active',active);}}
 if(resourceTrail.length){BookUI?.disposeTable();renderResourceDetail(resourceTrail[resourceTrail.length-1]);return true}
 if((inVocabulary&&page!=='vocabulary')||inTextbooks){
  oldBooksNav.classList.remove('section-active');$('#question-bank-toggle').classList.remove('section-active');document.querySelectorAll('[data-book-type]').forEach(b=>b.classList.remove('active'));
  $('#breadcrumb').innerHTML='<span>'+(inTextbooks?'教材':'词库')+'</span><span>/</span><span>'+esc(titles[page])+'</span>';
  BookUI?.disposeTable();
  if(['vocabulary-listening','vocabulary-textbook','vocabulary-product'].includes(page))renderListeningVocabulary();else if(page==='wordlists')renderResourceLibrary();else if(page==='vocabulary-standard')renderStandardVocabulary();else $('#page').innerHTML=workspaceHead(titles[page],'')+'<section class="panel"><div class="empty">'+(inVocabulary?'暂无词汇':'--')+'</div></section>';
  return true;
 }
 if(page==='vocabulary-question-bank'){
  oldBooksNav.classList.remove('section-active');$('#question-bank-toggle').classList.add('section-active');document.querySelectorAll('[data-book-type]').forEach(b=>b.classList.remove('active'));
  $('#breadcrumb').innerHTML='<span>题库</span><span>/</span><span>词汇</span>';BookUI?.disposeTable();$('#page').innerHTML=workspaceHead('词汇题库','')+'<section class="panel"><div class="empty">暂无词汇试题</div></section>';return true;
 }
 if(page==='listening-settings'){
  oldBooksNav.classList.remove('section-active');$('#question-bank-toggle').classList.add('section-active');document.querySelectorAll('[data-book-type]').forEach(b=>b.classList.remove('active'));
  $('#breadcrumb').innerHTML='<span>题库</span><span>/</span><span>听力</span><span>/</span><span>听力标签</span>';
  BookUI?.disposeTable();renderListeningSettings();return true;
 }
 if(page==='listening-suites'||page==='listening-practices'||page==='resource-suites'||page==='resource-packages'){
  oldBooksNav.classList.remove('section-active');$('#question-bank-toggle').classList.add('section-active');
  $('#breadcrumb').innerHTML='<span>题库</span><span>/</span><span>'+(inListening?'听力</span><span>/</span><span>':'')+esc(page==='listening-suites'?'听力套题':page==='listening-practices'?'听力练习':page==='resource-suites'?'高考真题卷':'教学资源包')+'</span>';
  BookUI?.disposeTable();renderResourceLibrary();return true;
 }
 return originalEditorialRender();
};
// Entry points are shared; book creation does not require a separate library visit.
Object.assign(titles,{'vocabulary-question-bank':'词汇题库','listening-settings':'听力标签','listening-practices':'听力练习','listening-suites':'听力套题','resource-suites':'高考真题卷','resource-packages':'教学资源包'});
const listeningBankNav=$('#question-bank-types [data-page="listening-bank"]');
$('#question-bank-types').insertAdjacentHTML('afterbegin','<button id="listening-nav-toggle" aria-expanded="true" aria-controls="listening-nav-pages">听力<svg class="icon nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button><div class="subnav listening-nav-pages" id="listening-nav-pages"><button data-page="listening-suites">听力套题</button><button data-page="listening-practices">听力练习</button><button data-page="listening-settings">听力标签</button></div>');
$('#listening-nav-pages').prepend(listeningBankNav);
$('#listening-nav-toggle').insertAdjacentHTML('beforebegin','<button data-page="vocabulary-question-bank">词汇</button>');
$('#question-bank-types').insertAdjacentHTML('beforeend','<button data-page="resource-suites">高考真题卷</button><button data-page="resource-packages">教学资源包</button>');
$('#listening-nav-toggle').onclick=()=>{const group=$('#listening-nav-pages');group.hidden=!group.hidden;$('#listening-nav-toggle').setAttribute('aria-expanded',String(!group.hidden))};
document.querySelector('#book-types [data-page="gaokao-bank"]')?.remove();
const schoolNav=document.querySelector('.nav [data-page="school"]');if(schoolNav)schoolNav.remove();
$('#book-types').insertAdjacentHTML('beforeend','<button data-book-type="校本书籍">校本书籍</button>');
Object.assign(titles,{'vocabulary-standard':'课标词汇','vocabulary-textbook':'教材词汇','vocabulary-product':'产品词汇','vocabulary-listening':'听力词汇',vocabulary:'基础词库',wordlists:'词汇表',textbooks:'教材书籍','textbook-texts':'课文库'});
editorialPages.vocabulary='基础词库';
const vocabularyNav=document.querySelector('.nav [data-page="vocabulary"]');
const navChevron='<svg class="icon nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
vocabularyNav.insertAdjacentHTML('beforebegin','<button id="vocabulary-nav-toggle" aria-expanded="true" aria-controls="vocabulary-nav-pages">'+icon('dictionary')+'词库'+navChevron+'</button><div class="subnav" id="vocabulary-nav-pages"><button data-page="vocabulary-standard">课标词汇</button><button data-page="vocabulary-textbook">教材词汇</button><button data-page="vocabulary-product">产品词汇</button><button data-page="vocabulary-listening">听力词汇</button></div>');
vocabularyNav.textContent='基础词库';$('#vocabulary-nav-pages').prepend(vocabularyNav);
oldBooksNav.insertAdjacentHTML('beforebegin','<button id="textbook-nav-toggle" aria-expanded="true" aria-controls="textbook-nav-pages">'+icon('classroom')+'教材'+navChevron+'</button><div class="subnav" id="textbook-nav-pages"><button data-page="textbooks">教材书籍</button><button data-page="textbook-texts">课文库</button></div>');
$('#book-types [data-book-type="校本书籍"]').insertAdjacentHTML('beforebegin','<button data-book-type="词汇书籍">词汇书籍</button>');
for(const [toggleId,groupId] of [['vocabulary-nav-toggle','vocabulary-nav-pages'],['textbook-nav-toggle','textbook-nav-pages']])$('#'+toggleId).onclick=()=>{const group=$('#'+groupId);group.hidden=!group.hidden;$('#'+toggleId).setAttribute('aria-expanded',String(!group.hidden))};
document.querySelectorAll('.nav [data-page]').forEach(b=>{const previous=b.onclick;b.onclick=e=>{resourceTrail=[];if(previous)previous(e);else navEditorial(b.dataset.page)}});
document.querySelectorAll('[data-book-type]').forEach(b=>b.onclick=()=>{resourceTrail=[];bookType=b.dataset.bookType;navEditorial('books')});
const originalCreateBook=editWorkspaceBook;
editWorkspaceBook=function(id,chooseCover){originalCreateBook(id,chooseCover);if(!id){const form=$('#workspace-form'),previous=form.onsubmit;if(bookType==='校本书籍')form.insertAdjacentHTML('beforeend','<label class="field"><span>来源听力书籍</span><select class="input" name="schoolSource" required>'+opts(data.books.filter(b=>b.bookType==='听力书籍'&&b.sharedResources).map(b=>[b.id,b.name]),'BK-SOURCE-686')+'</select></label>');form.onsubmit=e=>{const before=new Set(data.books.map(b=>b.id)),source=form.querySelector('[name=schoolSource]')?.value;previous(e);const created=data.books.find(b=>!before.has(b.id));if(created)resourceCommit(d=>{const b=d.books.find(x=>x.id===created.id);b.sharedResources=true;b.directoryNodes ||= [];if(b.bookType==='校本书籍')b.sourceListeningBookId=source})}}};
const originalDeleteMaterial=deleteBankMaterial;
deleteBankMaterial=function(id){const uses=[...Object.values(resourceStore().suites),...Object.values(bankData().papers||{})].filter(s=>s.materialIds?.includes(id));if(uses.length||Object.values(resourceStore().practices).some(p=>p.materialId===id)){toast('此录音稿被套题、试卷或听力练习引用，请先解除引用');return}originalDeleteMaterial(id)};
const originalBankReferenceIndex=bankReferenceIndex;
bankReferenceIndex=function(state=data){const result=originalBankReferenceIndex(state),lib=resourceStore(state);if(!lib)return result;for(const book of state.books)for(const node of book.directoryNodes||[]){const pack=lib.packages[node.packageId];if(!pack)continue;for(const item of pack.items){const content=resourceCollection(item.kind,state)?.[item.id];for(const mid of content?.materialIds||[])for(const q of Object.values(bankData(state).questions).filter(q=>q.scriptId===mid)){const list=result[q.id] ||= [];list.push({bookId:book.id,bookName:book.name,nodeId:node.parentId,key:node.id,name:node.name,number:q.number})}}}return result};
ensureTeachingExample();
ensureBusinessIds();
render();
function bindResourceTitle(kind,id,mode){
 if(mode==='view')return;
 const heading=$('#page .page-title-row h1'),r=kind==='suites'?getSuiteDraft(id):resourceCollection(kind)[id];
 const input=document.createElement('input');input.className='resource-title-input';input.setAttribute('aria-label',resourceKinds[kind]+'名称');input.maxLength=160;input.value=kind==='papers'?r.source:r.name;
 if(kind==='suites'){
 const field=document.createElement('label');field.className='suite-name-field';field.innerHTML='<span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16Z"/><path d="m14.8 6.4 2.8 2.8M4 20h6"/></svg></span>';field.append(input);heading.replaceChildren(field);
 }else heading.replaceChildren(input);let saved=input.value;
 const save=()=>{const value=input.value.trim();if(!value){input.value=saved;return}if(value===saved){input.value=saved;return}if(commitWorkspace(d=>{resourceCollection(kind,d)[id][kind==='papers'?'source':'name']=value})){saved=value;input.value=value}else input.value=saved};
 if(kind==='suites'){input.oninput=()=>{r.name=input.value};input.onblur=()=>{r.name=input.value.trim()};input.onkeydown=e=>{if(e.isComposing)return;if(e.key==='Enter'){e.preventDefault();input.blur()}if(e.key==='Escape'){input.value=saved;r.name=saved;input.blur()}};return}
 input.onblur=save;input.onkeydown=e=>{if(e.isComposing)return;if(e.key==='Enter'){e.preventDefault();input.blur()}if(e.key==='Escape'){input.value=saved;input.blur()}};
}
function resourceReferenceRows(kind,id){
 const packs=kind==='packages'?[resourceStore().packages[id]]:Object.values(resourceStore().packages).filter(p=>p.items.some(i=>i.kind===kind&&i.id===id));
 const rows=[];
 for(const p of packs.filter(Boolean)){
  if(kind!=='packages')rows.push({key:'p/'+p.id,type:'资源包',name:p.name,id:p.id,packageId:p.id,relation:'直接引用'});
  for(const b of data.books)for(const n of b.directoryNodes||[])if(n.packageId===p.id)rows.push({key:b.id+'/'+n.id,type:b.bookType||'听力书籍',name:b.name,id:b.bookId||b.id,bookId:b.id,nodeId:n.id,parentId:n.parentId,packageId:p.id,relation:kind==='packages'?n.name:p.name+' / '+n.name});
 }
 return rows;
}
function resourceNavigateReference(row){
 if(row.bookId){resourceTrail=[];bookType=data.books.find(b=>b.id===row.bookId).bookType;selectedDirectory=row.parentId;bookSection='目录与内容';navEditorial('books',row.bookId)}else resourceOpen('packages',row.packageId,'view');
}

function deleteSharedBookDirectory(bookId,nodeId){
 const book=data.books.find(b=>b.id===bookId),node=book?.directoryNodes.find(n=>n.id===nodeId);if(!node)return;
 const ids=directoryDescendants(book.directoryNodes,nodeId),children=ids.size-1;
 openDialog(node.kind==='目录'?'删除目录':'解除引用资源包引用',`<p>确认删除“${esc(node.name)}”${children?'及其下 '+children+' 个目录项':''}？</p><p>仅解除引用本书中的目录和引用，资源包及其内容仍保留。</p>`,'<button class="btn" data-close>取消</button><button class="btn danger" id="shared-directory-delete">删除</button>');
 $('#shared-directory-delete').onclick=()=>{if(commitWorkspace(d=>{const b=d.books.find(b=>b.id===bookId);b.directoryNodes=b.directoryNodes.filter(n=>!ids.has(n.id))})){if(ids.has(selectedDirectory))selectedDirectory=node.parentId||BOOK_DIRECTORY_ROOT;for(const id of ids)collapsedBookDirectories.delete(id);closeDialog();render()}};
}

let listeningSettingsTab='examPoints';
const listeningSettingsParents={};
function canManageListeningTagStatus(){return canPublishWorkspace()}
function requireListeningTagStatusPermission(){if(canManageListeningTagStatus())return true;toast('仅数智研发部成员可以启用、停用或删除标签');return false}
function deleteListeningDictionary(key,name,parent=null){
 if(!requireListeningTagStatusPermission())return;
 const entries=key==='abilities'?listeningTagChoices().abilities:listeningTagTree(key);
 const exists=key==='abilities'?entries.includes(name):parent===null?entries.some(n=>n.label===name):entries.find(n=>n.label===parent)?.children.includes(name);
 if(!exists)return;
 openDialog('删除标签',`<p>确认删除“${esc(name)}”？${parent===null&&key!=='abilities'?'其下二级标签也会删除。':''}</p><p>已有试题中的标签内容保留。</p>`,'<button class="btn" data-close>取消</button><button class="btn danger" id="confirm-listening-tag-delete">确认删除</button>');
 $('#confirm-listening-tag-delete').onclick=()=>{
  if(!requireListeningTagStatusPermission())return;
  const current=key==='abilities'?listeningTagChoices().abilities:listeningTagTree(key);
  if(commitWorkspace(state=>{state.listeningTaxonomy ||= {};if(key==='abilities')state.listeningTaxonomy[key]=current.filter(n=>n!==name);else{const tree=structuredClone(current);if(parent===null)state.listeningTaxonomy[key]=tree.filter(n=>n.label!==name);else{const entry=tree.find(n=>n.label===parent);if(entry)entry.children=entry.children.filter(n=>n!==name);state.listeningTaxonomy[key]=tree}}const statuses=state.listeningDictionaryDisabled?.[key];for(const path of Object.keys(statuses||{})){const [p,n]=JSON.parse(path);if(parent===null?(p===null&&n===name)||p===name:p===parent&&n===name)delete statuses[path]}recordListeningDictionaryChange(state,key,'删除'+(parent?parent+' / ':'')+name)})){closeDialog();renderListeningSettings();toast('标签已删除')}
 };
}

function renderListeningSettings(){
 const tabs=[['examPoints','考点'],['topics','话题'],['abilities','能力']],key=listeningSettingsTab,label=tabs.find(t=>t[0]===key)[1],hierarchical=key!=='abilities';
 const entries=hierarchical?listeningTagTree(key):listeningTagChoices().abilities.map(label=>({label,children:[]}));
 if(!entries.some(n=>n.label===listeningSettingsParents[key]))listeningSettingsParents[key]=entries[0]?.label||'';
 const selected=entries.find(n=>n.label===listeningSettingsParents[key]);
 const headings='';
 const addRow=(id,text,disabled=false)=>`<button type="button" class="listening-dict-add" id="${id}" ${disabled?'disabled':''}>＋ ${text}</button>`;
 const editButton=(i,child=false)=>`<button type="button" class="listening-dict-edit" data-dictionary-edit="${i}" data-child="${child}" aria-label="修改名称"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5"/></svg></button>`;
 const statusButton=(name,i,parent=null)=>!canManageListeningTagStatus()?'':`<button type="button" class="listening-dict-status ${listeningDictionaryDisabled(key,name,parent)?'is-disabled':''}" data-dictionary-toggle="${i}" data-child="${parent!==null}" aria-label="${listeningDictionaryDisabled(key,name,parent)?'启用':'停用'}${esc(name)}">${listeningDictionaryDisabled(key,name,parent)?'启用':'停用'}</button><button type="button" class="listening-dict-status" data-dictionary-delete="${i}" data-child="${parent!==null}" aria-label="删除${esc(name)}">删除</button>`;
 const primary=entries.map((entry,i)=>`<div class="listening-dict-row ${hierarchical&&entry.label===selected?.label?'is-selected':''}"><span class="listening-dict-number">${i+1}</span>${hierarchical?`<button type="button" class="listening-dict-name" data-dictionary-parent="${i}" aria-pressed="${entry.label===selected?.label}"><span>${esc(entry.label)}</span></button>`:`<span class="listening-dict-name">${esc(entry.label)}</span>`}${editButton(i)}${statusButton(entry.label,i)}</div>`).join('');
 const history=data.listeningDictionaryHistory?.[key]||[],last=history[0];
 $('#page').innerHTML=`<section class="listening-settings"><header class="listening-settings-heading"><h1>听力标签</h1></header><div class="listening-settings-content"><div class="listening-settings-nav" role="tablist" aria-orientation="vertical" aria-label="听力字典">${tabs.map(([id,name])=>`<button type="button" class="tab ${id===key?'active':''}" role="tab" aria-selected="${id===key}" data-listening-dictionary="${id}">${name}</button>`).join('')}</div><div class="listening-dict-layout ${hierarchical?'':'is-single'}"><section class="listening-dict-list" aria-label="${hierarchical?'一级':''}${label}"><header><h3>${hierarchical?'一级':''}${label}</h3><div class="listening-dict-header-actions">${addRow('listening-dictionary-add','添加'+(hierarchical?'一级':'')+label)}</div></header>${headings}<div class="listening-dict-items">${primary||'<div class="listening-dict-empty">暂无字典项</div>'}</div></section>${hierarchical?`<section class="listening-dict-list" aria-label="二级${label}"><header><h3>二级${label}${selected?`<small> / ${esc(selected.label)}</small>`:''}</h3><div class="listening-dict-header-actions">${addRow('listening-dictionary-add-child','添加二级'+label,!selected)}</div></header>${headings}<div class="listening-dict-items">${selected?.children.map((name,i)=>`<div class="listening-dict-row"><span class="listening-dict-number">${i+1}</span><span class="listening-dict-name">${esc(name)}</span>${editButton(i,true)}${statusButton(name,i,selected.label)}</div>`).join('')||`<div class="listening-dict-empty">${selected?'暂无二级'+label:'请先添加一级'+label}</div>`}</div></section>`:''}</div></div><footer class="listening-dict-history">${last?`<span>最后修改人：${esc(last.actor)}</span><span>修改时间：${esc(last.time)}</span>`:'<span>暂无修改记录</span>'}<button class="linkbtn" id="listening-dictionary-history">修改记录</button></footer></section>`;
 document.querySelectorAll('[data-listening-dictionary]').forEach(b=>b.onclick=()=>{listeningSettingsTab=b.dataset.listeningDictionary;renderListeningSettings()});
 document.querySelectorAll('[data-dictionary-parent]').forEach(b=>b.onclick=()=>{listeningSettingsParents[key]=entries[Number(b.dataset.dictionaryParent)].label;renderListeningSettings()});
 document.querySelectorAll('[data-dictionary-edit]').forEach(button=>button.onclick=()=>editListeningDictionary(button,key,entries,button.dataset.child==='true'?selected:null));
 document.querySelectorAll('[data-dictionary-toggle]').forEach(button=>button.onclick=()=>{if(!requireListeningTagStatusPermission())return;if(document.querySelector('.listening-dict-inline')){toast('请先保存或取消名称修改');return}const i=Number(button.dataset.dictionaryToggle),parent=button.dataset.child==='true'?selected.label:null,name=parent===null?entries[i].label:selected.children[i],disabled=!listeningDictionaryDisabled(key,name,parent);
 if(commitWorkspace(state=>{state.listeningDictionaryDisabled ||= {};state.listeningDictionaryDisabled[key] ||= {};state.listeningDictionaryDisabled[key][JSON.stringify([parent,name])]=disabled;recordListeningDictionaryChange(state,key,(disabled?'停用':'启用')+(parent?parent+' / ':'')+name)})){renderListeningSettings();toast(disabled?'已停用，已有引用保留':'已启用')}
 });
 document.querySelectorAll('[data-dictionary-delete]').forEach(button=>button.onclick=()=>{const child=button.dataset.child==='true',i=Number(button.dataset.dictionaryDelete);deleteListeningDictionary(key,child?selected.children[i]:entries[i].label,child?selected.label:null)});
 $('#listening-dictionary-history').onclick=()=>openDialog(label+'修改记录',history.length?`<div class="listening-dict-log">${history.map(item=>`<article><strong>${esc(item.actor)}</strong> <span>${esc(item.time)}</span><p>${esc(item.detail)}</p></article>`).join('')}</div>`:'<p>暂无修改记录</p>','<button class="btn" data-close>关闭</button>');
 $('#listening-dictionary-add').onclick=()=>addListeningDictionary(key);
 $('#listening-dictionary-add-child')?.addEventListener('click',()=>{if(selected)addListeningDictionary(key,selected.label)});
}
function recordListeningDictionaryChange(state,key,detail){
 state.listeningDictionaryHistory ||= {};state.listeningDictionaryHistory[key] ||= [];
 state.listeningDictionaryHistory[key].unshift({actor:bookFlowActor(),time:new Date().toLocaleString('zh-CN',{hour12:false}),detail});
}
function editListeningDictionary(button,key,entries,parent){
 const row=button.closest('.listening-dict-row'),index=Number(button.dataset.dictionaryEdit),old=parent?parent.children[index]:entries[index].label;
 if(document.querySelector('.listening-dict-inline'))return;
 const name=row.querySelector('.listening-dict-name');name.hidden=true;button.hidden=true;
 const form=document.createElement('form');form.className='listening-dict-inline';form.innerHTML=`<input class="input" aria-label="名称" maxlength="80" value="${esc(old)}"><button type="submit" class="linkbtn">保存</button><button type="button" class="linkbtn" data-cancel>取消</button><span class="error" role="alert"></span>`;row.append(form);
 const cancel=()=>{name.hidden=false;button.hidden=false;form.remove()};form.querySelector('[data-cancel]').onclick=cancel;
 const input=form.querySelector('input');input.focus();input.select();input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();cancel()}};
 form.onsubmit=e=>{e.preventDefault();const value=input.value.trim(),siblings=parent?parent.children:entries.map(n=>n.label);
 if(!value||siblings.some((n,i)=>i!==index&&n===value)){form.querySelector('.error').textContent=!value?'请输入名称':'同一层级下名称不能重复';return}
 if(value===old){cancel();return}
 if(commitWorkspace(state=>{state.listeningTaxonomy ||= {};const tree=structuredClone(entries);if(key==='abilities')state.listeningTaxonomy[key]=tree.map((n,i)=>i===index?value:n.label);else{if(parent)tree.find(n=>n.label===parent.label).children[index]=value;else tree[index].label=value;state.listeningTaxonomy[key]=tree}const statuses=state.listeningDictionaryDisabled?.[key];if(statuses){for(const path of Object.keys(statuses)){const [p,n]=JSON.parse(path);if(parent?p===parent.label&&n===old:p===null&&n===old||p===old){const next=parent?[p,value]:p===null?[null,value]:[value,n];statuses[JSON.stringify(next)]=statuses[path];delete statuses[path]}}}recordListeningDictionaryChange(state,key,'修改'+(parent?parent.label+' / ':'')+old+' → '+value)})){if(!parent&&listeningSettingsParents[key]===old)listeningSettingsParents[key]=value;renderListeningSettings();toast('名称已修改')}
 };
}
function addListeningDictionary(key,parent=null){
 const label={examPoints:'考点',topics:'话题',abilities:'能力'}[key],level=key==='abilities'?'':parent===null?'一级':'二级';
 openDialog('新增'+level+label,`<form id="listening-dictionary-form">${parent!==null?`<label class="field"><span>所属一级${label}</span><select class="input" name="parent">${opts(listeningTagTree(key).map(n=>[n.label,n.label]),parent)}</select></label>`:''}<label class="field"><span>${level}${label}名称</span><input class="input" name="name" maxlength="80" autocomplete="off" required></label><p class="error" id="listening-dictionary-error" role="alert"></p></form>`,'<button class="btn" data-close>取消</button><button class="btn primary" form="listening-dictionary-form" type="submit">保存</button>');
 $('#listening-dictionary-form').onsubmit=e=>{e.preventDefault();const form=e.target,name=form.elements.name.value.trim(),selectedParent=parent!==null?form.elements.parent.value:null;
 const entries=key==='abilities'?listeningTagChoices().abilities:listeningTagTree(key);
 const siblings=key==='abilities'?entries:selectedParent===null?entries.map(n=>n.label):entries.find(n=>n.label===selectedParent)?.children||[];
 if(!name||siblings.includes(name)){$('#listening-dictionary-error').textContent=!name?'请输入名称':'同一层级下名称不能重复';return}
 if(commitWorkspace(state=>{state.listeningTaxonomy ||= {};if(key==='abilities'){state.listeningTaxonomy.abilities=[...entries,name]}else{const tree=structuredClone(entries);if(selectedParent===null)tree.push({label:name,children:[]});else tree.find(n=>n.label===selectedParent).children.push(name);state.listeningTaxonomy[key]=tree}recordListeningDictionaryChange(state,key,'新增'+level+label+'：'+(selectedParent?selectedParent+' / ':'')+name)})){if(key!=='abilities')listeningSettingsParents[key]=selectedParent===null?name:selectedParent;closeDialog();renderListeningSettings();toast('字典项已添加')}
 };
}

let standardVocabularyVersion='',standardVocabularyQuery='';
function ensureStandardVocabularyExamples(){
 if(data.standardVocabularyExampleVersion===1)return;
 const seeds=[
 {id:'standard-2020-example',name:'2017年版（2020年修订）',sourcePage:121,sourceUrl:'https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517522153664167.pdf',words:['abandon','ability','able','abnormal','aboard','about','above','abroad','absence','absent']},
 {id:'standard-2025-example',name:'2017年版（2025年修订）',sourcePage:74,sourceUrl:'https://cdn.zizzs.com/zixunzhan/普通高中英语课程标准日常修订版（2017年版2025年修订）1762759636958.pdf',words:['access','accident','accommodation','accompany','account','accurate','accuse','ache','achieve','achievement']}
 ];
 const vocabulary=Object.values(vocabularyTable('words'));
 return commitWorkspace(state=>{state.standardVocabularyVersions ||= [];for(const seed of seeds){if(state.standardVocabularyVersions.some(v=>v.id===seed.id))continue;state.standardVocabularyVersions.push({...seed,sample:true,words:seed.words.map((word,i)=>{const matches=vocabulary.filter(w=>w.word===word);return {id:seed.id+'-'+(i+1),word,wordId:matches.length===1?'vocab:'+matches[0].id:''}})})}state.standardVocabularyExampleVersion=1});
}
function migrateStandardVocabularyLists(){
 if(data.standardVocabularyListSchema===1)return;
 commitWorkspace(state=>{const bank=Object.values(vocabularyTable('words',state));let next=Number(vocabularyNextId('words'));
 for(const version of state.standardVocabularyVersions||[]){for(const row of version.words){let word=bank.find(w=>'vocab:'+w.id===row.wordId)||bank.find(w=>w.word.toLowerCase()===row.word.toLowerCase());if(!word){word={id:String(next++),word:row.word};state.vocabularyEdits ||= {};state.vocabularyEdits.words ||= {};state.vocabularyEdits.words[word.id]=word;bank.push(word)}row.wordId='vocab:'+word.id;delete row.word}}
 const all=state.standardVocabularyVersions||[];state.standardVocabularyVersions=[...all.filter(v=>!v.id.startsWith('standard-')).reverse(),...all.filter(v=>v.id.startsWith('standard-')).sort((a,b)=>b.id.localeCompare(a.id))];state.standardVocabularyListSchema=1;
 });
}
// Verified against Appendix 2 in the 2020 and 2025 curriculum PDFs.
// Added: drone (2025 p89), wetland (p128). Removed: cheek (2020 p130), foggy (p141).
function correctStandardVocabularyExamples(){
 if(data.standardVocabularyVerifiedExamples===1)return;
 const common=['abandon','ability','able','abnormal','aboard','about','above','abroad'];
 const sets={'standard-2020-example':[...common,'cheek','foggy'],'standard-2025-example':[...common,'drone','wetland']};
 commitWorkspace(state=>{const bank=Object.values(vocabularyTable('words',state));let next=Number(vocabularyNextId('words'));
 for(const [id,words] of Object.entries(sets)){const version=(state.standardVocabularyVersions||[]).find(v=>v.id===id);if(!version)continue;version.words=words.map((name,i)=>{let word=bank.find(w=>w.word===name);if(!word){word={id:String(next++),word:name};state.vocabularyEdits ||= {};state.vocabularyEdits.words ||= {};state.vocabularyEdits.words[word.id]=word;bank.push(word)}return {id:id+'-verified-'+i,wordId:'vocab:'+word.id}});version.verifiedSample=true;version.sourcePages=id==='standard-2020-example'?[121,130,141]:[73,89,128];}
 state.standardVocabularyVerifiedExamples=1;
 });
}
function standardVocabularyVersions(){return data.standardVocabularyVersions||[]}
let standardWordPage=1;
const standardWordPageSize=50;
function standardVocabularyComparison(version,previous,newer){
 const prior=new Set((previous?.words||[]).map(w=>w.wordId)),next=new Set((newer?.words||[]).map(w=>w.wordId));
 return (version?.words||[]).map(w=>({...w,status:newer&&!next.has(w.wordId)?'课标删减词':!previous?'':prior.has(w.wordId)?'未变化':'课标新增词',removed:!!newer&&!next.has(w.wordId),word:vocabularyWord(w.wordId.slice(6))?.word||'词条不可用'}));
}
function recordStandardVocabularyChange(version,detail){
 version.history ||= [];
 version.history.unshift({actor:bookFlowActor(),time:new Date().toLocaleString('zh-CN',{hour12:false}),detail});
}
function editStandardVersionName(button){
 if(document.querySelector('.standard-version-inline'))return;
 const id=button.dataset.standardRename,version=standardVocabularyVersions().find(v=>v.id===id),row=button.closest('.standard-version-row');
 const form=document.createElement('form');form.className='standard-version-inline';form.innerHTML=`<input class="input" aria-label="版本名称" maxlength="80" value="${esc(version.name)}"><button class="linkbtn" type="submit">保存</button><button class="linkbtn" type="button" data-cancel>取消</button><span class="error" role="alert"></span>`;
 [...row.children].forEach(el=>el.hidden=true);row.append(form);const cancel=()=>{form.remove();[...row.children].forEach(el=>el.hidden=false)};form.querySelector('[data-cancel]').onclick=cancel;const input=form.querySelector('input');input.focus();input.select();input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();cancel()}};
 form.onsubmit=e=>{e.preventDefault();const name=input.value.trim();if(!name||standardVocabularyVersions().some(v=>v.id!==id&&v.name===name)){form.querySelector('.error').textContent='请输入不重复的版本名称';return}if(name===version.name){cancel();return}if(commitWorkspace(d=>{const target=d.standardVocabularyVersions.find(v=>v.id===id);recordStandardVocabularyChange(target,`修改版本名称：“${target.name}” → “${name}”`);target.name=name}))renderStandardVocabulary()};
}
function renderStandardVocabulary(){
 ensureStandardVocabularyExamples();
 migrateStandardVocabularyLists();
 correctStandardVocabularyExamples();
 const versions=standardVocabularyVersions();if(!versions.some(v=>v.id===standardVocabularyVersion))standardVocabularyVersion=versions[0]?.id||'';
 const matchesWord=w=>(w.word||vocabularyWord(w.wordId.slice(6))?.word||'词条不可用').toLowerCase().includes(standardVocabularyQuery.trim().toLowerCase());
 const version=versions.find(v=>v.id===standardVocabularyVersion),previous=versions[versions.indexOf(version)+1],rows=standardVocabularyComparison(version,previous,versions[versions.indexOf(version)-1]).filter(matchesWord);
 const currentIds=new Set((version?.words||[]).map(w=>w.wordId)),previousIds=new Set((previous?.words||[]).map(w=>w.wordId));
 const addedWords=previous?(version?.words||[]).filter(w=>!previousIds.has(w.wordId)).filter(matchesWord):[],removedWords=previous?previous.words.filter(w=>!currentIds.has(w.wordId)).filter(matchesWord):[];
 const history=version?.history||[],last=history[0];
 const differenceColumn=(label,words)=>`<section class="standard-delta-list ${label==='课标新增词'?'is-added':'is-removed'}"><header><h3>${label}<span class="standard-count">${words.length}</span></h3></header><div class="standard-delta-items">${words.map((w,i)=>`<div class="standard-delta-row"><span class="standard-word-id">${esc(w.wordId.slice(6))}</span><span>${esc(vocabularyWord(w.wordId.slice(6))?.word||'词条不可用')}</span></div>`).join('')||'<div class="empty">暂无</div>'}</div></section>`;
 const pageCount=Math.max(1,Math.ceil(rows.length/standardWordPageSize));standardWordPage=Math.min(standardWordPage,pageCount);const offset=(standardWordPage-1)*standardWordPageSize;
 $('#page').innerHTML=`<section class="standard-vocabulary-settings"><header class="listening-settings-heading"><h1>课标词汇</h1><form class="standard-word-search row" id="standard-search-form" role="search"><label class="search">${icon('search')}<input id="standard-query" aria-label="搜索当前版本中的单词" placeholder="搜索当前版本中的单词" value="${esc(standardVocabularyQuery)}"></label><button class="btn primary" type="submit">搜索</button></form></header><div class="standard-vocabulary-layout"><section class="standard-version-list"><header><h3>课标版本</h3></header><div role="tablist" aria-orientation="vertical" aria-label="课标版本">${versions.map((v,i)=>`<div class="standard-version-row"><button class="standard-version-tab ${v.id===standardVocabularyVersion?'active':''}" role="tab" aria-selected="${v.id===standardVocabularyVersion}" data-standard-version="${esc(v.id)}"><span>${esc(v.name)}</span></button><button class="listening-dict-edit" data-standard-rename="${esc(v.id)}" aria-label="修改${esc(v.name)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5"/></svg></button><button class="listening-dict-edit" data-standard-copy="${esc(v.id)}" aria-label="复制${esc(v.name)}为新版本"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/></svg></button></div>`).join('')}</div></section><section class="standard-word-list"><header><h3>课标词<span class="standard-count">${rows.length}</span></h3><button class="linkbtn" id="standard-words-pick" ${version?'':'disabled'}>＋ 从词库添加</button></header><div class="standard-word-items">${rows.slice(offset,offset+standardWordPageSize).map((w,i)=>`<div class="standard-word-row"><span class="standard-word-id">${esc(w.wordId.slice(6))}</span><span>${esc(w.word)}</span><button class="linkbtn resource-danger standard-unlink" data-standard-remove="${esc(w.id)}" aria-label="解除引用 ${esc(w.word)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 3 18 18M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l1-1"/></svg></button></div>`).join('')||`<div class="empty">${version?'暂无单词':'请先新增版本'}</div>`}</div><footer class="standard-pagination"><span>共 ${rows.length} 条</span><span>50 条/页</span><button class="linkbtn" id="standard-prev" ${standardWordPage===1?'disabled':''}>上一页</button><span>${standardWordPage} / ${pageCount}</span><button class="linkbtn" id="standard-next" ${standardWordPage===pageCount?'disabled':''}>下一页</button></footer></section>${differenceColumn('课标新增词',addedWords)}${differenceColumn('课标删减词',removedWords)}</div><footer class="listening-dict-history">${last?`<span>最近操作人：${esc(last.actor)}</span><span>操作时间：${esc(last.time)}</span>`:'<span>暂无操作记录</span>'}<button class="linkbtn" id="standard-history">操作记录</button></footer></section>`;
 $('#standard-history').onclick=()=>openDialog(esc(version?.name||'课标词汇')+' · 操作记录',history.length?`<div class="listening-dict-log">${history.map(item=>`<article><strong>${esc(item.actor)}</strong> <span>${esc(item.time)}</span><p>${esc(item.detail)}</p></article>`).join('')}</div>`:'<p>暂无操作记录</p>','<button class="btn" data-close>关闭</button>');
 $('#standard-search-form').onsubmit=e=>{e.preventDefault();standardVocabularyQuery=$('#standard-query').value;standardWordPage=1;renderStandardVocabulary()};
 document.querySelectorAll('[data-standard-rename]').forEach(b=>b.onclick=()=>editStandardVersionName(b));
 $('#standard-prev').onclick=()=>{standardWordPage--;renderStandardVocabulary()};$('#standard-next').onclick=()=>{standardWordPage++;renderStandardVocabulary()};
 document.querySelectorAll('[data-standard-version]').forEach(button=>button.onclick=()=>{standardVocabularyVersion=button.dataset.standardVersion;standardVocabularyQuery='';standardWordPage=1;renderStandardVocabulary()});$('#standard-query').oninput=e=>{standardVocabularyQuery=e.target.value;standardWordPage=1;const caret=e.target.selectionStart;renderStandardVocabulary();$('#standard-query').focus();$('#standard-query').setSelectionRange(caret,caret)};
 document.querySelectorAll('[data-standard-copy]').forEach(button=>button.onclick=()=>{
 const source=standardVocabularyVersions().find(v=>v.id===button.dataset.standardCopy);if(!source){toast('暂无可复制的版本');return}
 openDialog('复制为新版本',`<form id="standard-version-form"><p>来源版本：${esc(source.name)}</p><label class="field"><span>新版本名称</span><input class="input" name="name" placeholder="请输入新版本名称" maxlength="80" required></label><p class="error" role="alert"></p></form>`,'<button class="btn" data-close>取消</button><button class="btn primary" form="standard-version-form" type="submit">创建</button>');
 $('#standard-version-form').onsubmit=e=>{e.preventDefault();const name=e.target.elements.name.value.trim(),all=standardVocabularyVersions();if(!name||all.some(v=>v.name.trim()===name)){e.target.querySelector('.error').textContent=!name?'请输入新版本名称':'新版本名称不能与已有版本相同';return}const id=crypto.randomUUID();if(commitWorkspace(d=>{const original=d.standardVocabularyVersions.find(v=>v.id===source.id);d.standardVocabularyVersions.unshift({id,name,sourceVersionId:source.id,words:original.words.map(w=>({...structuredClone(w),id:crypto.randomUUID()}))});recordStandardVocabularyChange(d.standardVocabularyVersions[0],`从“${original.name}”复制为新版本“${name}”`)})){standardVocabularyVersion=id;standardVocabularyQuery='';standardWordPage=1;closeDialog();renderStandardVocabulary()}};
 });
 const saveWords=change=>{if(!version)return false;const ok=commitWorkspace(d=>{const target=d.standardVocabularyVersions.find(v=>v.id===version.id),before=[...target.words];change(target.words);const added=target.words.filter(w=>!before.some(old=>old.id===w.id)),removed=before.filter(w=>!target.words.some(current=>current.id===w.id));const describe=words=>words.map(w=>`${vocabularyWord(w.wordId.slice(6))?.word||'词条不可用'}（ID：${w.wordId.slice(6)}）`).join('、');if(added.length)recordStandardVocabularyChange(target,'从词库添加：'+describe(added));if(removed.length)recordStandardVocabularyChange(target,'解除引用：'+describe(removed))});if(ok)renderStandardVocabulary();return ok};
 $('#standard-words-pick').onclick=()=>pickVocabularyWords([],ids=>saveWords(words=>{for(const wordId of ids){const word=vocabularyResolve(wordId)?.word;if(word&&!words.some(w=>w.wordId===wordId))words.push({id:crypto.randomUUID(),wordId})}}));
 document.querySelectorAll('[data-standard-remove]').forEach(b=>b.onclick=()=>{const row=version.words.find(w=>w.id===b.dataset.standardRemove);if(!row)return;const word=vocabularyWord(row.wordId.slice(6))?.word||'该单词';openDialog('解除引用',`<p>确认从“${esc(version.name)}”中解除对“${esc(word)}”的引用？</p><p class="muted" style="margin-top:12px">基础词库中的单词和其他版本的引用将保留。</p>`,'<button class="btn" data-close>取消</button><button class="btn danger" id="standard-unlink-confirm">解除引用</button>');$('#standard-unlink-confirm').onclick=()=>{if(saveWords(words=>{const index=words.findIndex(w=>w.id===row.id);if(index>=0)words.splice(index,1)}))closeDialog()}});

}

let listeningVocabularyTab='scenes',listeningSceneParent='',listeningSceneChild='';
function listeningVocabularyCategory(list){return list.listeningCategory||(list.name.includes('话题')?'topics':'difficult')}
const vocabularyDirectoryTabs={
 'vocabulary-listening':[['scenes','听力场景话题'],['topics','话题词汇'],['difficult','难点词汇']],
 'vocabulary-textbook':[['textbook-pep','人教版'],['textbook-fltrp','外研版'],['textbook-bnu','北师大版'],['textbook-yilin','译林版']],
 'vocabulary-product':[['product-weici','维词'],['product-notes','词汇笔记'],['product-outline','词汇大纲'],['product-pocket','新方略口袋本']]
};
const vocabularyDirectorySelection={};let vocabularyDirectoryPage='';
function currentVocabularyDirectoryCategory(){return page==='vocabulary-listening'?listeningVocabularyTab:vocabularyDirectorySelection[page]||vocabularyDirectoryTabs[page][0][0]}
function listeningVocabularyTabs(){const current=currentVocabularyDirectoryCategory();return `<div class="tabs listening-vocabulary-tabs" role="tablist" aria-label="${esc(titles[page]||'听力词汇')}分类">${vocabularyDirectoryTabs[page].map(([id,label])=>`<button class="tab ${current===id?'active':''}" role="tab" aria-selected="${current===id}" data-listening-vocab-tab="${id}">${label}</button>`).join('')}</div>`}
function ensureVocabularyDirectoryEditions(){
 if(!['vocabulary-textbook','vocabulary-product'].includes(page)||data.vocabularyDirectoryEditions?.[page])return;
 const editions=page==='vocabulary-textbook'?{'textbook-pep':['人教版必修一','人教版必修二','人教版必修三','人教版选择性必修一','人教版选择性必修二','人教版选择性必修三','人教版选择性必修四']}:{'product-weici':['2026版','2027版'],'product-notes':['人教2026版','外研2026版'],'product-outline':['2026版','2027版'],'product-pocket':['2026版','2027版']};
 commitWorkspace(d=>{d.listeningVocabularyScenes ||= [];for(const [category,names] of Object.entries(editions))for(const name of names){if(d.listeningVocabularyScenes.some(n=>n.category===category&&n.name===name))continue;const existing=Object.values(resourceCollection('wordlists',d)).find(list=>list.listeningCategory===category&&list.name===name);d.listeningVocabularyScenes.push({id:crypto.randomUUID(),name,category,children:[],...(existing?{wordlistId:existing.id}:{})})}d.vocabularyDirectoryEditions ||= {};d.vocabularyDirectoryEditions[page]=true});
}

function pickSceneMeanings(selected,onSave){
 const words=vocabularyTable('words'),positions=vocabularyTable('positions');
 const all=Object.values(vocabularyTable('meanings')).filter(m=>words[m.wordId]&&positions[m.posId]?.wordId===m.wordId);
 const chosen=new Set(selected.map(s=>s.meaningId));let query='',pageIndex=1;
 openDialog('从词库选择释义',`<input class="input" id="scene-meaning-query" aria-label="搜索单词、释义或 ID" placeholder="搜索单词、释义或 ID"><div id="scene-meaning-selected" class="scene-meaning-selected"></div><div id="scene-meaning-results" class="scene-meaning-results"></div><div class="toolbar"><button class="btn" id="scene-meaning-prev">上一页</button><span id="scene-meaning-page"></span><button class="btn" id="scene-meaning-next">下一页</button></div>`,'<button class="btn" data-close>取消</button><button class="btn primary" id="scene-meaning-save">保存选择</button>');
 const label=m=>`${words[m.wordId].word} · ${positions[m.posId].label} · ${m.chinese||m.chunkChinese||m.english||'暂无释义文本'}`;
 function draw(){
  const rows=all.filter(m=>`${label(m)} ${m.id} ${m.wordId}`.toLowerCase().includes(query)),pages=Math.max(1,Math.ceil(rows.length/20));pageIndex=Math.min(pageIndex,pages);
  $('#scene-meaning-selected').innerHTML=all.filter(m=>chosen.has(m.id)).map(m=>`<button class="linkbtn" data-meaning-unpick="${esc(m.id)}">${esc(label(m))} ×</button>`).join('')||'<span class="muted">可选择同一单词的多个释义</span>';
  $('#scene-meaning-results').innerHTML=rows.slice((pageIndex-1)*20,pageIndex*20).map(m=>`<label class="scene-meaning-choice"><input type="checkbox" value="${esc(m.id)}" ${chosen.has(m.id)?'checked':''}><span><strong>${esc(words[m.wordId].word)}</strong> <span class="muted">${esc(positions[m.posId].label)} · 释义 ID ${esc(m.id)}</span><span class="scene-meaning-text">${esc(m.chinese||m.chunkChinese||m.english||'暂无释义文本')}</span></span></label>`).join('')||'<div class="empty">没有匹配的释义</div>';
  $('#scene-meaning-page').textContent=`${pageIndex} / ${pages} · 已选 ${chosen.size} 个释义`;
  $('#scene-meaning-prev').disabled=pageIndex===1;$('#scene-meaning-next').disabled=pageIndex===pages;
  document.querySelectorAll('[data-meaning-unpick]').forEach(b=>b.onclick=()=>{chosen.delete(b.dataset.meaningUnpick);draw()});
  $('#scene-meaning-results').querySelectorAll('input').forEach(el=>el.onchange=()=>{el.checked?chosen.add(el.value):chosen.delete(el.value);draw()});
 }
 $('#scene-meaning-query').oninput=e=>{query=e.target.value.trim().toLowerCase();pageIndex=1;draw()};
 $('#scene-meaning-prev').onclick=()=>{pageIndex--;draw()};$('#scene-meaning-next').onclick=()=>{pageIndex++;draw()};
 $('#scene-meaning-save').onclick=()=>{const selections=all.filter(m=>chosen.has(m.id)).map(m=>({wordId:m.wordId,posId:m.posId,meaningId:m.id}));if(onSave(selections)!==false)closeDialog()};draw();
}
let listeningSceneEditing=false;
const listeningSceneExpanded=new Map();
function sceneVocabularyRows(list){
 const selections=list?.wordSelections||[],selectedWords=new Set(selections.map(s=>'vocab:'+s.wordId));
 const words=vocabularyTable('words'),positions=vocabularyTable('positions'),meanings=vocabularyTable('meanings');
 const rows=[...selections.map(s=>({key:s.meaningId,wordId:s.wordId,word:words[s.wordId]?.word||'词条不可用',pos:positions[s.posId]?.label||'',meaning:meanings[s.meaningId]?.chinese||meanings[s.meaningId]?.chunkChinese||meanings[s.meaningId]?.english||'释义不可用'})),...(list?.wordIds||[]).filter(id=>!selectedWords.has(id)).map(id=>({key:'legacy:'+id,wordId:id.replace(/^vocab:/,''),word:vocabularyResolve(id)?.word||'词条不可用',pos:'',meaning:'待选择具体释义'}))];
 const order=list?.rowOrder||[];return rows.sort((a,b)=>{const i=order.indexOf(a.key),j=order.indexOf(b.key);return (i<0?order.length:i)-(j<0?order.length:j)});
}
function sceneWriteRows(d,item,keys){
 if(!item.wordlistId){item.wordlistId=resourceNextId('wordlists',d);resourceCollection('wordlists',d)[item.wordlistId]={id:item.wordlistId,name:item.name,listeningCategory:item.category||'scenes'}}
 const list=resourceCollection('wordlists',d)[item.wordlistId],meanings=vocabularyTable('meanings',d);list.rowOrder=[...new Set(keys)];list.wordSelections=list.rowOrder.filter(k=>!k.startsWith('legacy:')).map(k=>meanings[k]).filter(Boolean).map(m=>({wordId:m.wordId,posId:m.posId,meaningId:m.id}));list.wordIds=[...new Set([...list.rowOrder.filter(k=>k.startsWith('legacy:')).map(k=>k.slice(7)),...list.wordSelections.map(m=>'vocab:'+m.wordId)])];
}
function sceneMoveWord(parentId,sourceId,key,targetId,index){
 return commitWorkspace(d=>{const p=d.listeningVocabularyScenes.find(p=>p.id===parentId),nodes=[p,...p.children],source=nodes.find(n=>n.id===sourceId),target=nodes.find(n=>n.id===targetId);if(!source||!target)throw Error('话题不存在');const from=sceneVocabularyRows(resourceCollection('wordlists',d)[source.wordlistId]).map(r=>r.key),at=from.indexOf(key);if(at<0)return;let to=source===target?from:sceneVocabularyRows(resourceCollection('wordlists',d)[target.wordlistId]).map(r=>r.key);if(source!==target&&to.includes(key))throw Error('该话题已包含此释义');from.splice(at,1);if(source===target&&at<index)index--;to.splice(Math.max(0,Math.min(index,to.length)),0,key);sceneWriteRows(d,source,from);if(source!==target)sceneWriteRows(d,target,to);p.modifiedBy=bookFlowActor();p.modifiedAt=new Date().toLocaleString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'})});
}
function ensureSceneWordlistIds(){
 if(!(data.listeningVocabularyScenes||[]).some(p=>!p.wordlistId))return;
 commitWorkspace(d=>{for(const p of d.listeningVocabularyScenes||[])if(!p.wordlistId){p.wordlistId=resourceNextId('wordlists',d);resourceCollection('wordlists',d)[p.wordlistId]={id:p.wordlistId,name:p.name,wordIds:[],wordSelections:[],listeningCategory:p.category||'scenes'}}});
}
function sceneWordlistUses(item,state=data){
 const ids=new Set([item,...item.children].map(n=>n.wordlistId).filter(Boolean)),uses=[];
 for(const id of ids)uses.push(...resourceUses('wordlists',id,state));
 for(const pack of Object.values(resourceStore(state).packages||{}))if(pack.items?.some(i=>i.kind==='wordlists'&&ids.has(i.id)))uses.push(pack.name);
 return [...new Set(uses)];
}
function renderListeningVocabulary(){
 {
  if(vocabularyDirectoryPage!==page){listeningSceneEditing=false;listeningSceneParent='';vocabularyDirectoryPage=page}
  ensureVocabularyDirectoryEditions();
  const category=currentVocabularyDirectoryCategory(),categoryName=vocabularyDirectoryTabs[page].find(([id])=>id===category)[1],isTextbook=page==='vocabulary-textbook',isProduct=page==='vocabulary-product',entryName=isTextbook?'册别':isProduct?'版本':categoryName;
  const linked=new Set((data.listeningVocabularyScenes||[]).flatMap(p=>[p,...p.children]).map(n=>n.wordlistId));
  const unlinked=Object.values(resourceCollection('wordlists')).filter(list=>!linked.has(list.id)&&listeningVocabularyCategory(list)===category);
  if(category!=='scenes'&&!data.listeningDirectoryMigrated?.[category])commitWorkspace(d=>{d.listeningVocabularyScenes ||= [];for(const list of unlinked)d.listeningVocabularyScenes.push({id:crypto.randomUUID(),name:list.name,wordlistId:list.id,category,children:[]});d.listeningDirectoryMigrated ||= {};d.listeningDirectoryMigrated[category]=true});
  ensureSceneWordlistIds();
  const parents=(data.listeningVocabularyScenes||[]).filter(p=>(p.category||'scenes')===category);
  if(!parents.some(p=>p.id===listeningSceneParent))listeningSceneParent=parents[0]?.id||'';
  const parent=parents.find(p=>p.id===listeningSceneParent);
  const sceneCommit=change=>commitWorkspace(d=>{change(d);const p=d.listeningVocabularyScenes?.find(p=>p.id===listeningSceneParent);if(p){p.modifiedBy=bookFlowActor();p.modifiedAt=new Date().toLocaleString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'})}});
  const editIcon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5"/></svg>';
  const guides=depth=>`<span class="directory-level-guides" aria-hidden="true">${Array.from({length:depth},(_,i)=>`<i style="--guide-level:${i}"></i>`).join('')}</span>`;
  const insertionGap=(item,primary,index=0)=>`<div class="directory-insert-gap scene-insert-gap" data-scene-anchor="${esc(item.id)}" data-scene-index="${index}" style="--insert-depth:${primary?0:1};--insert-offset:0px"><div class="directory-insert-hit"><div class="directory-insert-options"><button class="directory-insert-button" data-scene-add-heading>＋ 二级标题</button><button class="directory-insert-button" data-scene-meanings="${esc(item.id)}">＋ 单词</button></div></div></div>`;
  const groupMarkup=(item,primary=false)=>{
   const list=resourceCollection('wordlists')[item.wordlistId],rows=sceneVocabularyRows(list),depth=primary?0:1,open=listeningSceneExpanded.get(item.id)!==false;
   const count=rows.length+(primary?parent.children.reduce((sum,c)=>sum+sceneVocabularyRows(resourceCollection('wordlists')[c.wordlistId]).length,0):0);const gap=insertionGap(item,primary);const childrenAt=index=>primary?parent.children.filter(c=>Math.min(c.contentIndex??rows.length,rows.length)===index).map(c=>groupMarkup(c)).join(''):'';
   return `<div class="book-tree-row unified-directory-row ${primary?'part-heading':'chapter-heading'}" data-scene-group="${esc(item.id)}" style="--chapter-depth:${depth}">${guides(depth)}<div class="unified-name">${primary?'<span class="scene-root-grip-spacer" aria-hidden="true"></span>':`<button class="directory-sort-handle" draggable="true" aria-label="拖动调整${esc(item.name)}的顺序">⠿</button>`}<button class="tree-toggle" data-scene-toggle="${esc(item.id)}" aria-expanded="${open}" aria-label="展开或折叠${esc(item.name)}"><svg class="icon nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button><div class="scene-title-inline"><span class="book-tree-label">${esc(item.name)}</span></div><span class="chapter-resource-meta" aria-label="${count} 个释义">${count}</span></div>${primary?'':`<div class="directory-row-actions"><button class="linkbtn directory-rename-button" data-scene-title="${esc(item.id)}" aria-label="修改${esc(item.name)}"><img class="icon" src="assets/directory-icons/EditOutlined.svg" alt=""></button><button class="btn directory-trash-button" data-scene-delete="${esc(item.id)}" aria-label="删除${esc(item.name)}">${icon('trash')}</button></div>`}</div>${gap}${open?childrenAt(0)+rows.map((row,index)=>`<div class="unified-content-row" data-scene-word="${esc(row.key)}" data-word-owner="${esc(item.id)}" data-word-index="${index}" style="--chapter-depth:${depth}">${guides(depth+1)}<div class="unified-name"><button class="directory-sort-handle" draggable="true" aria-label="拖动调整${esc(row.word)}的位置">⠿</button><span class="scene-word-summary"><span>${esc(row.word)}</span><span class="scene-word-separator"> / </span><span class="scene-word-pos">${esc(row.pos||'—')}</span><span class="scene-word-separator"> / </span><span class="scene-directory-meaning">${esc(row.meaning)}</span></span></div><div class="content-row-actions"><button class="linkbtn resource-danger" data-scene-unlink="${esc(row.key)}" data-scene-owner="${esc(item.id)}">解除引用</button></div></div>${insertionGap(item,primary,index+1)}${childrenAt(index+1)}`).join(''):''}`;
  };
  if(!parent)listeningSceneEditing=false;
  $('#page').innerHTML=listeningSceneEditing
   ?workspaceHead(esc(parent.name),'<button class="btn" id="scene-back">返回场景话题</button>')+`<section class="book-directory-unified chapter-stream scene-directory-editor"><div class="book-directory-tree directory-detail-table">${groupMarkup(parent,true)}</div></section>`
   :workspaceHead(titles[page]||'听力词汇',`<button class="btn primary" id="scene-add-parent">新建${entryName}</button>`)+listeningVocabularyTabs()+`<section class="panel listening-vocabulary-list">${resourceTable(['词汇表 ID',isTextbook?'册别名称':isProduct?'版本名称':'话题名称','二级标题','词汇数量','引用','操作'],parents.map(item=>[esc(item.wordlistId),esc(item.name),String(item.children.length),String([item,...item.children].reduce((sum,node)=>sum+sceneVocabularyRows(resourceCollection('wordlists')[node.wordlistId]).length,0)),`<button class="linkbtn" data-scene-references="${esc(item.id)}" ${sceneWordlistUses(item).length?'':'disabled'}>${sceneWordlistUses(item).length}</button>`,`<button class="linkbtn" data-scene-open="${esc(item.id)}">编辑</button><button class="linkbtn resource-danger" data-scene-remove-list="${esc(item.id)}" ${sceneWordlistUses(item).length?'disabled':''}>删除</button>`]))}</section>`;

  if(!listeningSceneEditing){const titleRow=$('#page .page-title-row');titleRow.classList.add('listening-vocabulary-heading');titleRow.append($('.listening-vocabulary-tabs'))}
  document.querySelectorAll('[data-scene-references]').forEach(button=>button.onclick=()=>{const item=parents.find(p=>p.id===button.dataset.sceneReferences);openDialog('词汇表引用',sceneWordlistUses(item).map(name=>`<p>${esc(name)}</p>`).join('')||'<p>暂无引用</p>','<button class="btn" data-close>关闭</button>')});
  document.querySelectorAll('[data-scene-remove-list]').forEach(button=>button.onclick=()=>{
   const item=parents.find(p=>p.id===button.dataset.sceneRemoveList);if(sceneWordlistUses(item).length){toast('该词汇表已有引用，不能删除');return}
   openDialog('删除词汇表',`<p>确认删除“${esc(item.name)}”及其二级标题和词汇引用？基础词库中的词条与释义将保留。</p><p class="error" id="scene-remove-list-error"></p>`,'<button class="btn" data-close>取消</button><button class="btn danger" id="scene-remove-list-confirm">删除</button>');
   $('#scene-remove-list-confirm').onclick=()=>{const current=(data.listeningVocabularyScenes||[]).find(p=>p.id===item.id);if(!current){closeDialog();renderListeningVocabulary();return}if(sceneWordlistUses(current).length){$('#scene-remove-list-error').textContent='该词汇表已有引用，不能删除';return}if(commitWorkspace(d=>{const target=d.listeningVocabularyScenes.find(p=>p.id===item.id);if(sceneWordlistUses(target,d).length)throw Error('该词汇表已有引用，不能删除');d.listeningVocabularyScenes=d.listeningVocabularyScenes.filter(p=>p.id!==item.id);for(const node of [target,...target.children])if(node.wordlistId)delete resourceCollection('wordlists',d)[node.wordlistId]})){closeDialog();renderListeningVocabulary()}};
  });
  if(listeningSceneEditing){
   const heading=$('#page h1');heading.innerHTML=`<label class="scene-task-name-field"><span aria-hidden="true">${editIcon}</span><input class="scene-task-name-input" aria-label="词汇表标题" maxlength="160" value="${esc(parent.name)}"></label><span class="scene-title-error error" role="alert"></span>`;
   const input=heading.querySelector('input'),error=heading.querySelector('.error');let saved=parent.name;
   const save=()=>{const name=input.value.trim();if(!name||parents.some(p=>p.id!==parent.id&&p.name===name)){error.textContent='请输入不重复的话题名称';return}error.textContent='';if(name===saved){input.value=saved;return}if(sceneCommit(d=>{const target=d.listeningVocabularyScenes.find(p=>p.id===parent.id);target.name=name;if(target.wordlistId)resourceCollection('wordlists',d)[target.wordlistId].name=name})){saved=name;renderListeningVocabulary()}else error.textContent='保存失败，请重试'};
   input.onblur=save;input.onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='Enter'){e.preventDefault();input.blur()}else if(e.key==='Escape'){input.value=saved;error.textContent='';input.blur()}};
  }
  if(listeningSceneEditing){const heading=$('#page h1'),back=$('#scene-back');const left=document.createElement('div');left.className='scene-header-left';heading.before(left);left.append(back,heading);back.textContent='返回';back.setAttribute('aria-label','返回'+categoryName);const actions=left.closest('.page-head').querySelector(':scope > .row');actions.insertAdjacentHTML('beforeend','<button class="btn primary" id="scene-save">保存</button>');$('#page').insertAdjacentHTML('beforeend',`<footer class="listening-dict-history scene-operation-footer"><span>最后修改人：${esc(parent.modifiedBy||'—')}</span><span>修改时间：${esc(parent.modifiedAt||'—')}</span></footer>`)}
  document.querySelectorAll('[data-scene-title]').forEach(button=>button.onclick=()=>{
   const item=[...parents,...parents.flatMap(p=>p.children)].find(p=>p.id===button.dataset.sceneTitle),siblings=parents.includes(item)?parents:parent.children,host=button.closest('.scene-title-inline')||button.closest('[data-scene-group]').querySelector('.scene-title-inline');
   document.querySelectorAll('.scene-title-form').forEach(form=>form.cancelEdit());
   const title=host.querySelector('span'),width=title.getBoundingClientRect().width;
   title.style.visibility='hidden';button.style.visibility='hidden';
   host.insertAdjacentHTML('beforeend',`<form class="scene-title-form inline-directory-form directory-title-editor" style="width:${Math.max(48,width+18)}px"><input class="input" aria-label="词汇表标题" maxlength="160" required value="${esc(item.name)}"><span class="error" role="alert"></span></form>`);
   const form=host.querySelector('form'),input=form.querySelector('input');
   form.cancelEdit=()=>{form.remove();title.style.visibility='';button.style.visibility=''};
   input.onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='Escape'){e.preventDefault();form.cancelEdit();button.focus()}else if(e.key==='Enter'){e.preventDefault();form.requestSubmit()}};
   input.onblur=()=>{if(form.isConnected)form.requestSubmit()};input.focus();input.select();
   form.onsubmit=e=>{e.preventDefault();const name=input.value.trim();if(!name||siblings.some(p=>p.id!==item.id&&p.name===name)){form.querySelector('.error').textContent='请输入不重复的话题名称';return}if(name===item.name){renderListeningVocabulary();return}if(sceneCommit(d=>{const target=d.listeningVocabularyScenes.flatMap(p=>[p,...p.children]).find(p=>p.id===item.id);target.name=name;if(target.wordlistId)resourceCollection('wordlists',d)[target.wordlistId].name=name}))renderListeningVocabulary()};
  });
  const saveButton=$('#scene-save');if(saveButton){
   saveButton.onpointerdown=e=>e.preventDefault();
   saveButton.onclick=()=>{
    const form=document.querySelector('.scene-title-form,.scene-heading-editor');if(form){form.requestSubmit();if(form.isConnected)return}
    const title=$('.scene-task-name-input');title?.onblur?.();
    if($('.scene-title-error')?.textContent)return;
    if(sceneCommit(()=>{})){if(analysisWordlistPageSession){analysisWordlistPageSession.finish(true);return}renderListeningVocabulary();toast('已保存')}
   };
  }
  const owner=id=>id===parent?.id?parent:parent?.children.find(c=>c.id===id);
  const stateOwner=(d,id)=>{const p=d.listeningVocabularyScenes.find(x=>x.id===parent.id);return id===p.id?p:p.children.find(c=>c.id===id)};
  const nameDialog=(level,id='')=>{
   const items=level==='parent'?parents:parent.children,item=items.find(x=>x.id===id);
   resourceNameForm((id?'修改':'添加')+(level==='parent'?entryName:'二级标题'),item?.name||'',name=>{
    if(items.some(x=>x.id!==id&&x.name===name)){$('#resource-error').textContent='同级话题名称不能重复';return}
    if(sceneCommit(d=>{
     d.listeningVocabularyScenes ||= [];const target=level==='parent'?d.listeningVocabularyScenes:d.listeningVocabularyScenes.find(x=>x.id===parent.id).children;
     if(id){const current=target.find(x=>x.id===id);current.name=name;if(current.wordlistId)resourceCollection('wordlists',d)[current.wordlistId].name=name}
     else{const newId=crypto.randomUUID();target.push({id:newId,name,category,...(level==='parent'?{children:[]}:{})});listeningSceneExpanded.set(newId,true);if(level==='parent'){listeningSceneParent=newId;listeningSceneEditing=true}}
    })){closeDialog();renderListeningVocabulary()}
   });
  };
  $('#scene-add-parent')?.addEventListener('click',()=>nameDialog('parent'));$('#scene-add-child')?.addEventListener('click',()=>nameDialog('child'));
  $('#scene-back')?.addEventListener('click',()=>{if(analysisWordlistPageSession){analysisWordlistPageSession.finish(false);return}listeningSceneEditing=false;renderListeningVocabulary()});
  document.querySelectorAll('[data-scene-open]').forEach(b=>b.onclick=()=>{listeningSceneParent=b.dataset.sceneOpen;const opened=parents.find(p=>p.id===listeningSceneParent);[opened,...opened.children].forEach(n=>listeningSceneExpanded.set(n.id,true));listeningSceneEditing=true;renderListeningVocabulary()});
  document.querySelectorAll('[data-scene-select]').forEach(b=>b.onclick=()=>{listeningSceneParent=b.dataset.sceneSelect;renderListeningVocabulary()});
  document.querySelectorAll('[data-scene-edit]').forEach(b=>b.onclick=()=>nameDialog(b.dataset.level,b.dataset.sceneEdit));
  document.querySelectorAll('[data-scene-add-heading]').forEach(b=>b.onclick=()=>{
   if(document.querySelector('.scene-insert-editor')){document.querySelector('.scene-insert-editor input').focus();return}
   const anchor=b.closest('.scene-insert-gap'),after=anchor.dataset.sceneAnchor;
   anchor.insertAdjacentHTML('afterend','<form class="scene-insert-editor scene-heading-editor"><input class="input" aria-label="二级标题" placeholder="输入二级标题" maxlength="160" required><button class="linkbtn" type="submit">保存</button><button class="linkbtn" type="button" data-inline-cancel>取消</button><span class="error" role="alert"></span></form>');
   const form=anchor.nextElementSibling;form.querySelector('input').focus();form.querySelector('[data-inline-cancel]').onclick=()=>form.remove();form.onkeydown=e=>{if(e.key==='Escape')form.remove()};
   form.onsubmit=e=>{e.preventDefault();const name=form.querySelector('input').value.trim();if(!name||parent.children.some(c=>c.name===name)){form.querySelector('.error').textContent='请输入不重复的二级标题';return}const id=crypto.randomUUID();if(sceneCommit(d=>{const p=d.listeningVocabularyScenes.find(p=>p.id===parent.id),index=p.children.findIndex(c=>c.id===after),source=index<0?p:p.children[index],keys=sceneVocabularyRows(resourceCollection('wordlists',d)[source.wordlistId]).map(r=>r.key),boundary=Number(anchor.dataset.sceneIndex),node={id,name,category,contentIndex:index<0?boundary:source.contentIndex};if(index>=0&&boundary<keys.length){sceneWriteRows(d,source,keys.slice(0,boundary));sceneWriteRows(d,node,keys.slice(boundary))}p.children.splice(index+1,0,node)})){listeningSceneExpanded.set(parent.id,true);listeningSceneExpanded.set(id,true);renderListeningVocabulary()}};
  });
  document.querySelectorAll('[data-scene-toggle]').forEach(b=>b.onclick=()=>{listeningSceneExpanded.set(b.dataset.sceneToggle,b.getAttribute('aria-expanded')!=='true');renderListeningVocabulary()});

  document.querySelectorAll('[data-scene-meanings]').forEach(b=>b.onclick=()=>{
   if(document.querySelector('.scene-insert-editor')){document.querySelector('.scene-insert-editor input').focus();return}
   const item=owner(b.dataset.sceneMeanings),anchor=b.closest('.scene-insert-gap'),insertIndex=Number(anchor.dataset.sceneIndex),list=resourceCollection('wordlists')[item.wordlistId];
   anchor.insertAdjacentHTML('afterend',`<div class="scene-insert-editor scene-word-editor"><div class="row"><input class="input" aria-label="搜索单词或释义" placeholder="搜索单词或释义，选择具体释义"></div><div class="scene-inline-results"></div><div class="scene-inline-pages"></div></div>`);
   const editor=anchor.nextElementSibling,input=editor.querySelector('input'),results=editor.querySelector('.scene-inline-results'),pages=editor.querySelector('.scene-inline-pages');
   const words=vocabularyTable('words'),positions=vocabularyTable('positions'),all=Object.values(vocabularyTable('meanings')).filter(m=>words[m.wordId]&&positions[m.posId]?.wordId===m.wordId),selected=new Set((list?.wordSelections||[]).map(m=>m.meaningId));let pageIndex=1;
   const draw=()=>{
    const q=input.value.trim().toLowerCase();if(!q){results.innerHTML='';pages.innerHTML='';return}
    const matches=all.filter(m=>`${words[m.wordId].word} ${m.chinese} ${m.english} ${m.chunkChinese} ${m.wordId} ${m.id}`.toLowerCase().includes(q)),pageCount=Math.max(1,Math.ceil(matches.length/20));pageIndex=Math.min(pageIndex,pageCount);
    results.innerHTML=matches.slice((pageIndex-1)*20,pageIndex*20).map(m=>`<button class="scene-inline-meaning" data-select-meaning="${esc(m.id)}" ${selected.has(m.id)?'disabled':''}><strong>${esc(words[m.wordId].word)}</strong><span class="muted">${esc(positions[m.posId].label)}</span><span>${esc(m.chinese||m.chunkChinese||m.english||'暂无释义文本')}</span><small class="muted">释义 ID ${esc(m.id)}${selected.has(m.id)?' · 已添加':''}</small></button>`).join('')||'<p class="muted">没有匹配的释义</p>';
    pages.innerHTML=`<button class="linkbtn" data-inline-prev ${pageIndex===1?'disabled':''}>上一页</button><span>${pageIndex} / ${pageCount}</span><button class="linkbtn" data-inline-next ${pageIndex===pageCount?'disabled':''}>下一页</button>`;
    pages.querySelector('[data-inline-prev]').onclick=()=>{pageIndex--;draw()};pages.querySelector('[data-inline-next]').onclick=()=>{pageIndex++;draw()};
    results.querySelectorAll('[data-select-meaning]').forEach(choice=>choice.onclick=()=>{
     const meaning=all.find(m=>m.id===choice.dataset.selectMeaning);
     if(sceneCommit(d=>{const target=stateOwner(d,item.id);if(!target.wordlistId){target.wordlistId=resourceNextId('wordlists',d);resourceCollection('wordlists',d)[target.wordlistId]={id:target.wordlistId,name:target.name,wordIds:[],wordSelections:[],listeningCategory:category}}const saved=resourceCollection('wordlists',d)[target.wordlistId];saved.wordSelections ||= [];if(saved.wordSelections.some(s=>s.meaningId===meaning.id))return;const keys=sceneVocabularyRows(saved).map(r=>r.key).filter(k=>k!=='legacy:vocab:'+meaning.wordId);keys.splice(Math.min(insertIndex,keys.length),0,meaning.id);sceneWriteRows(d,target,keys)})){listeningSceneExpanded.set(item.id,true);renderListeningVocabulary()}
    });
   };
   const dismiss=()=>{editor.remove();document.removeEventListener('pointerdown',outside,true)};
   const outside=e=>{if(!editor.isConnected){document.removeEventListener('pointerdown',outside,true);return}if(!editor.contains(e.target))dismiss()};
   document.addEventListener('pointerdown',outside,true);
   input.oninput=()=>{pageIndex=1;draw()};editor.onkeydown=e=>{if(e.key==='Escape')dismiss()};input.focus();draw();
  });
  document.querySelectorAll('[data-scene-delete]').forEach(button=>button.onclick=()=>{const item=owner(button.dataset.sceneDelete);openDialog('删除二级标题',`<p>确认删除“${esc(item.name)}”？其中的词汇将保留到“${esc(parent.name)}”下。</p>`,'<button class="btn" data-close>取消</button><button class="btn danger" id="scene-delete-confirm">删除标题</button>');$('#scene-delete-confirm').onclick=()=>{if(sceneCommit(d=>{const p=d.listeningVocabularyScenes.find(p=>p.id===parent.id),item=p.children.find(c=>c.id===button.dataset.sceneDelete),keys=sceneVocabularyRows(resourceCollection('wordlists',d)[p.wordlistId]).map(r=>r.key),childKeys=sceneVocabularyRows(resourceCollection('wordlists',d)[item.wordlistId]).map(r=>r.key);keys.splice(Math.min(item.contentIndex??keys.length,keys.length),0,...childKeys.filter(k=>!keys.includes(k)));sceneWriteRows(d,p,keys);p.children=p.children.filter(c=>c.id!==item.id)})){closeDialog();renderListeningVocabulary()}}});
  let dragged=null;
  const clearDrop=()=>document.querySelectorAll('.scene-drop-target').forEach(el=>el.classList.remove('scene-drop-target'));
  document.querySelectorAll('[data-scene-word]').forEach(row=>{const handle=row.querySelector('.directory-sort-handle');handle.ondragstart=e=>{dragged={owner:row.dataset.wordOwner,key:row.dataset.sceneWord};e.dataTransfer?.setData('text/plain',row.dataset.sceneWord);if(e.dataTransfer)e.dataTransfer.effectAllowed='move'};handle.ondragend=()=>{dragged=null;clearDrop()};handle.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const index=Number(row.dataset.wordIndex),count=sceneVocabularyRows(resourceCollection('wordlists')[owner(row.dataset.wordOwner).wordlistId]).length;if(e.key==='ArrowUp'&&index===0||e.key==='ArrowDown'&&index===count-1)return;if(sceneMoveWord(parent.id,row.dataset.wordOwner,row.dataset.sceneWord,row.dataset.wordOwner,index+(e.key==='ArrowUp'?-1:2)))renderListeningVocabulary()}});
  document.querySelectorAll('[data-scene-word],.scene-insert-gap,[data-scene-group]').forEach(el=>{const destination=e=>el.dataset.sceneWord?{id:el.dataset.wordOwner,index:Number(el.dataset.wordIndex)+(e.clientY>el.getBoundingClientRect().top+el.getBoundingClientRect().height/2?1:0)}:el.dataset.sceneAnchor?{id:el.dataset.sceneAnchor,index:Number(el.dataset.sceneIndex)}:{id:el.dataset.sceneGroup,index:0};el.ondragover=e=>{if(!dragged)return;e.preventDefault();clearDrop();el.classList.add('scene-drop-target')};el.ondrop=e=>{if(!dragged)return;e.preventDefault();const dest=destination(e);try{if(sceneMoveWord(parent.id,dragged.owner,dragged.key,dest.id,dest.index)){listeningSceneExpanded.set(dest.id,true);renderListeningVocabulary()}}catch(error){toast(error.message)}dragged=null;clearDrop()}});
  const headingRows=[...document.querySelectorAll('[data-scene-group]')],wordDropHandlers=new Map(headingRows.map(row=>[row,{over:row.ondragover,drop:row.ondrop}]));
  bindDirectorySorting(headingRows,row=>row.dataset.sceneGroup===parent.id?'root':'children',(from,to,after)=>{
   if(sceneCommit(d=>{const p=d.listeningVocabularyScenes.find(p=>p.id===parent.id),source=p.children.find(c=>c.id===from.dataset.sceneGroup),target=p.children.find(c=>c.id===to.dataset.sceneGroup);if(!source||!target)return;const boundary=target.contentIndex;p.children=p.children.filter(c=>c.id!==source.id);const index=p.children.findIndex(c=>c.id===target.id);source.contentIndex=boundary;p.children.splice(index+(after?1:0),0,source)}))renderListeningVocabulary();
  });
  headingRows.forEach(row=>{const over=row.ondragover,drop=row.ondrop,prior=wordDropHandlers.get(row);row.ondragover=e=>dragged?prior.over(e):over(e);row.ondrop=e=>dragged?prior.drop(e):drop(e)});
  document.querySelectorAll('[data-scene-unlink]').forEach(b=>b.onclick=()=>{
   const item=owner(b.dataset.sceneOwner),list=resourceCollection('wordlists')[item.wordlistId],key=b.dataset.sceneUnlink,row=sceneVocabularyRows(list).find(r=>r.key===key);
   openDialog('解除引用',`<p>确认解除“${esc(row.word)} · ${esc(row.meaning)}”在“${esc(item.name)}”中的引用？</p>`,'<button class="btn" data-close>取消</button><button class="btn danger" id="scene-unlink-confirm">解除引用</button>');
   $('#scene-unlink-confirm').onclick=()=>{if(resourceCommit(d=>{
    const target=resourceCollection('wordlists',d)[list.id];if(key.startsWith('legacy:'))target.wordIds=target.wordIds.filter(id=>id!==key.slice(7));else{target.wordSelections=(target.wordSelections||[]).filter(s=>s.meaningId!==key);if(!target.wordSelections.some(s=>s.wordId===row.wordId))target.wordIds=target.wordIds.filter(id=>id!=='vocab:'+row.wordId)}
   },renderListeningVocabulary))closeDialog()};
  });
 }
 document.querySelectorAll('[data-listening-vocab-tab]').forEach(b=>b.onclick=()=>{if(page==='vocabulary-listening')listeningVocabularyTab=b.dataset.listeningVocabTab;else vocabularyDirectorySelection[page]=b.dataset.listeningVocabTab;listeningSceneEditing=false;renderListeningVocabulary()});
}

// Open the same vocabulary directory editor while retaining the listening draft.
let analysisWordlistPageSession=null;
function openAnalysisWordlistPage(onSaved){
 if(analysisWordlistPageSession)return;
 const previous={page,tab:listeningVocabularyTab,parent:listeningSceneParent,editing:listeningSceneEditing,directory:vocabularyDirectoryPage};
 const originalPage=document.querySelector('#page'),listening=document.querySelector('#listening-create');
 const display=listening?.style.display;
 const parentId=crypto.randomUUID();let listId;
 let name='新建词汇表',suffix=2;
 while((data.listeningVocabularyScenes||[]).some(p=>p.name===name))name='新建词汇表 '+suffix++;
 if(!commitWorkspace(d=>{
  listId=resourceNextId('wordlists',d);
  resourceCollection('wordlists',d)[listId]={id:listId,name,wordIds:[],wordSelections:[],listeningCategory:'scenes'};
  (d.listeningVocabularyScenes ||= []).push({id:parentId,name,category:'scenes',wordlistId:listId,children:[]});
 }))return;
 originalPage?.removeAttribute('id');
 if(listening)listening.style.display='none';
 const host=document.createElement('main');host.className='analysis-wordlist-page';host.setAttribute('aria-label','新建词汇表');
 host.innerHTML='<div id="page"></div>';document.body.append(host);
 page='vocabulary-listening';vocabularyDirectoryPage=page;listeningVocabularyTab='scenes';listeningSceneParent=parentId;listeningSceneEditing=true;listeningSceneExpanded.set(parentId,true);
 const finish=saved=>{
  const parent=data.listeningVocabularyScenes.find(p=>p.id===parentId);
  if(saved){
   const rows=[parent,...parent.children].flatMap(p=>sceneVocabularyRows(resourceCollection('wordlists')[p.wordlistId]));
   if(!rows.length){toast('请至少选择一个词条及释义');return}
  }else if(!commitWorkspace(d=>{
   const item=d.listeningVocabularyScenes.find(p=>p.id===parentId);
   for(const node of [item,...item.children])delete resourceCollection('wordlists',d)[node.wordlistId];
   d.listeningVocabularyScenes=d.listeningVocabularyScenes.filter(p=>p.id!==parentId);
  }))return;
  BookUI.disposeHierarchies?.(host);host.remove();originalPage?.setAttribute('id','page');
  page=previous.page;listeningVocabularyTab=previous.tab;listeningSceneParent=previous.parent;listeningSceneEditing=previous.editing;vocabularyDirectoryPage=previous.directory;
  if(listening)listening.style.display=display;
  analysisWordlistPageSession=null;
  if(saved)onSaved(listId);
 };
 analysisWordlistPageSession={finish};
 renderListeningVocabulary();
 document.querySelector('.scene-task-name-input')?.select();
}
