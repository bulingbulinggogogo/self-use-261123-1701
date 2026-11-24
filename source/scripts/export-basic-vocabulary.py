#!/usr/bin/env python3
"""Export the current prototype; adaptations apply only to the snapshot."""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import base64, hashlib, json, mimetypes, re, shutil, zipfile
ROOT=Path(__file__).resolve().parents[1]
name='首页登录-基础词库-账号管理_'+datetime.now(ZoneInfo('Asia/Shanghai')).strftime('%y%m%d_%H%M')
OUT=ROOT/'exports'/name
if OUT.exists(): raise SystemExit('同一分钟已有快照，请下一分钟再运行，不覆盖旧包')
OUT.mkdir(parents=True)
manifest={}
def read(path,purpose):
 p=ROOT/path
 if not p.is_file(): raise RuntimeError('缺少依赖 '+str(path))
 manifest[str(path)]={'path':str(path),'purpose':purpose,'required':True,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 return p.read_text()
assets=['assets/images/login-manuscripts-wide.png','assets/images/victor-company-logo.png','assets/directory-icons/directory-trash.svg','assets/directory-icons/EditOutlined.svg']
uris={}
for a in assets:
 p=ROOT/a;raw=p.read_bytes();uris[a]='data:'+mimetypes.guess_type(a)[0]+';base64,'+base64.b64encode(raw).decode()
 manifest[a]={'path':a,'purpose':'登录背景/品牌标志/词条编辑共享操作图标','required':True,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def adapt(text):
 text=text.replace('localStorage','window.ExportStorage').replace("'teaching-recording-audio'","'prototype-export-audio-"+name+"'")
 for a,u in uris.items():text=text.replace('../../'+a,u).replace(a,u)
 return text
prelude='''<script>window.ExportStorage=(()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}})();</script>'''
scope='''
(()=>{
const allowed=new Set(['vocabulary','accounts']);
const hidden=document.createElement('div');hidden.hidden=true;hidden.inert=true;hidden.id='export-inactive-dependencies';document.body.append(hidden);
function prune(){const nav=document.querySelector('#sidebar .nav');if(!nav)return;
 for(const el of [...nav.children])if(!['vocabulary-nav-toggle','vocabulary-nav-pages','permissions-toggle','permissions-subnav'].includes(el.id))hidden.append(el);
 nav.querySelectorAll('[data-page]').forEach(el=>{if(!allowed.has(el.dataset.page))hidden.append(el)});
}
prune();new MutationObserver(prune).observe(document.querySelector('#sidebar .nav'),{childList:true,subtree:true});
for(const type of ['click','keydown'])document.addEventListener(type,e=>{if(type==='keydown'&&!['Enter',' '].includes(e.key))return;const el=e.target.closest('[data-page],[data-breadcrumb]');if(el&&!allowed.has(el.dataset.page||el.dataset.breadcrumb)){e.preventDefault();e.stopImmediatePropagation()}},true);
const originalRender=render;render=function(){if(!allowed.has(page))page='vocabulary';return originalRender()};
// Demo default account: allow all in-scope operations so reviewers can exercise the prototype.
const member=data.members.find(m=>m.name===demoLoginAccounts.baokeyu);if(member){member.personalPermissionOverrides={...personalOverrides(member)};for(const i of [0,1,2,3,6,7])member.personalPermissionOverrides['vocabulary:'+i]='allow'}
})();
'''
boot='''(()=>{const template=document.getElementById('app-bootstrap');window.AppStorage={initialText:'null',write:()=>Promise.resolve(),flush:()=>Promise.resolve(),pending:false};for(const source of template.content.querySelectorAll('script')){const script=document.createElement('script');script.textContent=source.textContent;document.body.append(script)}document.getElementById('app').inert=false;template.remove();window.EXPORT_READY=true})();'''
def inline_html(path,main=False):
 html=read(path,'原始入口及完整页面结构')
 base=Path(path).parent
 def css(m):
  rel=str(base/m.group(1));text=read(rel,'页面共享样式')
  # This background belongs only to the disabled listening creation module.
  text=re.sub(r'url\([^)]*assets/directory-content-cards\.png[^)]*\)','none',text)
  return '<style>'+adapt(text)+'</style>'
 html=re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>',css,html)
 def js(m):
  rel=str((base/m.group(1)))
  rel=str(Path(rel))
  if rel=='app-storage.js':
   read(rel,'原项目存储启动源码；运行副本替换为独立内存启动')
   text=boot
  else:text=read(rel,'词库/账号及原页面启动所需共享经典脚本')
  text=adapt(text)
  return '<script>'+text.replace('</script','<\\/script')+'</script>'
 html=re.sub(r'<script\s+src="([^"]+)"[^>]*>\s*</script>',js,html)
 html=adapt(html)
 html=html.replace('<head>','<head>'+prelude,1)
 if main:html=html.replace('</template>','<script>'+scope+'</script></template>',1)
 return html
# Resolve relative dependencies through the project root while keeping source paths canonical.
original_read=read
def read(path,purpose):return original_read(str((ROOT/path).resolve().relative_to(ROOT)),purpose)
editor=inline_html('examples/present-editor/index.html')
(OUT/'examples/present-editor').mkdir(parents=True)
(OUT/'examples/present-editor/index.html').write_text(editor)
(OUT/'index.html').write_text(inline_html('index.html',True))
# Explicit corresponding source whitelist, including JSX for rebuilding the two bundled UIs.
for src in ['ui/book-ui.jsx','examples/present-editor/components.jsx','package.json','package-lock.json']:
 if (ROOT/src).exists():read(src,'开发者重建已内嵌 UI bundle 的对应源码/依赖锁定')
for src in list(manifest):
 target=OUT/'source'/src;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/src,target)
(OUT/'source/export-scope.js').write_text(scope)
(OUT/'source/scripts').mkdir(exist_ok=True)
shutil.copyfile(__file__,OUT/'source/scripts/export-basic-vocabulary.py')
(OUT/'资源清单.json').write_text(json.dumps(list(manifest.values()),ensure_ascii=False,indent=2))
(OUT/'使用与开发说明.md').write_text('''# 首页、登录、基础词库、账号管理原型

解压后双击 index.html。无需安装 Node.js、Python 或启动服务。请保留 examples 文件夹，词条编辑弹窗使用其中的离线 HTML。

## 范围
- 保留原登录、首页（登录后基础词库）、左侧导航外壳、词库→基础词库、系统设置→账号管理。
- 其他模块导航已移除。账号管理（带部门）单独入口不保留；账号管理包含部门树、部门编辑及基础词库个人权限表。
- 基础词库包含单词、词块、词块用法、发布记录，以及对应查看、新增、编辑、音频选择、审核和导出交互。
- 本包是源项目当时的快照，后续维护原项目，不维护导出副本。

## 演示边界
点击二维码按原型方式以 baokeyu 登录，并非真实钉钉认证；二维码仍为项目当前演示码。默认演示账号在副本中获得基础词库全部操作权限，便于评审；可在账号管理更改并验证权限。
只使用项目内置数据，不包含浏览器个人记录、真实登录信息或用户已上传文件。演示数据在内存中修改，刷新后恢复初始状态。“自动登录”沿用原型勾选交互，不提供真实持久认证。
已有音频若仅有文件名而无二进制，不能播放真实录音；可以在原型内上传音频。外部音频对齐、服务端审核和真实发布均未接入。不包含其他模块历史素材。

## 开发
source/ 保存入口、直接依赖脚本、样式、资源及 React 组件源码。因原页面共享全局变量和启动逻辑，保留其必要共享脚本；这些文件不代表范围外模块开放。
运行用两份 HTML 已内嵌脚本、样式与必要图片；source 保留原始对应文件，重复是为同时满足免安装预览与开发交接。开发者重新构建 UI bundle 需要 Node.js 与 package.json 中的依赖，预览者不需要。
资源清单.json 列出逐文件白名单、用途及源文件哈希；文件校验.json 用于校验交付文件。不要将副本内存存储方式当作正式业务持久化方案。

## 验证
静态依赖与脚本检查、运行模拟与 HTTP 检查结果见 验证结果.md。HTTP 或 JSDOM 验证不代表已验证双击 file://。
''')
(OUT/'验证结果.md').write_text('静态打包完成。需按技能要求验证浏览器流程后更新此文件；不得将静态打包视为 file:// 已通过。\n')
checks={str(p.relative_to(OUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.rglob('*') if p.is_file()}
(OUT/'文件校验.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
archive=OUT.with_suffix('.zip')
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in OUT.rglob('*'):
  if p.is_file():z.write(p,Path(OUT.name)/p.relative_to(OUT))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(OUT)
print(archive)
