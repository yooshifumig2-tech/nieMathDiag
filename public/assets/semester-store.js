(function () {
  "use strict";
  // Each answer, completion, note and position is an independent record. Position
  // writes cannot replace answer records or clear an outstanding save failure.
  const PREFIX="fumi-semester:v1:";
  const BACKUP="fumi-semester:backup:v1:";
  const DB="fumi-semester-progress-v1";
  const records=new Map(), pending=new Map();
  const writer=globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  let clock=0, db=null, initialized=false, databaseAvailable=false;
  const listeners=new Set();
  const copy=v=>JSON.parse(JSON.stringify(v));
  const validKey=k=>typeof k==="string" && /^(answer|review|note|position|paper):[a-zA-Z0-9:._-]{1,180}$/.test(k);
  function validRecord(r) {
    return r && validKey(r.key) && Number.isFinite(r.time) && r.time>0 && r.time<1e16 && typeof r.writer==="string" && r.writer.length<100 && r.value!==undefined && JSON.stringify(r.value).length<100000;
  }
  function newer(a,b) { return !b || a.time>b.time || (a.time===b.time && a.writer>b.writer); }
  function merge(r) {
    if(!validRecord(r))return false;
    clock=Math.max(clock,r.time);
    if(newer(r,records.get(r.key))){records.set(r.key,copy(r));return true;}
    return false;
  }
  function readLocal(){
    for(const prefix of [PREFIX,BACKUP]){
      try { for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(!key?.startsWith(prefix))continue;
        try { merge(JSON.parse(localStorage.getItem(key))); }catch{}
      }}catch{}
    }
  }
  function emit() { listeners.forEach(fn=>fn(status())); }
  function status(){
    const rows=[...pending.values()];
    return {ready:initialized,unsaved:rows.filter(p=>!p.local&&!p.database).length,
      secondaryPending:rows.filter(p=>p.local&&!p.database).length,
      databaseAvailable,records:records.size};
  }
  function writeLocal(r){
    const payload=JSON.stringify(r);let ok=false;
    for(const prefix of [PREFIX,BACKUP]){
      try {
        const current=JSON.parse(localStorage.getItem(prefix+r.key)||"null");
        if(validRecord(current)&&newer(current,r)){merge(current);continue;}
        localStorage.setItem(prefix+r.key,payload);
        ok=localStorage.getItem(prefix+r.key)===payload||ok;
      }catch{}
    }
    return ok;
  }
  function openDatabase(){
    return new Promise(resolve=>{
      if(!globalThis.indexedDB){resolve(null);return;}
      let settled=false;
      const finish=value=>{if(!settled){settled=true;clearTimeout(timer);resolve(value);}};
      const timer=setTimeout(()=>finish(null),2500);
      try {
        const request=indexedDB.open(DB,1);
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("records"))request.result.createObjectStore("records",{keyPath:"key"});};
        request.onerror=()=>finish(null);request.onblocked=()=>finish(null);
        request.onsuccess=()=>{
          db=request.result;databaseAvailable=true;
          db.onversionchange=()=>{db.close();db=null;databaseAvailable=false;};
          if(settled)hydrateDatabase().then(()=>{retry();emit();});
          else finish(db);
        };
      }catch{finish(null);}
    });
  }
  function hydrateDatabase(){
    return new Promise(resolve=>{
      if(!db){resolve();return;}
      let ended=false;const finish=()=>{if(!ended){ended=true;clearTimeout(timer);resolve();}};
      const timer=setTimeout(finish,2500);
      try {
        const tx=db.transaction("records","readonly"), request=tx.objectStore("records").getAll();
        request.onsuccess=()=>{request.result.forEach(merge);};
        tx.oncomplete=finish;tx.onerror=finish;tx.onabort=finish;
      }catch{finish();}
    });
  }
  function writeDatabase(r){
    return new Promise(resolve=>{
      if(!db){resolve(false);return;}
      let settled=false;const finish=ok=>{if(!settled){settled=true;clearTimeout(timer);resolve(ok);}};
      const timer=setTimeout(()=>finish(false),2500);
      try {
        const tx=db.transaction("records","readwrite"),store=tx.objectStore("records"),get=store.get(r.key);
        get.onsuccess=()=>{
          if(validRecord(get.result)&&newer(get.result,r))merge(get.result);
          else store.put(r);
        };
        tx.oncomplete=()=>finish(true);tx.onerror=()=>finish(false);tx.onabort=()=>finish(false);
      }catch{finish(false);}
    });
  }
  function persist(r){
    const entry={record:r,local:writeLocal(r),database:false};
    pending.set(r.key,entry);emit();
    writeDatabase(r).then(ok=>{
      if(pending.get(r.key)!==entry)return;
      entry.database=ok;
      if(ok)pending.delete(r.key);
      emit();
    });
    return entry.local;
  }
  function set(key,value){
    if(!validKey(key))throw new Error("不支持的进度记录");
    const r={key,value:copy(value),time:Math.max(Date.now(),clock+1),writer};
    if(!validRecord(r))throw new Error("记录过长，请缩短笔记后重试");
    merge(r);persist(r);return copy(r.value);
  }
  function get(key,fallback=null){const r=records.get(key);return r?copy(r.value):fallback;}
  function retry(){
    for(const p of [...pending.values()])persist(p.record);
    emit();
  }
  function flushLocal(){
    for(const p of pending.values())p.local=writeLocal(p.record)||p.local;
    emit();
  }
  function exportData(){return {format:"fumi-semester-progress",version:1,exportedAt:new Date().toISOString(),records:[...records.values()].map(copy)};}
  function importData(payload){
    if(payload?.format!=="fumi-semester-progress"||payload.version!==1||!Array.isArray(payload.records)||payload.records.length>4000)throw new Error("这不是本网站的总复习备份文件。");
    if(payload.records.some(r=>!validRecord(r)))throw new Error("备份内容不完整，未导入任何记录。");
    let count=0;
    for(const r of payload.records)if(merge(r)){persist(r);count++;}
    emit();return count;
  }
  const ready=(async()=>{
    readLocal();await openDatabase();await hydrateDatabase();readLocal();
    // Repair a missing browser copy after recovering from the other store.
    for(const r of records.values())persist(r);
    initialized=true;emit();
  })();
  window.addEventListener("storage",e=>{
    if(!e.key?.startsWith(PREFIX)&&!e.key?.startsWith(BACKUP))return;
    try{if(merge(JSON.parse(e.newValue)))window.dispatchEvent(new CustomEvent("semester-progress-updated"));}catch{}
  });
  window.addEventListener("online",retry);
  window.addEventListener("focus",retry);
  window.addEventListener("pagehide",flushLocal);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushLocal();else retry();});
  setInterval(retry,15000);
  window.SemesterStore={ready,set,get,status,retry,exportData,importData,subscribe(fn){listeners.add(fn);fn(status());return()=>listeners.delete(fn);}};
})();
