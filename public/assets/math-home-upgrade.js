(function () {
  let queued = false;
  const setText = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };

  function patchHome() {
    queued = false;
    document.querySelectorAll("nav a[href='math-learn.html']").forEach((link) => {
      if (link.textContent.includes("第13")) setText(link, "第13—18章学习");
    });
    document.querySelectorAll("nav").forEach((nav) => {
      const practice = nav.querySelector("a[href='math-practice.html']");
      if (!practice) return;
      let anchor = practice;
      [
        ["math-practice.html#review", "13·14复习"],
        ["math-practice.html#review15-16", "15·16复习"],
        ["math-practice.html#review17-18", "17·18复习"],
        ["semester-review.html", "上册总复习"],
        ["semester-practice.html", "上册综合练习"]
      ].forEach(([href, label]) => {
        let review = nav.querySelector(`a[href='${href}']`);
        if (!review) {
          review = document.createElement("a");
          review.href = href;
          review.textContent = label;
          review.style.cssText = practice.style.cssText;
          anchor.insertAdjacentElement("afterend", review);
        }
        anchor = review;
      });
    });
    document.querySelectorAll(".quick-stats article").forEach((card) => {
      const label = card.querySelector("span");
      if (label?.textContent.includes("第13·14章课时") || label?.textContent.includes("第13—16章课时")) {
        const value = card.querySelector("b");
        setText(value, "48");
        setText(label, "第13—18章课时");
        const note = card.querySelector("small");
        setText(note, "追问、动态图解、即时练习");
      }
    });
    const callout = document.querySelector(".learning-tools-callout");
    if (callout) {
      const kicker = callout.querySelector(".section-kicker");
      setText(kicker, "人教版八年级上册交互学习");
      const heading = callout.querySelector("h2");
      setText(heading, "八年级上册 · 学习、总复习与综合练习");
      const copy = callout.querySelector("h2 + p");
      setText(copy, "章节学习之外，新增20个总复习专题与100道分层练习。用24题综合检测检查六章知识，再根据学习报告回练错题；总复习进度独立保存，并支持下载备份。");
      const actions = callout.querySelector("h2 + p + p");
      if (actions) {
        [
          ["math-practice.html#review", "13·14复习练习"],
          ["math-practice.html#review15-16", "15·16复习练习"],
          ["math-practice.html#review17-18", "17·18复习练习"],
          ["semester-review.html", "八上总复习"],
          ["semester-practice.html", "八上综合练习"]
        ].forEach(([href, label]) => {
          if (actions.querySelector(`a[href='${href}']`)) return;
          const review = document.createElement("a");
          review.href = href;
          review.className = "ghost-button";
          review.style.cssText = "display:inline-block;text-decoration:none;margin-left:10px;margin-top:8px";
          review.textContent = label;
          actions.appendChild(review);
        });
      }
    }
  }

  function schedulePatch() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(patchHome);
  }

  patchHome();
  new MutationObserver(schedulePatch).observe(document.body, { childList: true, subtree: true });
})();
