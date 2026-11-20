import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { BADGES, KIND, LEVELS, POINT_RULES, earnedBadges, levelOf, totalPoints } from '../lib/score.js';
import { assignmentFor, fmtDate } from '../lib/stats.js';
import { pct } from '../lib/quiz.js';
import { useMyAttempts } from '../lib/useAttempts.js';
import { CountRings, WeakTopics, WeeklyProgress } from '../components/StudentReport.jsx';
import { Empty } from '../components/ui.jsx';

export default function ProgressPage() {
  const { user } = useAuth();
  const { rows, err } = useMyAttempts();
  const [assignments, setAssignments] = useState([]);
  useEffect(() => {
    api.listAssignments({ grade: user.grade }).then((a) => setAssignments(a.filter((x) => assignmentFor(x, user))), () => {});
  }, [user]);

  if (rows == null) return <div className="center muted">Ачаалж байна…</div>;
  const pts = totalPoints(rows);
  const lv = levelOf(pts);
  const got = new Set(earnedBadges(rows).map((b) => b.id));

  return (
    <div className="stack">
      <h1>Миний амжилт</h1>
      {err && <div className="error">{err}</div>}

      <div className="grid2">
        <section className="card">
          <h2>Зэрэг</h2>
          <ol className="levels">
            {LEVELS.map((l, i) => (
              <li key={l.name} className={i < lv.index ? 'past' : i === lv.index ? 'cur' : ''}>
                <span className="level-icon">{l.icon}</span>
                <span><b>{l.name}</b><br /><span className="muted small">{l.min}+ оноо</span></span>
                {i === lv.index && <span className="pill good">Та энд · {pts}</span>}
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <h2>Оноо хэрхэн авах вэ?</h2>
          <ul className="rules">
            {POINT_RULES.map(([k, v]) => (
              <li key={k}>{k}: <b>{v}</b></li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <h2>Тэмдэг ({got.size}/{BADGES.length})</h2>
        <div className="badges">
          {BADGES.map((b) => (
            <div key={b.id} className={`badge ${got.has(b.id) ? 'got' : 'locked'}`}>
              <span className="badge-icon">{got.has(b.id) ? b.icon : '🔒'}</span>
              <span className="badge-name">{b.name}</span>
              <span className="muted small">{b.rule}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Миний үзүүлэлт</h2>
        <CountRings rows={rows} assignments={assignments} />
      </section>
      <section className="card">
        <h2>Аль сэдвээ давтах вэ?</h2>
        <WeakTopics rows={rows} practice />
      </section>
      <section className="card">
        <h2>Долоо хоног бүрийн ахиц</h2>
        <WeeklyProgress rows={rows} />
      </section>

      <section className="card">
        <h2>Сүүлийн үйлдлүүд</h2>
        {rows.length === 0 ? <Empty>Одоогоор хичээл уншиж, тоглоом тоглоогүй байна.</Empty> : (
          <ul className="list">
            {[...rows].reverse().slice(0, 15).map((r) => (
              <li key={r.id} className="list-row">
                <div>
                  <b>{KIND[r.kind]?.icon} {r.title}</b>
                  <div className="muted small">{fmtDate(r.created_at)}{r.kind !== 'lesson' && ` · ${r.score}/${r.total} (${pct(r.score, r.total)}%)`}</div>
                </div>
                <span className="points-chip small">+{r.points || 0}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
