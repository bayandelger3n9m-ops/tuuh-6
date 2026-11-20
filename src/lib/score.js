// Оноо, зэрэг, тэмдэг. Бүгдийг сурагчийн оролдлогуудаас (attempts) тооцно —
// тусдаа хүснэгт хэрэггүй, багш ч яг ижлээр харна.
import { allTopics, topicGames } from '../content/index.js';

export const PTS = {
  correct: 10, // зөв хариулт бүр
  streak: 5, // 3 дахь дараалсан зөв хариултаас эхлэн бүрт
  perfect: 20, // 100% авбал
  lesson: 20, // хичээлийн картуудыг дуусгавал (нэг удаа)
  assignment: 10, // багшийн өгсөн даалгавраар хийвэл
};

export const POINT_RULES = [
  ['Зөв хариулт бүр', `+${PTS.correct}`],
  ['3 ба түүнээс олон дараалан зөв хариулбал', `хариулт бүрт +${PTS.streak}`],
  ['Тестэд 100% авбал', `+${PTS.perfect}`],
  ['Хичээлийн картуудыг дуусгавал', `+${PTS.lesson}`],
  ['Багшийн даалгаврыг хийвэл', `+${PTS.assignment}`],
  ['Нэг тестийг олон удаа өгвөл', 'хамгийн өндөр оноо нь тоологдоно'],
];

// Тоглоом дуусахад нэг оролдлогын оноо
export function gamePoints({ score, total, streakBonus = 0, assignment = false }) {
  let p = score * PTS.correct + streakBonus;
  if (total > 0 && score === total) p += PTS.perfect;
  if (assignment) p += PTS.assignment;
  return p;
}

// Дараалсан зөв хариултын урамшуулал: [true, true, true, false, true] → 3 дахь нь +5
export function streakInfo(results) {
  let run = 0;
  let best = 0;
  let bonus = 0;
  for (const ok of results) {
    run = ok ? run + 1 : 0;
    if (run >= 3) bonus += PTS.streak;
    best = Math.max(best, run);
  }
  return { bonus, best };
}

export const KIND = {
  lesson: { name: 'Хичээл', icon: '📖' },
  mcq: { name: 'Сонгох тест', icon: '🎯' },
  match: { name: 'Холбох тоглоом', icon: '🔗' },
  order: { name: 'Он цагийн дараалал', icon: '⏳' },
};
export const isGame = (r) => r.kind !== 'lesson';
const pctOf = (r) => (r.total ? Math.round((r.score * 100) / r.total) : 0);

// Нийт оноо: сэдэв × төрөл бүрийн хамгийн өндөр оноо
export function totalPoints(rows) {
  const best = new Map();
  for (const r of rows) {
    const k = `${r.topic_id}|${r.kind}`;
    best.set(k, Math.max(best.get(k) || 0, r.points || 0));
  }
  let s = 0;
  for (const v of best.values()) s += v;
  return s;
}

// Сэдэв × тоглоом бүрийн хамгийн өндөр хувь: { topicId: { lesson: true, mcq: 80, ... } }
export function bestByTopic(rows) {
  const out = {};
  for (const r of rows) {
    const t = (out[r.topic_id] ||= {});
    if (r.kind === 'lesson') t.lesson = true;
    else t[r.kind] = Math.max(t[r.kind] ?? 0, pctOf(r));
  }
  return out;
}

export const LEVELS = [
  { min: 0, icon: '🌱', name: 'Шинэ судлаач' },
  { min: 100, icon: '🏹', name: 'Чулуун зэвсгийн анчин' },
  { min: 300, icon: '🏺', name: 'Археологич' },
  { min: 600, icon: '📜', name: 'Түүхч' },
  { min: 1000, icon: '🏛️', name: 'Эрдэмтэн' },
  { min: 1500, icon: '👑', name: 'Түүхийн мэргэн' },
];
export function levelOf(points = 0) {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] || null;
  return { ...cur, index: i, next, progress: next ? Math.round(((points - cur.min) * 100) / (next.min - cur.min)) : 100 };
}

// Тэмдэг: test(rows) → true бол авсан
export const BADGES = [
  {
    id: 'first',
    icon: '👣',
    name: 'Анхны алхам',
    rule: 'Анхны хичээлээ дуусгасан',
    test: (rows) => rows.some((r) => r.kind === 'lesson'),
  },
  {
    id: 'perfect',
    icon: '💯',
    name: 'Төгс оноо',
    rule: 'Аль нэг тестэд 100% авсан',
    test: (rows) => rows.some((r) => isGame(r) && r.total > 0 && r.score === r.total),
  },
  {
    id: 'streak',
    icon: '🔥',
    name: 'Галт цуваа',
    rule: 'Сонгох тестэд 5 асуултад дараалан зөв хариулсан',
    test: (rows) => rows.some((r) => r.kind === 'mcq' && (r.streak || 0) >= 5),
  },
  {
    id: 'gamer',
    icon: '🎮',
    name: 'Тоглоомын мастер',
    rule: 'Нэг сэдвийн бүх төрлийн тоглоомыг тоглосон',
    test: (rows) => {
      const b = bestByTopic(rows);
      return allTopics().some((t) => {
        const g = topicGames(t);
        return g.length > 0 && g.every((k) => b[t.id]?.[k] != null);
      });
    },
  },
  {
    id: 'time',
    icon: '⏳',
    name: 'Он цагийн эзэн',
    rule: 'Он цагийн дарааллын тоглоомд 3 удаа төгс оноо авсан',
    test: (rows) => rows.filter((r) => r.kind === 'order' && r.total > 0 && r.score === r.total).length >= 3,
  },
  {
    id: 'comeback',
    icon: '💪',
    name: 'Бууж өгөхгүй',
    rule: '50%-иас доош авсан тестээ дахин өгөөд 80%+ авсан',
    test: (rows) => {
      const low = new Set();
      for (const r of rows) {
        if (!isGame(r)) continue;
        const k = `${r.topic_id}|${r.kind}`;
        if (low.has(k) && pctOf(r) >= 80) return true;
        if (pctOf(r) < 50) low.add(k);
      }
      return false;
    },
  },
  {
    id: 'chapter',
    icon: '✅',
    name: 'Бүлэг дуусгагч',
    rule: 'Нэг бүлгийн бүх хичээлийг уншсан',
    test: (rows) => {
      const read = new Set(rows.filter((r) => r.kind === 'lesson').map((r) => r.topic_id));
      const byCh = {};
      for (const t of allTopics()) (byCh[t.chapterId] ||= []).push(t.id);
      return Object.values(byCh).some((ids) => ids.every((id) => read.has(id)));
    },
  },
  {
    id: 'historian',
    icon: '📜',
    name: 'Жинхэнэ түүхч',
    rule: 'Бүх хичээлийг уншиж, сэдэв бүрийн тестэд 80%+ авсан',
    test: (rows) => {
      const b = bestByTopic(rows);
      return allTopics().every((t) => b[t.id]?.lesson && (b[t.id]?.mcq ?? 0) >= 80);
    },
  },
];

export function earnedBadges(rows) {
  return BADGES.filter((b) => b.test(rows));
}

// Шинээр авсан тэмдэг (тоглоом дуусахад баяр хүргэхэд)
export function newBadges(before, after) {
  const had = new Set(earnedBadges(before).map((b) => b.id));
  return earnedBadges(after).filter((b) => !had.has(b.id));
}
