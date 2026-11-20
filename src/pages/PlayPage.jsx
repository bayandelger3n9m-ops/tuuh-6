import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { findTopic, topicGames } from '../content/index.js';
import { buildSet, compactDetails, grade, pct, seenMap, shuffle, topicPool } from '../lib/quiz.js';
import { KIND, gamePoints, newBadges, streakInfo, totalPoints } from '../lib/score.js';
import { saveAttempt, useMyAttempts } from '../lib/useAttempts.js';
import McqGame from '../components/games/McqGame.jsx';
import MatchGame from '../components/games/MatchGame.jsx';
import OrderGame from '../components/games/OrderGame.jsx';

const MCQ_COUNT = 8;
const MATCH_MAX = 6;

export default function PlayPage() {
  const { kind, topicId } = useParams();
  const [sp] = useSearchParams();
  const assignmentId = sp.get('a');
  const { user, questions: custom } = useAuth();
  const { rows, setRows } = useMyAttempts();
  const topic = findTopic(topicId);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const started = useRef(Date.now());

  // Тоглоомын агуулгыг нэг удаа бэлтгэнэ (дахин тоглоход шинэчилнэ)
  const data = useMemo(() => {
    if (!topic || rows == null) return null;
    if (kind === 'mcq') return buildSet(topicPool(topic.id, custom), MCQ_COUNT, seenMap(rows.filter((r) => r.topic_id === topic.id)));
    if (kind === 'match') return shuffle(topic.match.pairs).slice(0, MATCH_MAX);
    if (kind === 'order') return topic.order.items;
    return null;
  }, [topic, kind, rows == null, round]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!topic || !topicGames(topic, custom).includes(kind)) return <Navigate to="/" replace />;
  if (rows == null || !data) return <div className="center muted">Ачаалж байна…</div>;

  const meta = KIND[kind];
  const prevBest = Math.max(0, ...rows.filter((r) => r.topic_id === topic.id && r.kind === kind).map((r) => r.points || 0));

  async function finish(raw) {
    // raw: mcq → сонгосон индексүүд; match/order → [{correct, chosenText, answerText, q}]
    let details;
    if (kind === 'mcq') details = grade(data, raw).details;
    else details = raw.map((d, i) => ({ qid: `${topic.id}#${kind}${i}`, topicId: topic.id, ...d }));
    const results = details.map((d) => d.correct);
    const score = results.filter(Boolean).length;
    const total = results.length;
    const st = kind === 'mcq' ? streakInfo(results) : { bonus: 0, best: 0 };
    const points = gamePoints({ score, total, streakBonus: st.bonus, assignment: !!assignmentId });
    const row = {
      kind,
      grade: topic.grade,
      topic_id: topic.id,
      title: `${topic.title} — ${meta.name}`,
      score,
      total,
      points,
      streak: st.best,
      duration_sec: Math.round((Date.now() - started.current) / 1000),
      answers: compactDetails(details),
      assignment_id: assignmentId || null,
    };
    setSaving(true);
    setErr('');
    try {
      const saved = await saveAttempt(user, row);
      const after = [...rows, saved];
      if (!saved.preview) setRows(after);
      setResult({
        ...row,
        details,
        streakBonus: st.bonus,
        gained: Math.max(0, points - prevBest),
        newRecord: points > prevBest,
        total_points: totalPoints(after),
        badges: user.role === 'teacher' ? [] : newBadges(rows, after),
        pending: saved.pending,
        preview: saved.preview,
      });
    } catch (e) {
      setErr('Хадгалж чадсангүй: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function again() {
    setResult(null);
    setRound((r) => r + 1);
    started.current = Date.now();
  }

  return (
    <div className="stack narrow">
      <Link to={`/topic/${topic.id}`} className="back">← {topic.title}</Link>
      <h1>{meta.icon} {meta.name}</h1>
      {kind === 'match' && !result && <p className="muted m0">{topic.match.prompt}</p>}
      {kind === 'order' && !result && <p className="muted m0">{topic.order.prompt}</p>}
      {user.role === 'teacher' && <p className="auth-note">Багшийн урьдчилан харах горим: үр дүн хадгалагдахгүй.</p>}

      {!result && (
        <section className="card">
          {kind === 'mcq' && <McqGame key={round} questions={data} onFinish={finish} />}
          {kind === 'match' && <MatchGame key={round} pairs={data} onFinish={finish} />}
          {kind === 'order' && <OrderGame key={round} items={data} onFinish={finish} />}
          {saving && <p className="muted">Хадгалж байна…</p>}
          {err && <p className="error">{err}</p>}
        </section>
      )}

      {result && <Result r={result} topic={topic} kind={kind} custom={custom} onAgain={again} />}
    </div>
  );
}

function Result({ r, topic, kind, custom, onAgain }) {
  const p = pct(r.score, r.total);
  const mood = p === 100 ? '🏆 Төгс!' : p >= 80 ? '🌟 Маш сайн!' : p >= 50 ? '👍 Сайн байна!' : '💪 Дахин оролдоод үз!';
  const wrong = r.details.filter((d) => !d.correct);
  const others = topicGames(topic, custom).filter((k) => k !== kind);
  return (
    <>
      <section className="card result">
        <div className="result-mood">{mood}</div>
        <div className="score-big">{r.score}<small>/{r.total}</small></div>
        <div className="score-pct">{p}% зөв</div>
        <div className="points-earned">
          <span className="points-chip">+{r.points} оноо</span>
          {r.streakBonus > 0 && <span className="muted small">🔥 цуврал +{r.streakBonus}</span>}
          {r.assignment_id && <span className="muted small">📌 даалгавар +10</span>}
        </div>
        {!r.preview && (
          <p className="small m0">
            {r.newRecord ? (
              <>Шинэ дээд амжилт! Нийт оноонд <b className="good-t">+{r.gained}</b> нэмэгдэж, <b>{r.total_points}</b> боллоо.</>
            ) : (
              <span className="muted">Энэ тоглоомын өмнөх дээд амжилтаа давж чадсангүй. Нийт оноо: {r.total_points}.</span>
            )}
          </p>
        )}
        {r.pending && <p className="muted small">Сүлжээ тасарсан тул түр хадгаллаа. Холболт сэргэхэд автоматаар илгээнэ.</p>}
        <div className="row-btns">
          <button className="primary" onClick={onAgain}>↻ Дахин тоглох</button>
          {others.map((k) => (
            <Link key={k} className="btn" to={`/play/${k}/${topic.id}`} onClick={onAgain}>{KIND[k].icon} {KIND[k].name}</Link>
          ))}
          <Link className="btn" to="/">Бүх хичээл</Link>
        </div>
      </section>

      {r.badges.length > 0 && (
        <section className="card celebrate">
          <h2>🎉 Шинэ тэмдэг авлаа!</h2>
          <div className="badges">
            {r.badges.map((b) => (
              <div key={b.id} className="badge got pop">
                <span className="badge-icon">{b.icon}</span>
                <span className="badge-name">{b.name}</span>
                <span className="muted small">{b.rule}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {wrong.length > 0 && (
        <section className="card">
          <h2>Алдаагаа засцгаая ({wrong.length})</h2>
          {wrong.map((d, i) => (
            <div key={i} className="review bad">
              <p className="m0"><b>{d.q}</b></p>
              <p className="small m0">
                Таны хариулт: <span className="wrong-t">{d.chosenText ?? (d.chosen == null ? '—' : d.options[d.chosen])}</span>
              </p>
              <p className="small m0">
                Зөв хариулт: <span className="right-t">{d.answerText ?? d.options[d.answer]}</span>
              </p>
              {d.e && <p className="explain">{d.e}</p>}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
