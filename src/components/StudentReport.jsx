// Сурагчийн тайлан: бүх зүйл тоологдоно (цагираг), сул сэдэв, долоо хоногийн ахиц.
// Сурагч өөрөө ("Миний ахиц"), багш (сурагчийн дэлгэрэнгүй, ангийн харьцуулалт) хоёулаа ашиглана.
import { Link } from 'react-router-dom';
import { findTopic } from '../content/index.js';
import { pct } from '../lib/quiz.js';
import { countStats, topicReport, weeklyStats } from '../lib/stats.js';
import { Empty } from './ui.jsx';

const WEAK = 70;

export function Ring({ value, label, sub }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const r = 42;
  const c = 2 * Math.PI * r;
  const tone = value == null ? '' : v >= 80 ? 'good' : v >= 50 ? 'mid' : 'low';
  return (
    <div className="ring">
      <svg viewBox="0 0 100 100" role="img" aria-label={`${label}: ${value == null ? '—' : v + '%'}`}>
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle cx="50" cy="50" r={r} className={`ring-fill ${tone}`} strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
        <text x="50" y="50" className="ring-text" dominantBaseline="central" textAnchor="middle">
          {value == null ? '—' : `${v}%`}
        </text>
      </svg>
      <b>{label}</b>
      <span className="muted small">{sub}</span>
    </div>
  );
}

// 1. Бүх зүйл тоологдож, бүртгэгдэнэ
export function CountRings({ rows, assignments }) {
  const s = countStats(rows, assignments);
  const p = (x) => (x.total ? pct(x.done, x.total) : null);
  return (
    <div className="rings">
      <Ring value={p(s.assign)} label="Даалгавар" sub={s.assign.total ? `${s.assign.total}-аас ${s.assign.done} хийсэн` : 'даалгавар өгөөгүй'} />
      <Ring value={p(s.correct)} label="Зөв хариулт" sub={`${s.correct.total}-аас ${s.correct.done} зөв`} />
      <Ring value={p(s.active)} label="Идэвх" sub={`сүүлийн ${s.active.total} долоо хоногоос ${s.active.done}-д нь хичээллэсэн`} />
    </div>
  );
}

// 2. Аль сэдэв дээр ажиллахаа тодорхой харна
export function WeakTopics({ rows, practice = false, limit = 12 }) {
  const all = topicReport(rows).filter((t) => findTopic(t.id));
  if (!all.length) return <Empty>Тест, тоглоом тоглосны дараа сэдэв бүрийн зөв хувь энд гарна.</Empty>;
  const weak = all.filter((t) => t.pct < WEAK);
  const strong = all.filter((t) => t.pct >= WEAK);
  const card = (t) => {
    const topic = findTopic(t.id);
    const inner = (
      <>
        <span className="skill-pct">{t.pct}%</span>
        <span className="skill-title">{topic.title}</span>
        <span className="muted small">{t.n} хариулт</span>
        {t.open > 0 && <span className="skill-open">{t.open} алдаа засаагүй</span>}
        {practice && t.pct < WEAK && <span className="skill-go">Давтах →</span>}
      </>
    );
    const cls = `skill ${t.pct < WEAK ? 'weak' : 'ok'}`;
    return practice ? (
      <Link key={t.id} to={`/topic/${t.id}`} className={cls}>{inner}</Link>
    ) : (
      <div key={t.id} className={cls}>{inner}</div>
    );
  };
  return (
    <div className="stack">
      {weak.length ? (
        <>
          <p className="small">
            <b className="low-t">{weak.length} сэдэв</b> {WEAK}%-иас доош байна — эдгээр дээр түлхүү ажиллах хэрэгтэй.
          </p>
          <div className="skills">{weak.slice(0, limit).map(card)}</div>
        </>
      ) : (
        <p className="small good-t">Бүх сэдэв {WEAK}%-иас дээш байна 👏</p>
      )}
      {strong.length > 0 && (
        <details>
          <summary className="small">Сайн эзэмшсэн сэдэв ({strong.length})</summary>
          <div className="skills">{strong.map(card)}</div>
        </details>
      )}
    </div>
  );
}

// 3. Долоо хоног бүр ахицаа харна
export function WeeklyProgress({ rows, weeks = 8 }) {
  const ws = weeklyStats(rows, weeks);
  const withData = ws.filter((w) => w.avg != null);
  if (!ws.some((w) => w.all)) return <Empty>Сүүлийн {weeks} долоо хоногт оролдлого алга.</Empty>;
  const last = withData.at(-1);
  const prev = withData.at(-2);
  const diff = last && prev ? last.avg - prev.avg : null;
  return (
    <div className="stack">
      <div className="week-chart" role="img" aria-label="Долоо хоногийн дундаж оноо">
        {ws.map((w, i) => (
          <div key={i} className="week-col" title={`${w.range}: ${w.avg == null ? 'тест өгөөгүй' : w.avg + '%'} · ${w.all} оролдлого`}>
            <span className="week-val">{w.avg == null ? '' : `${w.avg}%`}</span>
            <div className="week-track">
              <div className={`week-bar ${w.avg == null ? '' : w.avg >= 80 ? 'good' : w.avg >= 50 ? 'mid' : 'low'}`} style={{ height: `${w.avg ?? 0}%` }} />
            </div>
            <span className="week-label">{w.label}</span>
            <span className="week-n muted">{w.all || ''}</span>
          </div>
        ))}
      </div>
      <p className="small muted">
        Багана — тухайн долоо хоногийн тестийн дундаж зөв хувь, доор нь — нийт оролдлого (хичээл, тест).
        {diff != null && (
          <>
            {' '}Сүүлийн долоо хоногт өмнөхөөсөө{' '}
            <b className={diff >= 0 ? 'good-t' : 'low-t'}>
              {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}%
            </b>{' '}
            {diff >= 0 ? 'ахисан' : 'буурсан'}.
          </>
        )}
      </p>
    </div>
  );
}
