const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const tick=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
function database(stores=new Map(),control={}){return {open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name),r={};setImmediate(()=>{r.result={objectStoreNames:{contains:()=>true},close(){},transaction(n,mode){const tx={},staged=[];const end=()=>setImmediate(()=>{if(control.fail&&mode==='readwrite'){tx.onabort?.();return;}staged.forEach(v=>map.set(v.key,structuredClone(v)));tx.oncomplete?.();});tx.objectStore=()=>({getAll(){const x={};setImmediate(()=>{x.result=[...map.values()];x.onsuccess?.();end();});return x;},get(k){const x={};setImmediate(()=>{x.result=map.get(k);x.onsuccess?.();end();});return x;},put(v){staged.push(v);}});return tx;}};r.onsuccess?.();});return r;}};}
function harness({map=new Map(),scope='grade8-lower',page='learn',hash='',db=null,control={}}={}){
 const events=new Map(),ae=new Map(),app={innerHTML:'',addEventListener(t,f){ae.set(t,f)}},status={dataset:{},textContent:''};
 const c={console,document:{body:{dataset:{progressScope:scope,lowerPage:page}},visibilityState:'visible',activeElement:null,addEventListener(){},getElementById:id=>id==='lower-app'?app:status,createElement:()=>({click(){}})},localStorage:{get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)||null,setItem(k,v){if(control.block?.(k))throw Error('blocked');map.set(k,String(v));}},indexedDB:db,crypto:{randomUUID:()=>Math.random().toString(36).slice(2)},setTimeout,clearTimeout,setInterval(){},navigator:{},location:{hash,pathname:'/lower-'+page+'.html'},history:{replaceState(a,b,h){c.location.hash=h;}},CustomEvent:class{constructor(type){this.type=type}},Blob,URL,addEventListener(t,f){if(!events.has(t))events.set(t,[]);events.get(t).push(f);},dispatchEvent(e){(events.get(e.type)||[]).forEach(f=>f(e));},print(){}};
 c.window=c;vm.createContext(c);vm.runInContext(read('public/assets/semester-store.js'),c);
 return {c,map,app,status,ae,async mount(){vm.runInContext(read('public/assets/grade8-lower-data.js'),c);vm.runInContext(read('public/assets/grade8-lower.js'),c);await c.SemesterStore.ready;await tick();},click(dataset){ae.get('click')({target:{closest:()=>({dataset,disabled:false})}});},input(key,value){ae.get('input')({target:{dataset:{note:key},value}});},change(id,value){ae.get('change')({target:{id,value}});}};
}
test('six source-aligned lessons and sixty unique, fully explained questions',async()=>{
 const h=harness();await h.mount();const d=h.c.Grade8Lower;assert.equal(d.lessons.length,6);assert.deepEqual(Array.from(d.lessons,l=>l.code),['16.1.1','16.1.2','16.2.1','16.2.2','16.3.1','16.3.2']);
 const all=d.lessons.flatMap(l=>[...l.inquiry,...l.checks,...l.practice]);assert.equal(all.length,60);assert.equal(new Set(all.map(q=>q.id)).size,60);assert.equal(d.practice.filter(q=>q.level!=='提高').length,30);
 for(const l of d.lessons){assert.equal(l.example.steps.length,4);assert.equal(l.inquiry.length,2);assert.equal(l.checks.length,2);assert.equal(l.concepts.length,3);}
 for(const q of all){assert.match(q.id,/^g8s2-16-[1-6]-[icp][1-6]$/);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);assert.equal(q.steps.length,4);assert.ok(q.steps.every(x=>x.length>4));assert.ok(!JSON.stringify(q).includes('$'));assert.ok(!h.c.Grade8LowerApp.questionCard(q).includes('answer-feedback'));}
});
test('upper and lower records and database names stay isolated even for the same key',async()=>{
 const map=new Map(),stores=new Map(),db=database(stores),upper=harness({map,scope:'',db}),lower=harness({map,db});await Promise.all([upper.c.SemesterStore.ready,lower.c.SemesterStore.ready]);
 upper.c.SemesterStore.set('answer:16',{choice:1});lower.c.SemesterStore.set('answer:16',{choice:3});await tick();
 const u=harness({map,scope:'',db}),l=harness({map,db});await Promise.all([u.c.SemesterStore.ready,l.c.SemesterStore.ready]);assert.equal(u.c.SemesterStore.get('answer:16').choice,1);assert.equal(l.c.SemesterStore.get('answer:16').choice,3);assert.equal(stores.size,2);
 assert.throws(()=>u.c.SemesterStore.importData(l.c.SemesterStore.exportData()));assert.throws(()=>l.c.SemesterStore.importData(u.c.SemesterStore.exportData()));
});
test('selected but unsubmitted answers restore without revealing explanations',async()=>{
 const map=new Map(),h=harness({map,page:'practice'});await h.mount();const q=h.c.Grade8Lower.practice[3];h.click({questionNav:q.id});h.click({choice:q.id,index:'0'});
 const fresh=harness({map,page:'practice'});await fresh.mount();assert.equal(fresh.c.SemesterStore.get('answer:'+q.id).choice,0);assert.match(fresh.app.innerHTML,/已记住所选答案，尚未提交/);assert.ok(fresh.app.innerHTML.includes(q.prompt));assert.ok(!fresh.app.innerHTML.includes('answer-feedback'));
});
test('first answer remains wrong after correction; steps and practice position restore',async()=>{
 const map=new Map(),h=harness({map,page:'practice'});await h.mount();const q=h.c.Grade8Lower.practice[2];h.click({questionNav:q.id});h.click({choice:q.id,index:'0'});h.click({submit:q.id});h.click({solution:q.id});h.click({retry:q.id});h.click({choice:q.id,index:String(q.answer)});h.click({submit:q.id});h.click({solution:q.id});
 const fresh=harness({map,page:'practice'});await fresh.mount();const a=fresh.c.SemesterStore.get('answer:'+q.id);assert.equal(a.firstCorrect,false);assert.equal(a.correct,true);assert.equal(a.attempts,2);assert.ok(fresh.app.innerHTML.includes('分步解析 · 2/4'));
});
test('completion requires inquiries, four example steps, summary and both checks',async()=>{
 const map=new Map(),h=harness({map});await h.mount();const l=h.c.Grade8Lower.lessons[0];
 for(const q of l.checks){h.click({choice:q.id,index:String(q.answer)});h.click({submit:q.id});}assert.equal(h.c.Grade8LowerApp.complete(l),false);
 for(const q of l.inquiry){h.click({choice:q.id,index:String(q.answer)});h.click({submit:q.id});}assert.equal(h.c.Grade8LowerApp.complete(l),false);
 h.click({stage:'1'});for(let n=0;n<3;n++)h.click({exampleNext:''});assert.equal(h.c.Grade8LowerApp.complete(l),false);h.click({stage:'2'});assert.equal(h.c.Grade8LowerApp.complete(l),true);
 h.input(l.id,'算术平方根非负');h.click({stage:'1'});h.click({exampleBack:''});assert.equal(h.c.Grade8LowerApp.complete(l),true,'reviewing an earlier step must not erase completion');h.click({lesson:h.c.Grade8Lower.lessons[4].id});h.click({stage:'3'});
 const fresh=harness({map});await fresh.mount();assert.equal(fresh.c.Grade8LowerApp.complete(fresh.c.Grade8Lower.lessons[0]),true);assert.equal(fresh.c.SemesterStore.get('note:'+l.id),'算术平方根非负');assert.ok(fresh.app.innerHTML.includes('二次根式的加减'));assert.ok(fresh.app.innerHTML.includes('完成前，检查这些环节'));
});
test('notes and answer records survive a failed primary copy and a clean local restart via IDB',async()=>{
 const db=database(),h=harness({db,control:{block:()=>true}});await h.mount();const q=h.c.Grade8Lower.lessons[0].inquiry[0];h.click({choice:q.id,index:'0'});h.input('branch-g8s2-16-1-0','根号内不能为负');await tick();assert.equal(h.c.SemesterStore.status().unsaved,0);
 const fresh=harness({db});await fresh.mount();assert.equal(fresh.c.SemesterStore.get('answer:'+q.id).choice,0);assert.equal(fresh.c.SemesterStore.get('note:branch-g8s2-16-1-0'),'根号内不能为负');
});
test('failed answer saves cannot be hidden by successfully saving the current position',async()=>{
 const control={block:k=>k.includes('answer:')},h=harness({control,page:'practice'});await h.mount();h.click({choice:h.c.Grade8Lower.practice[0].id,index:'0'});h.click({questionNav:h.c.Grade8Lower.practice[1].id});assert.equal(h.c.SemesterStore.status().unsaved,1);assert.equal(h.status.dataset.state,'error');assert.match(h.status.textContent,/未保存/);control.block=()=>false;h.click({saveRetry:''});await tick();assert.equal(h.c.SemesterStore.status().unsaved,0);
});
test('backup restores completion, notes, selections and reading position to a fresh device',async()=>{
 const a=harness();await a.mount();a.click({lesson:'g8s2-16-6'});a.click({stage:'2'});a.input('g8s2-16-6','完全平方不能漏中间项');const q=a.c.Grade8Lower.lessons[5].checks[0];a.click({choice:q.id,index:'1'});const payload=a.c.SemesterStore.exportData();const b=harness();await b.c.SemesterStore.ready;b.c.SemesterStore.importData(payload);await b.mount();assert.ok(b.app.innerHTML.includes('完全平方不能漏中间项'));assert.equal(b.c.SemesterStore.get('answer:'+q.id).choice,1);assert.equal(b.c.SemesterStore.get('position:learn').lesson,'g8s2-16-6');
});
test('explicit course links leave the report, and an old hash cannot reset later navigation',async()=>{
 const map=new Map(),a=harness({map});await a.mount();a.click({view:'report'});
 const linked=harness({map,hash:'#16.1.1'});await linked.mount();assert.ok(linked.app.innerHTML.includes('从一个具体问题开始'));assert.ok(!linked.app.innerHTML.includes('知识与作答证据'));
 linked.click({lesson:'g8s2-16-4'});linked.click({stage:'2'});const restored=harness({map,hash:linked.c.location.hash});await restored.mount();assert.ok(restored.app.innerHTML.includes('最简二次根式的被开方数'));
 const p=harness({page:'practice',hash:'#16.1.1'});await p.mount();p.change('lesson-filter','g8s2-16-6');p.change('level-filter','higher');const p2=harness({map:p.map,page:'practice',hash:p.c.location.hash});await p2.mount();assert.ok(p2.app.innerHTML.includes('已知x=2/'));assert.equal(p2.c.SemesterStore.get('position:practice').filter,'higher');
});
test('numeric answer choices agree with independent calculations and each is unique',async()=>{
 const h=harness();await h.mount();const sq=Math.sqrt;
 const expected={
 '2-p1':sq(49)-sq((-3)**2),'2-p2':-sq((-4)**2),'3-p1':sq(6)*sq(24),'3-p2':sq(98),'3-p3':2*sq(5)*3*sq(10),'3-p4':-sq(3)*2*sq(12),
 '4-p1':sq(75)/sq(3),'4-p2':2/sq(5),'4-p3':sq(3/4),'4-p4':sq(18)/(3*sq(2)),
 '5-p1':sq(8)+sq(18),'5-p2':sq(27)-sq(12),'5-p3':sq(50)+sq(2)-sq(8),'5-p4':sq(12)+sq(8),
 '6-p1':(sq(7)+2)*(sq(7)-2),'6-p2':(sq(2)-1)**2,'6-p3':sq(3)*(sq(12)-sq(3))+sq(27),'6-p4':Math.abs(sq(3)-2)+sq(12),'6-p6':(2/(sq(3)-1))**2-2*(2/(sq(3)-1))+3
 };
 function numeric(s){s=s.replaceAll('−','-').replace(/√(\d+)/g,'S($1)').replace(/(\d|\))(?=S\()/g,'$1*');assert.match(s,/^[0-9S()+*/.\s-]+$/);return Function('S','return '+s)(Math.sqrt);}
 for(const [suffix,value]of Object.entries(expected)){const q=h.c.Grade8Lower.practice.find(q=>q.id==='g8s2-16-'+suffix),values=q.options.map(numeric);assert.ok(Math.abs(values[q.answer]-value)<1e-8,q.id);assert.equal(values.filter(v=>Math.abs(v-value)<1e-8).length,1,q.id+' must have one answer');}
 // Independently check the sign-dependent forms across all permitted regions.
 for(const a of [-8,-3,-.25])assert.ok(Math.abs(sq(12*a*a)-(-2*a*sq(3)))<1e-8);
 for(const x of [1.1,2,2.9])assert.ok(Math.abs(sq((x-1)**2)+sq((x-3)**2)-2)<1e-8);
 for(const a of [-9,-3])for(const b of [.25,1,2])assert.equal(sq((a+b)**2)+sq((a-b)**2),-2*a);
 assert.ok(Math.abs(sq(128)*sq(50)-2*(sq(13)+1)*(sq(13)-1)-56)<1e-8);
});
test('all lower shells and assets are local and both URL forms have an offline fallback',async()=>{
 for(const p of ['math-courses.html','lower-learn.html','lower-practice.html']){const html=read('public/'+p);for(const m of html.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g))assert.ok(fs.existsSync(path.join(ROOT,'public',m[1])));assert.match(html,/八年级/);}
 const c={URL,Request,Response,setTimeout,clearTimeout,self:{addEventListener(){}}};vm.createContext(c);vm.runInContext(read('public/service-worker.js'),c);
 for(const p of ['math-courses','lower-learn','lower-practice'])for(const ext of ['','.html']){const cache={match:async key=>key==='/'+p+'.html'?new Response(p):undefined};const result=await c.navigationFallback(cache,new Request('https://example.test/'+p+ext+'?resume=1'));assert.equal(await result.text(),p);}
 for(const p of ['math-learn.html','math-practice.html','semester-review.html','semester-practice.html'])assert.ok(read('public/'+p).includes('href="math-courses.html"'));
});
test('new lower pages cannot load the upper-only storage implementation from an old cache',()=>{
 const sw=read('public/service-worker.js');
 for(const p of ['lower-learn.html','lower-practice.html']){
   const html=read('public/'+p),src=html.match(/src="(assets\/semester-store\.js\?[^" ]+)"/)[1];
   assert.equal(src,'assets/semester-store.js?v=lower-v2');assert.ok(sw.includes('"/'+src+'"'),'versioned store must also be available offline');
   for(const m of html.matchAll(/(?:src|href)="(assets\/[^"#]+)"/g)){const pathname=new URL(m[1],'https://example.test/').pathname;assert.ok(fs.existsSync(path.join(ROOT,'public',pathname)));}
 }
 assert.ok(read('public/index.html').includes('assets/math-home-upgrade.js?v=lower-v2'));
});
