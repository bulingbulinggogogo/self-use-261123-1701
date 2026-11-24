 'use strict';
function listeningQuestionLimits(type){return type==='短对话'?{min:1,max:1}:['长对话','独白'].includes(type)?{min:2,max:4}:null}
function listeningQuestionCountError(draft){const type=draft.questionType||draft.questions[0]?.questionType,limits=listeningQuestionLimits(type);return limits&&(draft.questions.length<limits.min||draft.questions.length>limits.max)?(type==='短对话'?'短对话只能有 1 道小题':type+'必须有 2–4 道小题'):''}

// Editing an existing recording is independent of the batch-import workflow.
function createListeningEditWorkspace(api){
 const {modal,getDraft,render,first,second,fourth,batchCloze,bindAudio,bindClues,bindCloze,error,save,stash}=api;
 let view=api.initialStage===6?'cloze':api.initialStage===5?'clues':['analysis','clues','cloze'].includes(api.initialView)?api.initialView:'content';
 let readOnly=!!api.readOnly;
 let baseline=null;
 let selection=null,note=null,repositionId='',wordQuery='';
 let fieldScopes=[];
 let closeSelectionMenu=()=>{};
 let activeNoteCategory='',selectedNoteId='';

 let sourceWidth=40;
 try{sourceWidth=Number(localStorage.getItem('listening-source-width'))||40}catch{}
 const categories=['词汇','语音','实用表达','语法','微技能','话题词汇','百科知识'];
 const d=()=>getDraft();
 const area=(value,attrs)=>`<textarea class="input" rows="2" ${attrs}>${esc(value||'')}</textarea>`;
 function sources(){
  const r=d();return [...(r.segments.length?r.segments.map((s,i)=>({key:'segment:'+s.id,label:'录音稿 · 第 '+(i+1)+' 句',text:s.text||'',object:s})): [{key:'transcript',label:'录音稿',text:r.text||'',object:r}]),...r.questions.flatMap((q,i)=>[{key:'question:'+q.id,label:'小题 '+(i+1)+' · 题干',text:q.text||'',questionId:q.id,object:q},...q.options.map(o=>({key:'option:'+q.id+':'+o.key,label:'小题 '+(i+1)+' · 选项 '+o.key,text:o.text||'',questionId:q.id,object:o}))])];
 }
 function reconcile(){
  const all=sources();for(const n of d().teachingNotes||[]){if(n.groupNote){n.needsReview=n.scope==='question'&&!d().questions.some(q=>q.id===n.targetQuestionId);continue}const source=all.find(s=>s.key===n.sourceKey);if(!source||source.text!==n.sourceText)n.needsReview=true;}
 }
 function markSourceChange(obj,old){
  if(old===obj.text)return;
  if(obj.translation)obj.translationNeedsReview=true;
  if(obj.clozeBlanks?.length){obj.clozeReview=[...(obj.clozeReview||[]),...obj.clozeBlanks];obj.clozeBlanks=[];}
  for(const q of d().questions){if(q===obj||q.options.includes(obj))q.clueNeedsReview=true;for(const c of q.clues||[])if(c.segmentId===obj.id)c.needsReview=true;}
 }
 function collect(){
  if(readOnly)return;
  if(view!=='content'){for(const [root,n] of fieldScopes)collectAnalysisNote(root,n);collectNote();reconcile();return;}
  const r=d();const type=modal.querySelector('#lc-edit-record-type');if(type){r.questionType=type.value;r.questions.forEach(q=>q.questionType=type.value);}const topic=modal.querySelector('#lc-edit-topic');if(topic)r.topics=topic.value;r.topicSecondary=listeningSecondaryValue('topics',r.topics,modal.querySelector('#lc-edit-topic-secondary')?.value);
  const raw=modal.querySelector('#lc-edit-transcript');if(raw&&raw.value!==r.text){const old=r.text;r.text=raw.value;markSourceChange(r,old);}
  modal.querySelectorAll('[data-sentence]').forEach(row=>{const s=r.segments[+row.dataset.sentence],old=s.text;row.querySelectorAll('[data-sfield]').forEach(el=>{if(!['start','end'].includes(el.dataset.sfield))s[el.dataset.sfield]=el.value});markSourceChange(s,old)});
  if(r.segments.length)r.text=r.segments.map(s=>(s.speaker?s.speaker+': ':'')+s.text).join('\n');
  modal.querySelectorAll('[data-question]').forEach(card=>{const q=r.questions[+card.dataset.question],old=q.text;card.querySelectorAll('[data-qfield]').forEach(el=>q[el.dataset.qfield]=el.value);q.examPointSecondary=listeningSecondaryValue('examPoints',q.examPoints,q.examPointSecondary);markSourceChange(q,old);card.querySelectorAll('[data-option]').forEach(el=>{const o=q.options[+el.dataset.option],before=o.text;o.text=el.value;markSourceChange(o,before)});card.querySelectorAll('[data-option-translation]').forEach(el=>q.options[+el.dataset.optionTranslation].translation=el.value)});
  reconcile();
 }
 function collectNote(){if(!note)return;if(typeof collectAnalysisNote==='function')collectAnalysisNote(modal,note);const content=modal.querySelector('#lc-note-content');if(content)note.content=content.value;const target=modal.querySelector('#lc-note-target');if(target)note.targetQuestionId=target.value;}
 function contentHtml(){
  if(d().audioName==='内置示例音频.aac')d().audioName='录音稿_'+(d().materialId||'示例')+'.aac';
  const temp=document.createElement('template');temp.innerHTML=first();
  temp.content.querySelectorAll('[data-question]').forEach(card=>{
   card.querySelector('thead')?.remove();
   const q=d().questions[+card.dataset.question];
   const limits=listeningQuestionLimits(d().questionType||q.questionType);
   if(!readOnly&&(api.canEditQuestions?api.canEditQuestions():bookStructureEditable(api.revisionBookId)))card.querySelector('.lc-question-heading').insertAdjacentHTML('beforeend',`<button type="button" class="linkbtn resource-danger lc-delete-question" data-delete-question="${card.dataset.question}" aria-label="删除小题 ${Number(card.dataset.question)+1}" ${limits&&(limits.max===1||d().questions.length<=limits.min)?'disabled':''}>${icon('trash')}</button>`);
   const body=card.querySelector('tbody');
   const stemCell=document.createElement('td');stemCell.innerHTML=area(q.translation,'data-qfield="translation" aria-label="题干翻译" placeholder="题干翻译"');body.querySelector('tr:first-child td').after(stemCell);
   card.querySelector('colgroup col:last-child').insertAdjacentHTML('beforebegin','<col>');
   card.querySelectorAll('[data-option]').forEach(el=>{const index=+el.dataset.option;const cell=document.createElement('td');cell.innerHTML=area(q.options[index].translation,`data-option-translation="${index}" aria-label="选项 ${q.options[index].key} 翻译" placeholder="选项翻译"`);el.closest('td').after(cell)});
   const analysis=card.querySelector('.lc-analysis');const row=document.createElement('tr');row.innerHTML='<th>答案解析</th><td colspan="3"></td>';row.querySelector('td').append(analysis.querySelector('textarea'));body.append(row);analysis.remove();
   card.querySelectorAll('textarea').forEach(el=>el.rows=1);
   card.querySelectorAll('[required]').forEach(el=>el.removeAttribute('required'));
  });
  temp.content.querySelectorAll('[data-question]').forEach(card=>{const q=d().questions[+card.dataset.question];if(q.translationNeedsReview)card.querySelector('[data-qfield=translation]').insertAdjacentHTML('afterend','<button type="button" class="linkbtn" data-review-question-translation="stem">确认题干译文</button>');card.querySelectorAll('[data-option-translation]').forEach(el=>{if(q.options[+el.dataset.optionTranslation].translationNeedsReview)el.insertAdjacentHTML('afterend','<button type="button" class="linkbtn" data-review-question-translation="'+el.dataset.optionTranslation+'">确认选项译文</button>')})});
  const questions=[...temp.content.querySelectorAll('[data-question]')].map(el=>el.outerHTML).join('');
  const audio=document.createElement('template');audio.innerHTML=second();
  audio.content.querySelector('.lc-audio-step h3').remove();
  const drop=audio.content.querySelector('#lc-audio-drop');drop.classList.add('lc-compact-audio');
  audio.content.querySelector('#lc-upload').textContent=api.getAudioUrl()?'更换音频':'选择音频';
  audio.content.querySelector('#lc-upload').className='btn';
  const player=audio.content.querySelector('#lc-player');if(player){player.removeAttribute('controls');player.hidden=true;player.setAttribute('preload','metadata');}

  audio.content.querySelector('.lc-align-step').remove();
  if(!api.hasAudioBuffer()){const wave=audio.content.querySelector('.lc-wave');if(wave){wave.classList.add('lc-wave-status');wave.setAttribute('role','status');wave.textContent=api.audioWaveStatus();}}
  audio.content.querySelector('.lc-audio-step:last-child h3').remove();
  const sentenceTable=audio.content.querySelector('.lc-sentence-table');
  if(sentenceTable){sentenceTable.classList.add('lc-inline-segment-table');sentenceTable.querySelector('colgroup').insertAdjacentHTML('beforeend','<col>');sentenceTable.querySelector('thead')?.remove();}
  audio.content.querySelectorAll('[data-sentence]').forEach(row=>{const s=d().segments[+row.dataset.sentence];const cell=document.createElement('td');cell.innerHTML=area(s.translation,'data-sfield="translation" aria-label="分句翻译" placeholder="分句翻译"')+(s.translationNeedsReview?'<button type="button" class="linkbtn" data-edit-review="'+row.dataset.sentence+'">确认译文</button>':'');row.append(cell)});
  if(d().batchError&&!readOnly)audio.content.querySelector('.lc-audio-workflow').insertAdjacentHTML('afterbegin','<div class="lc-batch-failure">'+esc(d().batchError)+'<button type="button" class="btn" id="lc-retry-alignment">重试自动对齐</button></div>');
  const audioControl=drop.outerHTML.replace('<div class="lc-audio-content">','<span class="lc-audio-label">音频文件名</span><div class="lc-audio-content">');drop.remove();
  return `<div class="lc-edit-content"><section class="lc-edit-recording"><div class="lc-recording-card"><div class="lc-recording-meta"><h3 class="lc-recording-title">录音稿 <span class="lc-recording-version">${esc(listeningRevisionLabel(d().materialId,api.revisionBookId,data,d()._revisionVersion||api.revisionVersion))}</span></h3><label class="field"><span><b class="lc-required" aria-hidden="true">*</b> 题型</span><select class="input" id="lc-edit-record-type" aria-required="true" aria-label="录音稿题型">${opts(listeningTagChoices().questionType.map(x=>[x,x]),d().questionType,'请选择题型')}</select></label><label class="field"><span>话题</span>${listeningHierarchySelect('topics',d().topics,d().topicSecondary,'id="lc-edit-topic"','id="lc-edit-topic-secondary"')}</label>${audioControl}</div>${audio.innerHTML}${!d().segments.length?area(d().text,'id="lc-edit-transcript" aria-label="录音稿" placeholder="录音稿正文"'):''}</div></section><section class="lc-edit-questions">${questions||'<p class="muted">--</p>'}</section></div>`;
 }
 function sourceMarkup(source){
  const notes=(d().teachingNotes||[]).filter(n=>n.sourceKey===source.key&&!n.needsReview&&(n.category===activeNoteCategory||n.id===selectedNoteId));
  const cuts=[...new Set([0,source.text.length,...notes.flatMap(n=>[n.start,n.end])])].sort((a,b)=>a-b);
  return cuts.slice(0,-1).map((start,i)=>{const end=cuts[i+1],cover=notes.filter(n=>n.start<=start&&n.end>=end);return cover.length?`<mark class="${cover.some(n=>n.id===selectedNoteId)?'is-current-note':''}" data-note-mark="${esc((cover.find(n=>n.id===selectedNoteId)||cover[0]).id)}">${esc(source.text.slice(start,end))}</mark>`:esc(source.text.slice(start,end))}).join('');
 }
 function analysisHtml(){
  reconcile();const tabs=noteCategoryTabs();const visible=(d().teachingNotes||[]).filter(n=>!n.category||n.category===activeNoteCategory);if(!visible.some(n=>n.id===selectedNoteId))selectedNoteId=visible[0]?.id||'';const all=sources();
  return `<div class="lc-teaching-layout"><div class="lc-analysis-tools"><div class="lc-clue-hint"><span class="lc-clue-hint-icon" aria-hidden="true">i</span><span>${readOnly?'当前为只读模式，可查看解析点拨':repositionId?'请重新拖选原文，再确认新位置':'拖选单词，右键新建点拨或改凸显范围'}</span><span id="lc-selection-text" hidden>${esc(selection?.text||'')}</span></div>${tabs}</div><section class="lc-teaching-sources">${all.map((s,i)=>`${i===0||s.questionId!==all[i-1]?.questionId?`<h3 class="lc-source-group-title">${s.questionId?esc(s.label.split(" · ")[0]):"录音稿"}<span class="lc-source-group-actions">${s.questionId?`<button type="button" class="linkbtn" data-group-note="微技能" data-question-id="${esc(s.questionId)}">+ 微技能</button>`:`<button type="button" class="linkbtn" data-group-note="百科知识">+ 百科知识</button><button type="button" class="linkbtn" data-group-note="话题词汇">+ 话题词汇</button><button type="button" class="linkbtn" data-group-note="微技能">+ 微技能</button>`}</span></h3>`:""}<article class="lc-teaching-source"><span class="lc-source-label">${s.questionId?(s.key.startsWith("option:")?esc(s.object.key):"题干"):listeningSpeakerMarkup(s.object.speaker,all[i-1]?.questionId?undefined:all[i-1]?.object.speaker)}</span><p tabindex="0" data-teaching-source="${i}" class="lc-teaching-text">${sourceMarkup(s)}</p><p class="lc-teaching-translation">${esc(s.object.translation||'暂无翻译')}</p></article>`).join('')}</section><aside class="lc-teaching-editor">${noteHtml()}${continuousNotes()}</aside></div>`;
 }

 function noteCategoryTabs(){
  const counts=new Map(categories.map(c=>[c,(d().teachingNotes||[]).filter(n=>n.category===c).length]));
  const available=categories.filter(c=>counts.get(c));
  if(!available.includes(activeNoteCategory))activeNoteCategory=available[0]||'';
  return `<nav class="lc-note-category-tabs" aria-label="点拨分类" role="tablist">${available.length?available.map(c=>`<button type="button" role="tab" aria-selected="${c===activeNoteCategory}" data-note-category-tab="${c}">${esc(c)}<span>${counts.get(c)}</span></button>`).join(''):'<span class="muted">暂无点拨</span>'}</nav>`;
 }
 function continuousNotes(){
  return `<div class="lc-note-list lc-continuous-notes">${(d().teachingNotes||[]).map((n,i)=>n.category&&n.category!==activeNoteCategory?'':`<article class="lc-continuous-note ${n.id===selectedNoteId?'is-selected-note':''}" data-continuous-note="${i}" data-note-id="${esc(n.id)}"><header><strong>${n.groupNote?'':'凸显：'}${esc(n.title||n.text||n.category||'新点拨')}</strong><span data-note-category-picker data-category-label="${esc([n.category,n.subcategory].filter(Boolean).join(' · ')||'选择分类')}"></span><div class="lc-note-header-actions"><button type="button" class="linkbtn" data-note-preview="${i}" aria-label="预览点拨"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>预览</span></button><button type="button" class="linkbtn" data-note-records="${i}">记录</button>${readOnly?'':`<button type="button" class="linkbtn resource-danger" data-delete-note="${esc(n.id)}" aria-label="删除点拨"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>`}</div></header>${`<div data-continuous-fields>${n.needsReview?'<p class="lc-note-warning">原文已变化，请重新定位点拨 <button type="button" class="linkbtn" data-relocate-note>重新定位</button></p>':''}${analysisNoteFields(n,true)}</div>`}</article>`).join('')}</div>`;
 }
 function bindContinuousNotes(){
  fieldScopes=[];
  modal.querySelectorAll('[data-note-category-tab]').forEach(button=>button.onclick=()=>{collect();activeNoteCategory=button.dataset.noteCategoryTab;render();modal.querySelector('.lc-teaching-editor').scrollTop=0;modal.querySelector('[data-note-category-tab="'+activeNoteCategory+'"]')?.focus({preventScroll:true})});
  modal.querySelectorAll('[data-continuous-note]').forEach(section=>{
   const i=Number(section.dataset.continuousNote),n=d().teachingNotes[i];
   section.querySelectorAll('[data-relocate-note]').forEach(b=>b.onclick=()=>{collect();selectedNoteId=n.id;repositionId=n.id;selection=null;render()});
   section.addEventListener('focusin',()=>selectNote(n.id));section.addEventListener('click',()=>selectNote(n.id));
   BookUI.renderLinkedCascader(section.querySelector('[data-note-category-picker]'),{options:(n.groupNote?[n.category]:['词汇','语音','实用表达','语法','微技能']).map(c=>({value:c,label:c,...(analysisSubcategories[c]?{children:analysisSubcategories[c].map(v=>({value:v,label:v}))}:{})})),value:[n.category,n.subcategory].filter(Boolean),label:'解析分类',disabled:readOnly,onChange:path=>{if(!path.length)return;if(rangeConflict(n,path[0],n.id)){error('该范围与同分类已有点拨重叠，请先改选凸显');return}collect();if(n.category!==path[0])n.mode='';n.category=path[0];n.subcategory=path[1]||'';activeNoteCategory=n.category;selectedNoteId=n.id;render()}});
   const preview=section.querySelector('[data-note-preview]');bindListeningHover(preview,()=>{collect();return showListeningNotePreview(modal,preview,n)});
   const recordTrigger=section.querySelector('[data-note-records]');bindListeningHover(recordTrigger,()=>{collect();return showListeningNoteRecords(modal,d(),n,{anchor:recordTrigger,onReject:readOnly?null:previous=>{const index=d().teachingNotes.findIndex(item=>item.id===n.id);if(index<0)return;if(previous)d().teachingNotes[index]=previous;else d().teachingNotes.splice(index,1);reconcile();render();error(previous?'已恢复上一版，请保存修改':'已移除此新增点拨，请保存修改','success')}})});
   const fields=section.querySelector('[data-continuous-fields]');if(!fields){const footer=document.createElement('footer');footer.className='lc-note-bottom-actions';const group=document.createElement('div');group.className='lc-note-review-actions';recordTrigger.textContent='查看修改记录';group.append(preview,recordTrigger);footer.append(group);section.append(footer);return;}
   const root=listeningFieldScope(fields,'note-'+i);fieldScopes.push([root,n]);
   bindAnalysisFields(root,n,render,collect,error,{readOnly});
   const actions=document.createElement('footer');actions.className='lc-note-bottom-actions';section.append(actions);
   const additions=document.createElement('div');additions.className='lc-note-additions';actions.append(additions);
   const vocabulary=root.querySelector('[data-vocab-add]');
   if(vocabulary){const row=vocabulary.parentElement;additions.append(vocabulary);row.remove();const card=root.querySelector('.an-vocab-card');if(card&&!card.querySelector('[data-selected-word]'))card.remove();}
   const addExplanation=root.querySelector('#an-add-explanation');
   if(addExplanation){addExplanation.textContent='＋ 说明';additions.append(addExplanation);}
   const records=section.querySelector('[data-note-records]');records.textContent='查看修改记录';const reviewActions=document.createElement('div');reviewActions.className='lc-note-review-actions';reviewActions.append(preview,records);actions.append(reviewActions);
   if(repositionId===n.id)drawRangeActions(section,n);


  });
 }
 function rangeConflict(candidate,category,id){return category&&(d().teachingNotes||[]).find(other=>other.id!==id&&!other.groupNote&&other.category===category&&other.sourceKey===candidate.sourceKey&&other.start<candidate.end&&candidate.start<other.end)}
 function drawRangeActions(section,n){
  const actions=section.querySelector('.lc-note-bottom-actions');if(!actions)return;
  const conflict=selection&&rangeConflict(selection,n.category,n.id);
  actions.innerHTML=`<span class="lc-range-label">${selection?'新范围：'+esc(selection.text):'请在左侧拖选新范围'}</span>${selection?`<button type="button" class="btn primary" data-confirm-range ${conflict?'disabled':''}>确定</button>`:''}<button type="button" class="linkbtn" id="lc-cancel-reposition">取消</button>`;
  section.querySelector('.lc-range-error')?.remove();if(conflict)actions.insertAdjacentHTML('afterend','<p class="lc-range-error" role="alert">与同分类已有点拨重叠，请重新拖选。</p>');
  actions.querySelector('#lc-cancel-reposition').onclick=()=>{repositionId='';selection=null;render()};
  actions.querySelector('[data-confirm-range]')?.addEventListener('click',()=>{if(!selection||rangeConflict(selection,n.category,n.id))return;collect();Object.assign(n,selection,{needsReview:false});repositionId='';selection=null;render()});
 }
 function focusSelectedNote(){
  const card=[...modal.querySelectorAll('[data-note-id]')].find(el=>el.dataset.noteId===selectedNoteId);
  card?.scrollIntoView?.({block:'nearest'});
  card?.querySelector('[data-edit-note-category]')?.focus({preventScroll:true});
 }
 function selectNote(id){
  selectedNoteId=id;
  modal.querySelectorAll('[data-continuous-note]').forEach(el=>el.classList.toggle('is-selected-note',el.dataset.noteId===id));
  modal.querySelectorAll('[data-teaching-source]').forEach(el=>{const source=sources()[+el.dataset.teachingSource];el.innerHTML=sourceMarkup(source)});
 }
 function bindSourceLayout(){
  const layout=modal.querySelector('.lc-teaching-layout');if(!layout)return;
  layout.style.setProperty('--source-width',sourceWidth+'%');
  const source=layout.querySelector('.lc-teaching-sources');source.insertAdjacentHTML('afterend','<div class="lc-source-resizer" role="separator" aria-label="调整原文栏宽度" aria-orientation="vertical" tabindex="0"></div>');
  const grip=layout.querySelector('.lc-source-resizer');
  const resize=value=>{sourceWidth=Math.max(25,Math.min(60,value));layout.style.setProperty('--source-width',sourceWidth+'%');grip.setAttribute('aria-valuenow',Math.round(sourceWidth));try{localStorage.setItem('listening-source-width',String(sourceWidth))}catch{}};
  resize(sourceWidth);grip.setAttribute('aria-valuemin','25');grip.setAttribute('aria-valuemax','60');
  grip.onpointerdown=e=>{grip.setPointerCapture?.(e.pointerId);grip.onpointermove=event=>{const rect=layout.getBoundingClientRect();if(rect.width)resize((event.clientX-rect.left)/rect.width*100)};grip.onpointerup=()=>{grip.onpointermove=null};grip.onlostpointercapture=()=>{grip.onpointermove=null}};
  grip.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resize(sourceWidth+(e.key==='ArrowLeft'?-2:2))}};
 }
 function noteHtml(){
  if(!note)return '';
  if(readOnly)return '<section class="lc-note-form">'+analysisNotePreview(note)+'</section>';
  return `<section class="lc-note-form">${note.groupNote?'':`<div class="field lc-note-inline lc-highlight-row"><span>凸显</span><span id="lc-note-highlight" class="lc-highlight-value">${esc(note.text)}</span><button type="button" class="linkbtn" id="lc-reposition-note">重新选取原文</button></div>`}${note.needsReview?'<p class="lc-note-warning">原文已修改，请重新选取。</p>':''}<div class="field lc-note-inline"><span>解析分类</span><div id="an-category-cascade"></div></div>${note.category==='微技能'&&note.scope!=='material'?`<label class="field lc-note-inline"><span>点拨小题</span><select class="input" id="lc-note-target">${opts(d().questions.map((q,i)=>[q.id,'小题 '+(i+1)+' · '+q.text]),note.targetQuestionId||'','请选择小题')}</select></label>`:''}${analysisNoteFields(note)}<div class="row lc-local-actions">${note.id?'<button type="button" class="linkbtn danger" id="lc-delete-note">删除</button>':''}<button type="button" class="btn" id="lc-cancel-note">取消</button><button type="button" class="btn primary" id="lc-save-note">保存点拨</button></div></section>`;
 }

 function bindAnalysis(){
  modal.querySelector('#lc-cancel-reposition')?.addEventListener('click',()=>{repositionId='';selection=null;render()});
  modal.querySelectorAll('[data-group-note]').forEach(button=>button.onclick=()=>{
   if(note){error('请先保存或取消当前点拨');return}
   const questionId=button.dataset.questionId||'',index=d().questions.findIndex(q=>q.id===questionId),label=questionId?'小题 '+(index+1):'录音稿';
   note={groupNote:true,category:button.dataset.groupNote,sourceKey:questionId?'question:'+questionId:'material',sourceLabel:label,sourceText:'',text:label,targetQuestionId:questionId,scope:questionId?'question':'material',content:'',start:0,end:0,needsReview:false};
   note.id='NOTE-'+crypto.randomUUID();note.materialId=d().materialId;d().teachingNotes ||= [];d().teachingNotes.push(note);selectedNoteId=note.id;activeNoteCategory=note.category;note=null;selection=null;repositionId='';wordQuery='';render();focusSelectedNote();
  });
  const capture=el=>{const sel=window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return;const range=sel.getRangeAt(0);if(!el.contains(range.startContainer)||!el.contains(range.endContainer)){error('请在同一句或同一个题干、选项中选取文本');return;}const prefix=document.createRange();prefix.selectNodeContents(el);prefix.setEnd(range.startContainer,range.startOffset);const raw=range.toString(),text=raw.trim();if(!text)return;const start=prefix.toString().length+raw.indexOf(text),source=sources()[+el.dataset.teachingSource];selection={sourceKey:source.key,sourceLabel:source.label,sourceText:source.text,start,end:start+text.length,text,targetQuestionId:source.questionId||''};modal.querySelector('#lc-selection-text').textContent=text;if(repositionId){const target=d().teachingNotes.find(n=>n.id===repositionId);const card=[...modal.querySelectorAll('[data-note-id]')].find(el=>el.dataset.noteId===repositionId);if(target&&card)drawRangeActions(card,target)};};
  modal.querySelectorAll('[data-teaching-source]').forEach(el=>{el.onmouseup=()=>capture(el);el.onkeyup=()=>capture(el);el.oncontextmenu=e=>{
   closeSelectionMenu();if(readOnly)return;const sel=window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return;const range=sel.getRangeAt(0);if(!el.contains(range.startContainer)||!el.contains(range.endContainer)||!range.toString().trim())return;
   capture(el);e.preventDefault();const chosen={...selection};const target=d().teachingNotes.find(n=>n.id===selectedNoteId&&!n.groupNote&&!n.needsReview&&n.sourceKey===chosen.sourceKey&&chosen.start<n.end&&chosen.end>n.start);
   const menu=document.createElement('div');menu.className='lc-selection-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','选中文字操作');
   if(!target)for(const category of ['词汇','语音','语法','微技能']){const add=document.createElement('button');add.type='button';add.setAttribute('role','menuitem');add.dataset.selectionCreate=category;add.className='linkbtn';add.textContent='+ '+category;add.disabled=!!repositionId;menu.append(add);
    add.onclick=()=>{closeSelectionMenu();if(rangeConflict(chosen,category,'')){error('该范围与同分类已有点拨重叠，请重新选择');return}collect();const created={...chosen,id:'NOTE-'+crypto.randomUUID(),materialId:d().materialId,scope:'fragment',category,content:'',wordId:'',needsReview:false};d().teachingNotes ||= [];d().teachingNotes.push(created);selectedNoteId=created.id;activeNoteCategory=category;wordQuery=chosen.text;selection=null;window.getSelection()?.removeAllRanges();render();focusSelectedNote()};
   }
   if(target){const change=document.createElement('button');change.type='button';change.setAttribute('role','menuitem');change.dataset.selectionChange='';change.className='linkbtn';change.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m15 4 5 5M4 16 16 4a2 2 0 0 1 4 4L8 20H4Z"/></svg><span>改当前凸显</span>';const label=document.createElement('small');label.textContent='当前：'+(target.text||target.title);change.append(label);menu.append(change);change.onclick=()=>{closeSelectionMenu();if(rangeConflict(chosen,target.category,target.id)){error('该范围与同分类已有点拨重叠，请重新选择');return}collect();Object.assign(target,chosen,{needsReview:false});selectedNoteId=target.id;selection=null;repositionId='';window.getSelection()?.removeAllRanges();render();focusSelectedNote()};}
   menu.onmousedown=e=>e.preventDefault();modal.append(menu);const rect=el.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(e.clientX||rect.left,window.innerWidth-280))+'px';menu.style.top=Math.max(8,Math.min(e.clientY||rect.bottom,window.innerHeight-menu.offsetHeight-8))+'px';
   const controller=new AbortController();closeSelectionMenu=()=>{controller.abort();menu.remove();closeSelectionMenu=()=>{}};const opts={capture:true,signal:controller.signal};document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))closeSelectionMenu()},opts);document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeSelectionMenu();el.focus()}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const buttons=[...menu.querySelectorAll('button:not(:disabled)')];const index=buttons.indexOf(document.activeElement);buttons[(index+(e.key==='ArrowDown'?1:buttons.length-1)+buttons.length)%buttons.length]?.focus()}},opts);document.addEventListener('scroll',closeSelectionMenu,opts);window.addEventListener('blur',closeSelectionMenu,{signal:controller.signal});menu.querySelector('button:not(:disabled)')?.focus();
  };el.onclick=e=>{const mark=e.target.closest('[data-note-mark]');if(mark&&window.getSelection()?.isCollapsed&&!note){const index=d().teachingNotes.findIndex(n=>n.id===mark.dataset.noteMark);selectNote(mark.dataset.noteMark);if(index>=0&&d().teachingNotes[index].category!==activeNoteCategory){collect();activeNoteCategory=d().teachingNotes[index].category;render()}modal.querySelector('[data-continuous-note="'+index+'"]')?.scrollIntoView({block:'nearest'})}}});
  modal.querySelectorAll('[data-open-note]').forEach(b=>b.onclick=()=>{if(note&&note.id!==b.dataset.openNote){error('请先保存或取消当前点拨');return;}if(note)return;note=structuredClone(d().teachingNotes.find(n=>n.id===b.dataset.openNote));if(note.category==='实用表达'&&note.linkVocabulary===undefined)note.linkVocabulary=!!note.wordId;wordQuery=note.text;render()});
  modal.querySelectorAll('[data-delete-note]').forEach(b=>b.onclick=()=>{if(readOnly)return;collect();if(note&&note.id!==b.dataset.deleteNote){error('请先保存或取消当前点拨');return}d().teachingNotes=d().teachingNotes.filter(n=>n.id!==b.dataset.deleteNote);note=null;selection=null;repositionId=null;render()});
  if(!note)return;
  bindAnalysisFields(modal,note,render,collectNote,error);
  BookUI.renderLinkedCascader(modal.querySelector('#an-category-cascade'),{options:(note.groupNote?categories:['词汇','语音','实用表达','语法']).map(c=>({value:c,label:c,...(analysisSubcategories[c]?{children:analysisSubcategories[c].map(v=>({value:v,label:v}))}:{})})),value:[note.category,note.subcategory].filter(Boolean),label:'解析分类',disabled:!!note.groupNote,onChange:path=>{collectNote();const previous=note.category;note.category=path[0]||'';note.subcategory=path[1]||'';if(previous!==note.category)note.mode='';render()}});
  modal.querySelector('#lc-cancel-note').onclick=()=>{note=null;repositionId='';render()};
  modal.querySelector('#lc-reposition-note')?.addEventListener('click',()=>{collectNote();repositionId=note.id||'new';selection=null;modal.querySelector('#lc-selection-text').textContent='';});

  modal.querySelector('#lc-delete-note')?.addEventListener('click',()=>{d().teachingNotes=d().teachingNotes.filter(n=>n.id!==note.id);note=null;render()});
  modal.querySelector('#lc-save-note').onclick=()=>{collectNote();if(!(note.groupNote?categories:['词汇','语音','实用表达','语法']).includes(note.category))return error('请选择解析分类');const validation=validateAnalysisNote(note);if(validation)return error(validation);if(note.category==='微技能'&&note.scope!=='material'&&!d().questions.some(q=>q.id===note.targetQuestionId))return error('请选择点拨的小题');if(note.needsReview)return error('请先重新定位点拨');const source=sources().find(s=>s.key===note.sourceKey);if(!note.groupNote&&(!source||source.text!==note.sourceText))return error('原文已变化，请重新选取文本');d().teachingNotes ||= [];const saved={...note,id:note.id||'NOTE-'+crypto.randomUUID(),materialId:d().materialId,scope:note.category==='微技能'?(note.scope==='material'?'material':'question'):['百科知识','话题词汇'].includes(note.category)?'material':'fragment',needsReview:false};if(!analysisNeedsWord(saved)){delete saved.wordId;delete saved.posId;delete saved.meaningId;delete saved.wordSelections}if(saved.category!=='微技能')delete saved.targetQuestionId;const i=d().teachingNotes.findIndex(n=>n.id===saved.id);if(i<0)d().teachingNotes.push(saved);else d().teachingNotes[i]=saved;selectedNoteId=saved.id;activeNoteCategory=saved.category;note=null;repositionId='';render();};
 }
 function readHtml(){
  const r=d(),audio=api.getAudioUrl();
  const player=audio?`<audio controls preload="metadata" src="${esc(audio)}" aria-label="录音稿音频"></audio>`:'<p class="muted">--</p>';
  if(view==='analysis')return `<section class="lc-read-notes"><h3>教师讲解</h3>${(r.teachingNotes||[]).map(n=>`<article class="lc-read-card">${analysisNotePreview(n)}</article>`).join('')||'<p class="muted">--</p>'}</section>`;
  if(view==='cloze')return player+bankClozeMarkup({...r,noCloze:false}).replace('<h3>精听挖空</h3>','');
  if(view==='clues')return `<section>${player}${r.questions.map((q,i)=>`<article class="lc-read-card"><h3>小题 ${i+1} · ${esc(q.text)}</h3>${q.noDirectClue?'<p class="muted">无直接线索</p>':(q.clues||[]).map(c=>`<p>${esc(c.text)}${c.needsReview?' <span class="lc-note-warning">待复核</span>':''}</p>`).join('')||'<p class="muted">--</p>'}</article>`).join('')}</section>`;
  return contentHtml();
 }
 function mountHierarchyMenus(){
  if(view!=='content')return;
  modal.querySelectorAll('[data-hierarchy]').forEach(group=>{
   const parent=group.querySelector('[data-hierarchy-parent]'),child=group.querySelector('[data-hierarchy-child]'),key=group.dataset.hierarchy;
   const host=document.createElement('span');host.className='lc-hierarchy-menu';group.append(host);
   if(readOnly){host.textContent=[parent.value,child.value].filter(Boolean).join(' / ')||'--';group.classList.add('lc-hierarchy-compact');return;}
   if(!window.BookUI?.renderHierarchy){host.remove();return;}
   group.classList.add('lc-hierarchy-compact');
   window.BookUI.renderHierarchy(host,{options:listeningTagTree(key),value:[parent.value,child.value].filter(Boolean),label:key==='topics'?'话题':'考点',onChange:path=>{
    parent.value=path[0]||'';parent.dispatchEvent(new Event('change',{bubbles:true}));
    child.value=path[1]||'';child.dispatchEvent(new Event('change',{bubbles:true}));collect();
   }});
  });
 }
 function updateTabStatus(){
  const status=listeningSectionStatus(d());
  modal.querySelectorAll('[data-edit-view]').forEach(button=>{const label=button.querySelector('.lc-tab-label').textContent,text=status[button.dataset.editView],hint=button.querySelector('.lc-tab-status');hint.textContent=text;hint.hidden=!text;button.setAttribute('aria-label',label+(text?'，'+text:''))});
 }
 function updateRevisionFooter(){
  if(!api.revisionBookId||readOnly)return;collect();const currentDirty=api.trackRecording(),whole=api.suiteSaveMode(),dirty=whole?api.suiteDirty():currentDirty;
  modal.querySelectorAll('[data-revision-save],#lc-discard-recording').forEach(b=>b.disabled=!dirty||api.isBusy()||(b.dataset.revisionSave==='optimized'&&bookFlow(data.books.find(book=>book.id===api.revisionBookId)).stage!=='编书中'));
  modal.querySelectorAll('[data-revision-save],#lc-discard-recording').forEach(b=>{b.hidden=!dirty&&b.id==='lc-discard-recording'});
  const footer=modal.querySelector('.lc-footer');footer.classList.add('lc-revision-footer');footer.classList.toggle('has-unsaved-changes',dirty);
  const status=modal.querySelector('#lc-revision-status');if(status)status.textContent=whole?(dirty?'当前套题有未保存修改':'当前套题暂无修改'):(dirty?'当前录音稿有未保存修改':'当前录音稿暂无修改');
 }
 function renderEditor(){
  closeSelectionMenu();
  if(!baseline&&!api.isBusy())baseline=api.capture();
  if(baseline&&!baseline.buffer){const loaded=api.capture();if(loaded.buffer&&loaded.draft.audioName===baseline.draft.audioName)Object.assign(baseline,{blob:loaded.blob,buffer:loaded.buffer,url:loaded.url});}
  reconcile();const revisionBook=data.books.find(b=>b.id===api.revisionBookId);const arranging=revisionBook&&bookFlow(revisionBook).stage==='编书中';if(arranging&&['analysis','cloze'].includes(view))view='content';modal.classList.add('lc-batch');d().step=view==='content'?2:view==='clues'?4:view==='cloze'?5:6;
  const paneScroll=['.lc-teaching-sources','.lc-teaching-editor'].map(q=>modal.querySelector(q)?.scrollTop||0);
  const bodyScroll=modal.querySelector('.lc-body')?.scrollTop||0;
  const sidebarScroll=modal.querySelector('.lc-suite-sidebar')?.scrollTop||0;
  const clueScroll=modal.querySelector('.lc-clue-card-list')?.scrollTop||0;
  window.BookUI?.disposeHierarchies?.(modal);
  modal.querySelectorAll('audio').forEach(p=>p.pause());
  fieldScopes=[];
  const emptySuite=api.suiteMaterials&&api.suiteMaterials.length===0;
  const body=emptySuite?'<div class="empty">'+(readOnly?'暂无录音稿':'暂无录音稿，请引用听力题库或新增录音稿')+'</div>':view==='content'?contentHtml():view==='analysis'?analysisHtml():view==='cloze'?batchCloze():d().questions.length?fourth():'<p class="muted">--</p>';
  const suite=!!api.suiteMaterials;
  const sidebar=suite?`<aside class="lc-suite-sidebar" aria-label="录音稿列表">${api.suiteMaterials.map((id,i)=>`<div data-recording-row="${esc(id)}" class="lc-recording-row ${id===d().materialId?'active':''}">${!readOnly&&api.onReorderMaterial?`<button type="button" class="directory-sort-handle lc-recording-sort" draggable="true" aria-label="调整录音稿 ${i+1} 顺序">⠿</button>`:''}<button type="button" data-suite-recording="${esc(id)}" class="${id===d().materialId?'active':''}" aria-current="${id===d().materialId?'true':'false'}">录音稿 ${i+1}</button>${!readOnly&&(api.canEditStructure?api.canEditStructure():bookStructureEditable(api.revisionBookId))&&api.onUnlinkMaterial?`<button type="button" data-unlink-recording="${esc(id)}" aria-label="解除引用录音稿 ${i+1}"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5M3 3l18 18"/></svg></button>`:''}</div>`).join('')}${!readOnly&&(api.canEditStructure?api.canEditStructure():bookStructureEditable(api.revisionBookId))&&api.onAddMaterial?'<button type="button" class="lc-add-recording lc-reference-recording" data-reference-recording>＋ 引用听力题库</button><button type="button" class="lc-add-recording" data-add-recording>＋ 新增录音稿</button>':''}</aside>`:'';
  modal.classList.toggle('lc-suite-editing',!!suite);
  modal.dataset.auditKey=JSON.stringify(api.auditScope||['listeningBank','materials',d().materialId||'new']);
  modal.innerHTML=`<header class="lc-header"><button type="button" class="btn" id="lc-close">返回</button><h2>${suite?(readOnly?'查看听力套题':'编辑听力套题'):readOnly?'听力题详情':'编辑听力题'}</h2>${suite?`<span class="lc-suite-counts"><span>录音稿：${api.getSuiteCounts().recordings}</span><span>小题：${api.getSuiteCounts().questions}</span></span>`:''}${revisionBook?`<div class="lc-revision-book"><span>${esc(revisionBook.name)} · ${esc(bookValue(revisionBook,'version'))}版</span>${bookStatusLabel(bookCurrentStage(revisionBook))}</div>`:''}</header><div class="lc-editor-layout">${sidebar}<section class="lc-editor-main"><nav class="lc-edit-tabs" role="tablist" aria-label="编辑内容">${[['content','试题详情'],['clues','线索句'],['analysis','解析点拨'],['cloze','精听挖空']].map(([id,label])=>`<button type="button" role="tab" aria-selected="${view===id}" class="${view===id?'active':''}" data-edit-view="${id}" ${arranging&&['analysis','cloze'].includes(id)?'disabled':''}><span class="lc-tab-label">${label}</span><span class="lc-tab-status" aria-hidden="true" hidden></span></button>`).join('')}</nav><div class="lc-body">${body}</div></section></div><p class="lc-toast" id="lc-error" role="status" aria-live="polite" hidden></p><footer class="lc-footer">${readOnly?'':api.revisionBookId?`<div class="lc-revision-summary"><strong id="lc-revision-status" role="status" aria-live="polite">当前录音稿暂无修改</strong></div><button class="btn" id="lc-discard-recording" disabled>不保存</button>${api.suiteSaveMode()?'<button class="btn primary" data-revision-save="suite" disabled>保存整套题</button>':['analysis','cloze'].includes(view)?'<button class="btn primary" data-revision-save="normal" disabled>保存</button>':'<button class="btn" data-revision-save="correction" disabled>保存硬伤修正</button><button class="btn primary" data-revision-save="optimized" disabled>保存为优化版本</button>'}`:`<button class="btn primary" id="lc-save-progress">保存</button>`}</footer>`;
  bindListeningEditorAreas(modal,'.lc-edit-content textarea');
  modal.querySelector('.lc-body').scrollTop=bodyScroll;if(modal.querySelector('.lc-suite-sidebar'))modal.querySelector('.lc-suite-sidebar').scrollTop=sidebarScroll;updateTabStatus();
  if(!readOnly)for(const event of ['input','change','click'])modal.querySelector('.lc-body').addEventListener(event,()=>queueMicrotask(()=>{if(modal.isConnected){collect();updateTabStatus();updateRevisionFooter()}}));
  modal.classList.toggle('lc-view-mode',readOnly);
  modal.classList.toggle('lc-analysis-mode',view==='analysis');
  ['.lc-teaching-sources','.lc-teaching-editor'].forEach((q,i)=>{const el=modal.querySelector(q);if(el)el.scrollTop=paneScroll[i]});
  if(!readOnly&&api.onReorderMaterial){
   const rows=[...modal.querySelectorAll('[data-recording-row]')];
   bindDirectorySorting(rows,()=>'',(a,b,after)=>api.onReorderMaterial(a.dataset.recordingRow,b.dataset.recordingRow,after));
   rows.forEach((row,i)=>{const handle=row.querySelector('.lc-recording-sort');handle.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const target=rows[i+(e.key==='ArrowDown'?1:-1)];if(!target)return;api.onReorderMaterial(row.dataset.recordingRow,target.dataset.recordingRow,e.key==='ArrowDown');modal.querySelector(`[data-recording-row="${row.dataset.recordingRow}"] .lc-recording-sort`)?.focus()}});
  }
  modal.querySelectorAll('[data-suite-recording]').forEach(button=>button.onclick=()=>{if(!api.isBusy())api.onSwitchMaterial(button.dataset.suiteRecording)});
  modal.querySelectorAll('[data-unlink-recording]').forEach(button=>button.onclick=()=>{if(!api.isBusy())api.onUnlinkMaterial(button.dataset.unlinkRecording)});
  modal.querySelector('[data-reference-recording]')?.addEventListener('click',()=>{if(!api.isBusy()){collect();api.onReferenceMaterial()}});
  modal.querySelector('[data-add-recording]')?.addEventListener('click',()=>{if(!api.isBusy()){collect();api.onAddMaterial()}});
  modal.querySelector('#lc-close').onclick=()=>{if(!api.isBusy())modal.requestClose()};
  modal.querySelectorAll('[data-edit-view]').forEach(b=>b.onclick=()=>{if(api.isBusy())return;collect();if(note&&!readOnly){error('请先保存或取消当前点拨');return;}note=null;view=b.dataset.editView;selection=null;render()});

  if(!emptySuite&&view==='analysis'){bindContinuousNotes();bindSourceLayout();const tabs=modal.querySelector('.lc-note-category-tabs');const toolbar=document.createElement('div');toolbar.className='lc-category-toolbar';tabs.before(toolbar);toolbar.append(tabs);if(!readOnly){const button=document.createElement('button');button.type='button';button.className='btn';button.id='lc-batch-analysis';button.textContent='批量录入解析点拨';modal.querySelector('.lc-edit-tabs').append(button);button.onclick=()=>{collect();openAnalysisBatchImport({getRecords:()=>api.getAnalysisImportRecords?.()||[d()],onImported:(count,first)=>{if(first?.materialId===d().materialId){activeNoteCategory=first.category;selectedNoteId=first.id}stash();render();error('已导入 '+count+' 条解析点拨，请保存'+(api.suiteMaterials?'整套题':'修改'),'success')}})}}}
  mountHierarchyMenus();
  if(!emptySuite&&view==='cloze'){const clozeHeader=modal.querySelector('.lc-cloze-record-header');clozeHeader.querySelector('h3')?.remove();clozeHeader.querySelector('.lc-no-cloze')?.remove();clozeHeader.hidden=true;
   const player=modal.querySelector('.lc-cloze-player');if(player){player.removeAttribute('controls');player.hidden=true;player.ontimeupdate=()=>{if(player._stopAt!=null&&player.currentTime>=player._stopAt)player.pause()};}
   modal.querySelectorAll('.lc-cloze-line').forEach((row,i)=>{const s=d().segments[i];row.insertAdjacentHTML('afterbegin','<button type="button" class="lc-play" data-cloze-play="'+i+'" aria-label="试听第'+(i+1)+'句">▶</button>');row.querySelector('button').onclick=()=>{if(!player)return;player.currentTime=segmentTime(s.start)||0;player._stopAt=segmentTime(s.end);player.play().catch(e=>error(e.message))};});
}
  if(view==='clues')modal.querySelectorAll('[data-whole-clue]').forEach(el=>el.remove());
  if(readOnly){
   bindAnalysisPreview(modal,d().teachingNotes||[]);
   modal.querySelectorAll('.lc-body textarea,.lc-body input:not([type=radio]):not([type=checkbox]):not([type=file])').forEach(el=>el.readOnly=true);
   modal.querySelectorAll('.lc-body select,.lc-body input[type=radio],.lc-body input[type=checkbox],.lc-body input[type=file]').forEach(el=>{el.disabled=true;if(el.tagName==='SELECT'&&!el.value&&el.options.length)el.options[0].textContent='--';});
   modal.querySelectorAll('.lc-body button:not([data-edit-clue-question]):not([data-play]):not([data-clue-play]):not([data-cloze-play]):not([data-open-note]):not([data-read-interactive]):not([data-read-note-media]):not([data-note-preview]):not([data-note-records]):not([data-note-category-tab])').forEach(el=>{el.disabled=true;el.classList.add('lc-readonly-action')});
   const player=modal.querySelector('#lc-player,#lc-clue-player');
   if(player){player.ontimeupdate=()=>{if(player._stopAt!=null&&player.currentTime>=player._stopAt)player.pause()};modal.querySelectorAll('[data-play],[data-clue-play]').forEach(b=>b.onclick=()=>{const i=+(b.dataset.play??b.dataset.cluePlay),s=d().segments[i];api.setTimeSentence(i);api.drawWave();player.currentTime=segmentTime(s.start)||0;player._stopAt=segmentTime(s.end);player.play().catch(e=>error(e.message))});}
   api.drawWave();
   modal.querySelectorAll('[data-clue-question]').forEach(card=>card.onclick=()=>{api.setClueQuestion(+card.dataset.clueQuestion);render()});
   modal.querySelectorAll('[data-open-note]').forEach(button=>button.onclick=()=>{note=structuredClone(d().teachingNotes.find(n=>n.id===button.dataset.openNote));render()});
   return;
  }

  if(modal.querySelector('#lc-save-progress'))modal.querySelector('#lc-save-progress').onclick=()=>{collect();if(note){error('请先保存或取消当前点拨');return;}for(const n of d().teachingNotes||[]){const issue=validateAnalysisNote(n);if(issue){error(issue);return}}save()};
  modal.querySelector('#lc-discard-recording')?.addEventListener('click',api.discardRecordingChanges);
  modal.querySelectorAll('[data-revision-save]').forEach(b=>b.onclick=()=>{collect();if(note){error('请先完成当前点拨');return}api.requestRevisionSave(b.dataset.revisionSave)});
  if(emptySuite)return;
  if(view==='content'){
   bindAudio();bindListeningHierarchies(modal);
   const limits=listeningQuestionLimits(d().questionType||d().questions[0]?.questionType);
   const questionSection=modal.querySelector('.lc-edit-questions');
   if(limits&&questionSection&&(api.canEditQuestions?api.canEditQuestions():bookStructureEditable(api.revisionBookId))){questionSection.insertAdjacentHTML('beforeend',`<div class="lc-question-count-actions"><button type="button" class="linkbtn" data-add-question ${limits.max===1||d().questions.length>=limits.max?'disabled aria-disabled="true" tabindex="-1"':''}>＋ 添加小题</button></div>`);
   modal.querySelector('[data-add-question]').onclick=()=>{if(!(api.canEditQuestions?api.canEditQuestions():bookStructureEditable(api.revisionBookId)))return;collect();const rule=listeningQuestionLimits(d().questionType||d().questions[0]?.questionType);if(!rule||rule.max===1||d().questions.length>=rule.max)return;d().questions.push({id:'Q-'+crypto.randomUUID(),number:d().questions.length+1,questionType:d().questionType,text:'',translation:'',options:['A','B','C'].map(key=>({key,text:'',translation:''})),answerKey:'',examPoints:'',abilities:''});render()};}
   modal.querySelector('#lc-edit-record-type')?.addEventListener('change',()=>{collect();render()});
   modal.querySelectorAll('[data-delete-question]').forEach(button=>button.onclick=()=>{if(!(api.canEditQuestions?api.canEditQuestions():bookStructureEditable(api.revisionBookId)))return;collect();const rule=listeningQuestionLimits(d().questionType||d().questions[0]?.questionType);if(rule&&(rule.max===1||d().questions.length<=rule.min)){error(rule.max===1?'短对话固定 1 题，不能删除':'至少保留 2 道小题');return}const index=Number(button.dataset.deleteQuestion),removed=d().questions[index];if(!removed)return;d().questions.splice(index,1);d().questions.forEach((q,i)=>q.number=i+1);d().teachingNotes=(d().teachingNotes||[]).filter(n=>n.targetQuestionId!==removed.id&&n.sourceKey!=='question:'+removed.id&&!n.sourceKey?.startsWith('option:'+removed.id+':'));reconcile();render()});

   modal.querySelector('#lc-retry-alignment')?.addEventListener('click',api.retryAlignment);
   modal.querySelectorAll('.lc-edit-content textarea,.lc-edit-content select').forEach(el=>el.addEventListener('change',collect));
   modal.querySelectorAll('[data-set-answer]').forEach(b=>b.onclick=()=>{collect();const q=d().questions[+b.closest('[data-question]').dataset.question];if(q.answerKey!==b.dataset.setAnswer)q.clueNeedsReview=true;q.answerKey=b.dataset.setAnswer;render()});
   modal.querySelectorAll('[data-review-question-translation]').forEach(b=>b.onclick=()=>{collect();const q=d().questions[+b.closest('[data-question]').dataset.question];const obj=b.dataset.reviewQuestionTranslation==='stem'?q:q.options[+b.dataset.reviewQuestionTranslation];obj.translationNeedsReview=false;render()});
   modal.querySelectorAll('[data-edit-review]').forEach(b=>b.onclick=()=>{collect();d().segments[+b.dataset.editReview].translationNeedsReview=false;render()});
  }else if(view==='analysis')bindAnalysis();else if(view==='cloze'){
   bindCloze();   const review=[...(d().clozeReview||[]),...d().segments.flatMap(s=>s.clozeReview||[])];if(review.length)modal.querySelector('.lc-cloze').insertAdjacentHTML('afterbegin',`<p class="lc-note-warning">原文修改后需重新设置挖空：${review.map(b=>esc(b.text)).join('、')}<button class="linkbtn" id="lc-confirm-cloze-review">已复核</button></p>`);
   modal.querySelector('#lc-confirm-cloze-review')?.addEventListener('click',()=>{d().clozeReview=[];d().segments.forEach(s=>s.clozeReview=[]);render()});
  }else if(d().questions.length){bindClues();modal.querySelectorAll('[data-whole-clue]').forEach(el=>el.remove());modal.querySelector('.lc-clue-card-list').scrollTop=clueScroll;}
  updateRevisionFooter();modal.querySelector('.lc-body').addEventListener('pointerup',()=>queueMicrotask(updateRevisionFooter));
  stash();if(api.isBusy())modal.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=true);
 }
 return {collect,render:renderEditor,reconcile,showContent:()=>{view='content'},captureEditor:()=>({note:structuredClone(note),selection:structuredClone(selection),repositionId,wordQuery}),restoreEditor:state=>{note=state?.note||null;selection=state?.selection||null;repositionId=state?.repositionId||'';wordQuery=state?.wordQuery||'';baseline=null;readOnly=!!api.readOnly;},didSave:()=>{baseline=api.capture();readOnly=!!api.readOnly;render()}};
}
