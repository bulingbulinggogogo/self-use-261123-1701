'use strict';
const $=id=>document.getElementById(id);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const example=window.PRESENT_EXAMPLE;
const STORAGE=example?.storage||'present-inline-example-v2';
const copy=x=>JSON.parse(JSON.stringify(x));
function initial(){if(example)return {word:example.word,words:copy(example.words),positions:copy(example.positions),meanings:example.meanings.map(m=>({...copy(m),examples:[],chunks:[]})),exampleRevision:1,wordAttributesRevision:1};return {word:'present',words:copy(WORKBOOK_DATA.words.rows),positions:copy(WORKBOOK_DATA.positions.rows),meanings:WORKBOOK_DATA.meanings.rows.map(r=>{const ref=REFERENCE_DATA.find(s=>s.meaning===r.O)||REFERENCE_DATA.find(s=>r.O==='呈递；提交；出示'&&s.meaning==='出示；提交')||REFERENCE_DATA.find(s=>r.O==='上演；播出'&&s.meaning==='上演；播出');return {...copy(r),examples:copy(r.B==='present2'&&r.O==='礼物'?(ref?.examples||[]).slice(0,1):[]),chunks:[],exam:'',number:ref?.number||'',frequency:r.N==='高'?'high':'low',difficulty:r.R?'难度 '+r.R:'',refId:ref?.id||''}})}}
const readOnly=new URLSearchParams(location.search).get('mode')==='view';
const isUsageEntry=example?.entryType==='usage';
const isChunkEntry=example?.entryType==='chunk'||isUsageEntry;
const selectedWord=example?.word||'present2';
let model=initial(),pos='v',dirty=false,timer;
try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved?.version===2&&saved.model?.words&&saved.model?.positions&&saved.model?.meanings)model=saved.model}catch{}
// Restore word grouping if the withdrawn entry-type preview was saved locally.
if(model._wordPositions){
 model.positions=model._wordPositions;
 for(const m of model.meanings)m.I=m._wordPos??model._wordPos??'';
}
for(const m of model.meanings)delete m._wordPos;
if(!isChunkEntry)for(const w of model.words)delete w.entryType;
delete model._wordPositions;delete model._wordPos;delete model._chunkPosition;
model.words=model.words.filter(w=>w.A===selectedWord);
model.positions=model.positions.filter(p=>p.A===selectedWord);
model.meanings=model.meanings.filter(m=>m.B===selectedWord);
model.exampleRevision=1;
if(!model.positions.some(p=>p.C===pos))pos=model.positions[0]?.C||'';
function normalizeChunkPositions(){if(!isChunkEntry)return;
 const target=!isUsageEntry&&model.words[0]?.chunkType==='短语动词'?'phr v':'';
 const position=model.positions.find(p=>p.C===target)||model.positions[0]||{A:selectedWord,row:'chunk-position'};
 position.C=target;model.positions=[position];
 for(const m of model.meanings)m.I=target;
 delete model.words[0].L;delete model.words[0]._audio;
 if(pos!=='@wordChunks'&&!model.positions.some(p=>p.C===pos))pos=model.positions[0].C;
}
wordInit();
function wordInit(){normalizeChunkPositions();for(const p of model.positions)for(const key of ['S','T'])if(['-','—'].includes(p[key])){p[key]='';p._visible=(p._visible||[]).filter(k=>k!==key)}const w=model.words[0];if(!isChunkEntry&&!String(w.E||'').trim())w.E='暂无词频';if(!model.meaningListeningNoteRevision){if(w.listeningNote&&!model.meanings.some(m=>String(m.AI||'').trim())&&model.meanings.length)model.meanings[0].AI=w.listeningNote;model.meaningListeningNoteRevision=1;}if(!model.wordAttributesRevision){w.personTag=w.R?.includes('人名')?'听力人名':'';w.placeTag=w.R?.includes('地名')?'听力地名':'';w.syllables=model.positions.find(p=>p.B)?.B||'';w.R='';model.wordAttributesRevision=1;}if(!w.listeningTag)w.listeningTag=w.personTag?'听力人名':w.placeTag?'地名读音':'';delete w.personTag;delete w.placeTag;w._visible=(w._visible||[]).filter(k=>!['personTag','placeTag'].includes(k));model.words[0].displayWord??=example?.word||'present';if(model.layoutRevision!==4){model.words[0]._visible=[...new Set([...(model.words[0]._visible||[]),'C','B'])];model.layoutRevision=4}for(const m of model.meanings)if(!example?.sourceExact)m.N=m.N==='高'?'高':'低';for(const m of model.meanings)for(const e of [...m.examples,...m.chunks.flatMap(c=>c.examples)])e.sourceText??=e.sources?.join('；')||''}
const bindings=new Map(),attributeGroups=new Map(),audioBindings=new Map(),widgets=new Map();let bindingId=0;
const currentPosition=()=>model.positions.find(p=>p.C===pos);
const word=()=>model.words[0];
const wordExtras={pronunciationNote:{label:'语音说明',options:[]},listeningTag:{label:'听力标签',options:['听力人名','地名读音']},listeningNote:{label:'听力说明',options:[]},syllables:{label:'音节拆分'}};
const spec=(kind,key)=>kind==='words'&&key==='E'?{key,label:'词频',options:['1','2','3','4','5','暂无词频']}:kind==='words'&&key==='F'?{key,label:'AW',options:['AW']}:kind==='positions'&&['S','T'].includes(key)?{key,label:key==='S'?'口语级别':'书写级别',options:(key==='S'?['S1','S2','S3']:['W1','W2','W3'])}:kind==='meanings'&&key==='AA'?{key,label:'=',options:[]}:kind==='meanings'&&key==='AI'?{key,label:'听力说明',options:[]}:kind==='words'&&key==='chunkType'?{key,label:'词块类型',options:['短语动词','动词短语','介词短语','用法搭配','常见搭配','句式','习语','语境']}: kind==='meanings'&&key==='dialect'?{key,label:'英美标识',options:['BrE','AmE']}:kind==='words'&&wordExtras[key]?{key,...wordExtras[key]}:key==='N'&&kind==='meanings'?{key:'N',label:'义频',options:['高','低']}:({...WORKBOOK_DATA[kind].fields.find(f=>f.key===key),...(kind==='words'&&({S:'高中课标状态',F:'AW',N:'重难点词'})[key]?{label:({S:'高中课标状态',F:'AW',N:'重难点词'})[key]}:{})});
function changed(){dirty=true}
function toast(t){$('toast').textContent=t;$('toast').classList.remove('hidden');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.add('hidden'),2600)}
function isPhoneticField(obj,key){return model.positions.includes(obj)&&['D','F'].includes(key)}
function phoneticContent(value){return String(value??'').replace(/[\/／]/g,'').trim()}
function phoneticValue(value){const content=phoneticContent(value);return content?'/'+content+'/':''}
function formControl(obj,key,label,opts=[],className='',placeholder='待填写'){
 if(model.meanings.includes(obj)&&key==='O')placeholder='中文释义';
 const id=String(++bindingId);bindings.set(id,{obj,key,label,opts});const value=isPhoneticField(obj,key)?phoneticContent(obj[key]):obj[key]??'';
 const attrs=`class="inline-editor ${className}" data-edit="${id}" aria-label="${esc(label)}"`;
 if((model.positions.includes(obj)&&formKeysFor(obj.C).includes(key))||(model.words.includes(obj)&&label==='符号'))opts=[];
 const fixedUsage=model.meanings.includes(obj)&&['J','K'].includes(key);
 if(fixedUsage)opts=usageKeysFor(obj.I).includes(key)?spec('meanings',key).options:[];
 if(fixedUsage||opts.length)return `<select ${attrs}>${[...new Set([...opts.map(String),...(!fixedUsage&&!['chunkType','expressionLevel'].includes(key)&&value!==''?[String(value)]:[])])].map(v=>`<option value="${esc(v)}" ${String(value)===v?'selected':''}>${esc(v?(model.words.includes(obj)&&key==='E'?(v==='暂无词频'?v:'词频'+v):model.words.includes(obj)&&key==='M'?'R'+v:v):'待填写')}</option>`).join('')}</select>`;
 if(['en','zh','O','Y','english','listeningNote','pronunciationNote','AI'].includes(key))return `<textarea ${attrs} rows="${['en','zh'].includes(key)?2:1}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;

 return `<input ${attrs} value="${esc(value)}" placeholder="${esc(placeholder)}">`;
}
let activeEditor=null;
function control(obj,key,label,opts=[],className='',placeholder='待填写'){
 const id=String(++bindingId);bindings.set(id,{obj,key,label,opts,className,placeholder});
 return `<span class="inline-value ${className} ${obj[key]===undefined||obj[key]===''?'empty-value':''}" data-view="${id}" tabindex="0" role="button" aria-label="${esc(label)}">${esc(displayValue(obj,key,label))}</span>`;
}
function emphasisValidation(value){return /[^\p{L}\p{M}\p{N}\s\[\]&]/u.test(value)?'符号仅允许 [ ] &，请删除其他符号':''}
function activate(el){
 if(readOnly)return;
 if(activeEditor)activeEditor.finish(true);
 const b=bindings.get(el.dataset.view);if(!b)return;if(model.meanings.includes(b.obj)&&b.key==='AG'){openExternalChunkPicker(model.meanings.indexOf(b.obj),true);return}el.closest('.pronunciation-block')?.classList.add('editing-audio');
 const old=b.obj[b.key]??'';const template=document.createElement('template');
 template.innerHTML=model.meanings.includes(b.obj)&&b.key==='L'?`<textarea class="inline-editor">${esc(old)}</textarea>`:formControl(b.obj,b.key,b.label,b.opts,b.className,emptyFieldPlaceholder(el,b));
 const input=template.content.firstElementChild;const suggestions=template.content.querySelector('datalist');if(suggestions)document.body.append(suggestions);el.replaceWith(input);let done=false,selectHost=null,disposeSelect=null;
 function finish(save){if(done)return;done=true;activeEditor=null;
  if(save&&model.meanings.includes(b.obj)&&b.key==='L'&&emphasisValidation(input.value)){toast(emphasisValidation(input.value));input.value=old}
  if(save&&isPhoneticField(b.obj,b.key))input.value=phoneticValue(input.value);
  if(save&&String(old)!==input.value){b.obj[b.key]=input.value;b.obj._sourceBlank=(b.obj._sourceBlank||[]).filter(k=>k!==b.key);changed()}
  el.textContent=displayValue(b.obj,b.key,b.label);el.classList.toggle('empty-value',!b.obj[b.key]);disposeSelect?.();selectHost?.remove();input.replaceWith(el);suggestions?.remove();markEmptyFields();if(save&&((model.meanings.includes(b.obj)&&b.key==='dialect')||(isChunkEntry&&model.words.includes(b.obj)&&b.key==='chunkType')))render();
 }
 if(isPhoneticField(b.obj,b.key))input.addEventListener('input',()=>{const start=input.selectionStart;const before=input.value.slice(0,start).replace(/[\/／]/g,'').length;input.value=input.value.replace(/[\/／]/g,'');input.setSelectionRange(before,before)});
 activeEditor={finish};input.onblur=()=>finish(true);
 input.onchange=()=>{if(input.tagName==='SELECT')finish(true)};
 input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();finish(false);el.closest('.pronunciation-block')?.classList.remove('editing-audio');el.focus()}else if(e.key==='Enter'&&(input.tagName!=='TEXTAREA'||e.ctrlKey||e.metaKey)){e.preventDefault();finish(true);el.closest('.pronunciation-block')?.classList.remove('editing-audio');el.focus()}};
 if(model.meanings.includes(b.obj)&&b.key==='L'){input.hidden=true;selectHost=document.createElement('span');selectHost.className='present-select-host usage-autocomplete';input.after(selectHost);disposeSelect=window.PresentUI.multiSelect(selectHost,{label:b.label,value:input.value,placeholder:'选择或输入',options:emphasisOptionsFor(b.obj.I),validate:emphasisValidation,onInput:value=>{input.value=value},onCommit:()=>finish(true),onCancel:()=>finish(false)});}else if(input.tagName==='SELECT'){input.hidden=true;selectHost=document.createElement('span');selectHost.className='present-select-host';input.after(selectHost);disposeSelect=window.PresentUI.select(selectHost,{label:b.label,value:input.value,options:[...input.options].map(o=>({value:o.value,label:o.textContent})),onChange:value=>{input.value=value;finish(true)},onCancel:()=>finish(false)});}else{input.focus();input.select?.();}
}
function optionalWordForm(obj,key){return (model.positions.includes(obj)&&formKeysFor(obj.C).includes(key))||(model.meanings.includes(obj)&&['AC','AD'].includes(key))}
function displayValue(obj,key,label){
 if(isPhoneticField(obj,key))return phoneticValue(obj[key])||'待填写';
 if(optionalWordForm(obj,key)&&!obj[key])return '--';
 const v=obj[key];if(model.meanings.includes(obj)&&key==='dialect'&&v)return '['+v+']';if(v==null||v==='')return label||'待填写';
 if(model.meanings.includes(obj)&&key==='L'&&v)return String(v).split('\n').filter(Boolean).join(' ');
 if(model.meanings.includes(obj)&&['K','L','M'].includes(key))return String(v).trim().replace(/［/g,'[').replace(/］/g,']');
 if(model.words.includes(obj)){
  if(key==='E')return v==='暂无词频'?v:'词频'+v;if(key==='N')return String(v)==='1'?'重难点词':'重难点词 '+v;
  if(key==='M')return 'R'+v;if(key==='F')return 'AW';if(key==='G')return 'AW '+v;
  if(key==='S')return String(v).startsWith('高中')?v:'高中'+v;
 }return String(v);
}
function widget(kind,props,cls=''){if(kind==='menu'){const available=items=>items.some(item=>!item.disabled&&(item.children?available(item.children):item.type!=='divider'));if(!available(props.items||[]))return '';}const id=String(++bindingId);widgets.set(id,{kind,props});return `<span class="component-host ${cls}" data-widget="${id}"></span>`}
function removeButton(label,onClick,trash=false){return widget('remove',{label,onClick,trash},'remove-host'+(trash?' meaning-delete-host':''))}
function deleteField(obj,key){if(model.words.includes(obj)&&['syllables','E'].includes(key))return;if(model.positions.includes(obj)&&requiredPositionKeys(obj.C).includes(key))return;obj[key]='';obj._visible=(obj._visible||[]).filter(k=>k!==key);if(obj._audio)delete obj._audio[key];if(model.positions.includes(obj)&&['D','F'].includes(key)){const audioKey=key==='D'?'E':'G';obj[audioKey]='';if(obj._audio)delete obj._audio[audioKey]}changed();render()}
const formCaptions={H:'三单',I:'过去式',K:'过去分词',M:'现在分词'};
function field(kind,obj,key,label,cls='',required=false){const f={...spec(kind,key)};if(kind==='meanings'&&['dialect','AC','AD'].includes(key))cls+=' secondary-tag';if(kind==='positions'&&formKeysFor(obj.C).includes(key))f.options=[];required=required||(kind==='words'&&['syllables','E'].includes(key))||(kind==='positions'&&requiredPositionKeys(obj.C).includes(key));return `<div class="form-field removable ${cls}" data-field="${kind}-${key}"><span class="field-caption">${esc(kind==='words'&&key==='syllables'?'音节：':kind==='positions'&&formCaptions[key]?formCaptions[key]:kind==='meanings'&&key==='AC'?'BrE':kind==='meanings'&&key==='AD'?'AmE':kind==='meanings'&&key==='Z'?'近':kind==='meanings'&&key==='AA'?'=':kind==='meanings'&&key==='AB'?'反':label||f.label)}</span>${f.options?.length===1?`<span class="inline-value static-tag" aria-label="${esc(label||f.label)}">${esc(displayValue(obj,key,label||f.label))}</span>`:control(obj,key,label||f.label,f.options)}${required?'':removeButton('删除'+(label||f.label),()=>deleteField(obj,key))}</div>`}
function has(obj,key){if(model.words.includes(obj)&&key==='E'&&!isChunkEntry)return true;return (obj[key]!==''&&obj[key]!=null)||(obj._visible||[]).includes(key)}
function canAddField(kind,obj,key){if(kind==='words'){if(key==='K')return !has(obj,'I')&&!has(obj,'J');if(['I','J'].includes(key))return !has(obj,'K')}if(kind==='meanings'&&['J','K'].includes(key))return usageKeysFor(obj.I).includes(key);return true}
function addField(kind,obj,key){if(has(obj,key)||!canAddField(kind,obj,key))return;const f=spec(kind,key);if(kind==='words'&&key==='K')obj[key]='';else if(f.options?.length)obj[key]=f.options[0];obj._visible=[...new Set([...(obj._visible||[]),key])];changed();render()}
function meaningMenuGroups(items){
 const groups=[['释义与用法',['J','K','L','M','Y']],['词义关联',['Z','AA','AB']],['拼写与地区',['dialect']]];
 return groups.map(([label,keys],i)=>({type:'group',key:'group-'+i,label,children:items.filter(item=>keys.includes(item.key))})).filter(group=>group.children.length);
}
function wordMenuGroups(items){
 const regular=items.filter(item=>item.key!=='listeningTag'&&!['L','pronunciationNote'].includes(item.key));
 const tags=items.find(item=>item.key==='listeningTag')?.children||[];
 const listening=items.filter(item=>['L','pronunciationNote'].includes(item.key));
 return [{type:'group',key:'word-basic',label:'单词属性',children:regular},{type:'group',key:'word-listening-tags',label:'听力标签',children:tags},{type:'group',key:'word-listening',label:'听力',children:listening}].filter(group=>group.children.length);
}
function attributeMenu(kind,obj,keys,label,extra=[]){
 if(label==='添加单词标签')keys=keys.filter(key=>!['U','T','S','V','listeningTag'].includes(key));
 const spellingMenu=kind==='words'&&label==='添加拼写属性';
 if(!keys.length&&!extra.length)return '';
 const items=[...keys.map(key=>key==='listeningTag'?{key,label:'加听力标签',children:spec(kind,key).options.map(value=>({key:'@listening:'+value,label:value==='听力人名'?'人名':'地名'}))}:{key,label:spec(kind,key).label,disabled:has(obj,key)||!canAddField(kind,obj,key)}),...extra.map(x=>({key:x.key,label:x.label,disabled:x.disabled,className:x.className}))];
 return widget('menu',{label,grouped:kind==='meanings'||label==='添加单词标签',mode:kind==='meanings'?(isChunkMeaning(obj)?'chunk':'meaning'):undefined,onModeChange:value=>{if(value!==(isChunkMeaning(obj)?'chunk':'meaning'))switchMeaningMode(obj)},items:kind==='meanings'?meaningMenuGroups(items):label==='添加单词标签'?wordMenuGroups(items):items,onSelect:key=>{if(kind==='words'&&key.startsWith('@listening:')){obj.listeningTag=key.slice(11);changed();render();return}const item=extra.find(x=>x.key===key);if(item&&!item.disabled)item.action();else if(!item&&keys.includes(key))addField(kind,obj,key)}},'add-host');
}
function more(kind,obj,keys,label='添加属性',omitRender=[],extra=[],showMenu=true){return `<div class="optional-fields">${keys.filter(k=>has(obj,k)&&!omitRender.includes(k)).map(k=>keyField(kind,obj,k)).join('')}${showMenu?attributeMenu(kind,obj,keys,label,extra):''}</div>`}
const POSITION_OPTIONS=['','n','v','adj','adv','prep','pron','conj','num','art','link v','modal v','aux v','int','abbr','proper n'];
const canonicalPosition=c=>({'link. v':'link v','aux.v':'aux v'}[c]||c);
function formKeysFor(c){return ['v','aux.v','link. v','modal v','aux v','link v'].includes(c)?['H','I','K','M']:['n','proper n'].includes(c)?['O']:['adj','adv'].includes(c)?['P','Q']:[]}
function requiredPositionKeys(c){return ['D','E','F','G']}
function keyField(kind,obj,key){
 if(kind==='words'&&key==='L')return `<div class="guidance-module removable">${audioField(obj,key,'语音指导')}${removeButton('删除语音指导',()=>deleteField(obj,key))}</div>`;
 if(kind==='positions'&&['D','F'].includes(key)){const uk=key==='D';return `<section class="pronunciation-block removable">${field(kind,obj,key,uk?'英':'美','ipa-field',true)}${audioField(obj,uk?'E':'G',uk?'英式发音':'美式发音',true)}</section>`}
 if(kind==='positions'&&key==='R')return `<div class="form-field removable"><label class="check-field"><input type="checkbox" id="irregular" ${obj.R==='1'?'checked':''}>不规则动词</label></div>`;
 return field(kind,obj,key);
}
function audioField(obj,key,label,compact=false){const id=String(++bindingId);audioBindings.set(id,{obj,key,label});if(key==='L')return `<div class="audio-field guidance-audio"><span class="guidance-audio-label">语音指导</span><button class="guidance-audio-name ${obj[key]?'':'empty-value'}" data-guidance-audio="${id}" aria-label="选择语音指导音频" ${readOnly?'disabled':''}>${esc(obj[key]||'待上传语音指导音频')}</button><button class="play-button" data-audio-play="${id}" aria-label="播放语音指导">${icon}</button><input hidden type="file" accept=".aac,audio/aac" data-audio-file="${id}" aria-label="语音指导文件"></div>`;return `<div class="audio-field ${compact?'compact-audio':''}">${!compact?`<span class="audio-name">${obj[key]?control(obj,key,label):esc(label)}</span>`:''}<button class="play-button" data-audio-play="${id}" aria-label="播放${esc(label)}">${icon}</button><button class="file-button" data-audio-change="${id}" aria-label="更换${esc(label)}音频">更换音频</button><input hidden type="file" accept=".aac,audio/aac" data-audio-file="${id}" aria-label="${esc(label)}文件"></div>`}
function audioReferenceName(name){return String(name||'').trim().replace(/\.(mp3|wav|m4a|ogg|aac)$/i,'.aac')}
function normalizeAudioReferences(){for(const obj of [...model.positions,word()])for(const key of obj===word()?['L']:['E','G']){if(obj[key])obj[key]=audioReferenceName(obj[key]);if(obj._audio?.[key]?.name)obj._audio[key].name=audioReferenceName(obj._audio[key].name)}}
function wordAudioChoices(target){
 return [...model.positions.flatMap(p=>['E','G'].map(key=>({obj:p,key,pos:p.C||'空词性',accent:key==='E'?'英音':'美音',ipa:p[key==='E'?'D':'F']||''}))),...(word().L||word()._audio?.L?.data?[{obj:word(),key:'L',pos:'—',accent:'语音指导',ipa:''}]:[])].map(a=>({...a,current:a.obj===target.obj&&a.key===target.key}));
}
function openGuidanceChooser(id){openAudioChooser(id)}
function openAudioChooser(id){
 if(readOnly)return;
 if(requestMaterialAudio(id))return;
 if(!audioBindings.has(id))return;
 document.querySelector(`[data-audio-file="${id}"]`)?.click();
}
function isChunkMeaning(m){return m.contentMode==='chunk'||(!m.contentMode&&!m.O&&(!!m.AG||!!m.AH))}
function switchMeaningMode(m){
 if(isChunkMeaning(m)){m._chunkDraft={AG:m.AG||'',AH:m.AH||''};m.AG='';m.AH='';m.O=m._meaningDraft||'';m.contentMode='meaning'}
 else{openExternalChunkPicker(model.meanings.indexOf(m),true);return}
 m._visible=(m._visible||[]).filter(k=>!['O','AG','AH'].includes(k));changed();render();
}
function referenceMeaningsHTML(c){
 const source=(c.referenceType==='usage'?(window.catalogChunkUsages||[]).find(x=>x.id===c.id):(window.catalogChunkEntries||[]).find(x=>x.id===c.id||x.word===c.word));
 const meanings=Array.isArray(c.meanings)&&c.meanings.length?c.meanings:source?.meanings;
 const rows=meanings?.length?meanings.map(m=>typeof m==='string'?m:m.O||m.AH||m.meaning||''):[c.meaning||''];
 return `<div class="referenced-chunk-meanings">${rows.map((text,i)=>`<div class="referenced-meaning-row"><span class="sense-number" aria-label="释义序号 ${i+1}">${i+1}</span><div class="referenced-chunk-meaning">${esc(text)}</div></div>`).join('')}</div>`;
}
function referenceChunkTags(c){
 const current=(window.catalogChunkEntries||[]).find(x=>x.id===c.id||x.word===c.word)||c;
 return [current.chunkType,current.expressionLevel].filter(Boolean).map(t=>`<span class="referenced-chunk-label">${esc(t)}</span>`).join('');
}
function referenceTargetLabel(){return isChunkEntry?'词块用法':'词块'}
function openExternalChunkPicker(afterIndex=null,meaningReference=false){
 if(isUsageEntry&&!meaningReference)return;
 const target=meaningReference?'词块':referenceTargetLabel();
 if(afterIndex!=='@word'&&(afterIndex===null||!model.meanings[afterIndex])){toast('请先新增释义，再在释义下引用'+target);return}
 if(activeEditor)activeEditor.finish(true);
 if(readOnly)return;
 document.getElementById('chunkReferenceDialog')?.remove();
 const host=document.createElement('dialog');host.id='chunkReferenceDialog';host.className='audio-chooser chunk-reference-dialog';host.setAttribute('aria-label','引用'+target);
 host.innerHTML=`<div class="audio-chooser-heading"><strong>引用${target}</strong><button data-cancel-picker aria-label="关闭引用${target}">×</button></div><div class="chunk-picker"><form class="chunk-search-form"><input aria-label="搜索词库${target}" placeholder="搜索${target}"><button type="submit">搜索</button></form><div class="chunk-results" role="radiogroup" aria-label="搜索结果"></div><nav class="chunk-pagination" aria-label="搜索结果分页" hidden></nav></div><footer><span class="chunk-selection-count" aria-live="polite"></span><div class="chunk-footer-actions"><button data-cancel-picker>取消</button><button data-confirm-picker disabled>确认引用</button></div></footer>`;
 document.body.append(host);
 host.addEventListener('close',()=>host.remove(),{once:true});
 host.querySelectorAll('[data-cancel-picker]').forEach(button=>button.onclick=()=>host.close());
 const input=host.querySelector('input');
 const selected=()=>meaningReference?[]:afterIndex==='@word'?(model.wordChunks??=[]):model.meanings[afterIndex].chunks;
 const library=isChunkEntry&&!meaningReference?(window.catalogChunkUsages||[]).map(x=>({id:x.id,word:x.usage,meaning:x.meaning,referenceType:'usage',usageId:x.usageId,meanings:x.meanings})): [...(window.catalogChunkEntries||[]),...WORKBOOK_DATA.chunkLibrary.filter(c=>!(window.catalogChunkEntries||[]).some(x=>x.word===c.word))];
 let pending=null,page=1,matches=[],q='';
 const confirm=host.querySelector('[data-confirm-picker]');
 const updateSelection=()=>{confirm.disabled=!pending;host.querySelector('.chunk-selection-count').textContent=pending?'已选择：'+pending.word:'';host.querySelectorAll('[data-chunk-id]').forEach(button=>{const checked=button.dataset.chunkId===pending?.id;button.classList.toggle('is-selected',checked);button.setAttribute('aria-checked',String(checked))})};
 const renderPage=()=>{
 const highlighted=word=>{const i=word.toLowerCase().indexOf(q);return i<0?esc(word):esc(word.slice(0,i))+'<mark>'+esc(word.slice(i,i+q.length))+'</mark>'+esc(word.slice(i+q.length))};
 host.querySelector('.chunk-results').innerHTML=matches.length?matches.slice((page-1)*10,page*10).map(c=>`<button type="button" role="radio" aria-checked="false" data-chunk-id="${esc(c.id)}" ${selected().some(item=>item.id===c.id)?'disabled':''}><span class="chunk-radio" aria-hidden="true"></span><span class="chunk-result-word">${highlighted(c.word)}</span>${selected().some(item=>item.id===c.id)?'<span class="chunk-already-linked">已引用</span>':''}</button>`).join(''):(q?'<p class="chunk-search-empty">暂无匹配'+target+'</p>':'');
 host.querySelectorAll('[data-chunk-id]').forEach(button=>button.onclick=()=>{const c=library.find(c=>c.id===button.dataset.chunkId);if(!c||selected().some(item=>item.id===c.id))return;pending=c;updateSelection()});updateSelection();host.querySelector('.chunk-results').scrollTop=0;
 const pages=Math.ceil(matches.length/10),pager=host.querySelector('.chunk-pagination');pager.hidden=pages<=1;
 const numbers=pages<=7?Array.from({length:pages},(_,i)=>i+1):[...new Set([1,...Array.from({length:5},(_,i)=>Math.min(Math.max(page-2,2),pages-5)+i),pages])].sort((a,b)=>a-b);
 pager.innerHTML=numbers.map((n,i)=>(i&&n>numbers[i-1]+1?'<span class="page-gap">…</span>':'')+`<button type="button" data-result-page="${n}" aria-label="第 ${n} 页" ${n===page?'aria-current="page"':''}>${n}</button>`).join('');
 pager.querySelectorAll('[data-result-page]').forEach(button=>button.onclick=()=>{page=Number(button.dataset.resultPage);renderPage()});};
 const search=()=>{pending=null;page=1;q=input.value.trim().toLowerCase();matches=q?library.filter(c=>c.word.toLowerCase().includes(q)).sort((a,b)=>Number(b.word.toLowerCase()===q)-Number(a.word.toLowerCase()===q)):[];renderPage()};
 confirm.onclick=()=>{const c=pending;if(!c||selected().some(item=>item.id===c.id))return;if(meaningReference){const m=model.meanings[afterIndex];if(!isChunkMeaning(m))m._meaningDraft=m.O||'';m.O='';m.contentMode='chunk';m._visible=(m._visible||[]).filter(k=>!['O','AG','AH'].includes(k));m.AG=c.word;m.AH=(c.meanings?.length?c.meanings.map(x=>typeof x==='string'?x:x.O||x.AH||x.meaning||''):[c.meaning||'']).filter(Boolean).join('；');m.meaningChunkId=c.id}else selected().push({...c,examples:[]});changed();host.close();render()};
 host.querySelector('.chunk-search-form').onsubmit=e=>{e.preventDefault();search()};host.showModal();input.focus();
}
function meaningDialectGroup(m){
 if(!has(m,'dialect'))return '';
 const key=m.dialect==='AmE'?'AC':'AD',label=key==='AC'?'英式拼写':'美式拼写';
 return `<div class="form-field compact-field dialect-spelling" data-field="meanings-${key}">${control(m,key,label,[],'optional-spelling',label)}</div>`;
}
function meaningActions(i){return []}
function emphasisOptionsFor(c){
 const group=usageKeysFor(c)[0];
 const values=group==='K'?['单数','复数','常用单数','常用复数','含贬义','术语','单复数同形','构成复合词','过时','常用名','姓氏']:group==='J'?['常用于被动语态','系动词','不用于进行时','术语']:c==='adj'?['只用于名词前','常用于名词前','不用于名词前','含贬义','通常不用于名词前','构成复合词','术语','含褒义','过时']:c==='adv'?['句子副词','用于强调','修饰比较级']:[];
 return values.map(value=>'['+value+']');
}
function usageKeysFor(c){return formKeysFor(c).includes('H')?['J']:formKeysFor(c).includes('O')?['K']:[]}
function meaningInsertion(afterIndex=null){return `<div class="meaning-insert-actions" data-insert-after="${afterIndex??''}">${widget('add',{label:'新增释义',text:'新增释义',onClick:()=>runAction(afterIndex===null?{}:{insertAfter:String(afterIndex)},'addMeaning')},'add-meaning-host')}${isUsageEntry?'':widget('add',{label:'引用'+referenceTargetLabel(),text:'引用'+referenceTargetLabel(),onClick:()=>openExternalChunkPicker(afterIndex)},'add-chunk-host')}</div><div id="externalChunkPicker${afterIndex??''}"></div>`}
function nestReferencedChunks(){
 for(const ref of [...model.meanings].filter(m=>m.chunkRefId)){
  const index=model.meanings.indexOf(ref);
  let parent=model.meanings.slice(0,index).reverse().find(m=>!m.chunkRefId&&m.I===ref.I)||model.meanings.find(m=>!m.chunkRefId&&m.I===ref.I);
  if(!parent){parent={B:ref.B,I:ref.I,O:'',N:'高',examples:[],chunks:[],row:'parent-'+ref.row};model.meanings.splice(index,0,parent)}
  parent.chunks??=[];parent.chunks.push({id:ref.chunkRefId,word:ref.AG,meaning:ref.AH,examples:ref.examples||[],referenceData:ref});model.meanings.splice(model.meanings.indexOf(ref),1);
 }
}
function referencedChunkHTML(c,i,ci){return `<div class="chunk-node referenced-chunk-section removable" data-chunk-reference="${ci}">${removeButton('解除引用'+referenceTargetLabel()+' '+c.word,()=>runAction({unlink:`${i},${ci}`}),true)}<div class="referenced-chunk-card"><div class="referenced-chunk-heading"><span class="referenced-chunk-word">${esc(c.word)}</span>${isChunkEntry?'<span class="referenced-chunk-label">词块用法</span>':referenceChunkTags(c)}</div>${referenceMeaningsHTML(c)}</div></div>`}

function meaningHTML(m,i,n){n=model.meanings.slice(0,i).filter(x=>x.I===m.I&&!x.chunkRefId).length;const usageKeys=isChunkEntry?[]:usageKeysFor(m.I);const keys=WORKBOOK_DATA.meanings.fields.flatMap(f=>f.key==='AC'?['dialect','AC']:[f.key]).filter(k=>!['B','I','O','N','AJ','AE','AF','AG','AH','AC','AD','AI'].includes(k)&&(!['J','K'].includes(k)||usageKeys.includes(k)));return `<section class="sense-section removable ${m.image?'has-meaning-image':''}" data-meaning="${i}"><div class="meaning-controls">${widget('drag',{index:i,label:'拖动释义 '+(n+1)+' 排序，或按 Alt 加上下方向键'},'drag-host')}<span class="sense-number" aria-label="释义序号 ${n+1}">${n+1}</span></div>${removeButton('删除释义 '+(n+1),()=>{model.meanings.splice(i,1);changed();render()},true)}<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-image-file="${i}" aria-label="上传释义图片 ${n+1}">${m.image?`<div class="meaning-image removable"><button class="meaning-thumbnail" data-image-preview="${i}" aria-label="查看释义图片 ${n+1}"><img src="${esc(m.image.data)}" alt="释义配图"></button><button class="image-replace" data-image-replace="${i}" aria-label="更换释义图片 ${n+1}">换图</button>${removeButton('删除释义图片 '+(n+1),()=>{delete m.image;changed();render()})}</div>`:''}${example?.catalog?`<span class="entry-id meaning-id ${m.meaningId?'':'meaning-id-pending'}" aria-label="释义 ID">${m.meaningId?"释义ID："+esc(catalogMeaningId(m.meaningId)):"保存后生成ID"}</span>`:""}<div class="meaning-fields"><div class="usage-cluster">${[...usageKeys,'L'].filter(k=>has(m,k)).map(k=>field('meanings',m,k,k==='L'?'用法强调':'用法','compact-field')).join('')}${has(m,'M')?field('meanings',m,'M','语域','register-field'):''}${has(m,'dialect')?field('meanings',m,'dialect','英美标识','dialect-inline'):''}${meaningDialectGroup(m)}</div>${isChunkMeaning(m)?`<div class="meaning-chunk-pair" data-meaning-chunk="${i}" ${readOnly?'':'role="button" tabindex="0" aria-label="更换释义词块"'}>${field('meanings',m,'AG','释义词块-英','chunk-english',true)}<div class="form-field meaning-text" data-field="meanings-AH"><span class="inline-value static-tag" aria-label="释义词块-中">${esc(String(m.AH||'选择词块后自动带入').split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean).join('；'))}</span></div></div>`:field('meanings',m,'O','中文释义','meaning-text',true)}${has(m,'Y')?field('meanings',m,'Y','英文释义','english-meaning'):''}${['Z','AA','AB'].filter(k=>has(m,k)).map(k=>field('meanings',m,k,null,'relation-field')).join('')}${attributeMenu('meanings',m,keys,'添加释义内容',meaningActions(i))}</div>${more('meanings',m,keys,'添加释义内容',['J','K','L','M','dialect','Y','Z','AA','AB'],[],false)}${m.chunks.map((c,ci)=>referencedChunkHTML(c,i,ci)).join('')}<div data-picker="${i}"></div></section>`}
function defaultSelections(){
 for(const p of model.positions)for(const key of ['S','T'])if(has(p,key)&&!String(p[key]||'').trim()){p[key]=key==='S'?'S1':'W1';p._sourceBlank=(p._sourceBlank||[]).filter(k=>k!==key);changed()}
 if(!isChunkEntry&&!String(word().E||'').trim())word().E='暂无词频';
 for(const kind of ['words','positions','meanings'])for(const obj of model[kind]){
  const keys=[...WORKBOOK_DATA[kind].fields.map(f=>f.key),...(obj._visible||[])];
  for(const key of keys){
   if(obj._sourceBlank?.includes(key)||(kind==='words'&&key==='K')||(kind==='positions'&&['S','T'].includes(key)))continue;
   if(kind==='positions'&&formKeysFor(obj.C).includes(key))continue;
   const required=kind==='positions'&&requiredPositionKeys(obj.C).includes(key);
   if(!required&&!(obj._visible||[]).includes(key))continue;
   const options=spec(kind,key).options;
   if(options?.length&&(obj[key]==null||obj[key]==='')){obj[key]=options[0];changed()}
  }
 }
}
function catalogAuditMarkup(){
 const audit=window.catalogAudit;let time='—';
 if(audit?.at&&!Number.isNaN(new Date(audit.at).getTime()))time=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(audit.at));
 return `<div class="catalog-edit-meta"><span>最后编辑人：${esc(audit?.actor||'—')}</span><span>编辑时间：${esc(time)}</span></div>`;
}
function spellingFields(w,keys){
 const shown=keys.filter(k=>has(w,k)),menu=attributeMenu('words',w,keys,'添加拼写属性');
 const column=(fields,cls,withMenu)=>`<div class="optional-fields ${cls}${withMenu&&menu?' spelling-with-add':''}" style="--spelling-add-row:${Math.max(1,fields.length)}">${fields.map(k=>keyField('words',w,k)).join('')}${withMenu?menu:''}</div>`;
 return `<div class="spelling-columns">${column(shown,'spelling-primary',true)}</div>`;
}
function positionForms(p,keys){
 if(!keys.length)return '';
 const groups=keys.includes('H')?[['现在',['H']],['过去',['I']],['过去分词',['K']],['现在分词',['M']]]:[['',keys]];
 return `<div class="position-card word-forms">${keys.includes('H')?`<div class="irregular-row">${keyField('positions',p,'R')}</div>`:''}${groups.map(([label,fields])=>`<section class="form-group" aria-label="${label||'词形'}"><div class="optional-fields">${fields.map(k=>field('positions',p,k,null,'',true)).join('')}</div></section>`).join('')}</div>`;
}
function render(){normalizeChunkPositions();nestReferencedChunks();normalizeAudioReferences();for(const m of model.meanings)if(!Object.getOwnPropertyDescriptor(m,'dialect')?.get)Object.defineProperty(m,'dialect',{configurable:true,get(){return this.AE||this.AF||''},set(value){this.AE=value==='BrE'?'BrE':'';this.AF=value==='AmE'?'AmE':'';this._visible=(this._visible||[]).filter(k=>!['AE','AF'].includes(k));this._sourceBlank=(this._sourceBlank||[]).filter(k=>!['AE','AF'].includes(k))}});if(!model.positionOrderRevision){model.positions.sort((a,b)=>Number(b.C==='')-Number(a.C===''));model.positionOrderRevision=1}defaultSelections();if(activeEditor)activeEditor.finish(true);window.PresentUI?.dispose();const scroll=window.scrollY;bindings.clear();attributeGroups.clear();audioBindings.clear();widgets.clear();bindingId=0;const w=word(),p=currentPosition();
 if(isUsageEntry){
 document.querySelector('.board').innerHTML=`<header class="edit-actions">${catalogAuditMarkup()}<button id="catalogBack">返回基础词库</button>${window.catalogPending&&window.catalogCanReview&&!readOnly?'<button id="approveCatalog" class="save review-save">通过审核并保存</button>':''}<button id="saveExample" class="save" aria-label="保存">保存</button></header><section class="word-overview chunk-overview" aria-label="词块用法"><div class="word-heading chunk-title-row"><label class="word-title">${control(w,'displayWord','用法',[],'word-input')}</label><span class="entry-id word-id">${model.usageId?'词块用法ID：'+esc(model.usageId):'保存后生成ID'}</span></div></section><main class="editor-columns chunk-editor usage-editor"><div class="meanings-pane">${model.meanings.map((m,i)=>`<section class="sense-section removable" data-meaning="${i}"><div class="meaning-controls">${widget('drag',{index:i,label:'拖动释义 '+(i+1)+' 排序，或按 Alt 加上下方向键'},'drag-host')}<span class="sense-number" aria-label="释义序号 ${i+1}">${i+1}</span></div>${removeButton('删除释义 '+(i+1),()=>{model.meanings.splice(i,1);changed();render()},true)}<span class="entry-id meaning-id">${m.meaningId?'释义ID：'+esc(m.meaningId):'保存后生成ID'}</span><div class="meaning-fields">${field('meanings',m,'O','释义','meaning-text',true)}</div></section>`+meaningInsertion(i)).join('')}${model.meanings.length?'':meaningInsertion()}</div></main>`;
 for(const [id,w] of widgets){const host=document.querySelector(`[data-widget="${id}"]`);if(host)window.PresentUI?.mount(host,w.kind,w.props)}
 if(!readOnly)window.PresentUI?.sortable(document.querySelector('.meanings-pane'),(from,to)=>reorderMeaning(from,to,to>from));
 markEmptyFields();if(readOnly)applyReadOnly();window.scrollTo?.(0,scroll);return;
 }
 const wordTop=['E','F','M','L','pronunciationNote'];const spellings=['C','B','D','I','J','K'];const formKeys=formKeysFor(pos);
 document.querySelector('.board').innerHTML=`<header class="edit-actions">${example?.catalog?catalogAuditMarkup():''}${example?.catalog?'<button id="catalogBack">返回基础词库</button>':''}${example?.catalog&&window.catalogPending&&window.catalogCanReview&&!readOnly?'<button id="approveCatalog" class="save review-save">通过审核并保存</button>':''}<button id="saveExample" class="save" aria-label="保存">保存</button></header><section class="word-overview" aria-label="单词信息"><div class="word-summary"><div class="word-heading"><div class="word-title-row"><label class="word-title">${control(w,'displayWord','单词',[],'word-input',example?.word||'present')}</label><div class="word-syllables">${field('words',w,'syllables')}</div>${example?.catalog?`<span class="entry-id word-id">${window.catalogUnsaved?'保存后生成ID':'单词ID：'+esc(example.id)}</span>`:""}</div>${more('words',w,wordTop,'添加单词标签',['listeningTag','L','pronunciationNote'])}${has(w,'L')?`<div class="word-guidance">${more('words',w,['L'],'',[],[],false)}</div>`:''}${has(w,'pronunciationNote')?`<div class="word-pronunciation-note">${field('words',w,'pronunciationNote','语音说明')}</div>`:''}</div></div><aside class="spelling-row" aria-label="单词拼写属性">${spellingFields(w,spellings)}</aside></section><nav class="pos-tabs" role="tablist" aria-label="词性">${model.positions.map((p,i)=>`<div class="pos-tab removable"><button id="pos-${i}" data-pos="${esc(p.C)}" role="tab" tabindex="${p.C===pos?0:-1}" aria-controls="wordPanel" aria-selected="${p.C===pos}" class="${p.C===pos?'active':''}"><span class="pos-abbr">${esc(p.C||'空词性')}</span><span class="pos-count">${model.meanings.filter(m=>m.I===p.C&&!m.chunkRefId).length}</span></button>${removeButton('删除词性 '+(p.C||'空词性'),()=>deletePosition(p))}</div>`).join('')}${widget('menu',{label:isChunkEntry?'添加词性':'添加词性或词块',menuClass:'pos-choice-menu',items:[{type:'group',key:'@positions',label:'词性',children:(isChunkEntry?['','phr v']:POSITION_OPTIONS).map(c=>({key:c||'@empty',label:c||'空词性',disabled:model.positions.some(p=>canonicalPosition(p.C)===c)}))},...(!isChunkEntry?[{type:'group',key:'@chunks',label:'词块',children:[{key:'@wordChunks',label:'词块',disabled:Array.isArray(model.wordChunks)}]}]:[])],onSelect:key=>{if(key==='@wordChunks'){if(Array.isArray(model.wordChunks))return;model.wordChunks=[];pos='@wordChunks';changed();render()}else addPosition(key==='@empty'?'':key)}},'add-host')}</nav><main id="wordPanel" class="editor-columns" role="tabpanel" ${p?`aria-labelledby="pos-${model.positions.indexOf(p)}"`: 'aria-label="词性内容"'}><div class="meanings-pane">${model.meanings.map((m,i)=>({m,i})).filter(x=>x.m.I===pos).map(({m,i},n)=>meaningHTML(m,i,n)+meaningInsertion(i)).join('')}${p?`${model.meanings.some(m=>m.I===pos)?'':meaningInsertion()}`:''}</div>${p?`<aside class="position-pane" aria-label="当前词性属性"><div class="position-card pronunciation-card"><div class="pronunciations">${['D','F'].map(k=>keyField('positions',p,k)).join('')}</div><div class="position-levels">${['S','T'].map(k=>has(p,k)?field('positions',p,k):`<button class="add-position-level" data-add-level="${k}">＋ ${k==='S'?'口语级别':'书写级别'}</button>`).join('')}</div></div>${positionForms(p,formKeys)}</aside>`:''}</main>`;
 if(isChunkEntry){document.querySelector('.word-overview').outerHTML=`<section class="word-overview chunk-overview"><div class="word-heading"><div class="chunk-title-row"><label class="word-title">${control(w,'displayWord','词块',[],'word-input')}</label>${example?.catalog?`<span class="entry-id word-id">${window.catalogUnsaved?'保存后生成ID':'词块ID：'+esc(example.id)}</span>`:''}</div><div class="chunk-tags-row"><div class="chunk-type">${control(w,'chunkType','词块类型',spec('words','chunkType').options,'chunk-type-tag')}</div>${w.expressionLevel?`<div class="chunk-type removable">${control(w,'expressionLevel','表达标签',['口语表达','高级表达'],'chunk-type-tag')}${removeButton('删除表达标签',()=>{delete w.expressionLevel;changed();render()})}</div>`:widget('menu',{label:'添加表达标签',items:[{key:'口语表达',label:'口语表达'},{key:'高级表达',label:'高级表达'}],onSelect:key=>{if(!['口语表达','高级表达'].includes(key))return;w.expressionLevel=key;changed();render()}},'add-host')}</div></div></section>`;document.querySelector('.position-pane')?.remove();$('wordPanel').classList.add('chunk-editor');document.querySelector('.pos-tabs').innerHTML=`${model.positions.map(p=>`<div class="pos-tab"><button id="${p.C==='phr v'?'chunkVerbTab':'chunkEmptyTab'}" data-pos="${esc(p.C)}" role="tab" aria-selected="${pos===p.C}" aria-controls="wordPanel" class="${pos===p.C?'active':''}"><span class="pos-abbr">${p.C||'空词性'}</span><span class="pos-count">${model.meanings.filter(m=>m.I===p.C).length}</span></button></div>`).join('')}${Array.isArray(model.wordChunks)?`<div class="word-chunks-tab removable"><button id="chunkUsagesTab" data-pos="@wordChunks" role="tab" aria-selected="${pos==='@wordChunks'}" aria-controls="wordPanel" class="${pos==='@wordChunks'?'active':''}">词块用法 <span class="pos-count">${model.wordChunks.length}</span></button>${removeButton('删除词块用法页签',()=>{delete model.wordChunks;if(pos==='@wordChunks')pos=model.positions[0]?.C||'';changed();render()})}</div>`:''}${widget('menu',{label:'添加词块用法页签',menuClass:'pos-choice-menu',items:[{type:'group',key:'@usages',label:'词块用法',children:[{key:'usages',label:'词块用法',disabled:Array.isArray(model.wordChunks)}]}],onSelect:key=>{if(key!=='usages'||Array.isArray(model.wordChunks))return;model.wordChunks=[];pos='@wordChunks';changed();render()}},'add-host')}`;$('wordPanel').setAttribute('aria-labelledby',pos==='@wordChunks'?'chunkUsagesTab':pos==='phr v'?'chunkVerbTab':'chunkEmptyTab');
 if(pos==='@wordChunks'){
 const refs=document.createElement('section');refs.className='chunk-level-usages';refs.setAttribute('aria-label','词块本身的用法');refs.innerHTML=`<div class="word-level-chunks">${(model.wordChunks||[]).map((c,ci)=>`<div class="referenced-chunk-section removable">${removeButton('解除词块本身引用的用法 '+c.word,()=>{model.wordChunks.splice(ci,1);changed();render()},true)}<div class="referenced-chunk-card"><div class="referenced-chunk-heading"><span class="referenced-chunk-word">${esc(c.word)}</span><span class="referenced-chunk-label">词块用法</span></div>${referenceMeaningsHTML(c)}</div></div>`).join('')}${widget('add',{label:'为整个词块引用词块用法',text:'引用词块用法',onClick:()=>openExternalChunkPicker('@word')},'add-host')}</div>`;$('wordPanel').replaceChildren(refs);}
 }

 if(!isChunkEntry&&(Array.isArray(model.wordChunks)||pos==='@wordChunks')){
 const tab=document.createElement('div');tab.className='word-chunks-tab';tab.innerHTML=`<button id="wordChunksTab" data-pos="@wordChunks" role="tab" aria-controls="wordPanel" aria-selected="${pos==='@wordChunks'}" class="${pos==='@wordChunks'?'active':''}"><span>词块</span><span class="pos-count">${model.wordChunks?.length||0}</span></button>`;const nav=document.querySelector('.pos-tabs');nav.insertBefore(tab,nav.querySelector(':scope > .add-host'));
 if(pos==='@wordChunks'){$('wordPanel').setAttribute('aria-labelledby','wordChunksTab');$('wordPanel').innerHTML=`<div class="word-level-chunks">${(model.wordChunks||[]).map((c,ci)=>`<div class="referenced-chunk-section removable">${removeButton('解除引用词块 '+c.word,()=>{model.wordChunks.splice(ci,1);changed();render()},true)}<div class="referenced-chunk-card"><div class="referenced-chunk-heading"><span class="referenced-chunk-word">${esc(c.word)}</span>${referenceChunkTags(c)}</div>${referenceMeaningsHTML(c)}</div></div>`).join('')}${widget('add',{label:'引用单词级词块',text:'引用词块',onClick:()=>openExternalChunkPicker('@word')},'add-host')}<div id="externalChunkPicker@word"></div></div>`}
 }
 if(!isChunkEntry)document.querySelector('.word-summary').append(document.querySelector('.pos-tabs'));
 const gift=model.meanings.findIndex(m=>m.O==='礼物');const first=document.querySelector(`[data-meaning="${gift}"] .example-item`);if(first){const b=document.createElement('button');b.className='gift-picture';b.setAttribute('aria-label','放大礼物配图');b.innerHTML='<img src="'+$('giftDialog').querySelector('img').src+'" alt="金黄色礼物盒，系着红色蝴蝶结">';b.onclick=()=>$('giftDialog').showModal();first.appendChild(b)}
 for(const [id,w] of widgets){const host=document.querySelector(`[data-widget="${id}"]`);if(host)window.PresentUI?.mount(host,w.kind,w.props)}
 if(!readOnly&&!isChunkEntry)window.PresentUI?.sortable(document.querySelector('.pos-tabs'),reorderPosition,{handle:'[role=tab]',draggable:'.pos-tab',direction:'horizontal',filter:'.remove-host',delay:150,delayOnTouchOnly:true,touchStartThreshold:4});
 if(!readOnly&&document.querySelector('.meanings-pane'))window.PresentUI?.sortable(document.querySelector('.meanings-pane'),(from,to)=>{const slots=model.meanings.map((m,i)=>m.I===pos?i:-1).filter(i=>i>=0);reorderMeaning(slots[from],slots[to],to>from)});
 markEmptyFields();if(readOnly)applyReadOnly();window.scrollTo?.(0,scroll);
}
function applyReadOnly(){
 document.body.classList.add('read-only');
 document.querySelectorAll('.frequency-host').forEach(el=>{const text=el.textContent;el.replaceChildren(document.createTextNode(text))});
 document.querySelectorAll('.board button').forEach(b=>{if(!b.matches('#catalogBack,[data-pos],[data-guidance-audio],[data-audio-play],[data-image-preview],.gift-picture'))b.remove()});
 document.querySelectorAll('.remove-host,.drag-host,.meaning-insert-actions,.image-replace,.board input[type=file]').forEach(el=>el.remove());
 document.querySelectorAll('[data-view]').forEach(el=>{el.removeAttribute('data-view');el.removeAttribute('role');el.removeAttribute('tabindex')});
}
function emptyFieldPlaceholder(el,b){
 if(model.meanings.includes(b.obj)&&b.key==='L')return '待填写用法强调';
 if(model.meanings.includes(b.obj)&&b.key==='AG')return '引用释义词块';
 if(model.positions.includes(b.obj)&&['S','T'].includes(b.key))return '待填写';
 if(model.meanings.includes(b.obj)&&['AC','AD'].includes(b.key))return b.label;
 if(optionalWordForm(b.obj,b.key))return '--';
 const field=el.closest('.form-field');
 const caption=field&&[...field.children].find(child=>child.matches('.field-caption,span:not(.inline-value):not(.component-host)')&&child.textContent.trim()&&getComputedStyle(child).display!=='none'&&getComputedStyle(child).visibility!=='hidden');
 return caption?'待填写':b.label;
}
function markEmptyFields(){
 document.querySelectorAll('[data-view]').forEach(el=>{const b=bindings.get(el.dataset.view);if(b&&!String(b.obj[b.key]??'').trim())el.textContent=emptyFieldPlaceholder(el,b)});
 document.querySelectorAll('[data-view],[data-edit]').forEach(el=>{const b=bindings.get(el.dataset.view||el.dataset.edit);if(!b)return;const card=el.closest('.pronunciation-block')||el.closest('.form-field,.word-title');if(card)card.classList.toggle('unfilled-card',!optionalWordForm(b.obj,b.key)&&!String(el.matches('[data-edit]')?el.value:b.obj[b.key]??'').trim())});
 document.querySelectorAll('[data-audio-play]').forEach(el=>{const b=audioBindings.get(el.dataset.audioPlay);const card=el.closest('.guidance-module');if(card)card.classList.toggle('unfilled-card',!String(b?.obj[b.key]??'').trim())});
}
document.addEventListener('input',e=>{if(e.target.matches('[data-edit]'))markEmptyFields()});
function speak(text,lang='en-GB'){if(!window.speechSynthesis){toast('当前浏览器不支持系统朗读');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.85;speechSynthesis.speak(u)}
let playingAudio=null;

document.addEventListener('change',async e=>{
 if(e.target.dataset.imageFile!==undefined){const m=model.meanings[+e.target.dataset.imageFile],file=e.target.files?.[0];if(!m||!file)return;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){toast('请选择 PNG、JPEG、WebP 或 GIF 图片');return}if(file.size>2*1024*1024){toast('请选择 2 MB 以内的图片');return}const reader=new FileReader();reader.onload=()=>{if(!model.meanings.includes(m))return;m.image={name:file.name,data:reader.result};changed();render()};reader.onerror=()=>toast('图片读取失败，请重新选择');reader.readAsDataURL(file);return}
 if(e.target.id==='irregular'){currentPosition().R=e.target.checked?'1':'';changed()}
 if(e.target.dataset.audioFile){const a=audioBindings.get(e.target.dataset.audioFile),file=e.target.files?.[0];if(!file)return;if(!/\.aac$/i.test(file.name)){toast('请选择 .aac 格式音频文件');e.target.value='';return}a.obj[a.key]=audioReferenceName(file.name);if(a.obj._audio)delete a.obj._audio[a.key];changed();render()}
});
document.addEventListener('focusin',e=>{document.querySelectorAll('.editing-audio').forEach(block=>{if(!block.contains(e.target))block.classList.remove('editing-audio')})});
document.addEventListener('click',e=>{document.querySelectorAll('.editing-audio').forEach(block=>{if(!block.contains(e.target))block.classList.remove('editing-audio')});const chunk=e.target.closest('[data-meaning-chunk]');if(chunk){if(!readOnly)openExternalChunkPicker(Number(chunk.dataset.meaningChunk),true);return}const value=e.target.closest('[data-view]');if(value){activate(value);return}const b=e.target.closest('button');if(b)handleButton(b)});
function runAction(dataset,id=''){handleButton({dataset,id})}
function deletePosition(position){
 if(readOnly)return;
 const remove=()=>{model.positions=model.positions.filter(p=>p!==position);model.meanings=model.meanings.filter(m=>m.I!==position.C);if(pos===position.C)pos=model.positions[0]?.C||'';changed();render()};
 if(!model.meanings.some(m=>m.I===position.C)){remove();return}
 if(document.querySelector('.position-delete-dialog'))return;
 const dialog=document.createElement('dialog');dialog.className='position-delete-dialog';dialog.setAttribute('aria-labelledby','positionDeleteTitle');dialog.setAttribute('aria-describedby','positionDeleteMessage');
 dialog.innerHTML='<h2 id="positionDeleteTitle">删除词性</h2><p id="positionDeleteMessage">当前词性下有数据，是否要删除</p><div class="position-delete-actions"><button data-cancel-delete autofocus>取消</button><button data-confirm-delete>确认删除</button></div>';
 const close=()=>{dialog.close();dialog.remove()};
 dialog.querySelector('[data-cancel-delete]').onclick=close;
 dialog.querySelector('[data-confirm-delete]').onclick=()=>{close();remove()};
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-cancel-delete]').focus();
}
function addPosition(value){if(isChunkEntry&&(isUsageEntry||word().chunkType!=='短语动词'||value!=='phr v'))return;if(!isChunkEntry&&!POSITION_OPTIONS.includes(value))return;if(isChunkEntry&&!['','phr v'].includes(value))return;if(model.positions.some(p=>p.C===value))return;const p=Object.fromEntries(WORKBOOK_DATA.positions.fields.map(f=>[f.key,'']));Object.assign(p,{A:selectedWord,C:value,row:'pos-'+Date.now()});model.positions.push(p);pos=p.C;changed();render()}
function handleButton(b){if(activeEditor)activeEditor.finish(true);
 if(b.id==='catalogBack'){if(dirty&&!confirm('有未保存的修改，确定返回吗？'))return;window.parent.postMessage({type:'vocabulary:close',entryId:example.id},'*');return}
 if(b.dataset.guidanceAudio){if(!readOnly)openGuidanceChooser(b.dataset.guidanceAudio);return}
 if(b.dataset.audioChange){openAudioChooser(b.dataset.audioChange);return}
 if(b.dataset.imageReplace!==undefined){document.querySelector(`[data-image-file="${b.dataset.imageReplace}"]`).click();return}
 if(b.dataset.imagePreview!==undefined){const m=model.meanings[+b.dataset.imagePreview];const dialog=$('meaningImageDialog');dialog.querySelector('img').src=m.image.data;dialog.showModal();return}
 if(b.dataset.addLevel){if(!readOnly&&['S','T'].includes(b.dataset.addLevel)&&currentPosition())addField('positions',currentPosition(),b.dataset.addLevel);return}
 if(b.dataset.pos!==undefined){pos=b.dataset.pos;render();return}
 if(b.id==='saveExample'||b.id==='approveCatalog'){if(readOnly||(b.id==='approveCatalog'&&(!window.catalogPending||!window.catalogCanReview)))return;if(model.meanings.some(m=>emphasisValidation(String(m.L||'')))){toast('用法强调的符号仅允许 [ ] &');return}if(isChunkEntry&&!isUsageEntry&&!word().chunkType){toast('请选择词块类型');return}if(!word().displayWord?.trim()){toast(isUsageEntry?'请填写用法':'请填写单词');document.querySelector('[aria-label="'+(isUsageEntry?'用法':isChunkEntry?'词块':'单词')+'"]').focus();return}if(!isChunkEntry&&!String(word().syllables||'').trim()){toast('请填写音节');document.querySelector('[aria-label="音节拆分"]')?.focus();return}if(model.positions.some(p=>['S','T'].some(k=>has(p,k)&&!String(p[k]||'').trim()))){toast('请填写已添加的口语或书写级别');return}if((isUsageEntry&&!model.meanings.length)||model.meanings.some(m=>(isChunkMeaning(m)?!String(m.AG||'').trim()||!String(m.AH||'').trim():!String(m.O||'').trim()))){toast('请填写中文释义或成对的释义词块（英、中）');return}if(!isChunkEntry&&(!model.positions.length||model.positions.some(p=>requiredPositionKeys(p.C).some(k=>!String(p[k]??'').trim())))){toast('请填写各词性的英美音标和发音音频');return}try{if(example?.catalog&&window.parent!==window){window.parent.postMessage({type:'vocabulary:save',entryId:example.id,approve:b.id==='approveCatalog',model:copy(model)},'*');return}localStorage.setItem(STORAGE,JSON.stringify({version:2,model}));dirty=false;toast('已保存到本机')}catch{toast('本机存储空间不足或不可用，修改仍保留在页面中')}return}
 if(b.dataset.unlink){const [i,c]=b.dataset.unlink.split(',').map(Number);model.meanings[i].chunks.splice(c,1);changed();render()}
 if(b.id==='addMeaning'){const m=Object.fromEntries(WORKBOOK_DATA.meanings.fields.map(f=>[f.key,'']));Object.assign(m,{B:selectedWord,I:pos,O:'',N:'高',examples:[],chunks:[],row:'meaning-'+Date.now()});const at=b.dataset.insertAfter===undefined?model.meanings.length:Number(b.dataset.insertAfter)+1;model.meanings.splice(at,0,m);changed();render();document.querySelector(`[data-meaning="${at}"] .meaning-text [data-view]`)?.click()}
 if(b.dataset.linkChunk!==undefined){openExternalChunkPicker(+b.dataset.linkChunk);return}
 if(b.dataset.speak){const [i,c,j]=b.dataset.speak.split(',');speak((c===''?model.meanings[i].examples:model.meanings[i].chunks[c].examples)[j].en)}
 if(b.dataset.audioPlay){const a=audioBindings.get(b.dataset.audioPlay),file=a.obj._audio?.[a.key];if(!file?.data){if(example?.catalog&&window.parent!==window){window.parent.postMessage({type:'vocabulary:audio-play',entryId:example.id,name:a.obj[a.key]},'*');return}toast('尚未载入此音频文件，请先添加或更换音频');return}if(playingAudio)playingAudio.pause();playingAudio=new Audio(file.data);playingAudio.play().catch(()=>toast('此音频无法播放，请更换文件'))}
}
document.addEventListener('keydown',e=>{if(e.target.matches('[data-meaning-chunk]')&&['Enter',' '].includes(e.key)){e.preventDefault();if(!readOnly)openExternalChunkPicker(Number(e.target.dataset.meaningChunk),true);return}if(e.target.matches('[data-view]')&&['Enter',' '].includes(e.key)){e.preventDefault();activate(e.target);return}if(!e.altKey&&e.target.matches('[role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...document.querySelectorAll('[role="tab"]')],i=tabs.indexOf(e.target);const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();document.querySelectorAll('[role="tab"]')[next].focus()}});

function reorderPosition(from,to){
 if(from===to||!model.positions[from]||!model.positions[to])return;
 const [item]=model.positions.splice(from,1);model.positions.splice(to,0,item);changed();render();
 document.querySelector(`#pos-${to}`)?.focus();
}
document.addEventListener('keydown',e=>{if(readOnly)return;const handle=e.target.closest('.pos-tabs [role=tab]');if(!handle||!e.altKey||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const from=model.positions.findIndex(p=>p.C===handle.dataset.pos);reorderPosition(from,from+(e.key==='ArrowRight'?1:-1))});
function reorderMeaning(from,to,after=false){
 if(readOnly)return;
 const source=model.meanings[from],target=model.meanings[to];if(!source||!target||source===target||source.I!==pos||target.I!==pos)return;
 const slots=model.meanings.map((m,i)=>m.I===pos?i:-1).filter(i=>i>=0),items=slots.map(i=>model.meanings[i]);
 items.splice(items.indexOf(source),1);items.splice(items.indexOf(target)+(after?1:0),0,source);slots.forEach((slot,i)=>model.meanings[slot]=items[i]);changed();render();
 document.querySelector(`[data-drag-meaning="${model.meanings.indexOf(source)}"]`)?.focus();
}
document.addEventListener('keydown',e=>{const handle=e.target.closest('[data-drag-meaning]');if(!handle||!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const from=Number(handle.dataset.dragMeaning),slots=model.meanings.map((m,i)=>m.I===pos?i:-1).filter(i=>i>=0),next=slots[slots.indexOf(from)+(e.key==='ArrowDown'?1:-1)];if(next!==undefined)reorderMeaning(from,next,e.key==='ArrowDown')});
const imageDialog=document.createElement('dialog');imageDialog.id='meaningImageDialog';imageDialog.className='gift-dialog';imageDialog.setAttribute('aria-label','释义图片预览');imageDialog.innerHTML='<button class="image-dialog-close" aria-label="关闭释义图片">×</button><img alt="释义图片">';document.body.append(imageDialog);imageDialog.querySelector('button').onclick=()=>imageDialog.close();imageDialog.onclick=e=>{if(e.target===imageDialog)imageDialog.close()};
$('closeGift').onclick=()=>$('giftDialog').close();$('giftDialog').onclick=e=>{if(e.target===$('giftDialog'))$('giftDialog').close()};
window.addEventListener('beforeunload',e=>{if(activeEditor)activeEditor.finish(true);if(dirty){e.preventDefault();e.returnValue=''}});
render();

let materialAudioRequest=null,materialPlaybackUrl=null;
function requestMaterialAudio(id){
 if(!example?.catalog||window.parent===window)return false;
 if(readOnly)return true;
 const target=audioBindings.get(id);if(!target)return true;
 const requestId=String(Date.now())+'-'+Math.random();
 materialAudioRequest={target,requestId};
 window.parent.postMessage({type:'vocabulary:audio-select',entryId:example.id,requestId,current:target.obj[target.key]||'',wordAudio:[...model.positions.flatMap(p=>['E','G'].map(key=>({name:p[key]||'',label:(p.C||'空词性')+' · '+(key==='E'?'英式':'美式'),assetId:p._audio?.[key]?.assetId||'',inlineData:p._audio?.[key]?.data||''}))),...model.words.filter(w=>w.L).map(w=>({name:w.L,label:'语音指导',assetId:w._audio?.L?.assetId||'',inlineData:w._audio?.L?.data||''}))].filter(a=>a.name)},'*');
 return true;
}
window.addEventListener('message',event=>{
 if(event.source!==window.parent||window.parent===window||event.data?.entryId!==example?.id)return;
 const msg=event.data;
 if(msg.type==='vocabulary:audio-selected'&&materialAudioRequest?.requestId===msg.requestId&&!readOnly){
  const {target}=materialAudioRequest;materialAudioRequest=null;
  target.obj[target.key]=msg.item.name;target.obj._audio??={};target.obj._audio[target.key]={name:msg.item.name,assetId:msg.item.assetId,data:msg.item.data};
  changed();render();
 }
 if(msg.type==='vocabulary:audio-blob'){
  if(!msg.blob){toast('此素材仅有文件名记录，尚未载入音频文件');return}
  if(playingAudio)playingAudio.pause();if(materialPlaybackUrl)URL.revokeObjectURL(materialPlaybackUrl);
  materialPlaybackUrl=URL.createObjectURL(msg.blob);playingAudio=new Audio(materialPlaybackUrl);playingAudio.play().catch(()=>toast('音频无法播放'));
 }
});
window.addEventListener('pagehide',()=>{if(materialPlaybackUrl)URL.revokeObjectURL(materialPlaybackUrl)});
