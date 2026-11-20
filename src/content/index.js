import { grade6 } from './grade6.js';

// Нэг анги (6) — дараа нь 7, 8-р ангийг нэмбэл энд нэмнэ.
export const GRADES = [6];
export const GRADUATED = 7; // 6-р ангиа дүүргэсэн сурагч
export const curriculum = { 6: grade6 };

export function allTopics(grade = 6) {
  return (curriculum[grade]?.chapters || []).flatMap((c) =>
    c.topics.map((t) => ({ ...t, chapterId: c.id, chapterTitle: c.title, color: c.color, grade }))
  );
}

export function findTopic(topicId) {
  for (const g of GRADES) {
    const t = allTopics(g).find((x) => x.id === topicId);
    if (t) return t;
  }
  return null;
}

// Сэдэвт байгаа тоглоомууд (асуулт/холбох/дараалал байхгүй бол тухайн тоглоом гарахгүй)
export function topicGames(t, custom = []) {
  const extra = custom.filter((c) => c.topic_id === t.id).length;
  return [
    (t.questions?.length || extra) && 'mcq',
    t.match?.pairs?.length >= 2 && 'match',
    t.order?.items?.length >= 2 && 'order',
  ].filter(Boolean);
}
