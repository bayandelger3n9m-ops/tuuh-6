// Он цагийн дараалал: доорх картуудыг зөв дарааллаар нь ээлжлэн дарж байрлуулна.
// Зөв байранд орсон карт бүр оноо авна.
import { useMemo, useState } from 'react';
import { shuffle } from '../../lib/quiz.js';

function mixed(items) {
  // Анхнаасаа зөв дараалалтай гарахаас сэргийлнэ
  for (let k = 0; k < 10; k++) {
    const s = shuffle(items.map((text, i) => ({ text, i })));
    if (s.some((x, j) => x.i !== j)) return s;
  }
  return items.map((text, i) => ({ text, i })).reverse();
}

export default function OrderGame({ items, onFinish }) {
  const pool0 = useMemo(() => mixed(items), [items]);
  const [placed, setPlaced] = useState([]); // [{text, i}]
  const [checked, setChecked] = useState(false);
  const pool = pool0.filter((x) => !placed.includes(x));
  const score = placed.filter((x, j) => x.i === j).length;

  const place = (x) => !checked && setPlaced([...placed, x]);
  const unplace = (x) => !checked && setPlaced(placed.filter((y) => y !== x));

  function finish() {
    onFinish(items.map((text, j) => ({ correct: placed[j]?.i === j, chosenText: placed[j]?.text ?? '—', answerText: text, q: `${j + 1}-р байр` })));
  }

  return (
    <div className="game">
      <div className="game-head">
        <span className="muted small">Байрлуулсан: {placed.length} / {items.length}</span>
        {checked && <b className={score === items.length ? 'good-t' : ''}>{score} / {items.length} зөв</b>}
      </div>
      <div className="progress"><div style={{ width: `${(placed.length * 100) / items.length}%` }} /></div>

      <ol className="slots" aria-label="Таны дараалал">
        {items.map((_, j) => {
          const x = placed[j];
          const cls = !x ? 'empty-slot' : !checked ? '' : x.i === j ? 'right' : 'wrong';
          return (
            <li key={j} className={`slot ${cls}`}>
              <span className="slot-n">{j + 1}</span>
              {x ? (
                <button className="slot-item" onClick={() => unplace(x)} disabled={checked} title="Буцааж авах">
                  {x.text}
                </button>
              ) : (
                <span className="muted small">{j === placed.length ? '← дараагийнхыг доороос сонго' : ''}</span>
              )}
              {checked && x && x.i !== j && <span className="slot-fix small">Зөв нь: {items[j]}</span>}
            </li>
          );
        })}
      </ol>

      {!checked && pool.length > 0 && (
        <div className="pool">
          {pool.map((x) => (
            <button key={x.i} className="tile" onClick={() => place(x)}>
              {x.text}
            </button>
          ))}
        </div>
      )}

      <div className="game-foot">
        {!checked && placed.length > 0 && (
          <button className="ghost" onClick={() => setPlaced([])}>↺ Дахин эхлэх</button>
        )}
        {!checked ? (
          <button className="primary big" disabled={pool.length > 0} onClick={() => setChecked(true)}>
            Шалгах ✓
          </button>
        ) : (
          <button className="primary big" onClick={finish}>Үргэлжлүүлэх →</button>
        )}
      </div>
    </div>
  );
}
