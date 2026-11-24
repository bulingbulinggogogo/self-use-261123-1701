'use strict';
// Shared directory content has no separate product/library entry point.
function directoryContentId(state){state.businessIdSequences.directoryContents=(state.businessIdSequences.directoryContents||0)+1;return String(state.businessIdSequences.directoryContents)}
function projectBookDirectories(book,state=data){
 if(!book.directoryRoots)return book.directoryNodes||[];
 const out=[];
 function walk(edges,parent='',ancestors=new Set()){for(const edge of edges){if(ancestors.has(edge.contentId))continue;const content=state.directoryContents[edge.contentId];if(!content)continue;const nodeId=parent?parent+'/'+edge.id:edge.id;out.push({...edge,id:nodeId,edgeId:edge.id,directoryId:edge.id,parentId:parent,kind:'目录'});walk(content.children,nodeId,new Set([...ancestors,edge.contentId]))}}
 walk(book.directoryRoots);return out;
}
function syncBookDirectories(state){for(const book of state.books)if(book.directoryRoots)book.directoryNodes=projectBookDirectories(book,state)}
function migrateDirectoryContent(state){
 if(state.directoryContentVersion)return;
 state.directoryContents ||= {};const packageMap={};
 for(const p of Object.values(state.teachingLibrary.packages)){const id=directoryContentId(state);packageMap[p.id]=id;state.directoryContents[id]={id,items:structuredClone(p.items),children:[]}}
 for(const book of state.books.filter(b=>b.sharedResources)){
 const nodes=book.directoryNodes||[],map={};
 for(const n of nodes){const id=packageMap[n.packageId]||directoryContentId(state);map[n.id]=id;state.directoryContents[id] ||= {id,items:[],children:[]}}
 const edges=parent=>nodes.filter(n=>n.parentId===parent).map(n=>({id:n.id,name:n.name,contentId:map[n.id],visible:n.visible!==false}));
 for(const n of nodes)if(!n.packageId)state.directoryContents[map[n.id]].children=edges(n.id);
 book.directoryRoots=edges('');
 }
 // Keep unplaced content reachable instead of silently discarding it.
 const placed=new Set(state.books.flatMap(b=>(b.directoryNodes||[]).map(n=>n.packageId)).filter(Boolean));
 const unplaced=Object.values(state.teachingLibrary.packages).filter(p=>!placed.has(p.id));
 if(unplaced.length){const book=state.books.find(b=>b.id==='BK-SOURCE-686');if(book)for(const p of unplaced)book.directoryRoots.push({id:nextBusinessId('directories',state),name:p.name,contentId:packageMap[p.id],visible:true})}
 state.retiredPackages=state.teachingLibrary.packages;state.teachingLibrary.packages={};state.directoryContentVersion=1;syncBookDirectories(state);
}
const commitBeforeDirectories=commitWorkspace;
commitWorkspace=function(change){return commitBeforeDirectories(d=>{change(d);if(d.directoryContentVersion)syncBookDirectories(d)})};
commitWorkspace(migrateDirectoryContent);
// A directory inserted into a content stream owns the following content segment.
function adoptFollowingDirectoryItems(state,parent,edge){
 const child=state.directoryContents[edge.contentId];
 const start=Math.max(0,Math.min(Number(edge.contentIndex)||0,parent.items.length));
 const position=parent.children.indexOf(edge);
 const next=parent.children.slice(position+1).map(n=>n.contentIndex??parent.items.length).filter(i=>i>=start);
 const end=Math.min(parent.items.length,...next);
 if(end<=start)return;
 child.items.push(...parent.items.splice(start,end-start));
 for(const sibling of parent.children)if(sibling!==edge&&sibling.contentIndex!==undefined&&sibling.contentIndex>start)sibling.contentIndex=Math.max(start,sibling.contentIndex-(end-start));
}
function splitDirectoryAt(state,book,target,source,index,destination){
 const content=state.directoryContents[target.contentId];
 if(target.id===source.id){
  const start=Math.max(0,Math.min(index,content.items.length));
  const total=content.items.length;
  destination.items=content.items.splice(start);
  const following=content.children.filter(e=>(e.contentIndex??total)>=start);
  content.children=content.children.filter(e=>!following.includes(e));
  destination.children=following.map(e=>({...e,contentIndex:(e.contentIndex??total)-start}));
  return;
 }
 const child=book.directoryNodes.find(n=>n.parentId===target.id&&(source.id===n.id||source.id.startsWith(n.id+'/')));
 if(!child)return;
 const at=content.children.findIndex(e=>e.id===child.edgeId),edge=content.children[at];
 const tail={id:directoryContentId(state),items:[],children:[]};
 splitDirectoryAt(state,book,child,source,index,tail);
 const boundary=edge.contentIndex??content.items.length;
 destination.items=content.items.splice(boundary);
 destination.children=content.children.splice(at+1).map(e=>({...e,contentIndex:Math.max(0,(e.contentIndex??boundary)-boundary)}));
 if(tail.items.length||tail.children.length){state.directoryContents[tail.id]=tail;destination.children.unshift({...edge,id:nextBusinessId('directories',state),contentId:tail.id,contentIndex:0})}
}
function repairInsertedDirectoryOwnership(state){
 if(state.directoryInsertionOwnershipVersion)return;
 for(const parent of Object.values(state.directoryContents||{})){
  // Only repair empty directories carrying the old insertion-position marker.
  const pending=parent.children.filter(edge=>edge.contentIndex!==undefined&&state.directoryContents[edge.contentId]?.items.length===0&&state.directoryContents[edge.contentId]?.children.length===0);
  pending.sort((a,b)=>b.contentIndex-a.contentIndex||parent.children.indexOf(b)-parent.children.indexOf(a));
  for(const edge of pending)adoptFollowingDirectoryItems(state,parent,edge);
 }
 state.directoryInsertionOwnershipVersion=1;
}
commitWorkspace(repairInsertedDirectoryOwnership);
function directoryEdges(book,node,state){return node?.parentId?state.directoryContents[book.directoryNodes.find(n=>n.id===node.parentId).contentId].children:book.directoryRoots}
function directoryContains(state,from,to,visited=new Set()){if(from===to)return true;if(visited.has(from))return false;visited.add(from);return state.directoryContents[from]?.children.some(n=>directoryContains(state,n.contentId,to,visited))||false}
function cloneDirectoryContent(state,id){const original=state.directoryContents[id],cid=directoryContentId(state);state.directoryContents[cid]={id:cid,items:structuredClone(original.items),children:original.children.map(n=>({...n,id:nextBusinessId('directories',state),contentId:cloneDirectoryContent(state,n.contentId)}))};return cid}
function moveDirectoryEntry(items,from,to,after){
 if(from<0||to<0||from===to)return;
 const [entry]=items.splice(from,1);items.splice(to-(from<to?1:0)+(after?1:0),0,entry);
}
function bindDirectorySorting(rows,group,onMove){
 let dragged=null;
 const clear=()=>rows.forEach(row=>row.classList.remove('sort-before','sort-after'));
 for(const row of rows){const handle=row.querySelector('.directory-sort-handle');if(!handle)continue;
 handle.ondragstart=e=>{dragged=row;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','directory-sort');};
 handle.ondragend=()=>{dragged=null;clear()};
 row.ondragover=e=>{if(!dragged||dragged===row||group(dragged)!==group(row))return;e.preventDefault();e.dataTransfer.dropEffect='move';clear();row.classList.add(e.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2?'sort-after':'sort-before')};
 row.ondrop=e=>{if(!dragged||dragged===row||group(dragged)!==group(row))return;e.preventDefault();const after=row.classList.contains('sort-after'),source=dragged;clear();dragged=null;onMove(source,row,after)};
 handle.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const peers=rows.filter(r=>group(r)===group(row)),index=peers.indexOf(row),next=index+(e.key==='ArrowDown'?1:-1);if(peers[next]){onMove(row,peers[next],next>index);const scope=row.hasAttribute('data-basket-id')?'#basket-composer':row.hasAttribute('data-directory-row')?'.book-directory-tree':row.closest('.suite-material-table')?'.suite-material-table':'.directory-detail-table';document.querySelectorAll(scope+' .directory-sort-handle')[rows.indexOf(peers[next])]?.focus()}};
 }
}
renderBookDirectory=function(book,target,showTree){
 if(book.bookType==='校本书籍'&&book.directoryRoots&&book.directoryNodes?.some(n=>data.books.some(other=>other.id!==book.id&&other.directoryNodes?.some(o=>o.contentId===n.contentId)))){if(!commitWorkspace(state=>{const own=state.books.find(b=>b.id===book.id);own.directoryRoots=own.directoryRoots.map(edge=>({...edge,contentId:cloneDirectoryContent(state,edge.contentId)}))}))return;book=data.books.find(b=>b.id===book.id)}
 if(!book.sharedResources){legacyBookDirectory(book,target,showTree);return}
 if(!book.directoryRoots){commitWorkspace(d=>{const b=d.books.find(b=>b.id===book.id);b.directoryRoots=[]});book=data.books.find(b=>b.id===book.id)}
 const nodes=book.directoryNodes;let chosen=nodes.find(n=>n.id===selectedDirectory);if(!chosen&&selectedDirectory!==BOOK_DIRECTORY_ROOT){chosen=nodes.find(n=>data.directoryContents[n.contentId].items.length)||nodes[0];selectedDirectory=chosen?.id||BOOK_DIRECTORY_ROOT}
 let content=chosen?data.directoryContents[chosen.contentId]:null;
 const types={suites:'听力套题',wordlists:'词汇表',practices:'听力练习',papers:'高考真题卷'};
 const rows=nodes.flatMap(n=>(data.directoryContents[n.contentId]?.items||[]).map((item,index)=>({key:n.id+':item:'+index,owner:n,item,index})));
 const grip='<button class="directory-sort-handle" draggable="true" aria-label="拖动排序，也可用上下方向键调整">⠿</button>';
 function insertionGap(n,depth,index=null){

 const ancestors=[];let ancestor=n;while(ancestor){ancestors.unshift(ancestor);ancestor=nodes.find(item=>item.id===ancestor.parentId)}
 const choices=[...ancestors.slice(0,2).map((item,i)=>['new-directory','sibling',(i===0?'一级目录':'二级目录'),item.id]),...(ancestors.length===1?[['new-directory','child','二级目录',n.id]]:[]),['insert-content',String(index??0),'内容',n.id]];
 return `<div class="directory-insert-gap labeled-insert-gap" style="--insert-depth:0;--insert-offset:0px" data-action-owner="${esc(n.id)}" data-content-index="${index??0}" data-insert-kind="${index===null?'directory':'content'}"><div class="directory-insert-hit"><div class="directory-insert-options">${choices.map(([action,value,label,owner],i)=>`<button class="directory-insert-button ${i===0?'is-active':''}" style="--insert-slot:${i}" data-insert-slot="${i}" data-action-owner="${esc(owner)}" data-resource-action="${action}" data-value="${value}" aria-label="新增${label}">${icon('plus')}<span>${esc(label)}</span></button>`).join('')}</div></div></div>`;

 }
 function guides(depth){return `<span class="directory-level-guides" aria-hidden="true">${Array.from({length:depth},(_,i)=>`<i style="--guide-level:${i}"></i>`).join('')}</span>`}
 function tree(parent='',depth=0,boundary=null){const parentNode=nodes.find(n=>n.id===parent),itemCount=parentNode?data.directoryContents[parentNode.contentId].items.length:0;return nodes.filter(n=>n.parentId===parent&&(boundary===null||Math.min(n.contentIndex??itemCount,itemCount)===boundary)).map((n,position)=>{
 const c=data.directoryContents[n.contentId],children=nodes.some(x=>x.parentId===n.id)||c.items.length,closed=collapsedBookDirectories.has(n.id);
 return `<div data-directory-row="${esc(n.id)}" class="book-tree-row unified-directory-row ${depth?'chapter-heading':'part-heading'}" style="--chapter-depth:${depth}">${guides(depth)}<div class="unified-name" data-action-owner="${esc(n.id)}">${grip}<button class="tree-toggle" data-resource-action="toggle" data-value="${esc(n.id)}" aria-expanded="${!closed}" aria-label="展开或折叠${esc(n.name)}" ${children?'':'disabled'}><svg class="icon nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button><button class="book-tree-label" data-resource-action="select" data-value="${esc(n.id)}"><span>${esc(n.name)}</span></button><button class="linkbtn directory-rename-button" data-resource-action="rename" data-value="${esc(n.id)}" aria-label="重命名${esc(n.name)}"><img class="icon" src="assets/directory-icons/EditOutlined.svg" alt=""></button></div><div class="directory-row-actions" data-action-owner="${esc(n.id)}"><button class="btn directory-trash-button" data-resource-action="delete" data-value="${esc(n.id)}" aria-label="删除目录${esc(n.name)}">${icon('trash')}</button></div></div>${insertionGap(n,depth)}${closed?'':rows.filter(r=>r.owner.id===n.id).map(r=>`${tree(n.id,depth+1,r.index)}<div class="unified-content-row" data-row-key="${esc(r.key)}" data-item-owner="${esc(n.id)}" style="--chapter-depth:${depth}">${guides(depth+1)}<div class="unified-name">${grip}<span class="chapter-resource-icon ${esc(r.item.kind)}">${icon(r.item.kind==='suites'?'headphones':r.item.kind==='wordlists'?'dictionary':'file')}</span><span class="chapter-resource-title">${esc(resourceName(r.item.kind,r.item.id))}</span><span class="chapter-resource-meta">${esc(types[r.item.kind]||r.item.kind)}ID：${esc(r.item.id)}</span></div><div class="content-row-actions"><button class="linkbtn" data-resource-action="view" data-value="${esc(r.key)}">查看</button><button class="linkbtn" data-resource-action="edit" data-value="${esc(r.key)}">编辑</button><button class="linkbtn resource-danger" data-resource-action="delete-row" data-value="${esc(r.key)}">解除引用</button></div></div>${insertionGap(n,depth+1,r.index+1)}`).join('')+tree(n.id,depth+1,c.items.length)}${!closed&&!children?`<div class="unified-empty directory-empty-indented" style="--chapter-depth:${depth}" data-empty-owner="${esc(n.id)}">暂无内容</div>`:''}`;
 }).join('')}
 BookUI.disposeTable();target.classList.add('directory-split-host');target.innerHTML=`<section class="book-directory-unified chapter-stream"><div class="unified-directory-toolbar"><h3>书籍目录与内容</h3><div class="directory-expand-depth"><span>展开到：</span><div class="directory-depth-switch" role="radiogroup" aria-label="展开到"><label><input type="radio" name="directory-expand-depth" value="all" ${nodes.every(n=>!collapsedBookDirectories.has(n.id))?'checked':''}><span>全部</span></label><label><input type="radio" name="directory-expand-depth" value="second" ${nodes.some(n=>n.parentId)&&nodes.every(n=>collapsedBookDirectories.has(n.id)===!!n.parentId)?'checked':''}><span>二级目录</span></label></div></div></div><div class="book-directory-tree directory-detail-table" aria-label="书籍目录与内容">${tree()||'<div class="unified-empty"><button class="btn" data-resource-action="new-directory" data-value="root">添加首个目录</button></div>'}</div></section>`;
 target.querySelectorAll('.directory-add-menu').forEach(menu=>{menu.addEventListener('toggle',()=>{if(menu.open)target.querySelectorAll('.directory-add-menu[open]').forEach(other=>{if(other!==menu)other.open=false})});menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;menu.querySelector('summary').focus()}})});
 target.querySelectorAll('[name="directory-expand-depth"]').forEach(input=>input.onchange=()=>{if(!input.checked)return;nodes.forEach(n=>input.value==='all'||!n.parentId?collapsedBookDirectories.delete(n.id):collapsedBookDirectories.add(n.id));render()});
 const mutate=fn=>resourceCommit(d=>fn(d,d.books.find(b=>b.id===book.id)));
 const treeRows=[...target.querySelectorAll('[data-directory-row]')];
 bindDirectorySorting(treeRows,el=>nodes.find(n=>n.id===el.dataset.directoryRow).parentId,(from,to,after)=>{
  const source=nodes.find(n=>n.id===from.dataset.directoryRow),destination=nodes.find(n=>n.id===to.dataset.directoryRow);
  if(source.parentId!==destination.parentId)return;
  mutate((d,b)=>{const edges=directoryEdges(b,source,d);moveDirectoryEntry(edges,edges.findIndex(e=>e.id===source.edgeId),edges.findIndex(e=>e.id===destination.edgeId),after)});
 });
 // Content can move between directories, including empty ones.
 let draggedContent=null;
 const contentTargets=[...target.querySelectorAll('.unified-content-row,[data-directory-row],[data-empty-owner],.directory-insert-gap')];
 const clearContentDrop=()=>contentTargets.forEach(el=>el.classList.remove('sort-before','sort-after','content-drop-target'));
 const destinationFor=(el,after=false)=>{
  const row=rows.find(r=>r.key===el.dataset.rowKey);
  if(row)return {owner:row.owner,index:row.index+(after?1:0)};
  const owner=nodes.find(n=>n.id===(el.dataset.directoryRow||el.dataset.emptyOwner||el.dataset.actionOwner));
  return owner?{owner,index:el.classList.contains('directory-insert-gap')?Number(el.dataset.contentIndex):0}:null;
 };
 const moveContent=(source,dest)=>{
  if(!source||!dest)return;
  collapsedBookDirectories.delete(dest.owner.id);
  mutate(d=>{
   const from=d.directoryContents[source.owner.contentId],to=d.directoryContents[dest.owner.contentId];
   let index=dest.index;
   if(from===to&&source.index<index)index--;
   if(from===to&&source.index===index)return;
   const [item]=from.items.splice(source.index,1);if(!item)return;
   for(const edge of from.children)if(edge.contentIndex>source.index)edge.contentIndex--;
   index=Math.max(0,Math.min(index,to.items.length));
   for(const edge of to.children)if(edge.contentIndex>index)edge.contentIndex++;
   to.items.splice(index,0,item);
  });
 };
 for(const el of target.querySelectorAll('.unified-content-row')){
  const handle=el.querySelector('.directory-sort-handle');
  handle.ondragstart=e=>{draggedContent=rows.find(r=>r.key===el.dataset.rowKey);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','directory-content');};
  handle.ondragend=()=>{draggedContent=null;clearContentDrop()};
  handle.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const peers=contentTargets.filter(t=>!t.classList.contains('directory-insert-gap')&&!t.dataset.emptyOwner),at=peers.indexOf(el),next=peers[at+(e.key==='ArrowUp'?-1:1)];if(next)moveContent(rows.find(r=>r.key===el.dataset.rowKey),destinationFor(next,e.key==='ArrowDown'))};
 }
 for(const el of contentTargets){
  el.addEventListener('dragover',e=>{if(!draggedContent)return;e.preventDefault();e.stopImmediatePropagation();e.dataTransfer.dropEffect='move';clearContentDrop();const after=el.classList.contains('unified-content-row')&&e.clientY>el.getBoundingClientRect().top+el.getBoundingClientRect().height/2;el.classList.add(el.classList.contains('unified-content-row')?(after?'sort-after':'sort-before'):'content-drop-target');},true);
  el.addEventListener('drop',e=>{if(!draggedContent)return;e.preventDefault();e.stopImmediatePropagation();const source=draggedContent,dest=destinationFor(el,el.classList.contains('sort-after'));draggedContent=null;clearContentDrop();moveContent(source,dest)},true);
 }


 function addDirectory(copy){const sources=data.books.filter(b=>b.id!==book.id&&b.sharedResources);const choices=sources.flatMap(b=>b.directoryNodes.filter(n=>!chosen||!b.directoryNodes.some(child=>child.parentId===n.id)).map(n=>({id:b.id+'|'+n.id,name:b.name+' / '+n.name})));resourcePick(copy?'复制书籍目录':'引用书籍目录',choices,[],ids=>{const selected=ids.map(value=>{const [bid,nid]=value.split('|');return data.books.find(b=>b.id===bid).directoryNodes.find(n=>n.id===nid)});if(!copy&&chosen&&selected.some(n=>directoryContains(data,n.contentId,chosen.contentId))){toast('不能引用自身或上级目录');return false}return mutate((d,b)=>{const edges=chosen?d.directoryContents[chosen.contentId].children:b.directoryRoots;for(const n of selected)edges.push({id:nextBusinessId('directories',d),name:n.name,contentId:copy?cloneDirectoryContent(d,n.contentId):n.contentId,visible:true})})})}
 function openRow(key,mode){if(book.bookType==='校本书籍')mode='view';const r=rows.find(r=>r.key===key);if(r.node){selectedDirectory=r.node.id;render()}else if(r.item.kind==='suites'){const entry={kind:'suites',id:r.item.id,mode:'view',bookReference:{bookId:book.id,nodeId:r.owner.id,index:r.index}};if(mode!=='view'&&bookStructureEditable(book.id)&&!suiteStructureEditable(entry.id,book.id))chooseSuiteEdit(entry);else openWholeSuiteEditor(entry,undefined,mode==='view');return}else resourceOpen(r.item.kind,r.item.id,mode)}
 function removeDirectory(id){const node=nodes.find(n=>n.id===id);openDialog('删除目录','<p>确认从本书删除目录“'+esc(node.name)+'”及其下级目录？目录内的内容将从本书移除，原始内容仍保留。</p>','<button class="btn" data-close>取消</button><button class="btn danger" id="directory-remove-confirm">删除目录</button>');$('#directory-remove-confirm').onclick=()=>{if(commitWorkspace(d=>{const b=d.books.find(b=>b.id===book.id),edges=directoryEdges(b,node,d);edges.splice(edges.findIndex(e=>e.id===node.edgeId),1)})){selectedDirectory=node.parentId||BOOK_DIRECTORY_ROOT;closeDialog();render()}}}
 function inlineDirectoryEdit(mode,id,insertAnchor){

 target.querySelectorAll('details[open]').forEach(d=>d.open=false);
 const previousForm=target.querySelector('#inline-directory-form');if(previousForm)previousForm.cancelEdit();
 const renaming=mode==='rename',current=renaming?nodes.find(n=>n.id===id):chosen;
 const parentId=renaming?current.parentId:mode==='root'?'':mode==='sibling'?current?.parentId||'':current?.id||'';
 const anchor=mode==='root'?null:Array.from(target.querySelectorAll('[data-directory-row]')).find(el=>el.dataset.directoryRow===current?.id);
 const formHtml=`<form id="inline-directory-form" class="inline-directory-form ${renaming?'directory-title-editor':''}"><label class="sr-only" for="inline-directory-name">目录名称</label><input id="inline-directory-name" class="input" name="name" required maxlength="150" value="${esc(renaming?current.name:'')}" placeholder="输入目录名称">${renaming?'':'<button class="linkbtn" type="submit">保存</button><button class="linkbtn" type="button" id="cancel-inline-directory">取消</button>'}<p class="error" id="inline-directory-error" role="alert"></p></form>`;
 const title=renaming?anchor.querySelector('.book-tree-label'):null,pen=renaming?anchor.querySelector('.directory-rename-button'):null;
 if(renaming){title.hidden=true;pen.hidden=true;title.insertAdjacentHTML('beforebegin',formHtml)}else if(insertAnchor)insertAnchor.insertAdjacentHTML('beforebegin',formHtml);else if(anchor)anchor.insertAdjacentHTML('afterend',formHtml);else target.querySelector('.book-directory-tree').insertAdjacentHTML('afterbegin',formHtml);
 const form=target.querySelector('#inline-directory-form');form.cancelEdit=()=>{form.remove();if(title){title.hidden=false;pen.hidden=false}};
 form.querySelector('#cancel-inline-directory')?.addEventListener('click',form.cancelEdit);
 form.onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='Escape'){e.preventDefault();form.cancelEdit();pen?.focus()}else if(e.key==='Enter'&&e.target.matches('input')){e.preventDefault();form.requestSubmit()}};
 form.onsubmit=e=>{e.preventDefault();const name=form.elements.name.value.trim();if(!name){$('#inline-directory-error').textContent='请输入目录名称';return}
 if(nodes.some(n=>n.parentId===parentId&&n.name===name&&(!renaming||n.id!==id))){$('#inline-directory-error').textContent='同级名称已存在';return}
 let nextSelection;
 if(commitWorkspace(d=>{const b=d.books.find(b=>b.id===book.id),parentNode=b.directoryNodes.find(n=>n.id===parentId),edges=parentNode?d.directoryContents[parentNode.contentId].children:b.directoryRoots;
 if(renaming){edges.find(n=>n.id===current.edgeId).name=name;nextSelection=id}else{const cid=directoryContentId(d);d.directoryContents[cid]={id:cid,items:[],children:[]};const edge={id:nextBusinessId('directories',d),name,contentId:cid,visible:true,...(mode==='child'?{contentIndex:Number(insertAnchor?.dataset.contentIndex||0)}:mode==='sibling'&&current?.contentIndex!==undefined?{contentIndex:current.contentIndex}:{})};const pos=mode==='sibling'?edges.findIndex(n=>n.id===current.edgeId):-1;if(pos>=0)edges.splice(pos+1,0,edge);else if(mode==='child')edges.unshift(edge);else edges.push(edge);if(mode==='child'&&parentNode)adoptFollowingDirectoryItems(d,d.directoryContents[parentNode.contentId],edge);if(mode==='sibling'&&insertAnchor){const source=nodes.find(n=>n.id===insertAnchor.dataset.actionOwner);splitDirectoryAt(d,b,current,source,Number(insertAnchor.dataset.contentIndex||0),d.directoryContents[cid]);}nextSelection=parentId?parentId+'/'+edge.id:edge.id}
 })){collapsedBookDirectories.delete(parentId);selectedDirectory=nextSelection;render()}else $('#inline-directory-error').textContent='保存失败，请重试';
 };form.elements.name.focus();form.elements.name.select();
 }
 resourceBind({'insert-content':index=>{collapsedBookDirectories.delete(chosen.id);book.bookType==='校本书籍'?openSchoolBookBuilder(book.id,chosen.contentId,Number(index)):openDirectoryAdd(chosen.contentId,Number(index))},'expand-all':()=>{nodes.forEach(n=>collapsedBookDirectories.delete(n.id));render()},'collapse-all':()=>{nodes.forEach(n=>collapsedBookDirectories.add(n.id));render()},'add-content':()=>book.bookType==='校本书籍'?openSchoolBookBuilder(book.id,chosen.contentId):openDirectoryAdd(chosen.contentId),select:id=>{selectedDirectory=id;const node=nodes.find(n=>n.id===id);if(node){collapsedBookDirectories.has(id)?collapsedBookDirectories.delete(id):collapsedBookDirectories.add(id)}render()},toggle:id=>{collapsedBookDirectories.has(id)?collapsedBookDirectories.delete(id):collapsedBookDirectories.add(id);render()},rename:id=>inlineDirectoryEdit('rename',id),delete:removeDirectory,'new-directory':level=>inlineDirectoryEdit(level),'new-content':kind=>resourceCreate(kind,(d,id)=>d.directoryContents[chosen.contentId].items.push({kind,id})),'pick-content':()=>resourcePick('引用已有内容',Object.keys(types).flatMap(kind=>Object.values(resourceCollection(kind)).map(r=>({id:kind+':'+r.id,name:types[kind]+' · '+resourceName(kind,r.id)}))),content.items.map(i=>i.kind+':'+i.id),ids=>mutate(d=>{const c=d.directoryContents[chosen.contentId];c.items=c.items.filter(i=>ids.includes(i.kind+':'+i.id));for(const value of ids){const [kind,id]=value.split(':');if(!c.items.some(i=>i.kind===kind&&i.id===id))c.items.push({kind,id})}})),view:key=>openRow(key,'view'),edit:key=>openRow(key,'edit'),'delete-row':key=>{const r=rows.find(r=>r.key===key);if(r.node){removeDirectory(r.node.id);return}openDialog('解除引用内容','<p>确认解除引用此内容？</p>','<button class="btn" data-close>取消</button><button class="btn danger" id="directory-item-remove">解除引用</button>');$('#directory-item-remove').onclick=()=>{if(commitWorkspace(d=>d.directoryContents[r.owner.contentId].items.splice(r.index,1))){closeDialog();render()}}},'reference-directory':()=>addDirectory(false),'copy-directory':()=>addDirectory(true)});
 target.querySelectorAll('.directory-insert-options').forEach(options=>{
 const buttons=[...options.querySelectorAll('button')];
 buttons.forEach((button,index)=>{
 const activate=()=>buttons.forEach(other=>other.classList.toggle('is-active',other===button));
 button.addEventListener('pointerenter',activate);button.addEventListener('focus',activate);
 button.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();buttons[(index+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length].focus()}});
 });
 });
 target.querySelectorAll('[data-action-owner] [data-resource-action]').forEach(button=>{const action=button.onclick;button.onclick=()=>{chosen=nodes.find(n=>n.id===button.closest('[data-action-owner]').dataset.actionOwner);selectedDirectory=chosen.id;content=data.directoryContents[chosen.contentId];if(button.dataset.resourceAction==='new-directory')inlineDirectoryEdit(button.dataset.value,undefined,button.closest('.directory-insert-gap'));else action()}});
};
resourceReferenceRows=function(kind,id){const rows=[];for(const b of data.books)for(const n of b.directoryNodes||[])if(data.directoryContents[n.contentId]?.items.some(i=>i.kind===kind&&i.id===id))rows.push({key:b.id+'/'+n.id,type:b.bookType||'听力书籍',name:b.name,id:b.bookId,bookId:b.id,nodeId:n.id,parentId:n.id,relation:n.name});return rows};
resourceUses=function(kind,id,state=data){const uses=[];for(const b of state.books)for(const n of b.directoryNodes||[])if(state.directoryContents[n.contentId]?.items.some(i=>i.kind===kind&&i.id===id))uses.push(b.name+' / '+n.name);for(const c of Object.values(state.directoryContents||{}))if(c.items.some(i=>i.kind===kind&&i.id===id)&&!state.books.some(b=>b.directoryNodes?.some(n=>n.contentId===c.id)))uses.push('已保留的目录内容');return uses};
bankReferenceIndex=function(state=data){const index=originalBankReferenceIndex(state);for(const b of state.books)for(const n of b.directoryNodes||[])for(const item of state.directoryContents[n.contentId]?.items||[]){const content=resourceCollection(item.kind,state)?.[item.id];for(const mid of content?.materialIds||[])for(const q of Object.values(bankData(state).questions).filter(q=>q.scriptId===mid))(index[q.id] ||= []).push({bookId:b.id,bookName:b.name,nodeId:n.id,key:n.id,name:n.name,number:q.number})}return index};
const renderBeforeDirectoryMigration=editorialRender;
editorialRender=function(){if(page==='resource-packages'){page='books';bookType='听力书籍'}if(resourceTrail.some(r=>r.kind==='packages'))resourceTrail=[];return renderBeforeDirectoryMigration()};
document.querySelector('.nav [data-page="resource-packages"]')?.remove();
if(!data.simpleContentNamesVersion)commitWorkspace(d=>{
 for(const w of Object.values(d.teachingLibrary.wordlists))if(w.name==='训练 1 · 难点词汇')w.name='难点词汇';
 for(const p of Object.values(d.teachingLibrary.practices))if(['训练 1 · 精听挖空示例','训练 1 · 听力练习'].includes(p.name))p.name='听力练习';
 d.simpleContentNamesVersion=1;
});
render();

function generateSchoolBook(sourceId){
 if(Array.isArray(sourceId))return;const source=data.books.find(b=>b.id===sourceId&&b.bookType==='听力书籍');if(!source)return;if(!bookFlow(source).published){toast('来源书籍未发布，无法生成校本书籍');return}
 const schools=[...new Set([...(data.schools||[]).map(s=>typeof s==='string'?s:s.name),...data.books.flatMap(b=>b.schoolNames||[b.schoolName]),'杭州市第一中学','杭州市第二中学','杭州市学军中学','宁波市效实中学','温州市中学'].filter(Boolean))];
 const selectedSchools=new Set(),entries=new Map(),picked=new Set(),collapsed=new Set();let sequence=0;
 const types={suites:'听力套题',practices:'听力练习',wordlists:'词汇表',papers:'听力套题'};
 function branch(edge,ancestors=new Set(),depth=0){
  if(ancestors.has(edge.contentId))return null;const content=data.directoryContents[edge.contentId];if(!content)return null;
  const node={key:String(++sequence),edge,items:(content.items||[]).map(item=>{const entry={key:String(++sequence),item};entries.set(entry.key,entry);picked.add(entry.key);return entry}),children:(content.children||[]).map(child=>branch(child,new Set([...ancestors,edge.contentId]),depth+1)).filter(Boolean)};entries.set(node.key,node);if(depth>=1)collapsed.add(node.key);return node;
 }
 const roots=(source.directoryRoots||[]).map(edge=>branch(edge)).filter(Boolean);
 const leaves=node=>node.item?[node]:[...node.items,...node.children.flatMap(leaves)];
 const itemName=item=>resourceCollection(item.kind)?.[item.id]?.name||resourceCollection(item.kind)?.[item.id]?.title||item.id;
 const matches=()=>true;const filteredPath=node=>leaves(node);const current=()=>roots.flatMap(leaves);
 openDialog('生成校本书籍',`<form id="generate-school-form" class="school-generation-layout"><aside class="school-generation-info"><label class="field"><span>校本书籍名称 <em>*</em></span><input class="input" name="name" required maxlength="160" value="${esc(source.name+'（校本）')}"></label><label class="field"><span>选择学校 <em>*</em> <small>可多选</small></span><input class="input" id="school-search" placeholder="输入学校名称搜索" autocomplete="off"></label><div id="school-search-results" aria-live="polite"></div><div class="school-selected-heading">已选学校 <span id="school-selected-count">0</span></div><div id="school-selected-list"></div></aside><section class="school-generation-content"><div class="row between"><h3>选择目录与内容</h3></div><div class="school-kind-filters" role="group" aria-label="内容分类">${Object.entries({suites:'听力套题',practices:'听力练习',wordlists:'词汇表'}).map(([key,label])=>`<label class="school-kind-option"><input type="checkbox" data-school-kind="${key}"><span>${label}</span></label>`).join('')}</div><div class="school-content-picker" id="school-tree"></div></section><p class="error" id="generate-school-error" role="alert"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" id="school-generate-submit" form="generate-school-form">确认生成</button>`);
 const dialog=$('#dialog');dialog.dataset.auditMode='create';dialog.dataset.auditKey=JSON.stringify(['books','new']);
 const form=$('#generate-school-form');
 function summary(){$('#school-selected-count').textContent=selectedSchools.size;}
 function schoolChoices(){const q=$('#school-search').value.trim().toLowerCase(),results=$('#school-search-results');results.hidden=!q;results.innerHTML=q?(schools.filter(s=>!selectedSchools.has(s)&&s.toLowerCase().includes(q)).map(s=>`<button type="button" data-school-add="${esc(s)}">${esc(s)}<span>＋ 选择</span></button>`).join('')||'<p class="muted">没有匹配的未选学校</p>'):'';results.querySelectorAll('[data-school-add]').forEach(b=>b.onclick=()=>{selectedSchools.add(b.dataset.schoolAdd);$('#school-search').value='';schoolChoices()});$('#school-selected-list').innerHTML=[...selectedSchools].map(s=>`<div class="school-selected-row"><span>${esc(s)}</span><button type="button" class="linkbtn" data-school-remove="${esc(s)}" aria-label="移除${esc(s)}">移除</button></div>`).join('');$('#school-selected-list').querySelectorAll('[data-school-remove]').forEach(b=>b.onclick=()=>{selectedSchools.delete(b.dataset.schoolRemove);schoolChoices()});summary();}
 function tree(node,path=''){
  path+=' '+node.edge.name;const eligible=filteredPath(node,path),isClosed=collapsed.has(node.key);if(!eligible.length)return '';
  return `<li><div class="school-tree-row"><button type="button" class="school-tree-toggle" data-school-toggle="${node.key}" aria-label="${isClosed?'展开':'收起'}${esc(node.edge.name)}" aria-expanded="${!isClosed}"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${isClosed?'m9 5 7 7-7 7':'m5 9 7 7 7-7'}"/></svg></button><label><input type="checkbox" data-school-choice="${node.key}"><strong>${esc(node.edge.name)}</strong></label><small>${eligible.length} 项</small></div><ul ${isClosed?'hidden':''}>${node.items.filter(e=>matches(e,path)).map(e=>`<li><div class="school-tree-row school-tree-leaf"><label><input type="checkbox" data-school-choice="${e.key}" ${picked.has(e.key)?'checked':''}><span>${esc(itemName(e.item))}</span></label><small>${esc(types[e.item.kind]||e.item.kind)}</small></div></li>`).join('')}${node.children.map(c=>tree(c,path)).join('')}</ul></li>`;
 }
 function drawTree(){const scroll=$('#school-tree').scrollTop;$('#school-tree').innerHTML=`<section><h4>${esc(source.name)}</h4><ul>${roots.map(n=>tree(n)).join('')||'<li class="muted">没有匹配的内容</li>'}</ul></section>`;$('#school-tree').scrollTop=scroll;
  form.querySelectorAll('[data-school-choice]').forEach(box=>{const entry=entries.get(box.dataset.schoolChoice),items=entry.item?[entry]:current().filter(e=>leaves(entry).includes(e)),selected=items.filter(e=>picked.has(e.key)).length;box.checked=items.length>0&&selected===items.length;box.indeterminate=selected>0&&selected<items.length;box.onchange=()=>{items.forEach(e=>box.checked?picked.add(e.key):picked.delete(e.key));drawTree()}});
  form.querySelectorAll('[data-school-toggle]').forEach(b=>b.onclick=()=>{collapsed.has(b.dataset.schoolToggle)?collapsed.delete(b.dataset.schoolToggle):collapsed.add(b.dataset.schoolToggle);drawTree()});form.querySelectorAll('[data-school-kind]').forEach(box=>{const items=current().filter(e=>(e.item.kind==='papers'?'suites':e.item.kind)===box.dataset.schoolKind),count=items.filter(e=>picked.has(e.key)).length;box.checked=items.length>0&&count===items.length;box.indeterminate=count>0&&count<items.length;box.disabled=!items.length;});summary();
 }
 $('#school-search').oninput=schoolChoices;
 form.querySelectorAll('[data-school-kind]').forEach(box=>box.onchange=()=>{current().filter(e=>(e.item.kind==='papers'?'suites':e.item.kind)===box.dataset.schoolKind).forEach(e=>box.checked?picked.add(e.key):picked.delete(e.key));drawTree()});schoolChoices();drawTree();
 form.onsubmit=e=>{e.preventDefault();const name=form.elements.name.value.trim(),fail=message=>$('#generate-school-error').textContent=message;const currentSource=data.books.find(b=>b.id===source.id);if(!currentSource||!bookFlow(currentSource).published)return fail('来源书籍未发布，无法生成校本书籍');if(!name||!selectedSchools.size)return fail('请填写书籍名称并选择学校');if(!picked.size)return fail('请至少选择一项内容');const duplicate=[...selectedSchools].find(school=>data.books.some(b=>b.bookType==='校本书籍'&&(b.schoolNames||[b.schoolName]).includes(school)&&b.name===name));if(duplicate)return fail(duplicate+'已有同名书籍');
 if(commitWorkspace(state=>{
  function copyNode(node){if(!leaves(node).some(e=>picked.has(e.key)))return null;const cid=directoryContentId(state);state.directoryContents[cid]={id:cid,items:structuredClone(node.items.filter(e=>picked.has(e.key)).map(e=>e.item)),children:node.children.map(copyNode).filter(Boolean)};return {...node.edge,id:nextBusinessId('directories',state),sourceEdgeId:node.edge.id,contentId:cid}}
  {const schoolNames=[...selectedSchools],schoolName=schoolNames.join('、');const origin=state.books.find(b=>b.id===source.id),copy={...structuredClone(origin),id:'BK-'+crypto.randomUUID(),bookId:nextBusinessId('books',state),name,shortName:name,bookType:'校本书籍',schoolName,schoolNames,sourceListeningBookId:origin.id,sourceListeningBookIds:[origin.id],availability:'编写中',status:'草稿',sharedResources:true,directoryRoots:roots.map(copyNode).filter(Boolean),directoryNodes:[],workflow:{stage:'编书中',steps:['终审'],round:0,reviews:{},history:[],published:null}};delete copy.demo;delete copy.suiteContent;state.books.push(copy);}
 })){closeDialog();activeBook='';bookType='校本书籍';editorialQuery='';page='books';render();toast('校本书籍已生成')}
 };
}

function editSchoolBookScope(id){
 const book=data.books.find(b=>b.id===id&&b.bookType==='校本书籍');if(!book)return;
 const selected=new Set(book.schoolNames||[book.schoolName].filter(Boolean));
 const schools=[...new Set([...selected,...(data.schools||[]).map(s=>typeof s==='string'?s:s.name),...data.books.flatMap(b=>b.schoolNames||[b.schoolName]),'杭州市第一中学','杭州市第二中学','杭州市学军中学','宁波市效实中学','温州市中学'].filter(Boolean))];
 openDialog('可用范围',`<form id="school-scope-form"><label class="field"><span>选择学校（可多选）</span><input class="input" id="school-scope-search" placeholder="输入学校名称搜索" autocomplete="off"></label><div id="school-scope-results"></div><div id="school-scope-selected"></div><p class="error" id="school-scope-error"></p></form>`,'<button class="btn" data-close>取消</button><button class="btn primary" form="school-scope-form">保存</button>');
 $('#dialog').dataset.auditKey=JSON.stringify(['books',id]);
 const draw=()=>{const q=$('#school-scope-search').value.trim();$('#school-scope-results').innerHTML=q?schools.filter(s=>!selected.has(s)&&s.includes(q)).map(s=>`<button type="button" class="btn" data-scope-add="${esc(s)}">${esc(s)} ＋</button>`).join(''):'';$('#school-scope-selected').innerHTML=[...selected].map(s=>`<div class="school-selected-row"><span>${esc(s)}</span><button type="button" class="linkbtn" data-scope-remove="${esc(s)}">移除</button></div>`).join('');document.querySelectorAll('[data-scope-add]').forEach(b=>b.onclick=()=>{selected.add(b.dataset.scopeAdd);$('#school-scope-search').value='';draw()});document.querySelectorAll('[data-scope-remove]').forEach(b=>b.onclick=()=>{selected.delete(b.dataset.scopeRemove);draw()})};$('#school-scope-search').oninput=draw;draw();
 $('#school-scope-form').onsubmit=e=>{e.preventDefault();if(commitWorkspace(d=>{const b=d.books.find(b=>b.id===id);b.schoolNames=[...selected];b.schoolName=[...selected].join('、')})){closeDialog();render()}};
}

// Match provenance first; older school books predate sourceEdgeId.
function schoolSourceEdge(edges,source){return edges.find(e=>String(e.sourceEdgeId)===String(source.id))||edges.find(e=>!e.sourceEdgeId&&e.name===source.name)}
function restoreSchoolBookContents(id){
 const book=data.books.find(b=>b.id===id&&b.bookType==='校本书籍'),source=book&&schoolBookSource(book);if(!source){toast('来源书籍不存在，无法恢复内容');return}
 const entries=new Map(),picked=new Set();let sequence=0;
 function branch(edge,targets,depth=0,ancestors=new Set()){
  if(ancestors.has(edge.contentId))return null;const content=data.directoryContents[edge.contentId];if(!content)return null;
  const existing=schoolSourceEdge(targets,edge),own=data.directoryContents[existing?.contentId];
  const node={key:String(++sequence),edge,depth,items:(content.items||[]).map(item=>{const entry={key:String(++sequence),item,exists:!!own?.items.some(i=>i.kind===item.kind&&i.id===item.id)};entries.set(entry.key,entry);return entry}),children:(content.children||[]).map(e=>branch(e,own?.children||[],depth+1,new Set([...ancestors,edge.contentId]))).filter(Boolean)};entries.set(node.key,node);return node;
 }
 const roots=(source.directoryRoots||[]).map(e=>branch(e,book.directoryRoots||[])).filter(Boolean),leaves=n=>n.item?[n]:[...n.items,...n.children.flatMap(leaves)];
 const types={suites:'听力套题',papers:'听力套题',wordlists:'词汇表',practices:'听力练习'};
 function tree(n){return `<li><div class="school-tree-row"><button type="button" class="school-tree-toggle" data-restore-toggle="${n.key}" aria-label="展开或收起${esc(n.edge.name)}" aria-expanded="${n.depth===0}"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button><label><input type="checkbox" data-restore-choice="${n.key}"><strong>${esc(n.edge.name)}</strong></label></div><ul data-restore-children="${n.key}" ${n.depth?'hidden':''}>${n.items.map(e=>`<li><div class="school-tree-row school-tree-leaf"><label><input type="checkbox" data-restore-choice="${e.key}"><span>${esc(resourceCollection(e.item.kind)?.[e.item.id]?.name||resourceCollection(e.item.kind)?.[e.item.id]?.title||e.item.id)}</span></label><small>${e.exists?'已引用':esc(types[e.item.kind]||e.item.kind)}</small></div></li>`).join('')}${n.children.map(tree).join('')}</ul></li>`}
 openDialog('恢复来源内容',`<div id="school-restore-tree" class="school-content-picker"><h4>${esc(source.name)}</h4><ul>${roots.map(tree).join('')||'<li class="muted">来源书籍暂无内容</li>'}</ul></div><p class="error" id="school-restore-error" role="alert"></p>`,'<button class="btn" data-close>取消</button><button class="btn primary" id="school-restore-submit">确认恢复</button>');
 $('#dialog').dataset.auditKey=JSON.stringify(['books',book.id]);
 const boxes=[...document.querySelectorAll('[data-restore-choice]')];
 function refresh(){boxes.forEach(box=>{const list=leaves(entries.get(box.dataset.restoreChoice)),available=list.filter(e=>!e.exists),count=available.filter(e=>picked.has(e.key)).length;box.disabled=!available.length;box.checked=available.length?count===available.length:list.length>0;box.indeterminate=count>0&&count<available.length});$('#school-restore-submit').disabled=!picked.size}
 boxes.forEach(box=>box.onchange=()=>{leaves(entries.get(box.dataset.restoreChoice)).filter(e=>!e.exists).forEach(e=>box.checked?picked.add(e.key):picked.delete(e.key));refresh()});
 document.querySelectorAll('[data-restore-toggle]').forEach(button=>button.onclick=()=>{const list=document.querySelector(`[data-restore-children="${button.dataset.restoreToggle}"]`);list.hidden=!list.hidden;button.setAttribute('aria-expanded',String(!list.hidden))});refresh();
 $('#school-restore-submit').onclick=()=>{
  if(!picked.size)return;
  if(!schoolBookSource(data.books.find(b=>b.id===id))){$('#school-restore-error').textContent='来源书籍不存在，无法恢复内容';return}
  if(commitWorkspace(state=>{
   const target=state.books.find(b=>b.id===id);target.directoryRoots ||= [];
   function merge(node,edges){
    if(!leaves(node).some(e=>picked.has(e.key)))return;
    let edge=schoolSourceEdge(edges,node.edge);
    if(!edge){const cid=directoryContentId(state);state.directoryContents[cid]={id:cid,items:[],children:[]};edge={...node.edge,id:nextBusinessId('directories',state),sourceEdgeId:node.edge.id,contentId:cid};delete edge.contentIndex;edges.push(edge)}
    edge.sourceEdgeId=node.edge.id;const own=state.directoryContents[edge.contentId];
    for(const e of node.items)if(picked.has(e.key)&&!own.items.some(i=>i.kind===e.item.kind&&i.id===e.item.id))own.items.push(structuredClone(e.item));
    node.children.forEach(child=>merge(child,own.children));
   }
   roots.forEach(n=>merge(n,target.directoryRoots));
  })){closeDialog();render();toast('来源内容已恢复')}
 };
}
