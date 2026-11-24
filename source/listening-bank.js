function displayTranscriptMarkup(material){
 const groups=[];
 for(const line of displayTranscript(material).split('\n')){const match=/^(W|M)[:：]\s*(.*)$/.exec(line),speaker=match?.[1]||'',text=match?match[2]:line;const last=groups.at(-1);if(speaker&&last?.speaker===speaker)last.lines.push(text);else groups.push({speaker,lines:[text]})}
 return groups.map(({speaker,lines})=>{if(!speaker)return '<span class="transcript-speech-line">'+esc(lines[0])+'</span>';return '<span class="transcript-speech-group '+speaker.toLowerCase()+'"><span class="transcript-speech-first"><span class="lc-speaker-badge '+speaker.toLowerCase()+'">'+speaker+'</span><span>'+esc(lines[0])+'</span></span>'+(lines.length>1?'<span class="transcript-speech-continuation">'+lines.slice(1).map(line=>'<span class="transcript-speech-line">'+esc(line)+'</span>').join('')+'</span>':'')+'</span>'}).join('');
}
function displayTranscript(material){
 const clean=text=>String(text||'').replace(/^[\s]*[（(]\s*Text\s*\d+\s*[）)]\s*/i,'').trim();
 const segments=material?.segments||[];
 if(segments.some(s=>clean(s.text)))return segments.map(s=>{const text=clean(s.text);if(!text)return '';const speaker=String(s.speaker||'').replace(/[:：]$/,'').trim();return speaker&&!text.startsWith(speaker+':')&&!text.startsWith(speaker+'：')?speaker+': '+text:text}).filter(Boolean).join('\n');
 return clean(material?.text).replace(/\s+(?=(?:W|M|Woman|Man):\s)/g,'\n');
}
'use strict';
let bankMaterialId='',bankSearch='',bankQuestionType='',bankUnit='',bankCategory='',bankPage=1,bankPageSize=10,bookAnalysisSuite='',bookLegacyTasks=false;
function bankData(state=data){return state.listeningBank||{materials:{},questions:{},imports:{}}}
const listeningWorkflowLabels=['素材录入','识别与匹配','分句校对','批量翻译','设置线索句','精听挖空'];
function bankQuestionProgress(q,m=bankData().materials[q.scriptId]||{}){
 const missing=[],add=(stage,text)=>missing.push({stage,text}),segments=m.segments||[],options=q.options||[];
 if(!m.text?.trim())add(1,'缺少录音稿');
 if(!m.audioAssetId&&!m.audioUrl&&!m.builtinAudio)add(2,'缺少音频');
 if(!q.text?.trim()||!options.length||options.some(o=>!o.text?.trim()))add(2,'题干或选项不完整');
 if(!options.some(o=>o.key===q.answerKey||o.text===q.answer||o.key===q.answer))add(2,'未设置答案');
 if(!q.questionType||!bankTagValues(q.examPoints).length||!bankTagValues(q.abilities).length)add(2,'题型、考点或能力未补齐');
 if(!answerAnalysisText(q)?.trim())add(2,'缺少答案解析');
 if(!segments.length||segments.some((x,i)=>!x.text?.trim()||segmentTime(x.start)===null||segmentTime(x.end)===null||segmentTime(x.end)<=segmentTime(x.start)||(i&&segmentTime(x.start)!==segmentTime(segments[i-1].end))))add(3,'分句或时间待校对');
 if([...segments,q,...options].some(x=>x.translation?.trim())&&[...segments,q,...options].some(x=>!x.translation?.trim()||x.translationNeedsReview||x.translationProposal))add(4,'译文缺失或待核对');
 if(q.clueNeedsReview||!q.noDirectClue&&(!(q.clues||[]).length||q.clues.some(c=>{const x=segments.find(x=>x.id===c.segmentId);return c.needsReview||!x||x.text.slice(c.start,c.end)!==c.text})))add(5,'线索句未设置或待核对');
 const blanks=segments.flatMap(x=>(x.clozeBlanks||[]).filter(b=>b.sourceText===x.text&&x.text.slice(b.start,b.end)===b.text));
 if(!blanks.length)add(6,'精听挖空未完成');
 const stage=missing[0]?.stage||6;return {complete:!missing.length,stage,label:missing.length?'待'+listeningWorkflowLabels[stage-1]:'已完成',missing};
}
function listeningSectionStatus(r){
  const questions=r.questions||[],segments=r.segments||[],missing=questions.flatMap(q=>bankQuestionProgress(q,r).missing),notes=r.teachingNotes||[];
  const invalidClue=c=>{const source=segments.find(s=>s.id===c.segmentId);return c.needsReview||!source||source.text.slice(c.start,c.end)!==c.text};
  const clueReview=questions.some(q=>q.clueNeedsReview||(q.clues||[]).some(invalidClue));
  const validClue=questions.some(q=>!q.noDirectClue&&(q.clues||[]).some(c=>!invalidClue(c)));
  const translations=[...segments,...questions.flatMap(q=>[q,...(q.options||[])])];
  const contentReview=translations.some(x=>x.translationNeedsReview||x.translationProposal);
  const clozeReview=!!r.clozeReview?.length||segments.some(s=>s.clozeReview?.length||(s.clozeBlanks||[]).some(b=>b.sourceText!==s.text||s.text.slice(b.start,b.end)!==b.text));
  return {content:contentReview?'待核对':!questions.length||missing.some(x=>x.stage<=4)?'待补充':'',clues:clueReview?'待核对':!validClue||missing.some(x=>x.stage===5)?'待补充':'',analysis:notes.some(n=>n.needsReview)?'待核对':!notes.length?'待补充':'',cloze:clozeReview?'待核对':missing.some(x=>x.stage===6)||!segments.some(s=>s.clozeBlanks?.length)?'待补充':''};
}
function bankProgressMarkup(q){const p=bankQuestionProgress(q);return `<section class="bank-progress"><strong>${esc(p.label)}</strong>${p.complete?'<span>六步内容已齐全</span>':`<ul>${p.missing.map(x=>`<li>第 ${x.stage} 步 · ${esc(x.text)}</li>`).join('')}</ul>`}<button class="linkbtn" data-bank-continue="${esc(q.id)}">${p.complete?'编辑完整流程':'继续完善'}</button></section>`}
function continueBankQuestion(id){const q=bankData().questions[id];if(q)openListeningCreate(true,{materialId:q.scriptId,questionId:id,stage:Math.max(2,bankQuestionProgress(q).stage)})}
function bankClozeMarkup(m){return `<section class="bank-cloze-preview"><h3>精听挖空</h3>${m.noCloze?'<p class="muted">已标记无需挖空</p>':(m.segments||[]).map(x=>{let at=0;const blanks=(x.clozeBlanks||[]).filter(b=>b.sourceText===x.text&&x.text.slice(b.start,b.end)===b.text).sort((a,b)=>a.start-b.start);const text=blanks.map(b=>{const out=esc(x.text.slice(at,b.start))+'<mark>'+esc(b.text)+'</mark>';at=b.end;return out}).join('')+esc(x.text.slice(at));return `<p>${esc(x.speaker||'')} ${text}</p>`}).join('')||'<p class="muted">--</p>'}</section>`}
// Reduce the initial bank import without deleting book content or shared edits.
function preserveExcludedBankContent(state,sourceBook){
 const bank=state.listeningBank;if(!bank)return;
 const suites=builtinBook690.suites.filter(s=>String(s['旧单元id'])==='19392').map(s=>String(s['旧套题id']));
 const scriptIds=new Set(builtinBook690.scripts.filter(s=>suites.includes(String(s['旧套题id']))).map(s=>String(s['旧录音稿id'])));
 const questionIds=new Set(builtinBook690.questions.filter(q=>scriptIds.has(String(q['旧录音稿id']))).map(q=>String(q['旧小题id'])));
 for(const book of state.books){
 const nodes=bookDirectoryNodes(book).filter(n=>n.kind==='套题');
 if(book===sourceBook)for(const id of suites)if(!nodes.some(n=>String(n.sourceSuiteId)===id))nodes.push({id:'suite-'+id,sourceSuiteId:id,kind:'套题'});
 for(const node of nodes)for(const block of suiteBlocks(book,node).filter(b=>b.type==='听力题')){
 const key=block.contentKey||block.id,content=localSuiteContent(book,{id:key,sourceSuiteId:block.sourceSuiteId||node.sourceSuiteId});
 if(!content.questions.some(q=>questionIds.has(q.id)&&bank.questions[q.id])&&!content.scripts.some(m=>scriptIds.has(m.id)&&bank.materials[m.id]))continue;
 book.suiteContent ||= {};
 book.suiteContent[key]={...content,scripts:content.scripts.map(m=>({...m,...structuredClone(bank.materials[m.id]||{})})),questions:content.questions.map(q=>({...q,...structuredClone(bank.questions[q.id]||{}),number:q.number,scriptId:q.scriptId}))};
 if(book.listeningRefs)delete book.listeningRefs[key];
 }
 }
 for(const id of questionIds)delete bank.questions[id];
 for(const id of scriptIds)if(!Object.values(bank.questions).some(q=>q.scriptId===id))delete bank.materials[id];
}
function migrateListening690(state){
 if(state.listeningBank?.imports?.b1u1b1u2?.version>=3)return false;
 const book=state.books.find(b=>String(b.sourceBookId)==='690');if(!book)return false;
 preserveExcludedBankContent(state,book);
 state.listeningBank ||= {materials:{},questions:{},imports:{}};
 const bank=state.listeningBank;bank.imports ||= {};bank.materials ||= {};bank.questions ||= {};book.listeningRefs ||= {};
 const suites=builtinBook690.suites.filter(s=>String(s['旧单元id'])==='19391');
 const nodes=bookDirectoryNodes(book);let materials=0,questions=0;
 for(const source of suites){
 const sourceId=String(source['旧套题id']);
 const linkedNode=nodes.find(n=>n.kind==='套题'&&String(n.sourceSuiteId)===sourceId);
 const node=linkedNode||{id:'suite-'+sourceId,kind:'套题',sourceSuiteId:sourceId};
 for(const block of suiteBlocks(book,node).filter(b=>b.type==='听力题')){
 const key=block.contentKey||block.id,content=localSuiteContent(book,{id:key,sourceSuiteId:block.sourceSuiteId||node.sourceSuiteId});
 if(linkedNode)book.listeningRefs[key]=true;
 for(const script of content.scripts){
 const analyses=builtinBook690.analyses.filter(a=>String(a['旧录音稿id'])===script.id);
 const qs=content.questions.filter(q=>q.scriptId===script.id);
 const assigned=new Set();
 for(const q of qs){
 const rows=analyses.filter(a=>a['题号']!=null&&String(a['题号'])===String(q.number));rows.forEach(a=>assigned.add(a));
 const tag=builtinBook690.tags.find(t=>String(t['小题id'])===q.id);
 const {number,...fields}=structuredClone(q);
 if(!bank.questions[q.id]){bank.questions[q.id]={...fields,category:'普通题',tags:[tag?.['话题'],tag?.['考点'],tag?.['形式']].filter(Boolean),sourceAnalysis:structuredClone(rows),wordIds:[...new Set(rows.map(a=>a['单词id']).filter(Boolean).map(String))]};questions++}
 }
 if(!bank.materials[script.id]){bank.materials[script.id]={...structuredClone(script),unit:source['单元'].split('|')[0],sourceBookId:'690',sourceSuiteId:node.sourceSuiteId,category:'普通题',sourceAnalysis:structuredClone(analyses.filter(a=>!assigned.has(a)))};materials++}
 }
 }
 }
 bank.imports.b1u1b1u2={version:3,bookId:book.id,materials,questions,suiteIds:suites.map(s=>String(s['旧套题id']))};return true;
}
function bankOverlay(book,node,content){
 const bank=bankData();
 return {...content,scripts:content.scripts.map(s=>({...s,...structuredClone(bank.materials[s.id]||{})})),questions:content.questions.map(q=>({...q,...structuredClone(bank.questions[q.id]||{}),scriptId:q.scriptId,number:q.number}))};
}
function syncSuiteToBank(state,book,node,content){
 const bank=bankData(state);
 if(!book.listeningRefs?.[node.id]&&!content.questions.some(q=>bank.questions[q.id])&&!content.scripts.some(s=>bank.materials[s.id]))return;
 book.listeningRefs ||= {};book.listeningRefs[node.id]=true;
 for(const script of content.scripts)bank.materials[script.id]={...bank.materials[script.id],...structuredClone(script)};
 for(const question of content.questions){const {number,...q}=structuredClone(question);bank.questions[q.id]={...bank.questions[q.id],...q}}
}
function bankUsage(materialId,state=data){
 const out=[];
 for(const book of state.books)for(const node of bookDirectoryNodes(book).filter(n=>n.kind==='套题'))for(const block of suiteBlocks(book,node).filter(b=>b.type==='听力题')){
 const key=block.contentKey||block.id;
 const c=localSuiteContent(book,{id:key,sourceSuiteId:block.sourceSuiteId||node.sourceSuiteId});
 if(c.scripts.some(s=>s.id===materialId))out.push({bookId:book.id,bookName:book.name,nodeId:node.id,name:node.name});
 }
 return out;
}
function answerAnalysisText(q){
 if(q.analysisText!==undefined)return q.analysisText;
 const original=typeof builtinBook690!=='undefined'?builtinBook690.questions.find(item=>String(item['旧小题id'])===String(q.id)):null;
 return original?.['解析']||'';
}
function analysisText(item){if(item.analysisText!==undefined)return item.analysisText;return (item.sourceAnalysis||[]).map(a=>[a['解析分类'],a['解析二级分类']||a['标题'],a['凸显'],a['内容/说明']||a['语音现象'],a['例句'],a['例句翻译']].filter(Boolean).join('\n')).join('\n\n')}
function bankQuestions(id){return Object.values(bankData().questions).filter(q=>q.scriptId===id)}
let bankTopic='',bankPoint='',bankBookFilter='',bankMore=false,bankExpanded=[];
function bankTagValues(value){return Array.isArray(value)?value.filter(Boolean):value?[String(value)]:[]}
function bankLabels(q){
 const source=builtinBook690.tags.find(t=>String(t['小题id'])===String(q.id));
 return {topics:bankTagValues(q.topics??bankData().materials[q.scriptId]?.topics??source?.['话题']),points:bankTagValues(q.examPoints??source?.['考点']??(q.tags||[]).filter(t=>t!==source?.['话题']&&t!==source?.['形式']))};
}
function bankReferenceIndex(state=data){
 const index={};
 for(const book of state.books)for(const node of bookDirectoryNodes(book).filter(n=>n.kind==='套题'))for(const block of suiteBlocks(book,node).filter(b=>b.type==='听力题')){
 const key=block.contentKey||block.id,resolved={...node,id:key,ownerSuiteId:node.id,sourceSuiteId:block.sourceSuiteId||node.sourceSuiteId};
 const content=localSuiteContent(book,resolved);
 if(!content.orderingVersion)content.questions.sort((a,b)=>Number(a.number)-Number(b.number));
 const numbered=renumberSuiteContent(content,blockQuestionStart(book,resolved));
 for(const q of numbered.questions){const list=index[q.id] ||= [];if(!list.some(u=>u.bookId===book.id&&u.key===key))list.push({bookId:book.id,bookName:book.name,nodeId:node.id,key,name:node.name,number:q.number});}
 }
 return index;
}
let bankType='短对话';
const bankTypes=['短对话','长对话','独白'];
function bankMaterialType(m){if(bankTypes.includes(m.questionType))return m.questionType;for(const q of bankQuestions(m.id)){const type=q.questionType||(q.tags||[]).find(t=>bankTypes.includes(t))||builtinBook690.tags.find(t=>String(t['小题id'])===String(q.id))?.['形式'];if(bankTypes.includes(type))return type}return m.bankType||'短对话'}
let bankReferences={};
function ensureBankBuiltinAudio(){const missing=Object.values(bankData().materials).filter(m=>!['698','686'].includes(m.sourceBookId)&&!m.audioAssetId&&!m.audioUrl&&!m.builtinAudio);if(missing.length)commitWorkspace(d=>{for(const item of missing){const m=d.listeningBank.materials[item.id];m.builtinAudio=true;m.audioName='内置示例音频.aac'}})}
// One-time preparation of the existing prototype records; subsequent edits are preserved.
function ensureBankDemoCompletion(){
 if(bankData().imports?.completionDemoV1)return;
 commitWorkspace(state=>{
  const bank=state.listeningBank;
  Object.values(bank.materials).forEach((m,index)=>{
   if(['698','686'].includes(m.sourceBookId))return;
   const questions=Object.values(bank.questions).filter(q=>q.scriptId===m.id),segments=m.segments||[];
   if(!questions.length||!segments.length)return;
   m.builtinAudio=!!(m.builtinAudio||!m.audioAssetId&&!m.audioUrl);
   segments.forEach((segment,i)=>{
    if(i)segment.start=segments[i-1].end;
    if(!Number.isFinite(segmentTime(segment.start)))segment.start='00:00.000';
    if(!Number.isFinite(segmentTime(segment.end))||segmentTime(segment.end)<=segmentTime(segment.start)){const end=segmentTime(segment.start)+Math.max(1,segment.text.split(/\s+/).length*0.35);segment.end=String(Math.floor(end/60)).padStart(2,'0')+':'+(end%60).toFixed(3).padStart(6,'0');}
    delete segment.translationNeedsReview;delete segment.translationProposal;
   });
   questions.forEach(q=>{
    const tag=builtinBook690.tags.find(t=>String(t['小题id'])===String(q.id));
    q.questionType ||= tag?.['形式']||m.questionType||'短对话';
    if(!bankTagValues(q.examPoints).length)q.examPoints=[tag?.['考点']||'人物与事件'];
    if(!bankTagValues(q.abilities).length)q.abilities=['能力1'];
    q.answerKey ||= q.options.find(o=>o.text===q.answer||o.key===q.answer)?.key||'A';
    q.answer=q.options.find(o=>o.key===q.answerKey)?.text||q.answer;
    q.analysisText ||= answerAnalysisText(q)||'根据录音内容，正确选项为 '+q.answerKey+'：'+q.answer;
    for(const item of [q,...q.options]){delete item.translationNeedsReview;delete item.translationProposal;}
    if(!(q.clues||[]).length){
     const segment=segments.find(s=>String(s.sourceRow?.['线索句小题id']||'')===String(q.id))||segments.find(s=>s.text.toLowerCase().includes(String(q.answer).replace(/[.!?]$/,'').toLowerCase()))||segments[0];
     const text=segment.sourceRow?.['线索句']&&segment.text.includes(segment.sourceRow['线索句'])?segment.sourceRow['线索句']:segment.text;
     const start=segment.text.indexOf(text);
     q.noDirectClue=index%4===0;
     q.clues=q.noDirectClue?[]:[{segmentId:segment.id,start,end:start+text.length,text}];
     q.clueNeedsReview=index%4===3;
    }
   });
   // Translations remain optional, but partial translations cannot be marked complete.
   const translated=[...segments,...questions.flatMap(q=>[q,...q.options])];
   if(translated.some(x=>!x.translation?.trim()))translated.forEach(x=>x.translation='');
   if(!m.teachingNotes?.length&&index%3!==0){
    const source=segments[0],q=questions[0];
    const explanation=(m.sourceAnalysis||[]).find(a=>a['解析分类']==='微技能'&&a['内容/说明']);
    m.teachingNotes=[{id:'DEMO-NOTE-'+m.id,materialId:m.id,sourceKey:'segment:'+source.id,sourceText:source.text,sourceLabel:'录音稿',text:source.text,start:0,end:source.text.length,category:'微技能',scope:'question',targetQuestionId:q.id,content:explanation?.['内容/说明']||'先阅读题干，明确需要关注的信息，再结合录音中的具体表述判断选项。',needsReview:index%3===2}];
   }
   if(!segments.some(s=>s.clozeBlanks?.length)&&index%4!==0){
    const source=segments[0],match=/[A-Za-z]{4,}/.exec(source.text);
    if(match)source.clozeBlanks=[{id:'DEMO-BLANK-'+m.id,start:match.index,end:match.index+match[0].length,text:match[0],sourceText:source.text}];
    if(index%4===2)m.clozeReview=['请核对示例挖空位置'];
   }
  });
  bank.imports.completionDemoV1=true;
 });
}

// Recording IDs share one numeric sequence; internal audio/segment IDs remain unchanged.
function nextBankMaterialId(state=data){
 const ids=[...Object.keys(bankData(state).materials),...(typeof builtinBook690==='undefined'?[]:builtinBook690.scripts.map(s=>String(s['旧录音稿id']))),...(typeof gaokaoListeningExample==='undefined'?[]:gaokaoListeningExample.materials.map(m=>m.id))];
 const next=Math.max(100000,Number(bankData(state).lastMaterialId)||0,...ids.filter(id=>/^\d+$/.test(id)).map(Number))+1;
 state.listeningBank.lastMaterialId=next;
 return String(next);
}
function normalizeBankMaterialIds(){
 const oldIds=Object.keys(bankData().materials).filter(id=>/^REC-[0-9a-f-]+$/i.test(id));
 if(!oldIds.length)return;
 const mapping={};
 if(commitWorkspace(state=>{
  for(const id of oldIds)mapping[id]=nextBankMaterialId(state);
  const rewrite=value=>{
   if(typeof value==='string')return mapping[value]||value;
   if(Array.isArray(value))return value.map(rewrite);
   if(value&&typeof value==='object'){
    for(const key of Object.keys(value)){
     const nextKey=mapping[key]||key,nextValue=rewrite(value[key]);
     if(nextKey!==key)delete value[key];
     value[nextKey]=nextValue;
    }
   }
   return value;
  };
  rewrite(state);
 })){
  bankMaterialId=mapping[bankMaterialId]||bankMaterialId;
  bankExpanded=bankExpanded.map(id=>mapping[id]||id);
 }
}

function ensureGaokaoListeningExample(){
 if(typeof gaokaoListeningExample==='undefined'||bankData().imports?.gaokao14449)return;
 commitWorkspace(state=>{
  const bank=state.listeningBank;
  for(const m of gaokaoListeningExample.materials)if(!bank.materials[m.id])bank.materials[m.id]=structuredClone(m);
  for(const q of gaokaoListeningExample.questions)if(!bank.questions[q.id])bank.questions[q.id]=structuredClone(q);
  bank.imports.gaokao14449={version:1,...gaokaoListeningExample.source};
 });
}
let bankViewPage='';
function ensureGaokaoPapers(){
 if(bankData().imports?.gaokaoPapersV1)return;
 commitWorkspace(state=>{
  state.listeningBank.papers ||= {};
  state.listeningBank.papers['14449']={id:'14449',year:2023,source:'全国甲、乙卷',materialIds:gaokaoListeningExample.materials.map(m=>m.id)};
  state.listeningBank.imports.gaokaoPapersV1=true;
 });
}
function paperMaterials(paper){return paper.materialIds.map(id=>bankData().materials[id]).filter(Boolean)}
function renderGaokaoPapers(){
 $('#page').innerHTML=workspaceHead('高考真题')+'<section class="bank-question-table" id="gaokao-paper-list"></section>';
 const rows=Object.values(bankData().papers||{}).map(p=>({...p,usage:[...new Map(paperMaterials(p).flatMap(m=>bankUsage(m.id)).map(u=>[u.bookId+'/'+u.nodeId,u])).values()]}));
 BookUI.renderGaokaoPapers($('#gaokao-paper-list'),rows,{onView:viewGaokaoPaper,onEdit:editGaokaoPaper,onDelete:deleteGaokaoPaper});
}
function viewGaokaoPaper(p){
 const materials=paperMaterials(p);
 openContentDialog('真题卷 '+p.id, '<p class="muted">'+esc(p.year+'年 · '+p.source)+'</p>'+materials.map((m,i)=>'<section class="bank-analysis-group"><h3>录音稿 '+(i+1)+' · '+esc(m.id)+'</h3><p class="bank-analysis-text">'+displayTranscriptMarkup(m)+'</p>'+bankQuestions(m.id).map(q=>'<article class="bank-question"><strong>'+esc(q.number+'. '+q.text)+'</strong>'+q.options.map(o=>'<p>'+esc(o.key+'. '+o.text)+'</p>').join('')+'<p class="question-answer">答案：'+esc(q.answerKey||q.answer)+'</p></article>').join('')+'</section>').join(''),'<button class="btn" data-close>关闭</button>');
}
function editGaokaoPaper(p){
 openContentDialog('编辑真题卷','<form id="gaokao-paper-form"><label class="field"><span>真题卷 ID</span><input class="input" value="'+esc(p.id)+'" readonly></label><label class="field"><span>年份</span><input class="input" name="year" type="number" min="1900" max="2100" required value="'+p.year+'"></label><label class="field"><span>试卷名称</span><input class="input" name="source" required value="'+esc(p.source)+'"></label><p class="error" id="gaokao-paper-error"></p></form>','<button class="btn" data-close>取消</button><button class="btn primary" form="gaokao-paper-form">保存</button>');
 $('#gaokao-paper-form').onsubmit=e=>{
  e.preventDefault();const form=new FormData(e.target),year=Number(form.get('year')),source=String(form.get('source')).trim();
  if(!Number.isInteger(year)||year<1900||year>2100||!source){$('#gaokao-paper-error').textContent='请填写有效年份和试卷名称';return;}
  if(commitWorkspace(state=>Object.assign(state.listeningBank.papers[p.id],{year,source}))){closeDialog();renderListeningBank()}
 };
}
function deleteGaokaoPaper(p){
 if(bankPaperHasReferences(p.id)){toast('此真题卷正在被引用，请先解除引用');return}
 openContentDialog('删除真题卷','<p>确认删除真题卷 '+esc(p.id)+'（'+esc(p.year+'年 '+p.source)+'）？</p><p class="muted">仅删除真题卷记录，听力录音稿和小题仍保留在听力列表中。</p>','<button class="btn" data-close>取消</button><button class="btn danger" id="gaokao-paper-delete">确认删除</button>');
 $('#gaokao-paper-delete').onclick=()=>{if(bankPaperHasReferences(p.id)){toast('此真题卷正在被引用，请先解除引用');return}if(commitWorkspace(state=>{delete state.listeningBank.papers[p.id]})){closeDialog();renderListeningBank()}};
}

function renderListeningBank(){
 if(bankViewPage!==page){bankViewPage=page;bankMaterialId='';bankSearch=bankQuestionType=bankTopic='';bankPage=1;}

 ensureBankBuiltinAudio();
 disposeRecordingAudio();if(window.BookUI)window.BookUI.disposeTable();
 if(bankMaterialId&&bankData().materials[bankMaterialId]){renderBankMaterial(bankMaterialId);return}
 ensureListeningBankImport();ensureGaokaoListeningExample();ensureGaokaoPapers();normalizeBankMaterialIds();ensureBankDemoCompletion();bankReferences=bankReferenceIndex();
 if(page==='gaokao-bank'){renderGaokaoPapers();return;}
 bankUnit=bankCategory=bankPoint=bankBookFilter='';
 $('#page').innerHTML=workspaceHead(page==='gaokao-bank'?'高考真题':'听力题库','<button class="btn primary" id="bank-batch-add">批量新增听力题</button>')+`<section class="bank-search-page">${bankImportError?`<div class="bank-import-status" role="status">${esc(bankImportError)}<button class="linkbtn" id="bank-retry-import">重试</button></div>`:''}<form class="bank-searchbar" id="bank-search-form"><div id="bank-search-control"></div></form><div class="bank-question-table" id="bank-list"></div><div class="table-foot" id="bank-pagination"></div></section>`;
 if(bankImportError)$('#bank-retry-import').onclick=()=>{ensureListeningBankImport();renderListeningBank()};
 $('#bank-batch-add').onclick=()=>openListeningCreate(true);
 window.BookUI.renderBankSearch($('#bank-search-control'),{value:bankSearch,onSearch:value=>{bankSearch=value;bankPage=1;drawBankList()}});
 $('#bank-search-form').onsubmit=e=>{e.preventDefault();bankSearch=$('#bank-search').value;bankPage=1;drawBankList()};
 drawBankList();
}
function bankFilteredQuestions(){
 const needle=bankSearch.trim().toLowerCase();return Object.values(bankData().questions).filter(q=>{
 const m=bankData().materials[q.scriptId]||{},labels=bankLabels(q);
 return (page!=='gaokao-bank'||['高考题','高考真题'].includes(m.category))&&(!bankQuestionType||bankMaterialType(m)===bankQuestionType)&&(!bankTopic||[...bankTagValues(m.topics),...bankQuestions(m.id).flatMap(q=>bankLabels(q).topics)].includes(bankTopic))&&(!bankPoint||labels.points.includes(bankPoint))&&(!bankBookFilter||(bankReferences[q.id]||[]).some(u=>u.bookId===bankBookFilter))&&(!bankUnit||m.unit===bankUnit)&&(!bankCategory||q.category===bankCategory)&&(!needle||[m.id,m.text].join(' ').toLowerCase().includes(needle));
 });
}
function bankFilteredMaterials(latest=false){const matching=new Set(bankFilteredQuestions().map(q=>q.scriptId));const unfiltered=![bankQuestionType,bankTopic,bankPoint,bankBookFilter,bankUnit,bankCategory,bankSearch].some(Boolean);return Object.values(bankData().materials).filter(m=>(page!=='gaokao-bank'||['高考题','高考真题'].includes(m.category))&&(latest||matching.has(m.id)||unfiltered&&!bankQuestions(m.id).length)).map(original=>{const version=latest?listeningLatestVersion(original.id):1,resolved=listeningVersionSource(original.id,version),m=resolved.material;const questions=resolved.questions.map(q=>({...q,points:bankLabels(q).points,progress:bankQuestionProgress(q)}));const missing=[...new Map(questions.flatMap(q=>q.progress.missing).map(x=>[x.stage+':'+x.text,x])).values()].sort((a,b)=>a.stage-b.stage);if(!questions.length)missing.push({stage:2,text:'未录入小题'});return {...m,version,versionLabel:m.id+'·V'+version+(version===listeningLatestVersion(m.id)?'（最新）':''),paperReferences:Object.values(bankData().papers||{}).filter(p=>p.materialIds.includes(m.id)).map(p=>({id:p.id,name:p.year+' '+p.source})),sectionStatus:listeningSectionStatus({...m,questions}),questionType:bankMaterialType(m),topics:[...new Set([...bankTagValues(m.topics),...questions.flatMap(q=>bankLabels(q).topics)])],scriptId:m.id,questions,progress:{complete:!missing.length,label:missing.length?'待'+listeningWorkflowLabels[missing[0].stage-1]:'已完成',missing},points:[...new Set(questions.flatMap(q=>bankLabels(q).points))],usage:[...new Map(questions.flatMap(q=>bankReferences[q.id]||[]).map(u=>[u.bookId+'/'+u.key,u])).values()]}}).filter(m=>!latest||((!bankSearch||[m.id,m.text].join(' ').toLowerCase().includes(bankSearch.trim().toLowerCase()))&&(!bankQuestionType||m.questionType===bankQuestionType)&&(!bankTopic||m.topics.includes(bankTopic))))}
function bankVersionRows(row){
 const build=version=>{const source=listeningVersionSource(row.id,version),m=source.material,questions=source.questions.map(q=>({...q,points:bankLabels(q).points,progress:bankQuestionProgress(q)}));return {...row,...m,version,versionLabel:listeningRevisionLabel(row.id,null,data,version),questions,questionType:bankMaterialType(m),topics:[...new Set([...bankTagValues(m.topics),...questions.flatMap(q=>bankLabels(q).topics)])],sectionStatus:listeningSectionStatus({...m,questions}),paperReferences:version===1?Object.values(bankData().papers||{}).filter(p=>p.materialIds.includes(row.id)).map(p=>({id:p.id,name:p.year+' '+p.source})):[],usage:[...new Map(questions.flatMap(q=>bankReferences[q.id]||[]).filter(u=>listeningRevisionNumber(row.id,u.bookId)===version).map(u=>[u.bookId+'/'+u.key,u])).values()]}};
 return {...build(row.version),historyVersions:listeningVersionNumbers(row.id).filter(v=>v<row.version).map(v=>({...build(v),isHistorical:true,rowKey:row.id+'::V'+v}))};
}
function drawBankList(){
 const rows=bankFilteredMaterials(true),pages=Math.max(1,Math.ceil(rows.length/bankPageSize));bankPage=Math.min(bankPage,pages);
 const count=`${rows.length} 篇录音稿 · ${rows.reduce((n,m)=>n+m.questions.length,0)} 道小题`;
 const shown=rows.slice((bankPage-1)*bankPageSize,bankPage*bankPageSize).map(bankVersionRows),open=m=>{bankMaterialId=m.id;renderListeningBank()};
 if(window.BookUI?.renderBankTable)window.BookUI.renderBankTable($('#bank-list'),shown,{filters:{questionType:bankQuestionType,topics:bankTopic},filterOptions:{questionType:bankTypes,topics:[...new Set(Object.values(bankData().materials).flatMap(m=>[...bankTagValues(m.topics),...bankQuestions(m.id).flatMap(q=>bankLabels(q).topics)]))].filter(Boolean)},onFilter:filters=>{bankQuestionType=filters.questionType?.[0]||'';bankTopic=filters.topics?.[0]||'';bankPage=1;drawBankList()},expanded:bankExpanded,onExpand:ids=>bankExpanded=ids,onOpen:open,onView:m=>openListeningCreate(true,{materialId:m.id,version:m.version,stage:2,readOnly:true}),onEdit:m=>openListeningCreate(true,{materialId:m.id,version:m.version,stage:2}),onVersions:m=>showListeningVersions(m.id),onDelete:m=>deleteBankMaterial(m.id),onReference:u=>{const book=data.books.find(b=>b.id===u.bookId);if(!book||!bookDirectoryNodes(book).some(n=>n.id===u.nodeId)){toast('引用位置已不存在');return;}page='books';activeBook=u.bookId;bookSection='目录与题目';selectedDirectory=u.nodeId;render();selectedDirectory=u.nodeId;renderBookDirectory(book,$('#book-section'))}});
 else {$('#bank-list').innerHTML=shown.map(m=>`<article><button class="linkbtn" data-bank-open="${esc(m.id)}">${displayTranscriptMarkup(m)}</button></article>`).join('')||'<div class="empty">--</div>';$('#bank-list').querySelectorAll('[data-bank-open]').forEach(b=>b.onclick=()=>open({id:b.dataset.bankOpen}))}
 window.BookUI.renderBankPagination($('#bank-pagination'),{summary:count,total:rows.length,current:bankPage,pageSize:bankPageSize,onChange:(next,size)=>{bankPage=size!==bankPageSize?1:next;bankPageSize=size;drawBankList()}});
}
function editBankAnalyses(id){const m=bankData().materials[id],questions=bankQuestions(id);openContentDialog('编辑解析',`<form id="bank-analyses-form"><label class="field"><span>录音稿解析</span><textarea class="input" name="material" rows="4">${esc(analysisText(m))}</textarea></label>${questions.map((q,i)=>`<label class="field"><span>小题 ${i+1} · ${esc(q.text)}</span><textarea class="input" name="${esc(q.id)}" rows="3">${esc(analysisText(q))}</textarea></label>`).join('')}<p class="error" id="bank-analyses-error"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" form="bank-analyses-form">保存</button>`);$('#bank-analyses-form').onsubmit=e=>{e.preventDefault();const values=new FormData(e.target);if(commitWorkspace(d=>{d.listeningBank.materials[id].analysisText=values.get('material');for(const q of questions)d.listeningBank.questions[q.id].analysisText=values.get(q.id)})){closeDialog();renderListeningBank()}else $('#bank-analyses-error').textContent='保存失败，请重试'}}
function deleteBankMaterial(id){
 if(bankMaterialHasReferences(id)){toast('此录音稿正在被引用，请先解除引用');return}
 const questions=bankQuestions(id);
 openContentDialog('删除录音稿',`<p>将删除此录音稿及其 ${questions.length} 道小题。</p><p class="error" id="bank-delete-error"></p>`,`<button class="btn" data-close>取消</button><button class="btn danger" id="bank-delete-submit">确认删除</button>`);
 $('#bank-delete-submit').onclick=()=>{if(bankMaterialHasReferences(id)){toast('此录音稿正在被引用，请先解除引用');return}if(commitWorkspace(d=>{for(const q of bankQuestions(id))removeBankQuestion(d,q.id);delete d.listeningBank.materials[id]})){closeDialog();bankMaterialId='';bankExpanded=bankExpanded.filter(x=>x!==id);renderListeningBank()}else $('#bank-delete-error').textContent='保存失败，请重试'};
}
function removeBankQuestion(state,id){
 for(const book of state.books)for(const node of bookDirectoryNodes(book).filter(n=>n.kind==='套题'))for(const block of suiteBlocks(book,node).filter(b=>b.type==='听力题')){
 const key=block.contentKey||block.id,content=localSuiteContent(book,{id:key,sourceSuiteId:block.sourceSuiteId||node.sourceSuiteId});
 if(!content.questions.some(q=>q.id===id))continue;
 if(!content.orderingVersion)content.questions.sort((a,b)=>Number(a.number)-Number(b.number));
 content.questions=content.questions.filter(q=>q.id!==id);book.suiteContent ||= {};book.suiteContent[key]=renumberSuiteContent(content,blockQuestionStart(book,{id:key,ownerSuiteId:node.id}));
 }
 delete state.listeningBank.questions[id];
}
function deleteBankQuestion(id){
 const referenced=()=>{const q=bankData().questions[id];return (bankReferenceIndex()[id]||[]).length>0||(q&&bankMaterialHasReferences(q.scriptId))};
 if(referenced()){toast('此试题正在被引用，请先解除引用');return}
 openContentDialog('删除试题','<p>确认从听力题库删除这道试题？</p><p class="error" id="bank-delete-error"></p>','<button class="btn" data-close>取消</button><button class="btn danger" id="bank-delete-submit">确认删除</button>');
 $('#bank-delete-submit').onclick=()=>{if(referenced()){toast('此试题正在被引用，请先解除引用');return}if(commitWorkspace(d=>removeBankQuestion(d,id))){closeDialog();bankMaterialId='';renderListeningBank()}else $('#bank-delete-error').textContent='保存失败，请重试'};
}
function bankQuestionMarkup(q,analysisOnly=false){return `<article class="bank-question"><div class="row between"><strong>${esc(q.text)}</strong>${analysisOnly?'':`<button class="linkbtn" data-bank-edit-question="${esc(q.id)}">编辑</button>`}</div>${analysisOnly?'':bankProgressMarkup(q)}${q.translation?`<p class="muted">${esc(q.translation)}</p>`:''}${(q.options||[]).map(o=>`<p>${esc(o.key)}. ${esc(o.text)} ${o.translation?`<span class="muted">${esc(o.translation)}</span>`:''}</p>`).join('')}<p class="question-answer">答案：${esc(q.answer)}</p><div class="row bank-tags"><span class="content-type-pill listening">${esc(q.category||'普通题')}</span>${(q.tags||[]).map(t=>`<span class="pill">${esc(t)}</span>`).join('')}</div>${analysisOnly?'':`<div class="bank-clue-preview"><strong>线索句</strong><p>${q.noDirectClue?'无直接线索':(q.clues||[]).map(c=>esc(c.text)).join('；')||'--'}</p></div>`}<div class="row between"><strong>解析</strong><button class="linkbtn" data-bank-analysis="${esc(q.id)}">编辑解析</button></div><p class="bank-analysis-text">${esc(analysisText(q)||'--')}</p></article>`}
function bindBankAnalysis(host,refresh){host.querySelectorAll('[data-bank-analysis]').forEach(b=>b.onclick=()=>editSharedAnalysis('questions',b.dataset.bankAnalysis,refresh))}
function bankSegmentTable(segments){return segmentTable(segments).replace('<col class="seg-action">','').replace('<th>操作</th>','').replace(/<td><button type="button" class="linkbtn" data-read-play=[^]*?<\/td>/g,'')}
function renderBankMaterial(id){
 disposeRecordingAudio();
 const m=bankData().materials[id],usage=bankUsage(id);
 $('#page').innerHTML=workspaceHead('录音稿 '+id,'<button class="btn" id="bank-back">返回听力题库</button><button class="btn" id="bank-edit-material">编辑录音稿</button>')+`<section class="panel workspace-body"><div class="table-scroll">${m.segments?.length?bankSegmentTable(m.segments):`<p class="bank-analysis-text">${esc(displayTranscript(m)||'--')}</p>`}</div><div class="bank-audio"><audio controls id="bank-audio-player"></audio><span class="muted">${esc(m.audioName||'')}</span></div><div class="row between"><h3>录音稿解析</h3><button class="linkbtn" id="bank-material-analysis">编辑解析</button></div><p class="bank-analysis-text">${esc(analysisText(m)||'--')}</p><div class="row between bank-questions-heading"><h2>小题</h2><button class="btn" id="bank-add-question">新增小题</button></div>${bankQuestions(id).map(q=>bankQuestionMarkup(q)).join('')}${bankClozeMarkup(m)}<details class="bank-usage"><summary>使用情况 · ${usage.length}</summary>${usage.map(u=>`<p>${esc(u.bookName)} / ${esc(u.name)}</p>`).join('')}</details></section>`;
 $('#bank-back').onclick=()=>{bankMaterialId='';renderListeningBank()};$('#bank-edit-material').onclick=()=>openListeningCreate(true,{materialId:id,stage:2});$('#bank-add-question').onclick=()=>editBankQuestion(null,id);
 $('#page').querySelectorAll('[data-bank-edit-question]').forEach(b=>b.onclick=()=>continueBankQuestion(b.dataset.bankEditQuestion));
 $('#page').querySelectorAll('[data-bank-continue]').forEach(b=>b.onclick=()=>continueBankQuestion(b.dataset.bankContinue));
 bindBankAnalysis($('#page'),()=>renderBankMaterial(id));$('#bank-material-analysis').onclick=()=>editSharedAnalysis('materials',id,()=>renderBankMaterial(id));
 const player=$('#bank-audio-player'),audioState={player,url:null,disposed:false};recordingAudio=audioState;if(m.audioUrl)player.src=m.audioUrl;else if(m.builtinAudio)player.src='data:audio/aac;base64,'+listeningDemo.audio;
 if(m.audioAssetId)audioFileStore(m.audioAssetId).then(blob=>{if(!blob||audioState.disposed||!player.isConnected)return;audioState.url=URL.createObjectURL(blob);player.src=audioState.url}).catch(()=>{});
}
function editSharedAnalysis(collection,id,refresh){
 const item=bankData()[collection][id];
 openContentDialog('编辑解析',`<form id="bank-analysis-form"><textarea class="input bank-analysis-input" name="analysis" aria-label="解析内容">${esc(analysisText(item))}</textarea><p class="error" id="bank-analysis-error"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" form="bank-analysis-form">保存</button>`);
 $('#bank-analysis-form').onsubmit=e=>{e.preventDefault();if(commitWorkspace(d=>{d.listeningBank[collection][id].analysisText=new FormData(e.target).get('analysis')})){closeDialog();refresh()}else $('#bank-analysis-error').textContent='保存失败，请重试'};
}
function editBankQuestion(id,materialId){
 const q=bankData().questions[id]||{id:typeof nextBusinessId==='function'?nextBusinessId('questions'):'Q-'+crypto.randomUUID(),scriptId:materialId,options:['A','B','C'].map(key=>({key,text:'',translation:''})),category:'普通题',tags:[]};
 openContentDialog(id?'编辑小题':'新增小题',`<form id="bank-question-form">${suiteTextField('题干','text',q.text,true)}${suiteTextField('翻译','translation',q.translation)}${q.options.map(o=>suiteTextField('选项 '+o.key,'option'+o.key,o.text,true)+suiteTextField('选项翻译 '+o.key,'translation'+o.key,o.translation)).join('')}<label class="field"><span>答案</span><select class="input" name="answer">${opts(q.options.map(o=>[o.key,o.key]),q.options.find(o=>o.text===q.answer||o.key===q.answer)?.key||'A')}</select></label><label class="field"><span>标签</span><select class="input" name="category">${opts(['普通题','高考题','高考改编题'].map(x=>[x,x]),q.category||'普通题')}</select></label><label class="field"><span>考点 / 话题</span><input class="input" name="tags" value="${esc((q.tags||[]).join('，'))}"></label><p class="error" id="bank-question-error"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" form="bank-question-form">保存</button>`);
 $('#bank-question-form').onsubmit=e=>{e.preventDefault();try{const v=Object.fromEntries(new FormData(e.target));if(!v.text.trim()||q.options.some(o=>!v['option'+o.key].trim()))throw Error('请填写题干和选项');const next={...q,text:v.text.trim(),translation:v.translation,category:v.category,tags:v.tags.split(/[,，]/).map(t=>t.trim()).filter(Boolean),options:q.options.map(o=>({...o,text:v['option'+o.key].trim(),translation:v['translation'+o.key]}))};next.answer=next.options.find(o=>o.key===v.answer).text;if(!commitWorkspace(d=>{d.listeningBank.questions[next.id]=next}))throw Error('保存失败，请重试');closeDialog();renderBankMaterial(materialId)}catch(err){$('#bank-question-error').textContent=err.message}};
}
function editBankMaterial(id){
 const m=bankData().materials[id]||{id:nextBankMaterialId(),segments:[blankSegment()],category:'普通题'};
 openContentDialog(id?'编辑录音稿':'新增录音稿',`<form id="bank-material-form"><div class="table-scroll">${segmentTable(m.segments||[],true)}</div><button class="linkbtn" type="button" id="bank-add-segment">新增句子</button><label class="field"><span>音频</span><input type="file" id="bank-audio-file" accept="audio/*"></label><label class="field"><span>音频地址</span><input class="input" name="audioUrl" type="url" value="${esc(m.audioUrl||'')}"></label><p class="error" id="bank-material-error"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" id="bank-material-save" form="bank-material-form">保存</button>`);
 const form=$('#bank-material-form');$('#bank-add-segment').onclick=()=>form.querySelector('tbody').insertAdjacentHTML('beforeend',segmentEditRow(blankSegment(),Math.max(-1,...Array.from(form.querySelectorAll('[data-segment]')).map(r=>Number(r.dataset.segment)))+1).replace(/<button[^>]*data-(?:play-segment|adjust-segment|split-segment)[^>]*>[^]*?<\/button>/g,''));
 form.onclick=e=>{const remove=e.target.closest('[data-remove-segment]');if(remove)remove.closest('[data-segment]').remove()};
 // The bank editor owns plain segment fields; audio timing/splitting remains available in book editing.
 form.querySelectorAll('[data-play-segment],[data-adjust-segment],[data-split-segment]').forEach(b=>b.remove());
 form.onsubmit=async e=>{e.preventDefault();const button=$('#bank-material-save'),error=$('#bank-material-error');button.disabled=true;try{
 const segments=Array.from(form.querySelectorAll('[data-segment]')).map(readSegmentRow);validateScriptSegments(segments);if(!segments.some(s=>s.text.trim()))throw Error('请填写录音稿');
 const next={...m,segments,text:segments.map(s=>(s.speaker?s.speaker+': ':'')+s.text).join('\n'),translation:segments.map(s=>s.translation).join('\n'),audioUrl:new FormData(form).get('audioUrl')};
 if(next.audioUrl&&!/^https?:\/\//i.test(next.audioUrl))throw Error('请输入 HTTP 或 HTTPS 音频地址');
 const file=$('#bank-audio-file').files[0];if(file){if(file.size>50*1024*1024)throw Error('音频不能超过 50 MB');next.audioAssetId='AUDIO-'+crypto.randomUUID();await audioFileStore(next.audioAssetId,file);next.audioName=file.name;next.audioUrl=''}else if(next.audioUrl!==m.audioUrl)next.audioAssetId='';
 if(!form.isConnected)return;
 if(!commitWorkspace(d=>{d.listeningBank ||= {materials:{},questions:{},imports:{}};d.listeningBank.materials[next.id]=next}))throw Error('保存失败，请重试');closeDialog();bankMaterialId=next.id;renderListeningBank();
 }catch(err){error.textContent=err.message}finally{button.disabled=false}};
}
function renderBookSharedAnalyses(book,target){
 const nodes=bookDirectoryNodes(book).filter(n=>n.kind==='套题'&&book.listeningRefs?.[n.id]);if(!nodes.some(n=>n.id===bookAnalysisSuite))bookAnalysisSuite=nodes[0]?.id;
 const node=nodes.find(n=>n.id===bookAnalysisSuite),content=node?rawSuiteContent(book,node):{scripts:[],questions:[]};
 target.innerHTML=`<div class="row between"><select class="filter" id="book-analysis-suite" aria-label="套题">${opts(nodes.map(n=>[n.id,n.name]),bookAnalysisSuite)}</select><button class="linkbtn" id="book-legacy-tasks">编写任务</button></div>${content.scripts.map(m=>`<section class="bank-analysis-group"><div class="row between"><h3>录音稿 ${esc(m.id)}</h3><button class="linkbtn" data-material-analysis="${esc(m.id)}">编辑录音稿解析</button></div><details><summary>录音稿</summary><p class="bank-analysis-text">${displayTranscriptMarkup(m)}</p></details><p class="bank-analysis-text">${esc(analysisText(bankData().materials[m.id]||m)||'--')}</p>${content.questions.filter(q=>q.scriptId===m.id).map(q=>bankQuestionMarkup(q,true)).join('')}</section>`).join('')}`;
 const refresh=()=>renderBookSharedAnalyses(data.books.find(b=>b.id===book.id),target);
 $('#book-analysis-suite').onchange=e=>{bookAnalysisSuite=e.target.value;refresh()};$('#book-legacy-tasks').onclick=()=>{bookLegacyTasks=true;render()};bindBankAnalysis(target,refresh);
 target.querySelectorAll('[data-material-analysis]').forEach(b=>b.onclick=()=>editSharedAnalysis('materials',b.dataset.materialAnalysis,refresh));
}
let bankImportPending=false,bankImportError='';
function ensureListeningBankImport(){
 if(data.listeningBank?.imports?.b1u1b1u2?.version>=3&&!bankImportPending)return;
 try{
 const next=structuredClone(data);migrateListening690(next);
 if(!next.listeningBank?.imports?.b1u1b1u2)throw Error('未找到 690 数据');
 // Imported content remains visible even if the local storage quota is exhausted.
 data=next;
 try{persistAppData(next);bankImportPending=false;bankImportError=''}
 catch(error){bankImportPending=true;bankImportError=error.name==='QuotaExceededError'?'本地存储空间不足，题库尚未保存':error.name==='SecurityError'?'浏览器禁止本地存储，题库尚未保存':'题库保存失败，请重试';console.warn('Listening bank import persistence failed:',error.name)}
 }catch(error){bankImportError='导入失败，请重试';console.warn('Listening bank import failed:',error.message)}
}
ensureListeningBankImport();

if(page==='listening-bank')renderListeningBank();

// Referenced recordings and questions cannot be deleted, including references from standalone resources.
function bankMaterialHasReferences(id){
 const lib=typeof resourceStore==='function'?resourceStore():null;
 return bankUsage(id).length>0||[...Object.values(lib?.suites||{}),...Object.values(bankData().papers||{})].some(r=>r.materialIds?.includes(id))||Object.values(lib?.practices||{}).some(r=>r.materialId===id);
}
function bankPaperHasReferences(id){return typeof resourceUses==='function'&&resourceUses('papers',id).length>0}

function openListeningReferencePicker(excluded,onConfirm){
 const versions={};
 const references=bankReferenceIndex();
 const rows=Object.values(bankData().materials).map(m=>{const questions=bankQuestions(m.id).map(q=>({...q,points:bankLabels(q).points,progress:bankQuestionProgress(q)}));const missing=questions.flatMap(q=>q.progress.missing);return {...m,questionType:bankMaterialType(m),topics:[...new Set([...bankTagValues(m.topics),...questions.flatMap(q=>bankLabels(q).topics)])],questions,sectionStatus:listeningSectionStatus({...m,questions}),progress:{complete:!missing.length,label:missing.length?'待完善':'已完成',missing},usage:questions.flatMap(q=>references[q.id]||[]),paperReferences:[]}});
 let selected=[];
 openDialog('引用听力题库','<div id="lc-bank-picker"></div><div id="lc-bank-versions"></div>','<button class="btn" data-close>取消</button><button class="btn primary" id="lc-bank-confirm" disabled>确定引用</button>');
 const dialog=document.querySelector('#dialog'),confirm=document.querySelector('#lc-bank-confirm');
 const dispose=BookUI.renderBankReferencePicker(document.querySelector('#lc-bank-picker'),{rows,excluded,onSelection:ids=>{selected=ids;confirm.disabled=!ids.length;const host=document.querySelector('#lc-bank-versions');host.innerHTML=ids.map(id=>`<label class="field"><span>录音稿 ${esc(id)} · 引用版本</span><select class="input" data-reference-version="${esc(id)}">${listeningVersionNumbers(id).map(v=>`<option value="${v}" ${(versions[id]||listeningLatestVersion(id))===v?'selected':''}>${esc(listeningRevisionLabel(id,null,data,v))}</option>`).join('')}</select></label>`).join('');host.querySelectorAll('[data-reference-version]').forEach(el=>el.onchange=()=>versions[el.dataset.referenceVersion]=Number(el.value));}});
 let disposed=false;const cleanup=()=>{if(!disposed){disposed=true;dispose()}};
 dialog.addEventListener('close',cleanup,{once:true});
 confirm.onclick=()=>{if(!selected.length)return;cleanup();closeDialog();onConfirm(selected,Object.fromEntries(selected.map(id=>[id,versions[id]||listeningLatestVersion(id)])))};
 dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',cleanup,{once:true}));
}

function listeningVersionNumbers(id){return [...new Set([1,...Object.keys(data.listeningRevisions?.[id]||{}).map(Number)])].sort((a,b)=>b-a)}
function showListeningVersions(id){
 openDialog('录音稿 '+id+' · 历史版本',`<div class="listening-version-history">${listeningVersionNumbers(id).map(v=>{const source=listeningVersionSource(id,v),record=data.listeningRevisions?.[id]?.[v],books=listeningRevisionAffected(id,v);return `<section><h3>${esc(listeningRevisionLabel(id,null,data,v))}</h3><p class="muted">${record?.at?esc(bookFlowTime(record.at)):'初始版本'} · ${source.questions.length} 道小题</p><p>${esc(displayTranscript(source.material))}</p><button class="linkbtn" data-version-preview="${v}">查看此版本</button><h4>引用书籍（${books.length}）</h4>${books.length?`<table><thead><tr><th>书籍ID</th><th>书籍名称</th><th>版本</th><th>发布状态</th></tr></thead><tbody>${books.map(b=>`<tr><td>${esc(b.id)}</td><td>${esc(b.name)}</td><td>${esc(bookValue(b,'version'))}</td><td>${esc(bookPublicationStatus(b))}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">暂无书籍引用</p>'}</section>`}).join('')}</div>`,'<button class="btn" data-close>关闭</button>');
 document.querySelectorAll('[data-version-preview]').forEach(b=>b.onclick=()=>{const version=Number(b.dataset.versionPreview);closeDialog();openListeningCreate(true,{materialId:id,version,stage:2,readOnly:true})});
}
