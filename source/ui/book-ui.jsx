import Quill from 'quill';
window.TeachingQuill=Quill;
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ConfigProvider, Table, Pagination, Tag, Modal, Button, Drawer, Popover, Cascader, Select, Input} from 'antd';
import zhCN from 'antd/locale/zh_CN';
const theme={token:{colorPrimary:'#1677ff',colorError:'#dc4446',borderRadius:7,fontFamily:'-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif',fontSize:13},components:{Table:{headerBg:'#f3f7fc',headerColor:'#132b45',headerSplitColor:'#e8edf3',cellPaddingBlock:10,cellPaddingInline:8,cellPaddingBlockMD:10,cellPaddingInlineMD:8},Tag:{borderRadiusSM:100}}};
const wrap=child=><ConfigProvider locale={zhCN} theme={theme}>{child}</ConfigProvider>;
let tableRoot=null,modalRoot=null,paginationRoot=null;
const resourceReferenceRoots=new Set();
function disposeTable(){for(const root of resourceReferenceRoots)flushSync(()=>root.unmount());resourceReferenceRoots.clear();if(paginationRoot){flushSync(()=>paginationRoot.unmount());paginationRoot=null;}if(tableRoot){flushSync(()=>tableRoot.unmount());tableRoot=null}}
function renderTable(element,rows){
 disposeTable();tableRoot=createRoot(element);
 const types={'套题':'听力套题','单词表':'词汇表'},colors={'套题':'blue','单词表':'green','精听挖空':'purple'};
 const columns=[{title:'内容名称',key:'name',render:(_,row)=><div className="content-name-cell"><button type="button" className="content-drag-handle" draggable aria-label={`拖动排序${row.name}，也可按 Alt 加上下方向键`}>⠿</button><span className="content-name-text">{row.name}</span><Tag color={colors[row.kind]||'default'} bordered={false} style={{borderRadius:100,margin:0}}>{types[row.kind]||row.kind}</Tag></div>},{title:'操作',key:'actions',width:180,align:'right',render:(_,row)=><div className="content-row-actions"><Button type="link" size="small" data-open-content={row.id}>查看</Button><Button type="link" size="small" data-edit-content={row.id}>编辑</Button><Button type="link" size="small" danger data-delete-content={row.id}>解除引用</Button></div>}];
 flushSync(()=>tableRoot.render(wrap(<Table showHeader={false} onRow={row=>({'data-content-row':row.id})} rowKey="id" columns={columns} dataSource={rows} pagination={false} size="middle" locale={{emptyText:<span className="directory-content-empty">当前目录暂无内容，请通过上方按钮新增。</span>}}/>)));
}
function ReferenceDrawer({rows,label,subject,onNavigate,initialOpen=false,onClose,hierarchy=false,versions=[],drawerTitle,suiteContext=false}){
 const [open,setOpen]=React.useState(initialOpen);
 if(!rows.length&&!hierarchy)return <span className="muted">--</span>;
 const grouped=[];
 if(hierarchy){
  const groups=new Map();
  for(const row of rows){const key=JSON.stringify([row.suiteId||row.key,row.versionText||'版本未记录']);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
  for(const group of groups.values()){
   const suite=group.find(row=>row.type==='听力套题')||group[0];
   const consumers=group.filter(row=>row.type!=='听力套题');
   const entries=consumers.length?consumers:[{...suite,_noConsumer:true}];
   entries.forEach((row,index)=>grouped.push({...row,_suite:suite,_span:index===0?entries.length:0}));
  }
 }
 const navigate=row=>{setOpen(false);onNavigate?.(row);onClose?.()};
 const relationColumns=[
  {title:'听力套题',key:'suite',width:240,onCell:row=>({rowSpan:row._span}),render:(_,row)=><><button className="linkbtn" style={{textAlign:'left',whiteSpace:'normal'}} disabled={!onNavigate} onClick={()=>navigate({suiteId:row._suite.suiteId})}>{row._suite.suiteName||row._suite.name}</button><div className="muted">套题 ID：{row._suite.suiteId}</div></>},
  {title:'引用书籍',key:'consumer',width:240,render:(_,row)=>row._noConsumer?<span className="muted">该版本暂无书籍引用</span>:<><button className="linkbtn" disabled={!onNavigate} style={{textAlign:'left',whiteSpace:'normal'}} onClick={()=>navigate(row)}>{row.name||row.bookName}</button>{row.bookId&&<div className="muted">书籍 ID：{window.referenceBookBusinessId?.(row.bookId)||row.bookId}</div>}</>},
  {title:'书籍阶段',key:'stage',width:100,render:(_,row)=>row._noConsumer?'—':row.stage||'当前引用'}
 ];
 const columns=[
  {title:'引用类型',key:'type',width:100,render:(_,row)=>row.type||'书籍'},
  {title:suiteContext?'引用书籍':'名称',key:'name',width:220,render:(_,row)=><>{onNavigate?<button className="linkbtn" style={{textAlign:'left',whiteSpace:'normal'}} onClick={()=>{setOpen(false);onNavigate(row);onClose?.()}}>{row.name||row.bookName||'—'}</button>:row.name||row.bookName||'—'}{row.bookId&&<div className="muted">书籍 ID：{window.referenceBookBusinessId?.(row.bookId)||row.bookId}</div>}</>},
  {title:'引用位置',key:'relation',width:180,render:(_,row)=><>{row.relation||'—'}{row.number?' · 第 '+row.number+' 题':''}</>},
  {title:suiteContext?'书籍阶段':'状态',key:'stage',width:90,render:(_,row)=>row.stage||'当前引用'},
  ...(!suiteContext?[{title:'使用版本',key:'version',width:130,render:(_,row)=>row.versionText||'版本未记录'}]:[])
 ];
 return <>{!initialOpen&&<button type="button" className="linkbtn bank-reference-button" aria-label="查看引用位置" aria-expanded={open} onClick={()=>setOpen(true)}>{label}</button>}<Drawer title={drawerTitle||"引用明细"} placement="right" width={800} open={open} onClose={()=>{setOpen(false);onClose?.()}} destroyOnHidden>{hierarchy?versions.map(version=><section className="reference-version-section" data-reference-version={version} key={version} style={{marginBottom:28}}><h3 style={{margin:'0 0 12px',fontSize:14}}>{version}</h3><Table className="reference-drawer-table" columns={relationColumns} dataSource={grouped.filter(row=>row.versionText===version).map((row,index)=>({...row,_rowKey:index}))} rowKey="_rowKey" pagination={false} size="middle" scroll={{x:580}} locale={{emptyText:'暂无引用'}} /></section>):<>{!suiteContext&&<p className="muted">{subject}</p>}<Table className="reference-drawer-table" columns={columns} dataSource={rows.map((row,index)=>({...row,_rowKey:index}))} rowKey="_rowKey" pagination={false} size="middle" scroll={{x:720}} /></>}</Drawer></>;

}
function BankReferences({usage,onNavigate,material}){
 const rows=material&&window.recordingReferenceRows?window.recordingReferenceRows(material.id,material.version||1):usage.map(u=>({...u,type:'书籍',name:u.bookName,relation:u.name}));
 const counts=[['书籍','本书'],['听力套题','套题'],['高考真题卷','份真题卷']].map(([type,unit])=>{const list=rows.filter(r=>r.type===type);const n=new Set(list.map(r=>r.bookId||r.paperId||r.suiteId||r.key)).size;return n?n+unit:null}).filter(Boolean).join(' · ');
 const allRows=material&&window.recordingReferenceRows?window.recordingReferenceRows(material.id):rows;
 const current='V'+(material?.version||1),available=material&&window.recordingReferenceVersions?window.recordingReferenceVersions(material.id):[];
 const versions=[current,...available.filter(v=>v!==current)];
 return <ReferenceDrawer drawerTitle={material?'录音稿'+material.id+' 引用明细':undefined} versions={versions} hierarchy={!!material} rows={allRows} label={counts||rows.length+'处引用'} subject={material?'录音稿 '+material.id+' · V'+(material.version||1):'引用位置'} onNavigate={material?window.navigateReferenceDrawer:onNavigate}/>;
}
function BankTranscriptPreview({material:m}){
 const transcript=window.displayTranscript(m);
 const [open,setOpen]=React.useState(false);
 React.useEffect(()=>{
  if(!open)return;
  const dismiss=event=>{if(event.key==='Escape')setOpen(false)};
  document.addEventListener('keydown',dismiss);
  return ()=>document.removeEventListener('keydown',dismiss);
 },[open]);
 return <Popover trigger={['hover','focus']} open={open} onOpenChange={setOpen} mouseEnterDelay={0.2} mouseLeaveDelay={0.2} placement="top" autoAdjustOverflow={true} content={<div className="bank-transcript-preview"><h3>录音稿</h3><div className="bank-transcript-full" dangerouslySetInnerHTML={{__html:window.displayTranscriptMarkup(m)}}/><h3>小题</h3><div className="bank-expanded-questions" id={`bank-questions-${m.id}`} data-bank-questions={m.id}>{m.questions.length?<table className="bank-subquestion-table"><tbody>{m.questions.map((q,i)=><tr key={q.id}><td>{i+1}</td><td><div className="bank-preview-question-heading"><span>{q.text}</span>{(q.points||[]).map(p=><Tag key={p} color="blue" bordered={false}>考点：{p}</Tag>)}</div><div className="bank-inline-options" data-bank-options={q.id}>{q.options?.map(o=>{const correct=q.answerKey?o.key===q.answerKey:o.text===q.answer||o.key===q.answer;return <span key={o.key} className={correct?'bank-correct-option':''} aria-label={correct?`正确答案 ${o.key} ${o.text}`:undefined}>{o.key}. {o.text}</span>})}</div></td></tr>)}</tbody></table>:<span className="muted">--</span>}</div></div>}><span className="bank-script-excerpt" tabIndex={0} aria-label="查看完整录音稿及小题" aria-expanded={open}>{transcript.replace(/^(W|M):\s*/gm,'$1：')}</span></Popover>;
}
function BankStatusPreview({material:m}){
 const [open,setOpen]=React.useState(false);
 React.useEffect(()=>{if(!open)return;const dismiss=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',dismiss);return()=>document.removeEventListener('keydown',dismiss)},[open]);
 const items=[['content','试题详情'],['clues','线索句'],['analysis','解析点拨'],['cloze','精听挖空']].map(([key,label])=>({key,label,status:m.sectionStatus?.[key]||'已完善'}));
 const dot=item=><span className={`bank-status-dot ${item.status==='待核对'?'needs-review':item.status==='待补充'?'needs-content':'is-complete'}`} aria-hidden="true"/>;
 return <Popover trigger={['hover','focus']} open={open} onOpenChange={setOpen} mouseEnterDelay={0.15} mouseLeaveDelay={0.15} placement="top" autoAdjustOverflow={true} content={<div className="bank-status-preview">{items.map(item=><div className="bank-status-preview-row" key={item.key}><span>{item.label}</span><span className="bank-status-preview-value">{dot(item)}{item.status}</span></div>)}</div>}><div className="bank-section-status" role="group" tabIndex={0} aria-expanded={open} aria-label={items.map(item=>`${item.label}：${item.status}`).join('；')}>{items.map(item=><React.Fragment key={item.key}>{dot(item)}</React.Fragment>)}</div></Popover>;
}
function BankTable({rows,actions}){
 const [expanded,setExpanded]=React.useState(actions.expanded||[]);
 const toggle=id=>{const next=expanded.includes(id)?expanded.filter(x=>x!==id):[...expanded,id];setExpanded(next);actions.onExpand?.(next)};
 const visibleRows=actions.picker?rows:rows.flatMap(row=>[row,...(expanded.includes(row.id)?row.historyVersions||[]:[])]);

 const filterProps=key=>({filters:(actions.filterOptions?.[key]||[]).map(value=>({text:value,value})),filteredValue:actions.filters?.[key]?[actions.filters[key]]:null,filterMultiple:false,filterSearch:key!=='questionType'});
 const columns=[
 {title:'录音稿 ID',dataIndex:'id',width:180,render:(id,row)=>{const latest=!!row.versionLabel?.endsWith('（最新）'),version=row.version||Number(row.versionLabel?.match(/·V(\d+)/)?.[1])||1;return <span className="bank-id">{!actions.picker&&<span className="bank-version-toggle-slot">{!row.isHistorical&&row.historyVersions?.length>0&&<button type="button" className="bank-version-toggle" aria-label={`${expanded.includes(id)?'折叠':'展开'}录音稿 ${id} 的历史版本`} aria-expanded={expanded.includes(id)} onClick={()=>toggle(id)}><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{transform:expanded.includes(id)?'rotate(90deg)':undefined}}><path d="m4 2 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button>}</span>}<span>{id}</span><span className={`bank-version-badge ${latest?'is-latest':''}`}>V{version}</span></span>}},
 {title:'录音稿',dataIndex:'text',render:(_,m)=><BankTranscriptPreview material={m}/>},
 {title:'题型',dataIndex:'questionType',width:100,...filterProps('questionType')},
 {title:'话题',key:'topics',width:135,...filterProps('topics'),render:(_,m)=><span className="bank-topic-text">{m.topics.length?m.topics.join('、'):'--'}</span>},
 {title:'状态',key:'progress',width:90,render:(_,m)=><BankStatusPreview material={m}/>},
 {title:'引用',key:'refs',width:160,render:(_,m)=><BankReferences usage={m.usage} material={m} onNavigate={actions.onReference}/>},
 {title:'操作',key:'actions',width:150,render:(_,m)=>actions.picker?<Button type="link" data-bank-pick={m.id} disabled={actions.excluded?.includes(m.id)} onClick={()=>actions.onPick(m.id)}>{actions.excluded?.includes(m.id)?'已引用':actions.selected?.includes(m.id)?'取消选择':'选择'}</Button>:<div className="bank-row-actions"><Button size="small" type="link" data-bank-view={m.id} onClick={()=>actions.onView(m)}>查看</Button><Button size="small" type="link" data-bank-edit={m.id} onClick={()=>actions.onEdit(m)}>编辑</Button><Button size="small" type="link" danger disabled={m.isHistorical||window.bankMaterialHasReferences?.(m.id)} data-bank-delete={m.id} onClick={()=>actions.onDelete(m)}>删除</Button></div>}

 ];
 return <Table rowSelection={actions.picker?{selectedRowKeys:actions.selected,preserveSelectedRowKeys:true,columnWidth:40,onChange:actions.onSelection,getCheckboxProps:row=>({disabled:actions.excluded?.includes(row.id)})}:undefined} tableLayout="fixed" onChange={(_,filters)=>actions.onFilter?.(filters)} rowKey={row=>actions.picker?row.id:row.id+'::V'+row.version} onRow={row=>({'data-recording-version':row.version,'data-history-version':row.isHistorical?'true':undefined})} columns={columns} dataSource={visibleRows} pagination={false} size="middle" scroll={{x:1050}} locale={{emptyText:'--'}}/>;
}
function renderGaokaoPapers(element,rows,actions){
 disposeTable();tableRoot=createRoot(element);
 const columns=[
 {title:'真题卷 ID',dataIndex:'id',width:160},
 {title:'年份',dataIndex:'year',width:120},
 {title:'试卷名称',dataIndex:'source'},
 {title:'引用',key:'usage',width:160,render:(_,p)=><ResourceReferences rows={window.resourceReferenceRows('papers',p.id)} onNavigate={window.navigateReferenceDrawer} context={{kind:'papers',id:p.id}}/>},
 {title:'操作',key:'actions',width:160,render:(_,p)=><div className="bank-row-actions"><Button type="link" onClick={()=>actions.onView(p)}>查看</Button><Button type="link" onClick={()=>actions.onEdit(p)}>编辑</Button><Button type="link" danger disabled={window.bankPaperHasReferences?.(p.id)} onClick={()=>actions.onDelete(p)}>删除</Button></div>}
 ];
 flushSync(()=>tableRoot.render(wrap(<Table rowKey="id" columns={columns} dataSource={rows} pagination={false} size="middle" locale={{emptyText:'--'}}/>)));
}
let bankSearchRoot=null;
function renderBankSearch(element,props){
 if(bankSearchRoot)flushSync(()=>bankSearchRoot.unmount());
 bankSearchRoot=createRoot(element);
 flushSync(()=>bankSearchRoot.render(wrap(<Input.Search id="bank-search" aria-label="搜索录音稿 ID、录音稿" placeholder="搜索录音稿 ID、录音稿" defaultValue={props.value} allowClear enterButton="搜索" onSearch={props.onSearch}/>)));
}
function renderBankPagination(element,props){
 if(paginationRoot)flushSync(()=>paginationRoot.unmount());paginationRoot=createRoot(element);
 flushSync(()=>paginationRoot.render(wrap(<><span className="bank-pagination-summary">{props.summary}</span><div className="bank-pagination-controls"><Select aria-label="每页条数" value={props.pageSize} options={[10,20,50].map(value=>({value,label:`${value} 条/页`}))} onChange={size=>props.onChange(1,size)} /><Pagination current={props.current} total={props.total} pageSize={props.pageSize} showSizeChanger={false} onChange={props.onChange} /></div></>)));
 element.querySelectorAll('[title]').forEach(el=>el.removeAttribute('title'));
}
function renderBankTable(element,rows,actions){
 disposeTable();tableRoot=createRoot(element);flushSync(()=>tableRoot.render(wrap(<BankTable rows={rows} actions={actions}/>)));
}
function BankReferencePicker({rows,excluded,onSelection}){
 const host=React.useRef(null);React.useLayoutEffect(()=>{host.current?.querySelectorAll('[title]').forEach(el=>el.removeAttribute('title'))});
 const [search,setSearch]=React.useState(''),[filters,setFilters]=React.useState({}),[selected,setSelected]=React.useState([]),[current,setCurrent]=React.useState(1),[size,setSize]=React.useState(10);
 const choose=ids=>{setSelected(ids);onSelection(ids)};
 const filtered=rows.filter(m=>(!search||[m.id,m.text].join(' ').toLowerCase().includes(search.toLowerCase()))&&(!filters.questionType||m.questionType===filters.questionType)&&(!filters.topics||m.topics.includes(filters.topics)));
 return <div ref={host}><div className="bank-searchbar"><Input.Search aria-label="搜索录音稿 ID、录音稿" placeholder="搜索录音稿 ID、录音稿" allowClear enterButton="搜索" onSearch={value=>{setSearch(value);setCurrent(1)}}/></div><div className="bank-question-table"><BankTable rows={filtered.slice((current-1)*size,current*size)} actions={{picker:true,excluded,selected,onSelection:choose,onPick:id=>choose(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]),filters,filterOptions:{questionType:[...new Set(rows.map(m=>m.questionType))].filter(Boolean),topics:[...new Set(rows.flatMap(m=>m.topics))]},onFilter:f=>{setFilters({questionType:f.questionType?.[0],topics:f.topics?.[0]});setCurrent(1)}}}/></div><div className="table-foot"><span>共 {filtered.length} 篇录音稿 · 已选 {selected.length} 篇</span><div className="bank-pagination-controls"><Select aria-label="每页条数" value={size} options={[10,20,50].map(value=>({value,label:`${value} 条/页`}))} onChange={value=>{setSize(value);setCurrent(1)}}/><Pagination current={current} total={filtered.length} pageSize={size} showSizeChanger={false} showTitle={false} onChange={setCurrent}/></div></div></div>;
}
function renderBankReferencePicker(element,props){const root=createRoot(element);flushSync(()=>root.render(wrap(<BankReferencePicker {...props}/>)));return ()=>flushSync(()=>root.unmount())}
function closeDialog(){if(modalRoot)flushSync(()=>modalRoot.render(null))}
function openDialog(title,body,footer){
 const view=window.confirmationDialogContent?.(title,body,footer)||{title,body,confirmation:false};title=view.title;body=view.body;
 document.getElementById('dialog')?.close();
 if(!modalRoot){const el=document.createElement('div');el.id='book-component-modal';document.body.append(el);modalRoot=createRoot(el)}
 // Existing actions bind to the rendered, escaped HTML after this synchronous commit.
 flushSync(()=>modalRoot.render(wrap(<Modal open title={title} className={view.confirmation?'confirmation-modal':undefined} closable={!view.confirmation} width={body.includes('suite-impact-list')?560:440} centered maskClosable={false} onCancel={closeDialog} footer={<div dangerouslySetInnerHTML={{__html:footer}}/>}>{body?<div className="dialog-body" dangerouslySetInnerHTML={{__html:body}}/>:null}</Modal>)));
 document.querySelectorAll('#book-component-modal [data-close],.ant-modal [data-close]').forEach(b=>b.onclick=closeDialog);
}
const hierarchyRoots=new Map();
function disposeHierarchies(container){for(const [host,root] of hierarchyRoots){if(!host.isConnected||container.contains(host)){root.observer?.disconnect();flushSync(()=>root.unmount());hierarchyRoots.delete(host);}}}
function renderHierarchy(host,{options,value,label,onChange}){
 const root=createRoot(host);hierarchyRoots.set(host,root);
 const container=host.closest('dialog')||host;
 const removeTitles=()=>container.querySelectorAll('[title]').forEach(el=>{if(host.contains(el)||el.closest('.ant-cascader-dropdown'))el.removeAttribute('title');});
 root.observer=new MutationObserver(removeTitles);root.observer.observe(container,{childList:true,subtree:true,attributes:true,attributeFilter:['title']});
 const tree=options.map(n=>({label:n.label,value:n.label,disabled:!!n.disabled,...(n.children.length?{children:n.children.map(c=>({label:c,value:c,disabled:!!n.disabledChildren?.includes(c)}))}:{})}));
 flushSync(()=>root.render(wrap(<Cascader options={tree} defaultValue={value} changeOnSelect allowClear placeholder={'请选择'+label} aria-label={label} expandTrigger="click" getPopupContainer={node=>node.closest('dialog')||document.body} onChange={path=>onChange(path||[])} style={{width:'100%'}}/>)));
}
window.BookUI={renderBankReferencePicker,renderSuiteTable,renderDirectoryContentTable,renderResourceReferences,renderGaokaoPapers,renderBankSearch,renderBankPagination,renderHierarchy,disposeHierarchies,renderBankTable,renderTable,disposeTable,openDialog,closeDialog};

// Keep existing form bindings while presenting one consistent select component.
const nativeSelectRoots=new Map();
function StyledNativeSelect({select}){
 const [revision,refresh]=React.useReducer(n=>n+1,0);
 React.useEffect(()=>{const update=()=>refresh();select.addEventListener('change',update);const observer=new MutationObserver(update);observer.observe(select,{attributes:true,childList:true,subtree:true});return()=>{select.removeEventListener('change',update);observer.disconnect()};},[select]);
 const placeholder=[...select.options].find(o=>!o.value&&/请选择|请先选择/.test(o.text));
 const options=[...select.options].filter(o=>o!==placeholder).map(o=>({value:o.value,label:o.text,disabled:o.disabled,title:''}));
 return <Select labelRender={select.classList.contains('lc-speaker')?({value})=><span className={'lc-speaker-badge '+String(value).toLowerCase()}>{value}</span>:undefined} aria-label={select.getAttribute('aria-label')||undefined} aria-required={select.getAttribute('aria-required')||undefined} value={placeholder&&!select.value?undefined:select.value} placeholder={placeholder?.text} disabled={select.disabled} options={options} getPopupContainer={node=>node.closest('dialog')||document.body} onChange={value=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));refresh()}} style={{width:'100%'}}/>;
}
let selectSyncPending=false;
function syncNativeSelects(){
 selectSyncPending=false;
 for(const [select,{host,root}] of nativeSelectRoots){if(!select.isConnected){root.unmount();host.remove();nativeSelectRoots.delete(select);}}
 document.querySelectorAll('select').forEach(select=>{
  if(nativeSelectRoots.has(select)||select.multiple||select.closest('.lc-hierarchy-compact,.ql-toolbar,.ql-container'))return;
  const host=document.createElement('span');host.className='styled-select-host';select.after(host);select.classList.add('styled-select-native');
  const root=createRoot(host);nativeSelectRoots.set(select,{host,root});root.render(wrap(<StyledNativeSelect select={select}/>));
 });
 document.querySelectorAll('.styled-select-host [title],.ant-select-dropdown [title]').forEach(el=>el.removeAttribute('title'));
}
const nativeSelectObserver=new MutationObserver(()=>{if(!selectSyncPending){selectSyncPending=true;queueMicrotask(syncNativeSelects);}});
nativeSelectObserver.observe(document.body,{childList:true,subtree:true});syncNativeSelects();

window.BookUI.disposeSelects=()=>{nativeSelectObserver.disconnect();for(const {root} of nativeSelectRoots.values())flushSync(()=>root.unmount());nativeSelectRoots.clear();};

function ResourceReferences({rows,onNavigate,context}){
 const expanded=window.resourceDrawerRows?window.resourceDrawerRows(rows,context):rows;
 const labels=[['bookId','本书'],['paperId','份真题卷'],['materialId','篇录音稿'],['packageId','个资源包']].map(([key,unit])=>{const n=new Set(rows.filter(r=>r[key]&&(key!=='packageId'||!r.bookId)).map(r=>r[key])).size;return n?n+unit:null}).filter(Boolean).join(' · ');
 return <ReferenceDrawer suiteContext={context?.kind==='suites'} drawerTitle={context?.kind==='suites'?'听力套题'+context.id+' 引用明细':undefined} rows={expanded} label={labels||rows.length+'处引用'} subject={context?'内容 ID：'+context.id:'引用位置'} onNavigate={onNavigate}/>;
}
function renderResourceReferences(element,rows,onNavigate,context){const root=createRoot(element);resourceReferenceRoots.add(root);flushSync(()=>root.render(wrap(<ResourceReferences rows={rows} onNavigate={onNavigate} context={context}/>)))}

function DirectoryCategoryIcon({type}){
 const paths={词汇表:<path d="M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 14h14M8 13l3-7 3 7M9 11h4"/>,听力套题:<><path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/></>,听力练习:<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/>,高考真题卷:<><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7m-7 4h7"/></>};
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0,color:({词汇表:'#389e0d',听力套题:'#1677ff',听力练习:'#722ed1',高考真题卷:'#08979c'})[type]}}>{paths[type]||paths.高考真题卷}</svg>
}
function renderDirectoryContentTable(element,rows){
 disposeTable();tableRoot=createRoot(element);
 const categoryWidth=Math.max(220,...rows.map(row=>82+row.type.length*12+String(row.contentId).length*8));
 const columns=[{title:'名称',dataIndex:'name',render:(name,row)=><span className="directory-row-name" style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><button className="directory-sort-handle" draggable="true" aria-label="拖动调整内容顺序，也可用上下方向键调整"><svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">{[4,8,12].flatMap(y=>[4,8].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r="1"/>))}</svg></button><DirectoryCategoryIcon type={row.type}/><span style={{overflowWrap:'anywhere',minWidth:0}}>{name}</span></span>},{title:'分类与编号',key:'classification',width:categoryWidth,render:(_,row)=><Tag className="directory-category-tag" bordered={false} style={{display:'inline-flex',alignItems:'center',gap:6,borderRadius:100,margin:0,padding:'2px 10px',fontSize:13,lineHeight:'20px',fontWeight:400,whiteSpace:'nowrap'}}><span>{row.type}（ID：{row.contentId}）</span></Tag>},{title:'操作',key:'actions',width:190,render:(_,row)=><div className="bank-row-actions directory-content-actions"><Button type="link" size="small" style={{fontSize:13}} data-resource-action="view" data-value={row.key}>查看</Button><Button type="link" size="small" style={{fontSize:13}} data-resource-action="edit" data-value={row.key}>编辑</Button><Button type="link" size="small" style={{fontSize:13}} danger data-resource-action="delete-row" data-value={row.key}>解除引用</Button></div>}];
 flushSync(()=>tableRoot.render(wrap(<Table columns={columns} dataSource={rows} rowKey="key" pagination={false} size="middle" tableLayout="fixed" scroll={{x:categoryWidth+370}} locale={{emptyText:'--'}}/>)));
}

function renderSuiteTable(element,rows,onDelete,onView,onEdit){
 disposeTable();tableRoot=createRoot(element);
 const columns=[{title:'顺序',key:'order',width:80,render:(_,m,index)=><span style={{display:'flex',alignItems:'center',gap:10}}><button className="directory-sort-handle" draggable aria-label="拖动调整录音稿顺序，也可使用上下方向键"><svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">{[4,8,12].flatMap(y=>[4,8].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r="1"/>))}</svg></button>{index+1}</span>},{title:'录音稿 ID',dataIndex:'id',width:110},{title:'录音稿',key:'text',render:(_,m)=><BankTranscriptPreview material={m}/>},{title:'题型',dataIndex:'questionType',width:100},{title:'话题',key:'topics',width:135,render:(_,m)=><span className="bank-topic-text">{m.topics.length?m.topics.join('、'):'--'}</span>},{title:'操作',key:'actions',width:230,render:(_,m)=><div className="bank-row-actions"><Button type="link" size="small" onClick={()=>onView(m.id)}>查看</Button><Button type="link" size="small" onClick={()=>onEdit(m.id)}>修改听力题库</Button><Button type="link" danger size="small" onClick={()=>onDelete(m.id)}>解除引用</Button></div>}];
 flushSync(()=>tableRoot.render(wrap(<Table columns={columns} dataSource={rows} rowKey="id" pagination={false} size="middle" tableLayout="fixed" locale={{emptyText:'--'}}/>)));
}
function VocabularyAddPicker({options,onChange,disabled}){
 const [open,setOpen]=React.useState(false),[query,setQuery]=React.useState('');
 const popup=React.useRef(null);
 React.useEffect(()=>{if(!open||!popup.current)return;const clean=()=>popup.current?.querySelectorAll('[title]').forEach(el=>el.removeAttribute('title'));clean();const observer=new MutationObserver(clean);observer.observe(popup.current,{childList:true,subtree:true,attributes:true,attributeFilter:['title']});return()=>observer.disconnect()},[open]);
 const paths=React.useMemo(()=>options.flatMap(word=>(word.children||[]).flatMap(pos=>(pos.children||[]).map(meaning=>[word,pos,meaning]))),[options]);
 const search=query.trim().toLowerCase();
 const matches=search?paths.filter(path=>path.some(n=>String(n.label).toLowerCase().includes(search))).slice(0,50):[];
 return <Popover trigger="click" open={open} onOpenChange={value=>{setOpen(value);if(!value)setQuery('')}} placement="bottomRight" content={<div className="an-vocab-add-popup" ref={popup}><Input aria-label="搜索词条" placeholder="搜索单词、词性或释义" value={query} onChange={e=>setQuery(e.target.value)}/><div className="an-vocab-search-results">{!search?<p className="muted">输入关键词搜索词条</p>:matches.length?matches.map(path=><button type="button" className="an-vocab-search-result" key={path.map(n=>n.value).join('/')} onClick={()=>{setOpen(false);setQuery('');onChange(path.map(n=>n.value))}}>{path.map(n=>n.label).filter(label=>label&&label!=='--').join(' / ')}</button>):<p className="muted">未找到匹配词条</p>}</div></div>}><button type="button" className="linkbtn" disabled={disabled} aria-expanded={open}>＋ 词条</button></Popover>;
}
function renderLinkedCascader(host,{options,value,label,onChange,disabled=false}){
 const vocabulary=host.id==='an-vocab-cascade'||host.hasAttribute('data-vocab-picker');
 const pathLabel=labels=>labels.map((text,i)=><React.Fragment key={i}>{i>0&&<span className="an-vocab-separator"> / </span>}{text}</React.Fragment>);
 const root=createRoot(host);hierarchyRoots.set(host,root);
 const container=host.closest('dialog')||host;
 const clean=()=>container.querySelectorAll('[title]').forEach(el=>{if(host.contains(el)||el.closest('.ant-cascader-dropdown'))el.removeAttribute('title')});
 root.observer=new MutationObserver(clean);root.observer.observe(container,{childList:true,subtree:true,attributes:true,attributeFilter:['title']});
 if(host.hasAttribute('data-note-category-picker')){flushSync(()=>root.render(wrap(<Cascader options={options} value={value} disabled={disabled} allowClear={false} getPopupContainer={()=>host} onChange={path=>onChange(path||[])}><button type="button" className="lc-note-category" data-edit-note-category disabled={disabled} aria-label="选择解析分类">{host.dataset.categoryLabel}</button></Cascader>)));return;}
 if(host.hasAttribute('data-vocab-add')){flushSync(()=>root.render(wrap(<VocabularyAddPicker options={options} onChange={onChange} disabled={disabled}/>)));return;}
 flushSync(()=>root.render(wrap(<Cascader popupClassName={host.id==='an-category-cascade'?'an-category-dropdown':undefined} options={options} value={value} disabled={disabled} allowClear displayRender={vocabulary?pathLabel:undefined} showSearch={{render:vocabulary?(_,path)=>pathLabel(path.map(n=>n.label)):undefined,filter:(input,path)=>path.some(n=>String(n.label).toLowerCase().includes(input.toLowerCase())),limit:50}} placeholder={'请选择'+label} aria-label={label} getPopupContainer={node=>node.closest('dialog')||document.body} onChange={path=>onChange(path||[])} style={{width:'100%'}}/>)));
}
window.BookUI.renderLinkedCascader=renderLinkedCascader;

window.BookUI.renderUploadButton=(host,{label,onClick})=>{
 const root=createRoot(host);hierarchyRoots.set(host,root);
 flushSync(()=>root.render(wrap(<Button onClick={onClick} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/></svg>}>{label}</Button>)));
};
function renderDirectoryMultiSelect(host,{options,value,onChange}){
 const root=createRoot(host);hierarchyRoots.set(host,root);
 function Picker(){const [selected,setSelected]=React.useState(value);return <Select mode="multiple" showSearch allowClear maxTagCount="responsive" aria-label="搜索并选择引用内容" placeholder="搜索名称或 ID，可多选" value={selected} options={options.map(o=>({...o,title:''}))} filterOption={(input,option)=>(option.label+' '+option.value).toLowerCase().includes(input.toLowerCase())} getPopupContainer={node=>node.closest('dialog')} onChange={values=>{setSelected(values);onChange(values)}} style={{width:'100%'}}/>}
 flushSync(()=>root.render(wrap(<Picker/>)));
}
window.BookUI.renderDirectoryMultiSelect=renderDirectoryMultiSelect;

function BookManuscriptStatus({items}){
 const [open,setOpen]=React.useState(false);
 React.useEffect(()=>{if(!open)return;const dismiss=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',dismiss);return()=>document.removeEventListener('keydown',dismiss)},[open]);
 const dot=item=><span className={'bank-status-dot '+item.tone} aria-hidden="true"/>;
 return <Popover trigger={['hover','focus']} open={open} onOpenChange={setOpen} placement="top" mouseEnterDelay={0.15} mouseLeaveDelay={0.15} content={<div className="bank-status-preview book-manuscript-preview">{items.map(item=><div className="bank-status-preview-row" key={item.label}><span>{item.label}</span><span className="bank-status-preview-value">{dot(item)}{item.status}</span></div>)}</div>}><span className="book-manuscript-dots" role="group" tabIndex={0} aria-expanded={open} aria-label={items.map(item=>item.label+'：'+item.status).join('，')}>{items.map(item=><React.Fragment key={item.label}>{dot(item)}</React.Fragment>)}</span></Popover>;
}
window.BookUI.renderBookProductsTable=(host,{rows,fields,filters,filterOptions,onChange,showSchoolGeneration,showManuscript=true})=>{
 const root=createRoot(host);hierarchyRoots.set(host,root);
 const filterProps=key=>({filters:(filterOptions[key]||[]).map(value=>({text:value,value})),filteredValue:filters[key]?.length?filters[key]:null,filterMultiple:true,filterSearch:false});
 const markup=html=><span dangerouslySetInnerHTML={{__html:html}}/>;
 const columns=[...fields.map(([key,title])=>({key,title,dataIndex:key,width:({bookId:88,version:80,grade:92,textbookVersion:100})[key],...(key==='bookId'?{onCell:()=>({style:{paddingLeft:20,paddingInlineStart:20}}),onHeaderCell:()=>({style:{paddingLeft:20,paddingInlineStart:20}})}:{}),...(key==='sourceBook'?{width:110,render:(_,row)=>row.sourceInfo?<Popover trigger={['hover','focus']} placement="top" content={<div className="book-source-popover"><strong>来源书籍 · {row.sourceInfo.id}</strong><dl>{row.sourceInfo.details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'--'}</dd></div>)}</dl></div>}><span tabIndex={0} className="book-source-id" aria-label={'查看来源书籍 '+row.sourceInfo.id+' 详细信息'}>{row.sourceInfo.id}</span></Popover>:'--'}:{}),...(filterOptions[key]?filterProps(key):{})})),...(!showManuscript?[{key:'sourcePublication',title:'来源发布状态',width:120,...filterProps('sourcePublication'),dataIndex:'sourcePublication'}]:[]),...(showManuscript?[{key:'manuscript',title:'编稿状态',width:88,render:(_,row)=><BookManuscriptStatus items={row.manuscript}/>}]:[]),{key:'publication',title:showManuscript?'发布状态':'校本发布状态',width:120,...filterProps('publication'),render:(_,row)=>markup(row.publicationHtml)},{key:'actions',title:'操作',width:showManuscript?112:200,render:(_,row)=>markup(row.actions)},...(showSchoolGeneration?[{key:'school',title:'校本书籍',width:88,render:(_,row)=>markup(row.school)}]:[])];
 const clean=()=>host.querySelectorAll('[title]').forEach(el=>el.removeAttribute('title'));
 root.observer=new MutationObserver(clean);root.observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['title']});
 flushSync(()=>root.render(wrap(<Table className="book-products-table" tableLayout="fixed" rowKey="id" columns={columns} dataSource={rows} pagination={false} size="middle" onChange={(_,next)=>onChange(Object.fromEntries(Object.entries(next).map(([key,value])=>[key,value||[]])))} locale={{emptyText:'没有符合筛选条件的书籍，请调整表头筛选。'}}/>)));clean();
};

// Shared status dots/popover for vocabulary sections.
window.BookUI.renderVocabularyStatus=(host,items)=>{
 const root=createRoot(host);hierarchyRoots.set(host,root);
 flushSync(()=>root.render(wrap(<BookManuscriptStatus items={items}/>)));
};

// Reuse Ant Design table header filters for resource lists.
window.BookUI.renderFilteredResourceTable=(host,{headers,rows,filterIndex,options,value,onFilter})=>{
 const root=createRoot(host);hierarchyRoots.set(host,root);
 const columns=headers.map((title,index)=>({title,key:String(index),dataIndex:String(index),render:html=><span dangerouslySetInnerHTML={{__html:html}}/>,...(index===filterIndex?{filters:options.map(item=>({text:item,value:item})),filterMultiple:false,filteredValue:value?[value]:null}: {})}));
 const clean=()=>host.querySelectorAll('[title]').forEach(el=>el.removeAttribute('title'));
 root.observer=new MutationObserver(clean);root.observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['title']});
 flushSync(()=>root.render(wrap(<Table rowKey="key" columns={columns} dataSource={rows.map((cells,key)=>({key,...Object.fromEntries(cells.map((cell,index)=>[String(index),cell]))}))} pagination={false} size="middle" onChange={(_,filters)=>onFilter(filters[String(filterIndex)]?.[0]||'')} locale={{emptyText:'暂无符合条件的内容'}}/>)));clean();
};

window.BookUI.openReferenceDrawer=({rows,subject,onNavigate})=>{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);const close=()=>setTimeout(()=>{root.unmount();host.remove()},0);flushSync(()=>root.render(wrap(<ReferenceDrawer rows={rows} subject={subject} onNavigate={onNavigate} initialOpen onClose={close}/>)))};
