'use strict';
let suiteView=null,suiteDraft=null;
function suitePlain(value){return String(value??'').replace(/<\/(?:p|div)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ')}
function localSuiteContent(book,node){
 if(book.suiteContent?.[node.id]){const saved=structuredClone(book.suiteContent[node.id]);saved.scripts.forEach(script=>{script.segments=scriptSegments(script,book)});return saved;}
 const source=book.sourceBookId==='690'?builtinBook690:null;
 const scripts=(source?.scripts||[]).filter(s=>String(s['旧套题id'])===node.sourceSuiteId).map((s,i)=>({id:String(s['旧录音稿id']),name:'录音稿 '+(i+1),text:suitePlain(s['旧录音稿']),translation:(source.timeline||[]).filter(t=>String(t['旧录音稿id'])===String(s['旧录音稿id'])).map(t=>suitePlain(t['录音稿翻译'])).filter(Boolean).join('\n'),audioName:String(s['音频']||''),audioUrl:'',accent:String(s['音频类型']||'')}));
 const ids=new Set(scripts.map(s=>s.id));
 const questions=(source?.questions||[]).filter(q=>ids.has(String(q['旧录音稿id']))).map(q=>({id:String(q['旧小题id']),scriptId:String(q['旧录音稿id']),number:String(q['题号']),text:suitePlain(q['题干']),translation:suitePlain(q['题干翻译']),options:['A','B','C'].map(k=>({key:k,text:suitePlain(q['选项'+k]),translation:suitePlain(q['选项'+k+'翻译'])})),answer:suitePlain(q['答案'])}));
 scripts.forEach(script=>{script.segments=scriptSegments(script,book)});
 return {scripts,questions};
}
function rawSuiteContent(book,node){const content=localSuiteContent(book,node);return typeof bankOverlay==='function'?bankOverlay(book,node,content):content}
function suiteContent(book,node){
 const content=rawSuiteContent(book,node);
 if(!content.orderingVersion)content.questions.sort((a,b)=>Number(a.number)-Number(b.number));
 return typeof renumberSuiteContent==='function'?renumberSuiteContent(content,typeof blockQuestionStart==='function'?blockQuestionStart(book,node):1):content;
}
function validateSuiteContent(content){
 const ids=new Set(content.scripts.map(s=>s.id));if(ids.size!==content.scripts.length)throw Error('录音稿 ID 重复');
 const qids=new Set(),numbers=new Set();
 for(const q of content.questions){if(!ids.has(q.scriptId))throw Error('小题必须归属本套题内的录音稿');if(qids.has(q.id))throw Error('小题 ID 重复');qids.add(q.id);if(!/^\d+$/.test(q.number)||Number(q.number)<1)throw Error('题号必须为正整数');if(numbers.has(Number(q.number)))throw Error('套题内题号不能重复');numbers.add(Number(q.number));}
}
function moveSuiteQuestion(content,id,target){
 const next=structuredClone(content),q=next.questions.find(q=>q.id===id);if(!q||!next.scripts.some(s=>s.id===target))throw Error('小题或目标录音稿不存在');q.scriptId=target;validateSuiteContent(next);return next;
}
function suiteDirty(){if(typeof recordingAudio!=='undefined'&&recordingAudio?.busy)return true;return !!suiteDraft&&JSON.stringify(Object.fromEntries(new FormData(suiteDraft.form)))!==suiteDraft.initial}
function guardSuiteNavigation(){
 if(suiteDirty()&&!window.confirm('当前内容尚未保存，是否放弃修改？')){const p=suiteDraft.location;page=p.page;activeBook=p.activeBook;bookSection=p.bookSection;bookType=p.bookType;return false}
 suiteDraft=null;if(typeof disposeRecordingAudio==='function')disposeRecordingAudio();return true;
}
function saveSuiteContent(content){
 const {book,node}=currentSuite();
 content=renumberSuiteContent(content,blockQuestionStart(book,node));
 validateSuiteContent(content);
 return commitWorkspace(d=>{const b=d.books.find(b=>b.id===suiteView.bookId);b.suiteContent ||= {};b.suiteContent[suiteView.nodeId]=content;if(typeof syncSuiteToBank==='function')syncSuiteToBank(d,b,node,content)});
}
function currentSuite(){const book=data.books.find(b=>b.id===suiteView.bookId),node=resolveListeningNode(book,suiteView.nodeId);return {book,node,content:suiteContent(book,node)}}
function refreshSuite(){const {book,node}=currentSuite();renderSuiteEditor(book,node,$('#book-section'))}
function suiteTextField(label,name,value,required=false,large=false){return `<label class="field"><span>${required?'<span class="required-mark">*</span>':''}${esc(label)}</span><textarea class="input ${large?'suite-long-text':''}" name="${esc(name)}" ${required?'required':''}>${esc(value||'')}</textarea></label>`}
function renderListeningSuiteEditor(book,node,target){
 if(typeof disposeRecordingAudio==='function')disposeRecordingAudio();
 const content=suiteContent(book,node);
 if(suiteView?.bookId!==book.id||suiteView?.nodeId!==node.id)suiteView={bookId:book.id,nodeId:node.id,scriptId:content.scripts[0]?.id||''};
 if(!content.scripts.some(s=>s.id===suiteView.scriptId))suiteView.scriptId=content.scripts[0]?.id||'';
 const script=content.scripts.find(s=>s.id===suiteView.scriptId),nodes=bookDirectoryNodes(book),path=[node.name];let parent=node.parentId;while(parent){const p=nodes.find(n=>n.id===parent);if(!p)break;path.unshift(p.name);parent=p.parentId}
 target.classList.add('directory-split-host');
 target.innerHTML=`<div class="suite-location"><button class="btn" id="suite-back">返回</button><span>${esc(path.join(' / '))}</span><span class="directory-kind-tag">套题</span></div><div class="suite-layout"><aside class="suite-sidebar"><div class="row between"><h3>录音稿</h3><button class="linkbtn" id="suite-add-script">新增</button></div><div class="suite-script-list">${content.scripts.map((s,i)=>{const qs=content.questions.filter(q=>q.scriptId===s.id);return `<div class="suite-script-row ${s.id===suiteView.scriptId?'selected':''}" data-script-row="${esc(s.id)}"><button type="button" class="directory-drag-handle" draggable="true" aria-label="拖动排序${esc(s.name)}">⠿</button><button class="suite-script-select" data-select-script="${esc(s.id)}"><small>${qs.length?'第 '+qs.map(q=>esc(q.number)).join('、')+' 题':'--'}</small></button><div class="suite-sort"><button class="linkbtn" data-sort-script="${esc(s.id)}" data-step="-1" ${i===0?'disabled':''} aria-label="上移${esc(s.name)}">↑</button><button class="linkbtn" data-sort-script="${esc(s.id)}" data-step="1" ${i===content.scripts.length-1?'disabled':''} aria-label="下移${esc(s.name)}">↓</button></div></div>`}).join('')||'<p class="muted">--</p>'}</div></aside><section class="suite-editor-main" id="suite-editor-main">${script?`<article class="suite-card" id="suite-script-card"><div class="row between"><span class="muted">ID：${esc(script.id)}</span><button class="linkbtn" id="suite-edit-script">修改录音稿</button></div>${segmentTable(script.segments)}${recordingAudioMarkup(false)}</article><div class="row between suite-questions-heading"><h2>关联小题</h2><button class="btn" id="suite-add-question">新增小题</button></div><div id="suite-question-list">${content.questions.filter(q=>q.scriptId===script.id).sort((a,b)=>Number(a.number)-Number(b.number)).map(q=>`<article class="suite-card" data-question-card="${esc(q.id)}"><div class="row between"><h3><button type="button" class="directory-drag-handle" draggable="true" data-drag-question="${esc(q.id)}" aria-label="拖动调整第 ${esc(q.number)} 题顺序">⠿</button>第 ${esc(q.number)} 题</h3><div class="row"><button class="linkbtn" data-edit-question="${esc(q.id)}">修改</button><button class="linkbtn" data-move-question="${esc(q.id)}">移动到其他录音稿</button></div></div><p class="suite-copy">${esc(q.text)}</p>${q.translation?`<p class="muted suite-copy">${esc(q.translation)}</p>`:''}${q.options.map(o=>`<p class="suite-option">${esc(o.key)}. ${esc(o.text)}${o.translation?`<span class="muted">　${esc(o.translation)}</span>`:''}</p>`).join('')}<p class="question-answer">答案：${esc(q.answer)}</p></article>`).join('')||'<p class="muted">该录音稿暂无小题，可点击“新增小题”。</p>'}</div>`:emptyWorkspace('--','点击左侧“新增”，创建套题的第一篇录音稿。')}</section></div>`;
 if(script){bindRecordingAudio(script,false);target.querySelectorAll('[data-read-play]').forEach(b=>b.onclick=()=>recordingAudio?.playSegment(script.segments[Number(b.dataset.readPlay)]));target.querySelectorAll('[data-read-split]').forEach(b=>b.onclick=()=>{const index=Number(b.dataset.readSplit);editSuiteScript(script.id);const row=$('#suite-content-form')?.querySelector(`[data-segment="${index}"]`);if(row)openSegmentSplit(row)})}
 bindScriptDragging(target);
 bindQuestionDragging(target);
 $('#suite-back').hidden=true;
 target.querySelectorAll('[data-select-script]').forEach(b=>b.onclick=()=>{if(!guardSuiteNavigation())return;suiteView.scriptId=b.dataset.selectScript;refreshSuite()});
 $('#suite-add-script').onclick=()=>editSuiteScript(null);
 if(script){$('#suite-edit-script').onclick=()=>editSuiteScript(script.id);$('#suite-add-question').onclick=()=>editSuiteQuestion(null);}
 target.querySelectorAll('[data-edit-question]').forEach(b=>b.onclick=()=>editSuiteQuestion(b.dataset.editQuestion));
 target.querySelectorAll('[data-move-question]').forEach(b=>b.onclick=()=>moveSuiteQuestionDialog(b.dataset.moveQuestion));
 target.querySelectorAll('[data-sort-script]').forEach(b=>b.onclick=()=>{if(!guardSuiteNavigation())return;const c=currentSuite().content,i=c.scripts.findIndex(s=>s.id===b.dataset.sortScript),j=i+Number(b.dataset.step);if(j<0||j>=c.scripts.length)return;[c.scripts[i],c.scripts[j]]=[c.scripts[j],c.scripts[i]];if(saveSuiteContent(c))refreshSuite()});
}
function bindSuiteForm(onSave){
 const form=$('#suite-content-form');suiteDraft={form,initial:JSON.stringify(Object.fromEntries(new FormData(form))),location:{page,activeBook,bookSection,bookType}};
 $('#suite-cancel-edit').onclick=()=>{if(guardSuiteNavigation())refreshSuite()};
 form.onsubmit=e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(form));for(const k in values)values[k]=values[k].trim();onSave(values)}catch(e){$('#suite-form-error').textContent=e.message}};
 form.querySelector('input,textarea')?.focus();
}
function suiteFormActions(){return '<div class="row"><button class="btn" type="button" id="suite-cancel-edit">取消</button><button class="btn primary" type="submit">保存</button></div>'}
function finishSuiteSave(content){if(!saveSuiteContent(content)){throw Error('保存失败，修改仍保留在当前页面，请重试。')}suiteDraft=null;refreshSuite();toast('已保存')}
function editSuiteScript(id){
 if(!guardSuiteNavigation())return;refreshSuite();
 const {content}=currentSuite(),script=content.scripts.find(s=>s.id===id)||{id:'REC-'+crypto.randomUUID(),name:'录音稿 '+(content.scripts.length+1),segments:[]};
 const host=id?$('#suite-script-card'):$('#suite-editor-main');
 host.innerHTML=`<form id="suite-content-form"><div class="row between"><span class="muted">${id?'ID：'+esc(script.id):'新增录音稿'}</span>${suiteFormActions()}</div>${recordingAudioMarkup(true)}<input type="hidden" name="audioAssetId" value="${esc(script.audioAssetId||'')}">${segmentTable(script.segments.length?script.segments:[blankSegment()],true)}<button type="button" class="linkbtn" id="add-script-segment">+ 新增句子</button><label class="field"><span>音频名称</span><input class="input" name="audioName" value="${esc(script.audioName||'')}"></label><label class="field"><span>音频地址</span><input class="input" name="audioUrl" type="url" placeholder="https://…" value="${esc(script.audioUrl||'')}"></label><p class="error" id="suite-form-error"></p></form>`;
 const form=$('#suite-content-form');
 $('#add-script-segment').onclick=()=>{form.querySelector('tbody').insertAdjacentHTML('beforeend',segmentEditRow(blankSegment(),Math.max(-1,...Array.from(form.querySelectorAll('[data-segment]')).map(row=>Number(row.dataset.segment)))+1));};
 form.addEventListener('click',e=>{const remove=e.target.closest('[data-remove-segment]');if(remove){const row=remove.closest('[data-segment]');if(recordingAudio?.row===row){recordingAudio.row=null;recordingAudio.range=null;$('#recording-boundaries').innerHTML=''}row.remove()}const split=e.target.closest('[data-split-segment]');if(split)openSegmentSplit(split.closest('[data-segment]'));const adjust=e.target.closest('[data-adjust-segment]');if(adjust)recordingAudio?.selectRow(adjust.closest('[data-segment]'));const play=e.target.closest('[data-play-segment]');if(play)recordingAudio?.playSegment(readSegmentRow(play.closest('[data-segment]')))});
 bindSuiteForm(v=>{
 if(recordingAudio?.busy)throw Error('音频正在处理，请稍后保存');
 if(v.audioUrl&&!/^https?:\/\//i.test(v.audioUrl))throw Error('音频地址请使用 HTTP 或 HTTPS');
 const segments=Array.from(form.querySelectorAll('[data-segment]')).map(row=>{const index=row.dataset.segment;const prior=script.segments.find(s=>s.id===v['seg-id-'+index]);return {...prior,id:v['seg-id-'+index],speaker:v['seg-speaker-'+index],text:v['seg-text-'+index],translation:v['seg-translation-'+index],start:v['seg-start-'+index],end:v['seg-end-'+index]}});
 validateScriptSegments(segments);
 if(Number.isFinite(recordingAudio?.player.duration)&&segments.some(s=>segmentTime(s.end)>recordingAudio.player.duration+0.05))throw Error('句子结束时间超出音频时长');
 const c=currentSuite().content,values={audioAssetId:v.audioAssetId,audioName:v.audioName,audioUrl:v.audioUrl,segments,text:segments.map(s=>(s.speaker?s.speaker+': ':'')+s.text).join('\n'),translation:segments.map(s=>s.translation).join('\n')};
 if(id)Object.assign(c.scripts.find(s=>s.id===id),values);else c.scripts.push({...script,...values});const before=suiteView.scriptId;suiteView.scriptId=script.id;try{finishSuiteSave(c)}catch(e){suiteView.scriptId=before;throw e}
 });
 bindRecordingAudio(script,true);
}
function editSuiteQuestion(id){
 if(!guardSuiteNavigation())return;refreshSuite();const {content}=currentSuite();
 const q=content.questions.find(q=>q.id===id)||{id:typeof nextBusinessId==='function'?nextBusinessId('questions'):'Q-'+crypto.randomUUID(),scriptId:suiteView.scriptId,number:String(Math.max(0,...content.questions.map(q=>Number(q.number)))+1),options:['A','B','C'].map(key=>({key,text:'',translation:''})),answer:''};
 let host=id?Array.from(document.querySelectorAll('[data-question-card]')).find(e=>e.dataset.questionCard===id):null;
 if(!host){host=document.createElement('article');host.className='suite-card';$('#suite-question-list').appendChild(host)}
 const answerKey=q.options.find(o=>o.text===q.answer||o.key===q.answer)?.key||'';
 host.innerHTML=`<form id="suite-content-form"><div class="row between"><h3>${id?'修改小题':'新增小题'}</h3>${suiteFormActions()}</div><label class="field"><span>题号</span><input class="input" type="number" name="number" min="1" step="1" required value="${esc(q.number)}" readonly><small class="muted">题号按本套题顺序自动生成，通过拖动调整。</small></label>${suiteTextField('题干','text',q.text,true)}${suiteTextField('题干翻译','translation',q.translation)}${q.options.map(o=>suiteTextField('选项 '+o.key,'option'+o.key,o.text,true)+suiteTextField('选项 '+o.key+' 翻译','translation'+o.key,o.translation)).join('')}<label class="field"><span>正确答案</span><select class="input" name="answer" required><option value="" disabled ${answerKey?'':'selected'}>请选择答案</option>${opts(q.options.map(o=>[o.key,o.key]),answerKey)}</select></label><p class="error" id="suite-form-error"></p></form>`;
 bindSuiteForm(v=>{if(!v.text||!v.answer||q.options.some(o=>!v['option'+o.key]))throw Error('请填写题干、选项和答案');const updated={...q,number:v.number,text:v.text,translation:v.translation,options:q.options.map(o=>({...o,text:v['option'+o.key],translation:v['translation'+o.key]}))};updated.answer=updated.options.find(o=>o.key===v.answer).text;const c=currentSuite().content;if(id)c.questions[c.questions.findIndex(x=>x.id===id)]=updated;else c.questions.push(updated);finishSuiteSave(c)});
 host.scrollIntoView({block:'nearest'});
}
function moveSuiteQuestionDialog(id){
 if(!guardSuiteNavigation())return;refreshSuite();const {content}=currentSuite(),q=content.questions.find(q=>q.id===id),targets=content.scripts.filter(s=>s.id!==q.scriptId);
 if(!targets.length){toast('请先新增另一篇录音稿');return}
 openDialog('移动第 '+q.number+' 题',`<form id="suite-move-form"><label class="field"><span>目标录音稿（本套题内）</span><select class="input" name="scriptId">${opts(targets.map(s=>[s.id,s.name]),targets[0].id)}</select></label><p class="error" id="suite-move-error"></p></form>`,'<button class="btn" data-close>取消</button><button class="btn primary" form="suite-move-form">确认移动</button>');
 $('#suite-move-form').onsubmit=e=>{e.preventDefault();try{const target=new FormData(e.target).get('scriptId'),next=moveSuiteQuestion(currentSuite().content,id,target);if(!saveSuiteContent(next))throw Error('保存失败，请重试');suiteView.scriptId=target;closeDialog();refreshSuite();toast('小题已移动')}catch(e){$('#suite-move-error').textContent=e.message}};
}
window.addEventListener('beforeunload',e=>{if(suiteDirty()){e.preventDefault();e.returnValue=''}});
const logoutBeforeSuite=$('#logout').onclick;$('#logout').onclick=()=>{if(guardSuiteNavigation())logoutBeforeSuite()};

function reorderSuiteScripts(content,id,targetId,after=false){
 const next=structuredClone(content),index=next.scripts.findIndex(s=>s.id===id);
 if(index<0||!next.scripts.some(s=>s.id===targetId))throw Error('录音稿不存在');
 if(id===targetId)return next;
 const [item]=next.scripts.splice(index,1);next.scripts.splice(next.scripts.findIndex(s=>s.id===targetId)+(after?1:0),0,item);
 return next;
}
function bindScriptDragging(target){
 let dragging='';const rows=Array.from(target.querySelectorAll('[data-script-row]'));
 const clear=()=>rows.forEach(r=>r.classList.remove('script-drop-before','script-drop-after','script-dragging'));
 for(const row of rows){const id=row.dataset.scriptRow,handle=row.querySelector('.directory-drag-handle');
 handle.onclick=e=>e.stopPropagation();
 handle.ondragstart=e=>{dragging=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);row.classList.add('script-dragging')};
 handle.ondragend=()=>{dragging='';clear()};
 row.ondragover=e=>{
 rows.forEach(r=>r.classList.remove('script-drop-before','script-drop-after'));
 if(!dragging||dragging===id)return;e.preventDefault();e.dataTransfer.dropEffect='move';const box=row.getBoundingClientRect();row.classList.add(e.clientY>box.top+box.height/2?'script-drop-after':'script-drop-before');
 const list=target.querySelector('.suite-script-list'),bounds=list.getBoundingClientRect();if(e.clientY<bounds.top+35)list.scrollTop-=12;else if(e.clientY>bounds.bottom-35)list.scrollTop+=12;
 };
 row.ondragleave=e=>{if(!row.contains(e.relatedTarget))row.classList.remove('script-drop-before','script-drop-after')};
 row.ondrop=e=>{
 e.preventDefault();const source=dragging,box=row.getBoundingClientRect(),after=e.clientY>box.top+box.height/2;dragging='';clear();if(!source||source===id)return;
 if(!guardSuiteNavigation())return;
 try{const content=currentSuite().content,next=reorderSuiteScripts(content,source,id,after);
 if(saveSuiteContent(next)){refreshSuite();toast('录音稿顺序与题号已更新')}
 }catch(error){toast(error.message)}
 };
 }
}

function blankSegment(){return {id:'SEG-'+crypto.randomUUID(),speaker:'',text:'',translation:'',start:'',end:''}}
function scriptSegments(script,book){
 if(Array.isArray(script.segments))return structuredClone(script.segments);
 const source=book.sourceBookId==='690'?builtinBook690:null,original=source?.scripts.find(s=>String(s['旧录音稿id'])===script.id),rows=(source?.timeline||[]).filter(t=>String(t['旧录音稿id'])===script.id);
 const originalTranslation=rows.map(t=>suitePlain(t['录音稿翻译'])).filter(Boolean).join('\n');
 // Use source alignment only while it still matches the saved whole-text version.
 if(rows.length&&script.text===suitePlain(original?.['旧录音稿'])&&script.translation===originalTranslation)return rows.map((t,i)=>({id:'SEG-'+script.id+'-'+i,speaker:suitePlain(t['录音人']),text:suitePlain(t['录音稿']),translation:suitePlain(t['录音稿翻译']),start:String(t['开始时间']||''),end:String(t['结束时间']||''),sourceRow:structuredClone(t)}));
 return [{id:'SEG-'+script.id+'-legacy',speaker:'',text:script.text||'',translation:script.translation||'',start:'',end:''}];
}
function segmentTime(value){
 if(!value)return null;
 if(!/^\d+:(?:\d{2}:)?\d{2}(?:\.\d{1,3})?$/.test(value))return NaN;
 const parts=value.split(':').map(Number),seconds=parts.pop(),minutes=parts.pop(),hours=parts.pop()||0;
 if(seconds>=60||(value.split(':').length===3&&minutes>=60))return NaN;
 return hours*3600+minutes*60+seconds;
}
function validateScriptSegments(segments){
 if(!segments.length)throw Error('请至少保留一句录音稿');
 segments.forEach((s,i)=>{
 if(!s.text.trim())throw Error(`第 ${i+1} 行：请填写原文`);
 if(!!s.start!==!!s.end)throw Error(`第 ${i+1} 行：开始和结束时间需同时填写，或同时留空`);
 const start=segmentTime(s.start),end=segmentTime(s.end);
 if(Number.isNaN(start)||Number.isNaN(end))throw Error(`第 ${i+1} 行：时间格式为 00:00.000`);
 if(start!==null&&end<=start)throw Error(`第 ${i+1} 行：结束时间必须晚于开始时间`);
 });
}
function segmentEditRow(s,i){
 const cell=(key,label,type='input')=>`<td>${type==='textarea'?`<textarea class="input" name="seg-${key}-${i}" aria-label="第${i+1}行${label}" ${key==='text'?'required':''}>${esc(s[key]||'')}</textarea>`:`<input class="input" name="seg-${key}-${i}" aria-label="第${i+1}行${label}" value="${esc(s[key]||'')}" ${key==='start'||key==='end'?'placeholder="00:00.000"':''}>`}</td>`;
 return `<tr data-segment="${i}"><td><input type="hidden" name="seg-id-${i}" value="${esc(s.id)}">${i+1}</td>${cell('speaker','说话人')}${cell('text','原文','textarea')}${cell('translation','翻译','textarea')}${cell('start','开始时间')}${cell('end','结束时间')}<td><div class="segment-row-actions"><button class="linkbtn" type="button" data-play-segment>试听</button><button class="linkbtn" type="button" data-adjust-segment>时间调整</button><button class="linkbtn" type="button" data-split-segment>拆分</button><button class="linkbtn" type="button" data-remove-segment aria-label="删除第${i+1}句">删除</button></div></td></tr>`;
}
function segmentTable(segments,editing=false){
 return `<div class="segment-table-scroll"><table class="segment-table"><colgroup><col class="seg-number"><col class="seg-speaker"><col><col><col class="seg-time"><col class="seg-time"><col class="seg-action"></colgroup><thead><tr><th>#</th><th>说话人</th><th>录音稿原文</th><th>翻译</th><th>开始时间</th><th>结束时间</th><th>操作</th></tr></thead><tbody>${segments.map((s,i)=>editing?segmentEditRow(s,i):`<tr><td>${i+1}</td><td>${esc(s.speaker)||'--'}</td><td class="segment-copy">${esc(s.text)||'--'}</td><td class="segment-copy">${esc(s.translation)||'<span class="muted">--</span>'}</td><td class="segment-time">${esc(s.start)||'--'}</td><td class="segment-time">${esc(s.end)||'--'}</td><td><button type="button" class="linkbtn" data-read-play="${i}">试听</button><button type="button" class="linkbtn" data-read-split="${i}">拆分</button></td></tr>`).join('')}</tbody></table></div>`;
}
