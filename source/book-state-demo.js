'use strict';
// Rebuild only the explicitly requested test fixtures once. Other books stay untouched.
if(data.bookCompleteDemoVersion!==2)commitWorkspace(state=>{
 state.books=state.books.filter(b=>!/^BK-STATE-DEMO-\d+$|^REVIEW-DEMO-\d+$/.test(b.id));
 for(const [id,q] of Object.entries(state.listeningBank.questions))if(/^(STATE-DEMO-M-|REVIEW-DEMO-\d+-M$)/.test(q.scriptId))delete state.listeningBank.questions[id];
 delete state.bookStateDemoVersion;delete state.bookReviewDemoVersion;
});
// One-time, isolated fixtures. A deleted demo book must not reappear on refresh.
function ensureBookStateDemos(){
 if(data.bookStateDemoVersion)return;
 commitWorkspace(state=>{
 const cases=[['编书中','编书中','none'],['解析编写中','解析编写中','none'],['终审中','审核中','none'],['已定稿待发布','已定稿','none'],['已发布基础版','解析编写中','live'],['已发布完整版','已定稿','live'],['已下架','已定稿','offline']];
 const at='2026-11-09T02:00:00.000Z';
 cases.forEach(([label,stage,publication],i)=>{
 const id='BK-STATE-DEMO-'+(i+1),mid='STATE-DEMO-M-'+i,qid='STATE-DEMO-Q-'+i,sid=nextBusinessId('suites',state),cid='STATE-DEMO-C-'+i,seg='STATE-DEMO-SEG-'+i;
 const material={id:mid,name:'测试录音稿 '+(i+1),text:'The library opens at nine.',questionType:'独白',category:'普通题',accent:'美音',audioName:'演示提示音（非朗读）.wav',audioUrl:'assets/book-state-demo.wav',segments:[{id:seg,speaker:'M',text:'The library opens at nine.',translation:'图书馆九点开门。',start:'00:00.000',end:'00:02.000'}],teachingNotes:[{id:'STATE-DEMO-N-'+i,category:'词汇',subcategory:'重难点词汇',text:'library',sourceKey:'segment:'+seg,sourceText:'The library opens at nine.',start:4,end:11,scope:'fragment',content:'library：图书馆',contentHtml:'<p>library：图书馆</p>',explanationEnabled:true}],noCloze:true};
 const question={id:qid,scriptId:mid,number:1,text:'When does the library open?',translation:'图书馆几点开门？',options:[{key:'A',text:'At eight.'},{key:'B',text:'At nine.'},{key:'C',text:'At ten.'}],answerKey:'B',answer:'B',analysisText:'录音明确提到 nine。',noDirectClue:true};
 const suite={id:sid,sourceId:'STATE-DEMO-S-'+i,name:'功能验证套题 '+(i+1),materialIds:[mid]};
 state.listeningBank.materials[mid]=material;state.listeningBank.questions[qid]=question;state.teachingLibrary.suites[sid]=suite;
 state.directoryContents[cid]={id:cid,items:[{kind:'suites',id:sid}],children:[]};
 const root={id:'STATE-DEMO-D-'+i,name:'第一单元（测试）',contentId:cid,visible:true};
 const f={stage,steps:['终审'],round:0,reviews:{},history:[],published:null};
 const book={id,bookId:nextBusinessId('books',state),name:'【测试】'+label,shortName:'状态验证',version:'2026',bookType:'听力书籍',productCategory:'高中听力',grade:'高一',textbookVersion:'通用',subject:'英语',availability:'编写中',sharedResources:true,directoryRoots:[root],directoryNodes:[],workflow:f,demo:true};
 if(stage!=='编书中')f.history.push({action:'完成编书',stage:'解析编写中',at,actor:'测试用户'});
 if(stage==='审核中'||stage==='已定稿')f.history.push({action:'提交审核',stage:'审核中',at,actor:'测试用户'});
 const snapshot={name:book.name,directoryNodes:[{...root,parentId:'',kind:'目录'}],suites:[structuredClone(suite)],materials:{[mid]:{...structuredClone(material),questions:[structuredClone(question)]}},withAnalysis:stage==='已定稿',at};
 if(!snapshot.withAnalysis){delete snapshot.materials[mid].teachingNotes;delete snapshot.materials[mid].noCloze;delete snapshot.materials[mid].questions[0].analysisText;delete snapshot.materials[mid].questions[0].noDirectClue}
 if(stage==='已定稿'){f.reviews[sid]={0:{passed:true,actors:['测试用户'],passedBy:'测试用户',at}};f.finalSnapshot=structuredClone(snapshot);f.history.push({action:'定稿',stage,at,actor:'测试用户'})}
 if(publication!=='none'){f.everPublished=true;f.publications=[{stage,at,actor:'测试用户'}];f.publishedBy='测试用户';f.history.push({action:'发布版本',stage,at,actor:'测试用户'});if(publication==='live')f.published=snapshot;else{f.lastPublished=snapshot;f.unpublishedAt=at;f.history.push({action:'下架书籍',stage,at,actor:'测试用户'})}}
 state.books.push(book);
 });state.bookStateDemoVersion=1;
 });
}
ensureBookStateDemos();

// Separate migration so existing local work and previously deleted fixtures stay untouched.
function ensureBookReviewDemos(){
 if(data.bookReviewDemoVersion)return;
 commitWorkspace(state=>{
 const steps=['一审','二审','终审'];
 steps.forEach((step,round)=>{
 const key='REVIEW-DEMO-'+(round+1),mid=key+'-M',qid=key+'-Q',sid=nextBusinessId('suites',state),cid=key+'-C';
 const material=structuredClone(state.listeningBank.materials['STATE-DEMO-M-1']||{text:'The library opens at nine.',questionType:'独白',category:'普通题',accent:'美音',audioName:'演示提示音（非朗读）.wav',audioUrl:'assets/book-state-demo.wav',segments:[{id:key+'-SEG',speaker:'M',text:'The library opens at nine.',translation:'图书馆九点开门。',start:'00:00.000',end:'00:02.000'}],teachingNotes:[{category:'词汇',subcategory:'重难点词汇',text:'library',sourceKey:'segment:'+key+'-SEG',sourceText:'The library opens at nine.',start:4,end:11,scope:'fragment',explanationEnabled:true}],noCloze:true});
 const question=structuredClone(state.listeningBank.questions['STATE-DEMO-Q-1']||{number:1,text:'When does the library open?',translation:'图书馆几点开门？',options:[{key:'A',text:'At eight.'},{key:'B',text:'At nine.'},{key:'C',text:'At ten.'}],answerKey:'B',answer:'B',analysisText:'录音明确提到 nine。',noDirectClue:true});
 material.id=mid;material.name=step+'修改记录示例';question.id=qid;question.scriptId=mid;
 const note=material.teachingNotes[0];note.id=key+'-NOTE';note.materialId=mid;
 const versions=['library：图书馆','library /ˈlaɪbrəri/，名词，意为“图书馆”。','library：图书馆。The library opens at nine. 图书馆九点开门。','library：图书馆。注意 opens at nine 表示“九点开门”，本题答案为 B。'];
 const actors=['编写员（演示）','一审员（演示）','二审员（演示）','终审员（演示）'];
 material.noteHistory=[];let before=null;
 for(let i=0;i<=round+1;i++){
 const after={...structuredClone(note),content:versions[i],contentHtml:'<p>'+versions[i]+'</p>'};
 material.noteHistory.push({id:key+'-H-'+i,noteId:note.id,actor:actors[i],at:`2026-11-0${5+i}T02:00:00.000Z`,before:structuredClone(before),after:structuredClone(after)});before=after;
 }
 material.teachingNotes=[before];
 state.listeningBank.materials[mid]=material;state.listeningBank.questions[qid]=question;
 state.teachingLibrary.suites[sid]={id:sid,sourceId:key+'-S',name:step+'示例套题',materialIds:[mid]};
 state.directoryContents[cid]={id:cid,items:[{kind:'suites',id:sid}],children:[]};
 const history=[{action:'完成编书',stage:'解析编写中',actor:actors[0],at:'2026-11-05T01:00:00.000Z'},{action:'配置审核步骤',stage:'解析编写中',actor:actors[0],at:'2026-11-05T02:10:00.000Z'},{action:'提交审核',stage:'审核中',round:'一审',actor:actors[0],at:'2026-11-05T03:00:00.000Z'}];
 const reviews={};
 for(let i=0;i<=round;i++){
 const at=`2026-11-0${6+i}T02:00:00.000Z`;
 reviews[i]={passed:i<round,actors:[actors[i+1]],at,...(i<round?{passedBy:actors[i+1]}:{})};
 history.push({action:steps[i]+'修订解析 · 套题 '+sid,stage:'审核中',round:steps[i],actor:actors[i+1],at});
 if(i<round)history.push({action:steps[i]+'通过 · 套题 '+sid,stage:'审核中',round:steps[i],actor:actors[i+1],at},{action:'进入'+steps[i+1],stage:'审核中',round:steps[i+1],actor:actors[i+1],at});
 }
 state.books.push({id:key,bookId:nextBusinessId('books',state),name:'【测试】'+step+'中 · 修改记录',shortName:'审核记录演示',version:'2026',bookType:'听力书籍',productCategory:'高中听力',grade:'高一',textbookVersion:'通用',subject:'英语',availability:'编写中',sharedResources:true,directoryRoots:[{id:key+'-D',name:'修改记录示例',contentId:cid,visible:true}],directoryNodes:[],workflow:{stage:'审核中',steps:[...steps],round,reviews:{[sid]:reviews},history,published:null},demo:true});
 });
 state.bookReviewDemoVersion=1;
 });
}
ensureBookReviewDemos();

function completeBookDemoData(){
 if(data.bookCompleteDemoVersion===2)return;
 commitWorkspace(state=>{
 state.vocabularyEdits ||= {};for(const kind of ['words','positions','meanings'])state.vocabularyEdits[kind] ||= {};
 state.vocabularyEdits.words['BOOK-DEMO-LIBRARY']={id:'BOOK-DEMO-LIBRARY',word:'library'};
 state.vocabularyEdits.positions['BOOK-DEMO-LIBRARY-N']={id:'BOOK-DEMO-LIBRARY-N',wordId:'BOOK-DEMO-LIBRARY',word:'library',label:'n.',ukIPA:'/ˈlaɪbrəri/',usIPA:'/ˈlaɪbreri/'};
 state.vocabularyEdits.meanings['BOOK-DEMO-LIBRARY-M']={id:'BOOK-DEMO-LIBRARY-M',wordId:'BOOK-DEMO-LIBRARY',posId:'BOOK-DEMO-LIBRARY-N',word:'library',posLabel:'n.',chinese:'图书馆',english:'a place where books are kept for reading or borrowing'};
 const parsed=parseListeningPaste(listeningDemo.raw);
 const translations=[['女士要去哪里？','去图书馆。','去教室。','去科学博物馆。'],['女士为什么去那里？','去借几本书。','去完成一个项目。','去上一节科学课。']];
 for(const book of state.books.filter(b=>/^BK-STATE-DEMO-\d+$|^REVIEW-DEMO-\d+$/.test(b.id))){
 const suite=state.teachingLibrary.suites[state.directoryContents[book.directoryRoots[0].contentId].items[0].id],mid=suite.materialIds[0],m=state.listeningBank.materials[mid];
 const oldQuestions=Object.values(state.listeningBank.questions).filter(q=>q.scriptId===mid);oldQuestions.forEach(q=>delete state.listeningBank.questions[q.id]);
 const segments=listeningDemo.segments.map((seg,i)=>({...structuredClone(seg),id:mid+'-SEG-'+i,start:i?listeningDemo.segments[i-1].end:'00:00.000',translationNeedsReview:false}));
 Object.assign(m,{text:parsed.text,questionType:'长对话',topics:['学校生活'],topicSecondary:listeningSecondaryValue('topics','学校生活',''),audioName:'library-dialogue-clean.aac',audioUrl:'assets/book-demo-dialogue.aac',builtinAudio:false,segments,duration:11.35,aligned:true,workflowStage:5,noCloze:true,clozeReview:[]});
 const questions=parsed.questions.map((q,i)=>({...q,id:oldQuestions[0].id+(i?'-2':''),scriptId:mid,number:i+1,questionType:'长对话',examPoints:[q.examPoints],abilities:['能力'+(i+1)],translation:translations[i][0],translationNeedsReview:false,options:q.options.map((o,j)=>({...o,translation:translations[i][j+1]})),answer:q.options.find(o=>o.key===q.answerKey).text,noDirectClue:false,clueNeedsReview:false,clues:[{segmentId:segments[i?3:1].id,start:0,end:segments[i?3:1].text.length,text:segments[i?3:1].text}]}));
 questions.forEach(q=>state.listeningBank.questions[q.id]=q);
 const source=segments[1],start=source.text.indexOf('library');
 segments[1].clozeBlanks=[{id:mid+'-BLANK',start,end:start+7,text:'library',sourceText:source.text}];m.noCloze=false;
 const repairNote=n=>{if(!n)return n;return {...n,sourceKey:'segment:'+source.id,sourceText:source.text,start,end:start+7,text:'library',materialId:mid,wordId:'BOOK-DEMO-LIBRARY',posId:'BOOK-DEMO-LIBRARY-N',meaningId:'BOOK-DEMO-LIBRARY-M',wordSelections:[{wordId:'BOOK-DEMO-LIBRARY',posId:'BOOK-DEMO-LIBRARY-N',meaningId:'BOOK-DEMO-LIBRARY-M'}],needsReview:false}};
 m.teachingNotes=m.teachingNotes.map(repairNote);m.teachingNotes[0].content='library：图书馆。女士要去图书馆与同学完成科学项目。';m.teachingNotes[0].contentHtml='<p>'+m.teachingNotes[0].content+'</p>';
 const versions=['library：图书馆。','library /ˈlaɪbrəri/，名词，意为“图书馆”。','library：图书馆。女士要去图书馆。','library：图书馆。女士要去图书馆与同学完成科学项目。'];
 let previous=null;m.noteHistory=(m.noteHistory||[]).map((h,i)=>{const after={...repairNote(h.after),content:versions[i],contentHtml:'<p>'+versions[i]+'</p>'};const next={...h,before:previous,after};previous=structuredClone(after);return next});
 if(previous)m.teachingNotes=[structuredClone(previous)];
 for(const key of ['published','lastPublished','finalSnapshot']){const snapshot=book.workflow[key];if(!snapshot)continue;snapshot.materials={[mid]:{...structuredClone(m),questions:structuredClone(questions)}};if(!snapshot.withAnalysis){delete snapshot.materials[mid].teachingNotes;delete snapshot.materials[mid].noteHistory}}
 }
 state.bookCompleteDemoVersion=2;
 });
 commitWorkspace(state=>{for(const book of state.books.filter(b=>/^BK-STATE-DEMO-\d+$|^REVIEW-DEMO-\d+$/.test(b.id)))book.workflow.needsRepublish=false});
}
completeBookDemoData();
if(page==='books')render();

// Upgrade previously saved demo IDs, including directory links and frozen workflow snapshots.
function migrateDemoSuiteIds(state){
 const suites=state.teachingLibrary?.suites||{}, ids={};
 for(const old of Object.keys(suites))if(/^(STATE-DEMO-S-\d+|REVIEW-DEMO-\d+-S)$/.test(old)){
  ids[old]=nextBusinessId('suites',state);
  suites[old].sourceId ||= old;
 }
 if(!Object.keys(ids).length)return false;
 function rewrite(value,field){
  if(field==='sourceId')return value;
  if(typeof value==='string'){
   if(ids[value])return ids[value];
   if(field==='action')return value.replace(/(套题 )(STATE-DEMO-S-\d+|REVIEW-DEMO-\d+-S)(?=$|\s)/g,(_,prefix,id)=>prefix+(ids[id]||id));
   return value;
  }
  if(Array.isArray(value))return value.map(v=>rewrite(v));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[ids[key]||key,rewrite(v,key)]));
  return value;
 }
 Object.assign(state,rewrite(state));
 return true;
}
if(Object.keys(data.teachingLibrary.suites).some(id=>/^(STATE-DEMO-S-\d+|REVIEW-DEMO-\d+-S)$/.test(id))){
 commitWorkspace(migrateDemoSuiteIds);
 if(page==='books')render();
}
