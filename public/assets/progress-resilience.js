(function () {
  "use strict";

  const LEGACY_KEY = "fumi-math-position:v1";
  const LEGACY_BACKUP_KEY = "fumi-math-position:backup:v1";
  const LEGACY_PAGE_RECORD_PREFIX = "fumi-math-position:page:v1:";
  const KEY = "fumi-math-position:v2";
  const BACKUP_KEY = "fumi-math-position:backup:v2";
  const PAGE_RECORD_PREFIX = "fumi-math-position:page:v2:";
  const WRITER_ID = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  let pageRecordSequence = 0;
  const providers = new Map();
  const activityAt = new Map();
  let store = loadStore();
  let scrollTimer = 0;
  let toastTimer = 0;
  let suppressScrollUntil = 0;

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
  }

  function preciseNow() {
    const wallTime = Date.now();
    try {
      const highResolution = Number(performance.timeOrigin) + Number(performance.now());
      return Number.isFinite(highResolution) ? Math.max(wallTime, highResolution) : wallTime;
    } catch {
      return wallTime;
    }
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
    const normalizedPages = {};
    Object.entries(pages).forEach(([scope, page]) => {
      if (!page || typeof page !== "object" || Array.isArray(page)) return;
      normalizedPages[scope] = { ...page, updatedAt: Number(page.updatedAt) || 0 };
    });
    return {
      version: 2,
      updatedAt: Number(value?.updatedAt) || 0,
      pages: normalizedPages
    };
  }

  function mergeStores(firstValue, secondValue) {
    const first = normalize(firstValue);
    const second = normalize(secondValue);
    const result = normalize(first);
    const scopes = new Set([...Object.keys(first.pages), ...Object.keys(second.pages)]);
    scopes.forEach((scope) => {
      const firstPage = first.pages[scope];
      const secondPage = second.pages[scope];
      if (!firstPage) result.pages[scope] = clone(secondPage);
      else if (!secondPage) result.pages[scope] = clone(firstPage);
      else if (secondPage.updatedAt > firstPage.updatedAt) result.pages[scope] = clone(secondPage);
      else if (secondPage.updatedAt < firstPage.updatedAt) result.pages[scope] = clone(firstPage);
      else result.pages[scope] = JSON.stringify(secondPage) > JSON.stringify(firstPage) ? clone(secondPage) : clone(firstPage);
    });
    result.updatedAt = Math.max(first.updatedAt, second.updatedAt, ...Object.values(result.pages).map((page) => Number(page.updatedAt) || 0));
    return result;
  }

  function pageRecordKey(scope, timestamp) {
    pageRecordSequence += 1;
    const order = [String(timestamp).padStart(16, "0"), WRITER_ID, String(pageRecordSequence).padStart(6, "0")].join(":");
    return PAGE_RECORD_PREFIX + order + ":" + encodeURIComponent(scope);
  }

  function writePageRecord(scope, page) {
    try {
      const timestamp = Math.max(Number(page?.updatedAt) || 0, 1);
      const key = pageRecordKey(scope, timestamp);
      const recordPayload = JSON.stringify({ ...page, updatedAt: timestamp, scope });
      localStorage.setItem(key, recordPayload);
      return localStorage.getItem(key) === recordPayload;
    } catch {
      return false;
    }
  }

  function pageRecords(prefix = PAGE_RECORD_PREFIX) {
    const records = [];
    let length = 0;
    try { length = Number(localStorage.length) || 0; } catch {}
    for (let index = 0; index < length; index += 1) {
      let key = "";
      let record = null;
      try {
        key = localStorage.key(index) || "";
        if (!key.startsWith(prefix)) continue;
        record = readKey(key);
      } catch {
        continue;
      }
      const timestamp = Number(record?.updatedAt) || 0;
      if (!record?.scope || !timestamp) continue;
      records.push({ ...record, updatedAt: timestamp, storageKey: key });
    }
    return records.sort((first, second) => first.updatedAt - second.updatedAt || first.storageKey.localeCompare(second.storageKey));
  }

  function prunePageRecords(scope, keep = 12) {
    const stale = pageRecords()
      .filter((record) => record.scope === scope)
      .sort((first, second) => second.updatedAt - first.updatedAt || second.storageKey.localeCompare(first.storageKey))
      .slice(keep);
    stale.forEach((record) => {
      try { localStorage.removeItem(record.storageKey); } catch {}
    });
  }

  function applyPageRecords(base, records) {
    const result = normalize(base);
    records.forEach((record) => {
      if (record.updatedAt < Number(result.pages[record.scope]?.updatedAt || 0)) return;
      const { scope, storageKey, ...page } = record;
      result.pages[scope] = page;
      result.updatedAt = Math.max(result.updatedAt, page.updatedAt);
    });
    return result;
  }

  function persistMigration(value) {
    const payload = JSON.stringify(normalize(value));
    try { localStorage.setItem(KEY, payload); } catch {}
    try { localStorage.setItem(BACKUP_KEY, payload); } catch {}
  }

  function loadStore() {
    const primary = readKey(KEY);
    const backup = readKey(BACKUP_KEY);
    const records = pageRecords();
    const current = applyPageRecords(mergeStores(primary, backup), records);
    const legacy = mergeStores(readKey(LEGACY_KEY), readKey(LEGACY_BACKUP_KEY));
    const legacyWithRecords = applyPageRecords(legacy, pageRecords(LEGACY_PAGE_RECORD_PREFIX));
    let imported = false;
    let importFailed = false;

    // v1 is read-only. It may fill a scope that has not reached v2 yet, but it
    // can never replace an existing v2 scope after an old tab closes.
    Object.entries(legacyWithRecords.pages).forEach(([scope, legacyPage]) => {
      if (current.pages[scope]) return;
      const page = {
        ...legacyPage,
        updatedAt: Math.max(Number(legacyPage.updatedAt) || 0, Number(legacyWithRecords.updatedAt) || 0, 1)
      };
      if (!writePageRecord(scope, page)) {
        importFailed = true;
        return;
      }
      current.pages[scope] = page;
      current.updatedAt = Math.max(current.updatedAt, page.updatedAt);
      imported = true;
    });
    if ((!primary && !backup) || imported) persistMigration(current);
    if (importFailed) dispatchStatus(false, legacyWithRecords.updatedAt || Date.now());
    return current;
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

  function persist(recordSaved) {
    const payload = JSON.stringify(store);
    try { localStorage.setItem(KEY, payload); } catch {}
    try { localStorage.setItem(BACKUP_KEY, payload); } catch {}
    const ok = recordSaved;
    dispatchStatus(ok, store.updatedAt);
    return ok;
  }

  function read(scope) {
    const current = loadStore();
    store = current;
    return current.pages[scope] ? clone(current.pages[scope]) : null;
  }

  function markInteraction(scope, latest) {
    const timestamp = Math.max(
      preciseNow(),
      (Number(activityAt.get(scope)) || 0) + 1,
      (Number(latest.pages[scope]?.updatedAt) || 0) + 1
    );
    activityAt.set(scope, timestamp);
    return timestamp;
  }

  function checkpoint(scope, payload, options) {
    if (!scope || !payload || typeof payload !== "object") return false;
    const latest = loadStore();
    const interaction = options?.interaction !== false;
    const timestamp = interaction ? markInteraction(scope, latest) : Number(activityAt.get(scope)) || 0;
    const latestTimestamp = Number(latest.pages[scope]?.updatedAt) || 0;
    store = latest;
    if (!timestamp || (!interaction && timestamp <= latestTimestamp)) return true;
    store.pages[scope] = {
      ...(latest.pages[scope] || {}),
      ...payload,
      scrollY: Math.max(0, Math.round(Number(payload.scrollY ?? window.scrollY) || 0)),
      updatedAt: timestamp
    };
    store.updatedAt = Math.max(Number(store.updatedAt) || 0, timestamp);
    const recordSaved = writePageRecord(scope, store.pages[scope]);
    const saved = persist(recordSaved);
    if (recordSaved) prunePageRecords(scope);
    return saved;
  }

  function register(scope, provider) {
    if (scope && typeof provider === "function") providers.set(scope, provider);
    const saved = read(scope);
    activityAt.set(scope, Number(saved?.updatedAt) || 0);
    return saved;
  }

  function flush(scope, interaction = true) {
    const provider = providers.get(scope);
    if (!provider) return false;
    let payload;
    try { payload = provider(); } catch { return false; }
    return checkpoint(scope, payload || {}, { interaction });
  }

  function flushAll(interaction = false) {
    providers.forEach((_, scope) => flush(scope, interaction));
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
      suppressScroll();
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

  function suppressScroll(milliseconds = 1800) {
    suppressScrollUntil = Math.max(suppressScrollUntil, Date.now() + Math.max(0, Number(milliseconds) || 0));
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
    const currentView = activeHomeView();
    const resumeSaved = !allowed.has(explicit)
      && saved
      && allowed.has(saved.view)
      && !(currentView === "report" && saved.view === "test");
    let view = allowed.has(explicit) ? explicit : currentView;
    let restoringHome = false;

    register("home", () => ({
      view: activeHomeView(),
      anchorId: "",
      scrollY: window.scrollY
    }));

    document.addEventListener("click", (event) => {
      const target = event.target.closest?.("[data-action]");
      if (!target) return;
      if (restoringHome) return;
      const action = target.dataset.action;
      const tracked = new Set(["home", "start", "report", "mindmap", "orid", "submit", "reset", "prev", "next", "goto", "select", "order-add", "order-remove"]);
      if (!tracked.has(action)) return;
      setTimeout(() => {
        view = activeHomeView();
        flush("home", true);
      }, 0);
    }, true);

    requestAnimationFrame(() => {
      if (resumeSaved && saved.view !== activeHomeView()) {
        const action = saved.view === "test" ? "start" : saved.view;
        const button = document.querySelector?.('[data-action="' + action + '"]');
        if (button && !button.disabled) {
          restoringHome = true;
          button.click();
          restoringHome = false;
        }
      }
      view = activeHomeView();
      if (resumeSaved) restore("home", {
        position: saved,
        label: view === "test" ? "诊断题" : view === "mindmap" ? "思维导图" : view === "orid" ? "ORID反思" : view === "report" ? "诊断报告" : "能力地图"
      });
      else flush("home", true);

      if (typeof MutationObserver === "function") {
        const observedRoot = document.getElementById?.("app") || document.body;
        if (observedRoot) {
          const observer = new MutationObserver(() => {
            const nextView = activeHomeView();
            if (nextView === view) return;
            view = nextView;
            flush("home", true);
          });
          observer.observe(observedRoot, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
        }
      }
    });
  }

  window.addEventListener("scroll", () => {
    if (Date.now() < suppressScrollUntil) return;
    const latest = loadStore();
    providers.forEach((_, scope) => markInteraction(scope, latest));
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => flushAll(false), 350);
  }, { passive: true });

  ["wheel", "touchmove", "pointerdown", "keydown"].forEach((type) => {
    window.addEventListener(type, () => { suppressScrollUntil = 0; }, { passive: true, capture: true });
  });

  window.addEventListener("pagehide", () => flushAll(false));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll(false);
  });

  window.addEventListener("storage", (event) => {
    if (event.key === KEY || event.key === BACKUP_KEY || event.key?.startsWith(PAGE_RECORD_PREFIX)) store = loadStore();
  });

  window.addEventListener("fumi-save-status", (event) => {
    dispatchStatus(event.detail?.ok !== false, event.detail?.timestamp || Date.now());
  });

  window.addEventListener("offline", () => {
    toast("网络已中断：可继续学习和作答；FUMI AI需要联网，进度仍保存在本机");
  });
  window.addEventListener("online", () => {
    toast("网络已恢复，学习进度未受影响");
  });

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("/service-worker.js", {
      scope: "/",
      updateViaCache: "none"
    }).catch(() => {});
  }

  if (navigator.storage?.persist) {
    document.addEventListener("pointerdown", () => {
      navigator.storage.persist().catch(() => {});
    }, { once: true, capture: true });
  }

  window.FumiRecovery = { read, checkpoint, register, flush, flushAll, restore, suppressScroll, toast };
  initHomeRecovery();
})();
