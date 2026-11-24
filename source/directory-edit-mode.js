'use strict';
// Directory editing is a workspace transaction: linked content created here is
// committed together with its placement, while browsing never exposes mutations.
let directoryEditSession=null;
const directoryPersist=persistAppData;
persistAppData=function(value){if(directoryEditSession)return;return directoryPersist(value)};
function directoryEditing(bookId){return directoryEditSession?.bookId===bookId}
function directoryEditDirty(){return !!directoryEditSession&&JSON.stringify(data)!==directoryEditSession.baseline}
function discardDirectoryEdit(){
 if(!directoryEditSession)return;
 data=directoryEditSession.original;directoryEditSession=null;
}
function beginDirectoryEdit(book){
 directoryEditSession={bookId:book.id,original:structuredClone(data),baseline:JSON.stringify(data),route:{page,activeBook,bookSection,bookType}};
 render();
}
function saveDirectoryEdit(){
 const form=document.querySelector('#inline-directory-form');
 if(form){form.requestSubmit();if(form.isConnected)return}
 if(!directoryEditSession)return;
 const session=directoryEditSession,draft=structuredClone(data);
 data=session.original;directoryEditSession=null;
 const saved=commitWorkspace(state=>{
  for(const key of Object.keys(state))if(!(key in draft))delete state[key];
  Object.assign(state,draft);
 });
 if(!saved){data=draft;directoryEditSession=session;return}
 render();toast('目录已保存');
}
const directoryRender=render;
render=function(){
 if(directoryEditSession&&(page!==directoryEditSession.route.page||activeBook!==directoryEditSession.bookId||bookSection!==directoryEditSession.route.bookSection)){
  if(directoryEditDirty()&&!window.confirm('目录有未保存的修改，离开将放弃这些修改。是否离开？')){
   ({page,activeBook,bookSection,bookType}=directoryEditSession.route);
  }else discardDirectoryEdit();
 }
 return directoryRender();
};
window.addEventListener('beforeunload',event=>{if(directoryEditDirty()){event.preventDefault();event.returnValue=''}});
const directoryModeRenderer=renderBookDirectory;
renderBookDirectory=function(book,target,showTree){
 directoryModeRenderer(book,target,showTree);
 if(!book.sharedResources||!['听力书籍','校本书籍'].includes(book.bookType))return;
 const editing=directoryEditing(book.id);
 for(const row of target.querySelectorAll('.unified-content-row')){
  if(!optionalFeaturesExpanded()&&row.querySelector('.chapter-resource-icon.wordlists,.chapter-resource-icon.practices')){
   if(row.nextElementSibling?.classList.contains('directory-insert-gap'))row.nextElementSibling.remove();
   row.remove();
  }
 }
 const toolbar=target.querySelector('.unified-directory-toolbar');if(!toolbar)return;
 toolbar.querySelector('h3')?.remove();
 const actions=document.createElement('div');actions.className='directory-edit-actions';
 actions.innerHTML=editing?'<button class="btn primary" id="save-directory">保存目录</button><button class="btn" id="exit-directory-edit">退出编辑模式</button>':'<button class="btn primary" id="edit-directory">编辑目录</button>';
 toolbar.prepend(actions);
 if(editing){
  target.querySelectorAll('[data-resource-action="view"],[data-resource-action="edit"]').forEach(el=>el.remove());
  actions.querySelector('#save-directory').onclick=saveDirectoryEdit;
  actions.querySelector('#exit-directory-edit').onclick=()=>{
   if(directoryEditDirty()&&!window.confirm('退出将放弃未保存的目录修改，是否退出？'))return;
   discardDirectoryEdit();render();
  };
 }else{
  target.querySelectorAll('.directory-sort-handle,.directory-insert-gap,.directory-rename-button,.directory-trash-button,[data-resource-action="delete-row"],[data-resource-action="new-directory"]').forEach(el=>el.remove());
  target.querySelectorAll('[draggable]').forEach(el=>el.removeAttribute('draggable'));
  actions.querySelector('#edit-directory').onclick=()=>beginDirectoryEdit(book);
 }
};
