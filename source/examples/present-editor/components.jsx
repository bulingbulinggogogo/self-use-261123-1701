import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button,ConfigProvider,Dropdown,Select,AutoComplete} from 'antd';
import {PlusOutlined,CloseOutlined,HolderOutlined,SwapOutlined} from '@ant-design/icons';
import Sortable from 'sortablejs';
const roots=[],sortables=[];
const theme={token:{colorPrimary:'#2463ed',fontSize:13,borderRadius:6,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif'}};
function MenuButton({items,onSelect,label,number,frequency,grouped,mode,onModeChange,menuClass=''}){
 const [open,setOpen]=React.useState(false);
 const withAddIcon=list=>list.map(item=>item.children?{...item,children:withAddIcon(item.children)}:item.type==='divider'?item:{...item,icon:number===undefined?<PlusOutlined/>:item.icon});
 const menuItems=withAddIcon(items);
 if(!items.length)return null;
 return <Dropdown dropdownRender={mode===undefined?undefined:menu=><div className="meaning-menu-panel"><div className="meaning-mode-toggle"><Button icon={<SwapOutlined/>} className="meaning-mode-switch" onClick={()=>{setOpen(false);queueMicrotask(()=>onModeChange(mode==='chunk'?'meaning':'chunk'))}}>{mode==='chunk'?'切换为 中文释义模式':'切换为 释义词块模式'}</Button></div>{menu}</div>} trigger={['click']} open={open} onOpenChange={setOpen} menu={{items:menuItems,selectable:number!==undefined,selectedKeys:number!==undefined?[frequency]:[],onClick:({key})=>{setOpen(false);queueMicrotask(()=>onSelect(key))}}} overlayClassName={`present-options-menu${grouped?' grouped-options-menu':''} ${menuClass}`} placement="bottomLeft">
 <Button className={number!==undefined?`frequency-number ${frequency==='高'?'high':frequency==='低'?'low':'unset'}`:'unified-add'} aria-label={label} aria-expanded={open} icon={number!==undefined?undefined:<PlusOutlined/>}>{number}</Button>
 </Dropdown>;
}
function InlineSelect({label,value,options,onChange,onCancel}){
 return <Select autoFocus defaultOpen popupMatchSelectWidth={false} virtual={false} dropdownStyle={{minWidth:220,maxWidth:"calc(100vw - 32px)"}} style={{width:Math.min(320,Math.max(120,...options.map(o=>String(o.label).length*13+48)))}} defaultValue={value} options={options.map(o=>({...o,title:''}))} aria-label={label} popupClassName="present-select-menu" onChange={v=>queueMicrotask(()=>onChange(v))} onBlur={()=>queueMicrotask(onCancel)} onInputKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();queueMicrotask(onCancel)}}}/>;
}
function InlineMultiSelect({label,value,options,onInput,onCommit,onCancel,validate}){
 const initial=String(value||'').split(/\n/).map(v=>v.trim()).filter(Boolean);
 const [values,setValues]=React.useState(initial),[search,setSearch]=React.useState(''),[error,setError]=React.useState('');
 const valuesRef=React.useRef(initial),searchRef=React.useRef('');
 const update=next=>{const message=validate?.(next.join('\n'));if(message){setError(message);return false}setError('');const unique=[...new Set(next.map(v=>v.trim()).filter(Boolean))];valuesRef.current=unique;setValues(unique);onInput(unique.join('\n'));return true};
 const commit=()=>{if(searchRef.current.trim()&&!update([...valuesRef.current,searchRef.current]))return;searchRef.current='';queueMicrotask(onCommit)};
 return <div><Select mode="tags" autoFocus defaultOpen value={values} searchValue={search} onSearch={v=>{searchRef.current=v;setSearch(v)}} onChange={next=>{if(update(next)){searchRef.current='';setSearch('')}}} options={options.map(v=>({value:v,label:v,title:''}))} aria-label={label} placeholder="选择或输入" popupClassName="present-select-menu" popupMatchSelectWidth={false} virtual={false} style={{minWidth:240,maxWidth:420,width:'100%'}} onBlur={commit} onInputKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();queueMicrotask(onCancel)}else if(e.key==='Enter'&&searchRef.current.trim()){e.preventDefault();e.stopPropagation();if(update([...valuesRef.current,searchRef.current])){searchRef.current='';setSearch('')}}}}/>{error&&<div role="alert" style={{color:'#d4380d',fontSize:12}}>{error}</div>}</div>;
}
function InlineAutocomplete({label,value,placeholder,options,onInput,onCommit,onCancel}){
 return <AutoComplete autoFocus defaultOpen popupMatchSelectWidth={false} virtual={false} dropdownStyle={{minWidth:240,maxWidth:"calc(100vw - 32px)"}} placeholder={placeholder} defaultValue={value} aria-label={label} options={options.map(value=>({value,title:''}))} popupClassName="present-select-menu" filterOption={(input,option)=>option.value.includes(input)} onChange={onInput} onSelect={()=>queueMicrotask(onCommit)} onBlur={()=>queueMicrotask(onCommit)} onInputKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();queueMicrotask(onCancel)}else if(e.key==='Enter'){e.preventDefault();queueMicrotask(onCommit)}}}/>;
}
window.PresentUI={
 multiSelect(host,props){const root=createRoot(host);flushSync(()=>root.render(<ConfigProvider theme={theme}><InlineMultiSelect {...props}/></ConfigProvider>));return ()=>flushSync(()=>root.unmount())},
 autocomplete(host,props){const root=createRoot(host);flushSync(()=>root.render(<ConfigProvider theme={theme}><InlineAutocomplete {...props}/></ConfigProvider>));return ()=>flushSync(()=>root.unmount())},
 select(host,props){const root=createRoot(host);flushSync(()=>root.render(<ConfigProvider theme={theme}><InlineSelect {...props}/></ConfigProvider>));return ()=>flushSync(()=>root.unmount())},
 dispose(){for(const sortable of sortables)sortable.destroy();sortables.length=0;for(const root of roots)flushSync(()=>root.unmount());roots.length=0},
 mount(host,kind,props){const root=createRoot(host);roots.push(root);let child;
 if(kind==='menu')child=<MenuButton {...props}/>;
 if(kind==='remove')child=<Button type="text" size="small" className="remove-module" icon={props.trash?<img className="shared-delete-icon" src="../../assets/directory-icons/directory-trash.svg" alt=""/>:<CloseOutlined/>} aria-label={props.label} onClick={e=>{e.stopPropagation();queueMicrotask(props.onClick)}}/>;
 if(kind==='drag')child=<Button type="text" size="small" className="meaning-drag-handle" icon={<HolderOutlined/>} aria-label={props.label} data-drag-meaning={props.index}/>;
 if(kind==='add')child=<Button className="unified-add" icon={<PlusOutlined/>} aria-label={props.label} onClick={()=>queueMicrotask(props.onClick)}>{props.text}</Button>;
 flushSync(()=>root.render(<ConfigProvider theme={theme}>{child}</ConfigProvider>));
 },
 sortable(host,onEnd,options={}){sortables.push(new Sortable(host,{animation:160,handle:'.meaning-drag-handle',draggable:'.sense-section',ghostClass:'sort-ghost',chosenClass:'sort-chosen',...options,onEnd:event=>{if(event.oldDraggableIndex!==event.newDraggableIndex)onEnd(event.oldDraggableIndex,event.newDraggableIndex)}}))}
};
