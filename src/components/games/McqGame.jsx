// Сонгох тест: нэг нэгээр нь асууж, хариулт шууд гарна. Дараалан зөв хариулбал "галт цуваа".
import { useState } from 'react';
import { optLabel } from '../../lib/quiz.js';

export default function McqGame({ questions, onFinish }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);
  const q = questions[i];
  const results = answers.map((a, k) => a === questions[k].answer);
  let run = 0;
  for (const ok of results) run = ok ? run + 1 : 0;

  function pick(j) {
    if (picked != null) return;
    setPicked(j);
    setAnswers([...answers, j]);
  }
  function next() {
    if (i + 1 >= questions.length) return onFinish(answers);
    setI(i + 1);
    setPicked(null);
  }

  const done = picked != null;
  const right = done && picked === q.answer;
  return (
    <div className="game">
      <div className="game-head">
        <span className="muted small">Асуулт {i + 1} / {questions.length}</span>
        <span className={`streak ${run >= 3 ? 'hot' : ''}`} aria-live="polite">
          {run >= 2 ? `🔥 ${run} дараалан зөв` : ''}
        </span>
      </div>
      <div className="progress"><div style={{ width: `${((i + (done ? 1 : 0)) * 100) / questions.length}%` }} /></div>

      <h2 className="game-q">{q.q}</h2>
      {q.src && <span className="q-src">{q.src}</span>}
      <div className="opts">
        {q.options.map((o, j) => {
          const cls = !done ? '' : j === q.answer ? 'right' : j === picked ? 'wrong' : 'dim';
          return (
            <button key={j} className={`opt big-opt ${cls}`} onClick={() => pick(j)} disabled={done}>
              <span className="opt-letter">{optLabel(j)}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>

      {done && (
        <div className={`feedback ${right ? 'ok' : 'bad'}`} role="status">
          <b>{right ? (run >= 3 ? `Гайхалтай! 🔥 ${run} дараалан зөв` : 'Зөв! 👏') : 'Буруу байна'}</b>
          {!right && <span> Зөв хариулт: <b>{q.options[q.answer]}</b></span>}
          {q.e && <p className="small m0">{q.e}</p>}
        </div>
      )}
      <div className="game-foot">
        <button className="primary big" onClick={next} disabled={!done}>
          {i + 1 >= questions.length ? 'Дуусгах' : 'Дараах'} →
        </button>
      </div>
    </div>
  );
}
