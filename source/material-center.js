'use strict';
// Shared material library and legacy sample media.
const materialCenterSamples=[
 {id:'MC-001',name:'zd_record.aac',references:['record','present1'],category:'语音指导音频',format:'AAC',duration:'00:32',size:'256 KB'},
 {id:'MC-002',name:'听力微技能：捕捉关键词.mp4',references:[],category:'微技能视频',format:'MP4',duration:'02:15',size:'18.6 MB'}
];
let materialCenterCategories=[],materialCenterQuery='',materialCenterKind='image';
const materialKindLabels={audio:'音频',image:'图片',video:'视频'};
function materialKind(item){return item.mediaKind||(/^(mp4|webm|mov)$/i.test(item.format)?'video':/^(png|jpg|jpeg|gif|webp|svg)$/i.test(item.format)?'image':'audio')}
function materialKindItems(){return materialCenterItems().filter(item=>materialKind(item)===materialCenterKind)}
titles['material-center']='素材中心';
const materialCenterNav=document.createElement('button');
materialCenterNav.dataset.page='material-center';
materialCenterNav.innerHTML=icon('grid')+'素材中心'+ '<svg class="icon nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>' ;
materialCenterNav.setAttribute('aria-expanded','false');materialCenterNav.setAttribute('aria-controls','material-center-subnav');
document.querySelector('#sidebar [data-page="dashboard"]').after(materialCenterNav);
const materialCenterSubnav=document.createElement('div');materialCenterSubnav.id='material-center-subnav';materialCenterSubnav.className='subnav';materialCenterSubnav.hidden=true;
materialCenterSubnav.innerHTML=Object.entries(materialKindLabels).filter(([kind])=>kind!=='audio').map(([kind,label])=>`<button data-material-kind="${kind}">${label}</button>`).join('');materialCenterNav.after(materialCenterSubnav);
materialCenterNav.onclick=()=>{const expanded=materialCenterNav.getAttribute('aria-expanded')==='true';materialCenterNav.setAttribute('aria-expanded',String(!expanded));materialCenterSubnav.hidden=expanded};
materialCenterSubnav.querySelectorAll('[data-material-kind]').forEach(b=>b.onclick=()=>{materialCenterKind=b.dataset.materialKind;materialCenterCategories=[];materialCenterQuery='';page='material-center';closeMenu();render()});
function renderMaterialCenter(){
 ensureMaterialCenterIds();
 const root=$('#page');
 materialCenterNav.classList.add('active');materialCenterNav.setAttribute('aria-expanded','true');materialCenterSubnav.hidden=false;materialCenterSubnav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.materialKind===materialCenterKind));
 $('#breadcrumb').textContent='素材中心 / '+materialKindLabels[materialCenterKind];
 root.innerHTML=`<section class="page-head"><h1>${materialKindLabels[materialCenterKind]}</h1><span class="muted">${materialKindItems().length} 个素材</span></section><section class="panel material-center"><div class="toolbar"><label class="search">${icon('search')}<input id="material-center-search" aria-label="搜索素材" placeholder="搜索素材 ID 或名称" value="${esc(materialCenterQuery)}"></label><button class="btn primary" id="material-upload">上传${materialKindLabels[materialCenterKind]}</button></div><div id="material-center-results"></div></section>`;
 $('#material-center-search').oninput=e=>{materialCenterQuery=e.target.value;renderMaterialCenterRows()};
 $('#material-upload').onclick=()=>openMaterialUpload();
 renderMaterialCenterRows();
}
function renderMaterialCenterRows(){
 const q=materialCenterQuery.trim().toLowerCase();
 const rows=materialKindItems().filter(item=>(!materialCenterCategories.length||materialCenterCategories.includes(item.category))&&(!q||item.name.toLowerCase().includes(q)||String(item.materialId||'').includes(q)));
 $('#material-center-results').innerHTML=`<div class="table-scroll"><table><thead><tr><th>素材 ID</th>${materialCenterKind==='video'?'<th>视频封面</th>':''}<th>素材名称</th><th id="material-type-heading">类型</th><th>引用</th><th>时长</th><th>大小</th><th>操作</th></tr></thead><tbody>${rows.map(item=>`<tr><td>${esc(item.materialId||'—')}</td>${materialCenterKind==='video'?`<td><button class="material-cover" data-material-cover="${item.id}" aria-label="设置${esc(item.name)}的视频封面">${item.cover?`<img src="${esc(item.cover)}" alt="${esc(item.name)}封面">`:'<span>设置封面</span>'}</button></td>`:''}<td class="material-center-name">${esc(item.name)}</td><td>${esc(item.category)}</td><td>${item.references.length?`<button class="linkbtn" data-material-references="${item.id}" aria-label="查看${esc(item.name)}的引用">${item.references.length}</button>`:'<span class="muted">0</span>'}</td><td>${item.duration||'—'}</td><td>${item.size||'—'}</td><td class="material-center-actions"><button class="linkbtn" data-material-preview="${item.id}">查看</button>${item.basicAudio?'':`<button class="linkbtn" data-material-replace="${item.id}">替换</button><button class="linkbtn material-delete" data-material-delete="${item.id}" ${item.references.length?'disabled aria-label="已被引用，不能删除"':''}>删除</button>`}</td></tr>`).join('')||'<tr><td colspan="9"><div class="empty">暂无匹配素材</div></td></tr>'}</tbody></table></div>`;
 bindMaterialTypeFilter();
 document.querySelectorAll('[data-material-cover]').forEach(b=>b.onclick=()=>openMaterialCover(materialCenterItems().find(i=>i.id===b.dataset.materialCover)));
 const itemFor=id=>materialCenterItems().find(item=>item.id===id);
 document.querySelectorAll('[data-material-preview]').forEach(button=>button.onclick=()=>{const item=itemFor(button.dataset.materialPreview);if(item.basicAudio){previewVocabularyAudio(item);return}if(item.assetId){previewCenterMaterial(item);return}openDialog('查看素材',`<div class="material-center-preview"><strong>${esc(item.name)}</strong><span class="muted">${item.duration} · ${item.size||'—'}</span><p class="muted">素材预览占位</p></div>`,'<button class="btn" data-close>关闭</button>')});
 document.querySelectorAll('[data-material-references]').forEach(button=>button.onclick=()=>{const item=itemFor(button.dataset.materialReferences);BookUI.openReferenceDrawer({subject:item.name,rows:item.references.map((name,i)=>({key:String(i),type:'基础词库',name,relation:'素材引用',versionText:'版本未记录'}))})});
 document.querySelectorAll('[data-material-replace]').forEach(button=>button.onclick=()=>replaceCenterMaterial(itemFor(button.dataset.materialReplace)));
 document.querySelectorAll('[data-material-delete]').forEach(button=>button.onclick=()=>{const item=itemFor(button.dataset.materialDelete);if(!item||item.references.length)return;openDialog('删除素材',`<p>确认删除“${esc(item.name)}”？</p>`,'<button class="btn" data-close>取消</button><button class="btn danger" id="material-delete-confirm">删除</button>');$('#material-delete-confirm').onclick=()=>{if(item.references.length)return;if(materialCenterSamples.includes(item))materialCenterSamples.splice(materialCenterSamples.indexOf(item),1);else commitWorkspace(d=>{d.mediaCenterAssets=(d.mediaCenterAssets||[]).filter(a=>a.id!==item.id)});$('#dialog').close();renderMaterialCenter()}});
}

function vocabularyAudioLibrary(){
 const assets=new Map();
 for(const entry of catalogEntries()){
  const model=catalogModel(entry);
  for(const obj of [...model.positions,...model.words]){
   for(const key of model.positions.includes(obj)?['E','G']:['L']){
    const raw=obj[key];if(!raw)continue;
    const name=String(raw).split(/[\\/]/).pop();
    if(!assets.has(name))assets.set(name,{id:'vocab-audio:'+name,name,category:'基础词库音频',format:(name.split('.').pop()||'AAC').toUpperCase(),duration:'—',size:'—',references:[],basicAudio:true});
    const item=assets.get(name);if(!item.references.includes(entry.word))item.references.push(entry.word);
    if(obj._audio?.[key]?.data)item.inlineData=obj._audio[key].data;
    if(obj._audio?.[key]?.assetId)item.assetId=obj._audio[key].assetId;
   }
  }
 }
 for(const saved of data.basicVocabularyAudio||[]){
  const previous=assets.get(saved.name);
  assets.set(saved.name,{...saved,references:previous?.references||[],category:'基础词库音频',basicAudio:true,format:'AAC',duration:saved.duration||'—'});
 }
 return [...assets.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function materialCenterKey(item){return item.basicAudio?'vocab:'+item.name:item.id}
function materialCenterItems(){return [...materialCenterSamples.map(item=>Object.assign(item,data.materialCenterOverrides?.[item.id]||{})),...(data.mediaCenterAssets||[]),...vocabularyAudioLibrary()].map(item=>{if(!item.basicAudio&&item.format&&!/\.[a-z0-9]{2,5}$/i.test(item.name))item.name+='.'+item.format.toLowerCase();item.materialId=data.materialCenterIds?.[materialCenterKey(item)]||'';return item})}
function ensureMaterialCenterIds(){
 const items=materialCenterItems(),seen=new Set();
 const invalid=items.filter(item=>{const id=item.materialId;if(!/^\d+$/.test(id)||seen.has(id))return true;seen.add(id);return false});
 if(!invalid.length)return;
 const commit=typeof commitBeforePublicationTracking==='function'?commitBeforePublicationTracking:commitWorkspace;
 commit(d=>{d.materialCenterIds||={};for(const item of invalid)d.materialCenterIds[materialCenterKey(item)]=nextBusinessId('mediaAssets',d)});
}

async function storeVocabularyAudio(file){
 if(!file||!file.size||!/\.aac$/i.test(file.name))throw Error('请选择非空的 .aac 格式音频文件');
 if(vocabularyAudioLibrary().some(a=>a.name.toLowerCase()===file.name.toLowerCase()&&(a.assetId||a.inlineData)))throw Error('同名音频已存在，请修改文件名后上传');
 const assetId='VOCAB-AUDIO-'+crypto.randomUUID();
 await audioFileStore(assetId,file);
 const item={id:assetId,assetId,name:file.name,size:Math.max(1,Math.round(file.size/1024))+' KB',duration:await materialFileDuration(file,'audio')};
 if(!commitWorkspace(d=>{d.basicVocabularyAudio||=[];d.basicVocabularyAudio.push(item)}))throw Error('音频信息保存失败，请重试');
 return item;
}
async function vocabularyAudioBlob(item){
 if(item.assetId){const blob=await audioFileStore(item.assetId);if(blob)return blob}
 if(item.inlineData)return await (await fetch(item.inlineData)).blob();
 return null;
}
async function previewVocabularyAudio(item){
 try{
  const blob=await vocabularyAudioBlob(item);if(!blob){toast('此素材仅有文件名记录，尚未载入音频文件');return}
  const url=URL.createObjectURL(blob);
  openDialog('音频预览',`<p>${esc(item.name)}</p><audio controls src="${esc(url)}"></audio>`,'<button class="btn" data-close>关闭</button>');
  $('#dialog').addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});
 }catch(error){toast(error.message)}
}
function openVocabularyAudioLibrary(onSelect,current='',wordAudio=[]){
 const action=current?'替换音频':'上传音频';
 const ownAudio=[];for(const item of wordAudio){if(!item?.name)continue;const found=ownAudio.find(a=>a.name===item.name);if(found){if(!found.label.includes(item.label||''))found.label+=' / '+(item.label||'')}else{const stored=vocabularyAudioLibrary().find(a=>a.name===item.name);ownAudio.push({...stored,...item,assetId:item.assetId||stored?.assetId||'',inlineData:item.inlineData||stored?.inlineData||''})}} 
 openDialog(action,`<section class="vocab-upload-panel"><div class="vocab-audio-tabs" role="tablist" aria-label="音频来源"><button type="button" role="tab" aria-selected="true" data-audio-source="existing">本单词音频</button><button type="button" role="tab" aria-selected="false" data-audio-source="upload">上传音频</button></div><div class="vocab-existing-audio"></div><div class="vocab-upload-source" hidden>${current?`<p class="vocab-current-audio">当前音频：${esc(current)}</p>`:''}<input hidden type="file" accept=".aac,audio/aac" id="vocabulary-audio-upload"><button type="button" class="vocab-audio-drop" id="vocab-audio-drop"><span class="vocab-upload-icon" aria-hidden="true">↑</span><strong>点击选择或拖拽音频到此处</strong><span>仅支持 .aac 格式</span></button><div class="vocab-audio-preview" id="vocab-audio-preview" hidden></div></div><p id="vocabulary-audio-error" class="error" role="alert"></p></section>`,`<button class="btn" data-close>取消</button><button class="btn primary" id="vocab-audio-confirm" disabled>确认选择</button>`);
 const root=$('#dialog'),upload=$('#vocabulary-audio-upload'),error=$('#vocabulary-audio-error'),drop=$('#vocab-audio-drop'),preview=$('#vocab-audio-preview'),confirm=$('#vocab-audio-confirm');
 let pending=null,pendingExisting=null,source='existing',url='',busy=false;
 const cleanup=()=>{preview.querySelector('audio')?.pause();if(url){URL.revokeObjectURL(url);url=''}};
 root.addEventListener('close',cleanup,{once:true});
 const existing=root.querySelector('.vocab-existing-audio');
 existing.innerHTML=ownAudio.length?`<table class="vocab-existing-table"><thead><tr><th scope="col" class="vocab-audio-choice">选择</th><th scope="col">音频文件名</th><th scope="col">引用位置</th><th scope="col">状态</th></tr></thead><tbody>${ownAudio.map((item,i)=>`<tr class="${item.name===current?'is-current':''}"><td><input type="radio" name="vocab-own-audio" aria-label="选择 ${esc(item.name)}" value="${i}" ${item.name===current?'disabled':''}></td><td class="vocab-audio-filename">${esc(item.name)}</td><td class="vocab-audio-references">${esc(item.label||'本单词音频')}</td><td class="vocab-audio-status">${item.name===current?'当前音频':'—'}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">本单词暂无可用音频</p>';
 existing.onclick=e=>{const row=e.target.closest('tbody tr'),radio=row?.querySelector('input');if(!radio||radio.disabled||e.target===radio)return;radio.click()};
 existing.onchange=e=>{if(e.target.name!=='vocab-own-audio')return;pendingExisting=ownAudio[Number(e.target.value)];confirm.disabled=!pendingExisting};
 root.querySelectorAll('[data-audio-source]').forEach(button=>button.onclick=()=>{if(busy)return;source=button.dataset.audioSource;root.querySelectorAll('[data-audio-source]').forEach(tab=>tab.setAttribute('aria-selected',String(tab===button)));existing.hidden=source!=='existing';root.querySelector('.vocab-upload-source').hidden=source!=='upload';preview.querySelector('audio')?.pause();error.textContent='';confirm.textContent=source==='existing'?'确认选择':action;confirm.disabled=source==='existing'?!pendingExisting:!pending});

 const receive=file=>{if(busy||!file)return;error.textContent='';if(!file.size||!/\.aac$/i.test(file.name)){error.textContent='请选择非空的 .aac 格式音频文件';return}cleanup();pending=file;url=URL.createObjectURL(file);drop.hidden=true;preview.hidden=false;preview.innerHTML=`<div class="vocab-selected-file"><svg class="vocab-audio-file-icon" viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M6 2h19l11 11v30a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" fill="#e7efff" stroke="currentColor" stroke-width="2"/><path d="M25 2v12h11M17 32V22l10-2v10" stroke="currentColor" stroke-width="2"/><ellipse cx="13" cy="33" rx="4" ry="3" fill="currentColor"/><ellipse cx="23" cy="31" rx="4" ry="3" fill="currentColor"/></svg><div><strong>${esc(file.name)}</strong><span>${Math.max(1,Math.round(file.size/1024))} KB</span></div><button type="button" class="linkbtn" id="vocab-audio-reselect">重新选择</button></div><audio preload="metadata" src="${esc(url)}"></audio><div class="vocab-preview-player"><button type="button" class="vocab-preview-play" aria-label="试听音频">▶</button><input class="vocab-preview-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="音频播放进度" disabled><span class="vocab-preview-time">00:00 / --:--</span></div>`;$('#vocab-audio-reselect').onclick=()=>{if(!busy)upload.click()};
 const audio=preview.querySelector('audio'),play=preview.querySelector('.vocab-preview-play'),seek=preview.querySelector('.vocab-preview-seek'),time=preview.querySelector('.vocab-preview-time');
 const stamp=n=>Number.isFinite(n)?String(Math.floor(n/60)).padStart(2,'0')+':'+String(Math.floor(n%60)).padStart(2,'0'):'--:--';
 const sync=()=>{const ready=Number.isFinite(audio.duration)&&audio.duration>0;seek.disabled=!ready;seek.value=ready?audio.currentTime/audio.duration*100:0;time.textContent=stamp(audio.currentTime)+' / '+stamp(audio.duration);play.textContent=audio.paused?'▶':'Ⅱ';play.setAttribute('aria-label',audio.paused?'试听音频':'暂停试听')};
 ['loadedmetadata','timeupdate','play','pause','ended'].forEach(event=>audio.addEventListener(event,sync));
 play.onclick=async()=>{if(audio.paused){try{await audio.play()}catch{error.textContent='此音频暂时无法试听，可重新选择文件'}}else audio.pause()};
 seek.oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(seek.value)/100*audio.duration};
 confirm.disabled=false};
 drop.onclick=()=>upload.click();upload.onchange=()=>{receive(upload.files?.[0]);upload.value=''};
 drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging')};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer?.files.length>1){error.textContent='每次只能上传一个 .aac 文件';return}receive(e.dataTransfer?.files[0])};
 confirm.onclick=async()=>{if(busy)return;if(source==='existing'){if(!pendingExisting)return;cleanup();closeDialog();onSelect(pendingExisting);return}if(!pending)return;busy=true;upload.disabled=true;confirm.disabled=true;error.textContent='';
 try{const item=await storeVocabularyAudio(pending);if(root.open&&root.contains(upload)){closeDialog();onSelect(item)}}
 catch(e){if(root.contains(error))error.textContent=e.message}
 finally{busy=false;upload.disabled=false;confirm.disabled=!pending}
 };
}

function bindMaterialTypeFilter(){
 const heading=$('#material-type-heading');
 const categories=[...new Set(materialKindItems().map(item=>item.category))];
 heading.innerHTML=`<div class="catalog-status-heading"><span>类型</span><button type="button" id="material-type-filter" class="catalog-filter-button ${materialCenterCategories.length?'active':''}" aria-label="筛选素材类型" aria-expanded="false"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 4h18l-7 8v7l-4 2v-9z"/></svg></button></div><div id="material-type-panel" class="catalog-status-panel" popover="auto"><form id="material-type-form"><fieldset><legend>类型</legend><label class="catalog-review-option"><input id="material-type-all" type="checkbox" ${materialCenterCategories.length?'':'checked'}><span>全部</span></label>${categories.map(category=>`<label class="catalog-review-option"><input type="checkbox" name="category" value="${esc(category)}" ${materialCenterCategories.includes(category)?'checked':''}><span>${esc(category)}</span></label>`).join('')}</fieldset><div class="catalog-filter-actions"><button type="button" class="btn" id="material-type-reset">重置</button><button type="submit" class="btn primary">确定</button></div></form></div>`;
 const button=$('#material-type-filter'),panel=$('#material-type-panel'),all=$('#material-type-all'),options=[...panel.querySelectorAll('[name=category]')];
 button.onclick=()=>{const rect=button.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(rect.right-320,innerWidth-332))+'px';panel.style.top=Math.max(12,Math.min(rect.bottom+8,innerHeight-360))+'px';panel.togglePopover()};
 panel.addEventListener('toggle',event=>button.setAttribute('aria-expanded',String(event.newState==='open')));
 all.onchange=()=>{options.forEach(option=>option.checked=false);all.checked=true};
 options.forEach(option=>option.onchange=()=>{all.checked=!options.some(input=>input.checked)});
 $('#material-type-form').onsubmit=event=>{event.preventDefault();materialCenterCategories=options.filter(option=>option.checked).map(option=>option.value);renderMaterialCenterRows()};
 $('#material-type-reset').onclick=()=>{materialCenterCategories=[];renderMaterialCenterRows()};
}

function openMaterialCover(item){
 openDialog('视频封面',`<p>${esc(item.name)}</p><div class="material-cover-preview">${item.cover?`<img src="${esc(item.cover)}" alt="视频封面">`:'<span class="muted">尚未设置封面</span>'}</div><label class="field"><span>选择封面图片</span><input type="file" id="material-cover-file" accept=".webp"></label><p class="error" id="material-cover-error"></p>`,'<button class="btn" data-close>取消</button><button class="btn primary" id="material-cover-save">保存</button>');
 let cover=item.cover||'';
 $('#material-cover-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(!/\.webp$/i.test(file.name)||file.size>5*1024*1024){$('#material-cover-error').textContent='请选择不超过 5 MB 的 WebP 图片';return}if(file.name.replace(/\.webp$/i,'')!==item.name.replace(/\.mp4$/i,'')){$('#material-cover-error').textContent='封面必须与视频同名';return}cover=await materialDataURL(file);$('#material-cover-error').textContent='';$('.material-cover-preview').innerHTML=`<img src="${esc(cover)}" alt="视频封面">`};
 $('#material-cover-save').onclick=()=>{if(!cover){$('#material-cover-error').textContent='请选择封面图片';return}if(commitWorkspace(d=>{const saved=(d.mediaCenterAssets||[]).find(a=>a.id===item.id);if(saved)saved.cover=cover;else{d.materialCenterOverrides||={};d.materialCenterOverrides[item.id]={...d.materialCenterOverrides[item.id],cover}}})){closeDialog();renderMaterialCenter()}};
}
function materialDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}
function materialFolderEntries(files,kind){
 const list=Array.from(files).filter(f=>!['.DS_Store','Thumbs.db'].includes(f.name));
 if(!list.length)throw Error('文件夹中没有素材文件');
 const extension=kind==='audio'?'aac':kind==='image'?'webp':null;
 if(extension){for(const f of list)if(!f.name.toLowerCase().endsWith('.'+extension))throw Error('仅支持 '+extension.toUpperCase()+' 格式：'+f.name);return list.map(file=>({file}))}
 const folders=new Map();
 for(const file of list){const path=file.webkitRelativePath||file.name,folder=path.slice(0,path.lastIndexOf('/')+1);if(!/\.(mp4|webp)$/i.test(file.name))throw Error('视频文件夹仅支持 MP4 和 WebP：'+path);if(!folders.has(folder))folders.set(folder,[]);folders.get(folder).push(file)}
 const entries=[];
 for(const [folder,items] of folders){const videos=items.filter(f=>/\.mp4$/i.test(f.name)),covers=items.filter(f=>/\.webp$/i.test(f.name));if(!videos.length)throw Error((folder||'当前文件夹')+'缺少 MP4 视频');for(const file of videos){const stem=file.name.replace(/\.mp4$/i,''),matches=covers.filter(f=>f.name.replace(/\.webp$/i,'')===stem);if(matches.length!==1)throw Error((folder||'')+file.name+' 需要一个同名 WebP 封面');entries.push({file,coverFile:matches[0]})}for(const cover of covers)if(!videos.some(f=>f.name.replace(/\.mp4$/i,'')===cover.name.replace(/\.webp$/i,'')))throw Error((folder||'')+cover.name+' 没有同名 MP4 视频')}
 return entries;
}
function openMaterialUpload(){
 const kind=materialCenterKind,types={audio:['听力录音稿','基础词库音频','语音指导音频'],image:['释义配图','书籍封面'],video:['微技能视频']}[kind];let selectedFiles=[];
 openDialog('上传'+materialKindLabels[kind],`<div class="material-upload-selection"><div class="material-upload-file-row"><span>${materialKindLabels[kind]}</span><button type="button" class="btn material-select-button" id="material-select-files">选择${materialKindLabels[kind]}文件</button></div><div id="material-selected-files" class="muted"></div></div><label class="field material-upload-type"><span>类型</span><select class="input" id="material-upload-category"><option value="">请选择类型</option>${types.map(type=>`<option value="${esc(type)}">${esc(type)}</option>`).join('')}</select></label><p class="error" id="material-upload-error" role="alert"></p>`,'<button class="btn" data-close>取消</button><button class="btn primary" id="material-choose-folder">确认上传</button>');
 $('#material-select-files').onclick=()=>{const input=document.createElement('input');input.id='material-folder-upload';input.type='file';input.multiple=true;input.setAttribute('webkitdirectory','');input.accept=kind==='audio'?'.aac':kind==='image'?'.webp':'.mp4,.webp';input.hidden=true;document.body.append(input);input.oncancel=()=>input.remove();input.onchange=()=>{try{const files=Array.from(input.files),entries=materialFolderEntries(files,kind);selectedFiles=files;$('#material-selected-files').textContent=entries.map(e=>e.file.name).join('、');$('#material-upload-error').textContent=''}catch(e){$('#material-upload-error').textContent=e.message}finally{input.remove()}};input.click()};
 $('#material-choose-folder').onclick=()=>{const category=$('#material-upload-category').value;if(!category){$('#material-upload-error').textContent='请选择类型';return}if(!selectedFiles.length){$('#material-upload-error').textContent='请选择'+materialKindLabels[kind]+'文件';return}$('#material-upload-error').textContent='';selectMaterialFolder(kind,category,selectedFiles)};
}
function selectMaterialFolder(kind,category,selectedFiles=null){
 const input=document.createElement('input');input.id='material-folder-upload';input.type='file';input.multiple=true;input.setAttribute('webkitdirectory','');input.accept=kind==='audio'?'.aac':kind==='image'?'.webp':'.mp4,.webp';input.hidden=true;document.body.append(input);
 input.oncancel=()=>input.remove();
 input.onchange=async()=>{const button=$('#material-choose-folder');if(button)button.disabled=true;try{
 const entries=materialFolderEntries(selectedFiles||input.files,kind),names=new Set(materialCenterItems().filter(i=>materialKind(i)===kind).map(i=>i.name.toLowerCase()));
 for(const {file,coverFile} of entries){if(names.has(file.name.toLowerCase()))throw Error('同名素材已存在：'+file.name);names.add(file.name.toLowerCase());if(coverFile&&coverFile.size>5*1024*1024)throw Error('封面不能超过 5 MB：'+coverFile.name)}
 const items=[];for(const {file,coverFile} of entries){const id='MEDIA-'+crypto.randomUUID();await audioFileStore(id,file);items.push({id,assetId:id,name:file.name,mediaKind:kind,category,format:file.name.split('.').pop().toUpperCase(),duration:await materialFileDuration(file,kind),size:(file.size/1024).toFixed(1)+' KB',references:[],...(kind==='video'?{cover:await materialDataURL(coverFile),coverName:coverFile.name}:{})})}
 if(!commitWorkspace(d=>{d.mediaCenterAssets||=[];d.mediaCenterAssets.push(...items)}))throw Error('保存失败');closeDialog();renderMaterialCenter();toast('已上传 '+items.length+' 个素材');
 }catch(e){const error=$('#material-upload-error');if(error)error.textContent=e.message;else toast(e.message)}finally{input.remove();if(button)button.disabled=false}};if(selectedFiles)input.onchange();else input.click();
}

async function previewCenterMaterial(item){try{const blob=await audioFileStore(item.assetId);if(!blob){toast('素材文件不可用');return}const url=URL.createObjectURL(blob),kind=materialKind(item);openDialog('查看'+materialKindLabels[kind],`<p>${esc(item.name)}</p>${kind==='image'?`<img class="material-full-preview" src="${esc(url)}" alt="${esc(item.name)}">`:`<${kind} class="material-full-preview" controls src="${esc(url)}" ${kind==='video'&&item.cover?`poster="${esc(item.cover)}"`:''}></${kind}>`}`,'<button class="btn" data-close>关闭</button>');$('#dialog').addEventListener('close',()=>URL.revokeObjectURL(url),{once:true})}catch(e){toast(e.message)}}
function replaceCenterMaterial(item){
 openDialog('替换素材',`<p>${esc(item.name)}</p><input id="material-replace-file" type="file" accept=".${({audio:'aac',image:'webp',video:'mp4'})[materialKind(item)]}"><p id="material-replace-error" class="error"></p>`,'<button class="btn" data-close>取消</button><button class="btn primary" id="material-replace-confirm">确认替换</button>');
 $('#material-replace-confirm').onclick=async()=>{const file=$('#material-replace-file').files[0];if(!file)return;const error=$('#material-replace-error');try{if(!file.name.toLowerCase().endsWith('.'+({audio:'aac',image:'webp',video:'mp4'})[materialKind(item)]))throw Error('文件格式不符合要求');if(materialKind(item)==='video'&&item.cover&&file.name!==item.name)throw Error('替换视频请保持原文件名，以匹配现有封面');if(materialCenterItems().some(i=>i.id!==item.id&&materialKind(i)===materialKind(item)&&i.name.toLowerCase()===file.name.toLowerCase()))throw Error('同名素材已存在');const assetId='MEDIA-'+crypto.randomUUID();await audioFileStore(assetId,file);const update={name:file.name,assetId,format:file.name.split('.').pop().toUpperCase(),size:(file.size/1024).toFixed(1)+' KB',duration:await materialFileDuration(file,materialKind(item))};if(commitWorkspace(d=>{const saved=(d.mediaCenterAssets||[]).find(a=>a.id===item.id);if(saved)Object.assign(saved,update);else{d.materialCenterOverrides||={};d.materialCenterOverrides[item.id]={...d.materialCenterOverrides[item.id],...update}}})){closeDialog();renderMaterialCenter()}}catch(e){error.textContent=e.message}};
}

function materialFileDuration(file,kind){
 if(kind==='image')return Promise.resolve('—');
 return new Promise(resolve=>{const media=document.createElement(kind==='video'?'video':'audio'),url=URL.createObjectURL(file);let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);media.onloadedmetadata=null;media.onerror=null;media.removeAttribute('src');URL.revokeObjectURL(url);resolve(value)};const timer=setTimeout(()=>finish('—'),5000);media.preload='metadata';media.onloadedmetadata=()=>{const total=Math.round(media.duration);finish(Number.isFinite(total)?String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0'):'—')};media.onerror=()=>finish('—');media.src=url});
}
