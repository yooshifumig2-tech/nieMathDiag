(function(){
  let queued=false;
  function patchHome(){
    queued=false;
    document.querySelectorAll('nav').forEach(nav=>{
      const learn=nav.querySelector("a[href='math-learn.html']");if(!learn)return;
      if(!nav.querySelector("a[href='math-courses.html']")){
        nav.querySelectorAll("a[href^='math-practice.html']").forEach(a=>a.remove());
        learn.href='math-courses.html';learn.textContent='学期导航';
        [['math-learn.html','八上学习'],['lower-learn.html','八下学习'],['lower-practice.html','八下练习']].forEach(([href,label])=>{const a=document.createElement('a');a.href=href;a.textContent=label;a.style.cssText=learn.style.cssText;nav.appendChild(a);});
      }
    });
    const callout=document.querySelector('.learning-tools-callout');
    if(callout&&!callout.dataset.semesterNavigation){
      callout.dataset.semesterNavigation='true';
      callout.firstElementChild.innerHTML='<span class="section-kicker">八年级 · 按学期进入</span><h2>上学期巩固，下学期启程</h2><p>先选择学期，再进入学习、练习或总复习。两个学期的第16章分别是整式的乘法和二次根式。</p><div class="home-term-grid"><section><span>八年级上学期</span><h3>第13—18章 · 48课时</h3><p>三角形、全等、轴对称、整式乘法、因式分解、分式</p><div><a href="math-learn.html">上学期学习 →</a><a href="math-practice.html">上学期练习</a><a href="semester-review.html">上学期总复习</a><a href="semester-practice.html">上学期综合练习</a></div></section><section><span>八年级下学期 · 新课程</span><h3>第16章 二次根式</h3><p>6个课时 · 观察追问、分步例题、即时检测与分层练习</p><div><a href="lower-learn.html">下学期学习 →</a><a href="lower-practice.html">下学期练习</a><a href="math-courses.html">查看完整课程导航</a></div></section></div>';
    }
    document.querySelectorAll('.quick-stats article').forEach(card=>{const label=card.querySelector('span');if(label&&/^第13/.test(label.textContent))label.textContent='上学期48课时';});
  }
  const style=document.createElement('style');style.textContent='.home-term-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}.home-term-grid section{background:#fff;border:1px solid #ddd8ec;border-top:4px solid #7660bd;border-radius:13px;padding:20px}.home-term-grid section+section{border-color:#c8dfd0;border-top-color:#2b8061}.home-term-grid section>span{font-size:12px;color:#665581;font-weight:800}.home-term-grid section+section>span{color:#2a7254}.home-term-grid h3{font-size:20px;margin:9px 0;color:#29243d}.home-term-grid p{font-size:14px!important;line-height:1.8}.home-term-grid section>div{display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:14px}.home-term-grid a{font-size:14px;color:#584392;font-weight:700}.home-term-grid section+section a{color:#226d51}@media(max-width:800px){.home-term-grid{grid-template-columns:1fr}}';document.head.appendChild(style);
  patchHome();new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(patchHome);}}).observe(document.body,{childList:true,subtree:true});
})();
