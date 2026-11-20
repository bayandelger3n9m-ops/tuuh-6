import { allTopics, findTopic } from '../content/index.js';

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Сэдвийн асуултын сан: хичээлийн асуулт + багшийн нэмсэн асуулт
export function topicPool(topicId, custom = []) {
  const t = findTopic(topicId);
  const base = (t?.questions || []).map((x, i) => ({ ...x, id: `${topicId}#${i}`, topicId }));
  const extra = custom
    .filter((c) => c.topic_id === topicId)
    .map((c) => ({ q: c.q, o: c.o, a: c.a, e: c.e, id: `c:${c.id}`, topicId, src: 'Багшийн асуулт' }));
  return [...base, ...extra];
}

export function gradePool(grade, custom = []) {
  return allTopics(grade).flatMap((t) => topicPool(t.id, custom));
}

// Сурагчийн өмнө нь хариулсан асуултууд: qid → { at, correct } (хамгийн сүүлийн хариулт)
export function seenMap(attempts = []) {
  const m = new Map();
  for (const a of attempts) for (const d of a.answers || []) if (d.qid) m.set(d.qid, { at: a.created_at || '', correct: !!d.correct });
  return m;
}

// Асуулт бүрийн хариултын хувилбарыг холино; зөв хариуг шинэ индексээр хадгална.
function prepare(q) {
  const order = shuffle(q.o.map((_, i) => i));
  return { ...q, options: order.map((i) => q.o[i]), answer: order.indexOf(q.a) };
}

// count асуултыг сонгож, дараалал + хувилбарыг холино.
// seen өгвөл хандах бүрт шинэ асуулт давуу: 1) огт хариулаагүй, 2) сүүлд буруу хариулсан, 3) зөв хариулсан (эртнийх нь эхэнд).
export function buildSet(pool, count, seen = null) {
  const n = Math.min(count, pool.length);
  if (!seen?.size) return shuffle(pool).slice(0, n).map(prepare);
  const tiers = [[], [], []];
  for (const q of shuffle(pool)) {
    const s = seen.get(q.id);
    tiers[!s ? 0 : !s.correct ? 1 : 2].push(q);
  }
  tiers[2].sort((a, b) => seen.get(a.id).at.localeCompare(seen.get(b.id).at));
  return shuffle([...tiers[0], ...tiers[1], ...tiers[2]].slice(0, n)).map(prepare);
}

export function grade(questions, answers) {
  const details = questions.map((q, i) => ({
    qid: q.id,
    topicId: q.topicId,
    q: q.q,
    options: q.options,
    answer: q.answer,
    chosen: answers[i] ?? null,
    correct: answers[i] === q.answer,
    e: q.e || '',
  }));
  const score = details.filter((d) => d.correct).length;
  const total = details.length;
  return { score, total, details };
}

// Хадгалах хэлбэр: зөв хариултыг товч, буруу хариултыг (алдааны жагсаалтад хэрэгтэй) бүтнээр нь.
export function compactDetails(details) {
  return details.map((d) => (d.correct ? { qid: d.qid, topicId: d.topicId, correct: true } : d));
}

export const optLabel = (j) => 'АБВГД'[j] ?? String(j + 1);

export const pct = (s, t) => (t ? Math.round((s / t) * 100) : 0);
