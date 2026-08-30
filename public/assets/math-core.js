(function () {
  const printStyle = document.createElement("link");
  printStyle.rel = "stylesheet";
  printStyle.href = "assets/math-print.css";
  printStyle.media = "print";
  document.head.append(printStyle);
  const diagramStyle = document.createElement("link");
  diagramStyle.rel = "stylesheet";
  diagramStyle.href = "assets/math-diagram-contrast.css";
  document.head.append(diagramStyle);
  const LEGACY_KEY = "fumi-math-course:v1";
  const LEGACY_BACKUP_KEY = "fumi-math-course:backup:v1";
  const KEY = "fumi-math-course:v2";
  const BACKUP_KEY = "fumi-math-course:backup:v2";
  const RECORD_PREFIX = "fumi-math-course:record:v2:";
  const WRITER_ID = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  let recordSequence = 0;
  const MAP_KEY = "fumi-math-map:learning-tools:v1";
  const REVIEW_CHAPTER = "第13·14章 复习练习";
  const REVIEW_CHAPTER_15_16 = "第15·16章 复习练习";
  const REVIEW_CHAPTER_17_18 = "第17·18章 复习练习";
  const COLORS = {
    purple: "#6d5ce7",
    pink: "#ef6b8f",
    teal: "#23a6a1",
    blue: "#4f83e3",
    violet: "#8a67d5"
  };
  const chapters = [
    { number: 13, name: "第13章 三角形", domain: "三角形与全等", rootId: "domain-3", color: COLORS.purple },
    { number: 14, name: "第14章 全等三角形", domain: "三角形与全等", rootId: "domain-3", color: COLORS.blue },
    { number: 15, name: "第15章 轴对称", domain: "对称与特殊图形", rootId: "domain-4", color: COLORS.teal },
    { number: 16, name: "第16章 整式的乘法", domain: "代数变形", rootId: "domain-5", color: COLORS.violet },
    { number: 17, name: "第17章 因式分解", domain: "代数变形", rootId: "domain-5", color: COLORS.pink },
    { number: 18, name: "第18章 分式", domain: "数与式", rootId: "domain-0", color: COLORS.blue }
  ];
  const defaults = { lesson: {}, practice: { answers: {}, submitted: {}, step: {} }, meta: { lesson: {}, lessonAnswers: {}, practice: {}, practiceFields: {} }, updatedAt: null };

  function fresh() {
    return JSON.parse(JSON.stringify(defaults));
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

  function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function normalize(saved) {
    const source = safeObject(saved);
    const lesson = safeObject(source.lesson);
    const practice = safeObject(source.practice);
    const meta = safeObject(source.meta);
    const updatedAt = Number(source.updatedAt) || 0;
    const lessonMeta = { ...safeObject(meta.lesson) };
    const lessonAnswerMeta = { ...safeObject(meta.lessonAnswers) };
    const practiceMeta = { ...safeObject(meta.practice) };
    const rawPracticeFields = safeObject(meta.practiceFields);
    const practiceFields = {};
    Object.keys(lesson).forEach((lessonId) => {
      const completedAt = lesson[lessonId]?.done ? Number(lesson[lessonId]?.completedAt) || 0 : 0;
      if (!Object.prototype.hasOwnProperty.call(lessonMeta, lessonId)) lessonMeta[lessonId] = completedAt || updatedAt;
      Object.keys(safeObject(lesson[lessonId]?.answers)).forEach((questionId) => {
        if (!Object.prototype.hasOwnProperty.call(lessonAnswerMeta, questionId)) lessonAnswerMeta[questionId] = completedAt || updatedAt;
      });
    });
    const practiceIds = new Set([
      ...Object.keys(safeObject(practice.answers)),
      ...Object.keys(safeObject(practice.submitted)),
      ...Object.keys(safeObject(practice.step))
    ]);
    practiceIds.forEach((questionId) => {
      if (!Object.prototype.hasOwnProperty.call(practiceMeta, questionId)) practiceMeta[questionId] = updatedAt;
      const legacyClock = Number(practiceMeta[questionId]) || updatedAt;
      const rawFields = safeObject(rawPracticeFields[questionId]);
      const hasFieldMeta = Object.prototype.hasOwnProperty.call(rawPracticeFields, questionId);
      const submittedAt = Number(practice.submitted?.[questionId]) || 0;
      const fieldClock = (field) => Object.prototype.hasOwnProperty.call(rawFields, field)
        ? Number(rawFields[field]) || 0
        : hasFieldMeta ? 0 : field === "submitted" ? submittedAt : field === "answers" ? submittedAt || legacyClock : legacyClock;
      practiceFields[questionId] = {
        answers: fieldClock("answers"),
        submitted: fieldClock("submitted"),
        step: fieldClock("step")
      };
      practiceMeta[questionId] = Math.max(
        practiceFields[questionId].answers,
        practiceFields[questionId].submitted,
        practiceFields[questionId].step
      );
    });
    Object.keys(rawPracticeFields).forEach((questionId) => {
      if (practiceFields[questionId]) return;
      const rawFields = safeObject(rawPracticeFields[questionId]);
      practiceFields[questionId] = {
        answers: Number(rawFields.answers) || 0,
        submitted: Number(rawFields.submitted) || 0,
        step: Number(rawFields.step) || 0
      };
      practiceMeta[questionId] = Math.max(
        Number(practiceMeta[questionId]) || 0,
        practiceFields[questionId].answers,
        practiceFields[questionId].submitted,
        practiceFields[questionId].step
      );
    });
    return {
      lesson,
      practice: {
        answers: safeObject(practice.answers),
        submitted: safeObject(practice.submitted),
        step: safeObject(practice.step)
      },
      meta: {
        lesson: lessonMeta,
        lessonAnswers: lessonAnswerMeta,
        practice: practiceMeta,
        practiceFields
      },
      updatedAt
    };
  }

  function readSnapshot(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed && typeof parsed === "object" ? normalize(parsed) : null;
    } catch {
      return null;
    }
  }

  function buildLegacyDelta(currentValue, legacyValue) {
    const current = normalize(currentValue);
    const legacy = normalize(legacyValue);
    const delta = { lessons: {}, practiceAnswers: {}, practiceSubmissions: {}, practiceSteps: {} };

    Object.entries(legacy.lesson).forEach(([lessonId, legacyLessonValue]) => {
      const legacyLesson = safeObject(legacyLessonValue);
      const currentLesson = safeObject(current.lesson[lessonId]);
      const legacyAnswers = safeObject(legacyLesson.answers);
      const currentAnswers = safeObject(currentLesson.answers);
      if (legacyLesson.done && !currentLesson.done) {
        delta.lessons[lessonId] = { completed: clone(legacyLesson) };
        return;
      }
      if (currentLesson.done) return;
      const answers = {};
      Object.keys(legacyAnswers).forEach((questionId) => {
        if (Object.prototype.hasOwnProperty.call(currentAnswers, questionId)) return;
        answers[questionId] = legacyAnswers[questionId];
      });
      if (Object.keys(answers).length) delta.lessons[lessonId] = { answers };
    });

    const practiceIds = new Set([
      ...Object.keys(legacy.practice.answers),
      ...Object.keys(legacy.practice.submitted),
      ...Object.keys(legacy.practice.step)
    ]);
    practiceIds.forEach((questionId) => {
      const hasLegacyAnswer = Object.prototype.hasOwnProperty.call(legacy.practice.answers, questionId);
      const hasCurrentAnswer = Object.prototype.hasOwnProperty.call(current.practice.answers, questionId);
      const legacySubmitted = Number(legacy.practice.submitted[questionId]) || 0;
      const currentSubmitted = Number(current.practice.submitted[questionId]) || 0;

      if (legacySubmitted && !currentSubmitted && hasLegacyAnswer) {
        delta.practiceSubmissions[questionId] = {
          answer: legacy.practice.answers[questionId],
          submitted: legacySubmitted,
          step: legacy.practice.step[questionId]
        };
        return;
      }

      if (!currentSubmitted && !hasCurrentAnswer && hasLegacyAnswer) {
        delta.practiceAnswers[questionId] = legacy.practice.answers[questionId];
      }

      const legacyStep = Number(legacy.practice.step[questionId]);
      const hasCurrentStep = Object.prototype.hasOwnProperty.call(current.practice.step, questionId);
      if (currentSubmitted && Number.isFinite(legacyStep) && !hasCurrentStep) {
        delta.practiceSteps[questionId] = legacyStep;
      }
    });

    return delta;
  }

  function hasLegacyDelta(delta) {
    return Object.values(delta || {}).some((group) => Object.keys(safeObject(group)).length > 0);
  }

  function applyLegacyDelta(target, deltaValue, timestamp) {
    const result = normalize(clone(target));
    const delta = safeObject(deltaValue);
    let changed = false;
    Object.entries(safeObject(delta.lessons)).forEach(([lessonId, lessonDeltaValue]) => {
      const lessonDelta = safeObject(lessonDeltaValue);
      const currentLesson = safeObject(result.lesson[lessonId]);
      if (lessonDelta.completed && !currentLesson.done) {
        const completed = clone(safeObject(lessonDelta.completed));
        result.lesson[lessonId] = completed;
        result.meta.lesson[lessonId] = Math.max(timestamp, Number(completed.completedAt) || 0);
        Object.keys(safeObject(completed.answers)).forEach((questionId) => {
          result.meta.lessonAnswers[questionId] = Math.max(timestamp, Number(completed.completedAt) || 0);
        });
        changed = true;
        return;
      }
      if (currentLesson.done) return;
      const answers = { ...safeObject(currentLesson.answers) };
      let lessonChanged = false;
      Object.entries(safeObject(lessonDelta.answers)).forEach(([questionId, answer]) => {
        if (Object.prototype.hasOwnProperty.call(answers, questionId)) return;
        answers[questionId] = answer;
        result.meta.lessonAnswers[questionId] = timestamp;
        lessonChanged = true;
      });
      if (lessonChanged) {
        result.lesson[lessonId] = { ...currentLesson, answers };
        result.meta.lesson[lessonId] = Math.max(Number(result.meta.lesson[lessonId]) || 0, timestamp);
        changed = true;
      }
    });

    Object.entries(safeObject(delta.practiceSubmissions)).forEach(([questionId, submissionValue]) => {
      if (result.practice.submitted[questionId]) return;
      const submission = safeObject(submissionValue);
      const submittedAt = Number(submission.submitted) || 0;
      if (!submittedAt || submission.answer === undefined) return;
      result.practice.answers[questionId] = submission.answer;
      result.practice.submitted[questionId] = submittedAt;
      if (submission.step !== undefined) result.practice.step[questionId] = submission.step;
      result.meta.practiceFields[questionId] = {
        answers: timestamp,
        submitted: timestamp,
        step: submission.step === undefined ? 0 : timestamp
      };
      result.meta.practice[questionId] = timestamp;
      changed = true;
    });

    Object.entries(safeObject(delta.practiceAnswers)).forEach(([questionId, answer]) => {
      if (result.practice.submitted[questionId] || Object.prototype.hasOwnProperty.call(result.practice.answers, questionId)) return;
      result.practice.answers[questionId] = answer;
      const fieldTimes = safeObject(result.meta.practiceFields[questionId]);
      result.meta.practiceFields[questionId] = { ...fieldTimes, answers: timestamp };
      result.meta.practice[questionId] = Math.max(Number(result.meta.practice[questionId]) || 0, timestamp);
      changed = true;
    });

    Object.entries(safeObject(delta.practiceSteps)).forEach(([questionId, step]) => {
      if (!result.practice.submitted[questionId]) return;
      const nextStep = Number(step);
      if (!Number.isFinite(nextStep) || Object.prototype.hasOwnProperty.call(result.practice.step, questionId)) return;
      result.practice.step[questionId] = nextStep;
      const fieldTimes = safeObject(result.meta.practiceFields[questionId]);
      result.meta.practiceFields[questionId] = { ...fieldTimes, step: timestamp };
      result.meta.practice[questionId] = Math.max(Number(result.meta.practice[questionId]) || 0, timestamp);
      changed = true;
    });
    if (changed) result.updatedAt = Math.max(Number(result.updatedAt) || 0, timestamp);
    return result;
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    if (value && typeof value === "object") {
      return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
    }
    return JSON.stringify(value);
  }

  function stableHash(value) {
    const text = stableStringify(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36) + "-" + text.length.toString(36);
  }

  function persistLegacyDelta(delta, timestamp) {
    const record = { type: "legacy-import", value: delta, timestamp };
    const key = RECORD_PREFIX + String(timestamp).padStart(16, "0") + ":legacy:" + stableHash(record);
    return persistRecord(key, record);
  }

  function load() {
    const primary = readSnapshot(KEY);
    const backup = readSnapshot(BACKUP_KEY);
    const legacyPrimary = readSnapshot(LEGACY_KEY);
    const legacyBackup = readSnapshot(LEGACY_BACKUP_KEY);
    const legacy = !legacyPrimary ? legacyBackup : !legacyBackup ? legacyPrimary : mergeSnapshots(legacyPrimary, legacyBackup);
    const records = readRecordLog();
    const hasCurrent = Boolean(primary || backup || records.length);
    let base;
    if (!primary && !backup) base = fresh();
    else if (!primary) base = backup;
    else if (!backup) base = primary;
    else base = mergeSnapshots(primary, backup);
    let result = applyRecordLog(base, records);
    if (legacy) {
      const delta = buildLegacyDelta(result, legacy);
      if (hasLegacyDelta(delta)) {
        const timestamp = Math.max(Number(legacy.updatedAt) || 0, 1);
        if (persistLegacyDelta(delta, timestamp)) result = applyLegacyDelta(result, delta, timestamp);
        else {
          announceSave(false, timestamp);
          if (!hasCurrent) result = legacy;
        }
      }
    }
    return result;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function recordKey(type, lessonId, questionId, timestamp) {
    recordSequence += 1;
    const order = [String(timestamp).padStart(16, "0"), WRITER_ID, String(recordSequence).padStart(6, "0")].join(":");
    return RECORD_PREFIX + order + ":" + encodeURIComponent([type, lessonId || "", questionId || ""].join("|"));
  }

  function persistRecord(key, record) {
    try {
      const payload = JSON.stringify(record);
      localStorage.setItem(key, payload);
      return localStorage.getItem(key) === payload;
    } catch {
      return false;
    }
  }

  function writeRecord(change, timestamp) {
    if (!change || typeof change !== "object") return false;
    let key = "";
    let record = null;
    if (change.lessonId && change.lessonAnswerId) {
      const lessonState = safeObject(state.lesson[change.lessonId]);
      const answers = safeObject(lessonState.answers);
      if (!Object.prototype.hasOwnProperty.call(answers, change.lessonAnswerId)) return false;
      key = recordKey("lesson-answer", change.lessonId, change.lessonAnswerId, timestamp);
      record = {
        type: "lesson-answer",
        lessonId: change.lessonId,
        questionId: change.lessonAnswerId,
        value: answers[change.lessonAnswerId],
        timestamp
      };
    } else if (change.lessonId) {
      const value = clone(safeObject(state.lesson[change.lessonId]));
      key = recordKey("lesson", change.lessonId, "", timestamp);
      record = { type: "lesson", lessonId: change.lessonId, value, timestamp };
    } else if (change.practiceId) {
      const questionId = change.practiceId;
      if (change.practiceSubmit) {
        const value = {
          answer: state.practice.answers[questionId],
          submitted: state.practice.submitted[questionId],
          step: state.practice.step[questionId]
        };
        if (value.answer === undefined || !Number(value.submitted)) return false;
        key = recordKey("practice-submit", "", questionId, timestamp);
        record = { type: "practice-submit", questionId, value, timestamp };
        return persistRecord(key, record);
      }
      const requestedFields = Array.isArray(change.practiceFields) ? change.practiceFields : ["answers", "submitted", "step"];
      const fields = [...new Set(requestedFields)].filter((field) => ["answers", "submitted", "step"].includes(field));
      let attempted = 0;
      let saved = 0;
      fields.forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(state.practice[field], questionId)) return;
        attempted += 1;
        const fieldKey = recordKey("practice-field", "", questionId + "|" + field, timestamp);
        const fieldRecord = { type: "practice-field", questionId, field, value: state.practice[field][questionId], timestamp };
        if (persistRecord(fieldKey, fieldRecord)) saved += 1;
      });
      return attempted > 0 && saved === attempted;
    }
    if (!key || !record) return false;
    return persistRecord(key, record);
  }

  function readRecordLog() {
    const records = [];
    let length = 0;
    try { length = Number(localStorage.length) || 0; } catch {}
    for (let index = 0; index < length; index += 1) {
      let key = "";
      let record = null;
      try {
        key = localStorage.key(index) || "";
        if (!key.startsWith(RECORD_PREFIX)) continue;
        record = JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        continue;
      }
      const timestamp = Number(record?.timestamp) || 0;
      if (!timestamp) continue;
      records.push({ ...record, timestamp, storageKey: key });
    }
    return records.sort((first, second) => first.timestamp - second.timestamp || first.storageKey.localeCompare(second.storageKey));
  }

  function applyRecordLog(value, records = readRecordLog()) {
    const result = normalize(value);
    const submissionWinners = new Map();
    const completionWinners = new Map();
    const earlierEvidence = (candidate, current) => {
      if (!current) return true;
      return candidate.timestamp < current.timestamp
        || (candidate.timestamp === current.timestamp && candidate.storageKey < current.storageKey);
    };
    records.forEach((record) => {
      if (record.type === "practice-submit" && Number(record.value?.submitted)) {
        const current = submissionWinners.get(record.questionId);
        if (earlierEvidence(record, current)) submissionWinners.set(record.questionId, record);
      }
      if (record.type === "lesson" && record.value?.done) {
        const current = completionWinners.get(record.lessonId);
        if (earlierEvidence(record, current)) completionWinners.set(record.lessonId, record);
      }
    });
    records.forEach((record) => {
      const timestamp = record.timestamp;
      if (record.type === "legacy-import") {
        const imported = applyLegacyDelta(result, record.value, timestamp);
        replaceRecord(result.lesson, imported.lesson);
        replaceRecord(result.practice.answers, imported.practice.answers);
        replaceRecord(result.practice.submitted, imported.practice.submitted);
        replaceRecord(result.practice.step, imported.practice.step);
        replaceRecord(result.meta.lesson, imported.meta.lesson);
        replaceRecord(result.meta.lessonAnswers, imported.meta.lessonAnswers);
        replaceRecord(result.meta.practice, imported.meta.practice);
        replaceRecord(result.meta.practiceFields, imported.meta.practiceFields);
        result.updatedAt = Math.max(result.updatedAt, imported.updatedAt);
      } else if (record.type === "lesson-answer" && record.lessonId && record.questionId) {
        if (result.lesson[record.lessonId]?.done) return;
        const currentTime = Number(result.meta.lessonAnswers[record.questionId]) || 0;
        if (timestamp < currentTime) return;
        const lessonState = safeObject(result.lesson[record.lessonId]);
        lessonState.answers = { ...safeObject(lessonState.answers), [record.questionId]: record.value };
        result.lesson[record.lessonId] = lessonState;
        result.meta.lessonAnswers[record.questionId] = timestamp;
      } else if (record.type === "lesson" && record.lessonId) {
        const currentTime = Number(result.meta.lesson[record.lessonId]) || 0;
        const lessonState = safeObject(result.lesson[record.lessonId]);
        const recordValue = safeObject(record.value);
        if (recordValue.done && completionWinners.get(record.lessonId)?.storageKey !== record.storageKey) return;
        if (!recordValue.done && timestamp < currentTime) return;
        const existingCompletedAt = lessonState.done ? Number(lessonState.completedAt) || currentTime : 0;
        if (existingCompletedAt && recordValue.done && currentTime < timestamp) return;
        const answers = recordValue.done ? safeObject(recordValue.answers) : safeObject(lessonState.answers);
        result.lesson[record.lessonId] = { ...lessonState, ...recordValue, answers: { ...answers } };
        result.meta.lesson[record.lessonId] = timestamp;
        if (recordValue.done) {
          Object.keys(answers).forEach((questionId) => {
            result.meta.lessonAnswers[questionId] = timestamp;
          });
        }
      } else if (record.type === "practice-submit" && record.questionId) {
        if (submissionWinners.get(record.questionId)?.storageKey !== record.storageKey) return;
        const recordValue = safeObject(record.value);
        const submittedAt = Number(recordValue.submitted) || 0;
        const existingSubmittedAt = Number(result.practice.submitted[record.questionId]) || 0;
        const existingEvidenceTime = Number(result.meta.practiceFields[record.questionId]?.submitted) || 0;
        if (!submittedAt || (existingSubmittedAt && existingEvidenceTime < timestamp)) return;
        result.practice.answers[record.questionId] = recordValue.answer;
        result.practice.submitted[record.questionId] = submittedAt;
        if (recordValue.step !== undefined) result.practice.step[record.questionId] = recordValue.step;
        const fieldTimes = safeObject(result.meta.practiceFields[record.questionId]);
        result.meta.practiceFields[record.questionId] = {
          ...fieldTimes,
          answers: timestamp,
          submitted: timestamp,
          step: recordValue.step !== undefined ? timestamp : Number(fieldTimes.step) || 0
        };
        result.meta.practice[record.questionId] = Math.max(Number(result.meta.practice[record.questionId]) || 0, timestamp);
      } else if (record.type === "practice-field" && record.questionId && ["answers", "submitted", "step"].includes(record.field)) {
        if (record.field === "answers" && result.practice.submitted[record.questionId]) return;
        const fieldTimes = safeObject(result.meta.practiceFields[record.questionId]);
        const currentTime = Number(fieldTimes[record.field]) || 0;
        if (timestamp < currentTime) return;
        result.practice[record.field][record.questionId] = record.value;
        result.meta.practiceFields[record.questionId] = { ...fieldTimes, [record.field]: timestamp };
        result.meta.practice[record.questionId] = Math.max(Number(result.meta.practice[record.questionId]) || 0, timestamp);
      }
      result.updatedAt = Math.max(result.updatedAt, timestamp);
    });
    return result;
  }

  function mergeSnapshots(localValue, remoteValue) {
    const local = normalize(localValue);
    const remote = normalize(remoteValue);
    const result = normalize(clone(local));

    const lessonIds = new Set([
      ...Object.keys(local.lesson),
      ...Object.keys(remote.lesson),
      ...Object.keys(local.meta.lesson),
      ...Object.keys(remote.meta.lesson)
    ]);
    lessonIds.forEach((lessonId) => {
      const localLesson = safeObject(local.lesson[lessonId]);
      const remoteLesson = safeObject(remote.lesson[lessonId]);
      const localTime = Number(local.meta.lesson[lessonId]) || 0;
      const remoteTime = Number(remote.meta.lesson[lessonId]) || 0;
      const localCompletedAt = localLesson.done ? Number(localLesson.completedAt) || localTime : 0;
      const remoteCompletedAt = remoteLesson.done ? Number(remoteLesson.completedAt) || remoteTime : 0;
      if (localCompletedAt || remoteCompletedAt) {
        let chosen = localLesson;
        let chosenTime = localTime;
        if (!localCompletedAt || (remoteCompletedAt && remoteCompletedAt < localCompletedAt)) {
          chosen = remoteLesson;
          chosenTime = remoteTime;
        } else if (localCompletedAt === remoteCompletedAt && remoteCompletedAt) {
          const remoteWins = remote.updatedAt < local.updatedAt
            || (remote.updatedAt === local.updatedAt && JSON.stringify(remoteLesson) > JSON.stringify(localLesson));
          if (remoteWins) {
            chosen = remoteLesson;
            chosenTime = remoteTime;
          }
        }
        result.lesson[lessonId] = clone(chosen);
        result.meta.lesson[lessonId] = Math.max(chosenTime, Number(chosen.completedAt) || 0);
        Object.keys(safeObject(chosen.answers)).forEach((questionId) => {
          result.meta.lessonAnswers[questionId] = Math.max(
            Number((chosen === localLesson ? local : remote).meta.lessonAnswers[questionId]) || 0,
            Number(chosen.completedAt) || 0
          );
        });
        return;
      }
      const shell = remoteTime > localTime
        ? { ...localLesson, ...remoteLesson }
        : { ...remoteLesson, ...localLesson };
      if (!localTime && !remoteTime) {
        shell.done = Boolean(localLesson.done || remoteLesson.done);
        shell.completedAt = Math.max(Number(localLesson.completedAt) || 0, Number(remoteLesson.completedAt) || 0) || undefined;
      }
      const localAnswers = safeObject(localLesson.answers);
      const remoteAnswers = safeObject(remoteLesson.answers);
      const answerIds = new Set([...Object.keys(localAnswers), ...Object.keys(remoteAnswers)]);
      const answers = {};
      answerIds.forEach((questionId) => {
        const localAnswerTime = Number(local.meta.lessonAnswers[questionId]) || 0;
        const remoteAnswerTime = Number(remote.meta.lessonAnswers[questionId]) || 0;
        if (remoteAnswerTime > localAnswerTime) answers[questionId] = remoteAnswers[questionId];
        else if (Object.prototype.hasOwnProperty.call(localAnswers, questionId)) answers[questionId] = localAnswers[questionId];
        else answers[questionId] = remoteAnswers[questionId];
        result.meta.lessonAnswers[questionId] = Math.max(localAnswerTime, remoteAnswerTime);
      });
      shell.answers = answers;
      result.lesson[lessonId] = shell;
      result.meta.lesson[lessonId] = Math.max(localTime, remoteTime);
    });

    const practiceIds = new Set([
      ...Object.keys(local.practice.answers),
      ...Object.keys(local.practice.submitted),
      ...Object.keys(local.practice.step),
      ...Object.keys(remote.practice.answers),
      ...Object.keys(remote.practice.submitted),
      ...Object.keys(remote.practice.step),
      ...Object.keys(local.meta.practice),
      ...Object.keys(remote.meta.practice),
      ...Object.keys(local.meta.practiceFields),
      ...Object.keys(remote.meta.practiceFields)
    ]);
    practiceIds.forEach((questionId) => {
      const localSubmittedAt = Number(local.practice.submitted[questionId]) || 0;
      const remoteSubmittedAt = Number(remote.practice.submitted[questionId]) || 0;
      result.meta.practiceFields[questionId] = {};
      if (localSubmittedAt || remoteSubmittedAt) {
        let chosen = local;
        if (!localSubmittedAt || (remoteSubmittedAt && remoteSubmittedAt < localSubmittedAt)) chosen = remote;
        else if (localSubmittedAt === remoteSubmittedAt && remoteSubmittedAt) {
          const remoteWins = remote.updatedAt < local.updatedAt
            || (remote.updatedAt === local.updatedAt && JSON.stringify(remote.practice.answers[questionId]) > JSON.stringify(local.practice.answers[questionId]));
          if (remoteWins) chosen = remote;
        }
        if (Object.prototype.hasOwnProperty.call(chosen.practice.answers, questionId)) {
          result.practice.answers[questionId] = chosen.practice.answers[questionId];
        }
        result.practice.submitted[questionId] = chosen.practice.submitted[questionId];
        const localStepTime = Number(local.meta.practiceFields[questionId]?.step) || 0;
        const remoteStepTime = Number(remote.meta.practiceFields[questionId]?.step) || 0;
        if (remoteStepTime > localStepTime && Object.prototype.hasOwnProperty.call(remote.practice.step, questionId)) {
          result.practice.step[questionId] = remote.practice.step[questionId];
        } else if (Object.prototype.hasOwnProperty.call(local.practice.step, questionId)) {
          result.practice.step[questionId] = local.practice.step[questionId];
        } else if (Object.prototype.hasOwnProperty.call(remote.practice.step, questionId)) {
          result.practice.step[questionId] = remote.practice.step[questionId];
        }
        const chosenSubmittedAt = Number(chosen.practice.submitted[questionId]) || 0;
        const chosenFieldTimes = safeObject(chosen.meta.practiceFields[questionId]);
        result.meta.practiceFields[questionId] = {
          answers: Math.max(Number(chosenFieldTimes.answers) || 0, chosenSubmittedAt),
          submitted: Math.max(Number(chosenFieldTimes.submitted) || 0, chosenSubmittedAt),
          step: Math.max(localStepTime, remoteStepTime)
        };
        result.meta.practice[questionId] = Math.max(
          Number(chosen.meta.practice[questionId]) || 0,
          ...Object.values(result.meta.practiceFields[questionId]).map((value) => Number(value) || 0)
        );
        return;
      }
      ["answers", "submitted", "step"].forEach((field) => {
        const localTime = Number(local.meta.practiceFields[questionId]?.[field]) || 0;
        const remoteTime = Number(remote.meta.practiceFields[questionId]?.[field]) || 0;
        const localField = local.practice[field];
        const remoteField = remote.practice[field];
        if (remoteTime > localTime && Object.prototype.hasOwnProperty.call(remoteField, questionId)) {
          result.practice[field][questionId] = remoteField[questionId];
        } else if (Object.prototype.hasOwnProperty.call(localField, questionId)) {
          result.practice[field][questionId] = localField[questionId];
        } else if (Object.prototype.hasOwnProperty.call(remoteField, questionId)) {
          result.practice[field][questionId] = remoteField[questionId];
        }
        result.meta.practiceFields[questionId][field] = Math.max(localTime, remoteTime);
      });
      result.meta.practice[questionId] = Math.max(
        Number(local.meta.practice[questionId]) || 0,
        Number(remote.meta.practice[questionId]) || 0,
        ...Object.values(result.meta.practiceFields[questionId]).map((value) => Number(value) || 0)
      );
    });
    result.updatedAt = Math.max(local.updatedAt, remote.updatedAt);
    return result;
  }

  let state = load();

  function persistMigration() {
    if (readSnapshot(KEY) || readSnapshot(BACKUP_KEY)) return;
    const payload = JSON.stringify(state);
    try { localStorage.setItem(KEY, payload); } catch {}
    try { localStorage.setItem(BACKUP_KEY, payload); } catch {}
  }

  persistMigration();

  function replaceRecord(target, source) {
    Object.keys(target).forEach((key) => delete target[key]);
    Object.assign(target, source);
  }

  function applySnapshot(nextValue) {
    const next = normalize(nextValue);
    replaceRecord(state.lesson, next.lesson);
    replaceRecord(state.practice.answers, next.practice.answers);
    replaceRecord(state.practice.submitted, next.practice.submitted);
    replaceRecord(state.practice.step, next.practice.step);
    replaceRecord(state.meta.lesson, next.meta.lesson);
    replaceRecord(state.meta.lessonAnswers, next.meta.lessonAnswers);
    replaceRecord(state.meta.practice, next.meta.practice);
    replaceRecord(state.meta.practiceFields, next.meta.practiceFields);
    state.updatedAt = next.updatedAt;
  }

  function markChange(change, timestamp) {
    if (!change || typeof change !== "object") return;
    if (change.lessonId && change.lessonAnswerId) {
      state.meta.lessonAnswers[change.lessonAnswerId] = timestamp;
    }
    if (change.lessonId && !change.lessonAnswerId) {
      state.meta.lesson[change.lessonId] = timestamp;
    }
    if (change.practiceId) {
      const fields = Array.isArray(change.practiceFields) ? change.practiceFields : ["answers", "submitted", "step"];
      state.meta.practiceFields[change.practiceId] = { ...safeObject(state.meta.practiceFields[change.practiceId]) };
      fields.filter((field) => ["answers", "submitted", "step"].includes(field)).forEach((field) => {
        state.meta.practiceFields[change.practiceId][field] = timestamp;
      });
      state.meta.practice[change.practiceId] = Math.max(
        Number(state.meta.practice[change.practiceId]) || 0,
        timestamp
      );
    }
  }

  function announceSave(ok, timestamp) {
    try {
      window.dispatchEvent(new CustomEvent("fumi-save-status", {
        detail: { ok, timestamp }
      }));
    } catch {}
  }

  function save(change) {
    const latest = load();
    const timestamp = Math.max(preciseNow(), Number(state.updatedAt) + 1, Number(latest.updatedAt) + 1);
    markChange(change, timestamp);
    const recordSaved = writeRecord(change, timestamp);
    applySnapshot(mergeSnapshots(state, latest));
    state.updatedAt = timestamp;
    const payload = JSON.stringify(state);
    let primary = false;
    let backup = false;
    try {
      localStorage.setItem(KEY, payload);
      primary = localStorage.getItem(KEY) === payload;
    } catch {}
    try {
      localStorage.setItem(BACKUP_KEY, payload);
      backup = localStorage.getItem(BACKUP_KEY) === payload;
    } catch {}
    const requiresRecord = Boolean(change?.lessonId || change?.practiceId);
    const ok = requiresRecord ? recordSaved : primary || backup;
    announceSave(ok, timestamp);
    syncMap();
    return ok;
  }

  function practiceStats(predicate) {
    const questions = MathCourseData.practice.filter((item) => item.required && predicate(item));
    const done = questions.filter((item) => state.practice.submitted[item.id]);
    const right = done.filter((item) => state.practice.answers[item.id] === item.answer);
    return { all: questions.length, done: done.length, right: right.length, pct: done.length ? Math.round(right.length / done.length * 100) : 0 };
  }

  function challengeStats(predicate) {
    const questions = MathCourseData.practice.filter((item) => !item.required && predicate(item));
    const done = questions.filter((item) => state.practice.submitted[item.id]);
    const right = done.filter((item) => state.practice.answers[item.id] === item.answer);
    return { all: questions.length, done: done.length, right: right.length };
  }

  function pct(section) {
    return practiceStats((item) => !section || item.chapter === section).pct;
  }

  function seedMap() {
    const domains = ["数与式", "方程与不等式", "几何基础与坐标", "三角形与全等", "对称与特殊图形", "代数变形", "勾股·四边形·函数", "统计与数据"];
    const colors = ["#6d5ce7", "#ef6b8f", "#23a6a1", "#f2a43a", "#4f83e3", "#8a67d5", "#e36e5b"];
    return {
      mindmap: {
        center: "我的北京中考数学能力地图",
        branches: domains.map((title, index) => ({ id: `domain-${index}`, title, note: "从章节学习与作答证据持续更新。", color: colors[index % colors.length], children: [], autoSync: true }))
      },
      orid: { o: "", r: "", i: "", d: "", updatedAt: null },
      socratic: {}
    };
  }

  function ensureNode(children, id, defaultsForNode) {
    let node = children.find((item) => item.id === id);
    if (!node) {
      node = { id, title: defaultsForNode.title, note: defaultsForNode.note || "", color: defaultsForNode.color, children: [], autoSync: true };
      children.push(node);
    }
    node.children = Array.isArray(node.children) ? node.children : [];
    if (node.autoSync !== false) {
      node.title = defaultsForNode.title;
      node.note = defaultsForNode.note || "";
      node.color = defaultsForNode.color || node.color;
    }
    return node;
  }

  function stableSlug(value) {
    const text = String(value || "").trim().toLowerCase();
    const slug = text.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20) || "point";
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${slug}-${(hash >>> 0).toString(36)}`;
  }

  function migrateStableNodeId(children, stableId, legacyId, title) {
    if (children.some((item) => item.id === stableId)) return;
    const sourceNumber = stableId.match(/^math-review-(\d+)-point-/)?.[1];
    const legacyPattern = sourceNumber ? new RegExp(`^math-review-${sourceNumber}-point-\\d+$`) : /^$/;
    const legacy = children.find((item) => item.id === legacyId)
      || children.find((item) => legacyPattern.test(item.id) && item.title === title);
    if (legacy) legacy.id = stableId;
  }

  function syncChallengeNode(parentNode, id, title, predicate, color) {
    const stats = challengeStats(predicate);
    if (!stats.all) return null;
    return ensureNode(parentNode.children, id, {
      title,
      note: `完成 ${stats.done}/${stats.all} · 正确 ${stats.right}/${stats.done}`,
      color
    });
  }

  function isLessonEvidenceComplete(lesson, lessonState = state.lesson[lesson.id]) {
    if (!lessonState?.done) return false;
    const answers = lessonState.answers || {};
    return [lesson.inquiry, ...(lesson.checks || [])]
      .filter(Boolean)
      .every((item) => answers[item.id] !== undefined);
  }

  function syncLessonNode(chapterNode, lesson, color) {
    const lessonState = state.lesson[lesson.id] || {};
    const answers = lessonState.answers || {};
    const asked = answers[lesson.inquiry.id] !== undefined;
    const inquiryRight = answers[lesson.inquiry.id] === lesson.inquiry.answer;
    const checksDone = lesson.checks.filter((item) => answers[item.id] !== undefined).length;
    const checksRight = lesson.checks.filter((item) => answers[item.id] === item.answer).length;
    const completed = isLessonEvidenceComplete(lesson, lessonState);
    const lessonNode = ensureNode(chapterNode.children, `course-${lesson.id}`, {
      title: `${lesson.section} ${lesson.title.replace(/^.*：/, "")}`,
      note: completed ? `已学 · 即时题 ${checksRight}/${lesson.checks.length}` : `学习中 · 已答 ${checksDone}/${lesson.checks.length}`,
      color
    });
    ensureNode(lessonNode.children, `course-socratic-${lesson.id}`, {
      title: "易错概念追问",
      note: !asked ? "尚未作答" : inquiryRight ? "概念判断正确" : `需要回看：${lesson.inquiry.explain}`,
      color
    });
    ensureNode(lessonNode.children, `course-evidence-${lesson.id}`, {
      title: "即时检测",
      note: `${checksRight}/${checksDone} 正确 · 共 ${lesson.checks.length} 题`,
      color
    });
  }

  function syncMap() {
    try {
      const mapData = JSON.parse(localStorage.getItem(MAP_KEY) || "null") || seedMap();
      if (!mapData?.mindmap?.branches) return;
      chapters.forEach((chapter) => {
        const root = mapData.mindmap.branches.find((item) => item.id === chapter.rootId) || mapData.mindmap.branches.find((item) => item.title === chapter.domain);
        if (!root) return;
        root.children = Array.isArray(root.children) ? root.children : [];
        const chapterLessons = MathCourseData.lessons.filter((item) => item.chapter === chapter.name);
        const completed = chapterLessons.filter((lesson) => isLessonEvidenceComplete(lesson)).length;
        const chapterNode = ensureNode(root.children, `math-course-${chapter.number}`, {
          title: `${chapter.name} · ${completed}/${chapterLessons.length}课时`,
          note: `学习完成 ${chapterLessons.length ? Math.round(completed / chapterLessons.length * 100) : 0}% · 必做练习掌握 ${pct(chapter.name)}%`,
          color: chapter.color
        });
        chapterLessons.forEach((lesson) => syncLessonNode(chapterNode, lesson, chapter.color));
        syncChallengeNode(
          chapterNode,
          `math-challenge-${chapter.number}`,
          "培优挑战（不计入必做掌握率）",
          (item) => item.chapter === chapter.name,
          chapter.color
        );
        const lessonOrder = new Map(chapterLessons.map((lesson, index) => [`course-${lesson.id}`, index]));
        lessonOrder.set(`math-challenge-${chapter.number}`, chapterLessons.length);
        chapterNode.children.sort((a, b) => (lessonOrder.get(a.id) ?? 100) - (lessonOrder.get(b.id) ?? 100));
      });

      const reviewQuestions = MathCourseData.practice.filter((item) => item.chapter === REVIEW_CHAPTER && item.required);
      if (reviewQuestions.length) {
        const root = mapData.mindmap.branches.find((item) => item.id === "domain-3") || mapData.mindmap.branches.find((item) => item.title === "三角形与全等");
        if (root) {
          root.children = Array.isArray(root.children) ? root.children : [];
          const reviewStats = practiceStats((item) => item.chapter === REVIEW_CHAPTER);
          const reviewNode = ensureNode(root.children, "math-review-13-14", {
            title: "第13·14章复习练习",
            note: `必做 ${reviewStats.done}/${reviewStats.all} · 掌握 ${reviewStats.pct}%`,
            color: COLORS.pink
          });
          ["第13章 三角形", "第14章 全等三角形"].forEach((source) => {
            const sourceNumber = source.startsWith("第13") ? "13" : "14";
            const sourceQuestions = reviewQuestions.filter((item) => item.sourceChapter === source);
            const done = sourceQuestions.filter((item) => state.practice.submitted[item.id]);
            const right = done.filter((item) => state.practice.answers[item.id] === item.answer);
            const sourceNode = ensureNode(reviewNode.children, `math-review-${sourceNumber}`, {
              title: source,
              note: `必做 ${done.length}/${sourceQuestions.length} · 正确 ${right.length}/${done.length} · 掌握 ${done.length ? Math.round(right.length / done.length * 100) : 0}%`,
              color: sourceNumber === "13" ? COLORS.purple : COLORS.blue
            });
            const points = [...new Set(sourceQuestions.map((item) => item.point))];
            points.forEach((point, index) => {
              const rows = sourceQuestions.filter((item) => item.point === point);
              const answered = rows.filter((item) => state.practice.submitted[item.id]);
              const correct = answered.filter((item) => state.practice.answers[item.id] === item.answer);
              const pointId = `math-review-${sourceNumber}-point-${stableSlug(point)}`;
              migrateStableNodeId(sourceNode.children, pointId, `math-review-${sourceNumber}-point-${index}`, point);
              ensureNode(sourceNode.children, pointId, {
                title: point,
                note: answered.length ? `${correct.length}/${answered.length} 正确` : "待复习",
                color: sourceNode.color
              });
            });
          });
          syncChallengeNode(
            reviewNode,
            "math-review-13-14-challenge",
            "培优挑战（不计入必做掌握率）",
            (item) => item.chapter === REVIEW_CHAPTER,
            COLORS.pink
          );
        }
      }

      const reviewSources = [
        { reviewChapter: REVIEW_CHAPTER_15_16, source: "第15章 轴对称", number: "15", rootId: "domain-4", domain: "对称与特殊图形", color: COLORS.teal },
        { reviewChapter: REVIEW_CHAPTER_15_16, source: "第16章 整式的乘法", number: "16", rootId: "domain-5", domain: "代数变形", color: COLORS.violet },
        { reviewChapter: REVIEW_CHAPTER_17_18, source: "第17章 因式分解", number: "17", rootId: "domain-5", domain: "代数变形", color: COLORS.pink },
        { reviewChapter: REVIEW_CHAPTER_17_18, source: "第18章 分式", number: "18", rootId: "domain-0", domain: "数与式", color: COLORS.blue }
      ];
      reviewSources.forEach((sourceConfig) => {
        const sourceQuestions = MathCourseData.practice.filter((item) => (
          item.chapter === sourceConfig.reviewChapter
          && item.sourceChapter === sourceConfig.source
          && item.required
        ));
        if (!sourceQuestions.length) return;
        const root = mapData.mindmap.branches.find((item) => item.id === sourceConfig.rootId)
          || mapData.mindmap.branches.find((item) => item.title === sourceConfig.domain);
        if (!root) return;
        root.children = Array.isArray(root.children) ? root.children : [];
        const sourceStats = practiceStats((item) => (
          item.chapter === sourceConfig.reviewChapter
          && item.sourceChapter === sourceConfig.source
        ));
        const sourceNode = ensureNode(root.children, `math-review-${sourceConfig.number}`, {
          title: `第${sourceConfig.number}章复习练习`,
          note: `必做 ${sourceStats.done}/${sourceStats.all} · 掌握 ${sourceStats.pct}%`,
          color: sourceConfig.color
        });
        const points = [...new Set(sourceQuestions.map((item) => item.point))];
        points.forEach((point, index) => {
          const rows = sourceQuestions.filter((item) => item.point === point);
          const answered = rows.filter((item) => state.practice.submitted[item.id]);
          const correct = answered.filter((item) => state.practice.answers[item.id] === item.answer);
          const pointId = `math-review-${sourceConfig.number}-point-${stableSlug(point)}`;
          migrateStableNodeId(sourceNode.children, pointId, `math-review-${sourceConfig.number}-point-${index}`, point);
          ensureNode(sourceNode.children, pointId, {
            title: point,
            note: answered.length ? `${correct.length}/${answered.length} 正确` : "待复习",
            color: sourceConfig.color
          });
        });
        syncChallengeNode(
          sourceNode,
          `math-review-${sourceConfig.number}-challenge`,
          "培优挑战（不计入必做掌握率）",
          (item) => item.chapter === sourceConfig.reviewChapter && item.sourceChapter === sourceConfig.source,
          sourceConfig.color
        );
        const pointOrder = new Map(points.map((point, index) => [`math-review-${sourceConfig.number}-point-${stableSlug(point)}`, index]));
        pointOrder.set(`math-review-${sourceConfig.number}-challenge`, points.length);
        sourceNode.children.sort((a, b) => (pointOrder.get(a.id) ?? 100) - (pointOrder.get(b.id) ?? 100));
      });

      const priority = {
        "math-course-18": 0,
        "math-review-18": 1,
        "math-course-13": 0,
        "math-course-14": 1,
        "math-review-13-14": 2,
        "math-course-15": 0,
        "math-review-15": 1,
        "math-course-16": 0,
        "math-review-16": 1,
        "math-course-17": 2,
        "math-review-17": 3
      };
      mapData.mindmap.branches.forEach((branch) => {
        if (Array.isArray(branch.children)) branch.children.sort((a, b) => (priority[a.id] ?? 20) - (priority[b.id] ?? 20));
      });
      localStorage.setItem(MAP_KEY, JSON.stringify(mapData));
    } catch {}
  }

  function escape(s) {
    return String(s ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  }

  window.addEventListener("storage", (event) => {
    if (
      event.key !== KEY
      && event.key !== BACKUP_KEY
      && event.key !== LEGACY_KEY
      && event.key !== LEGACY_BACKUP_KEY
      && !event.key?.startsWith(RECORD_PREFIX)
    ) return;
    const before = JSON.stringify(state);
    const latest = load();
    const merged = mergeSnapshots(state, latest);
    if (JSON.stringify(merged) === before) return;
    applySnapshot(merged);
    try {
      window.dispatchEvent(new CustomEvent("fumi-progress-updated"));
    } catch {}
  });

  syncMap();
  window.MathCore = { state, save, pct, practiceStats, escape, syncMap };
})();
