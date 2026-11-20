import { pct } from './quiz.js';

// Сэдэв бүрийн эзэмшилт: тухайн сэдвийн сүүлийн 20 хариултын зөв хувь
export function topicMastery(attempts) {
  const byTopic = {};
  for (const a of attempts) {
    for (const d of a.answers || []) {
      if (!d.topicId) continue;
      (byTopic[d.topicId] ||= []).push(d.correct);
    }
  }
  const out = {};
  for (const [t, arr] of Object.entries(byTopic)) {
    const last = arr.slice(-20);
    out[t] = { pct: pct(last.filter(Boolean).length, last.length), n: arr.length };
  }
  return out;
}

// Алдсан асуултууд: асуулт бүрийн хамгийн сүүлийн хариулт буруу бол жагсаалтад орно
export function openMistakes(attempts) {
  const last = new Map();
  for (const a of attempts) for (const d of a.answers || []) last.set(d.qid, { ...d, at: a.created_at, title: a.title });
  return [...last.values()].filter((d) => !d.correct).reverse();
}

export const KIND_LABEL = { lesson: 'Хичээл', mcq: 'Сонгох тест', match: 'Холбох', order: 'Дараалал' };

export function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDur(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, '0')}`;
}

// ---------- Тоологдох үзүүлэлт, долоо хоногийн ахиц, сул сэдэв ----------
const DAY = 86400000;
// Долоо хоногийн эхлэл (Даваа гараг, 00:00)
export function weekStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const md = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

// Сүүлийн n долоо хоног бүрийн сорилын дундаж хувь, оролдлогын тоо
export function weeklyStats(rows, n = 8) {
  const now = weekStart(new Date());
  const weeks = Array.from({ length: n }, (_, i) => {
    const start = new Date(now.getTime() - (n - 1 - i) * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    return { start, end, label: md(start), range: `${md(start)}–${md(new Date(end.getTime() - DAY))}`, tests: [], all: 0 };
  });
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    const w = weeks.find((x) => t >= x.start.getTime() && t < x.end.getTime());
    if (!w) continue;
    w.all++;
    if (r.kind !== 'lesson') w.tests.push(r);
  }
  return weeks.map((w) => ({
    ...w,
    avg: w.tests.length ? Math.round(w.tests.reduce((s, r) => s + pct(r.score, r.total), 0) / w.tests.length) : null,
  }));
}

// Даалгавар тухайн сурагчид хамаарах эсэх, хийсэн эсэх
export const assignmentFor = (a, student) => a.grade === student.grade && (!a.section || a.section === student.section);
export const assignmentDone = (a, rows) =>
  rows.some((x) => x.assignment_id === a.id || (x.topic_id === a.topic_id && x.kind === a.kind && x.created_at >= a.created_at));

// Нийт тоо: даалгавар, зөв хариулт, идэвхтэй долоо хоног
export function countStats(rows, assignments = [], weeks = 8) {
  const done = assignments.filter((a) => assignmentDone(a, rows)).length;
  let right = 0;
  let total = 0;
  for (const r of rows) {
    if (r.answers?.length) {
      right += r.answers.filter((d) => d.correct).length;
      total += r.answers.length;
    } else {
      right += r.score || 0;
      total += r.total || 0;
    }
  }
  const active = weeklyStats(rows, weeks).filter((w) => w.all > 0).length;
  return {
    assign: { done, total: assignments.length },
    correct: { done: right, total },
    active: { done: active, total: weeks },
  };
}

// Сэдэв бүрийн эзэмшилт + засаагүй алдааны тоо; сул (70%-иас доош) нь эхэндээ
export function topicReport(rows) {
  const m = topicMastery(rows);
  const open = {};
  for (const d of openMistakes(rows)) if (d.topicId) open[d.topicId] = (open[d.topicId] || 0) + 1;
  return Object.entries(m)
    .map(([id, v]) => ({ id, pct: v.pct, n: v.n, open: open[id] || 0 }))
    .sort((a, b) => a.pct - b.pct || b.n - a.n);
}
