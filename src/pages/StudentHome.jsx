import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { curriculum, findTopic, topicGames } from '../content/index.js';
import { KIND, bestByTopic, earnedBadges, levelOf, totalPoints, BADGES } from '../lib/score.js';
import { assignmentDone, assignmentFor } from '../lib/stats.js';
import { useMyAttempts } from '../lib/useAttempts.js';

export default function StudentHome() {
  const { user, questions: custom } = useAuth();
  const teacher = user.role === 'teacher';
  const { rows, err } = useMyAttempts();
  const [assignments, setAssignments] = useState([]);
  const course = curriculum[teacher ? 6 : user.grade] || curriculum[6];

  useEffect(() => {
    if (teacher) return;
    api.listAssignments({ grade: user.grade }).then((a) => setAssignments(a.filter((x) => assignmentFor(x, user))), () => {});
  }, [user, teacher]);

  if (rows == null) return <div className="center muted">Ачаалж байна…</div>;
  const best = bestByTopic(rows);
  const pts = totalPoints(rows);
  const lv = levelOf(pts);
  const badges = earnedBadges(rows);
  const todo = assignments.filter((a) => !assignmentDone(a, rows));

  return (
    <div className="stack">
      {err && <div className="error">{err}</div>}
      {teacher ? (
        <div>
          <h1>Хичээлүүд</h1>
          <p className="muted m0">Сурагчид юу харж байгааг эндээс үзэж, тоглоомуудыг туршина. Багшийн үр дүн хадгалагдахгүй.</p>
        </div>
      ) : (
        <section className="card hero">
          <div className="hero-main">
            <span className="hero-level" aria-hidden="true">{lv.icon}</span>
            <div>
              <p className="muted small m0">Сайн уу, {user.first_name}!</p>
              <h1 className="m0">{lv.name}</h1>
              <p className="m0"><b className="hero-points">{pts}</b> оноо</p>
            </div>
          </div>
          <div className="hero-side">
            {lv.next ? (
              <>
                <div className="level-bar" role="progressbar" aria-valuenow={lv.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Дараагийн зэрэг">
                  <div style={{ width: `${lv.progress}%` }} />
                </div>
                <span className="muted small">Дараагийн зэрэг: {lv.next.icon} {lv.next.name} — {lv.next.min - pts} оноо дутуу</span>
              </>
            ) : (
              <span className="small">Хамгийн дээд зэрэгт хүрсэн! 👑</span>
            )}
            <Link to="/me" className="hero-badges">
              {BADGES.map((b) => (
                <span key={b.id} className={badges.some((x) => x.id === b.id) ? '' : 'off'} title={b.name}>{b.icon}</span>
              ))}
              <span className="small">{badges.length}/{BADGES.length} тэмдэг →</span>
            </Link>
          </div>
        </section>
      )}

      {todo.length > 0 && (
        <section className="card assign">
          <h2>📌 Багшийн даалгавар</h2>
          <ul className="list">
            {todo.map((a) => {
              const t = findTopic(a.topic_id);
              const to = a.kind === 'lesson' ? `/topic/${a.topic_id}?a=${a.id}` : `/play/${a.kind}/${a.topic_id}?a=${a.id}`;
              return (
                <li key={a.id} className="list-row">
                  <div>
                    <b>{a.title}</b>
                    <div className="muted small">{KIND[a.kind]?.icon} {KIND[a.kind]?.name}{t && ` · ${t.title}`}{a.due_date && ` · ${a.due_date} хүртэл`} · +10 нэмэлт оноо</div>
                  </div>
                  <Link className="btn primary" to={to}>Хийх →</Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {course.chapters.map((c) => (
        <section key={c.id} className="chapter-block" style={{ '--chap': c.color }}>
          <h2 className="chapter-title">{c.title}</h2>
          <div className="topic-grid">
            {c.topics.map((t) => {
              const b = best[t.id] || {};
              const games = topicGames(t, custom);
              return (
                <Link key={t.id} to={`/topic/${t.id}`} className={`topic-card ${b.lesson ? 'read' : ''}`}>
                  <span className="topic-emoji" aria-hidden="true">{t.emoji}</span>
                  <b className="topic-name">{t.title}</b>
                  <span className="muted small">{t.summary}</span>
                  <span className="topic-status">
                    <span className={`chip ${b.lesson ? 'on' : ''}`} title="Хичээл">{b.lesson ? '📖 ✓' : `📖 ${t.cards.length} карт`}</span>
                    {games.map((k) => (
                      <span key={k} className={`chip ${b[k] != null ? 'on' : ''} ${b[k] === 100 ? 'gold' : ''}`} title={KIND[k].name}>
                        {KIND[k].icon} {b[k] != null ? `${b[k]}%` : ''}
                      </span>
                    ))}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      <p className="muted small">Дараагийн хичээлүүд удахгүй нэмэгдэнэ.</p>
    </div>
  );
}
