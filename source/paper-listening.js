'use strict';
// materialIds is a compatibility projection for existing book/recording views.
// The linked suite owns the paper's listening content.
function syncPaperListening(state){
 const suites=resourceStore(state).suites;
 for(const p of Object.values(bankData(state).papers||{})){
  if(!p.listeningSuiteId&&p.materialIds?.length){
   const id=resourceNextId('suites',state);
   suites[id]={id,name:p.year+' '+p.source+'·听力',materialIds:[...p.materialIds]};
   p.listeningSuiteId=id;
  }
  p.materialIds=[...(suites[p.listeningSuiteId]?.materialIds||[])];
  p.sections ||= ['听力','阅读理解','七选五','完形填空','语法填空','写作'].map((type,i)=>({id:'section-'+i,type,name:type,references:[]}));
  p.sections=['听力','阅读理解','七选五','完形填空','语法填空','写作'].map((type,i)=>{const matches=p.sections.filter(section=>section.type===type);return {...(matches[0]||{id:'section-'+i,type,name:type}),references:[...new Set(matches.flatMap(section=>section.references||[]))]}});
 }
}
const commitBeforePaperListening=commitWorkspace;
commitWorkspace=function(change){return commitBeforePaperListening(d=>{change(d);syncPaperListening(d)})};
commitWorkspace(()=>{});
const usesBeforePaperListening=resourceUses;
resourceUses=function(kind,id,state=data){const rows=usesBeforePaperListening(kind,id,state);if(kind==='suites')for(const p of Object.values(bankData(state).papers||{}))if(p.listeningSuiteId===id)rows.push(p.year+' '+p.source+' / 听力');return rows};
const referencesBeforePaperListening=resourceReferenceRows;
resourceReferenceRows=function(kind,id){const rows=referencesBeforePaperListening(kind,id);if(kind==='suites'&&!data.gaokaoBookId)for(const p of Object.values(bankData().papers||{}))if(p.listeningSuiteId===id)rows.push({key:'paper/'+p.id,paperId:p.id,type:'高考真题卷',name:p.year+' '+p.source,relation:'听力'});return rows};
const navigateBeforePaperListening=resourceNavigateReference;
resourceNavigateReference=function(row){if(row.paperId){leaveSuiteEditor(()=>resourceOpen('papers',row.paperId,'edit'));return}navigateBeforePaperListening(row)};
function batchIntoSuite(suite,category='普通题'){
 if(!suiteStructureEditable(suite.id)){toast('引用方已进入后续阶段，不能新增题目');return}
 openListeningCreate(true,null,{category,onSaved:ids=>{if(!suiteStructureEditable(suite.id))return;suite.materialIds=[...new Set([...suite.materialIds,...ids])];render()}});
}
const suiteContentsBeforeBatch=renderListeningSuiteContents;
renderListeningSuiteContents=function(suite,host){
 suiteContentsBeforeBatch(suite,host);
 const add=$('#suite-add-material');add.textContent='从听力题库选题';
 if(!$('#suite-batch-add'))add.insertAdjacentHTML('afterend','<button class="btn" id="suite-batch-add">批量录入整套题</button>');
 $('#suite-batch-add').onclick=()=>batchIntoSuite(suite,Object.values(bankData().papers||{}).some(p=>p.listeningSuiteId===suite.id)?'高考真题':'普通题');
 if(!suiteStructureEditable(suite.id)){add.disabled=true;$('#suite-batch-add').disabled=true;host.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('解除引用'))b.disabled=true})}
};
const paperSectionTypes=['听力','阅读理解','七选五','完形填空','语法填空','写作'];
const collapsedPaperSections=new Set();
function paperQuestionSource(type){return data.paperQuestionBanks?.[type]||{}}
function paperSectionsMarkup(p,readOnly){
 return `<section class="panel paper-composition-table"><table><thead><tr><th>题型</th><th>引用内容</th></tr></thead><tbody>${p.sections.map(section=>`<tr><th scope="row">${esc(section.type)}</th><td ${section.type==='听力'?'id="paper-listening-content"':`data-paper-content="${esc(section.id)}"`}></td></tr>`).join('')}</tbody></table></section>`;
}
function bindPaperSections(p,readOnly){
 const update=fn=>{if(commitWorkspace(d=>fn(bankData(d).papers[p.id])))render()};
 document.querySelectorAll('[data-paper-toggle]').forEach(button=>button.onclick=()=>{const key=p.id+'/'+button.dataset.paperToggle;if(collapsedPaperSections.has(key))collapsedPaperSections.delete(key);else collapsedPaperSections.add(key);render()});
 for(const section of p.sections){
  if(section.type==='听力')continue;
  const host=[...document.querySelectorAll('[data-paper-content]')].find(el=>el.dataset.paperContent===section.id);
  const source=paperQuestionSource(section.type),refs=section.references||[];
  host.innerHTML=(readOnly?'':`<button class="btn" data-paper-pick="${esc(section.id)}">添加${esc(section.type)}题</button>`)+(refs.length?refs.map(id=>{const q=source[id];return `<div class="paper-reference-row"><span class="muted">ID：${esc(id)}</span><strong>${esc(q?.name||'来源内容不存在')}</strong><span>${q?(q.questions?.length||1)+' 道小题':'—'}</span><span class="paper-reference-actions"><button class="linkbtn" data-paper-question="${esc(id)}" ${q?'':'disabled'}>查看</button>${readOnly?'':`<button class="linkbtn resource-danger" data-paper-unlink="${esc(id)}">解除引用</button>`}</span></div>`}).join(''):'<span class="muted paper-no-reference">暂无内容</span>');
  host.querySelectorAll('[data-paper-question]').forEach(button=>button.onclick=()=>{const q=source[button.dataset.paperQuestion];openDialog(q.name||section.type,`<div style="white-space:pre-wrap">${esc(q.content||q.text||'')}${(q.questions||[]).map((item,i)=>`<p>${i+1}. ${esc(item.text||'')}</p>`).join('')}</div>`,'<button class="btn" data-close>关闭</button>')});
  if(readOnly)continue;
  host.querySelector('[data-paper-pick]').onclick=()=>resourcePick('引用'+section.type+'题',Object.values(source).map(q=>({id:q.id,name:q.name||q.text||q.id})),refs,ids=>{if(ids.some(id=>!paperQuestionSource(section.type)[id]))return false;update(paper=>{paper.sections.find(s=>s.id===section.id).references=ids});return true});
  host.querySelectorAll('[data-paper-unlink]').forEach(button=>button.onclick=()=>update(paper=>{const item=paper.sections.find(s=>s.id===section.id);item.references=item.references.filter(id=>id!==button.dataset.paperUnlink)}));
 }
 if(readOnly)return;

}
const detailBeforePaperListening=renderResourceDetail;
renderResourceDetail=function(entry){
 if(entry.kind!=='papers')return detailBeforePaperListening(entry);
 const p=bankData().papers[entry.id];if(!p){resourceBack();return}
 const suite=resourceCollection('suites')[p.listeningSuiteId],readOnly=entry.mode==='view';
 $('#page').innerHTML=workspaceHead(resourceName('papers',p.id),'<button class="btn" id="paper-back">'+esc(resourceBackLabel())+'</button>')+paperSectionsMarkup(p,readOnly);
 bindResourceTitle('papers',p.id,entry.mode||'edit');
 $('#paper-back').onclick=()=>{resourceTrail.pop();render()};
 bindPaperSections(p,readOnly);
 const host=$('#paper-listening-content');if(!host)return;
 if(suite){
  host.innerHTML='<div class="paper-reference-row"><span class="muted">套题 ID：'+esc(suite.id)+'</span><strong>'+esc(suite.name)+'</strong><span>'+suite.materialIds.length+' 篇录音稿 · '+suite.materialIds.reduce((n,id)=>n+bankQuestions(id).length,0)+' 道小题</span><span class="paper-reference-actions"><button class="linkbtn" id="paper-view-suite">查看</button>'+(readOnly?'':'<button class="linkbtn" id="paper-edit-suite">编辑</button><button class="linkbtn resource-danger" id="paper-unlink-suite">解除引用</button>')+'</span></div>';
  $('#paper-view-suite').onclick=()=>openWholeSuiteEditor({id:suite.id},undefined,true);
  if(!readOnly){
   $('#paper-edit-suite').onclick=()=>openWholeSuiteEditor({id:suite.id});
   $('#paper-unlink-suite').onclick=()=>{openDialog('解除引用套题','<p>解除此真题卷对听力套题的引用？套题和试题会保留。</p>','<button class="btn" data-close>取消</button><button class="btn danger" id="paper-unlink-confirm">解除引用</button>');$('#paper-unlink-confirm').onclick=()=>{if(commitWorkspace(d=>{const paper=bankData(d).papers[p.id];paper.listeningSuiteId='';paper.materialIds=[]})){closeDialog();render()}}};
  }
 }else{
  host.innerHTML=(readOnly?'':'<button class="btn" id="paper-use-suite">添加听力套题</button>')+'<span class="muted paper-no-reference">暂无内容</span>';
  if(!readOnly)$('#paper-use-suite').onclick=()=>resourcePick('引用听力套题',Object.values(resourceCollection('suites')).map(s=>({id:s.id,name:s.name})),[],ids=>{if(ids.length!==1){toast('请选择一个听力套题');return false}return resourceCommit(d=>{if(!resourceCollection('suites',d)[ids[0]])throw Error('套题已不存在');bankData(d).papers[p.id].listeningSuiteId=ids[0]})},false);
 }
};
render();
