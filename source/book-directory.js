'use strict';
const collapsedBookDirectories=new Set();
function bookDirectoryNodes(book){
 if(Array.isArray(book.directoryNodes))return book.directoryNodes;
 if(book.sourceBookId==='690')return builtinBook690.units.flatMap(u=>[{id:'unit-'+u['旧单元id'],parentId:'',name:u['单元'],kind:'目录'},...builtinBook690.suites.filter(s=>String(s['旧单元id'])===String(u['旧单元id'])).map(s=>({id:'suite-'+s['旧套题id'],parentId:'unit-'+u['旧单元id'],name:s['套题名'],kind:'套题',sourceSuiteId:String(s['旧套题id'])}))]);
 return [];
}
function directoryDescendants(nodes,id){const ids=new Set([id]);let more=true;while(more){more=false;for(const n of nodes)if(ids.has(n.parentId)&&!ids.has(n.id)){ids.add(n.id);more=true}}return ids}
function updateDirectoryNode(nodes,id,values){const result=structuredClone(nodes);if(!values.name.trim())throw Error('请填写目录名称');if(values.parentId&&!nodes.some(n=>n.id===values.parentId))throw Error('上级目录不存在');if(values.parentId&&nodes.find(n=>n.id===values.parentId)?.kind!=='目录')throw Error('套题下不能创建目录或套题');if(id&&directoryDescendants(nodes,id).has(values.parentId))throw Error('不能移动到自身或子目录下');const item=result.find(n=>n.id===id);if(id&&!item)throw Error('目录不存在');if(item)Object.assign(item,values,{name:values.name.trim()});else result.push({...values,name:values.name.trim(),id:'DIR-'+crypto.randomUUID(),kind:'目录'});return result}
let selectedDirectory='';
const BOOK_DIRECTORY_ROOT='__book_root__';
function directoryContentRows(book,parentId){return bookDirectoryNodes(book).filter(n=>n.parentId===parentId&&n.kind!=='目录')}
function contentTypeName(kind){return ({套题:'听力套题',单词表:'词汇表'})[kind]||kind}
function contentTypePill(kind){return `<span class="content-type-pill ${kind==='套题'?'listening':kind==='单词表'?'words':'practice'}">${esc(contentTypeName(kind))}</span>`}
function renderBookDirectory(book,target,showTree=false){
 const nodes=bookDirectoryNodes(book);let chosen=nodes.find(n=>n.id===selectedDirectory);
 if(!showTree&&chosen?.kind==='套题'){renderSuiteEditor(book,chosen,target);return}
 if(!showTree&&chosen&&chosen.kind!=='目录'){renderStandaloneBlock(book,chosen,target);return}
 if(chosen&&chosen.kind!=='目录'){selectedDirectory=chosen.parentId||BOOK_DIRECTORY_ROOT;chosen=nodes.find(n=>n.id===selectedDirectory)}
 if(!chosen){selectedDirectory=BOOK_DIRECTORY_ROOT;chosen=null}
 const parentId=chosen?.id||'';
 const pen='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/></svg>',trash=icon('trash');
 const actions=n=>`<div class="directory-row-actions"><details class="directory-add-menu"><summary aria-label="新增目录">${icon('plus')}</summary><div class="directory-add-popover"><button type="button" data-create-dir="${esc(n.parentId)}" data-after-dir="${esc(n.id)}">新增同级目录</button><button type="button" data-create-dir="${esc(n.id)}">新增子目录</button></div></details><button class="linkbtn" data-rename-dir="${esc(n.id)}" aria-label="重命名目录">${pen}</button><button class="linkbtn directory-delete" data-delete-dir="${esc(n.id)}" aria-label="删除目录">${trash}</button></div>`;
 function tree(parent='',depth=0){return nodes.filter(n=>n.parentId===parent).map(n=>{
 const isDir=n.kind==='目录',children=isDir&&nodes.some(c=>c.parentId===n.id),collapsed=collapsedBookDirectories.has(n.id);
 if(!isDir)return `<div class="book-tree-row content-tree-row" data-content-node="${esc(n.id)}" style="padding-left:${48+depth*24}px"><span class="book-tree-label">${icon(n.kind==='套题'?'headphones':n.kind==='单词表'?'dictionary':'file')}<span>${esc(n.name)}</span></span></div>`;
 return `<div class="book-tree-row ${n.id===selectedDirectory?'selected':''}" data-directory-row="${esc(n.id)}" style="padding-left:${8+depth*24}px"><div class="directory-row-main"><button type="button" class="directory-drag-handle" draggable="true" aria-label="拖动${esc(n.name)}调整层级，Alt 加上下方向键排序">⠿</button><button class="tree-toggle" data-dir-toggle="${esc(n.id)}" ${children?`aria-expanded="${!collapsed}"`:'disabled'} aria-label="${collapsed?'展开':'折叠'}${esc(n.name)}">${children?'<svg class="icon tree-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>':''}</button><button class="book-tree-label" data-dir-select="${esc(n.id)}" ${n.id===selectedDirectory?'aria-current="true"':''}>${directoryTypeIcon('目录')}<span>${esc(n.name)}</span></button>${n.id===selectedDirectory?actions(n):''}</div></div>${children&&!collapsed?`<div class="directory-children" style="--branch-left:${22+depth*24}px">${tree(n.id,depth+1)}</div>`:''}`
 }).join('')}
 if(window.BookUI)window.BookUI.disposeTable();
 target.classList.add('directory-split-host');
 target.innerHTML=`<div class="book-directory-layout"><aside class="book-directory-sidebar"><div class="directory-tree-heading"><h3><button class="directory-heading-button" data-dir-select="${BOOK_DIRECTORY_ROOT}">书籍目录</button></h3><button class="linkbtn" id="add-root-directory" aria-label="新增一级目录">${icon('plus')}</button></div><div class="book-directory-tree">${tree()}</div></aside><section class="book-directory-content" id="directory-questions"></section></div>`;
 bindDirectorySorting(book,target);
 const fresh=()=>data.books.find(b=>b.id===book.id);
 $('#add-root-directory').onclick=()=>beginInlineDirectory(book.id,'','',target);
 target.querySelectorAll('[data-create-dir]').forEach(b=>b.onclick=()=>beginInlineDirectory(book.id,b.dataset.createDir,b.dataset.afterDir||'',target));
 target.querySelectorAll('[data-rename-dir]').forEach(b=>b.onclick=()=>{beginInlineRename(book.id,b.dataset.renameDir,target)});
 target.querySelectorAll('[data-delete-dir]').forEach(b=>b.onclick=()=>deleteDirectoryFromTree(book.id,b.dataset.deleteDir,target));
 target.querySelectorAll('[data-dir-toggle]').forEach(b=>b.onclick=()=>{if(!guardSuiteNavigation())return;const id=b.dataset.dirToggle;collapsedBookDirectories.has(id)?collapsedBookDirectories.delete(id):collapsedBookDirectories.add(id);renderBookDirectory(fresh(),target,true)});
 target.querySelectorAll('[data-dir-select]').forEach(b=>b.onclick=()=>{if(!guardSuiteNavigation())return;selectedDirectory=b.dataset.dirSelect;renderBookDirectory(fresh(),target,true)});
 const path=[];let p=chosen;while(p){path.unshift(p.name);p=nodes.find(n=>n.id===p.parentId)}
 const rows=directoryContentRows(book,parentId),host=$('#directory-questions');
 host.innerHTML=`<div class="directory-content-header"><p class="muted directory-content-breadcrumb">${esc(path.join(' / ')||'本书目录')}</p><div class="directory-content-toolbar"><button class="btn primary" data-create-content="套题">${icon('plus')}新增听力套题</button><button class="btn" data-create-content="单词表">${icon('plus')}新增词汇表</button><button class="btn" data-create-content="精听挖空">${icon('plus')}新增精听挖空</button></div></div><div class="table-scroll directory-content-table"><table><tbody>${rows.length?rows.map(n=>`<tr data-content-row="${esc(n.id)}"><td><div class="content-name-cell"><button type="button" class="content-drag-handle" draggable="true" aria-label="拖动排序${esc(n.name)}">⠿</button><span class="content-name-text">${esc(n.name)}</span>${contentTypePill(n.kind)}</div></td><td><div class="content-row-actions"><button class="linkbtn" data-open-content="${esc(n.id)}">查看</button><button class="linkbtn" data-edit-content="${esc(n.id)}">编辑</button><button class="linkbtn content-delete-button" data-delete-content="${esc(n.id)}" aria-label="删除${esc(n.name)}">删除</button></div></td></tr>`).join(''):'<tr><td colspan="2" class="directory-content-empty">当前目录暂无内容，请通过上方按钮新增。</td></tr>'}</tbody></table></div>`;
 if(window.BookUI)window.BookUI.renderTable(host.querySelector('.directory-content-table'),rows);
 bindContentSorting(book,target,host);
 host.querySelectorAll('[data-edit-content]').forEach(b=>b.onclick=()=>editBookContentName(book.id,b.dataset.editContent,target));
 host.querySelectorAll('[data-create-content]').forEach(b=>b.onclick=()=>addBookContent(book.id,parentId,b.dataset.createContent,target));
 host.querySelectorAll('[data-delete-content]').forEach(b=>b.onclick=()=>deleteBookSuite(book.id,b.dataset.deleteContent,target));
 host.querySelectorAll('[data-open-content]').forEach(b=>b.onclick=()=>{if(!guardSuiteNavigation())return;selectedDirectory=b.dataset.openContent;renderBookDirectory(fresh(),target)});
}
function appendDirectory(nodes,name,parentId='',afterId=''){
 name=name.trim();if(!name)throw Error('请输入目录名称');if(name.length>150)throw Error('名称不能超过 150 个字符');
 if(parentId&&!nodes.some(n=>n.id===parentId&&n.kind==='目录'))throw Error('上级目录不存在');
 if(nodes.some(n=>n.parentId===parentId&&n.name===name))throw Error('同级名称已存在');
 const next=structuredClone(nodes),node={id:'DIR-'+crypto.randomUUID(),name,parentId,kind:'目录'},index=next.findIndex(n=>n.id===afterId&&n.parentId===parentId&&n.kind==='目录');
 if(index>=0)next.splice(index+1,0,node);else next.push(node);return {nodes:next,node};
}
function beginInlineDirectory(bookId,parentId,afterId,target){
 if(!guardSuiteNavigation())return;
 const book=data.books.find(b=>b.id===bookId);collapsedBookDirectories.delete(parentId);renderBookDirectory(book,target,true);
 const anchor=Array.from(target.querySelectorAll('[data-directory-row]')).find(r=>r.dataset.directoryRow===(afterId||parentId));
 const html='<form id="inline-directory-form" class="inline-directory-form"><label class="sr-only" for="inline-directory-name">目录名称</label><input id="inline-directory-name" class="input" name="name" required maxlength="150" placeholder="输入目录名称"><button class="linkbtn" type="submit">保存</button><button class="linkbtn" type="button" id="cancel-inline-directory">取消</button><p class="error" id="inline-directory-error" role="alert"></p></form>';
 if(anchor)anchor.insertAdjacentHTML('afterend',html);else target.querySelector('.book-directory-tree').insertAdjacentHTML('afterbegin',html);
 const form=$('#inline-directory-form');suiteDraft={form,initial:JSON.stringify(Object.fromEntries(new FormData(form))),location:{page,activeBook,bookSection,bookType}};
 $('#cancel-inline-directory').onclick=()=>{if(guardSuiteNavigation())renderBookDirectory(data.books.find(b=>b.id===bookId),target,true)};
 form.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();$('#cancel-inline-directory').click()}};
 form.onsubmit=e=>{e.preventDefault();try{const result=appendDirectory(bookDirectoryNodes(data.books.find(b=>b.id===bookId)),new FormData(form).get('name'),parentId,afterId);if(!commitWorkspace(d=>{d.books.find(b=>b.id===bookId).directoryNodes=result.nodes}))throw Error('保存失败，输入已保留，请重试');suiteDraft=null;selectedDirectory=result.node.id;renderBookDirectory(data.books.find(b=>b.id===bookId),target,true);toast('目录已新增')}catch(error){$('#inline-directory-error').textContent=error.message}};
 $('#inline-directory-name').focus();
}
function renderDirectoryQuestions(book,nodes,chosen,target){
 if(!chosen){target.innerHTML=emptyWorkspace('请选择或创建目录','左侧选择目录后，这里展示目录、套题、单词表和点拨学案。');return}
 if(chosen.kind==='目录'){
 const children=nodes.filter(n=>n.parentId===chosen.id);
 target.innerHTML=`<div class="row between"><h2>${esc(chosen.name)}</h2><button class="linkbtn" id="batch-in-directory">批量创建</button></div><div class="directory-child-list">${children.length?children.map(n=>`<button class="directory-child-item" data-open-child="${esc(n.id)}">${directoryTypeIcon(n.kind)}<span>${esc(n.name)}</span><small class="muted">${n.kind||'目录'}</small></button>`).join(''):emptyWorkspace('暂无下级目录或套题','点击批量创建，添加本目录下的内容。')}</div>`;
 $('#batch-in-directory').onclick=()=>batchBookDirectory(book.id,chosen.id);
 target.querySelectorAll('[data-open-child]').forEach(b=>b.onclick=()=>{selectedDirectory=b.dataset.openChild;renderBookDirectory(book,$('#book-section'))});return;
 }
 const scope=directoryDescendants(nodes,chosen.id),suiteIds=new Set(nodes.filter(n=>scope.has(n.id)&&n.sourceSuiteId).map(n=>n.sourceSuiteId));
 const scripts=book.sourceBookId==='690'?builtinBook690.scripts.filter(s=>suiteIds.has(String(s['旧套题id']))):[];
 const scriptIds=new Set(scripts.map(s=>String(s['旧录音稿id']))),questions=book.sourceBookId==='690'?builtinBook690.questions.filter(q=>scriptIds.has(String(q['旧录音稿id']))):[];
 target.innerHTML=`<div class="row between" style="margin-bottom:20px"><h2>${esc(chosen.name)}</h2><span class="muted">${scripts.length} 篇录音稿 · ${questions.length} 道小题</span></div>${scripts.length?scripts.map((s,i)=>{const sid=String(s['旧录音稿id']),qs=questions.filter(q=>String(q['旧录音稿id'])===sid);return `<article class="recording-group"><header class="row between"><div><h3>录音稿 ${i+1} <small class="muted">ID：${esc(sid)}</small></h3><p class="muted">${esc(s['套题名'])} · ${qs.length} 道小题</p></div><button class="linkbtn" data-recording-details="${esc(sid)}">翻译与解析</button></header><p class="recording-audio muted">音频：${esc(s['音频'])}（文件未内置）</p><details class="recording-transcript"><summary>查看录音稿原文</summary><div style="white-space:pre-wrap;padding-top:12px">${sourceText(s['旧录音稿'])}</div></details><div class="recording-questions">${qs.map(q=>`<section class="recording-question"><strong>${esc(q['题号'])}. ${sourceText(q['题干'])}</strong>${q['题干翻译']?`<p class="muted">${sourceText(q['题干翻译'])}</p>`:''}<div class="question-options">${['A','B','C'].map(k=>`<p>${k}. ${sourceText(q['选项'+k])}</p>`).join('')}</div><p class="question-answer">答案：${sourceText(q['答案'])}</p></section>`).join('')}</div></article>`}).join(''):emptyWorkspace('该套题暂无题目','此套题尚未关联录音稿和小题。')}`;
 target.querySelectorAll('[data-recording-details]').forEach(b=>b.onclick=()=>{const s=builtinBook690.scripts.find(s=>String(s['旧录音稿id'])===b.dataset.recordingDetails);builtinSuite=String(s['旧套题id']);builtinScript=String(s['旧录音稿id']);openDialog('录音稿翻译与解析','<div id="recording-source-detail"></div>','<button class="btn" data-close>关闭</button>');renderBuiltinContent(book,$('#recording-source-detail'))});
}
function editBookDirectory(bookId,id=null,parentId=''){
 const book=data.books.find(b=>b.id===bookId),nodes=bookDirectoryNodes(book),item=nodes.find(n=>n.id===id);if(item)parentId=item.parentId;
 const excluded=id?directoryDescendants(nodes,id):new Set();
 const choices=[['','一级目录']];
 function walk(parent,depth){for(const n of nodes.filter(n=>n.parentId===parent)){if(!excluded.has(n.id)&&n.kind==='目录')choices.push([n.id,'　'.repeat(depth)+n.name]);walk(n.id,depth+1)}}walk('',0);
 openDialog(id?(item.kind==='套题'?'修改套题':'修改目录'):'新增目录',`<form id="directory-form">${field('目录名称','name',item?.name||'')}<label class="field"><span>上级目录</span><select class="input" name="parentId">${opts(choices,parentId)}</select></label><p class="error" id="directory-error"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" form="directory-form">保存</button>`);
 $('#directory-form').onsubmit=e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target));try{const updated=updateDirectoryNode(nodes,id,values);if(commitWorkspace(d=>{d.books.find(b=>b.id===bookId).directoryNodes=updated})){collapsedBookDirectories.delete(values.parentId);closeDialog();render();toast('目录已保存')}}catch(error){$('#directory-error').textContent=error.message}};
}

function directoryTypeIcon(kind){return kind==='套题'?'<span class="directory-type-icon" aria-hidden="true">▤</span>':'<svg class="directory-type-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 5h6l2 2h8v10H2zM2 5V3h6l2 2h8v2"/></svg>'}
function parseDirectoryBatch(text,parentId='',existing=[]){
 if(parentId&&!existing.some(n=>n.id===parentId&&n.kind==='目录'))throw Error('请选择有效的上级目录');
 const result=[],stack=[];
 String(text).split(/\r?\n/).forEach((line,index)=>{
 if(!line.trim())return;
 const prefix=line.match(/^[\t ]*/)[0];
 const normalized=prefix.replace(/ {4}/g,'\t');
 if(normalized.includes(' '))throw Error(`第 ${index+1} 行：请使用 Tab 或每级 4 个空格缩进`);
 const depth=normalized.length;
 if(depth>stack.length)throw Error(`第 ${index+1} 行：层级不能跳级，请先创建上级目录`);
 let name=line.trim(),kind='目录';
 if(/^\[套题\]/.test(name)){kind='套题';name=name.slice(4).trim()}
 if(!name)throw Error(`第 ${index+1} 行：请填写名称`);
 if(name.length>150)throw Error(`第 ${index+1} 行：名称不能超过 150 个字符`);
 const parent=depth?stack[depth-1]:null;
 if(parent?.kind==='套题')throw Error(`第 ${index+1} 行：套题“${parent.name}”下不能再创建目录或套题`);
 const node={id:'batch-'+index,parentId:parent?.id||parentId,name,kind,depth,line:index+1};
 if([...existing,...result].some(n=>n.parentId===node.parentId&&n.name===name))throw Error(`第 ${index+1} 行：同级名称“${name}”已存在`);
 result.push(node);stack[depth]=node;stack.length=depth+1;
 });
 return result;
}
function transformDirectoryLines(text,start,end,action){
 const from=text.lastIndexOf('\n',Math.max(0,start-1))+1;
 const last=end>start&&text[end-1]==='\n'?end-1:end;
 let to=text.indexOf('\n',last);if(to<0)to=text.length;
 const lines=text.slice(from,to).split('\n').map(line=>{
 if(action==='indent')return '\t'+line;
 if(action==='outdent')return line.replace(/^(\t| {1,4})/,'');
 if(!line.trim())return line;
 const prefix=line.match(/^[\t ]*/)[0],name=line.slice(prefix.length).replace(/^\[套题\]\s*/,'');
 return prefix+(action==='suite'?'[套题] ':'')+name;
 });
 const block=lines.join('\n');return {text:text.slice(0,from)+block+text.slice(to),start:from,end:from+block.length};
}
function batchBookDirectory(bookId,parentId=''){
 const book=data.books.find(b=>b.id===bookId);if(!book)return;
 const nodes=bookDirectoryNodes(book);
 openDialog('批量创建目录与套题',`<form id="directory-batch-form"><div class="batch-directory-columns"><section><div class="batch-tools"><button class="btn" type="button" data-batch-action="indent">缩进</button><button class="btn" type="button" data-batch-action="outdent">减少缩进</button><button class="btn primary" type="button" data-batch-action="suite">标为套题</button></div><textarea class="input batch-directory-input" id="batch-directory-text" aria-label="批量录入目录与套题" spellcheck="false" placeholder="第一部分 专项训练&#10;&#9;第一单元&#10;&#9;&#9;[套题] Test 1&#10;&#9;&#9;[套题] Test 2"></textarea></section><section class="batch-preview-panel"><h3>结构预览</h3><div id="batch-directory-preview" aria-live="polite"></div></section></div><p class="error" id="batch-directory-error" role="alert"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" id="batch-directory-save" form="directory-batch-form">确认创建</button>`);
 $('#dialog').classList.add('directory-batch-dialog');
 $('#dialog').addEventListener('close',()=>$('#dialog').classList.remove('directory-batch-dialog'),{once:true});
 const input=$('#batch-directory-text'),error=$('#batch-directory-error'),preview=$('#batch-directory-preview'),save=$('#batch-directory-save');
 function refresh(){try{const parsed=parseDirectoryBatch(input.value,parentId,nodes);error.textContent='';save.disabled=!parsed.length;preview.innerHTML=parsed.length?parsed.map(n=>`<div class="batch-preview-row" style="padding-left:${n.depth*18}px">${directoryTypeIcon(n.kind)}<span>${esc(n.name)}</span>${n.kind==='套题'?'<small class="directory-kind-tag">套题</small>':''}</div>`).join(''):'<p class="muted">输入后在这里预览结构</p>'}catch(e){error.textContent=e.message;save.disabled=true;preview.innerHTML='<p class="muted">请修正录入内容后查看预览</p>'}}
 function transform(action){const changed=transformDirectoryLines(input.value,input.selectionStart,input.selectionEnd,action);input.value=changed.text;input.focus();input.setSelectionRange(changed.start,changed.end);refresh()}
 input.oninput=refresh;
 input.onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();transform(e.shiftKey?'outdent':'indent')}};
 $('#directory-batch-form').querySelectorAll('[data-batch-action]').forEach(b=>b.onclick=()=>transform(b.dataset.batchAction));
 $('#directory-batch-form').onsubmit=e=>{e.preventDefault();try{
 const current=data.books.find(b=>b.id===bookId),existing=bookDirectoryNodes(current),parsed=parseDirectoryBatch(input.value,parentId,existing);if(!parsed.length)throw Error('请先输入目录或套题');
 const ids=new Map(parsed.map(n=>[n.id,'DIR-'+crypto.randomUUID()]));
 const added=parsed.map(n=>({id:ids.get(n.id),parentId:ids.get(n.parentId)||n.parentId,name:n.name,kind:n.kind}));
 if(!commitWorkspace(d=>{d.books.find(b=>b.id===bookId).directoryNodes=[...existing,...added]})){error.textContent='保存失败，录入内容已保留，请重试';return}
 selectedDirectory=added[0].id;collapsedBookDirectories.delete(parentId);closeDialog();render();toast(`已创建 ${added.length} 项`);
 }catch(e){error.textContent=e.message}};
 refresh();input.focus();
}

function reorderBookDirectory(nodes,id,targetId,after=false){
 const moving=nodes.find(n=>n.id===id),target=nodes.find(n=>n.id===targetId);
 if(!moving||!target)throw Error('目录不存在');
 if(moving.parentId!==target.parentId)throw Error('请在同一上级目录下调整顺序');
 if(id===targetId)return structuredClone(nodes);
 const result=structuredClone(nodes),index=result.findIndex(n=>n.id===id),[item]=result.splice(index,1);
 result.splice(result.findIndex(n=>n.id===targetId)+(after?1:0),0,item);return result;
}
function bindDirectorySorting(book,target){
 let dragging='',dropPosition='before';
 const rows=Array.from(target.querySelectorAll('[data-directory-row]'));
 const clear=()=>rows.forEach(row=>row.classList.remove('directory-drop-before','directory-drop-after','directory-drop-inside','directory-dragging'));
 function persist(id,destination,position){
 if(!guardSuiteNavigation())return;
 try{
 const current=data.books.find(b=>b.id===book.id),nodes=bookDirectoryNodes(current),updated=moveBookDirectory(nodes,id,destination,position);
 if(JSON.stringify(nodes)===JSON.stringify(updated))return;
 if(commitWorkspace(d=>{d.books.find(b=>b.id===book.id).directoryNodes=updated})){
 collapsedBookDirectories.delete(destination);renderBookDirectory(data.books.find(b=>b.id===book.id),target,true);toast('目录位置已保存');
 }
 }catch(e){toast(e.message)}
 }
 for(const row of rows){
 const id=row.dataset.directoryRow,handle=row.querySelector('.directory-drag-handle');
 handle.onclick=e=>e.stopPropagation();
 handle.ondragstart=e=>{dragging=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);row.classList.add('directory-dragging')};
 handle.ondragend=()=>{dragging='';clear()};
 handle.onkeydown=e=>{
 if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();
 const nodes=bookDirectoryNodes(data.books.find(b=>b.id===book.id)),item=nodes.find(n=>n.id===id),siblings=nodes.filter(n=>n.parentId===item.parentId&&n.kind==='目录'),index=siblings.findIndex(n=>n.id===id),next=siblings[index+(e.key==='ArrowDown'?1:-1)];
 if(next){persist(id,next.id,e.key==='ArrowDown'?'after':'before');Array.from(target.querySelectorAll('[data-directory-row]')).find(r=>r.dataset.directoryRow===id)?.querySelector('.directory-drag-handle').focus()}
 };
 row.ondragover=e=>{
 const nodes=bookDirectoryNodes(data.books.find(b=>b.id===book.id)),moving=nodes.find(n=>n.id===dragging),destination=nodes.find(n=>n.id===id);
 rows.forEach(r=>r.classList.remove('directory-drop-before','directory-drop-after','directory-drop-inside'));
 if(!moving||dragging===id||directoryDescendants(nodes,dragging).has(id)){if(e.dataTransfer)e.dataTransfer.dropEffect='none';return}
 e.preventDefault();e.dataTransfer.dropEffect='move';const box=row.getBoundingClientRect();const ratio=(e.clientY-box.top)/box.height;dropPosition=ratio<.25?'before':ratio>.75?'after':'inside';
 row.classList.add('directory-drop-'+dropPosition);
 const tree=target.querySelector('.book-directory-tree'),bounds=tree.getBoundingClientRect();if(e.clientY<bounds.top+35)tree.scrollTop-=12;else if(e.clientY>bounds.bottom-35)tree.scrollTop+=12;
 };
 row.ondragleave=e=>{if(!row.contains(e.relatedTarget))row.classList.remove('directory-drop-before','directory-drop-after','directory-drop-inside')};
 row.ondrop=e=>{e.preventDefault();const source=dragging;dragging='';clear();if(source)persist(source,id,dropPosition)};
 }
}

function renameTreeDirectory(nodes,id,name){
 const item=nodes.find(n=>n.id===id);if(item?.kind!=='目录')throw Error('只能修改目录');
 name=String(name).trim();if(!name)throw Error('请输入目录名称');if(name.length>150)throw Error('名称不能超过 150 个字符');
 if(nodes.some(n=>n.id!==id&&n.parentId===item.parentId&&n.name===name))throw Error('同级名称已存在');
 return nodes.map(n=>({...n,...(n.id===id?{name}:{})}));
}
function moveBookDirectory(nodes,id,targetId,position){
 const item=nodes.find(n=>n.id===id),destination=nodes.find(n=>n.id===targetId);
 if(item?.kind!=='目录'||destination?.kind!=='目录')throw Error('只能拖动目录到目录');
 if(!['before','inside','after'].includes(position))throw Error('无效的移动位置');
 if(directoryDescendants(nodes,id).has(targetId))throw Error('不能移动到自身或子目录下');
 const parentId=position==='inside'?targetId:destination.parentId;
 if(nodes.some(n=>n.id!==id&&n.parentId===parentId&&n.name===item.name))throw Error('目标目录下存在同名内容');
 const next=structuredClone(nodes).filter(n=>n.id!==id),moving={...structuredClone(item),parentId};
 if(position==='inside')next.push(moving);else next.splice(next.findIndex(n=>n.id===targetId)+(position==='after'?1:0),0,moving);
 return next;
}
function removeTreeDirectory(nodes,id){
 const item=nodes.find(n=>n.id===id);if(item?.kind!=='目录')throw Error('只能删除目录');
 const children=nodes.filter(n=>n.parentId===id),siblings=nodes.filter(n=>n.parentId===item.parentId&&n.id!==id);
 if(children.some(c=>siblings.some(n=>n.name===c.name)))throw Error('上一级存在同名内容，请先改名或移动后再删除');
 // Promote children in place, preserving every content ID and descendant relationship.
 const promoted=children.map(n=>({...n,parentId:item.parentId})),next=[];
 for(const n of nodes){if(n.id===id)next.push(...promoted);else if(n.parentId!==id)next.push({...n})}return next;
}
function beginInlineRename(bookId,id,target){
 if(!guardSuiteNavigation())return;selectedDirectory=id;
 const current=()=>data.books.find(b=>b.id===bookId);renderBookDirectory(current(),target,true);
 const item=bookDirectoryNodes(current()).find(n=>n.id===id);if(item?.kind!=='目录')return;
 const row=Array.from(target.querySelectorAll('[data-directory-row]')).find(r=>r.dataset.directoryRow===id);
 row.innerHTML=`<form class="inline-directory-form" id="rename-directory-form"><input class="input" aria-label="目录名称" name="name" value="${esc(item.name)}" required maxlength="150"><button class="linkbtn" type="submit" aria-label="保存名称">${icon('check')}</button><button class="linkbtn" type="button" id="cancel-directory-rename" aria-label="取消改名">${icon('close')}</button><p class="error" role="alert"></p></form>`;
 const form=$('#rename-directory-form');suiteDraft={form,initial:JSON.stringify(Object.fromEntries(new FormData(form))),location:{page,activeBook,bookSection,bookType}};
 $('#cancel-directory-rename').onclick=()=>{suiteDraft=null;renderBookDirectory(current(),target,true)};
 form.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();$('#cancel-directory-rename').click()}};
 form.onsubmit=e=>{e.preventDefault();try{const updated=renameTreeDirectory(bookDirectoryNodes(current()),id,new FormData(form).get('name'));if(!commitWorkspace(d=>{d.books.find(b=>b.id===bookId).directoryNodes=updated}))throw Error('保存失败，输入已保留');suiteDraft=null;renderBookDirectory(current(),target,true);toast('目录名称已保存')}catch(err){form.querySelector('.error').textContent=err.message}};
 form.querySelector('input').focus();form.querySelector('input').select();
}
function deleteDirectoryFromTree(bookId,id,target){
 if(!guardSuiteNavigation())return;
 const current=()=>data.books.find(b=>b.id===bookId),item=bookDirectoryNodes(current()).find(n=>n.id===id);if(item?.kind!=='目录')return;
 openDialog('删除目录',`<p>确定删除目录“${esc(item.name)}”？其中的子目录和内容将移到上一级，题目及内容数据会保留。</p><p class="error" id="delete-directory-error" role="alert"></p>`,`<button class="btn" data-close>取消</button><button class="btn primary" id="confirm-directory-delete">删除目录</button>`);
 $('#confirm-directory-delete').onclick=()=>{try{const updated=removeTreeDirectory(bookDirectoryNodes(current()),id);if(!commitWorkspace(d=>{d.books.find(b=>b.id===bookId).directoryNodes=updated}))throw Error('保存失败，请重试');selectedDirectory=item.parentId||BOOK_DIRECTORY_ROOT;closeDialog();renderBookDirectory(current(),target,true);toast('目录已删除，内容已保留')}catch(e){$('#delete-directory-error').textContent=e.message}};
}

function removeBookSuiteNode(nodes,id){
 const node=nodes.find(n=>n.id===id);
 if(!node||node.kind==='目录')throw Error('内容不存在');
 if(nodes.some(n=>n.parentId===id))throw Error('该套题下仍有目录内容，请先移出后再删除');
 return nodes.filter(n=>n.id!==id).map(n=>({...n}));
}
function deleteBookSuite(bookId,id,target){
 if(!guardSuiteNavigation())return;
 const current=()=>data.books.find(b=>b.id===bookId),node=bookDirectoryNodes(current()).find(n=>n.id===id);
 if(!node||node.kind==='目录')return;
 openContentDialog('删除'+contentTypeName(node.kind),`<div class="content-removal-summary">${node.kind==='套题'?`<fieldset class="suite-delete-options"><legend class="sr-only">删除方式</legend><label><input type="radio" name="suite-delete-mode" value="unlink" checked><span>仅删除套题<small>解除关联，保留听力题库中的试题</small></span></label><label><input type="radio" name="suite-delete-mode" value="delete"><span>同时删除试题<small>删除套题及听力题库中的关联试题</small></span></label></fieldset>`:'<p class="muted">仅从本书移除，原始内容保留。</p>'}</div><p class="error" id="delete-suite-error" role="alert"></p>`,`<button class="btn" data-close>取消</button><button class="btn danger" id="confirm-suite-delete">确认删除</button>`);
 $('#confirm-suite-delete').onclick=()=>{try{
 const mode=document.querySelector('[name="suite-delete-mode"]:checked')?.value||'unlink';
 if(mode==='delete'){showSuiteDeletionImpact(bookId,id,target);return}
 if(!commitWorkspace(d=>applyBookContentDeletion(d,bookId,id,mode)))throw Error('删除失败，请重试');
 selectedDirectory=node.parentId||BOOK_DIRECTORY_ROOT;closeDialog();renderBookDirectory(current(),target,true);toast('已从本书删除内容');
 }catch(e){$('#delete-suite-error').textContent=e.message}};
}

function renameBookContent(nodes,id,name){
 const node=nodes.find(n=>n.id===id);if(!node||node.kind==='目录')throw Error('内容不存在');
 name=String(name).trim();if(!name)throw Error('请输入内容名称');if(name.length>150)throw Error('名称不能超过 150 个字符');
 if(nodes.some(n=>n.id!==id&&n.parentId===node.parentId&&n.name===name))throw Error('同级名称已存在');
 return nodes.map(n=>({...n,...(n.id===id?{name}:{})}));
}
function editBookContentName(bookId,id,target){
 if(!guardSuiteNavigation())return;
 const current=()=>data.books.find(b=>b.id===bookId),node=bookDirectoryNodes(current()).find(n=>n.id===id);if(!node||node.kind==='目录')return;
 openDialog('编辑'+contentTypeName(node.kind),`<form id="edit-book-content-form"><label class="field"><span>名称</span><input class="input" name="name" value="${esc(node.name)}" required maxlength="150"></label><p class="error" id="edit-book-content-error" role="alert"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" form="edit-book-content-form">保存</button>`);
 $('#edit-book-content-form').onsubmit=e=>{e.preventDefault();try{
 const updated=renameBookContent(bookDirectoryNodes(current()),id,new FormData(e.target).get('name'));
 if(!commitWorkspace(d=>{d.books.find(b=>b.id===bookId).directoryNodes=updated}))throw Error('保存失败，请重试');
 closeDialog();renderBookDirectory(current(),target,true);toast('内容名称已保存');
 }catch(err){$('#edit-book-content-error').textContent=err.message}};
}

function applyBookContentDeletion(state,bookId,id,mode,confirmation){
 if(!['unlink','delete'].includes(mode))throw Error('请选择删除方式');
 const book=state.books.find(b=>b.id===bookId),nodes=bookDirectoryNodes(book),node=nodes.find(n=>n.id===id);
 const updated=removeBookSuiteNode(nodes,id);
 if(node.kind==='套题'){
 const blocks=suiteBlocks(book,node).filter(b=>b.type==='听力题');
 if(mode==='delete'){
 const impact=suiteDeletionImpact(state,bookId,id);
 if(impact.blocked)throw Error('来源试题暂不支持删除：题库删除接口尚未接入');
 if(impact.affected.length&&confirmation!==impact.signature)throw Error('关联影响已变化，请重新确认');
 const ids=new Set(impact.questionIds);
 for(const otherBook of state.books)for(const content of Object.values(otherBook.suiteContent||{}))content.questions=(content.questions||[]).filter(q=>!ids.has(String(q.id)));
 const keys=new Set(blocks.map(b=>b.contentKey||b.id));
 for(const key of keys){const shared=nodes.some(n=>n.id!==id&&n.kind==='套题'&&suiteBlocks(book,n).some(b=>(b.contentKey||b.id)===key));if(!shared&&book.suiteContent)delete book.suiteContent[key]}
 if(book.contentBlocks)delete book.contentBlocks[id];
 }else{
 book.suiteContent ||= {};
 for(const block of blocks){const key=block.contentKey||block.id;book.suiteContent[key]=rawSuiteContent(book,{id:key,sourceSuiteId:block.sourceSuiteId||node.sourceSuiteId})}
 }
 }
 book.directoryNodes=updated;
}

function openContentDialog(title,body,footer){
 if(window.BookUI){window.BookUI.openDialog(title,body,footer);return}
 openDialog(title,body,footer);
}
function suiteDeletionImpact(state,bookId,id){
 const book=state.books.find(b=>b.id===bookId),node=bookDirectoryNodes(book).find(n=>n.id===id);
 if(!node||node.kind!=='套题')throw Error('套题不存在');
 const blocks=suiteBlocks(book,node).filter(b=>b.type==='听力题'),ids=new Set();let blocked=!!node.sourceSuiteId;
 for(const b of blocks){blocked ||= !!b.sourceSuiteId;for(const q of rawSuiteContent(book,{id:b.contentKey||b.id,sourceSuiteId:b.sourceSuiteId||node.sourceSuiteId}).questions)ids.add(String(q.id))}
 const affected=[];
 for(const otherBook of state.books)for(const other of bookDirectoryNodes(otherBook).filter(n=>n.kind==='套题')){
 if(otherBook.id===bookId&&other.id===id)continue;
 const matches=new Set();
 for(const b of suiteBlocks(otherBook,other).filter(b=>b.type==='听力题')){
 const content=rawSuiteContent(otherBook,{id:b.contentKey||b.id,sourceSuiteId:b.sourceSuiteId||other.sourceSuiteId});
 for(const q of content.questions)if(ids.has(String(q.id))){matches.add(String(q.id));blocked ||= !!b.sourceSuiteId||!!other.sourceSuiteId}
 }
 if(matches.size)affected.push({bookId:otherBook.id,bookName:otherBook.name||otherBook.id,suiteId:other.id,suiteName:other.name,count:matches.size});
 }
 const questionIds=[...ids].sort(),signature=JSON.stringify({questionIds,affected,blocked});
 return {questionIds,affected,blocked,signature,otherBookCount:new Set(affected.filter(a=>a.bookId!==bookId).map(a=>a.bookId)).size};
}
function showSuiteDeletionImpact(bookId,id,target){
 const impact=suiteDeletionImpact(data,bookId,id),phrase='确认删除试题',needsText=impact.affected.length>0;
 openContentDialog('确认删除？',`<div class="suite-impact">${needsText?`<p>将删除 ${impact.questionIds.length} 道试题</p>`:''}${needsText?`<div class="suite-impact-warning" role="alert">${impact.otherBookCount?`影响其他 ${impact.otherBookCount} 本书籍`:'影响本书其他套题'}，以下内容将失去对应试题。</div><ul class="suite-impact-list">${impact.affected.map(a=>`<li><strong>${esc(a.bookName)}</strong><span>${esc(a.suiteName)} · ${a.count} 道试题</span></li>`).join('')}</ul><label class="field"><span>输入“${phrase}”继续</span><input class="input" id="suite-delete-phrase" autocomplete="off"></label>`:`<p>${impact.questionIds.length?`删除 ${impact.questionIds.length} 道试题，未发现其他引用。`:'套题内暂无试题。'}</p>`}${impact.blocked?'<p class="suite-impact-warning">题库删除接口尚未接入，来源试题暂不能执行删除。</p>':''}<p class="error" id="suite-impact-error" role="alert"></p></div>`,`<button class="btn" id="suite-impact-back">返回</button><button class="btn danger" id="suite-impact-confirm" ${needsText||impact.blocked?'disabled':''}>确认删除</button>`);
 $('#suite-impact-back').onclick=()=>deleteBookSuite(bookId,id,target);
 const input=$('#suite-delete-phrase'),button=$('#suite-impact-confirm');
 if(needsText)input.oninput=()=>button.disabled=impact.blocked||input.value!==phrase;
 button.onclick=()=>{try{
 if(impact.blocked||needsText&&input.value!==phrase)throw Error('请完成删除确认');
 const latest=suiteDeletionImpact(data,bookId,id);if(latest.signature!==impact.signature){showSuiteDeletionImpact(bookId,id,target);return}
 if(!commitWorkspace(d=>applyBookContentDeletion(d,bookId,id,'delete',impact.signature)))throw Error('删除失败，请重试');
 selectedDirectory=BOOK_DIRECTORY_ROOT;closeDialog();renderBookDirectory(data.books.find(b=>b.id===bookId),target,true);toast('套题和试题已删除');
 }catch(e){$('#suite-impact-error').textContent=e.message}};
}

function reorderDirectoryContent(nodes,id,targetId,after=false){
 const moving=nodes.find(n=>n.id===id),destination=nodes.find(n=>n.id===targetId);
 if(!moving||!destination||moving.kind==='目录'||destination.kind==='目录')throw Error('只能调整内容顺序');
 if(moving.parentId!==destination.parentId)throw Error('只能在当前目录内排序');
 if(id===targetId)return structuredClone(nodes);
 const result=structuredClone(nodes),[item]=result.splice(result.findIndex(n=>n.id===id),1);
 result.splice(result.findIndex(n=>n.id===targetId)+(after?1:0),0,item);return result;
}
function bindContentSorting(book,target,host){
 const rows=Array.from(host.querySelectorAll('[data-content-row]'));let dragging='';
 const clear=()=>rows.forEach(r=>r.classList.remove('content-drop-before','content-drop-after','content-dragging'));
 const save=(id,destination,after)=>{if(!guardSuiteNavigation())return;try{
 const current=data.books.find(b=>b.id===book.id),updated=reorderDirectoryContent(bookDirectoryNodes(current),id,destination,after);
 if(!commitWorkspace(d=>{d.books.find(b=>b.id===book.id).directoryNodes=updated}))return;
 renderBookDirectory(data.books.find(b=>b.id===book.id),target,true);toast('内容顺序已保存');
 }catch(e){toast(e.message)}};
 for(const row of rows){
 const id=row.dataset.contentRow,handle=row.querySelector('.content-drag-handle');
 handle.ondragstart=e=>{dragging=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);row.classList.add('content-dragging')};
 handle.ondragend=()=>{dragging='';clear()};
 handle.onkeydown=e=>{if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const other=rows[rows.indexOf(row)+(e.key==='ArrowDown'?1:-1)];if(other){save(id,other.dataset.contentRow,e.key==='ArrowDown');Array.from(target.querySelectorAll('[data-content-row]')).find(r=>r.dataset.contentRow===id)?.querySelector('.content-drag-handle').focus()}};
 row.ondragover=e=>{if(!dragging||dragging===id)return;e.preventDefault();clear();e.dataTransfer.dropEffect='move';const rect=row.getBoundingClientRect();row.classList.add(e.clientY>rect.top+rect.height/2?'content-drop-after':'content-drop-before')};
 row.ondragleave=e=>{if(!row.contains(e.relatedTarget))row.classList.remove('content-drop-before','content-drop-after')};
 row.ondrop=e=>{if(!dragging||dragging===id)return;e.preventDefault();const source=dragging,rect=row.getBoundingClientRect(),after=e.clientY>rect.top+rect.height/2;dragging='';clear();save(source,id,after)};
 }
}
