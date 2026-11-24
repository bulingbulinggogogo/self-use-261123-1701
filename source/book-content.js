'use strict';
let builtinSuite='',builtinScript='';
const builtinId='BK-SOURCE-690';
// Built-in content must remain visible even when browser persistence is unavailable.
const builtin690Defaults=buildBuiltin690Defaults();
function buildBuiltin690Defaults(){
 const b=builtinBook690.book,date='2026-09-29';
 const book={id:builtinId,sourceBookId:'690',name:b['产品名称'],bookType:'听力书籍',subject:'英语',grade:b['年级分类'],version:b['版本'],textbookVersion:b['教材版本'],count:13,status:'草稿',date,wordIds:[]};
 const tasks=[],words=[];
 for(const s of builtinBook690.suites)for(const kind of ['解析编写','录音稿与翻译']){
 const sid=String(s['旧套题id']);const sourceCount=(kind==='解析编写'?builtinBook690.analyses:builtinBook690.timeline).filter(a=>String(a['旧套题id'])===sid).length;
 tasks.push({id:'SRC690-'+sid+'-'+(kind==='解析编写'?'analysis':'translation'),bookId:book.id,sourceSuiteId:sid,name:s['套题名']+' · '+kind,suite:s['套题名'],kind,ownerId:'',reviewerId:'',status:'待分配',content:'',translation:'',history:[],sourceCount,date});
 }
 for(const w of builtinBook690.words){const wid=String(w['单词id']),id='SOURCE-WORD-'+wid;
 words.push({id,sourceWordId:wid,word:w['单词'],pos:[...new Set(builtinBook690.pos.filter(p=>String(p['单词id'])===wid).map(p=>p['词性']).filter(Boolean))].join(' / '),meaning:builtinBook690.meanings.filter(m=>String(m['单词id'])===wid).map(m=>m['中文释义']).filter(Boolean).join('；')});
 book.wordIds.push(id);
 }
 return {books:[book],tasks,words};
}
function hydrateBuiltin690(target){
 target.editorial ||= {tasks:[],words:[]};
 const overrides=target.builtin690Overrides||{};
 for(const key of ['books','tasks','words']){
 const rows=key==='books'?target.books:target.editorial[key];
 const patches=new Map((overrides[key]||[]).map(x=>[x.id,x]));
 for(const base of builtin690Defaults[key]){
 const existing=rows.find(x=>x.id===base.id);
 if(!existing)rows.push({...structuredClone(base),...patches.get(base.id)});
 }
 }
 target.builtin690Version=1;
}
function compactBuiltinData(value){
 const out={...value,editorial:{...value.editorial},builtin690Overrides:{}};
 for(const key of ['books','tasks','words']){
 const bases=new Map(builtin690Defaults[key].map(x=>[x.id,x]));
 const rows=key==='books'?value.books:(value.editorial?.[key]||[]),custom=[],patches=[];
 for(const row of rows){const base=bases.get(row.id);if(!base){custom.push(row);continue}
 const patch={id:row.id};for(const [field,v] of Object.entries(row))if(JSON.stringify(v)!==JSON.stringify(base[field]))patch[field]=v;
 if(Object.keys(patch).length>1)patches.push(patch);
 }
 if(key==='books')out.books=custom;else out.editorial[key]=custom;
 out.builtin690Overrides[key]=patches;
 }
 return out;
}
hydrateBuiltin690(data);
function sourceText(s){return esc(String(s||'').replace(/<\/(?:p|div)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' '))}
function renderBuiltinContent(book,target){
 const source=builtinBook690;
 if(!source.suites.some(s=>String(s['旧套题id'])===builtinSuite))builtinSuite=String(source.suites[0]['旧套题id']);
 const scripts=source.scripts.filter(s=>String(s['旧套题id'])===builtinSuite);
 if(!scripts.some(s=>String(s['旧录音稿id'])===builtinScript))builtinScript=String(scripts[0]['旧录音稿id']);
 const script=scripts.find(s=>String(s['旧录音稿id'])===builtinScript);
 const questions=source.questions.filter(q=>String(q['旧录音稿id'])===builtinScript);
 const timeline=source.timeline.filter(t=>String(t['旧录音稿id'])===builtinScript);
 const analyses=source.analyses.filter(a=>String(a['旧录音稿id'])===builtinScript);
 target.innerHTML=`<p class="muted" style="margin-bottom:16px">13 个单元 · 40 套题 · 400 篇录音稿 · 800 道小题 · 1,291 条解析。以下为 Excel 原始数据，空白翻译标记为待补充。</p><div class="row" style="flex-wrap:wrap;margin-bottom:20px"><label>单元 / 套题 <select class="filter" id="source-suite">${opts(source.suites.map(s=>[String(s['旧套题id']),s['单元']+' / '+s['套题名']]),builtinSuite)}</select></label><label>录音稿 <select class="filter" id="source-script">${opts(scripts.map((s,i)=>[String(s['旧录音稿id']),'Text '+(i+1)+' · '+s['旧录音稿id']]),builtinScript)}</select></label></div><h3>录音稿</h3><p class="muted">音频：${esc(script['音频'])} · ${esc(script['音频类型'])}（未内置音频文件）</p><div class="detail-box" style="white-space:pre-wrap">${sourceText(script['旧录音稿'])}</div><h3 style="margin:24px 0 12px">逐句翻译与时间轴</h3><div class="table-scroll"><table style="white-space:normal"><thead><tr><th>说话人</th><th>原文</th><th>中文翻译</th><th>开始 / 结束</th></tr></thead><tbody>${timeline.map(t=>`<tr><td>${esc(t['录音人'])}</td><td style="min-width:240px">${sourceText(t['录音稿'])}</td><td style="min-width:200px">${t['录音稿翻译']?sourceText(t['录音稿翻译']):'<span class="muted">待补充</span>'}</td><td style="white-space:nowrap">${esc(t['开始时间'])}<br>${esc(t['结束时间'])}</td></tr>`).join('')}</tbody></table></div><h3 style="margin:24px 0 12px">小题与标签</h3>${questions.map(q=>{const tag=source.tags.find(t=>String(t['小题id'])===String(q['旧小题id']));const clues=source.clues.filter(c=>String(c['线索句小题id'])===String(q['旧小题id']));return `<div class="detail-box"><strong>${esc(q['题号'])}. ${sourceText(q['题干'])}</strong><p class="muted">${sourceText(q['题干翻译'])}</p>${['A','B','C'].map(k=>`<p>${k}. ${sourceText(q['选项'+k])} <span class="muted">${sourceText(q['选项'+k+'翻译'])}</span></p>`).join('')}<p>答案：${sourceText(q['答案'])}</p><p class="muted">${esc([tag?.['形式'],tag?.['体裁'],tag?.['话题'],tag?.['考点']].filter(Boolean).join(' · '))}</p>${clues.map(c=>`<p>线索句：${sourceText(c['线索句'])}</p>`).join('')}</div>`}).join('')}<h3 style="margin:24px 0 12px">听力解析（${analyses.length} 条）</h3>${analyses.length?analyses.map(a=>{const meaning=source.meanings.find(m=>String(m['释义id'])===String(a['释义id']));return `<div class="detail-box"><strong>${esc(a['解析分类'])} · ${esc(a['解析二级分类']||a['标题']||'')}</strong><p class="muted">关联位置：${esc(a['分类']||'整篇')} ${a['题号']?'· 第 '+esc(a['题号'])+' 题':''}</p><p style="white-space:pre-wrap">${sourceText(a['凸显']||a['标题'])}</p>${meaning?`<p>${sourceText(meaning['中文释义'])}</p>`:''}<p style="white-space:pre-wrap">${sourceText(a['内容/说明']||a['语音现象'])}</p>${a['例句']?`<p>${sourceText(a['例句'])}<br>${sourceText(a['例句翻译'])}</p>`:''}</div>`}).join(''):'<p class="muted">该录音稿暂无解析记录。</p>'}`;
 $('#source-suite').onchange=e=>{builtinSuite=e.target.value;builtinScript='';renderBuiltinContent(book,target)};
 $('#source-script').onchange=e=>{builtinScript=e.target.value;renderBuiltinContent(book,target)};
}
