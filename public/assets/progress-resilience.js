(function () {
  "use strict";

  const KEY = "fumi-math-position:v1";
  const BACKUP_KEY = "fumi-math-position:backup:v1";
  const providers = new Map();
  let store = loadStore();
  let scrollTimer = 0;
  let toastTimer = 0;

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
  }

  function readKey(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
  }

  function normalize(value) {
    const pages = value?.pages && typeof value.pages === "object" ? value.pages : {};
    return {
      version: 1,
      updatedAt: Number(value?.updatedAt) || 0,
      pages: { ...pages }
    };
  }

  function loadStore() {
    const primary = normalize(readKey(KEY));
    const backup = normalize(readKey(BACKUP_KEY));
    return backup.updatedAt > primary.updatedAt ? backup : primary;
  }

  function dispatchStatus(ok, timestamp) {
    const time = new Date(timestamp || Date.now()).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit"
    });
    document.querySelectorAll?.(".save-pill").forEach((node) => {
      node.textContent = ok ? "● 已实时保存 " + time : "⚠ 此浏览器无法保存";
      node.style.color = ok ? "" : "#b4233f";
    });
    try {
      window.dispatchEvent(new CustomEvent("fumi-position-saved", {
        detail: { ok, timestamp: timestamp || Date.now() }
      }));
    } catch {}
  }

  function persist() {
    store.updatedAt = Date.now();
    const payload = JSON.stringify(store);
    let primary = false;
    let backup = false;
    try {
      localStorage.setItem(KEY, payload);
      primary = true;
    } catch {}
    try {
      localStorage.setItem(BACKUP_KEY, payload);
      backup = true;
    } catch {}
    const ok = primary || backup;
    dispatchStatus(ok, store.updatedAt);
    return ok;
  }

  function read(scope) {
    const current = loadStore();
    store = current;
    return current.pages[scope] ? clone(current.pages[scope]) : null;
  }

  function checkpoint(scope, payload) {
    if (!scope || !payload || typeof payload !== "object") return false;
    const latest = loadStore();
    const timestamp = Date.now();
    store = latest;
    store.pages[scope] = {
      ...(latest.pages[scope] || {}),
      ...payload,
      scrollY: Math.max(0, Math.round(Number(payload.scrollY ?? window.scrollY) || 0)),
      updatedAt: timestamp
    };
    return persist();
  }

  function register(scope, provider) {
    if (scope && typeof provider === "function") providers.set(scope, provider);
    return read(scope);
  }

  function flush(scope) {
    const provider = providers.get(scope);
    if (!provider) return false;
    let payload;
    try { payload = provider(); } catch { return false; }
    return checkpoint(scope, payload || {});
  }

  function flushAll() {
    providers.forEach((_, scope) => flush(scope));
  }

  function injectStyle() {
    if (document.getElementById("fumi-recovery-style")) return;
    const style = document.createElement("style");
    style.id = "fumi-recovery-style";
    style.textContent = ".fumi-recovery-toast{position:fixed;left:50%;bottom:24px;z-index:9999;max-width:min(88vw,520px);transform:translateX(-50%);padding:12px 17px;border-radius:999px;background:#28243b;color:#fff;box-shadow:0 14px 35px rgba(39,36,58,.24);font:700 13px/1.4 Inter,'PingFang SC','Microsoft YaHei',sans-serif;text-align:center}.fumi-recovery-toast.bad{background:#a92d49}@media(max-width:640px){.fumi-recovery-toast{bottom:14px;border-radius:15px}}";
    document.head.append(style);
  }

  function toast(message, bad) {
    if (!message) return;
    injectStyle();
    let node = document.getElementById("fumi-recovery-toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "fumi-recovery-toast";
      node.className = "fumi-recovery-toast";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      document.body.append(node);
    }
    node.classList.toggle("bad", Boolean(bad));
    node.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.remove(), bad ? 6000 : 3800);
  }

  function restore(scope, options) {
    const saved = options?.position || read(scope);
    if (!saved) return false;
    const anchorId = options?.anchorId || saved.anchorId || saved.questionId || "";
    const scrollY = Math.max(0, Number(options?.scrollY ?? saved.scrollY) || 0);
    const label = options?.label || "";
    const apply = () => {
      const anchor = anchorId ? document.getElementById(anchorId) : null;
      if (anchor) anchor.scrollIntoView({ block: "center" });
      else window.scrollTo(0, scrollY);
      if (options?.announce !== false) {
        toast("已恢复上次进度" + (label ? " · " + label : ""));
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(apply, 0)));
    return true;
  }

  function activeHomeView() {
    const action = document.querySelector?.(".topbar nav [data-action].active")?.dataset?.action;
    return action === "start" ? "test" : action || "home";
  }

  function initHomeRecovery() {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/" && !path.endsWith("/index.html")) return;
    const allowed = new Set(["home", "test", "report", "mindmap", "orid"]);
    const explicit = new URLSearchParams(location.search).get("view");
    const saved = read("home");
    let view = allowed.has(explicit) ? explicit : activeHomeView();

    register("home", () => ({
      view,
      anchorId: "",
      scrollY: window.scrollY
    }));

    document.addEventListener("click", (event) => {
      const target = event.target.closest?.("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      const mapping = {
        home: "home",
        start: "test",
        report: "report",
        mindmap: "mindmap",
        orid: "orid",
        submit: "report",
        reset: "home",
        prev: "test",
        next: "test",
        goto: "test",
        select: "test",
        "order-add": "test",
        "order-remove": "test"
      };
      if (!mapping[action]) return;
      view = mapping[action];
      setTimeout(() => flush("home"), 0);
    }, true);

    requestAnimationFrame(() => {
      if (!allowed.has(explicit) && saved && allowed.has(saved.view) && saved.view !== activeHomeView()) {
        const action = saved.view === "test" ? "start" : saved.view;
        const button = document.querySelector?.('[data-action="' + action + '"]');
        if (button && !button.disabled) button.click();
        view = saved.view;
      } else {
        view = activeHomeView();
      }
      if (saved) restore("home", {
        position: saved,
        label: view === "test" ? "诊断题" : view === "mindmap" ? "思维导图" : view === "orid" ? "ORID反思" : view === "report" ? "诊断报告" : "能力地图"
      });
      flush("home");
    });
  }

  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(flushAll, 350);
  }, { passive: true });

  window.addEventListener("pagehide", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === KEY || event.key === BACKUP_KEY) store = loadStore();
  });

  window.addEventListener("fumi-save-status", (event) => {
    dispatchStatus(event.detail?.ok !== false, event.detail?.timestamp || Date.now());
  });

  window.addEventListener("offline", () => {
    toast("网络已中断：可继续学习，进度仍会保存在本机");
  });
  window.addEventListener("online", () => {
    toast("网络已恢复，学习进度未受影响");
  });

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {});
  }

  if (navigator.storage?.persist) {
    document.addEventListener("pointerdown", () => {
      navigator.storage.persist().catch(() => {});
    }, { once: true, capture: true });
  }

  window.FumiRecovery = { read, checkpoint, register, flush, flushAll, restore, toast };
  initHomeRecovery();
})();
