
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
