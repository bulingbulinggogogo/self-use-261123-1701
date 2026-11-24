'use strict';
// Additive book-local structure: legacy listening content keeps its original suite key.
let activeBookBlock='';
function suiteBlocks(book,node){
 return book.contentBlocks?.[node.id]||[{id:node.id,type:'听力题',name:'听力练习',contentKey:node.id,sourceSuiteId:node.sourceSuiteId}];
}
function resolveListeningNode(book,id){
 const original=bookDirectoryNodes(book).find(n=>n.id===id);if(original)return original;
 for(const [owner,blocks] of Object.entries(book.contentBlocks||{})){
 const block=blocks.find(b=>b.type==='听力题'&&b.contentKey===id);
 if(block)return {id,kind:'套题',name:block.name,parentId:owner,ownerSuiteId:owner,sourceSuiteId:block.sourceSuiteId};
 }
 throw Error('听力板块不存在');
}
function blockQuestionStart(book,node){
 const owner=node.ownerSuiteId||node.id,root=bookDirectoryNodes(book).find(n=>n.id===owner);
 if(!root)return 1;
 let start=1;
 for(const block of suiteBlocks(book,root)){
 if(block.contentKey===node.id)break;
 if(block.type==='听力题')start+=rawSuiteContent(book,{id:block.contentKey,sourceSuiteId:block.sourceSuiteId}).questions.length;
 }
 return start;
}
function renumberSuiteContent(content,start=1){
 const next=structuredClone(content);next.orderingVersion=1;let number=start;
 next.questions=next.scripts.flatMap(s=>next.questions.filter(q=>q.scriptId===s.id).map(q=>({...q,number:String(number++)})));
 if(next.questions.length!==content.questions.length)throw Error('小题必须归属有效录音稿');
 return next;
}
function reorderBlockQuestions(content,id,targetId,after=false){
 const next=structuredClone(content),q=next.questions.find(q=>q.id===id),target=next.questions.find(q=>q.id===targetId);
 if(!q||!target||q.scriptId!==target.scriptId)throw Error('请在同一录音稿内排序；整组顺序可拖动左侧录音稿调整');
 if(id!==targetId){next.questions.splice(next.questions.indexOf(q),1);next.questions.splice(next.questions.indexOf(target)+(after?1:0),0,q)}
 return renumberSuiteContent(next);
}
function bindQuestionDragging(target){
 let dragging='';
 target.querySelectorAll('[data-drag-question]').forEach(handle=>{
 handle.ondragstart=e=>{dragging=handle.dataset.dragQuestion;e.dataTransfer.setData('text/plain',dragging);e.dataTransfer.effectAllowed='move'};
 handle.ondragend=()=>{dragging='';target.querySelectorAll('.question-drop').forEach(x=>x.classList.remove('question-drop'))};
 });
 target.querySelectorAll('[data-question-card]').forEach(card=>{
 card.ondragover=e=>{if(dragging&&dragging!==card.dataset.questionCard){e.preventDefault();card.classList.add('question-drop')}};
 card.ondragleave=()=>card.classList.remove('question-drop');
 card.ondrop=e=>{e.preventDefault();card.classList.remove('question-drop');const id=dragging;dragging='';if(!id||id===card.dataset.questionCard||!guardSuiteNavigation())return;try{if(saveSuiteContent(reorderBlockQuestions(currentSuite().content,id,card.dataset.questionCard,e.clientY>card.getBoundingClientRect().top+card.getBoundingClientRect().height/2))){refreshSuite();toast('题目顺序与题号已更新')}}catch(error){toast(error.message)}};
 });
}
function persistBlocks(book,node,blocks){
 return commitWorkspace(d=>{const b=d.books.find(b=>b.id===book.id);b.contentBlocks ||= {};b.contentBlocks[node.id]=blocks});
}
function renderSuiteEditor(book,node,target){
 if(node.ownerSuiteId)node=bookDirectoryNodes(book).find(n=>n.id===node.ownerSuiteId);
 const blocks=suiteBlocks(book,node);
 if(!blocks.some(b=>b.id===activeBookBlock))activeBookBlock=blocks[0]?.id||'';
 const block=blocks.find(b=>b.id===activeBookBlock);
 target.innerHTML='<div id="book-block-toolbar" class="book-block-toolbar"></div><div id="book-block-body"></div>';
 const bar=$('#book-block-toolbar'),body=$('#book-block-body');
 bar.innerHTML=`<button class="btn" id="blocks-back">返回</button><strong>${esc(node.name)}</strong>${blocks.map((b,i)=>`<span class="block-item ${b.id===activeBookBlock?'active':''}"><button class="linkbtn" data-block="${esc(b.id)}">${esc(b.name)} <small>· ${esc(b.type)}</small></button><button class="linkbtn" data-block-up="${esc(b.id)}" ${i?'':'disabled'} aria-label="上移${esc(b.name)}">↑</button><button class="linkbtn" data-block-down="${esc(b.id)}" ${i===blocks.length-1?'disabled':''} aria-label="下移${esc(b.name)}">↓</button></span>`).join('')}<button class="btn" id="add-suite-block">添加板块</button>${block?'<button class="linkbtn" id="rename-suite-block">重命名板块</button>':''}`;
 $('#blocks-back').onclick=()=>{if(!guardSuiteNavigation())return;selectedDirectory=node.id;renderBookDirectory(data.books.find(b=>b.id===book.id),target,true)};
 bar.querySelectorAll('[data-block]').forEach(b=>b.onclick=()=>{if(!guardSuiteNavigation())return;activeBookBlock=b.dataset.block;renderSuiteEditor(data.books.find(b=>b.id===book.id),node,target)});
 for(const [selector,key,step] of [['[data-block-up]','blockUp',-1],['[data-block-down]','blockDown',1]])bar.querySelectorAll(selector).forEach(b=>b.onclick=()=>{if(!guardSuiteNavigation())return;const fresh=data.books.find(x=>x.id===book.id),next=structuredClone(suiteBlocks(fresh,node)),i=next.findIndex(x=>x.id===b.dataset[key]),j=i+step;if(j<0||j>=next.length)return;[next[i],next[j]]=[next[j],next[i]];if(persistBlocks(fresh,node,next))renderSuiteEditor(data.books.find(x=>x.id===book.id),node,target)});
 $('#add-suite-block').onclick=()=>{if(guardSuiteNavigation())editContentBlock(book.id,node.id)};
 if(block)$('#rename-suite-block').onclick=()=>{if(guardSuiteNavigation())editContentBlock(book.id,node.id,block.id)};
 if(block?.type==='听力题'){
 const listeningNode=block.contentKey===node.id?node:{id:block.contentKey,name:block.name,kind:'套题',ownerSuiteId:node.id,parentId:node.id,sourceSuiteId:block.sourceSuiteId};
 renderListeningSuiteEditor(book,listeningNode,body);
 }else if(block)renderTextOrWords(book,block,body,updated=>{const fresh=data.books.find(x=>x.id===book.id);return persistBlocks(fresh,node,suiteBlocks(fresh,node).map(b=>b.id===block.id?updated:b))},()=>renderSuiteEditor(data.books.find(x=>x.id===book.id),node,target));
}
function editContentBlock(bookId,nodeId,id=''){
 const book=data.books.find(b=>b.id===bookId),node=bookDirectoryNodes(book).find(n=>n.id===nodeId),blocks=suiteBlocks(book,node),old=blocks.find(b=>b.id===id);
 openDialog(old?'重命名板块':'添加板块',`<form id="content-block-form"><label class="field"><span>板块类型</span><select class="input" name="type" ${old?'disabled':''}>${opts(['听力题','单词表','点拨学案'].map(t=>[t,t]),old?.type||'单词表')}</select></label>${field('板块名称','name',old?.name||'','text',true)}<p class="error" id="block-error"></p></form>`,'<button class="btn" data-close>取消</button><button class="btn primary" form="content-block-form">保存</button>');
 $('#content-block-form').onsubmit=e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target)),name=values.name.trim();if(!name)return;const fresh=data.books.find(b=>b.id===bookId),next=structuredClone(suiteBlocks(fresh,node));let block=next.find(b=>b.id===id);if(block)block.name=name;else{const key='BLOCK-'+crypto.randomUUID();block={id:key,contentKey:key,type:values.type,name,wordIds:[],text:''};next.push(block)}if(persistBlocks(fresh,node,next)){activeBookBlock=block.id;closeDialog();renderSuiteEditor(data.books.find(b=>b.id===bookId),node,$('#book-section'))}else $('#block-error').textContent='保存失败，请重试。'};
}
function prepareBookContent(nodes,parentId,kind,name){
 if(!['套题','单词表','精听挖空'].includes(kind))throw Error('不支持的内容类型');
 name=String(name||'').trim();if(!name)throw Error('请输入名称');if(name.length>150)throw Error('名称不能超过 150 个字符');
 if(parentId&&!nodes.some(n=>n.id===parentId&&n.kind==='目录'))throw Error('所属目录不存在');
 if(nodes.some(n=>n.parentId===parentId&&n.name===name))throw Error('同级名称已存在');
 return [...nodes,{id:'DIR-'+crypto.randomUUID(),parentId,kind,name}];
}
function addBookContent(bookId,parentId='',kind='套题',target=$('#book-section')){
 if(!['套题','单词表','精听挖空'].includes(kind))throw Error('不支持的内容类型');
 if(!guardSuiteNavigation())return;
 const current=()=>data.books.find(b=>b.id===bookId);
 selectedDirectory=parentId||BOOK_DIRECTORY_ROOT;renderBookDirectory(current(),target,true);
 const body=target.querySelector('.directory-content-table tbody');
 body.querySelector('.directory-content-empty')?.closest('tr').remove();
 body.insertAdjacentHTML('afterbegin',`<tr class="content-create-row"><td><form id="book-node-form"><div class="content-name-cell">${contentTypePill(kind)}<input class="input" name="name" aria-label="新增${esc(contentTypeName(kind))}名称" placeholder="请输入名称" required maxlength="150" autocomplete="off"></div><p class="error" id="node-error" role="alert"></p></form></td><td><div class="content-row-actions"><button class="linkbtn" type="submit" form="book-node-form">保存</button><button class="linkbtn" type="button" id="cancel-content-create">取消</button></div></td></tr>`);
 const form=$('#book-node-form');
 suiteDraft={form,initial:JSON.stringify(Object.fromEntries(new FormData(form))),location:{page,activeBook,bookSection,bookType}};
 $('#cancel-content-create').onclick=()=>{suiteDraft=null;renderBookDirectory(current(),target,true)};
 form.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();$('#cancel-content-create').click()}};
 form.onsubmit=e=>{e.preventDefault();try{
 const next=prepareBookContent(bookDirectoryNodes(current()),parentId,kind,new FormData(form).get('name'));
 if(!commitWorkspace(d=>{d.books.find(b=>b.id===bookId).directoryNodes=next}))throw Error('保存失败，输入已保留，请重试');
 suiteDraft=null;renderBookDirectory(current(),target,true);toast('内容已新增');
 }catch(err){$('#node-error').textContent=err.message}};
 form.querySelector('input').focus();
}
function renderStandaloneBlock(book,node,target){
 const block={...book.standaloneContent?.[node.id],id:node.id,name:node.name,type:node.kind};
 target.innerHTML='<div class="book-block-toolbar"><button class="btn" id="standalone-back">返回</button><strong>'+esc(node.name)+'</strong></div><div id="standalone-body"></div>';
 $('#standalone-back').onclick=()=>{if(!guardSuiteNavigation())return;selectedDirectory=node.parentId||node.id;renderBookDirectory(data.books.find(b=>b.id===book.id),target,true)};
 renderTextOrWords(book,block,$('#standalone-body'),updated=>commitWorkspace(d=>{const b=d.books.find(b=>b.id===book.id);b.standaloneContent ||= {};b.standaloneContent[node.id]=updated}),()=>renderStandaloneBlock(data.books.find(b=>b.id===book.id),node,target));
}
function renderTextOrWords(book,block,target,save,refresh){
 if(typeof disposeRecordingAudio==='function')disposeRecordingAudio();
 target.classList.add('block-content');
 const words=workspace().words,selected=new Set(block.wordIds||[]);
 target.innerHTML=`<div class="row between"><h2>${esc(block.name)}</h2><button class="btn" id="edit-block-content">编辑${esc(block.type)}</button></div>${block.type==='单词表'?`<div class="block-word-list">${(block.wordIds||[]).map(id=>{const w=words.find(w=>w.id===id);return `<p>${w?`<strong>${esc(w.word)}</strong>　${esc(w.pos)}　${esc(w.meaning)}`:'词条暂不可用（关联已保留）'}</p>`}).join('')||'<p class="muted">--</p>'}</div>`:`<div class="block-preview" style="margin-top:20px">${esc(block.text||(block.type==='精听挖空'?'--':'--'))}</div>`}`;
 $('#edit-block-content').onclick=()=>{
 if(!guardSuiteNavigation())return;
 target.innerHTML=`<form id="suite-content-form"><div class="row between"><h2>${esc(block.name)}</h2><div class="row"><button type="button" class="btn" id="cancel-block-edit">取消</button><button class="btn primary">保存</button></div></div>${block.type==='单词表'?`<label class="field"><span>搜索词库</span><input class="input" id="block-word-search" placeholder="单词、词性或释义"></label><div class="block-word-list">${words.map(w=>`<label data-word-search="${esc((w.word+' '+w.pos+' '+w.meaning).toLowerCase())}"><input type="checkbox" name="word-${esc(w.id)}" value="${esc(w.id)}" ${selected.has(w.id)?'checked':''}> <strong>${esc(w.word)}</strong> ${esc(w.pos)}　${esc(w.meaning)}</label>`).join('')||'<p class="muted">请先在词库中添加词条</p>'}</div>`:'<label class="field"><span>'+ (block.type==='精听挖空'?'练习内容':'学案内容')+'</span><textarea class="input" name="text">'+esc(block.text||'')+'</textarea></label>'}<p class="error" id="block-save-error"></p></form>`;
 const form=$('#suite-content-form');suiteDraft={form,initial:JSON.stringify(Object.fromEntries(new FormData(form))),location:{page,activeBook,bookSection,bookType}};
 if(block.type==='单词表')$('#block-word-search').oninput=e=>target.querySelectorAll('[data-word-search]').forEach(row=>row.hidden=!row.dataset.wordSearch.includes(e.target.value.toLowerCase().trim()));
 $('#cancel-block-edit').onclick=()=>{if(guardSuiteNavigation())refresh()};
 form.onsubmit=e=>{e.preventDefault();const updated={...block};if(block.type==='单词表'){const checked=new Set([...form.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value));updated.wordIds=[...(block.wordIds||[]).filter(id=>checked.has(id)||!words.some(w=>w.id===id)),...Array.from(checked).filter(id=>!selected.has(id))]}else updated.text=new FormData(form).get('text');if(save(updated)){suiteDraft=null;refresh();toast('内容已保存')}else $('#block-save-error').textContent='保存失败，修改尚未保存。'};
 };
}
