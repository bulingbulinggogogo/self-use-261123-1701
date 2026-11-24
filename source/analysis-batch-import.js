'use strict';
// Parse labelled paragraphs without silently discarding unrecognised text.
function parseAnalysisBatch(raw){
 const aliases={录音稿:'recording',录音稿ID:'materialId',题号:'question',小题:'question',小题ID:'questionId',类型:'type',分类:'category',二级:'subcategory',二级分类:'subcategory',原文:'source',凸显:'highlight',标题:'title',内容:'content',说明:'content',点拨:'content',解析:'content',词条:'word',词性:'pos',释义:'meaning',单词ID:'wordId',词性ID:'posId',释义ID:'meaningId',内容模式:'mode',引用ID:'interactiveId'};
 const text=String(raw||'').trim();if(!text)throw Error('请先粘贴解析点拨文本');
 if(text.startsWith('[')){let values;try{values=JSON.parse(text)}catch{throw Error('JSON 格式有误，请检查后重试')}if(!Array.isArray(values)||!values.length)throw Error('请输入非空点拨数组');return values.map((value,i)=>({item:value&&typeof value==='object'&&!Array.isArray(value)?value:{},raw:JSON.stringify(value,null,2),index:i+1}));}
 const blocks=[];let block=[];
 for(const line of text.split(/\r?\n/)){const clean=line.trim().replace(/^\*\*|\*\*$/g,'').replace(/^[·•*-]\s*/,'');if(/^分类[：:]/.test(clean)&&block.some(l=>/分类[：:]/.test(l))){blocks.push(block);block=[]}block.push(line)}if(block.length)blocks.push(block);
 return blocks.map((lines,i)=>{const item={},invalid=[];let field='';for(const original of lines){const line=original.trim().replace(/^\*\*|\*\*$/g,'').replace(/^[·•*-]\s*/,'');if(!line||/^---+$/.test(line))continue;
 const recording=line.match(/^录音稿\s*(\d+)\s*[/／]?$/);if(recording){item.recording=recording[1];field='recording';continue}
 const word=line.match(/^单词表[：:]\s*(.*)$/);if(word){if(item.meaningId!==undefined)invalid.push('单词表重复');item.meaningId=word[1].trim();if(!/^\d+$/.test(item.meaningId))invalid.push('单词表必须填写释义ID，例如：单词表：23456');continue}
 const m=line.match(/^([^：:]{1,12})[：:]\s*(.*)$/),key=m&&aliases[m[1].trim()];if(key){if(item[key]!==undefined)invalid.push('字段重复：'+m[1]);item[key]=m[2];field=key}else if(field==='content')item.content+='\n'+original;else invalid.push(original)
 }return {item,raw:lines.join('\n').trim(),index:i+1,parseError:invalid.length?'无法识别文本：'+invalid.join('；'):''}});
}

function matchAnalysisBatch(entries,records){
 const matched=[],unmatched=[],pending=new Map();let qno=0;
 const sources=records.flatMap((record,ri)=>{const base={record,recording:ri+1};return [...(record.segments?.length?record.segments.map((s,i)=>({...base,key:'segment:'+s.id,label:'录音稿 '+(ri+1)+' · 第 '+(i+1)+' 句',text:s.text||''})):[{...base,key:'transcript',label:'录音稿 '+(ri+1),text:record.text||''}]),...(record.questions||[]).flatMap(q=>{const number=++qno;return [{...base,key:'question:'+q.id,label:'第 '+number+' 题 · 题干',text:q.text||'',questionId:q.id,question:number},...(q.options||[]).map(o=>({...base,key:'option:'+q.id+':'+o.key,label:'第 '+number+' 题 · 选项 '+o.key,text:o.text||'',questionId:q.id,question:number}))]})]});
 const norm=s=>String(s||'').trim().replace(/[’‘]/g,"'").toLowerCase();
 for(const entry of entries){try{
  const v=entry.item;if(entry.parseError)throw Error(entry.parseError);
  const category=String(v.category||'').trim(),subcategory=String(v.subcategory||'').trim();if(!['词汇','语音','实用表达','语法','微技能','话题词汇','百科知识'].includes(category))throw Error('缺少有效的点拨分类');
  if(analysisSubcategories[category]&&!analysisSubcategories[category].includes(subcategory))throw Error('缺少有效的二级分类');
  const highlight=String(v.highlight||v.source||'').trim();if(!highlight)throw Error('缺少用于匹配的原文或凸显文本');
  const type=String(v.type||'').trim().toUpperCase();if(type&&!['录音稿','题干','A','B','C','D'].includes(type))throw Error('类型应填写录音稿、题干或单个选项字母');
  const questionRecord=v.question?sources.find(s=>s.question===Number(v.question))?.record:null;
  const candidates=[];for(const source of sources){if(type==='录音稿'&&(!['segment:','transcript'].some(k=>source.key.startsWith(k))||v.question&&source.record!==questionRecord))continue;if(type==='题干'&&!source.key.startsWith('question:'))continue;if(/^[A-D]$/.test(type)&&(!source.key.startsWith('option:')||!source.key.endsWith(':'+type)))continue;if(v.materialId&&String(source.record.materialId)!==String(v.materialId)||v.recording&&source.recording!==Number(v.recording)||v.questionId&&String(source.questionId)!==String(v.questionId)||v.question&&type!=='录音稿'&&source.question!==Number(v.question))continue;if(v.source&&!source.text.includes(String(v.source)))continue;let at=source.text.indexOf(highlight);while(at>=0){candidates.push({...source,start:at,end:at+highlight.length});at=source.text.indexOf(highlight,at+1)}}
  if(!candidates.length)throw Error('当前套题中找不到对应原文');if(candidates.length!==1)throw Error('匹配到 '+candidates.length+' 处原文，请补充录音稿、题号或更完整的原文');
  const source=candidates[0],groupNote=['百科知识','话题词汇','微技能'].includes(category);
  const note={id:'NOTE-'+crypto.randomUUID(),materialId:source.record.materialId,category,subcategory,title:String(v.title||highlight),content:String(v.content||''),text:highlight,sourceKey:source.key,sourceText:source.text,sourceLabel:source.label,start:source.start,end:source.end,scope:groupNote?(category==='微技能'&&source.questionId?'question':'material'):'fragment',groupNote,needsReview:false,explanationEnabled:true,mode:v.mode||analysisModes[category]?.[0],targetQuestionId:source.questionId||''};
  if(groupNote){note.sourceKey=category==='微技能'&&source.questionId?'question:'+source.questionId:'material';note.targetQuestionId=category==='微技能'&&source.questionId?source.questionId:'';note.start=0;note.end=0}
  if(v.interactiveId)note.interactiveId=String(v.interactiveId);
  if(!note.content.trim()&&!analysisNeedsWord(note))throw Error('缺少点拨内容');
  if(analysisNeedsWord(note)&&v.meaningId){
   const meaning=vocabularyTable('meanings')[String(v.meaningId)];if(!meaning)throw Error('找不到释义ID：'+v.meaningId);
   Object.assign(note,{wordId:meaning.wordId,posId:meaning.posId,meaningId:meaning.id});if(!vocabularySelectionValid(note))throw Error('该释义的词条或词性已失效');
  }
  const needsSelection=analysisNeedsWord(note)&&!v.meaningId;
  const invalid=needsSelection?'':validateAnalysisNote(note);if(invalid)throw Error(invalid);
  note.explanationEnabled=!!note.content.trim();

  const existing=[...(source.record.teachingNotes||[]),...(pending.get(source.record)||[])];if(existing.some(n=>n.category===category&&(groupNote?n.groupNote&&n.scope===note.scope&&n.targetQuestionId===note.targetQuestionId&&n.title===note.title:n.sourceKey===note.sourceKey&&!n.groupNote&&n.start<note.end&&note.start<n.end)))throw Error('与已有或本次导入的同分类点拨重复/凸显范围重叠');
  if(!pending.has(source.record))pending.set(source.record,[]);pending.get(source.record).push(note);matched.push({record:source.record,note,entry});
 }catch(error){unmatched.push({...entry,reason:error.message})}}
 return {matched,unmatched};
}
function openAnalysisBatchImport({getRecords,onImported}){
 const dialog=document.createElement('dialog');dialog.className='dialog analysis-batch-dialog';dialog.setAttribute('aria-label','批量录入解析点拨');document.body.append(dialog);let text='',result=null;
 const close=()=>{dialog.close();dialog.remove()};
 function apply(){// Recheck against the current drafts before an atomic append.
  const checked=matchAnalysisBatch(result.matched.map(m=>m.entry),getRecords());if(checked.unmatched.length){result={matched:checked.matched,unmatched:[...result.unmatched,...checked.unmatched]};draw();return}
  checked.matched.forEach(({record,note})=>{record.teachingNotes ||= [];record.teachingNotes.push(note)});const count=checked.matched.length;close();onImported(count,checked.matched[0]?.note);
 }
 function draw(){dialog.innerHTML=dialogHeaderHTML('批量录入解析点拨')+`<div class="dialog-body">${!result?`<label class="field"><span>解析点拨文本</span><textarea class="input" id="analysis-batch-text" placeholder="·分类：词汇&#10;·二级：重难点词汇&#10;·录音稿1/&#10;·题号：1&#10;·类型：C&#10;·凸显：indoors&#10;·内容：&#10;单词表：23456">${esc(text)}</textarea></label>`:`<p>已匹配 ${result.matched.length} 条，未匹配 ${result.unmatched.length} 条</p><label class="field"><span>未匹配明细</span><textarea class="input" id="analysis-batch-details" readonly>${esc(result.unmatched.map(e=>'第 '+e.index+' 条：'+e.reason+'\n'+e.raw).join('\n\n'))}</textarea></label><button class="btn" id="analysis-batch-copy">复制未匹配明细</button>`}<p role="status" id="analysis-batch-status"></p></div><footer><button class="btn" data-cancel>取消导入</button>${result?'<button class="btn" id="analysis-batch-back">返回修改</button>':''}<button class="btn primary" id="analysis-batch-confirm" ${result&&!result.matched.length?'disabled':''}>${result?'确认导入匹配项（'+result.matched.length+'）':'确认导入'}</button></footer>`;
 dialog.querySelector('[data-close]').onclick=close;dialog.querySelector('[data-cancel]').onclick=close;dialog.querySelector('#analysis-batch-back')?.addEventListener('click',()=>{result=null;draw()});dialog.querySelector('#analysis-batch-confirm').onclick=()=>{try{if(result)return apply();text=dialog.querySelector('#analysis-batch-text').value;result=matchAnalysisBatch(parseAnalysisBatch(text),getRecords());if(!result.unmatched.length)apply();else draw()}catch(e){dialog.querySelector('#analysis-batch-status').textContent=e.message}};
 dialog.querySelector('#analysis-batch-copy')?.addEventListener('click',async()=>{const area=dialog.querySelector('#analysis-batch-details');try{await navigator.clipboard.writeText(area.value);dialog.querySelector('#analysis-batch-status').textContent='已复制未匹配明细'}catch{area.focus();area.select();dialog.querySelector('#analysis-batch-status').textContent='未能自动复制，明细已选中，请按 Ctrl/Cmd+C 复制'}});
 }dialog.addEventListener('cancel',e=>{e.preventDefault();close()});draw();dialog.showModal();
}
