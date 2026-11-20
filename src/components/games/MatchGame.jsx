// Холбох тоглоом: зүүн талын үгийг сонгоод, баруун талаас тайлбарыг нь дарна.
// Анхны оролдлогоор зөв холбосон хос бүр оноо авна.
import { useMemo, useState } from 'react';
import { shuffle } from '../../lib/quiz.js';

export default function MatchGame({ pairs, onFinish }) {
  const left = useMemo(() => shuffle(pairs.map((p, i) => ({ ...p, i }))), [pairs]);
  const right = useMemo(() => shuffle(pairs.map((p, i) => ({ ...p, i }))), [pairs]);
  const [sel, setSel] = useState(null); // сонгосон зүүн талын индекс
  const [done, setDone] = useState({}); // i → true
  const [miss, setMiss] = useState({}); // i → анх буруу сонгосон баруун талын текст
  const [flash, setFlash] = useState(null); // буруу сонгосон баруун талын индекс

  const matched = Object.keys(done).length;

  function tapRight(r) {
    if (sel == null || done[r.i]) return;
    if (r.i === sel) {
      const d = { ...done, [sel]: true };
      setDone(d);
      setSel(null);
      if (Object.keys(d).length === pairs.length) {
        setTimeout(() => onFinish(pairs.map((p, i) => ({ correct: !miss[i], chosenText: miss[i] || p.r, answerText: p.r, q: p.l }))), 500);
      }
    } else {
      if (!(sel in miss)) setMiss({ ...miss, [sel]: r.r });
      setFlash(r.i);
      setTimeout(() => setFlash(null), 600);
    }
  }

  return (
    <div className="game">
      <div className="game-head">
        <span className="muted small">Холбосон: {matched} / {pairs.length}</span>
        <span className="muted small">Алдаа: {Object.keys(miss).length}</span>
      </div>
      <div className="progress"><div style={{ width: `${(matched * 100) / pairs.length}%` }} /></div>
      <p className="muted small m0">Эхлээд зүүн талаас нэгийг сонгоод, дараа нь баруун талаас тохирохыг нь дарна уу.</p>
      <div className="match">
        <div className="match-col">
          {left.map((p) => (
            <button
              key={p.i}
              className={`tile ${done[p.i] ? 'right' : sel === p.i ? 'sel' : ''}`}
              disabled={!!done[p.i]}
              onClick={() => setSel(sel === p.i ? null : p.i)}
              aria-pressed={sel === p.i}
            >
              {p.l}
            </button>
          ))}
        </div>
        <div className="match-col">
          {right.map((p) => (
            <button
              key={p.i}
              className={`tile ${done[p.i] ? 'right' : flash === p.i ? 'wrong shake' : ''}`}
              disabled={!!done[p.i] || sel == null}
              onClick={() => tapRight(p)}
            >
              {p.r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
