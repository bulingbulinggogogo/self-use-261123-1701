'use strict';
function bookCoverSource(book){
 if(Object.prototype.hasOwnProperty.call(book,'coverDataUrl'))return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(book.coverDataUrl)?book.coverDataUrl:'';
 return book.sourceBookId==='690'?'assets/book-covers/690.webp':'';
}
function bookCoverMarkup(book){const src=bookCoverSource(book);return src?`<img src="${esc(src)}" alt="${esc(bookValue(book,'name')||'书籍')}封面">`:`<div class="cover-placeholder">${icon('book')}<span>--</span></div>`}
const requiredBookFields=new Set(['bookId','name','version','productCategory','grade','textbookVersion']);
const gradeChoices=['通用','高一','高二','高三'];
const textbookChoices=['通用','新人教版','新外研版','新译林版','新北师大版'];
function requiredMark(key){return (requiredBookFields.has(key)||key==='recommendedGrades')?'<span class="required-mark" aria-hidden="true">*</span>':''}
function bookFieldLabel(key){return key==='recommendedGrades'?'推荐使用年级<br>（入学年份）':esc(bookFields.find(f=>f[0]===key)[1])}
function recommendedYears(value){return String(value||'').split(/[,，、;；\s]+/).filter(Boolean)}
function nextBookBusinessId(){return typeof nextBusinessId==='function'?nextBusinessId('books'):String(Math.max(0,...data.books.map(b=>Number(bookValue(b,'bookId'))||0))+1)}
function bookNumberStepper(name,value,label,required=false){return `<div class="book-number-stepper"><button type="button" data-number-step="-1" aria-label="${esc(label)}减1">−</button><input class="input summary-value-input" type="number" name="${name}" aria-label="${esc(label)}" value="${esc(value)}" min="1" max="9999" step="1" ${required?'required':''}><button type="button" data-number-step="1" aria-label="${esc(label)}加1">＋</button></div>`}
function recommendedYearRow(year){return `<div class="recommended-year-row">${bookNumberStepper('recommendedYear',year,'推荐使用年级',true)}<button class="linkbtn" type="button" data-remove-year aria-label="删除此推荐使用年级">删除</button></div>`}
function bookFieldControl(book,key,label){
 const value=bookValue(book,key)||'',required=requiredBookFields.has(key)?'required':'';
 if(key==='productCategory'&&(book.bookType||bookType)==='听力书籍')return '<input class="input summary-value-input immutable-book-id" name="productCategory" aria-label="产品分类，不可修改" value="高中听力" readonly required>';
 if(key==='bookId')return `<input class="input summary-value-input immutable-book-id" name="bookId" aria-label="书籍ID，不可修改" value="${esc(value||nextBookBusinessId())}" readonly required>`;
 if(key==='grade'||key==='textbookVersion'){const choices=key==='grade'?gradeChoices:textbookChoices;const aliases={'人教版':'新人教版','外研版':'新外研版','译林版':'新译林版','北师大版':'新北师大版'};const current=choices.includes(String(value))?String(value):key==='textbookVersion'&&aliases[value]?aliases[value]:'通用';return `<select class="input summary-value-input" name="${key}" aria-label="${esc(label)}" ${required}>${opts(choices.map(v=>[v,v]),current)}</select>`}
 if(key==='recommendedGrades')return `<div class="recommended-years" id="recommended-years"><div id="recommended-year-rows">${(value?recommendedYears(value):book.id?[]:[String(new Date().getFullYear())]).map(recommendedYearRow).join('')}</div><button class="linkbtn" type="button" id="add-recommended-year">+ 新增年级</button></div>`;
 if(key==='version')return bookNumberStepper('version',value||new Date().getFullYear(),'版本',true);
 return `<input class="input summary-value-input" name="${key}" aria-label="${esc(label)}" value="${esc(value)}" ${required} ${key==='version'?'type="number" min="1" max="9999" step="1"':'type="text" maxlength="150"'}>`;
}
function bindRecommendedYears(){const form=$('#workspace-form');if(!form)return;form.onclick=e=>{
 const step=e.target.closest('[data-number-step]');if(step){const input=step.closest('.book-number-stepper').querySelector('input');if(!input.value)input.value=String(new Date().getFullYear());if(Number(step.dataset.numberStep)>0)input.stepUp();else input.stepDown();input.dispatchEvent(new Event('input',{bubbles:true}));return}
 const remove=e.target.closest('[data-remove-year]');if(remove){remove.closest('.recommended-year-row').remove();return}
 if(e.target.closest('#add-recommended-year')){$('#recommended-year-rows').insertAdjacentHTML('beforeend',recommendedYearRow(new Date().getFullYear()));const inputs=form.querySelectorAll('[name="recommendedYear"]');inputs[inputs.length-1].focus()}
}}
function readBookForm(form){const entries=[...new FormData(form)],values=Object.fromEntries(entries);if(form.querySelector('#recommended-years'))values.recommendedGrades=entries.filter(([key])=>key==='recommendedYear').map(([,value])=>value.trim()).join(',');delete values.recommendedYear;return values}
function validateBookValues(values,book){
 values.availability=book?.id?bookState(book):'编写中';
 if((book?.bookType||values.bookType||bookType)==='听力书籍')values.productCategory='高中听力';
 if(book?.id)values.bookId=String(bookValue(book,'bookId'));
 for(const key of requiredBookFields)if(!String(values[key]||'').trim())return '请填写'+bookFields.find(f=>f[0]===key)[1];
 if(!/^\d+$/.test(values.version)||Number(values.version)<1||Number(values.version)>9999)return '版本请输入 1–9999 的整数';
 const years=recommendedYears(values.recommendedGrades);
 if(years.some(y=>!/^\d+$/.test(y)||Number(y)<1||Number(y)>9999))return '推荐使用年级请输入 1–9999 的整数';
 if(new Set(years.map(Number)).size!==years.length)return '推荐使用年级不能重复';
 if(!gradeChoices.includes(values.grade))return '请选择有效的年级分类';
 if(!textbookChoices.includes(values.textbookVersion))return '请选择有效的教材版本';
 return '';
}
function bookSummaryMarkup(book,editing=false){
 const fields=['bookId','shortName','version','productCategory','grade','textbookVersion','recommendedGrades','vkdbuy'];
 const input=(key,label)=>bookFieldControl(book,key,label);
 return `${editing?'<form id="workspace-form" class="book-summary-form">':''}<div class="book-summary ${editing?'is-editing':''}"><aside class="book-summary-cover"><div class="summary-cover-label">书籍封面</div><div class="book-cover-frame" ${editing?'id="cover-preview"':''}>${bookCoverMarkup(book)}</div>${editing?`<div class="summary-cover-actions"><label id="book-cover-change" class="btn" for="book-cover-upload">${bookCoverSource(book)?'更换封面':'上传封面'}</label><button type="button" class="linkbtn" id="remove-book-cover">移除</button></div><input id="book-cover-upload" type="file" accept="image/jpeg,image/png,image/webp" class="cover-file-input"><p id="cover-upload-error" class="error" role="alert"></p>`:''}<p class="summary-cover-hint">建议 600 × 800 像素（3:4）<br>支持 JPG、PNG、WebP<br>文件不超过 2 MB</p></aside><div class="book-summary-content"><div class="book-summary-heading"><div class="book-summary-title"><div class="summary-name-label">${editing?requiredMark('name'):''}书籍名称</div><div class="summary-title-slot">${editing?input('name','书籍名称'):`<span class="summary-read-value">${esc(bookValue(book,'name'))}</span>`}</div></div><div class="summary-action-slot">${editing?'<button type="button" class="btn" id="cancel-book-info">取消</button><button class="btn primary" type="submit" form="workspace-form" id="save-book-info">保存</button>':'<button class="btn primary" id="edit-book-info">修改信息</button>'}</div></div><dl class="book-summary-fields">${fields.map(key=>`<div class="${key==='bookId'?'book-id-field':''}"><dt>${editing?requiredMark(key):''}${bookFieldLabel(key)}</dt><dd>${editing?input(key,bookFields.find(f=>f[0]===key)[1]):`<span class="summary-read-value">${esc(bookValue(book,key)||'--')}</span>`}</dd></div>`).join('')}</dl></div></div>${editing?`<input type="hidden" name="bookType" value="${esc(book.bookType||bookType)}"><p class="error" id="book-error" role="alert"></p></form>`:''}`;
}
function renderBookInfo(book,target){
 target.innerHTML=bookSummaryMarkup(book);
 if(book.bookType==='校本书籍')target.insertAdjacentHTML('afterbegin','<p class="muted">来源书籍：'+esc(schoolBookSourceIds(book).map(id=>data.books.find(b=>b.id===id)?.name||'来源不存在').join('、')||'题库')+'</p>');
 if(typeof bookFlow==='function'&&bookFlow(book).stage==='已定稿'&&!bookWasPublished(book))$('#edit-book-info').remove();else $('#edit-book-info').onclick=()=>startInlineBookEdit(book,target);
 const img=target.querySelector('.book-cover-frame img');if(img)img.onerror=()=>{img.parentElement.innerHTML='<div class="cover-placeholder">封面加载失败，请重新上传</div>'};
}
function bookEditorBody(book){
 const editFields=keys=>keys.map(key=>{const f=bookFields.find(f=>f[0]===key);return `<div class="field ${key==='name'?'wide':''}"><span>${requiredMark(key)}${bookFieldLabel(key)}</span>${bookFieldControl(book,key,f[1])}</div>`}).join('');
 return `<form id="workspace-form"><div class="book-editor-layout"><aside class="book-cover-column"><h3>书籍封面</h3><div class="book-cover-frame" id="cover-preview">${bookCoverMarkup(book)}</div><label id="book-cover-change" class="btn cover-upload-label" for="book-cover-upload">${bookCoverSource(book)?'更换图片':'上传图片'}</label><input id="book-cover-upload" type="file" accept="image/jpeg,image/png,image/webp" class="cover-file-input"><button type="button" class="linkbtn" id="remove-book-cover">移除封面</button><p class="muted">JPG、PNG、WebP，最大 2 MB</p><p id="cover-upload-error" class="error" role="alert"></p></aside><div><section class="book-editor-group"><h3>书籍资料</h3><div class="form-grid">${editFields(['bookId','name','shortName','version'])}<div class="field"><span>状态</span>${bookStateBadge(book)}</div></div></section><section class="book-editor-group"><h3>分类与适用范围</h3><div class="form-grid">${selectField('书籍类型','bookType',['听力书籍','校本书籍','词汇书籍'],book.bookType||bookType)}${editFields(['productCategory','grade','textbookVersion','recommendedGrades'])}</div></section><section class="book-editor-group"><h3>关联编号</h3><div class="form-grid">${editFields(['vkdbuy'])}</div></section></div></div><p class="error" id="book-error" role="alert"></p></form>`;
}
function validateCoverFile(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('请选择 JPG、PNG 或 WebP 图片');if(!file.size)throw Error('图片文件为空');if(file.size>2*1024*1024)throw Error('图片超过 2 MB，请选择较小的图片')}
function setupBookCoverEditor(book){
 let draft=null,reading=false,request=0;
 const input=$('#book-cover-upload'),preview=$('#cover-preview'),error=$('#cover-upload-error'),submit=$('#save-book-info');
 function show(src){
 preview.innerHTML=src?`<img src="${esc(src)}" alt="待保存的书籍封面">`:`<div class="cover-placeholder">${icon('book')}<span>--</span><label class="btn cover-upload-label" for="book-cover-upload">上传封面</label></div>`;
 $('#remove-book-cover').hidden=!src;
 const change=$('#book-cover-change');if(change){change.hidden=!src;change.textContent='更换封面'}
 }
 show(bookCoverSource(book));
 function idle(){reading=false;submit.disabled=false}
 input.onchange=()=>{const file=input.files?.[0];if(!file)return;const token=++request;idle();error.textContent='';try{validateCoverFile(file)}catch(e){error.textContent=e.message;input.value='';return}
 reading=true;submit.disabled=true;
 const reader=new FileReader();reader.onerror=()=>{if(token!==request)return;idle();error.textContent='读取图片失败，请重新选择'};
 reader.onload=()=>{if(token!==request)return;const image=new Image();image.onload=()=>{if(token!==request)return;idle();draft={coverDataUrl:String(reader.result),coverFile:file.name};show(draft.coverDataUrl)};image.onerror=()=>{if(token!==request)return;idle();error.textContent='图片无法打开，请选择有效的图片文件'};image.src=String(reader.result)};
 reader.readAsDataURL(file);
 };
 $('#remove-book-cover').onclick=()=>{request++;idle();draft={coverDataUrl:'',coverFile:''};input.value='';error.textContent='';show('')};
 $('#dialog').addEventListener('close',()=>{request++},{once:true});
 const getDraft=()=>{if(reading)throw Error('图片正在读取，请稍后保存');return draft||{}};
 getDraft.dispose=()=>{request++};getDraft.pending=()=>reading;
 return getDraft;
}

let inlineBookEdit=null;
function inlineBookValues(form){return readBookForm(form)}
function inlineBookIsDirty(){
 if(!inlineBookEdit)return false;
 const edit=inlineBookEdit;
 if(edit.cover.pending())return true;
 const cover=edit.cover();
 return JSON.stringify(inlineBookValues(edit.form))!==edit.initial||Object.entries(cover).some(([key,value])=>value!==(key==='coverDataUrl'?edit.book.coverDataUrl:bookValue(edit.book,key)));
}
function finishInlineBookEdit(){if(inlineBookEdit)inlineBookEdit.cover.dispose();inlineBookEdit=null}
function guardBookInfoNavigation(){
 if(!inlineBookEdit)return true;
 if(inlineBookIsDirty()&&!window.confirm('书籍信息尚未保存，是否放弃修改并离开？')){
 const prior=inlineBookEdit.location;page=prior.page;activeBook=prior.activeBook;bookSection=prior.bookSection;bookType=prior.bookType;
 return false;
 }
 finishInlineBookEdit();return true;
}
function startInlineBookEdit(book,target){
 target.innerHTML=bookSummaryMarkup(book,true);
 const form=$('#workspace-form'),cover=setupBookCoverEditor(book);bindRecommendedYears();
 inlineBookEdit={book,form,cover,initial:JSON.stringify(inlineBookValues(form)),location:{page,activeBook,bookSection,bookType}};
 $('#cancel-book-info').onclick=()=>{if(inlineBookIsDirty()&&!window.confirm('是否放弃本次修改？'))return;finishInlineBookEdit();renderBookInfo(book,target)};
 form.onsubmit=e=>{e.preventDefault();const values=inlineBookValues(form);for(const key of Object.keys(values))values[key]=values[key].trim();
 const error=$('#book-error');error.textContent='';
 const validation=validateBookValues(values,book);if(validation){error.textContent=validation;return}
 if(data.books.some(b=>b.id!==book.id&&String(bookValue(b,'bookId'))===values.bookId)){error.textContent='书籍ID已存在';return}
 if(!bookStates.includes(values.availability)){error.textContent='请选择有效的书籍状态';return}
 try{Object.assign(values,cover())}catch(e){error.textContent=e.message;return}
 if(!commitWorkspace(d=>Object.assign(d.books.find(b=>b.id===book.id),values))){error.textContent='保存未成功，修改仍保留在当前页面，请重试。';return}
 finishInlineBookEdit();bookType=values.bookType;render();toast('书籍信息已保存');
 };
}
window.addEventListener('beforeunload',e=>{if(inlineBookIsDirty()){e.preventDefault();e.returnValue=''}});
const logoutBeforeInlineEdit=$('#logout').onclick;
$('#logout').onclick=()=>{const wasEditing=!!inlineBookEdit;if(guardBookInfoNavigation()){if(wasEditing)render();logoutBeforeInlineEdit()}};
