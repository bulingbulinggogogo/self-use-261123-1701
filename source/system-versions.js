'use strict';
const systemVersionClients=[{id:'teacher',name:'维克多教师端',url:'https://teacher.victorco.cn/'},{id:'crm',name:'CRM',url:'https://crm.victorco.cn/'},{id:'research',name:'教研后台'}];
const builtinSystemVersions=[
 {id:'VER-TEACHER-0.0.28',client:'teacher',number:'V0.0.28',content:'1. 全屏讲解：字号调整，共9档（已在一体机模拟测试教室远距离观看效果）\n2. 播放音频：播放进度条旁，加音频总时长（方便老师知道做题耗时）\n3. 部分功能体验优化',author:'鲍科羽',updatedAt:'2026-10-10'},
 {id:'VER-CRM-0.0.11',client:'crm',number:'V0.0.11',content:'1. 去分配学校：支持全选，进行批量操作；增加学段筛选',author:'鲍科羽',updatedAt:'2026-10-10'}
];
let systemVersionClient='teacher';
function versionNumberKey(number){return String(number).trim().replace(/^v/i,'').toLowerCase()}
function allSystemVersions(){const rows=[...(data.systemVersions||[])];for(const entry of builtinSystemVersions)if(!rows.some(row=>row.id===entry.id||(row.client===entry.client&&versionNumberKey(row.number)===versionNumberKey(entry.number))))rows.push({...entry});return rows.map(row=>builtinSystemVersions.some(entry=>entry.id===row.id||(entry.client===row.client&&versionNumberKey(entry.number)===versionNumberKey(row.number)))?{...row,author:'鲍科羽'}:row)}
function systemVersionRows(){return allSystemVersions().filter(row=>!systemVersionClient||(row.client||'unassigned')===systemVersionClient).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))}
function systemVersionTime(value){if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const date=new Date(value);if(Number.isNaN(date.getTime()))return '--';const pad=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`}
function createSystemVersion(number,content,author,rows,now=new Date(),client){
 if(!systemVersionClients.some(item=>item.id===client))throw Error('请选择所属端');
 number=String(number||'').trim();content=String(content||'').trim();
 if(!number)throw Error('请填写版本号');if(number.length>50)throw Error('版本号不能超过 50 个字符');
 if(!content)throw Error('请填写更新内容');if(content.length>10000)throw Error('更新内容不能超过 10000 个字符');
 if(rows.some(row=>row.client===client&&versionNumberKey(row.number)===versionNumberKey(number)))throw Error('该端的版本号已存在');
 return {id:'VER-'+crypto.randomUUID(),client,number,content,author,updatedAt:now.toISOString()};
}
function renderSystemVersions(){
 const rows=systemVersionRows(),clients=systemVersionClients.map(client=>[client.id,client.name]);
 if(allSystemVersions().some(row=>!row.client))clients.push(['unassigned','未分类']);
 $('#page').innerHTML=`<section class="page-head"><h1>系统版本</h1><button class="btn primary" id="add-system-version">${icon('plus')}新增版本</button></section><section class="panel"><div class="tabs" role="tablist" aria-label="所属端">${clients.map(([id,name])=>`<button type="button" class="tab ${systemVersionClient===id?'active':''}" role="tab" aria-selected="${systemVersionClient===id}" tabindex="${systemVersionClient===id?0:-1}" data-version-client="${id}">${esc(name)}</button>`).join('')}</div><div class="table-scroll"><table class="system-version-table"><thead><tr><th>版本号</th><th>更新内容</th><th>更新人</th><th>更新时间</th></tr></thead><tbody>${rows.length?rows.map(row=>{return `<tr><td>${esc(row.number)}</td><td class="version-content">${esc(row.content)}</td><td>${esc(row.author||'--')}</td><td>${esc(systemVersionTime(row.updatedAt))}</td></tr>`}).join(''):'<tr><td colspan="4" class="version-empty">--</td></tr>'}</tbody></table></div></section>`;
 $('#add-system-version').onclick=addSystemVersion;
 const tabs=Array.from(document.querySelectorAll('[data-version-client]'));
 function selectClient(id){systemVersionClient=id;renderSystemVersions();Array.from(document.querySelectorAll('[data-version-client]')).find(button=>button.dataset.versionClient===id)?.focus()}
 tabs.forEach((button,index)=>{button.onclick=()=>selectClient(button.dataset.versionClient);button.onkeydown=e=>{let next=index;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();selectClient(tabs[next].dataset.versionClient)}});
}
function addSystemVersion(){
 const current='teacher';
 openDialog('新增版本',`<form id="system-version-form"><label class="field"><span><span class="required-mark">*</span>所属端</span><select class="input" name="client" required>${opts(systemVersionClients.map(c=>[c.id,c.name]),current)}</select></label><label class="field"><span><span class="required-mark">*</span>版本号</span><input class="input" name="number" placeholder="例如：V0.0.29" maxlength="50" required></label><label class="field"><span><span class="required-mark">*</span>更新内容</span><textarea class="input version-content-input" name="content" placeholder="填写本次更新内容" maxlength="10000" required></textarea></label><p class="error" id="system-version-error" role="alert"></p></form>`, '<button class="btn" data-close>取消</button><button class="btn primary" type="submit" form="system-version-form">保存</button>');
 const form=$('#system-version-form');form.onsubmit=e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form));try{
 const author=$('#current-account').textContent.trim(),version=createSystemVersion(values.number,values.content,author,allSystemVersions(),new Date(),values.client);
 if(!commitWorkspace(next=>{next.systemVersions ||= [];next.systemVersions.unshift(version)})){$('#system-version-error').textContent='保存失败，填写内容已保留，请重试。';return}
 systemVersionClient=values.client;closeDialog();renderSystemVersions();toast('版本已新增');
 }catch(error){$('#system-version-error').textContent=error.message}};
 form.querySelector(current?'input':'select').focus();
}
