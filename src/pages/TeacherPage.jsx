import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { GRADES, GRADUATED, allTopics, findTopic, topicGames } from '../content/index.js';
import { pct } from '../lib/quiz.js';
import { topicMastery, KIND_LABEL, fmtDate, fmtDur } from '../lib/stats.js';
import { downloadCsv } from '../lib/csv.js';
import { totalPoints, earnedBadges, levelOf, BADGES, KIND, bestByTopic } from '../lib/score.js';
import { Bars, Meter, Empty, TrendChart } from '../components/ui.jsx';
import { CountRings, WeakTopics, WeeklyProgress } from '../components/StudentReport.jsx';
import { assignmentFor } from '../lib/stats.js';
import { SECTIONS, classLabel, sortSections } from '../lib/sections.js';

const avgPct = (rows) => (rows.length ? Math.round(rows.reduce((s, r) => s + pct(r.score, r.total), 0) / rows.length) : null);
const isTest = (r) => r.kind !== 'lesson';
const gradeName = (g) => (g === GRADUATED ? 'Дүүргэсэн' : `${g}-р анги`);

export default function TeacherPage() {
  const { user } = useAuth();
  const [grade, setGrade] = useState(GRADES.includes(user.grade) ? user.grade : GRADES[0]);
  const [students, setStudents] = useState([]);
  const [light, setLight] = useState([]); // бүх ангийн оролдлогын хураангуй (хариултгүй)
  const [detailed, setDetailed] = useState([]); // сонгосон ангийн оролдлого (хариултын дэлгэрэнгүйтэй)
  const [section, setSection] = useState('');
  const [view, setView] = useState('students');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function reload() {
    setLoading(true);
    setErr('');
    try {
      const [s, a, d] = await Promise.all([api.listProfiles({}), api.listAttempts({ light: true }), api.listAttempts({ grade })]);
      setStudents(s);
      setLight(a);
      setDetailed(d);
    } catch (e) {
      setErr('Мэдээлэл ачаалж чадсангүй: ' + e.message);
    }
    setLoading(false);
  }
  useEffect(() => {
    reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Анги солиход тухайн ангийн дэлгэрэнгүйг л татна
  useEffect(() => {
    if (loading) return;
    api.listAttempts({ grade }).then(setDetailed).catch(() => {});
  }, [grade]); // eslint-disable-line react-hooks/exhaustive-deps

  const attempts = useMemo(() => {
    const m = new Map(light.map((a) => [a.id, a]));
    for (const d of detailed) m.set(d.id, d);
    return [...m.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [light, detailed]);

  const byUser = useMemo(() => {
    const m = {};
    for (const a of attempts) (m[a.user_id] ||= []).push(a);
    return m;
  }, [attempts]);

  const gradeStudents = students.filter((s) => s.grade === grade);
  const sections = sortSections(new Set(gradeStudents.map((s) => s.section).filter(Boolean)));
  const shown = gradeStudents.filter((s) => !section || s.section === section);

  const gradeCompare = GRADES.map((g) => {
    const ids = new Set(students.filter((s) => s.grade === g).map((s) => s.id));
    const rows = attempts.filter((a) => ids.has(a.user_id) && isTest(a));
    return { label: `${g}-р анги`, v: avgPct(rows), n: `${ids.size} сурагч` };
  });
  const sectionCompare = sections.map((sec) => {
    const ids = new Set(gradeStudents.filter((s) => s.section === sec).map((s) => s.id));
    const rows = attempts.filter((a) => ids.has(a.user_id) && isTest(a));
    return { label: classLabel(grade, sec), v: avgPct(rows), n: `${ids.size} сурагч` };
  });

  function exportCsv() {
    const ids = new Map(shown.map((s) => [s.id, s]));
    const rows = [['Овог', 'Нэр', 'Анги', 'Бүлэг', 'Огноо', 'Төрөл', 'Сэдэв', 'Зөв', 'Нийт', 'Хувь', 'Оноо', 'Хугацаа (сек)']];
    for (const a of attempts) {
      const s = ids.get(a.user_id);
      if (!s) continue;
      rows.push([s.last_name, s.first_name, s.grade, s.section, fmtDate(a.created_at), KIND_LABEL[a.kind], a.title, a.score, a.total, pct(a.score, a.total), a.points ?? '', a.duration_sec ?? '']);
    }
    downloadCsv(`tuuh6-${grade}${section || ''}-onoo.csv`, rows);
  }

  async function promote() {
    if (!confirm('Шинэ хичээлийн жил: 6-р ангийн БҮХ сурагчийг "дүүргэсэн" болгох уу? Тэд жагсаалтаас гарна, оноо нь хадгалагдана.')) return;
    await api.promoteAll();
    reload();
  }

  return (
    <div className="stack">
      <div className="teacher-head">
        <h1>Багшийн самбар</h1>
        <div className="row-btns">
          <button onClick={exportCsv}>⬇ Тайлан (CSV)</button>
          <button onClick={promote}>Шинэ хичээлийн жил</button>
        </div>
      </div>

      {GRADES.length > 1 && <div className="tabs big">
        {GRADES.map((g) => (
          <button key={g} className={g === grade ? 'on' : ''} onClick={() => { setGrade(g); setSection(''); setSelected(null); }}>
            {g}-р анги <small>· {students.filter((s) => s.grade === g).length}</small>
          </button>
        ))}
      </div>}

      <div className="toolbar">
        <div className="seg small">
          {[['students', 'Сурагчид'], ['points', '🏆 Оноо, тэмдэг'], ['assign', 'Даалгавар'], ['questions', 'Асуулт нэмэх'], ['compare', 'Харьцуулалт']].map(([k, l]) => (
            <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
        <label className="inline">
          Бүлэг:
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">Бүгд</option>
            {sections.map((s) => <option key={s} value={s}>{classLabel(grade, s)}</option>)}
          </select>
        </label>
      </div>

      {loading && <p className="muted">Ачаалж байна…</p>}
      {err && <div className="error">{err} <button onClick={reload}>Дахин оролдох</button></div>}

      {!loading && view === 'students' && (
        <>
          <div className="stats">
            <div className="stat"><b>{shown.length}</b><span>сурагч</span></div>
            <div className="stat"><b>{shown.reduce((s, x) => s + (x.login_count || 0), 0)}</b><span>нийт хандалт</span></div>
            <div className="stat"><b>{shown.reduce((s, x) => s + (byUser[x.id] || []).filter(isTest).length, 0)}</b><span>тест өгсөн</span></div>
            <div className="stat"><b>{avgPct(shown.flatMap((x) => (byUser[x.id] || []).filter(isTest))) ?? '—'}%</b><span>дундаж зөв хувь</span></div>
          </div>
          {shown.length === 0 ? <Empty>Энэ ангид бүртгэлтэй сурагч алга.</Empty> : (
            <section className="card">
              <div className="table-wrap">
                <table className="click">
                  <thead>
                    <tr><th>Сурагч</th><th>Бүлэг</th><th>Хандалт</th><th>Хичээл</th><th>Тест</th><th>Дундаж</th><th>Оноо</th><th>Тэмдэг</th><th>Сүүлд идэвхтэй</th></tr>
                  </thead>
                  <tbody>
                    {shown.map((s) => {
                      const rows = byUser[s.id] || [];
                      const tests = rows.filter(isTest);
                      const read = new Set(rows.filter((r) => r.kind === 'lesson').map((r) => r.topic_id)).size;
                      const badges = earnedBadges(rows);
                      return (
                        <tr key={s.id} onClick={() => setSelected(s)} className={selected?.id === s.id ? 'sel' : ''}>
                          <td><b>{s.last_name}</b> {s.first_name}</td>
                          <td>{classLabel(s.grade, s.section)}</td>
                          <td>{s.login_count || 0}</td>
                          <td>{read}/{allTopics(grade).length}</td>
                          <td>{tests.length}</td>
                          <td>{avgPct(tests) ?? '—'}{tests.length > 0 && '%'}</td>
                          <td><b>{totalPoints(rows)}</b></td>
                          <td title={badges.map((b) => b.name).join(', ')}>{badges.map((b) => b.icon).join('') || '—'}</td>
                          <td className="muted small">{s.last_seen ? fmtDate(s.last_seen) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {selected && <StudentDetail s={selected} rows={byUser[selected.id] || []} onClose={() => setSelected(null)} onChanged={reload} />}
        </>
      )}

      {!loading && view === 'points' && <PointsBoard students={shown} byUser={byUser} grade={grade} />}

      {!loading && view === 'compare' && (
        <div className="grid2">
          {GRADES.length > 1 && (
            <section className="card">
              <h2>Ангиудын дундаж оноо</h2>
              <Bars rows={gradeCompare} />
            </section>
          )}
          <section className="card">
            <h2>{grade}-р ангийн бүлгүүд</h2>
            <Bars rows={sectionCompare} />
          </section>
          <section className="card wide">
            <h2>{grade}-р анги · долоо хоног бүрийн ахиц{section && ` (${classLabel(grade, section)})`}</h2>
            <WeeklyProgress rows={shown.flatMap((s) => byUser[s.id] || [])} />
          </section>
          <section className="card wide">
            <h2>{grade}-р анги · сул сэдвүүд{section && ` (${classLabel(grade, section)})`}</h2>
            <WeakTopics rows={shown.flatMap((s) => byUser[s.id] || [])} />
          </section>
          <section className="card wide">
            <h2>{grade}-р анги · сэдвийн эзэмшилт{section && ` (${grade}${section})`}</h2>
            <TopicMasteryTable grade={grade} rows={shown.flatMap((s) => byUser[s.id] || [])} />
          </section>
        </div>
      )}

      {!loading && view === 'assign' && <Assignments grade={grade} sections={sections} attempts={attempts} students={gradeStudents} />}
      {!loading && view === 'questions' && <Questions grade={grade} />}
    </div>
  );
}

function TopicMasteryTable({ grade, rows }) {
  const m = topicMastery(rows);
  const topics = allTopics(grade);
  if (!topics.length) return <Empty>Энэ ангийн агуулга хараахан ороогүй.</Empty>;
  return (
    <ul className="topics compact">
      {topics.map((t) => (
        <li key={t.id} className="topic-link static">
          <span className="topic-title">{t.title}<small className="muted"> · {m[t.id]?.n || 0} хариулт</small></span>
          <Meter value={m[t.id]?.pct ?? null} />
        </li>
      ))}
    </ul>
  );
}

function StudentDetail({ s, rows, onClose, onChanged }) {
  const [g, setG] = useState(s.grade);
  const [sec, setSec] = useState(s.section || '');
  const [open, setOpen] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const tests = rows.filter(isTest);
  useEffect(() => {
    if (!GRADES.includes(s.grade)) return setAssignments([]);
    api.listAssignments({ grade: s.grade }).then((a) => setAssignments(a.filter((x) => assignmentFor(x, s))), () => {});
  }, [s]);

  const [pw, setPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const genPw = () => setPw(String(Math.floor(100000 + Math.random() * 900000)));

  async function resetPw() {
    const p = pw.trim();
    if (!confirm(`${s.last_name} ${s.first_name}-ийн нууц үгийг "${p}" болгох уу?`)) return;
    setPwBusy(true);
    setPwErr('');
    setPwMsg('');
    try {
      await api.resetStudentPassword(s.id, p);
      setPwMsg(`✓ Шинэ нууц үг: ${p} — сурагчдаа хэлээрэй. Утасны дугаар: ${s.username}. Нэвтэрсний дараа Тохиргоо → «Нууц үг солих»-оос өөрийнхөөрөө сольж болно.`);
      setPw('');
    } catch (e) {
      setPwErr(e.message);
    } finally {
      setPwBusy(false);
    }
  }

  async function save() {
    await api.updateStudent(s.id, { grade: Number(g), section: sec.trim().toLowerCase() });
    onChanged();
    onClose();
  }

  return (
    <section className="card detail">
      <div className="chapter-head">
        <h2>{s.last_name} {s.first_name} <small className="muted">· {s.username}</small></h2>
        <button className="ghost" onClick={onClose}>✕</button>
      </div>
      <div className="row2">
        <label>Анги
          <select value={g} onChange={(e) => setG(e.target.value)}>
            {[...GRADES, GRADUATED].map((x) => <option key={x} value={x}>{gradeName(x)}</option>)}
          </select>
        </label>
        <label>Бүлэг<select value={sec} onChange={(e) => setSec(e.target.value)}>{[...new Set([...SECTIONS, sec].filter(Boolean))].map((x) => <option key={x} value={x}>{classLabel(g, x)}</option>)}</select></label>
      </div>
      <button onClick={save}>Анги, бүлгийг хадгалах</button>

      <h3>Нууц үг шинэчлэх</h3>
      <p className="muted small">Сурагч нууц үгээ мартсан бол шинэ нууц үг өгнө. Нэвтрэх нэр нь утасны дугаар: <b>{s.username}</b></p>
      <div className="row-btns">
        <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Шинэ нууц үг (6+ тэмдэгт)" style={{ maxWidth: 220 }} />
        <button type="button" onClick={genPw}>🎲 Санамсаргүй</button>
        <button type="button" className="primary" disabled={pwBusy || pw.trim().length < 6} onClick={resetPw}>
          {pwBusy ? 'Шинэчилж байна…' : 'Нууц үг шинэчлэх'}
        </button>
      </div>
      {pwMsg && <p className="good-t small">{pwMsg}</p>}
      {pwErr && <p className="error">{pwErr}</p>}

      <h3>Оноо ба тэмдэг</h3>
      <PointsSummary rows={rows} />

      <h3>Бүх зүйл тоологдож, бүртгэгдэнэ</h3>
      <CountRings rows={rows} assignments={assignments} />

      <h3>Сул сэдэв — аль сэдэв дээр ажиллах вэ?</h3>
      <WeakTopics rows={rows} />

      <h3>Долоо хоног бүрийн ахиц</h3>
      <WeeklyProgress rows={rows} />

      <h3>Онооны ахиц (тест бүрээр)</h3>
      <TrendChart points={tests.map((r) => ({ v: pct(r.score, r.total), label: `${fmtDate(r.created_at)} · ${r.title}` }))} />

      <h3>Бүх оролдлого ({rows.length})</h3>
      {rows.length === 0 ? <Empty>Оролдлого алга.</Empty> : (
        <div className="table-wrap">
          <table className="click">
            <thead><tr><th>Огноо</th><th>Төрөл</th><th>Сэдэв</th><th>Зөв</th><th>Оноо</th><th>Хугацаа</th></tr></thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <Fragment key={r.id}>
                  <tr onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <td>{fmtDate(r.created_at)}</td>
                    <td>{KIND_LABEL[r.kind]}</td>
                    <td>{r.title}</td>
                    <td>{r.kind === 'lesson' ? '✓ уншсан' : <><b>{r.score}/{r.total}</b> ({pct(r.score, r.total)}%)</>}</td>
                    <td>+{r.points || 0}</td>
                    <td>{fmtDur(r.duration_sec)}</td>
                  </tr>
                  {open === r.id && (
                    <tr className="sub">
                      <td colSpan={6}>
                        {(r.answers || []).filter((d) => !d.correct).map((d, i) => (
                          <p key={i} className="small">✗ {d.q} — <span className="wrong-t">{chosenText(d)}</span> / <span className="right-t">{answerText(d)}</span></p>
                        ))}
                        {r.kind !== 'lesson' && (r.answers || []).every((d) => d.correct) && <p className="small">Бүгд зөв ✓</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Assignments({ grade, sections, attempts, students }) {
  const topics = allTopics(grade);
  const [list, setList] = useState([]);
  const [f, setF] = useState({ section: '', topic_id: topics[0]?.id || '', kind: 'mcq', title: '', due_date: '' });
  const load = () => api.listAssignments({ grade }).then(setList);
  useEffect(() => {
    load();
    setF((x) => ({ ...x, topic_id: topics[0]?.id || '' }));
  }, [grade]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e) {
    e.preventDefault();
    const t = findTopic(f.topic_id);
    await api.addAssignment({ grade, section: f.section || null, topic_id: f.topic_id, kind: f.kind, title: f.title.trim() || `${t.title} — ${KIND[f.kind].name.toLowerCase()}`, due_date: f.due_date || null });
    setF({ ...f, title: '' });
    load();
  }

  if (!topics.length) return <Empty>Энэ ангийн агуулга хараахан ороогүй тул даалгавар өгөх боломжгүй.</Empty>;

  return (
    <div className="grid2">
      <section className="card">
        <h2>Шинэ даалгавар</h2>
        <form className="form" onSubmit={add}>
          <label>Сэдэв
            <select value={f.topic_id} onChange={(e) => setF({ ...f, topic_id: e.target.value })}>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          <div className="row2">
            <label>Төрөл
              <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                {['lesson', ...topicGames(findTopic(f.topic_id) || {})].map((k) => <option key={k} value={k}>{KIND[k].icon} {KIND[k].name}</option>)}
              </select>
            </label>
            <label>Бүлэг
              <select value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })}>
                <option value="">Бүх бүлэг</option>
                {sections.map((s) => <option key={s} value={s}>{classLabel(grade, s)}</option>)}
              </select>
            </label>
          </div>
          <label>Гарчиг (заавал биш)<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label>Дуусах огноо<input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></label>
          <button className="primary">Даалгавар өгөх</button>
        </form>
      </section>
      <section className="card">
        <h2>Өгсөн даалгавар</h2>
        {list.length === 0 ? <Empty>Даалгавар алга.</Empty> : (
          <ul className="list">
            {list.map((a) => {
              const target = students.filter((s) => !a.section || s.section === a.section);
              const done = target.filter((s) => attempts.some((x) => x.user_id === s.id && (x.assignment_id === a.id || (x.topic_id === a.topic_id && x.kind === a.kind && x.created_at >= a.created_at))));
              return (
                <li key={a.id} className="list-row">
                  <div>
                    <b>{a.title}</b>
                    <div className="muted small">{a.section ? classLabel(grade, a.section) : 'Бүх бүлэг'}{a.due_date && ` · ${a.due_date}`} · {done.length}/{target.length} хийсэн</div>
                  </div>
                  <button className="ghost" onClick={async () => { if (confirm('Устгах уу?')) { await api.deleteAssignment(a.id); load(); } }}>Устгах</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Questions({ grade }) {
  const { questions, refreshQuestions } = useAuth();
  const topics = allTopics(grade);
  const empty = { topic_id: topics[0]?.id || '', q: '', o: ['', '', '', ''], a: 0, e: '' };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  useEffect(() => setF(empty), [grade]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e) {
    e.preventDefault();
    const o = f.o.map((x) => x.trim());
    if (!f.q.trim() || o.some((x) => !x)) return setErr('Асуулт болон 4 хувилбарыг бүгдийг бөглөнө үү.');
    if (new Set(o).size !== o.length) return setErr('Хувилбарууд давхардсан байна.');
    await api.addQuestion({ grade, topic_id: f.topic_id, q: f.q.trim(), o, a: Number(f.a), e: f.e.trim() });
    setErr('');
    setF({ ...empty, topic_id: f.topic_id });
    refreshQuestions();
  }

  if (!topics.length) return <Empty>Энэ ангийн агуулга хараахан ороогүй.</Empty>;
  const mine = questions.filter((q) => q.grade === grade);

  return (
    <div className="grid2">
      <section className="card">
        <h2>Асуулт нэмэх</h2>
        <form className="form" onSubmit={add}>
          <label>Сэдэв
            <select value={f.topic_id} onChange={(e) => setF({ ...f, topic_id: e.target.value })}>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          <label>Асуулт<textarea rows={3} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></label>
          {f.o.map((o, i) => (
            <label key={i} className="opt-input">
              <input type="radio" name="correct" checked={Number(f.a) === i} onChange={() => setF({ ...f, a: i })} title="Зөв хариулт" />
              <span>{'АБВГ'[i]}</span>
              <input value={o} onChange={(e) => { const x = [...f.o]; x[i] = e.target.value; setF({ ...f, o: x }); }} placeholder={i === Number(f.a) ? 'Зөв хариулт' : 'Хувилбар'} />
            </label>
          ))}
          <label>Тайлбар (заавал биш)<input value={f.e} onChange={(e) => setF({ ...f, e: e.target.value })} /></label>
          {err && <div className="error">{err}</div>}
          <button className="primary">Нэмэх</button>
          <p className="muted small">Нэмсэн асуулт тухайн сэдвийн сонгох тестэд шууд орно.</p>
        </form>
      </section>
      <section className="card">
        <h2>Нэмсэн асуултууд ({mine.length})</h2>
        <p className="muted small">Хичээлийн санд: {topics.reduce((s, t) => s + (t.questions?.length || 0), 0)} асуулт.</p>
        {mine.length === 0 ? <Empty>Одоогоор нэмсэн асуулт алга.</Empty> : (
          <ul className="list">
            {mine.map((q) => (
              <li key={q.id} className="list-row">
                <div>
                  <b>{q.q}</b>
                  <div className="muted small">{findTopic(q.topic_id)?.title} · зөв: {q.o[q.a]}</div>
                </div>
                <button className="ghost" onClick={async () => { if (confirm('Устгах уу?')) { await api.deleteQuestion(q.id); refreshQuestions(); } }}>Устгах</button>
              </li>
            ))}
          </ul>
        )}
        <Link className="small" to={`/topic/${topics[0].id}`}>Сурагчийн харагдацыг үзэх →</Link>
      </section>
    </div>
  );
}

// Буруу хариултын текст: сонгох тест (options), холбох/дараалал (chosenText, answerText)
const chosenText = (d) => d.chosenText ?? (d.chosen == null ? 'хариулаагүй' : d.options?.[d.chosen]);
const answerText = (d) => d.answerText ?? d.options?.[d.answer];

function PointsSummary({ rows }) {
  const pts = totalPoints(rows);
  const lv = levelOf(pts);
  const got = new Set(earnedBadges(rows).map((b) => b.id));
  return (
    <div className="stack">
      <p className="m0">
        <b>{pts} оноо</b> · {lv.icon} {lv.name}
        {lv.next && <span className="muted small"> · дараагийн зэрэг хүртэл {lv.next.min - pts} оноо</span>}
      </p>
      <div className="badges compact">
        {BADGES.map((b) => (
          <div key={b.id} className={`badge ${got.has(b.id) ? 'got' : 'locked'}`} title={b.rule}>
            <span className="badge-icon">{b.icon}</span>
            <span className="badge-name">{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PointsBoard({ students, byUser, grade }) {
  const topics = allTopics(grade);
  const ranked = students
    .map((s) => {
      const rows = byUser[s.id] || [];
      return { s, pts: totalPoints(rows), badges: earnedBadges(rows), best: bestByTopic(rows) };
    })
    .sort((a, b) => b.pts - a.pts || a.s.last_name.localeCompare(b.s.last_name));
  if (!ranked.length) return <Empty>Энэ ангид бүртгэлтэй сурагч алга.</Empty>;
  const badgeCount = Object.fromEntries(BADGES.map((b) => [b.id, ranked.filter((r) => r.badges.some((x) => x.id === b.id)).length]));
  return (
    <div className="grid2">
      <section className="card wide">
        <h2>Онооны жагсаалт</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Сурагч</th><th>Бүлэг</th><th>Оноо</th><th>Зэрэг</th><th>Тэмдэг</th>
                {topics.map((t) => <th key={t.id} title={t.title}>{t.emoji}</th>)}
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => {
                const lv = levelOf(r.pts);
                return (
                  <tr key={r.s.id}>
                    <td><b>{i + 1}</b></td>
                    <td><b>{r.s.last_name}</b> {r.s.first_name}</td>
                    <td>{classLabel(r.s.grade, r.s.section)}</td>
                    <td><b>{r.pts}</b></td>
                    <td>{lv.icon} <span className="small">{lv.name}</span></td>
                    <td title={r.badges.map((b) => b.name).join(', ')}>{r.badges.map((b) => b.icon).join('') || '—'}</td>
                    {topics.map((t) => {
                      const b = r.best[t.id];
                      const mcq = b?.mcq;
                      return (
                        <td key={t.id} title={`${t.title}: ${b?.lesson ? 'уншсан' : 'уншаагүй'}${mcq != null ? `, тест ${mcq}%` : ''}`}>
                          {b?.lesson ? '📖' : '·'}{' '}
                          {mcq != null && <span className={mcq >= 80 ? 'good-t' : mcq >= 50 ? '' : 'low-t'}>{mcq}%</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">📖 — хичээлийн картыг уншсан, хувь — сонгох тестийн хамгийн өндөр дүн.</p>
      </section>
      <section className="card wide">
        <h2>Тэмдэг авсан сурагчид</h2>
        <div className="badges">
          {BADGES.map((b) => (
            <div key={b.id} className={`badge ${badgeCount[b.id] ? 'got' : 'locked'}`}>
              <span className="badge-icon">{b.icon}</span>
              <span className="badge-name">{b.name}</span>
              <span className="muted small">{b.rule}</span>
              <b>{badgeCount[b.id]}/{ranked.length} сурагч</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
