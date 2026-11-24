'use strict';
function mountListeningWorkpage(host, options){
 const app=document.querySelector('#app'),wasHidden=app.hidden,scroll=window.scrollY,origin=document.activeElement;
 app.hidden=true;host.classList.add('lc-workpage');host.setAttribute('aria-label','听力编辑工作区');host.setAttribute('open','');host.open=true;
 const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 let gone=false,navigated=false,ownsHistory=false;
 const routeId=crypto.randomUUID();
 try{if(!options.overlay){history.pushState({...history.state,listeningWorkpage:routeId},'',location.pathname+location.search+'#listening-editor');ownsHistory=true}}catch{}
 const onPop=()=>{if(gone)return;navigated=true;host.requestClose();if(!gone){navigated=false;try{history.pushState({...history.state,listeningWorkpage:routeId},'',location.pathname+location.search+'#listening-editor')}catch{}}};
 if(!options.overlay)window.addEventListener('popstate',onPop);
 const beforeUnload=e=>{if(options.dirty()){e.preventDefault();e.returnValue=''}};
 host.requestClose=()=>{if(options.busy())return;if(options.dirty()&&!window.confirm('有未保存的修改，确定离开？'))return;host.close()};
 host.close=()=>{if(gone)return;gone=true;window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('popstate',onPop);if(ownsHistory&&!navigated&&history.state?.listeningWorkpage===routeId)history.back();document.body.style.overflow=oldOverflow;app.hidden=wasHidden;host.open=false;host.removeAttribute('open');host.dispatchEvent(new Event('close'));if(origin?.isConnected)origin.focus({preventScroll:true});if(scroll)window.scrollTo(0,scroll)};
 window.addEventListener('beforeunload',beforeUnload);
 host.addEventListener('keydown',e=>{if(e.key==='Escape'){const layer=host.querySelector('.lc-record-drawer,.an-note-popover');if(layer){e.preventDefault();layer.remove()}}});
}
function listeningNoteHistory(previous,next){
 const history=structuredClone(previous?.noteHistory||[]),old=new Map((previous?.teachingNotes||[]).map(n=>[n.id,n]));
 const current=new Map((next||[]).map(n=>[n.id,n]));
 for(const id of new Set([...old.keys(),...current.keys()])){
  const before=old.get(id)||null,after=current.get(id)||null;
  if(JSON.stringify(before)===JSON.stringify(after))continue;
  history.push({id:crypto.randomUUID(),noteId:id,at:new Date().toISOString(),actor:typeof bookFlowActor==='function'?bookFlowActor():'当前账号',before:structuredClone(before),after:structuredClone(after)});
 }
 return history;
}
function positionListeningHover(panel,anchor,width=520){
 const rect=anchor.getBoundingClientRect();width=Math.min(width,window.innerWidth-32);panel.style.width=width+'px';
 panel.style.left=Math.max(16,Math.min(rect.right-width,window.innerWidth-width-16))+'px';
 const height=panel.getBoundingClientRect().height;
 panel.style.top=Math.max(16,rect.bottom+8+height<=window.innerHeight-16?rect.bottom+8:rect.top-height-8)+'px';
}
function bindListeningHover(anchor,open){
 let panel=null,timer;
 const cancel=()=>clearTimeout(timer);
 const close=()=>{cancel();panel?.remove();panel=null;anchor.setAttribute('aria-expanded','false')};
 const show=()=>{cancel();if(panel?.isConnected)return;panel=open();if(!panel)return;anchor.setAttribute('aria-expanded','true');panel.addEventListener('pointerenter',cancel);panel.addEventListener('pointerleave',hide);panel.addEventListener('focusin',cancel);panel.addEventListener('focusout',hide);panel.addEventListener('keydown',escape)};
 const hide=()=>{cancel();timer=setTimeout(()=>{if(panel?.contains(document.activeElement))return;close()},180)};
 const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}};
 anchor.onclick=null;anchor.setAttribute('aria-haspopup','dialog');anchor.setAttribute('aria-expanded','false');
 anchor.addEventListener('pointerenter',show);anchor.addEventListener('pointerleave',hide);anchor.addEventListener('focus',show);anchor.addEventListener('blur',hide);anchor.addEventListener('keydown',escape);
}
function showListeningNotePreview(host,button,note){
 host.querySelectorAll('.an-note-popover,.lc-record-drawer').forEach(el=>el.remove());
 const panel=document.createElement('aside');panel.className='an-note-popover lc-hover-preview';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','点拨预览');
 panel.innerHTML='<div class="resource-popover light-mode"><div class="resource-popover-body">'+analysisNotePreview(note)+'</div></div>';
 panel.querySelectorAll('.an-preview-head').forEach(el=>el.remove());host.append(panel);bindAnalysisPreview(panel,[note]);positionListeningHover(panel,button,560);return panel;
}
function listeningRevisionText(note){
 if(!note)return '';
 const el=document.createElement('div');el.innerHTML=analysisNotePreview(note);
 el.querySelectorAll('button,audio,video,.an-preview-head').forEach(n=>n.remove());
 el.querySelectorAll('p,div,li,br').forEach(n=>{n.append(document.createTextNode('\n'))});
 return el.textContent.replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
}
function listeningRevisionMarkup(before,after){
 const a=Array.from(before),b=Array.from(after);let start=0,end=0;
 while(start<a.length&&start<b.length&&a[start]===b[start])start++;
 while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++;
 const removed=a.slice(start,a.length-end).join(''),added=b.slice(start,b.length-end).join('');
 return esc(a.slice(0,start).join(''))+(removed?'<del>'+esc(removed)+'</del>':'')+(added?'<ins>'+esc(added)+'</ins>':'')+esc(end?b.slice(b.length-end).join(''):'');
}
function listeningRevisionCard(change){
 const before=change.before,after=change.after,current=after||before;
 const words=n=>n?analysisWordSelections(n):[],key=w=>[w.wordId,w.posId,w.meaningId].join('/');
 const old=words(before),next=words(after),oldKeys=old.map(key),nextKeys=next.map(key);
 const label=w=>{const word=vocabularyWord(w.wordId),pos=vocabularyTable('positions')[w.posId],meaning=vocabularyTable('meanings')[w.meaningId];return [word?.word||'词条不可用',pos?.label||'',meaning?.chinese||meaning?.chunkChinese||meaning?.english||''].filter(Boolean).map(esc).join(' / ')};
 const added=next.filter(w=>!oldKeys.includes(key(w))),removed=old.filter(w=>!nextKeys.includes(key(w)));
 const orderChanged=JSON.stringify(oldKeys.filter(k=>nextKeys.includes(k)))!==JSON.stringify(nextKeys.filter(k=>oldKeys.includes(k)));
 const list=entries=>entries.length?entries.map(w=>'<div class="lc-revision-word">'+label(w)+'</div>').join(''):'<span class="muted">无引用释义</span>';
 const text=n=>{const el=document.createElement('div');el.innerHTML=n?.contentHtml||esc(n?.content||'');return el.textContent};
 const explanationChanged=before?.explanationEnabled!==after?.explanationEnabled||before?.content!==after?.content||before?.contentHtml!==after?.contentHtml;
 return `<article class="lc-revision-card"><header><strong>凸显：${esc(current?.title||current?.text||'点拨')}</strong><span>${esc(current?.category||'')}${current?.subcategory?' · '+esc(current.subcategory):''}</span></header>${!before?'<p class="lc-revision-kind">新增点拨</p>':!after?'<p class="lc-revision-kind">移除点拨</p>':''}<section data-revision-part="references"><h4>引用释义 <small>${added.length||removed.length?'有变化':'未变化'}</small></h4>${removed.map(w=>'<del class="lc-revision-word">'+label(w)+'</del>').join('')}${next.map(w=>'<'+(added.includes(w)?'ins':'div')+' class="lc-revision-word">'+label(w)+'</'+(added.includes(w)?'ins':'div')+'>').join('')||(!removed.length?'<span class="muted">无引用释义</span>':'')}</section><section data-revision-part="order"><h4>词条顺序 <small>${orderChanged?'已调整':'未变化'}</small></h4>${orderChanged?'<div class="lc-revision-order"><div><small>修改前</small>'+list(old)+'</div><div><small>修改后</small>'+list(next)+'</div></div>':''}</section><section data-revision-part="explanation"><h4>说明 <small>${explanationChanged?'有变化':'未变化'}</small></h4><div class="lc-revision-explanation">${explanationChanged?listeningRevisionMarkup(text(before),text(after)):esc(text(after))||'<span class="muted">无说明</span>'}${explanationChanged&&text(before)===text(after)?'<p class="muted">说明格式或显示状态已调整</p>':''}</div></section></article>`;
}
function showListeningNoteRecords(host,draft,note,options={}){
 host.querySelectorAll('.an-note-popover,.lc-record-drawer').forEach(el=>el.remove());
 const latest=[...(bankData().materials[draft.materialId]?.noteHistory||[])].reverse().find(h=>h.noteId===note.id);
 const panel=document.createElement('aside');panel.className='lc-record-drawer lc-revision-popover';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','最近一次修改');
 panel.innerHTML=latest?`<div class="lc-revision-meta"><strong>${esc(latest.actor||'未知人员')}</strong><time>${esc(latest.at?bookFlowTime(latest.at):'时间未记录')}</time></div><div class="lc-revision-changes">${listeningRevisionCard(latest)}</div>${options.onReject?'<footer><button type="button" class="btn resource-danger" data-reject-revision>不采纳</button><span class="muted">恢复上一版，保存后生效</span></footer>':''}`:'<div class="lc-revision-changes muted">暂无修改记录</div>';
 panel.querySelector('[data-reject-revision]')?.addEventListener('click',()=>{panel.remove();options.onReject(structuredClone(latest.before))});
 host.append(panel);positionListeningHover(panel,options.anchor||document.activeElement);return panel;
}
// Scope reusable field components without duplicate IDs or radio groups.
function listeningFieldScope(section,key){
 const ids=new Map();section.querySelectorAll('[id]').forEach(el=>{const old=el.id;ids.set(old,key+'-'+old);el.id=key+'-'+old});
 section.querySelectorAll('[name]').forEach(el=>{el.dataset.fieldName=el.name;el.name=key+'-'+el.name});
 section.querySelectorAll('[for]').forEach(el=>{if(ids.has(el.htmlFor))el.htmlFor=ids.get(el.htmlFor)});
 const map=q=>q.replace(/#([\w-]+)/g,(_,id)=>'#'+(ids.get(id)||id)).replace(/\[name="([^"]+)"\]/g,'[data-field-name="$1"]');
 return {querySelector:q=>section.querySelector(map(q)),querySelectorAll:q=>section.querySelectorAll(map(q))};
}
