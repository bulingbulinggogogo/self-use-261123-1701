'use strict';
// Migrate the collected papers into the same persisted book/directory model as listening books.
function migrateGaokaoBook(state){
 if(state.gaokaoBookId&&state.books.some(b=>b.id===state.gaokaoBookId))return;
 const id=nextBusinessId('books',state);
 const book={id,bookId:id,name:'高考真题',bookType:'高考真题',subject:'英语',grade:'通用',version:'2026',productCategory:'高考真题',textbookVersion:'通用',status:'草稿',wordIds:[],sharedResources:true,directoryRoots:[],directoryNodes:[]};
 state.books.push(book);state.gaokaoBookId=id;
 const papers=Object.values(bankData(state).papers||{});
 const years=[...new Set(papers.map(p=>String(p.year||'未填写年份')))].sort((a,b)=>b.localeCompare(a));
 const directory=(name,items=[])=>{const contentId=directoryContentId(state);state.directoryContents[contentId]={id:contentId,items,children:[]};return {id:nextBusinessId('directories',state),name,contentId,visible:true}};
 for(const year of years){
  const root=directory(year);book.directoryRoots.push(root);
  for(const paper of papers.filter(p=>String(p.year||'未填写年份')===year)){
   const child=directory(paper.source||paper.name,paper.listeningSuiteId?[{kind:'suites',id:paper.listeningSuiteId}]:[]);
   child.sourcePaperId=paper.id;state.directoryContents[root.contentId].children.push(child);
  }
 }
 syncBookDirectories(state);
}
commitWorkspace(migrateGaokaoBook);
const gaokaoNav=document.querySelector('[data-page="resource-suites"]');
if(gaokaoNav){
 gaokaoNav.textContent='高考真题';document.querySelector('#book-types').append(gaokaoNav);
 gaokaoNav.removeAttribute('data-page');gaokaoNav.dataset.bookType='高考真题';
 gaokaoNav.onclick=()=>{resourceTrail=[];bookType='高考真题';bookSection='基本信息';selectedDirectory='';navEditorial('books',data.gaokaoBookId)};
}
titles['resource-suites']='高考真题';
const editorialBeforeGaokaoBook=editorialRender;
editorialRender=function(){
 if(['resource-suites','gaokao-bank'].includes(page)&&!resourceTrail.length){page='books';bookType='高考真题';activeBook=data.gaokaoBookId}
 return editorialBeforeGaokaoBook();
};
render();
