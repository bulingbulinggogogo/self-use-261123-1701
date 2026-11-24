'use strict';
// Load the durable snapshot before any application script can import or save data.
(async function boot(){
 const template=document.getElementById('app-bootstrap');
 if(!template)return;
 const app=document.getElementById('app');app.inert=true;
 const notice=document.createElement('div');
 notice.setAttribute('role','status');
 notice.style.cssText='position:fixed;right:24px;bottom:24px;z-index:10000;background:white;padding:12px 16px;border:1px solid #dce3ed;border-radius:8px;box-shadow:0 4px 20px #19345018';
 document.body.append(notice);
 function status(message,retry){notice.replaceChildren(document.createTextNode(message));notice.hidden=!message;if(retry){const button=document.createElement('button');button.className='linkbtn';button.textContent='重试';button.onclick=retry;notice.append(button)}}
 status('正在读取数据…');
 let scriptsReady=false;
 try{
 const db=await new Promise((resolve,reject)=>{
 const request=indexedDB.open('victor-editorial-workspace',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 request.onblocked=()=>status('请关闭其他教研后台页面后重试',()=>location.reload());
 });
 db.onversionchange=()=>{db.close();app.inert=true;status('数据存储已更新，请刷新页面',()=>location.reload())};
 const initialText=await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readonly'),request=tx.objectStore('snapshots').get('workspace');tx.oncomplete=()=>resolve(request.result??null);tx.onabort=()=>reject(tx.error)});
 let tail=Promise.resolve(),pending=0,lastText=null,failed=false;
 function write(text){
 lastText=text;pending++;status('正在保存…');
 const task=tail.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
 const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(text,'workspace');
 tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('保存失败'));
 }));
 tail=task;
 task.then(()=>{window.dispatchEvent(new CustomEvent('app-data-saved',{detail:text}));pending--;failed=false;if(!pending)status('')},()=>{pending--;failed=true;status('保存失败，修改尚未保存',()=>write(lastText))});
 return task;
 }
 window.AppStorage={initialText,write,get pending(){return pending>0||failed},flush:()=>tail};
 window.addEventListener('beforeunload',event=>{if(pending||failed){event.preventDefault();event.returnValue=''}});
 for(const source of template.content.querySelectorAll('script')){
 const script=document.createElement('script');
 if(source.src){const sourcePath=source.getAttribute('src');script.src=sourcePath==='assets/book-ui.js'?sourcePath+'?v=20261109-recording-picker-4':sourcePath;await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('加载失败'));document.body.append(script)})}
 else{script.textContent=source.textContent;document.body.append(script);if(window.AppStorage.loadError)throw window.AppStorage.loadError}
 }
 scriptsReady=true;
 // Persist migration results too, including a workspace whose old localStorage was full.
 await write(serializeAppData(data));
 app.inert=false;template.remove();status('');
 }catch(error){console.error('Workspace storage failed:',error);
 const retry=async()=>{try{await window.AppStorage.write(serializeAppData(data));app.inert=false;template.remove();status('')}catch{status('保存失败，修改尚未保存',retry)}};
 status(scriptsReady?'保存失败，修改尚未保存':'数据读取失败，请重试',scriptsReady?retry:()=>location.reload());
 }
})();
