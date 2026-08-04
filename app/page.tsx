"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { chapterOrder, domains, questions, type Question } from "./assessment-data";

type AnswerValue = string | string[];
type SavedState = {
  version: 1;
  answers: Record<string, AnswerValue>;
  current: number;
  startedAt: number | null;
  completedAt: number | null;
  submitted: boolean;
};
type ChatMessage = { role: "assistant" | "user"; text: string };
type View = "home" | "test" | "report";

const STORAGE_KEY = "fumi-math-map:v1";
const CHAT_KEY = "fumi-math-map:chat:v1";
const TEST_SECONDS = 40 * 60;

const emptyState: SavedState = {
  version: 1,
  answers: {},
  current: 0,
  startedAt: null,
  completedAt: null,
  submitted: false,
};

function normalize(value: AnswerValue | undefined) {
  if (Array.isArray(value)) return value.map((item) => item.trim());
  return String(value ?? "")
    .trim()
    .replace(/[，,]/g, "，")
    .replace(/\s+/g, "")
    .replace(/°|度/g, "")
    .toLowerCase();
}

function isCorrect(question: Question, answer: AnswerValue | undefined) {
  if (Array.isArray(question.answer)) {
    const normalized = normalize(answer);
    return Array.isArray(normalized) && normalized.join("|") === question.answer.join("|");
  }
  return normalize(answer) === normalize(question.answer);
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function confidenceLabel(count: number) {
  if (count >= 4) return "较高";
  if (count >= 2) return "中等";
  return "初步";
}

function masteryBand(score: number) {
  if (score >= 85) return { label: "稳定达成", detail: "已学内容基础较稳，可增加综合情境与迁移题。" };
  if (score >= 70) return { label: "基本达成", detail: "多数基础要求已达到，仍有少数知识链需要补齐。" };
  if (score >= 55) return { label: "部分达成", detail: "基础与应用之间存在断点，建议先修复关键章节。" };
  return { label: "需要巩固", detail: "当前应优先回到概念、法则和基本图形关系。" };
}

function wilsonInterval(correct: number, total: number) {
  if (!total) return [0, 100];
  const z = 1.96;
  const p = correct / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator;
  return [Math.max(0, Math.round((center - margin) * 100)), Math.min(100, Math.round((center + margin) * 100))];
}

function Diagram({ kind, step = 3 }: { kind?: Question["diagram"]; step?: number }) {
  if (!kind) return null;
  const reveal = (at: number) => ({ opacity: step >= at ? 1 : 0.12, transition: "all .45s ease" });
  const common = { width: "100%", height: "100%", viewBox: "0 0 360 220", role: "img" } as const;

  if (kind === "numberline") {
    return (
      <svg {...common} aria-label="数轴上A点为负二、B点为四">
        <defs><marker id="arrowN" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#6456d9" /></marker></defs>
        <line x1="35" y1="118" x2="330" y2="118" stroke="#6d6885" strokeWidth="3" markerEnd="url(#arrowN)" />
        {[-4,-3,-2,-1,0,1,2,3,4,5].map((n, i) => <g key={n}><line x1={55+i*28} y1="108" x2={55+i*28} y2="128" stroke="#6d6885" /><text x={55+i*28} y="151" textAnchor="middle" className="svg-text">{n}</text></g>)}
        <circle cx="111" cy="118" r="8" fill="#ef6b8f" style={reveal(1)} /><text x="111" y="91" textAnchor="middle" className="svg-label" style={reveal(1)}>A</text>
        <circle cx="279" cy="118" r="8" fill="#6d5ce7" style={reveal(1)} /><text x="279" y="91" textAnchor="middle" className="svg-label" style={reveal(1)}>B</text>
        <path d="M111 73 Q195 25 279 73" fill="none" stroke="#6d5ce7" strokeWidth="4" strokeDasharray="7 6" style={reveal(2)} />
        <text x="195" y="42" textAnchor="middle" className="svg-callout" style={reveal(3)}>|4−(−2)|=6</text>
      </svg>
    );
  }

  if (kind === "parallel") {
    return (
      <svg {...common} aria-label="两条平行线被一条截线所截">
        <line x1="35" y1="68" x2="325" y2="68" stroke="#5f57c8" strokeWidth="5" /><line x1="35" y1="164" x2="325" y2="164" stroke="#5f57c8" strokeWidth="5" />
        <line x1="115" y1="18" x2="240" y2="205" stroke="#27243a" strokeWidth="4" />
        <text x="42" y="55" className="svg-label">a</text><text x="42" y="151" className="svg-label">b</text>
        <path d="M151 68 A36 36 0 0 1 132 99" fill="none" stroke="#ef6b8f" strokeWidth="6" style={reveal(1)} />
        <text x="149" y="112" className="svg-callout" style={reveal(1)}>∠1=65°</text>
        <path d="M204 164 A34 34 0 0 1 222 132" fill="none" stroke="#52b7a8" strokeWidth="6" style={reveal(2)} />
        <text x="225" y="142" className="svg-callout" style={reveal(2)}>∠2</text>
        <text x="180" y="207" textAnchor="middle" className="svg-callout" style={reveal(3)}>内错角相等</text>
      </svg>
    );
  }

  if (kind === "angles") {
    return (
      <svg {...common} aria-label="一个平角被射线分成两个邻补角">
        <line x1="35" y1="155" x2="325" y2="155" stroke="#27243a" strokeWidth="4" />
        <line x1="180" y1="155" x2="105" y2="40" stroke="#6d5ce7" strokeWidth="5" />
        <circle cx="180" cy="155" r="6" fill="#27243a" />
        <text x="25" y="177" className="svg-label">A</text><text x="330" y="177" className="svg-label">B</text><text x="88" y="37" className="svg-label">C</text><text x="185" y="181" className="svg-label">O</text>
        <path d="M118 155 A62 62 0 0 1 146 103" fill="none" stroke="#ef6b8f" strokeWidth="7" style={reveal(1)} /><text x="97" y="119" className="svg-callout" style={reveal(1)}>126°</text>
        <path d="M147 105 A60 60 0 0 1 240 155" fill="none" stroke="#52b7a8" strokeWidth="7" style={reveal(2)} /><text x="213" y="112" className="svg-callout" style={reveal(3)}>54°</text>
      </svg>
    );
  }

  if (kind === "coordinate" || kind === "symmetry" || kind === "line") {
    const isMove = kind === "coordinate";
    const isSymmetry = kind === "symmetry";
    return (
      <svg {...common} aria-label={isMove ? "点在坐标系中平移" : isSymmetry ? "点关于y轴对称" : "一次函数图象"}>
        <defs><marker id="arrowC" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#6d5ce7" /></marker></defs>
        {[40,80,120,160,200,240,280,320].map((v) => <line key={`v${v}`} x1={v} y1="18" x2={v} y2="202" stroke="#ece9f7" />)}
        {[30,60,90,120,150,180].map((v) => <line key={`h${v}`} x1="28" y1={v} x2="334" y2={v} stroke="#ece9f7" />)}
        <line x1="28" y1="120" x2="335" y2="120" stroke="#6d6885" strokeWidth="2.5" markerEnd="url(#arrowC)" /><line x1="180" y1="202" x2="180" y2="17" stroke="#6d6885" strokeWidth="2.5" markerEnd="url(#arrowC)" />
        {isMove && <><circle cx="120" cy="75" r="8" fill="#ef6b8f" style={reveal(1)} /><text x="94" y="64" className="svg-callout" style={reveal(1)}>P(−2,3)</text><path d="M120 75 L270 75 L270 135" fill="none" stroke="#6d5ce7" strokeWidth="4" strokeDasharray="7 5" markerEnd="url(#arrowC)" style={reveal(2)} /><circle cx="270" cy="135" r="8" fill="#52b7a8" style={reveal(3)} /><text x="276" y="158" className="svg-callout" style={reveal(3)}>P′(3,−1)</text></>}
        {isSymmetry && <><circle cx="270" cy="150" r="8" fill="#ef6b8f" style={reveal(1)} /><text x="278" y="174" className="svg-callout" style={reveal(1)}>A(3,−2)</text><line x1="270" y1="150" x2="90" y2="150" stroke="#6d5ce7" strokeDasharray="7 5" strokeWidth="4" style={reveal(2)} /><circle cx="90" cy="150" r="8" fill="#52b7a8" style={reveal(3)} /><text x="37" y="174" className="svg-callout" style={reveal(3)}>A′(−3,−2)</text></>}
        {!isMove && !isSymmetry && <><line x1="76" y1="186" x2="296" y2="21" stroke="#6d5ce7" strokeWidth="5" style={reveal(1)} /><circle cx="180" cy="150" r="7" fill="#ef6b8f" style={reveal(2)} /><circle cx="300" cy="30" r="7" fill="#52b7a8" style={reveal(2)} /><text x="187" y="173" className="svg-callout" style={reveal(2)}>(0,−2)</text><text x="270" y="25" className="svg-callout" style={reveal(2)}>(4,6)</text><text x="75" y="47" className="svg-callout" style={reveal(3)}>y=2x−2</text></>}
      </svg>
    );
  }

  if (kind === "triangle" || kind === "pythagorean") {
    const pythagorean = kind === "pythagorean";
    return (
      <svg {...common} aria-label={pythagorean ? "直角边为6和8的直角三角形" : "三角形边长关系示意图"}>
        <path d="M70 180 L285 180 L150 38 Z" fill="rgba(109,92,231,.08)" stroke="#5f57c8" strokeWidth="5" style={reveal(1)} />
        {pythagorean && <><path d="M70 180 L70 157 L93 157" fill="none" stroke="#ef6b8f" strokeWidth="3" /><text x="46" y="113" className="svg-callout">6</text><text x="172" y="205" className="svg-callout">8</text><text x="230" y="92" className="svg-callout" style={reveal(2)}>c</text><text x="175" y="28" className="svg-callout" style={reveal(3)}>c²=6²+8²=100</text></>}
        {!pythagorean && <><text x="44" y="112" className="svg-callout" style={reveal(1)}>4</text><text x="224" y="95" className="svg-callout" style={reveal(1)}>7</text><text x="174" y="205" className="svg-callout" style={reveal(2)}>x</text><text x="180" y="25" textAnchor="middle" className="svg-callout" style={reveal(3)}>3&lt;x&lt;11</text></>}
      </svg>
    );
  }

  if (kind === "congruence") {
    return (
      <svg {...common} aria-label="两组三角形的两边及夹角对应">
        <path d="M35 175 L125 175 L70 52 Z" fill="rgba(109,92,231,.08)" stroke="#5f57c8" strokeWidth="4" /><path d="M215 175 L325 175 L275 52 Z" fill="rgba(82,183,168,.08)" stroke="#52a698" strokeWidth="4" />
        <text x="24" y="197" className="svg-label">B</text><text x="130" y="197" className="svg-label">C</text><text x="62" y="43" className="svg-label">A</text><text x="203" y="197" className="svg-label">E</text><text x="330" y="197" className="svg-label">F</text><text x="268" y="43" className="svg-label">D</text>
        <line x1="48" y1="147" x2="59" y2="141" stroke="#ef6b8f" strokeWidth="4" style={reveal(1)} /><line x1="236" y1="148" x2="247" y2="142" stroke="#ef6b8f" strokeWidth="4" style={reveal(1)} />
        <line x1="103" y1="129" x2="113" y2="135" stroke="#6d5ce7" strokeWidth="4" style={reveal(1)} /><line x1="301" y1="132" x2="311" y2="126" stroke="#6d5ce7" strokeWidth="4" style={reveal(1)} />
        <path d="M60 77 A30 30 0 0 1 84 78" fill="none" stroke="#f0a04b" strokeWidth="6" style={reveal(2)} /><path d="M264 78 A30 30 0 0 1 288 77" fill="none" stroke="#f0a04b" strokeWidth="6" style={reveal(2)} />
        <text x="180" y="28" textAnchor="middle" className="svg-callout" style={reveal(3)}>两边及其夹角：SAS</text>
      </svg>
    );
  }

  if (kind === "bisector") {
    return (
      <svg {...common} aria-label="角平分线上的点到角两边距离相等">
        <path d="M50 185 L318 185 M50 185 L290 42" fill="none" stroke="#27243a" strokeWidth="4" /><line x1="50" y1="185" x2="285" y2="112" stroke="#6d5ce7" strokeWidth="4" strokeDasharray="8 6" />
        <circle cx="200" cy="138" r="7" fill="#ef6b8f" style={reveal(1)} /><text x="207" y="128" className="svg-label">P</text>
        <line x1="200" y1="138" x2="200" y2="185" stroke="#52a698" strokeWidth="5" style={reveal(2)} /><line x1="200" y1="138" x2="173" y2="93" stroke="#52a698" strokeWidth="5" style={reveal(2)} /><text x="208" y="167" className="svg-callout">PM</text><text x="162" y="120" className="svg-callout">PN</text>
        <text x="270" y="28" className="svg-callout" style={reveal(3)}>PM=PN</text>
      </svg>
    );
  }

  if (kind === "parallelogram") {
    return (
      <svg {...common} aria-label="平行四边形对角线互相平分">
        <path d="M65 175 L265 175 L310 48 L110 48 Z" fill="rgba(109,92,231,.08)" stroke="#5f57c8" strokeWidth="5" />
        <line x1="65" y1="175" x2="310" y2="48" stroke="#ef6b8f" strokeWidth="4" style={reveal(1)} /><line x1="110" y1="48" x2="265" y2="175" stroke="#52a698" strokeWidth="4" style={reveal(1)} />
        <circle cx="188" cy="111" r="7" fill="#27243a" /><text x="197" y="105" className="svg-label">O</text>
        <text x="49" y="199" className="svg-label">A</text><text x="270" y="199" className="svg-label">B</text><text x="315" y="44" className="svg-label">C</text><text x="92" y="43" className="svg-label">D</text>
        <text x="116" y="124" className="svg-callout" style={reveal(2)}>AO=3</text><text x="218" y="87" className="svg-callout" style={reveal(2)}>OC=3</text><text x="185" y="25" textAnchor="middle" className="svg-callout" style={reveal(3)}>AC=6</text>
      </svg>
    );
  }

  return (
    <svg {...common} aria-label="数据条形图">
      <line x1="45" y1="190" x2="330" y2="190" stroke="#6d6885" strokeWidth="3" /><line x1="45" y1="20" x2="45" y2="190" stroke="#6d6885" strokeWidth="3" />
      {[2,3,3,6,6].map((value, index) => <g key={`${value}-${index}`}><rect x={65+index*50} y={190-value*20} width="30" height={value*20} rx="6" fill={index === 2 ? "#ef6b8f" : "#6d5ce7"} style={reveal(index < 2 ? 1 : index < 4 ? 2 : 3)} /><text x={80+index*50} y="211" textAnchor="middle" className="svg-text">{value}</text></g>)}
      <text x="184" y="18" textAnchor="middle" className="svg-callout">2，3，3，6，6</text>
    </svg>
  );
}

function Explanation({ question }: { question: Question }) {
  const [step, setStep] = useState(1);
  return (
    <div className="explanation-grid">
      {question.diagram && <div className="explanation-visual"><Diagram kind={question.diagram} step={step} /></div>}
      <div className="step-list">
        {question.steps.map((item, index) => (
          <button key={item} className={`step-button ${step === index + 1 ? "active" : ""}`} onClick={() => setStep(index + 1)}>
            <span>{index + 1}</span><span>{item}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Radar({ values }: { values: { label: string; score: number }[] }) {
  const size = 280;
  const center = size / 2;
  const radius = 104;
  const angle = (index: number) => -Math.PI / 2 + (index * Math.PI * 2) / values.length;
  const point = (index: number, amount: number) => `${center + Math.cos(angle(index)) * radius * amount},${center + Math.sin(angle(index)) * radius * amount}`;
  const polygon = values.map((item, index) => point(index, item.score / 100)).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar" role="img" aria-label="八个能力领域掌握度雷达图">
      {[0.25,0.5,0.75,1].map((level) => <polygon key={level} points={values.map((_, index) => point(index, level)).join(" ")} fill="none" stroke="#ded9f6" strokeWidth="1.5" />)}
      {values.map((item, index) => <g key={item.label}><line x1={center} y1={center} x2={point(index,1).split(",")[0]} y2={point(index,1).split(",")[1]} stroke="#e9e6f6" /><text x={center + Math.cos(angle(index))*126} y={center + Math.sin(angle(index))*126} textAnchor="middle" dominantBaseline="middle" className="radar-label">{item.label.replace("与", "·")}</text></g>)}
      <polygon points={polygon} fill="rgba(109,92,231,.24)" stroke="#6d5ce7" strokeWidth="3" />
      {values.map((item, index) => <circle key={item.label} cx={point(index,item.score/100).split(",")[0]} cy={point(index,item.score/100).split(",")[1]} r="4" fill="#ef6b8f" />)}
    </svg>
  );
}

function AppLogo() {
  return <div className="brand-mark" aria-hidden="true"><span>∑</span></div>;
}

export default function Home() {
  const [state, setState] = useState<SavedState>(emptyState);
  const [view, setView] = useState<View>("home");
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([{ role: "assistant", text: "你好，我是FUMI AI。交卷前我只提供一步提示，不会直接透露答案；交卷后可以一起拆解错题。" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let nextState = emptyState;
    let nextView: View = "home";
    let nextChat: ChatMessage[] | null = null;
    try {
      if (window.location.hash.startsWith("#report=")) {
        const encoded = window.location.hash.slice(8);
        const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded)))) as Pick<SavedState, "answers" | "completedAt">;
        nextState = { ...emptyState, answers: decoded.answers ?? {}, completedAt: decoded.completedAt ?? Date.now(), submitted: true };
        nextView = "report";
      } else {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as SavedState;
          nextState = parsed;
          if (parsed.submitted) nextView = "report";
        }
      }
      const savedChat = window.localStorage.getItem(CHAT_KEY);
      if (savedChat) nextChat = JSON.parse(savedChat);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    const hydrationState = nextState;
    const hydrationView = nextView;
    const hydrationChat = nextChat;
    window.setTimeout(() => {
      setState(hydrationState);
      setView(hydrationView);
      if (hydrationChat) setChat(hydrationChat);
      setNow(Date.now());
      setHydrated(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(chat.slice(-30)));
  }, [chat, hydrated]);

  useEffect(() => {
    if (!state.startedAt || state.submitted) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.startedAt, state.submitted]);

  const remaining = state.startedAt ? Math.min(TEST_SECONDS, Math.max(0, TEST_SECONDS - Math.floor((now - state.startedAt) / 1000))) : TEST_SECONDS;
  const answeredCount = Object.values(state.answers).filter((value) => Array.isArray(value) ? value.length : String(value).trim()).length;
  const currentQuestion = questions[state.current];

  const results = useMemo(() => {
    const rows = questions.map((question) => ({ question, correct: isCorrect(question, state.answers[question.id]), answered: Boolean(Array.isArray(state.answers[question.id]) ? state.answers[question.id].length : String(state.answers[question.id] ?? "").trim()) }));
    const correctCount = rows.filter((row) => row.correct).length;
    const weightedTotal = rows.reduce((sum, row) => sum + row.question.weight, 0);
    const weightedCorrect = rows.reduce((sum, row) => sum + (row.correct ? row.question.weight : 0), 0);
    const score = Math.round((weightedCorrect / weightedTotal) * 100);
    const domainStats = domains.map((domain) => {
      const selected = rows.filter((row) => row.question.domain === domain);
      const total = selected.reduce((sum, row) => sum + row.question.weight, 0);
      const correct = selected.reduce((sum, row) => sum + (row.correct ? row.question.weight : 0), 0);
      return { label: domain, score: total ? Math.round((correct / total) * 100) : 0, count: selected.length };
    });
    const chapterStats = chapterOrder.map((chapter) => {
      const selected = rows.filter((row) => row.question.chapter === chapter);
      const total = selected.reduce((sum, row) => sum + row.question.weight, 0);
      const correct = selected.reduce((sum, row) => sum + (row.correct ? row.question.weight : 0), 0);
      const score = total ? Math.round((correct / total) * 100) : 0;
      return { chapter, score, count: selected.length, rows: selected, confidence: confidenceLabel(selected.length) };
    });
    return { rows, correctCount, score, domainStats, chapterStats, interval: wilsonInterval(correctCount, questions.length), band: masteryBand(score) };
  }, [state.answers]);

  useEffect(() => {
    if (remaining === 0 && state.startedAt && !state.submitted) {
      window.setTimeout(() => {
        setState((previous) => ({ ...previous, submitted: true, completedAt: Date.now() }));
        setView("report");
      }, 0);
    }
  }, [remaining, state.startedAt, state.submitted]);

  function startTest() {
    setState((previous) => ({ ...previous, startedAt: previous.startedAt ?? Date.now(), submitted: false }));
    setNow(Date.now());
    setView("test");
  }

  function setAnswer(value: AnswerValue) {
    setState((previous) => ({ ...previous, answers: { ...previous.answers, [currentQuestion.id]: value } }));
  }

  function submitTest() {
    if (answeredCount < questions.length && !window.confirm(`还有${questions.length - answeredCount}题未作答。未作答题将计为未掌握，确定交卷吗？`)) return;
    setState((previous) => ({ ...previous, submitted: true, completedAt: Date.now() }));
    setView("report");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAll() {
    if (!window.confirm("确定清除本设备上的测验记录并重新开始吗？此操作无法撤销。")) return;
    setState(emptyState);
    setChat([{ role: "assistant", text: "记录已清空。准备好后，我们从新的40分钟诊断开始。" }]);
    window.localStorage.removeItem(STORAGE_KEY);
    window.location.hash = "";
    setView("home");
  }

  async function copyReportLink() {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ answers: state.answers, completedAt: state.completedAt }))));
    const url = `${window.location.origin}${window.location.pathname}#report=${payload}`;
    await navigator.clipboard.writeText(url);
    setNotice("匿名报告链接已复制。链接中不含姓名、学校或性别。 ");
    window.setTimeout(() => setNotice(""), 3500);
  }

  function downloadReport() {
    const chapterHtml = results.chapterStats.map((item) => `<tr><td>${item.chapter}</td><td>${item.score}%</td><td>${item.confidence}（${item.count}题）</td></tr>`).join("");
    const wrongHtml = results.rows.filter((row) => !row.correct).map((row) => `<li><b>${row.question.chapter} · ${row.question.point}</b><br>${row.question.stem}<br>正确答案：${Array.isArray(row.question.answer) ? row.question.answer.join(" → ") : row.question.answer}</li>`).join("");
    const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>FUMI匿名数学诊断报告</title><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;color:#27243a;max-width:900px;margin:40px auto;padding:0 24px;line-height:1.75}h1{color:#5f57c8}header{border-bottom:4px solid #6d5ce7;padding-bottom:18px}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{border:1px solid #ddd8f1;padding:10px;text-align:left}th{background:#f5f2ff}.badge{display:inline-block;background:#ede9ff;color:#5548bc;padding:4px 12px;border-radius:99px}li{margin:14px 0}.note{background:#f7f5ff;padding:16px;border-radius:12px}</style><body><header><p>FUMI数学能力地图 · 匿名报告</p><h1>${results.score}% · ${results.band.label}</h1><p>${results.band.detail}</p></header><h2>测验说明</h2><p class="note">本报告依据人教版七、八年级已学内容的40分钟诊断生成。掌握度区间为${results.interval[0]}%–${results.interval[1]}%。它反映当前样本下的已学内容表现，不是中考分数承诺。</p><h2>章节掌握度</h2><table><thead><tr><th>章节</th><th>掌握度</th><th>证据置信度</th></tr></thead><tbody>${chapterHtml}</tbody></table><h2>需要回看的题目</h2><ol>${wrongHtml || "<li>本次所有题目均作答正确。</li>"}</ol><h2>数据口径</h2><p>题型依据北京中考2023—2025公开试题与官方评析校准。由于官方未稳定公开逐题正确率，本报告不使用伪造的群体正确率。</p><p>生成时间：${new Date(state.completedAt ?? Date.now()).toLocaleString("zh-CN")}</p></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "FUMI数学诊断匿名报告.html";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function askAI(seed?: string) {
    const message = (seed ?? chatInput).trim();
    if (!message || chatBusy) return;
    const userMessage: ChatMessage = { role: "user", text: message };
    setChat((previous) => [...previous, userMessage]);
    setChatInput("");
    setChatBusy(true);
    const fallback = state.submitted
      ? `${currentQuestion.point}这道题可以沿着“${currentQuestion.steps.join(" → ")}”来复盘。你先告诉我卡在哪一步，我再针对那一步解释。`
      : `先给你一步提示：${currentQuestion.hint} 你可以据此重新检查刚才的思路。`;
    try {
      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          submitted: state.submitted,
          question: { stem: currentQuestion.stem, point: currentQuestion.point, chapter: currentQuestion.chapter, options: currentQuestion.options, hint: currentQuestion.hint, answer: state.submitted ? currentQuestion.answer : undefined, steps: state.submitted ? currentQuestion.steps : undefined },
          history: [...chat, userMessage].slice(-8),
        }),
      });
      if (!response.ok) throw new Error("ai unavailable");
      const data = (await response.json()) as { reply?: string };
      setChat((previous) => [...previous, { role: "assistant", text: data.reply || fallback }]);
    } catch {
      setChat((previous) => [...previous, { role: "assistant", text: fallback }]);
    } finally {
      setChatBusy(false);
    }
  }

  if (!hydrated) return <main className="loading-screen"><AppLogo /><p>正在读取本设备上的学习记录…</p></main>;

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setView("home")} aria-label="返回首页"><AppLogo /><span><b>FUMI</b><small>数学能力地图</small></span></button>
        <nav aria-label="主要导航">
          <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>能力地图</button>
          <button className={view === "test" ? "active" : ""} onClick={() => state.startedAt ? setView("test") : startTest()}>40分钟诊断</button>
          <button className={view === "report" ? "active" : ""} disabled={!state.submitted} onClick={() => setView("report")}>诊断报告</button>
        </nav>
        <div className="top-actions"><span className="privacy-pill">仅保存在本设备</span>{state.startedAt && !state.submitted && <span className={`timer-mini ${remaining < 300 ? "warning" : ""}`}>{formatTime(remaining)}</span>}</div>
      </header>

      {view === "home" && (
        <div className="page-shell home-page">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span>北京中考主标准</span><span>人教版七—八年级</span></div>
              <h1>把“会不会”，<br /><em>看成一张清楚的地图。</em></h1>
              <p>40分钟完成一次匿名诊断。系统从知识、方法和图形推理三个层面分析答题证据，不导入历史成绩，也不展示真实姓名。</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={state.submitted ? () => setView("report") : startTest}>{state.submitted ? "查看诊断报告" : state.startedAt ? "继续诊断" : "开始40分钟诊断"}<span>→</span></button>
                <button className="ghost-button" onClick={() => document.getElementById("method")?.scrollIntoView({ behavior: "smooth" })}>了解评分方法</button>
              </div>
              <p className="save-note"><span>✓</span> 自动保存进度 · 可生成匿名链接与报告文件</p>
            </div>
            <div className="hero-map" aria-label="能力地图概览">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="map-center"><span>20</span><small>教材章节</small></div>
              {domains.map((domain, index) => <div key={domain} className={`map-node node-${index + 1}`}><b>{index + 1}</b><span>{domain}</span></div>)}
              <div className="hero-card"><span>诊断后获得</span><b>章节掌握度</b><small>含证据置信度与逐题讲解</small></div>
            </div>
          </section>

          <section className="quick-stats">
            <article><b>40:00</b><span>主诊断时长</span><small>计时与进度自动保存</small></article>
            <article><b>26</b><span>核心诊断任务</span><small>覆盖20个教材章节</small></article>
            <article><b>12</b><span>动态图形场景</span><small>点击步骤逐层呈现</small></article>
            <article><b>0</b><span>个人身份字段</span><small>不记录姓名、学校、性别</small></article>
          </section>

          <section className="section-block">
            <div className="section-heading"><div><span>诊断蓝图</span><h2>从基础运算到数据推理</h2></div><p>章节编号在不同教材版次中可能调整，因此系统用“章节名称 + 知识点”双重映射，保证报告可读。</p></div>
            <div className="domain-grid">
              {domains.map((domain, index) => {
                const domainQuestions = questions.filter((question) => question.domain === domain);
                return <article key={domain}><div className="domain-icon">{["−3", "x", "∠", "△", "◇", "√", "ƒ", "▥"][index]}</div><div><span>能力领域 {String(index + 1).padStart(2,"0")}</span><h3>{domain}</h3><p>{Array.from(new Set(domainQuestions.map((question) => question.chapter))).slice(0,3).join(" · ")}</p></div><b>{domainQuestions.length}题</b></article>;
              })}
            </div>
          </section>

          <section id="method" className="method-section">
            <div className="method-copy"><span className="section-kicker">真实可核验模式</span><h2>不制造“近三年正确率”</h2><p>公开资料没有稳定提供逐题、逐知识点正确率。因此网站只使用可核验的北京中考公开试题结构和官方评析来校准题型与相对难度；学生掌握度完全由本次作答生成。</p><div className="source-links"><a href="https://www.bjeea.cn/html/ksb/zhongyaoxinwen/2024/0401/84988.html" target="_blank" rel="noreferrer">北京2023学考评价报告 ↗</a><a href="https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582346895190.pdf" target="_blank" rel="noreferrer">数学课程标准（2022）↗</a></div></div>
            <div className="method-steps"><div><b>01</b><span><strong>作答证据</strong>正确性、难度、知识点</span></div><div><b>02</b><span><strong>章节聚合</strong>显示题数与置信度</span></div><div><b>03</b><span><strong>大纲达成</strong>提供区间而非承诺分数</span></div><div><b>04</b><span><strong>补强路径</strong>先修复最关键知识链</span></div></div>
          </section>
        </div>
      )}

      {view === "test" && (
        <div className="test-layout">
          <aside className="question-sidebar">
            <div className="sidebar-head"><span>诊断进度</span><b>{answeredCount}/{questions.length}</b></div>
            <div className="progress-track"><i style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
            <div className="domain-nav">
              {domains.map((domain) => {
                const indexes = questions.map((question, index) => question.domain === domain ? index : -1).filter((index) => index >= 0);
                const done = indexes.filter((index) => state.answers[questions[index].id] !== undefined && String(state.answers[questions[index].id]).length).length;
                return <div key={domain}><span>{domain}</span><small>{done}/{indexes.length}</small><div>{indexes.map((index) => <button key={index} onClick={() => setState((previous) => ({ ...previous, current: index }))} className={`${state.current === index ? "current" : ""} ${state.answers[questions[index].id] !== undefined && String(state.answers[questions[index].id]).length ? "done" : ""}`}>{index + 1}</button>)}</div></div>;
              })}
            </div>
            <button className="sidebar-home" onClick={() => setView("home")}>暂离测验（进度已保存）</button>
          </aside>

          <section className="question-stage">
            <div className="question-topline"><div><span>{currentQuestion.grade}·{currentQuestion.semester}</span><b>{currentQuestion.chapter}</b><small>{currentQuestion.point}</small></div><div className={`timer-large ${remaining < 300 ? "warning" : ""}`}><small>剩余时间</small><b>{formatTime(remaining)}</b></div></div>
            <div className="question-card">
              <div className="question-meta"><span>第 {state.current + 1} 题 / {questions.length}</span><span className={`difficulty ${currentQuestion.difficulty}`}>{currentQuestion.difficulty}</span><span>{currentQuestion.type === "order" ? "步骤排序" : currentQuestion.type === "input" ? "填空题" : "选择题"}</span></div>
              <h2>{currentQuestion.stem}</h2>
              {currentQuestion.diagram && <div className="diagram-card"><Diagram kind={currentQuestion.diagram} /></div>}
              {currentQuestion.type === "single" && <div className="option-list">{currentQuestion.options?.map((option, index) => <button key={option} className={state.answers[currentQuestion.id] === option ? "selected" : ""} onClick={() => setAnswer(option)}><span>{String.fromCharCode(65 + index)}</span><b>{option}</b><i>✓</i></button>)}</div>}
              {currentQuestion.type === "input" && <div className="input-answer"><label htmlFor="answer">你的答案</label><div><input ref={inputRef} id="answer" value={String(state.answers[currentQuestion.id] ?? "")} onChange={(event) => setAnswer(event.target.value)} inputMode="decimal" autoComplete="off" /><span>{currentQuestion.unit ?? ""}</span></div><small>系统会忽略空格、度数符号等格式差异。</small></div>}
              {currentQuestion.type === "order" && <div className="order-answer"><div className="order-pool">{currentQuestion.options?.map((option) => { const used = Array.isArray(state.answers[currentQuestion.id]) && state.answers[currentQuestion.id].includes(option); return <button key={option} disabled={used} onClick={() => setAnswer([...(Array.isArray(state.answers[currentQuestion.id]) ? state.answers[currentQuestion.id] : []), option])}>{option}</button>; })}</div><div className="order-result"><span>你的顺序</span>{Array.isArray(state.answers[currentQuestion.id]) && state.answers[currentQuestion.id].length ? (state.answers[currentQuestion.id] as string[]).map((item,index) => <button key={item} onClick={() => setAnswer((state.answers[currentQuestion.id] as string[]).filter((_, i) => i !== index))}><b>{index+1}</b>{item}</button>) : <p>依次点击上方步骤</p>}</div></div>}
              <div className="question-tools"><button onClick={() => { setAiOpen(true); setChat((previous) => [...previous, { role: "assistant", text: `这题先看一个方向：${currentQuestion.hint}` }]); }}>问FUMI AI要一步提示</button><span>交卷前不会显示答案</span></div>
            </div>
            <div className="question-footer"><button disabled={state.current === 0} onClick={() => setState((previous) => ({ ...previous, current: Math.max(0, previous.current - 1) }))}>← 上一题</button><div>{questions.map((question, index) => <i key={question.id} className={`${index === state.current ? "current" : ""} ${state.answers[question.id] !== undefined && String(state.answers[question.id]).length ? "done" : ""}`} />)}</div>{state.current < questions.length - 1 ? <button className="next-button" onClick={() => setState((previous) => ({ ...previous, current: Math.min(questions.length - 1, previous.current + 1) }))}>下一题 →</button> : <button className="submit-button" onClick={submitTest}>完成并交卷</button>}</div>
          </section>
        </div>
      )}

      {view === "report" && state.submitted && (
        <div className="page-shell report-page">
          <section className="report-hero">
            <div><span className="section-kicker">匿名诊断报告</span><h1>{results.band.label}</h1><p>{results.band.detail}</p><div className="report-actions"><button className="primary-button" onClick={downloadReport}>下载匿名报告</button><button className="ghost-button" onClick={copyReportLink}>复制匿名链接</button><button className="ghost-button" onClick={() => window.print()}>打印 / 保存PDF</button></div>{notice && <div className="toast">{notice}</div>}</div>
            <div className="score-orb"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="72" /><circle className="score-ring" cx="90" cy="90" r="72" style={{ strokeDasharray: `${results.score * 4.52} 452` }} /></svg><div><b>{results.score}<small>%</small></b><span>已学大纲达成度</span></div></div>
          </section>

          <section className="report-warning"><b>如何理解这个数字？</b><p>本次26题形成的95%统计区间约为 <strong>{results.interval[0]}%–{results.interval[1]}%</strong>。章节只有1题时会标记“初步”，不能把它解释成精确到个位数的能力结论。本报告也不预测尚未学习的初三内容。</p></section>

          <section className="analytics-grid">
            <article className="radar-card"><div className="card-title"><span>能力结构</span><h2>八领域掌握图</h2></div><Radar values={results.domainStats} /><div className="radar-legend">{results.domainStats.map((item) => <div key={item.label}><span>{item.label}</span><b>{item.score}%</b></div>)}</div></article>
            <article className="priority-card"><div className="card-title"><span>学习优先级</span><h2>先补哪三块</h2></div>{[...results.domainStats].sort((a,b) => a.score-b.score).slice(0,3).map((item,index) => <div className="priority-row" key={item.label}><b>0{index+1}</b><div><span>{item.label}</span><i><em style={{ width: `${item.score}%` }} /></i></div><strong>{item.score}%</strong></div>)}<div className="plan-note"><span>下一步建议</span><p>先重做对应错题并说清“题干要求 → 解题步骤 → 知识依据”，再让FUMI AI生成3道同类变式。</p><button onClick={() => { setAiOpen(true); setChat((previous) => [...previous, { role: "assistant", text: `根据本次报告，优先补强：${[...results.domainStats].sort((a,b) => a.score-b.score).slice(0,3).map((item) => item.label).join("、")}。我可以逐章安排复习。` }]); }}>让FUMI AI制定计划 →</button></div></article>
          </section>

          <section className="chapter-section">
            <div className="section-heading"><div><span>章节分析</span><h2>20个章节的作答证据</h2></div><p>掌握度按题目难度加权；每一行同时显示证据题数和置信度。</p></div>
            <div className="chapter-table"><div className="chapter-table-head"><span>章节</span><span>证据</span><span>掌握度</span><span>状态</span></div>{results.chapterStats.map((item) => <details key={item.chapter} className={item.score < 60 ? "weak" : ""}><summary><span><b>{item.chapter}</b><small>{item.rows.map((row) => row.question.point).join(" · ")}</small></span><span>{item.count}题 · {item.confidence}</span><span><i><em style={{ width: `${item.score}%` }} /></i><b>{item.score}%</b></span><span>{item.score >= 85 ? "稳定" : item.score >= 60 ? "待巩固" : "优先复习"}⌄</span></summary><div className="chapter-detail">{item.rows.map((row) => <article key={row.question.id}><div className="answer-review"><span className={row.correct ? "correct" : "incorrect"}>{row.correct ? "✓ 回答正确" : "× 需要回看"}</span><h3>{row.question.stem}</h3><p>你的答案：<b>{Array.isArray(state.answers[row.question.id]) ? (state.answers[row.question.id] as string[]).join(" → ") : String(state.answers[row.question.id] ?? "未作答")}</b></p><p>正确答案：<b>{Array.isArray(row.question.answer) ? row.question.answer.join(" → ") : row.question.answer}</b></p><div className="error-tags">{!row.correct && row.question.errorTags.map((tag) => <span key={tag}>{tag}</span>)}<span>{row.question.difficulty}</span></div></div><Explanation question={row.question} /></article>)}</div></details>)}</div>
          </section>

          <section className="methodology-card"><div><span>数据口径</span><h2>可核验，但不夸大</h2></div><ul><li><b>课程范围：</b>教育部《义务教育数学课程标准（2022年版）》与人教版七、八年级已学知识点映射。</li><li><b>题型校准：</b>参考2023—2025北京中考公开试题结构与北京教育考试院官方评析，题目为重新设计的诊断题。</li><li><b>正确率说明：</b>不展示无法核验的“全市逐题正确率”；本站未来如积累匿名样本，会与官方数据分栏显示。</li><li><b>预测边界：</b>这里只报告已学内容的大纲达成度，不把结果直接换算成未来中考分数。</li></ul><div><a href="https://www.bjeea.cn/html/ksb/zhongyaoxinwen/2024/0401/84988.html" target="_blank" rel="noreferrer">查看北京官方评价研究报告 ↗</a><button onClick={resetAll}>清除本机记录并重测</button></div></section>
        </div>
      )}

      <button className={`ai-fab ${aiOpen ? "open" : ""}`} onClick={() => setAiOpen((previous) => !previous)} aria-label="打开FUMI AI"><span>✦</span><b>FUMI AI</b></button>
      <aside className={`ai-panel ${aiOpen ? "open" : ""}`} aria-label="FUMI AI数学辅导">
        <div className="ai-head"><div><span>✦</span><div><b>FUMI AI</b><small>{state.submitted ? "已开启完整讲解" : "诊断中 · 仅一步提示"}</small></div></div><button onClick={() => setAiOpen(false)}>×</button></div>
        <div className="ai-context"><span>当前上下文</span><b>{currentQuestion.chapter} · {currentQuestion.point}</b></div>
        <div className="chat-list">{chat.map((message,index) => <div key={`${message.role}-${index}`} className={message.role}><span>{message.role === "assistant" ? "F" : "我"}</span><p>{message.text}</p></div>)}{chatBusy && <div className="assistant"><span>F</span><p className="typing">正在组织思路…</p></div>}</div>
        <div className="quick-prompts">{(state.submitted ? ["解释我错在哪里", "换一种方法", "生成一道变式题"] : ["给我一步提示", "提醒我用哪个定理", "帮我检查思路"]).map((prompt) => <button key={prompt} onClick={() => askAI(prompt)}>{prompt}</button>)}</div>
        <form className="chat-form" onSubmit={(event) => { event.preventDefault(); askAI(); }}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="描述你卡住的地方…" /><button disabled={!chatInput.trim() || chatBusy}>↑</button></form>
        <p className="ai-privacy">对话保存在本浏览器，只发送当前题目上下文。</p>
      </aside>
    </main>
  );
}
