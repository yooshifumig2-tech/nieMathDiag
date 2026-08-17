(function(){
  const printStyle=document.createElement("link");printStyle.rel="stylesheet";printStyle.href="assets/math-print.css";printStyle.media="print";document.head.append(printStyle);
  const KEY="fumi-math-course:v1", MAP_KEY="fumi-math-map:learning-tools:v1";
  const defaults={lesson:{},practice:{answers:{},submitted:{},step:{}},updatedAt:null};
  function fresh(){return JSON.parse(JSON.stringify(defaults))}
  function load(){try{return Object.assign(fresh(),JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{return fresh()}}
  let state=load();
  function save(){state.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state))}catch{};syncMap()}
  function pct(section){const qs=MathCourseData.practice.filter(q=>q.required&&(!section||q.chapter===section));const done=qs.filter(q=>state.practice.submitted[q.id]);return qs.length?Math.round(done.filter(q=>state.practice.answers[q.id]===q.answer).length/done.length*100):0}
  function syncMap(){try{const data=JSON.parse(localStorage.getItem(MAP_KEY)||"null");if(!data?.mindmap?.branches)return;const root=data.mindmap.branches.find(x=>x.title==="三角形与全等")||data.mindmap.branches.find(x=>x.title==="几何基础与坐标");if(!root)return;root.children=root.children||[];["第13章 三角形","第14章 全等三角形"].forEach((chapter,ci)=>{let node=root.children.find(x=>x.id===`math-course-${ci+13}`);if(!node){node={id:`math-course-${ci+13}`,title:chapter,note:"章节学习尚未开始",color:ci?"#4f7ee8":"#6d5ce7",children:[],autoSync:true};root.children.push(node)}const ls=MathCourseData.lessons.filter(l=>l.chapter===chapter);const completed=ls.filter(l=>state.lesson[l.id]?.done).length;node.title=`${chapter} · ${completed}/${ls.length}课时`;node.note=`学习完成 ${Math.round(completed/ls.length*100)}% · 练习掌握 ${pct(chapter)}%`;node.children=ls.map(l=>{const s=state.lesson[l.id]||{};const checks=l.checks.filter(q=>s.answers?.[q.id]===q.answer).length;return{id:`course-${l.id}`,title:`${l.section} ${l.title.replace(/^.*：/,"")}`,note:s.done?`已学 · 即时题 ${checks}/${l.checks.length}`:"待学习",color:ci?"#4f7ee8":"#6d5ce7",children:[],autoSync:true}})});localStorage.setItem(MAP_KEY,JSON.stringify(data))}catch{}}
  function escape(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c])}
  window.MathCore={state,save,pct,escape,syncMap};
})();
