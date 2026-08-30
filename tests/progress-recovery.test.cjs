const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const CORE_SOURCE = read("public/assets/math-core.js");
const RECOVERY_SOURCE = read("public/assets/progress-resilience.js");
const LEARN_SOURCE = read("public/assets/math-learn.js");
const PRACTICE_SOURCE = read("public/assets/math-practice.js");
const SW_SOURCE = read("public/service-worker.js");
const DATA_FILES = [
  "public/assets/math-course-data.js",
  "public/assets/math-course-data-15-16.js",
  "public/assets/math-course-data-17-18.js",
  "public/assets/math-review-data.js",
  "public/assets/math-review-data-15-16.js",
  "public/assets/math-review-data-17-18.js"
];

function storageFrom(shared = new Map(), options = {}) {
  return {
    get length() {
      return shared.size;
    },
    key(index) {
      return [...shared.keys()][index] ?? null;
    },
    getItem(key) {
      return shared.has(key) ? shared.get(key) : null;
    },
    setItem(key, value) {
      if (options.failWrites) throw new Error("storage blocked");
      options.beforeWrite?.(key, String(value));
      if (options.failWrite?.(key, String(value))) throw new Error("selected storage write blocked");
      if (!options.ignoreWrites) shared.set(key, String(value));
    },
    removeItem(key) {
      shared.delete(key);
    }
  };
}

function browserContext({ storage = storageFrom(), hash = "", pathname = "/math-learn.html" } = {}) {
  const windowListeners = new Map();
  const documentListeners = new Map();
  const dispatched = [];
  const app = { innerHTML: "" };
  const document = {
    head: { append() {} },
    body: { append() {} },
    visibilityState: "visible",
    createElement() {
      return { append() {}, remove() {}, classList: { toggle() {} }, setAttribute() {} };
    },
    getElementById(id) {
      if (id === "app") return app;
      return null;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, handler) {
      const rows = documentListeners.get(type) || [];
      rows.push(handler);
      documentListeners.set(type, rows);
    }
  };
  const context = {
    console,
    document,
    localStorage: storage,
    location: {
      hash,
      pathname,
      search: "",
      protocol: "https:",
      hostname: "example.test"
    },
    navigator: {},
    scrollY: 0,
    scrollTo() {},
    print() {},
    requestAnimationFrame(callback) { callback(); return 1; },
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    addEventListener(type, handler) {
      const rows = windowListeners.get(type) || [];
      rows.push(handler);
      windowListeners.set(type, rows);
    },
    dispatchEvent(event) {
      dispatched.push(event);
      (windowListeners.get(event.type) || []).forEach((handler) => handler(event));
      return true;
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  return { context, app, document, windowListeners, documentListeners, dispatched };
}

function loadCourseData(context) {
  DATA_FILES.forEach((file) => vm.runInContext(read(file), context, { filename: file }));
}

function makeCore(shared, storageOptions) {
  const fixture = browserContext({ storage: storageFrom(shared, storageOptions) });
  loadCourseData(fixture.context);
  vm.runInContext(CORE_SOURCE, fixture.context, { filename: "math-core.js" });
  return fixture;
}

test("all course and practice IDs remain complete and unique", () => {
  const fixture = browserContext();
  loadCourseData(fixture.context);
  const lessonIds = fixture.context.MathCourseData.lessons.map((item) => item.id);
  const practiceIds = fixture.context.MathCourseData.practice.map((item) => item.id);
  assert.equal(lessonIds.length, 48);
  assert.equal(new Set(lessonIds).size, lessonIds.length);
  assert.equal(practiceIds.length, 222);
  assert.equal(new Set(practiceIds).size, practiceIds.length);
});

test("course progress keeps legacy records and recovers from the backup", () => {
  const shared = new Map();
  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: { "13-1": { done: true, answers: { i131: 1 } } },
    practice: { answers: { "p-l131a": 2 }, submitted: {}, step: {} },
    updatedAt: 12
  }));
  let fixture = makeCore(shared);
  assert.equal(fixture.context.MathCore.state.lesson["13-1"].answers.i131, 1);
  assert.equal(fixture.context.MathCore.state.practice.answers["p-l131a"], 2);

  shared.set("fumi-math-course:v2", "{broken-json");
  shared.set("fumi-math-course:backup:v2", JSON.stringify({
    lesson: { "17-1-1": { answers: { i1711: 0 } } },
    practice: { answers: {}, submitted: {}, step: {} },
    updatedAt: 99
  }));
  fixture = makeCore(shared);
  assert.equal(fixture.context.MathCore.state.lesson["17-1-1"].answers.i1711, 0);
});

test("interleaved tabs merge lesson answers and practice work without loss", () => {
  const shared = new Map();
  const tabA = makeCore(shared);
  const tabB = makeCore(shared);
  const lesson = tabA.context.MathCourseData.lessons[0];
  const practiceId = tabA.context.MathCourseData.practice[0].id;

  tabA.context.MathCore.state.lesson[lesson.id] = { answers: { [lesson.inquiry.id]: 1 } };
  assert.equal(tabA.context.MathCore.save({ lessonId: lesson.id, lessonAnswerId: lesson.inquiry.id }), true);

  tabB.context.MathCore.state.practice.answers[practiceId] = 2;
  tabB.context.MathCore.state.practice.submitted[practiceId] = 123;
  tabB.context.MathCore.state.practice.step[practiceId] = 3;
  assert.equal(tabB.context.MathCore.save({ practiceId, practiceFields: ["answers", "submitted", "step"] }), true);

  const tabC = makeCore(shared);
  assert.equal(tabC.context.MathCore.state.lesson[lesson.id].answers[lesson.inquiry.id], 1);
  assert.equal(tabC.context.MathCore.state.practice.answers[practiceId], 2);
  assert.equal(tabC.context.MathCore.state.practice.step[practiceId], 3);

  const tabD = makeCore(shared);
  const tabE = makeCore(shared);
  const firstCheck = lesson.checks[0].id;
  const secondCheck = lesson.checks[1].id;
  tabD.context.MathCore.state.lesson[lesson.id].answers[firstCheck] = 0;
  tabD.context.MathCore.save({ lessonId: lesson.id, lessonAnswerId: firstCheck });
  tabE.context.MathCore.state.lesson[lesson.id].answers[secondCheck] = 3;
  tabE.context.MathCore.save({ lessonId: lesson.id, lessonAnswerId: secondCheck });

  const tabF = makeCore(shared);
  assert.equal(tabF.context.MathCore.state.lesson[lesson.id].answers[firstCheck], 0);
  assert.equal(tabF.context.MathCore.state.lesson[lesson.id].answers[secondCheck], 3);
});

test("field-level practice saves cannot roll back another tab's answer", () => {
  const shared = new Map();
  const tabA = makeCore(shared);
  const tabB = makeCore(shared);
  const practiceId = tabA.context.MathCourseData.practice[0].id;
  tabA.context.MathCore.state.practice.answers[practiceId] = 2;
  tabA.context.MathCore.save({ practiceId, practiceFields: ["answers"] });
  tabB.context.MathCore.state.practice.step[practiceId] = 4;
  tabB.context.MathCore.save({ practiceId, practiceFields: ["step"] });
  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.practice.answers[practiceId], 2);
  assert.equal(reloaded.context.MathCore.state.practice.step[practiceId], 4);
});

test("submission atomically freezes the answer across stale tabs", () => {
  const shared = new Map();
  const staleTab = makeCore(shared);
  const submitTab = makeCore(shared);
  const practiceId = staleTab.context.MathCourseData.practice[0].id;
  staleTab.context.MathCore.state.practice.answers[practiceId] = 0;
  submitTab.context.MathCore.state.practice.answers[practiceId] = 0;
  submitTab.context.MathCore.save({ practiceId, practiceFields: ["answers"] });
  submitTab.context.MathCore.state.practice.submitted[practiceId] = 1000;
  submitTab.context.MathCore.state.practice.step[practiceId] = 1;
  submitTab.context.MathCore.save({ practiceId, practiceSubmit: true, practiceFields: ["answers", "submitted", "step"] });
  staleTab.context.MathCore.state.practice.answers[practiceId] = 1;
  staleTab.context.MathCore.save({ practiceId, practiceFields: ["answers"] });
  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.practice.submitted[practiceId], 1000);
  assert.equal(reloaded.context.MathCore.state.practice.answers[practiceId], 0);
});

test("lesson completion freezes its full answer snapshot", () => {
  const shared = new Map();
  const staleTab = makeCore(shared);
  const completeTab = makeCore(shared);
  const lesson = completeTab.context.MathCourseData.lessons[0];
  const answers = {
    [lesson.inquiry.id]: lesson.inquiry.answer,
    [lesson.checks[0].id]: lesson.checks[0].answer,
    [lesson.checks[1].id]: lesson.checks[1].answer
  };
  staleTab.context.MathCore.state.lesson[lesson.id] = { answers: { ...answers } };
  completeTab.context.MathCore.state.lesson[lesson.id] = { answers: { ...answers }, done: true, completedAt: 1000 };
  completeTab.context.MathCore.save({ lessonId: lesson.id });
  staleTab.context.MathCore.state.lesson[lesson.id].answers[lesson.inquiry.id] = (lesson.inquiry.answer + 1) % lesson.inquiry.options.length;
  staleTab.context.MathCore.save({ lessonId: lesson.id, lessonAnswerId: lesson.inquiry.id });
  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.lesson[lesson.id].done, true);
  assert.equal(reloaded.context.MathCore.state.lesson[lesson.id].answers[lesson.inquiry.id], lesson.inquiry.answer);
});

test("equal wall-clock submissions and completions keep the first journal evidence", () => {
  const shared = new Map();
  const first = makeCore(shared);
  const second = makeCore(shared);
  const practiceId = first.context.MathCourseData.practice[0].id;
  first.context.MathCore.state.practice.answers[practiceId] = 0;
  first.context.MathCore.state.practice.submitted[practiceId] = 500;
  first.context.MathCore.state.practice.step[practiceId] = 1;
  first.context.MathCore.save({ practiceId, practiceSubmit: true, practiceFields: ["answers", "submitted", "step"] });
  second.context.MathCore.state.practice.answers[practiceId] = 1;
  second.context.MathCore.state.practice.submitted[practiceId] = 500;
  second.context.MathCore.state.practice.step[practiceId] = 1;
  second.context.MathCore.save({ practiceId, practiceSubmit: true, practiceFields: ["answers", "submitted", "step"] });

  const firstLesson = makeCore(shared);
  const secondLesson = makeCore(shared);
  const lesson = firstLesson.context.MathCourseData.lessons[0];
  firstLesson.context.MathCore.state.lesson[lesson.id] = { answers: { [lesson.inquiry.id]: 1 }, done: true, completedAt: 700 };
  firstLesson.context.MathCore.save({ lessonId: lesson.id });
  secondLesson.context.MathCore.state.lesson[lesson.id] = { answers: { [lesson.inquiry.id]: 2 }, done: true, completedAt: 700 };
  secondLesson.context.MathCore.save({ lessonId: lesson.id });

  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.practice.answers[practiceId], 0);
  assert.equal(reloaded.context.MathCore.state.lesson[lesson.id].answers[lesson.inquiry.id], 1);
});

test("journal order survives a wall-clock rollback between submissions and completions", () => {
  const shared = new Map();
  const first = makeCore(shared);
  const second = makeCore(shared);
  vm.runInContext("Date.now = () => 2000", first.context);
  vm.runInContext("Date.now = () => 1000", second.context);
  const practiceId = first.context.MathCourseData.practice[0].id;
  first.context.MathCore.state.practice.answers[practiceId] = 0;
  first.context.MathCore.state.practice.submitted[practiceId] = 2000;
  first.context.MathCore.state.practice.step[practiceId] = 1;
  first.context.MathCore.save({ practiceId, practiceSubmit: true, practiceFields: ["answers", "submitted", "step"] });
  second.context.MathCore.state.practice.answers[practiceId] = 1;
  second.context.MathCore.state.practice.submitted[practiceId] = 1000;
  second.context.MathCore.state.practice.step[practiceId] = 1;
  second.context.MathCore.save({ practiceId, practiceSubmit: true, practiceFields: ["answers", "submitted", "step"] });

  const firstLesson = makeCore(shared);
  const secondLesson = makeCore(shared);
  vm.runInContext("Date.now = () => 4000", firstLesson.context);
  vm.runInContext("Date.now = () => 3000", secondLesson.context);
  const lesson = firstLesson.context.MathCourseData.lessons[0];
  firstLesson.context.MathCore.state.lesson[lesson.id] = { answers: { [lesson.inquiry.id]: 1 }, done: true, completedAt: 4000 };
  firstLesson.context.MathCore.save({ lessonId: lesson.id });
  secondLesson.context.MathCore.state.lesson[lesson.id] = { answers: { [lesson.inquiry.id]: 2 }, done: true, completedAt: 3000 };
  secondLesson.context.MathCore.save({ lessonId: lesson.id });

  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.practice.answers[practiceId], 0);
  assert.equal(reloaded.context.MathCore.state.practice.submitted[practiceId], 2000);
  assert.equal(reloaded.context.MathCore.state.lesson[lesson.id].answers[lesson.inquiry.id], 1);
  assert.equal(reloaded.context.MathCore.state.lesson[lesson.id].completedAt, 4000);
});

test("high-resolution ordering resolves writes interleaved before either record lands", () => {
  const shared = new Map();
  let second;
  let triggered = false;
  const first = makeCore(shared, {
    beforeWrite(key) {
      if (triggered || !key.startsWith("fumi-math-course:record:v2:")) return;
      triggered = true;
      second.context.MathCore.save({
        practiceId: second.context.MathCourseData.practice[0].id,
        practiceSubmit: true,
        practiceFields: ["answers", "submitted", "step"]
      });
    }
  });
  second = makeCore(shared);
  vm.runInContext("Date.now = () => 1000", first.context);
  vm.runInContext("Date.now = () => 1000", second.context);
  first.context.performance = { timeOrigin: 1000, now: () => 0.1 };
  second.context.performance = { timeOrigin: 1000, now: () => 0.2 };
  const practiceId = first.context.MathCourseData.practice[0].id;
  first.context.MathCore.state.practice.answers[practiceId] = 0;
  first.context.MathCore.state.practice.submitted[practiceId] = 500;
  first.context.MathCore.state.practice.step[practiceId] = 1;
  second.context.MathCore.state.practice.answers[practiceId] = 1;
  second.context.MathCore.state.practice.submitted[practiceId] = 500;
  second.context.MathCore.state.practice.step[practiceId] = 1;
  first.context.MathCore.save({ practiceId, practiceSubmit: true, practiceFields: ["answers", "submitted", "step"] });
  assert.equal(makeCore(shared).context.MathCore.state.practice.answers[practiceId], 0);

  const lessonShared = new Map();
  let secondLesson;
  let lessonTriggered = false;
  const firstLesson = makeCore(lessonShared, {
    beforeWrite(key, value) {
      if (lessonTriggered || !key.startsWith("fumi-math-course:record:v2:")) return;
      let record;
      try { record = JSON.parse(value); } catch { return; }
      if (record.type !== "lesson") return;
      lessonTriggered = true;
      secondLesson.context.MathCore.save({ lessonId: record.lessonId });
    }
  });
  secondLesson = makeCore(lessonShared);
  vm.runInContext("Date.now = () => 2000", firstLesson.context);
  vm.runInContext("Date.now = () => 2000", secondLesson.context);
  firstLesson.context.performance = { timeOrigin: 2000, now: () => 0.1 };
  secondLesson.context.performance = { timeOrigin: 2000, now: () => 0.2 };
  const lesson = firstLesson.context.MathCourseData.lessons[0];
  firstLesson.context.MathCore.state.lesson[lesson.id] = { answers: { [lesson.inquiry.id]: 1 }, done: true, completedAt: 800 };
  secondLesson.context.MathCore.state.lesson[lesson.id] = { answers: { [lesson.inquiry.id]: 2 }, done: true, completedAt: 800 };
  firstLesson.context.MathCore.save({ lessonId: lesson.id });
  assert.equal(makeCore(lessonShared).context.MathCore.state.lesson[lesson.id].answers[lesson.inquiry.id], 1);
});

test("per-record journal survives a stale whole-snapshot overwrite", () => {
  const shared = new Map();
  const tabA = makeCore(shared);
  const tabB = makeCore(shared);
  const firstId = tabA.context.MathCourseData.practice[0].id;
  const secondId = tabA.context.MathCourseData.practice[1].id;
  tabA.context.MathCore.state.practice.answers[firstId] = 1;
  tabA.context.MathCore.save({ practiceId: firstId, practiceFields: ["answers"] });
  const staleSnapshot = shared.get("fumi-math-course:v2");
  tabB.context.MathCore.state.practice.answers[secondId] = 3;
  tabB.context.MathCore.save({ practiceId: secondId, practiceFields: ["answers"] });
  shared.set("fumi-math-course:v2", staleSnapshot);
  shared.set("fumi-math-course:backup:v2", staleSnapshot);
  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.practice.answers[firstId], 1);
  assert.equal(reloaded.context.MathCore.state.practice.answers[secondId], 3);
});

test("v2 journals stay authoritative when snapshots fail and v1 writes later", () => {
  const shared = new Map();
  const storageOptions = {
    failWrite(key) {
      return key === "fumi-math-course:v2" || key === "fumi-math-course:backup:v2";
    }
  };
  const current = makeCore(shared, storageOptions);
  const practiceId = current.context.MathCourseData.practice[0].id;
  const lesson = current.context.MathCourseData.lessons[0];
  current.context.MathCore.state.practice.answers[practiceId] = 1;
  assert.equal(current.context.MathCore.save({ practiceId, practiceFields: ["answers"] }), true);
  current.context.MathCore.state.lesson[lesson.id] = {
    answers: { [lesson.inquiry.id]: 1 },
    done: true,
    completedAt: 500
  };
  assert.equal(current.context.MathCore.save({ lessonId: lesson.id }), true);

  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: { [lesson.id]: { answers: { [lesson.inquiry.id]: 0 }, done: false } },
    practice: { answers: { [practiceId]: 0 }, submitted: {}, step: {} },
    updatedAt: Date.now() + 100000
  }));
  const reloaded = makeCore(shared, storageOptions);
  assert.equal(reloaded.context.MathCore.state.practice.answers[practiceId], 1);
  assert.equal(reloaded.context.MathCore.state.lesson[lesson.id].done, true);
  assert.equal(reloaded.context.MathCore.state.lesson[lesson.id].answers[lesson.inquiry.id], 1);
});

test("append-only records keep a newer same-field write after delayed stale storage", () => {
  const shared = new Map();
  const older = makeCore(shared);
  const newer = makeCore(shared);
  const practiceId = older.context.MathCourseData.practice[0].id;
  older.context.MathCore.state.practice.answers[practiceId] = 0;
  older.context.MathCore.save({ practiceId, practiceFields: ["answers"] });
  const staleSnapshot = shared.get("fumi-math-course:v2");
  const oldRecord = [...shared.entries()].find(([key, value]) => key.startsWith("fumi-math-course:record:v2:") && JSON.parse(value).questionId === practiceId);
  newer.context.MathCore.state.practice.answers[practiceId] = 1;
  newer.context.MathCore.save({ practiceId, practiceFields: ["answers"] });
  const answerRecords = [...shared.keys()].filter((key) => key.startsWith("fumi-math-course:record:v2:"));
  assert.ok(answerRecords.length >= 2);
  shared.set("fumi-math-course:record:v2:delayed-old", oldRecord[1]);
  shared.set("fumi-math-course:v2", staleSnapshot);
  shared.set("fumi-math-course:backup:v2", staleSnapshot);
  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.practice.answers[practiceId], 1);
});

test("v2 migration isolates progress from stale v1 tabs", () => {
  const shared = new Map();
  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: { "13-1": { answers: { i131: 1 } } },
    practice: { answers: {}, submitted: {}, step: {} },
    updatedAt: 100
  }));
  makeCore(shared);
  assert.ok(shared.has("fumi-math-course:v2"));
  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: { "13-1": { answers: { i131: 0 } } },
    practice: { answers: {}, submitted: {}, step: {} },
    updatedAt: 999
  }));
  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.lesson["13-1"].answers.i131, 1);
});

test("v2 safely absorbs new answers and completion evidence from a still-open v1 tab", () => {
  const shared = new Map();
  const current = makeCore(shared);
  const lesson = current.context.MathCourseData.lessons[0];
  const firstQuestion = lesson.inquiry.id;
  const secondQuestion = lesson.checks[0].id;
  const answerOnlyId = current.context.MathCourseData.practice[0].id;
  const submittedId = current.context.MathCourseData.practice[1].id;

  current.context.MathCore.state.lesson[lesson.id] = { answers: { [firstQuestion]: 1 } };
  current.context.MathCore.save({ lessonId: lesson.id, lessonAnswerId: firstQuestion });
  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: { [lesson.id]: { answers: { [firstQuestion]: 0, [secondQuestion]: 2 } } },
    practice: {
      answers: { [answerOnlyId]: 3, [submittedId]: 1 },
      submitted: { [submittedId]: 600 },
      step: { [submittedId]: 3 }
    },
    updatedAt: 1000
  }));

  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.lesson[lesson.id].answers[firstQuestion], 1);
  assert.equal(reloaded.context.MathCore.state.lesson[lesson.id].answers[secondQuestion], 2);
  assert.equal(reloaded.context.MathCore.state.practice.answers[answerOnlyId], 3);
  assert.equal(reloaded.context.MathCore.state.practice.answers[submittedId], 1);
  assert.equal(reloaded.context.MathCore.state.practice.submitted[submittedId], 600);
  assert.equal(reloaded.context.MathCore.state.practice.step[submittedId], 3);
  assert.ok([...shared.entries()].some(([key, value]) => (
    key.startsWith("fumi-math-course:record:v2:")
    && JSON.parse(value).type === "legacy-import"
  )));

  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: {},
    practice: { answers: {}, submitted: {}, step: {} },
    updatedAt: 2000
  }));
  const afterLegacyOverwrite = makeCore(shared);
  assert.equal(afterLegacyOverwrite.context.MathCore.state.lesson[lesson.id].answers[secondQuestion], 2);
  assert.equal(afterLegacyOverwrite.context.MathCore.state.practice.answers[answerOnlyId], 3);
  assert.equal(afterLegacyOverwrite.context.MathCore.state.practice.submitted[submittedId], 600);
});

test("stale legacy fields cannot outrank an existing v2 journal record", () => {
  const shared = new Map();
  const current = makeCore(shared);
  const staleSnapshot = shared.get("fumi-math-course:v2");
  const practiceId = current.context.MathCourseData.practice[0].id;
  current.context.MathCore.state.practice.answers[practiceId] = 1;
  current.context.MathCore.save({ practiceId, practiceFields: ["answers"] });
  shared.set("fumi-math-course:v2", staleSnapshot);
  shared.set("fumi-math-course:backup:v2", staleSnapshot);
  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: {},
    practice: { answers: { [practiceId]: 0 }, submitted: {}, step: {} },
    updatedAt: Date.now() + 100000
  }));
  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.practice.answers[practiceId], 1);
});

test("legacy explanation steps cannot override a deliberate v2 step rewind", () => {
  const shared = new Map();
  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: {},
    practice: { answers: { q: 1 }, submitted: { q: 500 }, step: { q: 4 } },
    updatedAt: 600
  }));
  const migrated = makeCore(shared);
  assert.equal(migrated.context.MathCore.state.practice.step.q, 4);
  migrated.context.MathCore.state.practice.step.q = 1;
  migrated.context.MathCore.save({ practiceId: "q", practiceFields: ["step"] });
  const reloaded = makeCore(shared);
  assert.equal(reloaded.context.MathCore.state.practice.step.q, 1);
});

test("a failed legacy import record is not presented as durable progress", () => {
  const shared = new Map();
  makeCore(shared);
  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: { "13-1": { answers: { i131: 2 } } },
    practice: { answers: {}, submitted: {}, step: {} },
    updatedAt: 2000
  }));
  const blocked = makeCore(shared, {
    failWrite(key, value) {
      if (!key.startsWith("fumi-math-course:record:v2:")) return false;
      try { return JSON.parse(value).type === "legacy-import"; } catch { return false; }
    }
  });
  assert.equal(blocked.context.MathCore.state.lesson["13-1"], undefined);
  const status = blocked.dispatched.findLast((event) => event.type === "fumi-save-status");
  assert.equal(status.detail.ok, false);

  const retried = makeCore(shared);
  assert.equal(retried.context.MathCore.state.lesson["13-1"].answers.i131, 2);
});

test("legacy snapshots without metadata use snapshot time for conflict resolution", () => {
  const shared = new Map();
  shared.set("fumi-math-course:v2", JSON.stringify({
    lesson: { "13-1": { answers: { i131: 0 } } },
    practice: { answers: {}, submitted: {}, step: {} },
    updatedAt: 100
  }));
  shared.set("fumi-math-course:backup:v2", JSON.stringify({
    lesson: { "13-1": { answers: { i131: 1 } } },
    practice: { answers: {}, submitted: {}, step: {} },
    updatedAt: 200
  }));
  const fixture = makeCore(shared);
  assert.equal(fixture.context.MathCore.state.lesson["13-1"].answers.i131, 1);
});

test("legacy migration keeps submitted answer evidence atomic", () => {
  const shared = new Map();
  shared.set("fumi-math-course:v1", JSON.stringify({
    lesson: {},
    practice: { answers: { q: 0, unrelated: 2 }, submitted: {}, step: {} },
    updatedAt: 200
  }));
  shared.set("fumi-math-course:backup:v1", JSON.stringify({
    lesson: {},
    practice: { answers: { q: 1 }, submitted: { q: 140 }, step: { q: 1 } },
    updatedAt: 150
  }));
  const fixture = makeCore(shared);
  assert.equal(fixture.context.MathCore.state.practice.submitted.q, 140);
  assert.equal(fixture.context.MathCore.state.practice.answers.q, 1);
});

test("partial field journal failure cannot masquerade as a successful save", () => {
  const shared = new Map();
  const fixture = makeCore(shared, {
    failWrite(key) {
      const decoded = decodeURIComponent(key);
      return key === "fumi-math-course:v2"
        || key === "fumi-math-course:backup:v2"
        || decoded.includes("|answers");
    }
  });
  const practiceId = fixture.context.MathCourseData.practice[0].id;
  fixture.context.MathCore.state.practice.answers[practiceId] = 2;
  fixture.context.MathCore.state.practice.step[practiceId] = 3;
  assert.equal(fixture.context.MathCore.save({ practiceId, practiceFields: ["answers", "step"] }), false);
});

test("snapshot-only success is reported as unsafe when its journal record fails", () => {
  const shared = new Map();
  const fixture = makeCore(shared, {
    failWrite(key) {
      return key.startsWith("fumi-math-course:record:v2:");
    }
  });
  const practiceId = fixture.context.MathCourseData.practice[0].id;
  fixture.context.MathCore.state.practice.answers[practiceId] = 2;
  assert.equal(fixture.context.MathCore.save({ practiceId, practiceFields: ["answers"] }), false);
  assert.ok(shared.has("fumi-math-course:v2"));
  const status = fixture.dispatched.findLast((event) => event.type === "fumi-save-status");
  assert.equal(status.detail.ok, false);
});

test("blocked browser storage reports a real save failure", () => {
  const fixture = makeCore(new Map(), { failWrites: true });
  const lesson = fixture.context.MathCourseData.lessons[0];
  fixture.context.MathCore.state.lesson[lesson.id] = { answers: { [lesson.inquiry.id]: 1 } };
  assert.equal(fixture.context.MathCore.save({ lessonId: lesson.id, lessonAnswerId: lesson.inquiry.id }), false);
  const status = fixture.dispatched.find((event) => event.type === "fumi-save-status");
  assert.equal(status.detail.ok, false);
});

test("position checkpoints flush on pagehide and register the service worker safely", async () => {
  const shared = new Map();
  const fixture = browserContext({ storage: storageFrom(shared) });
  let registration;
  fixture.context.navigator = {
    serviceWorker: {
      register(url, options) {
        registration = { url, options };
        return Promise.resolve();
      }
    },
    storage: { persist: () => Promise.resolve(true) }
  };
  vm.runInContext(RECOVERY_SOURCE, fixture.context, { filename: "progress-resilience.js" });
  fixture.context.scrollY = 120;
  fixture.context.FumiRecovery.register("learn", () => ({ chapterKey: "17", lessonId: "17-2", scrollY: fixture.context.scrollY }));
  (fixture.windowListeners.get("scroll") || []).forEach((handler) => handler());
  (fixture.windowListeners.get("pagehide") || []).forEach((handler) => handler());

  const saved = JSON.parse(shared.get("fumi-math-position:v2"));
  const backup = JSON.parse(shared.get("fumi-math-position:backup:v2"));
  assert.equal(saved.pages.learn.lessonId, "17-2");
  assert.equal(saved.pages.learn.scrollY, 120);
  assert.deepEqual(backup, saved);
  await Promise.resolve();
  assert.equal(registration.url, "/service-worker.js");
  assert.equal(registration.options.updateViaCache, "none");
});

test("position checkpoint detects silent storage refusal", () => {
  const fixture = browserContext({ storage: storageFrom(new Map(), { ignoreWrites: true }) });
  vm.runInContext(RECOVERY_SOURCE, fixture.context, { filename: "progress-resilience.js" });
  assert.equal(fixture.context.FumiRecovery.checkpoint("learn", { lessonId: "17-1" }), false);
  const status = fixture.dispatched.find((event) => event.type === "fumi-position-saved");
  assert.equal(status.detail.ok, false);
});

test("position snapshot alone is not reported safe when its page record fails", () => {
  const fixture = browserContext({
    storage: storageFrom(new Map(), {
      failWrite(key) { return key.startsWith("fumi-math-position:page:v2:"); }
    })
  });
  vm.runInContext(RECOVERY_SOURCE, fixture.context, { filename: "progress-resilience.js" });
  assert.equal(fixture.context.FumiRecovery.checkpoint("learn", { lessonId: "17-2", scrollY: 90 }), false);
  const status = fixture.dispatched.findLast((event) => event.type === "fumi-position-saved");
  assert.equal(status.detail.ok, false);
});

test("position v2 migration ignores later writes from an old v1 tab", () => {
  const shared = new Map();
  shared.set("fumi-math-position:v1", JSON.stringify({
    version: 1,
    updatedAt: 100,
    pages: { learn: { lessonId: "17-old", scrollY: 80, updatedAt: 100 } }
  }));
  const migrated = browserContext({ storage: storageFrom(shared) });
  vm.runInContext(RECOVERY_SOURCE, migrated.context, { filename: "progress-resilience.js" });
  assert.equal(migrated.context.FumiRecovery.read("learn").lessonId, "17-old");
  assert.ok(shared.has("fumi-math-position:v2"));

  shared.set("fumi-math-position:v1", JSON.stringify({
    version: 1,
    updatedAt: 999,
    pages: { learn: { lessonId: "stale-v1-close", scrollY: 10, updatedAt: 999 } }
  }));
  const reloaded = browserContext({ storage: storageFrom(shared) });
  vm.runInContext(RECOVERY_SOURCE, reloaded.context, { filename: "progress-resilience.js" });
  assert.equal(reloaded.context.FumiRecovery.read("learn").lessonId, "17-old");
});

test("partial position migration preserves every legacy scope through v2 records", () => {
  const shared = new Map();
  shared.set("fumi-math-position:v1", JSON.stringify({
    version: 1,
    updatedAt: 100,
    pages: {
      learn: { lessonId: "17-old", scrollY: 80, updatedAt: 100 },
      practice: { filterKey: "18", page: 3, scrollY: 160, updatedAt: 100 }
    }
  }));
  const storageOptions = {
    failWrite(key) {
      return key === "fumi-math-position:v2" || key === "fumi-math-position:backup:v2";
    }
  };
  const fixture = browserContext({ storage: storageFrom(shared, storageOptions) });
  vm.runInContext(RECOVERY_SOURCE, fixture.context, { filename: "progress-resilience.js" });
  assert.equal(fixture.context.FumiRecovery.read("practice").page, 3);
  assert.equal(fixture.context.FumiRecovery.checkpoint("learn", { lessonId: "17-new", scrollY: 200 }), true);

  [...shared.keys()].filter((key) => key.includes("position:v1")).forEach((key) => shared.delete(key));
  const reloaded = browserContext({ storage: storageFrom(shared, storageOptions) });
  vm.runInContext(RECOVERY_SOURCE, reloaded.context, { filename: "progress-resilience.js" });
  assert.equal(reloaded.context.FumiRecovery.read("learn").lessonId, "17-new");
  assert.equal(reloaded.context.FumiRecovery.read("practice").page, 3);
});

test("a legacy position scope is withheld when its v2 record cannot be verified", () => {
  const shared = new Map();
  shared.set("fumi-math-position:v1", JSON.stringify({
    version: 1,
    updatedAt: 100,
    pages: {
      learn: { lessonId: "17-old", scrollY: 80, updatedAt: 100 },
      practice: { filterKey: "18", page: 3, scrollY: 160, updatedAt: 100 }
    }
  }));
  const storageOptions = {
    failWrite(key, value) {
      if (key === "fumi-math-position:v2" || key === "fumi-math-position:backup:v2") return true;
      if (!key.startsWith("fumi-math-position:page:v2:")) return false;
      try { return JSON.parse(value).scope === "practice"; } catch { return false; }
    }
  };
  const fixture = browserContext({ storage: storageFrom(shared, storageOptions) });
  vm.runInContext(RECOVERY_SOURCE, fixture.context, { filename: "progress-resilience.js" });
  assert.equal(fixture.context.FumiRecovery.read("learn").lessonId, "17-old");
  assert.equal(fixture.context.FumiRecovery.read("practice"), null);
  const status = fixture.dispatched.findLast((event) => event.type === "fumi-position-saved");
  assert.equal(status.detail.ok, false);

  [...shared.keys()].filter((key) => key.includes("position:v1")).forEach((key) => shared.delete(key));
  const reloaded = browserContext({ storage: storageFrom(shared, storageOptions) });
  vm.runInContext(RECOVERY_SOURCE, reloaded.context, { filename: "progress-resilience.js" });
  assert.equal(reloaded.context.FumiRecovery.read("learn").lessonId, "17-old");
  assert.equal(reloaded.context.FumiRecovery.read("practice"), null);
});

test("per-page position records survive snapshot races and stale tab close", () => {
  const shared = new Map();
  const first = browserContext({ storage: storageFrom(shared) });
  const second = browserContext({ storage: storageFrom(shared), pathname: "/math-practice.html" });
  vm.runInContext(RECOVERY_SOURCE, first.context, { filename: "progress-resilience.js" });
  vm.runInContext(RECOVERY_SOURCE, second.context, { filename: "progress-resilience.js" });

  first.context.FumiRecovery.register("learn", () => ({ lessonId: "17-old", scrollY: 10 }));
  first.context.FumiRecovery.checkpoint("learn", { lessonId: "17-old", scrollY: 10 });
  const staleSnapshot = shared.get("fumi-math-position:v2");
  const oldLearnRecord = [...shared.entries()].find(([key, value]) => key.startsWith("fumi-math-position:page:v2:") && JSON.parse(value).scope === "learn");
  second.context.FumiRecovery.register("practice", () => ({ filterKey: "18", page: 2, scrollY: 20 }));
  second.context.FumiRecovery.checkpoint("practice", { filterKey: "18", page: 2, scrollY: 20 });
  shared.set("fumi-math-position:v2", staleSnapshot);
  shared.set("fumi-math-position:backup:v2", staleSnapshot);

  const reload = browserContext({ storage: storageFrom(shared) });
  vm.runInContext(RECOVERY_SOURCE, reload.context, { filename: "progress-resilience.js" });
  assert.equal(reload.context.FumiRecovery.read("learn").lessonId, "17-old");
  assert.equal(reload.context.FumiRecovery.read("practice").page, 2);

  const newer = browserContext({ storage: storageFrom(shared) });
  vm.runInContext(RECOVERY_SOURCE, newer.context, { filename: "progress-resilience.js" });
  newer.context.FumiRecovery.checkpoint("learn", { lessonId: "17-new", scrollY: 30 });
  const learnRecordCount = [...shared.keys()].filter((key) => key.startsWith("fumi-math-position:page:v2:")).length;
  assert.ok(learnRecordCount >= 3);
  shared.set("fumi-math-position:page:v2:delayed-old", oldLearnRecord[1]);
  shared.set("fumi-math-position:v2", staleSnapshot);
  shared.set("fumi-math-position:backup:v2", staleSnapshot);
  (first.windowListeners.get("pagehide") || []).forEach((handler) => handler());
  assert.equal(reload.context.FumiRecovery.read("learn").lessonId, "17-new");
});

test("suppressed programmatic scrolling cannot roll back a newer tab", () => {
  const shared = new Map();
  const older = browserContext({ storage: storageFrom(shared) });
  const newer = browserContext({ storage: storageFrom(shared) });
  vm.runInContext(RECOVERY_SOURCE, older.context, { filename: "progress-resilience.js" });
  vm.runInContext(RECOVERY_SOURCE, newer.context, { filename: "progress-resilience.js" });
  older.context.FumiRecovery.register("learn", () => ({ lessonId: "17-old", scrollY: 10 }));
  older.context.FumiRecovery.checkpoint("learn", { lessonId: "17-old", scrollY: 10 });
  newer.context.FumiRecovery.checkpoint("learn", { lessonId: "17-new", scrollY: 20 });

  older.context.FumiRecovery.suppressScroll(5000);
  (older.windowListeners.get("scroll") || []).forEach((handler) => handler());
  (older.windowListeners.get("pagehide") || []).forEach((handler) => handler());
  const reloaded = browserContext({ storage: storageFrom(shared) });
  vm.runInContext(RECOVERY_SOURCE, reloaded.context, { filename: "progress-resilience.js" });
  assert.equal(reloaded.context.FumiRecovery.read("learn").lessonId, "17-new");
});

test("high-resolution position ordering keeps the later interleaved interaction", () => {
  const shared = new Map();
  let newer;
  let triggered = false;
  const older = browserContext({
    storage: storageFrom(shared, {
      beforeWrite(key) {
        if (triggered || !key.startsWith("fumi-math-position:page:v2:")) return;
        triggered = true;
        newer.context.FumiRecovery.checkpoint("learn", { lessonId: "17-new", scrollY: 20 });
      }
    })
  });
  newer = browserContext({ storage: storageFrom(shared) });
  vm.runInContext(RECOVERY_SOURCE, older.context, { filename: "progress-resilience.js" });
  vm.runInContext(RECOVERY_SOURCE, newer.context, { filename: "progress-resilience.js" });
  vm.runInContext("Date.now = () => 1000", older.context);
  vm.runInContext("Date.now = () => 1000", newer.context);
  older.context.performance = { timeOrigin: 1000, now: () => 0.1 };
  newer.context.performance = { timeOrigin: 1000, now: () => 0.2 };
  older.context.FumiRecovery.checkpoint("learn", { lessonId: "17-old", scrollY: 10 });
  const reloaded = browserContext({ storage: storageFrom(shared) });
  vm.runInContext(RECOVERY_SOURCE, reloaded.context, { filename: "progress-resilience.js" });
  assert.equal(reloaded.context.FumiRecovery.read("learn").lessonId, "17-new");
});

test("home recovery records the actual view after a cancelled action", async () => {
  const shared = new Map();
  const fixture = browserContext({ storage: storageFrom(shared), pathname: "/" });
  let activeAction = "start";
  fixture.document.querySelector = (selector) => selector.includes(".topbar nav")
    ? { dataset: { action: activeAction } }
    : null;
  vm.runInContext(RECOVERY_SOURCE, fixture.context, { filename: "progress-resilience.js" });
  const click = fixture.documentListeners.get("click")[0];
  click({ target: { closest: (selector) => selector === "[data-action]" ? { dataset: { action: "submit" } } : null } });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(fixture.context.FumiRecovery.read("home").view, "test");
  activeAction = "report";
});

test("a completed diagnostic report is never restarted by a stale saved test view", () => {
  const shared = new Map();
  shared.set("fumi-math-position:v2", JSON.stringify({
    version: 2,
    updatedAt: 100,
    pages: { home: { view: "test", scrollY: 0, updatedAt: 100 } }
  }));
  const fixture = browserContext({ storage: storageFrom(shared), pathname: "/" });
  let activeAction = "report";
  let startClicks = 0;
  fixture.document.querySelector = (selector) => {
    if (selector.includes(".topbar nav")) return { dataset: { action: activeAction } };
    if (selector === '[data-action="start"]') return { disabled: false, click() { startClicks += 1; activeAction = "start"; } };
    return null;
  };
  vm.runInContext(RECOVERY_SOURCE, fixture.context, { filename: "progress-resilience.js" });
  assert.equal(startClicks, 0);
  assert.equal(fixture.context.FumiRecovery.read("home").view, "report");
});

test("home recovery observes replaced navigation after automatic submission", () => {
  const shared = new Map();
  const fixture = browserContext({ storage: storageFrom(shared), pathname: "/" });
  let activeAction = "start";
  let mutationCallback;
  let observedOptions;
  fixture.context.MutationObserver = class MutationObserver {
    constructor(callback) { mutationCallback = callback; }
    observe(target, options) { observedOptions = options; }
  };
  fixture.document.querySelector = (selector) => selector.includes(".topbar nav")
    ? { dataset: { action: activeAction } }
    : null;
  vm.runInContext(RECOVERY_SOURCE, fixture.context, { filename: "progress-resilience.js" });
  activeAction = "report";
  mutationCallback([]);
  assert.equal(observedOptions.childList, true);
  assert.equal(fixture.context.FumiRecovery.read("home").view, "report");
});

test("learning page restores the exact lesson and diagram step", () => {
  const fixture = browserContext({ hash: "#17" });
  const lessonA = {
    id: "17-a", chapter: "第17章 因式分解", section: "17.1", title: "第一课", minutes: 10,
    objectives: ["目标"], inquiry: { id: "ia", prompt: "问？", options: ["A", "B"], answer: 0, explain: "解", diagram: "d" },
    cards: [["概念", "内容"]], checks: [{ id: "ca", prompt: "查？", options: ["A", "B"], answer: 0, explain: "解", difficulty: "基础" }]
  };
  const lessonB = {
    ...lessonA,
    id: "17-b", title: "第二课", inquiry: { ...lessonA.inquiry, id: "ib" }, checks: [{ ...lessonA.checks[0], id: "cb" }]
  };
  let restored;
  let provider;
  fixture.context.MathCourseData = { lessons: [lessonA, lessonB] };
  fixture.context.MathDiagrams = { render: () => "<svg></svg>" };
  fixture.context.MathCore = {
    state: { lesson: {}, practice: { answers: {}, submitted: {}, step: {} } },
    escape: (value) => String(value),
    save() { return true; }
  };
  fixture.context.FumiRecovery = {
    read: () => ({ chapterKey: "17", lessonId: "17-b", diagramStep: 3, anchorId: "lesson-17-b", scrollY: 420 }),
    register(scope, nextProvider) { provider = nextProvider; },
    flush() {},
    restore(scope, options) { restored = options; }
  };
  vm.runInContext(LEARN_SOURCE, fixture.context, { filename: "math-learn.js" });
  assert.match(fixture.app.innerHTML, /第二课/);
  assert.match(fixture.app.innerHTML, /data-step="3" class="active"/);
  assert.equal(restored.anchorId, "lesson-17-b");
  assert.equal(provider().lessonId, "17-b");
  assert.equal(provider().diagramStep, 3);
  fixture.context.scrollY = 777;
  (fixture.windowListeners.get("scroll") || []).forEach((handler) => handler());
  assert.equal(provider().anchorId, "");
  assert.equal(provider().scrollY, 777);
});

function practiceRows() {
  const review = Array.from({ length: 10 }, (_, index) => ({
    id: `review-q${index + 1}`,
    chapter: "第17·18章 复习练习",
    sourceChapter: index < 5 ? "第17章 因式分解" : "第18章 分式",
    section: "复习",
    point: "知识点",
    required: true,
    difficulty: "基础",
    prompt: `复习题${index + 1}`,
    options: ["A", "B", "C", "D"],
    answer: 1,
    explain: "解析",
    diagram: "d"
  }));
  review.push({ ...review[0], id: "chapter16-q1", chapter: "第16章 整式的乘法", sourceChapter: "", prompt: "第16章题" });
  return review;
}

function makePractice(hash, savedPosition) {
  const fixture = browserContext({ hash, pathname: "/math-practice.html" });
  const state = { answers: {}, submitted: {}, step: {} };
  const saves = [];
  const checkpoints = [];
  let restored;
  fixture.document.getElementById = (id) => id === "app"
    ? fixture.app
    : { scrollIntoView() {} };
  fixture.context.MathCourseData = { practice: practiceRows() };
  fixture.context.MathDiagrams = { render: () => "<svg></svg>" };
  fixture.context.MathCore = {
    state: { practice: state },
    escape: (value) => String(value),
    save(change) { saves.push(change); return true; }
  };
  fixture.context.FumiRecovery = {
    read: () => savedPosition,
    register() {},
    checkpoint(scope, value) { checkpoints.push(value); return true; },
    restore(scope, options) { restored = options; }
  };
  vm.runInContext(PRACTICE_SOURCE, fixture.context, { filename: "math-practice.js" });
  return { ...fixture, state, saves, checkpoints, getRestored: () => restored };
}

test("practice page resumes by question ID and explicit links still win", () => {
  const saved = { filterKey: "review17-18", view: "questions", page: 0, questionId: "review-q9", scrollY: 500 };
  const resumed = makePractice("#review17-18", saved);
  assert.match(resumed.app.innerHTML, /复习题9/);
  assert.match(resumed.app.innerHTML, /第 2 \/ 2 组/);
  assert.equal(resumed.getRestored().anchorId, "review-q9");

  const explicit = makePractice("#16", saved);
  assert.match(explicit.app.innerHTML, /第16章题/);
  assert.doesNotMatch(explicit.app.innerHTML, /复习题9/);
  assert.equal(explicit.getRestored(), undefined);
});

test("practice choices immediately save both the answer and exact question", () => {
  const fixture = makePractice("#review17-18", {
    filterKey: "review17-18", view: "questions", page: 1, questionId: "review-q9", scrollY: 0
  });
  const click = fixture.documentListeners.get("click")[0];
  const button = { dataset: { pick: "review-q9", index: "2" } };
  click({ target: { closest: (selector) => selector === "[data-pick]" ? button : null } });
  assert.equal(fixture.state.answers["review-q9"], 2);
  assert.equal(fixture.saves.at(-1).practiceId, "review-q9");
  assert.equal(fixture.saves.at(-1).practiceFields.join(","), "answers");
  assert.equal(fixture.checkpoints.at(-1).questionId, "review-q9");
});

test("service worker precaches every local shell asset and falls back offline", async () => {
  const listeners = new Map();
  let precached = [];
  const cache = {
    async addAll(requests) { precached = requests.map((request) => request.url); },
    async put() {},
    async match(request) {
      if (typeof request === "string") return { fallback: request };
      return null;
    }
  };
  class FakeRequest {
    constructor(url) { this.url = url; }
  }
  const context = {
    console,
    Request: FakeRequest,
    URL,
    AbortController,
    setTimeout(callback, milliseconds) {
      return setTimeout(callback, milliseconds === 10000 || milliseconds === 15000 ? 80 : milliseconds);
    },
    clearTimeout,
    fetch: () => Promise.reject(new Error("offline")),
    caches: {
      open: async () => cache,
      keys: async () => ["fumi-math-static-old", "unrelated-cache"],
      delete: async () => true
    },
    self: {
      location: { origin: "https://example.test" },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener(type, handler) { listeners.set(type, handler); }
    }
  };
  vm.createContext(context);
  vm.runInContext(SW_SOURCE, context, { filename: "service-worker.js" });
  let installPromise;
  listeners.get("install")({ waitUntil(value) { installPromise = value; } });
  await installPromise;
  assert.ok(precached.length >= 20);
  precached.forEach((url) => {
    const relative = url === "/" ? "index.html" : url.replace(/^\//, "");
    assert.equal(fs.existsSync(path.join(ROOT, "public", relative)), true, `missing ${url}`);
  });

  let navigationResponse;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/math-learn.html#17" },
    respondWith(value) { navigationResponse = value; },
    waitUntil() {}
  });
  assert.deepEqual(await navigationResponse, { fallback: "/math-learn.html" });

  const onlineResponse = { ok: true, type: "basic", status: 200, clone() { return this; } };
  context.fetch = async () => onlineResponse;
  cache.put = async () => { throw new Error("quota"); };
  let onlineNavigation;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/math-practice.html" },
    respondWith(value) { onlineNavigation = value; },
    waitUntil() {}
  });
  assert.equal(await onlineNavigation, onlineResponse);

  context.caches.open = async () => { throw new Error("cache unavailable"); };
  let noCacheNavigation;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/index.html" },
    respondWith(value) { noCacheNavigation = value; },
    waitUntil() {}
  });
  assert.equal(await noCacheNavigation, onlineResponse);

  context.caches.open = async () => cache;
  cache.match = async () => null;
  cache.put = () => new Promise(() => {});
  context.fetch = async () => onlineResponse;
  let hangingPutNavigation;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/math-learn.html" },
    respondWith(value) { hangingPutNavigation = value; },
    waitUntil() {}
  });
  assert.equal(await Promise.race([
    hangingPutNavigation,
    new Promise((_, reject) => setTimeout(() => reject(new Error("navigation waited for cache.put")), 60))
  ]), onlineResponse);

  let hangingPutAsset;
  listeners.get("fetch")({
    request: { method: "GET", mode: "cors", url: "https://example.test/assets/math-core.js" },
    respondWith(value) { hangingPutAsset = value; },
    waitUntil() {}
  });
  assert.equal(await Promise.race([
    hangingPutAsset,
    new Promise((_, reject) => setTimeout(() => reject(new Error("asset waited for cache.put")), 60))
  ]), onlineResponse);

  let releaseCacheWrite;
  let backgroundUpdate;
  cache.put = () => new Promise((resolve) => { releaseCacheWrite = resolve; });
  let backgroundNavigation;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/math-learn.html" },
    respondWith(value) { backgroundNavigation = value; },
    waitUntil(value) { backgroundUpdate = value; }
  });
  assert.equal(await backgroundNavigation, onlineResponse);
  let backgroundFinished = false;
  backgroundUpdate.then(() => { backgroundFinished = true; });
  await Promise.resolve();
  assert.equal(backgroundFinished, false);
  releaseCacheWrite();
  await backgroundUpdate;
  assert.equal(backgroundFinished, true);

  cache.put = async () => {};
  cache.match = async () => { throw new Error("cache read failed"); };
  let cacheReadFailureAsset;
  listeners.get("fetch")({
    request: { method: "GET", mode: "cors", url: "https://example.test/assets/math-practice.js" },
    respondWith(value) { cacheReadFailureAsset = value; },
    waitUntil() {}
  });
  assert.equal(await cacheReadFailureAsset, onlineResponse);

  const serverError = { ok: false, type: "basic", status: 503, clone() { return this; } };
  context.fetch = async () => serverError;
  cache.match = async (request) => typeof request === "string" ? { fallback: request } : null;
  let serverErrorFallback;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/math-practice.html" },
    respondWith(value) { serverErrorFallback = value; },
    waitUntil() {}
  });
  assert.deepEqual(await serverErrorFallback, { fallback: "/math-practice.html" });

  cache.match = async () => { throw new Error("no fallback cache"); };
  let serverErrorWithoutFallback;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/math-practice.html" },
    respondWith(value) { serverErrorWithoutFallback = value; },
    waitUntil() {}
  });
  assert.equal(await serverErrorWithoutFallback, serverError);

  const originalTimer = context.setTimeout;
  context.setTimeout = (callback, milliseconds) => originalTimer(callback, milliseconds === 5000 || milliseconds === 2000 ? 5 : milliseconds);
  cache.match = async () => null;
  context.fetch = () => new Promise((resolve) => originalTimer(() => resolve(onlineResponse), 25));
  let slowNetworkWithoutFallback;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/math-learn.html" },
    respondWith(value) { slowNetworkWithoutFallback = value; },
    waitUntil() {}
  });
  assert.equal(await slowNetworkWithoutFallback, onlineResponse);
  context.setTimeout = originalTimer;

  const hangingBodyResponse = {
    ok: true,
    type: "basic",
    status: 200,
    clone() { return this; },
    arrayBuffer() { return new Promise(() => {}); }
  };
  context.setTimeout = (callback, milliseconds) => originalTimer(
    callback,
    milliseconds === 5000 || milliseconds === 2000 ? 5 : milliseconds === 10000 || milliseconds === 15000 ? 20 : milliseconds
  );
  context.fetch = async () => hangingBodyResponse;
  cache.match = async (request) => typeof request === "string" ? { fallback: request } : null;
  cache.put = () => new Promise(() => {});
  let hangingBodyNavigation;
  let boundedBackgroundUpdate;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/math-learn.html" },
    respondWith(value) { hangingBodyNavigation = value; },
    waitUntil(value) { boundedBackgroundUpdate = value; }
  });
  assert.deepEqual(await hangingBodyNavigation, { fallback: "/math-learn.html" });
  assert.equal(await boundedBackgroundUpdate, false);
  context.setTimeout = originalTimer;

  context.setTimeout = (callback, milliseconds) => originalTimer(
    callback,
    milliseconds === 5000 || milliseconds === 2000 ? 5 : milliseconds === 15000 ? 20 : milliseconds
  );
  context.fetch = () => new Promise(() => {});
  cache.match = async (request) => typeof request === "string" ? { fallback: request } : null;
  let hungFetchNavigation;
  let hungFetchBackground;
  listeners.get("fetch")({
    request: { method: "GET", mode: "navigate", url: "https://example.test/math-practice.html" },
    respondWith(value) { hungFetchNavigation = value; },
    waitUntil(value) { hungFetchBackground = value; }
  });
  assert.deepEqual(await hungFetchNavigation, { fallback: "/math-practice.html" });
  assert.equal(await hungFetchBackground, false);

  const cachedAsset = { cached: true };
  cache.match = async (request) => typeof request === "string" ? null : cachedAsset;
  let hungFetchAsset;
  let hungAssetBackground;
  listeners.get("fetch")({
    request: { method: "GET", mode: "cors", url: "https://example.test/assets/math-core.js" },
    respondWith(value) { hungFetchAsset = value; },
    waitUntil(value) { hungAssetBackground = value; }
  });
  assert.equal(await hungFetchAsset, cachedAsset);
  assert.equal(await hungAssetBackground, false);
  context.setTimeout = originalTimer;

  let handled = false;
  listeners.get("fetch")({
    request: { method: "POST", mode: "cors", url: "https://example.test/api/ai-tutor" },
    respondWith() { handled = true; },
    waitUntil() {}
  });
  assert.equal(handled, false);
});

test("HTML loads recovery before course logic and Netlify revalidates the worker", () => {
  for (const file of ["public/math-learn.html", "public/math-practice.html"]) {
    const html = read(file);
    assert.ok(html.indexOf("progress-resilience.js") < html.indexOf("math-core.js"));
  }
  assert.match(read("public/index.html"), /progress-resilience\.js/);
  const config = read("netlify.toml");
  assert.match(config, /for = "\/service-worker\.js"[\s\S]*max-age=0, must-revalidate/);
  assert.match(config, /Service-Worker-Allowed = "\/"/);
});
