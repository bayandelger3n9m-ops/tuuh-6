import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { allTopics, findTopic, topicGames } from '../content/index.js';
import { KIND, PTS, bestByTopic, newBadges } from '../lib/score.js';
import { saveAttempt, useMyAttempts } from '../lib/useAttempts.js';

export default function LessonPage() {
  const { topicId } = useParams();
  const [sp] = useSearchParams();
  const assignmentId = sp.get('a');
  const { user, questions: custom } = useAuth();
  const { rows, setRows } = useMyAttempts();
  const topic = findTopic(topicId);
  const [i, setI] = useState(0);
  const [finished, setFinished] = useState(null); // { gained, badges }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const touch = useRef(null);

  const cards = topic?.cards || [];
  const last = i === cards.length - 1;

  useEffect(() => {
    setI(0);
    setFinished(null);
  }, [topicId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, cards.length - 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cards.length]);

  if (!topic) return <Navigate to="/" replace />;
  if (rows == null) return <div className="center muted">Ачаалж байна…</div>;

  const best = bestByTopic(rows)[topic.id] || {};
  const games = topicGames(topic, custom);
  const card = cards[i];
  const topics = allTopics(topic.grade);
  const idx = topics.findIndex((t) => t.id === topic.id);
  const nextTopic = topics[idx + 1];

  async function complete() {
    if (best.lesson && !assignmentId) return setFinished({ gained: 0, badges: [] });
    setBusy(true);
    setErr('');
    try {
      const points = PTS.lesson + (assignmentId ? PTS.assignment : 0);
      const saved = await saveAttempt(user, {
        kind: 'lesson',
        grade: topic.grade,
        topic_id: topic.id,
        title: topic.title,
        score: 0,
        total: 0,
        points,
        streak: 0,
        duration_sec: null,
        answers: [],
        assignment_id: assignmentId || null,
      });
      const after = [...rows, saved];
      if (!saved.preview) setRows(after);
      const prev = Math.max(0, ...rows.filter((r) => r.topic_id === topic.id && r.kind === 'lesson').map((r) => r.points || 0));
      setFinished({ gained: Math.max(0, points - prev), badges: saved.preview ? [] : newBadges(rows, after) });
    } catch (e) {
      setErr('Хадгалж чадсангүй: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  const onTouchStart = (e) => (touch.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (dx < -50) setI((x) => Math.min(x + 1, cards.length - 1));
    if (dx > 50) setI((x) => Math.max(x - 1, 0));
    touch.current = null;
  };

  return (
    <div className="stack narrow">
      <Link to="/" className="back">← Бүх хичээл</Link>
      <div>
        <p className="muted small m0">{topic.chapterTitle}</p>
        <h1>{topic.emoji} {topic.title} {best.lesson && <span className="pill good">✓ уншсан</span>}</h1>
      </div>

      {!finished && card && (
        <section className="lesson-card card" style={{ '--chap': topic.color }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-live="polite">
          <div className="lesson-emoji" aria-hidden="true">{card.emoji}</div>
          <h2>{card.title}</h2>
          <p className="lead">{card.text}</p>
          <div className="dots" role="tablist" aria-label="Картууд">
            {cards.map((_, k) => (
              <button key={k} className={`dot ${k === i ? 'on' : k < i ? 'seen' : ''}`} onClick={() => setI(k)} aria-label={`${k + 1}-р карт`} aria-selected={k === i} role="tab" />
            ))}
          </div>
          <div className="lesson-nav">
            <button onClick={() => setI(i - 1)} disabled={i === 0}>← Өмнөх</button>
            <span className="muted small">{i + 1} / {cards.length}</span>
            {last ? (
              <button className="primary" onClick={complete} disabled={busy}>
                {busy ? '…' : best.lesson ? 'Дуусгах ✓' : `Дуусгах · +${PTS.lesson} оноо`}
              </button>
            ) : (
              <button className="primary" onClick={() => setI(i + 1)}>Дараах →</button>
            )}
          </div>
          {err && <p className="error">{err}</p>}
        </section>
      )}

      {finished && (
        <section className="card result">
          <div className="result-mood">🎉 Хичээл дууслаа!</div>
          {finished.gained > 0 && <div className="points-earned"><span className="points-chip">+{finished.gained} оноо</span></div>}
          {finished.badges.map((b) => (
            <div key={b.id} className="badge got pop inline-badge">
              <span className="badge-icon">{b.icon}</span>
              <span><b>Шинэ тэмдэг: {b.name}</b><br /><span className="muted small">{b.rule}</span></span>
            </div>
          ))}
          <p className="m0">Одоо мэдлэгээ тоглоомоор шалгаарай 👇</p>
          <div className="row-btns">
            <button className="ghost" onClick={() => { setFinished(null); setI(0); }}>↺ Картуудыг дахин үзэх</button>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Тоглоомууд</h2>
        <div className="game-list">
          {games.map((k) => (
            <Link key={k} to={`/play/${k}/${topic.id}`} className="game-tile">
              <span className="game-icon">{KIND[k].icon}</span>
              <b>{KIND[k].name}</b>
              <span className="muted small">{best[k] != null ? `Дээд амжилт: ${best[k]}%` : 'Тоглоогүй'}</span>
            </Link>
          ))}
        </div>
        {!best.lesson && !finished && <p className="muted small">Зөвлөгөө: эхлээд дээрх картуудыг уншаад тоглоорой.</p>}
      </section>

      {nextTopic && (best.lesson || finished) && (
        <Link to={`/topic/${nextTopic.id}`} className="btn next-topic">Дараагийн хичээл: {nextTopic.emoji} {nextTopic.title} →</Link>
      )}
    </div>
  );
}
