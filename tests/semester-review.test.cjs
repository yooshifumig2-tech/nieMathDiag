const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const tick=async()=>{for(let i=0;i<8;i++)await turn();};
const DATA=['math-course-data.js','math-course-data-15-16.js','math-course-data-17-18.js','math-review-data.js','math-review-data-15-16.js','math-review-data-17-18.js','math-diagrams.js','semester-data.js'];
function local(map=new Map(),control={}){return {get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem(k,v){if(control.block?.(k))throw Error('storage unavailable');map.set(k,String(v));},removeItem:k=>map.delete(k)};}
function idb(map=new Map(),control={}){
  const db={objectStoreNames:{contains:()=>true},close(){},transaction(name,mode){
    const tx={};const staged=new Map();
    const end=()=>setImmediate(()=>{if(control.fail&&mode==='readwrite'){tx.onabort?.();return;}for(const [k,v] of staged)map.set(k,structuredClone(v));tx.oncomplete?.();});
    tx.objectStore=()=>({get(k){const r={};setImmediate(()=>{r.result=map.get(k);r.onsuccess?.();end();});return r;},getAll(){const r={};setImmediate(()=>{r.result=[...map.values()].map(v=>structuredClone(v));r.onsuccess?.();end();});return r;},put(r){staged.set(r.key,structuredClone(r));}});return tx;
  }};
  return {open(){const r={};setImmediate(()=>{r.result=db;r.onsuccess?.();});return r;}};
}
function context({map=new Map(),control={},database=null,page='practice',hash=''}={}){
  const events=new Map(),appEvents=new Map();
  const app={innerHTML:'',addEventListener(t,f){appEvents.set(t,f)}};
  const status={textContent:'',dataset:{}};
  const message={textContent:''};
  const document={body:{dataset:{semesterPage:page}},visibilityState:'visible',addEventListener(){},getElementById(id){return id==='semester-app'?app:id==='save-status'?status:message;},querySelector(){return {open:false}},createElement(){return {click(){}}}};
  const c={console,document,localStorage:local(map,control),indexedDB:database,crypto:{randomUUID:()=>Math.random().toString(36).slice(2)},setTimeout,clearTimeout,setInterval(){},requestAnimationFrame:f=>f(),navigator:{},location:{hash,protocol:'http:',pathname:page==='review'?'/semester-review.html':'/semester-practice.html'},history:{replaceState(a,b,v){c.location.hash=v}},scrollY:0,scrollTo(x,y){c.scrollY=y},CustomEvent:class{constructor(type){this.type=type}},Blob,URL,addEventListener(t,f){if(!events.has(t))events.set(t,[]);events.get(t).push(f);},dispatchEvent(e){for(const f of events.get(e.type)||[])f(e);}};
  c.window=c;c.globalThis=c;vm.createContext(c);
  vm.runInContext(read('public/assets/semester-store.js'),c);
  return {c,map,app,status,events,appEvents,click(dataset){appEvents.get('click')({target:{closest:()=>({dataset,disabled:false})}});},async mount(){for(const f of DATA)vm.runInContext(read('public/assets/'+f),c);vm.runInContext(read('public/assets/semester.js'),c);await c.SemesterStore.ready;await tick();}};
}
test('100 unique questions, valid module checks, and a balanced 24-question paper',async()=>{
  const h=context();await h.mount();const d=h.c.SemesterData;
  assert.equal(d.questions.length,100);assert.equal(new Set(d.questions.map(q=>q.id)).size,100);assert.equal(d.questions.filter(q=>q.required).length,84);
  assert.equal(d.modules.length,20);for(const q of d.questions){assert.equal(q.options.length,4);assert.ok(q.answer>=0&&q.answer<4);assert.equal(new Set(q.options).size,4);assert.ok(q.explain);}
  for(const m of d.modules){assert.equal(m.steps.length,4);assert.equal(m.refs.length,2);for(const id of m.refs)assert.ok(d.questions.find(q=>q.id===id));}
  for(const n of [13,14,15,16,17,18])assert.equal(d.paperIds.map(id=>d.questions.find(q=>q.id===id)).filter(q=>q.chapterNumber===n).length,4);
});
test('answers, completion, notes and position survive restart without touching old progress',async()=>{
  const map=new Map([['fumi-math-course:v2','OLD-RECORD']]);const h=context({map});await h.c.SemesterStore.ready;
  const s=h.c.SemesterStore;s.set('answer:bank:term-18-03',{selected:3,submitted:true,first:0});s.set('review:unit-18-1',{done:true,step:4,visited:[1,2,3,4]});s.set('note:unit-18-1','分母不能为零');s.set('position:review',{id:'unit-18-1',y:420});
  const fresh=context({map});await fresh.c.SemesterStore.ready;
  assert.equal(fresh.c.SemesterStore.get('answer:bank:term-18-03').selected,3);assert.equal(fresh.c.SemesterStore.get('review:unit-18-1').done,true);assert.equal(fresh.c.SemesterStore.get('note:unit-18-1'),'分母不能为零');assert.equal(fresh.c.SemesterStore.get('position:review').y,420);assert.equal(map.get('fumi-math-course:v2'),'OLD-RECORD');
});
test('IndexedDB recovers answers when localStorage writes fail and after local copies disappear',async()=>{
  const dbRows=new Map(),database=idb(dbRows);const h=context({control:{block:()=>true},database});await h.c.SemesterStore.ready;
  h.c.SemesterStore.set('answer:bank:term-13-04',{selected:2,submitted:true});await tick();assert.equal(h.c.SemesterStore.status().unsaved,0);
  const fresh=context({database});await fresh.c.SemesterStore.ready;assert.equal(fresh.c.SemesterStore.get('answer:bank:term-13-04').selected,2);assert.ok(fresh.map.has('fumi-semester:v1:answer:bank:term-13-04'));
});
test('a successful position save cannot hide an answer failure; retry recovers the answer',async()=>{
  const map=new Map(),control={block:k=>k.includes('answer:')};const h=context({map,control});await h.c.SemesterStore.ready;
  h.c.SemesterStore.set('answer:bank:term-18-11',{selected:3});assert.equal(h.c.SemesterStore.status().unsaved,1);
  h.c.SemesterStore.set('position:practice',{mode:'bank',qid:'term-18-11'});assert.equal(h.c.SemesterStore.status().unsaved,1);
  control.block=()=>false;h.c.SemesterStore.retry();await tick();assert.equal(h.c.SemesterStore.status().unsaved,0);
  const fresh=context({map});await fresh.c.SemesterStore.ready;assert.equal(fresh.c.SemesterStore.get('answer:bank:term-18-11').selected,3);
});
test('database transaction failure does not produce a saved status without a local copy',async()=>{
  const dbControl={fail:true},h=context({control:{block:()=>true},database:idb(new Map(),dbControl)});await h.c.SemesterStore.ready;
  h.c.SemesterStore.set('answer:bank:term-13-01',{selected:2});await tick();assert.equal(h.c.SemesterStore.status().unsaved,1);
  dbControl.fail=false;h.c.SemesterStore.retry();await tick();assert.equal(h.c.SemesterStore.status().unsaved,0);
});
test('corrupt primary record recovers from backup; separate tabs preserve different answers',async()=>{
  const map=new Map(),a=context({map}),b=context({map});await Promise.all([a.c.SemesterStore.ready,b.c.SemesterStore.ready]);
  a.c.SemesterStore.set('answer:bank:term-13-01',{selected:2});b.c.SemesterStore.set('answer:bank:term-13-02',{selected:2});map.set('fumi-semester:v1:answer:bank:term-13-01','{broken');
  const fresh=context({map});await fresh.c.SemesterStore.ready;assert.equal(fresh.c.SemesterStore.get('answer:bank:term-13-01').selected,2);assert.equal(fresh.c.SemesterStore.get('answer:bank:term-13-02').selected,2);
});
test('export/import preserves recent answers and rejects invalid input before mutation',async()=>{
  const a=context();await a.c.SemesterStore.ready;a.c.SemesterStore.set('answer:bank:term-13-01',{selected:2});const exported=a.c.SemesterStore.exportData();
  const b=context();await b.c.SemesterStore.ready;assert.equal(b.c.SemesterStore.importData(exported),1);b.c.SemesterStore.set('answer:bank:term-13-01',{selected:1});b.c.SemesterStore.importData(exported);assert.equal(b.c.SemesterStore.get('answer:bank:term-13-01').selected,1);
  const before=JSON.stringify(b.c.SemesterStore.exportData().records);assert.throws(()=>b.c.SemesterStore.importData({...exported,records:[...exported.records,{key:'bad'}]}));assert.equal(JSON.stringify(b.c.SemesterStore.exportData().records),before);
});
test('practice selection restores before submit; first result survives correction',async()=>{
  const map=new Map(),h=context({map});await h.mount();const id='term-13-01',key='answer:bank:'+id;
  assert.ok(!h.app.innerHTML.includes('正确选项'));
  h.click({pick:'0',key,q:id});const fresh=context({map});await fresh.mount();assert.equal(fresh.c.SemesterStore.get(key).selected,0);assert.ok(!fresh.app.innerHTML.includes('正确选项'));
  fresh.click({submit:id,key});assert.ok(fresh.app.innerHTML.includes('正确选项 C'));fresh.click({redo:id,key});fresh.click({pick:'2',key,q:id});fresh.click({submit:id,key});assert.equal(fresh.c.SemesterStore.get(key).first,0);assert.equal(fresh.c.SemesterStore.get(key).selected,2);
});
test('review completion requires four steps and both submitted checks and survives restart',async()=>{
  const map=new Map(),h=context({map,page:'review'});await h.mount();const m=h.c.SemesterData.modules[0];
  h.click({complete:m.id});assert.notEqual(h.c.SemesterStore.get('review:'+m.id)?.done,true);
  for(const n of [2,3,4])h.click({example:String(n)});
  for(const id of m.refs){const q=h.c.SemesterData.questions.find(q=>q.id===id),key='answer:check:'+m.id+':'+id;h.click({pick:String(q.answer),key,q:id});h.click({submit:id,key});}
  h.click({complete:m.id});assert.equal(h.c.SemesterStore.get('review:'+m.id).done,true);
  h.click({unit:'unit-18-2'});const fresh=context({map,page:'review'});await fresh.mount();assert.ok(fresh.app.innerHTML.includes('分式运算与整数指数'));assert.ok(fresh.app.innerHTML.includes('1 / 20'));
});
test('paper remains independent, withholds answers, submits atomically and supports analysis steps',async()=>{
  const map=new Map(),h=context({map,hash:'#paper'});await h.mount();const d=h.c.SemesterData;
  h.click({action:'submit-paper'});assert.equal(h.c.SemesterStore.get('paper:finished',false),false);
  for(const id of d.paperIds){const q=d.questions.find(q=>q.id===id);h.click({pick:String(q.answer),key:'answer:paper:'+id,q:id});}
  assert.ok(!h.app.innerHTML.includes('正确选项'));h.click({action:'submit-paper'});assert.equal(Object.keys(h.c.SemesterStore.get('paper:finished').answers).length,24);assert.ok(h.app.innerHTML.includes('正确选项'));
  const first=d.paperIds[0];h.click({analysis:'3',key:'answer:paper:'+first});assert.ok(h.app.innerHTML.includes(d.questions.find(q=>q.id===first).explain));assert.equal(h.c.SemesterStore.get('answer:bank:'+first),null);
  // Keep only the atomic submission record: a partial per-question save must not lose the submitted paper.
  for(const key of [...map.keys()])if(key.includes('answer:paper:'))map.delete(key);
  const fresh=context({map,hash:'#paper'});await fresh.mount();assert.ok(fresh.app.innerHTML.includes('正确选项'));assert.equal(Object.keys(fresh.c.SemesterStore.get('paper:finished').answers).length,24);
});
test('all routes reference existing local assets and service worker caches both new routes',()=>{
  for(const route of ['semester-review.html','semester-practice.html']){const html=read('public/'+route);for(const m of html.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g))assert.ok(fs.existsSync(path.join(ROOT,'public',m[1])),m[1]);assert.ok(read('public/service-worker.js').includes('"/'+route+'"'));}
});
test('algebra answers agree with independent expressions across several admissible inputs',async()=>{
  const h=context();await h.mount();const d=h.c.SemesterData;
  const original={
    '16-01':'a**3*a**5','16-02':'(a**3)**4','16-03':'(-2*x*y**2)**3','16-04':'x**2*(x**3)**2',
    '16-05':'3*a**2*b*(-2*a*b**3)','16-06':'-2*x*(x**2-3*x+4)','16-07':'(x+2)*(x-5)','16-08':'(6*x**3-9*x**2+3*x)/(3*x)',
    '16-09':'(-3)**0-3**0','16-10':'(2*a+b)*(2*a-b)','16-11':'(2*a-3*b)**2','16-12':'(x+4)*(x-4)-(x-1)**2',
    '17-04':'8*m**2*n-12*m*n**2','17-06':'9*x**2-24*x*y+16*y**2','17-07':'5*a**3-45*a','17-09':'x**2+x-12','17-10':'a*x-a*y+b*x-b*y',
    '18-04':'(x**2-25)/(x**2-10*x+25)','18-06':'2/(x-1)-1/(x+1)','18-07':'(4*a**2*b)/(3*c)*(9*c**2)/(8*a*b**2)',
    '18-08':'(6*x**2*y)/(5*a*b)/((9*x*y**2)/(10*a**2*b))','18-09':'(-2)**0+4**(-1)','18-10':'0.00000084','18-14':'(2*a/(3*b))**2/(4*a/(9*b))',
    '18-c2':'1/(x*(x+1))+1/((x+1)*(x+2))+1/((x+2)*(x+3))',
    'mix-a2':'3*x**3-12*x','mix-a3':'(x**2-4)/(x**2-4*x+4)','mix-a5':'1/(x*(x+1))+1/((x+1)*(x+2))','16-13':'(x+2)**2-x**2','16-14':'((x+1)+x)*((x+1)-x)'
  };
  const supers={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
  function convert(s){return s.split('，')[0].replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,v=>'**('+[...v].map(c=>supers[c]).join('')+')').replaceAll('−','-').replaceAll('×','*').replaceAll('·','*').replaceAll('[','(').replaceAll(']',')').replace(/(\d|[a-z]|\))(?=[a-z(])/g,'$1*');}
  for(const [id,expr] of Object.entries(original)){
    const q=d.questions.find(q=>q.id==='term-'+id),display=convert(q.options[q.answer]);
    assert.match(display,/^[a-z0-9.*()+\-/\s]+$/i);
    const actual=Function('a','b','c','x','y','m','n','return '+display),expected=Function('a','b','c','x','y','m','n','return '+expr);
    for(const values of [[2,3,4,7,2,3,4],[-2,5,3,8,-3,2,5],[5,-3,2,4,7,6,2]]){
      const a=actual(...values),b=expected(...values);assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),id+': '+display);
    }
  }
});
