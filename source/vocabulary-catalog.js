'use strict';
let vocabularyCatalogTab='word';
const catalogStatusFilters={word:{},chunk:{},usage:{}};
function catalogMatchesStatus(entry){const filters=catalogStatusFilters[entry.entryType]||{};if(filters.review&&filters.review!==(catalogPending(entry)?'pending':'clear'))return false;return catalogSectionStatus(entry).every(item=>!filters[item.label]||filters[item.label]===item.status)}
function catalogMember(){const account=bookFlowActor();return data.members.find(m=>[m.id,m.name,m.account,m.username,m.phone].includes(account))||data.members.find(m=>m.name===(typeof demoLoginAccounts!=='undefined'?demoLoginAccounts[account]:undefined))}
function catalogInGroup(name){const member=catalogMember();return !!member&&(member.departments||[]).some(id=>data.departments.some(d=>d.id===id&&[name,name+'组'].includes(d.name)))}
function catalogHasPermission(action){const member=catalogMember();return !!member&&!isMemberDisabled(member)&&accountPermissions(member).has('vocabulary:'+action)}
function catalogPending(entry){return data.vocabularyCatalogReview?.[entry.id]?.status==='pending'}
function catalogCanReview(entry){return catalogPending(entry)&&catalogHasPermission(2)}
function catalogEntries(){return [...VocabularyCatalog.entries,...Object.values(data.vocabularyCatalogExtra||{})].filter(e=>!(data.vocabularyCatalogDeleted||[]).includes(e.id))}
function catalogModel(entry){const result=data.vocabularyCatalogEdits?.[entry.id]||{word:entry.word,words:structuredClone(entry.words),positions:structuredClone(entry.positions),meanings:entry.meanings.map(m=>({...structuredClone(m),examples:[],chunks:[]})),exampleRevision:1,wordAttributesRevision:1};return {...result,meanings:result.meanings.map(m=>({...m,meaningId:catalogMeaningId(m.meaningId||entry.meanings.find(x=>x.row===m.row)?.meaningId)}))}}
function catalogAudit(entry){return data.vocabularyCatalogAudit?.[entry.id]||data.operationAudit?.[JSON.stringify(['vocabularyCatalogEdits',entry.id])]||null}
function catalogName(entry){return catalogModel(entry).words[0].displayWord||entry.word}
function catalogSectionStatus(entry,includeBase=false){
 const m=catalogModel(entry),w=m.words[0]||{},meanings=m.meanings||[];
 const filled=v=>String(v??'').trim().length>0;
 const status=(label,values)=>{const count=values.filter(filled).length;return {label,status:values.length&&count===values.length?'已填写':'未填写',tone:values.length&&count===values.length?'is-complete':'needs-content'}};
 const optional=Object.keys(w).filter(k=>/^[B-Z]$/.test(k)&&(!w._sourceBlank?.includes(k)||filled(w[k])));
 const items=[status('基础属性',[w.displayWord,...(entry.entryType==='chunk'?[w.chunkType]:[]),...optional.map(k=>w[k])])];
 if(entry.entryType==='word')items.push(status('音标音频',(m.positions||[]).flatMap(p=>['D','E','F','G'].map(k=>p[k]))));
 items.push(status('释义',meanings.flatMap(x=>filled(x.AG)||filled(x.AH)?[x.AG,x.AH]:[x.O])));
 const chunks=[...(m.wordChunks||[]),...meanings.flatMap(x=>[...(filled(x.AG)||filled(x.AH)?[{word:x.AG,meaning:x.AH}]:[]),...(x.chunks||[])])];
 items.push(status(entry.entryType==='chunk'?'词块用法':'词块',chunks.flatMap(c=>[c.word,c.meaning])));
 return entry.entryType==='chunk'&&!includeBase?items.filter(item=>item.label!=='基础属性'):items;
}

function catalogCanPublish(entry){return !catalogPending(entry)&&catalogSectionStatus(entry,true).slice(0,3).every(item=>item.tone==='is-complete')}

function catalogHeader(){
 return `<section class="page-head vocabulary-catalog-heading"><div class="page-title-row listening-vocabulary-heading"><h1>基础词库</h1><div class="tabs vocabulary-catalog-tabs listening-vocabulary-tabs" role="tablist" aria-label="词条类型">${[['word','单词'],['chunk','词块'],['usage','词块用法'],['publish','发布']].map(([key,label])=>`<button class="tab ${vocabularyCatalogTab===key?'active':''}" role="tab" aria-selected="${vocabularyCatalogTab===key}" data-catalog-tab="${key}">${label}${key==='publish'?'':` <span>${key==='usage'?catalogChunkUsages().length:catalogEntries().filter(e=>e.entryType===key).length}</span>`}</button>`).join('')}</div></div>${catalogHasPermission(7)?'<button class="btn" id="catalog-export">导出基础词库</button>':''}</section>`;
}
function bindCatalogTabs(){const exportButton=document.querySelector('#catalog-export');if(exportButton)exportButton.onclick=exportBasicVocabulary;document.querySelectorAll('[data-catalog-tab]').forEach(b=>b.onclick=()=>{vocabularyCatalogTab=b.dataset.catalogTab;editorialQuery='';renderVocabulary()})}
function ensureCatalogPublicationExample(){
 if(data.vocabularyPublicationExampleVersion===1){commitWorkspace(d=>{for(const r of d.vocabularyPublications||[])if(r.builtIn)r.actor=r.version===1?'鲍科羽':'陈浩杰';if(d.vocabularyPublishedSnapshot?.builtIn)d.vocabularyPublishedSnapshot.actor='陈浩杰';d.vocabularyPublicationExampleVersion=2})}
 if(data.vocabularyPublicationExampleVersion||(data.vocabularyPublications||[]).length)return;
 const entries=VocabularyCatalog.entries.map(entry=>({id:entry.id,entryType:entry.entryType,model:{word:entry.word,words:structuredClone(entry.words),positions:structuredClone(entry.positions),meanings:entry.meanings.map(m=>({...structuredClone(m),meaningId:catalogMeaningId(m.meaningId),examples:[],chunks:[]})),exampleRevision:1,wordAttributesRevision:1}}));
 const counts={words:entries.filter(e=>e.entryType==='word').length,chunks:entries.filter(e=>e.entryType==='chunk').length};
 const records=[{version:1,at:'2026-11-13T10:00:00+08:00',actor:'鲍科羽',...counts,note:'基础词库首次发布（内置示例）',builtIn:true},{version:2,at:'2026-11-16T09:30:00+08:00',actor:'陈浩杰',...counts,note:'单词与词块内容更新（内置示例）',builtIn:true}];
 commitWorkspace(d=>{d.vocabularyPublications=records;d.vocabularyPublishedSnapshot||={...records[1],entries};d.vocabularyPublicationExampleVersion=2});
}
function renderCatalogPublication(){
 ensureCatalogPublicationExample();
 const records=data.vocabularyPublications||[];
 $('#page').innerHTML=catalogHeader()+`<section class="panel book-status-maintenance catalog-publication-panel"><div class="book-status-heading"><h3>发布明细</h3><button class="btn publish-action" id="catalog-publish" ${canPublishWorkspace()?'':'disabled'}>发布</button></div>${records.length?`<div class="school-publication-scroll" tabindex="0" role="region" aria-label="词库发布记录时间线"><ol class="school-publication-timeline">${[...records].reverse().map((record,i)=>`<li class="${i===0?'is-latest':''}"><span class="publication-timeline-dot" aria-hidden="true"></span><div class="publication-timeline-entry"><div class="publication-timeline-heading"><strong><time datetime="${esc(record.at)}">${esc(bookFlowTime(record.at))}</time></strong></div><span class="publication-timeline-actor">发布人：${esc(record.actor)}</span><span class="catalog-publication-count">单词 ${record.words}</span><span class="catalog-publication-count">词块 ${record.chunks}</span></div></li>`).join('')}</ol></div>`:'<p class="muted">暂无发布记录</p>'}</section>`;
 bindCatalogTabs();
 $('#catalog-publish').onclick=()=>{
  if(!requirePublishingPermission())return;
  openDialog('发布基础词库','<p>仅发布不在待审核状态且前三项状态均已完成的单词和词块。</p><label class="field"><span>发布说明（选填）</span><textarea class="input" id="catalog-publication-note" rows="3"></textarea></label>','<button class="btn" data-close>取消</button><button class="btn publish-action" id="catalog-confirm-publish">确认发布</button>');
  $('#catalog-confirm-publish').onclick=()=>{
   if(!requirePublishingPermission())return;
   const entries=catalogEntries().filter(catalogCanPublish),snapshot=entries.map(entry=>({id:entry.id,entryType:entry.entryType,model:structuredClone(catalogModel(entry))}));
   if(!snapshot.length){toast('暂无可发布词条');return}
   const record={version:(data.vocabularyPublications||[]).length+1,at:new Date().toISOString(),actor:bookFlowActor(),words:entries.filter(e=>e.entryType==='word').length,chunks:entries.filter(e=>e.entryType==='chunk').length,note:$('#catalog-publication-note').value.trim()};
   if(commitWorkspace(d=>{d.vocabularyPublications||=[];d.vocabularyPublications.push(record);d.vocabularyPublishedSnapshot={...record,entries:snapshot}})){closeDialog();renderVocabulary();toast('词库已发布')}
  };
 };
}

renderVocabulary=function(){
 BookUI.disposeHierarchies($('#page'));
 if(vocabularyCatalogTab==='usage'){renderChunkUsages();return}
 if(vocabularyCatalogTab==='publish'){renderCatalogPublication();return}
 const query=editorialQuery.trim().toLowerCase();const entries=catalogEntries().filter(e=>e.entryType===vocabularyCatalogTab);const matchedRows=entries.filter(e=>catalogMatchesStatus(e)&&(e.id+' '+catalogName(e)+' '+catalogModel(e).meanings.map(m=>m.O||m.AH).join(' ')).toLowerCase().includes(query));
 const pagination=catalogPaginate(matchedRows);const rows=pagination.rows;
 $('#page').innerHTML=catalogHeader()+`<section class="panel vocabulary-catalog-list"><div class="toolbar"><form id="catalog-search-form" class="catalog-search-form"><input id="word-search" class="input" aria-label="搜索词条" placeholder="搜索${vocabularyCatalogTab==='word'?'单词':'词块'}、释义或 ID" value="${esc(editorialQuery)}"><button class="btn primary" type="submit">搜索</button></form><button class="btn primary" id="catalog-new">新增${vocabularyCatalogTab==='word'?'单词':'词块'}</button></div>${resourceTable([vocabularyCatalogTab==='chunk'?'词块 ID':'单词 ID',vocabularyCatalogTab==='chunk'?'词块':'单词',...(vocabularyCatalogTab==='chunk'?['词块类型']:[]),'状态','待审核','操作'],rows.map(e=>[esc(e.id),esc(catalogName(e)),...(vocabularyCatalogTab==='chunk'?[esc(catalogModel(e).words[0].chunkType||e.chunkType||'—')]:[]),`<span data-catalog-status="${e.id}"></span>`,catalogPending(e)?'<span class="catalog-review-pending">待审核</span>':'<span class="muted">—</span>',`<button class="linkbtn" data-catalog-view="${e.id}">查看</button><button class="linkbtn" data-catalog-open="${e.id}">修改词条</button><button class="linkbtn resource-danger" data-catalog-delete="${e.id}" ${vocabularyReferenceCount(e.id)?'disabled':''}>删除</button>`]))}${!rows.length?'<p class="muted catalog-empty">暂无词条</p>':''}${pagination.html}</section>`;
 updateCatalogEmptyState();bindCatalogPagination();
 bindCatalogStatusFilter();
 bindCatalogReviewFilter();
 document.querySelectorAll('[data-catalog-status]').forEach(host=>BookUI.renderVocabularyStatus(host,catalogSectionStatus(entries.find(e=>e.id===host.dataset.catalogStatus))));
 $('#catalog-search-form').onsubmit=e=>{e.preventDefault();editorialQuery=$('#word-search').value;renderVocabulary()};
 bindCatalogTabs();
 document.querySelectorAll('[data-catalog-view]').forEach(b=>b.onclick=()=>openCatalogEditor(catalogEntries().find(e=>e.id===b.dataset.catalogView),true));
 document.querySelectorAll('[data-catalog-open]').forEach(b=>b.onclick=()=>openCatalogEditor(catalogEntries().find(e=>e.id===b.dataset.catalogOpen)));
 document.querySelectorAll('[data-catalog-delete]').forEach(b=>b.onclick=()=>{const entry=catalogEntries().find(e=>e.id===b.dataset.catalogDelete);if(vocabularyReferenceCount(entry.id))return;openDialog('删除词条',`<p>确认删除 ${esc(catalogName(entry))}？</p>`,'<button class="btn" data-close>取消</button><button class="btn danger" id="catalog-confirm-delete">删除</button>');$('#catalog-confirm-delete').onclick=()=>{if(vocabularyReferenceCount(entry.id)){toast('词条已被引用，不能删除');return}if(commitWorkspace(d=>{d.vocabularyCatalogDeleted||=[];d.vocabularyCatalogDeleted.push(entry.id)})){closeDialog();renderVocabulary()}}});
 $('#catalog-new').onclick=()=>{const id=String(Math.max(90200,...VocabularyCatalog.entries.map(e=>Number(e.id)),...Object.keys(data.vocabularyCatalogExtra||{}).map(Number),...(data.vocabularyCatalogDeleted||[]).map(Number))+1),type=vocabularyCatalogTab;openCatalogEditor({id,word:id,entryType:type,chunkType:type==='chunk'?'短语动词':undefined,words:[{A:id,row:'new-'+id,displayWord:'',...(type==='chunk'?{chunkType:'短语动词'}:{E:'暂无词频'})}],positions:[],meanings:[],fresh:true})};
};
function openCatalogEditor(entry,readOnly=false){
 if(!readOnly&&!catalogHasPermission(entry.fresh?1:2)){toast('没有相应的新增或编辑权限');return}
 const frame=document.createElement('iframe');frame.className='vocabulary-editor-frame';frame.setAttribute('aria-label',(readOnly?'查看词条 ':'修改词条 ')+catalogName(entry));frame.src='examples/present-editor/index.html?entry='+encodeURIComponent(entry.id)+(readOnly?'&mode=view':'')+(entry.fresh?'&fresh=1&kind='+entry.entryType:'');
 const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.body.append(frame);
 function close(){window.removeEventListener('message',receive);frame.remove();document.body.style.overflow=previousOverflow;renderVocabulary()}
 frame.onload=()=>frame.contentWindow.postMessage({type:'vocabulary:init',entryId:entry.id,model:catalogModel(entry),unsaved:!!entry.fresh&&!data.vocabularyCatalogExtra?.[entry.id],audit:catalogAudit(entry),pending:catalogPending(entry),canReview:!readOnly&&catalogCanReview(entry),chunkUsages:catalogChunkUsages(),chunkEntries:catalogEntries().filter(e=>e.entryType==='chunk').map(e=>{const m=catalogModel(e);return {id:e.id,word:m.words[0].displayWord||e.word,meaning:m.meanings.map(x=>x.O||x.AH||'').filter(Boolean).join('；'),chunkType:m.words[0].chunkType,expressionLevel:m.words[0].expressionLevel,meanings:m.meanings}}),guidanceWords:catalogEntries().flatMap(e=>catalogModel(e).words)},'*');
 function receive(event){if(event.source!==frame.contentWindow||event.data?.entryId!==entry.id)return;const msg=event.data;
 if(msg.type==='vocabulary:close'){close();return}
 if(msg.type==='vocabulary:audio-select'&&!readOnly){
 openVocabularyAudioLibrary(item=>{if(frame.isConnected)frame.contentWindow.postMessage({type:'vocabulary:audio-selected',entryId:entry.id,requestId:msg.requestId,item:{name:item.name,assetId:item.assetId||'',data:item.inlineData||''}},'*')},msg.current||'',msg.wordAudio||[]);return;
}
if(msg.type==='vocabulary:audio-play'){
 const item=vocabularyAudioLibrary().find(a=>a.name===msg.name);
 if(item)vocabularyAudioBlob(item).then(blob=>{if(frame.isConnected)frame.contentWindow.postMessage({type:'vocabulary:audio-blob',entryId:entry.id,blob},'*')}).catch(()=>{if(frame.isConnected)frame.contentWindow.postMessage({type:'vocabulary:audio-blob',entryId:entry.id,blob:null},'*')});
 else frame.contentWindow.postMessage({type:'vocabulary:audio-blob',entryId:entry.id,blob:null},'*');
 return;
}
if(readOnly||msg.type!=='vocabulary:save')return;
 if(!catalogHasPermission(entry.fresh?1:2)){frame.contentWindow.postMessage({type:'vocabulary:error',entryId:entry.id,message:'没有保存权限'},'*');return}
 if(msg.approve&&!catalogCanReview(entry)){frame.contentWindow.postMessage({type:'vocabulary:error',entryId:entry.id},'*');return}
 const m=msg.model;if(!m?.words?.[0]?.displayWord?.trim()||!Array.isArray(m.meanings)||!Array.isArray(m.positions)){frame.contentWindow.postMessage({type:'vocabulary:error',entryId:entry.id},'*');return}
 if(entry.entryType==='chunk'){
 const allowVerb=m.words[0].chunkType==='短语动词';
 m.positions=m.positions.filter(p=>p.C===''||(allowVerb&&p.C==='phr v')).map(p=>({A:entry.word,C:p.C,row:p.row}));
 if(!m.positions.some(p=>p.C===''))m.positions.unshift({A:entry.word,C:'',row:'chunk-empty'});
 for(const meaning of m.meanings)if(!allowVerb||meaning.I!=='phr v')meaning.I='';
 delete m.words[0].L;delete m.words[0]._audio;
 }
 if(entry.entryType==='word'&&(!m.positions.length||m.positions.some(p=>['D','E','F','G'].some(k=>!String(p[k]??'').trim())))){frame.contentWindow.postMessage({type:'vocabulary:error',entryId:entry.id},'*');toast('请填写各词性的英美音标和发音音频');return}
 let nextMeaning=Math.max(Number(vocabularyNextId('meanings')),Number(catalogMeaningId(data.vocabularyMeaningNext))||10000);for(const meaning of m.meanings){if(meaning.meaningId)meaning.meaningId=catalogMeaningId(meaning.meaningId);else{if(nextMeaning>99999){toast('五位释义 ID 已用尽');return false}meaning.meaningId=String(nextMeaning++);}}
 const audit={actor:bookFlowActor(),at:new Date().toISOString()};
 const ok=commitWorkspace(d=>{d.vocabularyCatalogReview||={};const previous=d.vocabularyCatalogReview[entry.id];const isNew=entry.fresh&&!d.vocabularyCatalogExtra?.[entry.id];if(isNew&&!catalogHasPermission(2))d.vocabularyCatalogReview[entry.id]={origin:'external',status:'pending',creatorId:catalogMember()?.id,createdAt:audit.at};else if(['listening','external'].includes(previous?.origin)&&!catalogHasPermission(2))previous.status='pending';if(msg.approve)d.vocabularyCatalogReview[entry.id]={...d.vocabularyCatalogReview[entry.id],status:'approved',reviewerId:catalogMember()?.id,reviewedBy:audit.actor,reviewedAt:audit.at};d.vocabularyMeaningNext=nextMeaning;d.vocabularyCatalogAudit||={};d.vocabularyCatalogAudit[entry.id]=audit;d.vocabularyCatalogEdits||={};d.vocabularyCatalogEdits[entry.id]=m;if(entry.fresh){d.vocabularyCatalogExtra||={};d.vocabularyCatalogExtra[entry.id]=entry}d.vocabularyEdits||={};for(const kind of ['words','positions','meanings'])d.vocabularyEdits[kind]||={};for(const kind of ['positions','meanings'])for(const key of Object.keys(d.vocabularyEdits[kind]))if(key.startsWith('catalog:'+entry.id+':')||d.vocabularyEdits[kind][key].wordId===entry.id)delete d.vocabularyEdits[kind][key];d.vocabularyEdits.words[entry.id]={id:entry.id,word:m.words[0].displayWord,entryType:entry.entryType};for(const p of m.positions)d.vocabularyEdits.positions['catalog:'+entry.id+':'+p.row]={id:'catalog:'+entry.id+':'+p.row,wordId:entry.id,word:m.words[0].displayWord,label:p.C,ukIPA:p.D,usIPA:p.F};for(const meaning of m.meanings){const p=m.positions.find(p=>p.C===meaning.I);const id=meaning.meaningId;d.vocabularyEdits.meanings[id]={id,wordId:entry.id,word:m.words[0].displayWord,posId:p?'catalog:'+entry.id+':'+p.row:'',posLabel:meaning.I,chinese:meaning.O,english:meaning.Y,chunk:meaning.AG,chunkChinese:meaning.AH}}});
 frame.contentWindow.postMessage({type:ok?'vocabulary:saved':'vocabulary:error',entryId:entry.id,pending:catalogPending(entry),canReview:!readOnly&&catalogCanReview(entry),audit:ok?audit:null,model:ok?m:null},'*');
 }
 window.addEventListener('message',receive);
}

function bindCatalogStatusFilter(){
 const heading=document.querySelector('.vocabulary-catalog-list th:nth-last-child(3)');
 const filters=catalogStatusFilters[vocabularyCatalogTab],labels=vocabularyCatalogTab==='usage'?['释义']:vocabularyCatalogTab==='chunk'?['释义','词块用法']:['基础属性','音标音频','释义','词块'];
 const count=labels.filter(label=>filters[label]).length;
 heading.innerHTML=`<div class="catalog-status-heading"><span>状态</span><button type="button" id="catalog-status-filter" class="catalog-filter-button ${count?'active':''}" aria-label="筛选状态${count?'，已设置 '+count+' 项':''}" aria-expanded="false"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 4h18l-7 8v7l-4 2v-9z"/></svg></button></div>`;
 const panel=document.createElement('div');panel.id='catalog-status-panel';panel.className='catalog-status-panel';panel.setAttribute('popover','auto');
 panel.innerHTML=`<form id="catalog-status-form"><fieldset><legend>状态</legend><label class="catalog-review-option"><input type="checkbox" id="catalog-status-all" ${count?'':'checked'}><span>全部</span></label>${labels.map(label=>`<label class="catalog-review-option"><input type="checkbox" data-status-section="${label}" value="未填写" ${filters[label]==='未填写'?'checked':''}><span>${label}未完成</span></label>`).join('')}</fieldset><div class="catalog-filter-actions"><button type="button" class="btn" id="catalog-status-reset">重置</button><button class="btn primary" type="submit">确定</button></div></form>`;
 heading.append(panel);
 const button=$('#catalog-status-filter');
 button.onclick=()=>{
  const rect=button.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(rect.right-320,window.innerWidth-332))+'px';panel.style.top=Math.min(rect.bottom+8,Math.max(12,window.innerHeight-420))+'px';
  panel.togglePopover();button.setAttribute('aria-expanded',String(panel.matches(':popover-open')));
 };
 panel.addEventListener('toggle',event=>button.setAttribute('aria-expanded',String(event.newState==='open')));
 const all=panel.querySelector('#catalog-status-all'),options=[...panel.querySelectorAll('[data-status-section]')];
 all.onchange=()=>{options.forEach(input=>input.checked=false);all.checked=true};
 options.forEach(input=>input.onchange=()=>{all.checked=!options.some(option=>option.checked)});
 $('#catalog-status-form').onsubmit=event=>{event.preventDefault();for(const label of labels)delete filters[label];for(const input of options)if(input.checked)filters[input.dataset.statusSection]='未填写';renderVocabulary()};
 $('#catalog-status-reset').onclick=()=>{catalogStatusFilters[vocabularyCatalogTab]={review:filters.review||''};renderVocabulary()};
}

function bindCatalogReviewFilter(){
 const heading=document.querySelector('.vocabulary-catalog-list th:nth-last-child(2)'),filters=catalogStatusFilters[vocabularyCatalogTab];
 heading.innerHTML=`<div class="catalog-status-heading"><span>待审核</span><button type="button" id="catalog-review-filter" class="catalog-filter-button ${filters.review?'active':''}" aria-label="筛选待审核" aria-expanded="false"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 4h18l-7 8v7l-4 2v-9z"/></svg></button></div><div id="catalog-review-panel" class="catalog-status-panel catalog-review-panel" popover="auto"><form id="catalog-review-form"><fieldset><legend>待审核</legend>${[['','全部'],['pending','待审核']].map(([value,label])=>`<label class="catalog-review-option"><input type="checkbox" name="review" value="${value}" ${(filters.review||'')===value?'checked':''}><span>${label}</span></label>`).join('')}</fieldset><div class="catalog-filter-actions"><button type="button" class="btn" id="catalog-review-reset">重置</button><button type="submit" class="btn primary">确定</button></div></form></div>`;
 const button=$('#catalog-review-filter'),panel=$('#catalog-review-panel');
 button.onclick=()=>{const rect=button.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(rect.right-320,window.innerWidth-332))+'px';panel.style.top=Math.min(rect.bottom+8,Math.max(12,window.innerHeight-240))+'px';panel.togglePopover();button.setAttribute('aria-expanded',String(panel.matches(':popover-open')))};
 panel.addEventListener('toggle',event=>button.setAttribute('aria-expanded',String(event.newState==='open')));
 const all=panel.querySelector('input[value=""]'),pending=panel.querySelector('input[value="pending"]');
 all.onchange=()=>{pending.checked=false;all.checked=true};
 pending.onchange=()=>{all.checked=!pending.checked};
 $('#catalog-review-form').onsubmit=event=>{event.preventDefault();filters.review=pending.checked?'pending':'';renderVocabulary()};
 $('#catalog-review-reset').onclick=()=>{delete filters.review;renderVocabulary()};
}

function catalogChunkUsages(){
 const rows=data.vocabularyChunkUsages||[];
 if(rows.some(item=>!String(item.usageId??'').trim())){
  commitWorkspace(d=>{
   const items=d.vocabularyChunkUsages||[];
   let next=Math.max(0,...items.map(item=>Number(item.usageId)||0))+1;
   for(const item of items)if(!String(item.usageId??'').trim())item.usageId=String(next++);
  });
 }
 return data.vocabularyChunkUsages||[];
}
function chunkUsageReferenced(id){return catalogEntries().some(e=>{const m=catalogModel(e);return [...(m.wordChunks||[]),...m.meanings.flatMap(x=>x.chunks||[])].some(c=>c.id===id)})}
function usageSectionStatus(item){const values=item.meanings?.length?item.meanings.map(m=>m.O):[item.meaning];const complete=values.length>0&&values.every(v=>String(v??'').trim());return [{label:'释义',status:complete?'已填写':'未填写',tone:complete?'is-complete':'needs-content'}]}
function updateCatalogEmptyState(){
 const empty=document.querySelector('.vocabulary-catalog-list tbody .empty');if(!empty)return;
 const filtered=editorialQuery.trim()||Object.values(catalogStatusFilters[vocabularyCatalogTab]||{}).some(Boolean);
 empty.textContent=filtered?'当前筛选条件下暂无数据，请调整筛选条件后重试。':vocabularyCatalogTab==='usage'?'暂无词块用法':vocabularyCatalogTab==='chunk'?'暂无词块':'暂无单词';
 document.querySelector('.vocabulary-catalog-list .catalog-empty')?.remove();
}
function renderChunkUsages(){
 const q=editorialQuery.trim().toLowerCase(),matchedRows=catalogChunkUsages().filter(x=>(x.usageId+' '+x.usage+' '+x.meaning).toLowerCase().includes(q)&&(!catalogStatusFilters.usage.review||catalogPending(x))&&(!catalogStatusFilters.usage['释义']||usageSectionStatus(x)[0].status===catalogStatusFilters.usage['释义']));
 const pagination=catalogPaginate(matchedRows);const rows=pagination.rows;
 $('#page').innerHTML=catalogHeader()+`<section class="panel vocabulary-catalog-list"><div class="toolbar"><form class="catalog-search-form" id="usage-search-form"><input class="input" id="usage-search" aria-label="搜索用法、释义或 ID" placeholder="搜索用法、释义或 ID" value="${esc(editorialQuery)}"><button class="btn primary">搜索</button></form><button class="btn primary" id="usage-new">新增词块用法</button></div>${resourceTable(['词块用法 ID','用法','状态','待审核','操作'],rows.map(x=>[esc(x.usageId||'—'),esc(x.usage),`<span data-usage-status="${esc(x.id)}"></span>`,catalogPending(x)?'<span class="catalog-review-pending">待审核</span>':'<span class="muted">—</span>',`<button class="linkbtn" data-usage-view="${esc(x.id)}">查看</button><button class="linkbtn" data-usage-edit="${esc(x.id)}">修改词条</button><button class="linkbtn resource-danger" data-usage-delete="${esc(x.id)}" ${chunkUsageReferenced(x.id)?'disabled':''}>删除</button>`]))}${rows.length?'':'<p class="muted catalog-empty">暂无词块用法</p>'}${pagination.html}</section>`;
 document.querySelectorAll('[data-usage-status]').forEach(host=>BookUI.renderVocabularyStatus(host,usageSectionStatus(rows.find(x=>x.id===host.dataset.usageStatus))));
 updateCatalogEmptyState();bindCatalogStatusFilter();bindCatalogReviewFilter();
 document.querySelectorAll('[data-usage-view]').forEach(b=>b.onclick=()=>openChunkUsage(catalogChunkUsages().find(x=>x.id===b.dataset.usageView),true));
 bindCatalogPagination();bindCatalogTabs();$('#usage-search-form').onsubmit=e=>{e.preventDefault();editorialQuery=$('#usage-search').value;renderChunkUsages()};$('#usage-new').onclick=()=>openChunkUsage();
 document.querySelectorAll('[data-usage-edit]').forEach(b=>b.onclick=()=>openChunkUsage(catalogChunkUsages().find(x=>x.id===b.dataset.usageEdit)));
 document.querySelectorAll('[data-usage-delete]').forEach(b=>b.onclick=()=>{const id=b.dataset.usageDelete;if(chunkUsageReferenced(id))return;openDialog('删除词块用法','<p>确认删除此词块用法？</p>','<button class="btn" data-close>取消</button><button class="btn danger" id="usage-delete-confirm">删除</button>');$('#usage-delete-confirm').onclick=()=>{if(chunkUsageReferenced(id))return;if(commitWorkspace(d=>{d.vocabularyChunkUsages=(d.vocabularyChunkUsages||[]).filter(x=>x.id!==id)})){closeDialog();renderChunkUsages()}}});
}
function openChunkUsage(item,readOnly=false){
 if(!readOnly&&!catalogHasPermission(item?2:1)){toast('没有相应的新增或编辑权限');return}
 const id=item?.id||'usage-'+crypto.randomUUID();
 const model={word:id,words:[{A:id,row:'usage-word',displayWord:item?.usage||''}],positions:[],usageId:item?.usageId||'',meanings:(item?.meanings||[{O:item?.meaning||''}]).map((m,i)=>({...m,B:id,I:'',row:m.row||'usage-meaning-'+i,examples:[],chunks:[]})),wordAttributesRevision:1};
 const frame=document.createElement('iframe');frame.className='vocabulary-editor-frame';frame.setAttribute('aria-label',readOnly?'查看词块用法':item?'编辑词块用法':'新增词块用法');frame.src='examples/present-editor/index.html?entry='+encodeURIComponent(id)+'&fresh=1&kind=usage'+(readOnly?'&mode=view':'');
 const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.body.append(frame);
 function close(){window.removeEventListener('message',receive);frame.remove();document.body.style.overflow=previousOverflow;renderChunkUsages()}
 frame.onload=()=>frame.contentWindow.postMessage({type:'vocabulary:init',entryId:id,model,unsaved:!item?.usageId,pending:catalogPending({id}),canReview:!readOnly&&catalogCanReview({id}),audit:item?.audit||null},'*');
 function receive(event){if(event.source!==frame.contentWindow||event.data?.entryId!==id)return;const msg=event.data;
 if(msg.type==='vocabulary:close'){close();return}if(readOnly||msg.type!=='vocabulary:save')return;
 if(!catalogHasPermission(item?2:1)){frame.contentWindow.postMessage({type:'vocabulary:error',entryId:id,message:'没有保存权限'},'*');return}
 if(msg.approve&&!catalogCanReview({id})){frame.contentWindow.postMessage({type:'vocabulary:error',entryId:id},'*');return}
 const usage=String(msg.model?.words?.[0]?.displayWord||'').trim(),meanings=(msg.model?.meanings||[]).map(m=>({...m,O:String(m.O||'').trim()})),meaning=meanings.map(m=>m.O).join('；');
 const error=!usage||!meanings.length||meanings.some(m=>!m.O)?'请填写用法和释义':catalogChunkUsages().some(x=>x.id!==id&&x.usage===usage&&x.meaning===meaning)?'该用法和释义已存在':'';
 if(error){frame.contentWindow.postMessage({type:'vocabulary:error',entryId:id,message:error},'*');return}
 const existing=catalogChunkUsages().find(x=>x.id===id),usageId=existing?.usageId||String(Math.max(0,...catalogChunkUsages().map(x=>Number(x.usageId)||0))+1);
 let nextMeaning=Math.max(Number(vocabularyNextId('meanings')),Number(catalogMeaningId(data.vocabularyMeaningNext))||10000);
 const existingIds=new Set((existing?.meanings||[]).map(m=>m.meaningId).filter(Boolean));
 for(const m of meanings){if(!existingIds.has(m.meaningId)){if(nextMeaning>99999){frame.contentWindow.postMessage({type:'vocabulary:error',entryId:id,message:'五位释义 ID 已用尽'},'*');return}m.meaningId=String(nextMeaning++);}}
 const audit={actor:bookFlowActor(),at:new Date().toISOString()},value={id,usageId,usage,meaning,meanings,audit};
 const ok=commitWorkspace(d=>{d.vocabularyCatalogReview||={};const previous=d.vocabularyCatalogReview[id];if(!existing&&!catalogHasPermission(2))d.vocabularyCatalogReview[id]={origin:'external',status:'pending',creatorId:catalogMember()?.id,createdAt:audit.at};else if(['listening','external'].includes(previous?.origin)&&!catalogHasPermission(2))previous.status='pending';if(msg.approve)d.vocabularyCatalogReview[id]={...previous,status:'approved',reviewerId:catalogMember()?.id,reviewedBy:audit.actor,reviewedAt:audit.at};d.vocabularyMeaningNext=nextMeaning;d.vocabularyChunkUsages||=[];const index=d.vocabularyChunkUsages.findIndex(x=>x.id===id);if(index<0)d.vocabularyChunkUsages.push(value);else d.vocabularyChunkUsages[index]=value});
 frame.contentWindow.postMessage({type:ok?'vocabulary:saved':'vocabulary:error',entryId:id,pending:catalogPending({id}),canReview:!readOnly&&catalogCanReview({id}),model:{...msg.model,usageId,meanings},audit:ok?audit:null},'*');
 }
 window.addEventListener('message',receive);
}

const catalogPagination={word:{page:1,size:10},chunk:{page:1,size:10},usage:{page:1,size:10}};
function catalogPaginate(items){
 const state=catalogPagination[vocabularyCatalogTab],signature=JSON.stringify([editorialQuery,catalogStatusFilters[vocabularyCatalogTab]||{}]);
 if(state.signature!==signature){state.page=1;state.signature=signature}
 const pages=Math.max(1,Math.ceil(items.length/state.size));state.page=Math.max(1,Math.min(state.page,pages));
 return {rows:items.slice((state.page-1)*state.size,state.page*state.size),html:`<div class="catalog-pagination"><span>共 ${items.length} 条</span><label>每页 <select id="catalog-page-size" aria-label="每页条数">${[10,20,50].map(n=>`<option value="${n}" ${n===state.size?'selected':''}>${n} 条</option>`).join('')}</select></label><button class="btn" data-catalog-page="${state.page-1}" ${state.page===1?'disabled':''}>上一页</button><span aria-live="polite">第 ${state.page} / ${pages} 页</span><button class="btn" data-catalog-page="${state.page+1}" ${state.page===pages?'disabled':''}>下一页</button></div>`};
}
function bindCatalogPagination(){
 const state=catalogPagination[vocabularyCatalogTab];
 $('#catalog-page-size').onchange=e=>{const size=Number(e.target.value);if(![10,20,50].includes(size))return;state.size=size;state.page=1;renderVocabulary()};
 document.querySelectorAll('[data-catalog-page]').forEach(b=>b.onclick=()=>{state.page=Number(b.dataset.catalogPage);renderVocabulary()});
}

function exportBasicVocabulary(){
 if(!catalogHasPermission(7)){toast('没有导出权限');return}
 const entries=catalogEntries().map(entry=>({id:entry.id,entryType:entry.entryType,model:catalogModel(entry),review:data.vocabularyCatalogReview?.[entry.id]||null}));
 const payload={exportedAt:new Date().toISOString(),words:entries.filter(e=>e.entryType==='word'),chunks:entries.filter(e=>e.entryType==='chunk'),chunkUsages:catalogChunkUsages()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='基础词库.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
