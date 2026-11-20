// Хичээлийн агуулгын бүтцийг шалгана: npm run check
import { grade6 } from '../src/content/grade6.js';

const errors = [];
const ids = new Set();
let n = { topics: 0, cards: 0, mcq: 0, match: 0, order: 0 };

for (const c of grade6.chapters) {
  for (const t of c.topics) {
    const at = `${t.id} (${t.title})`;
    n.topics++;
    if (ids.has(t.id)) errors.push(`${at}: id давхардсан`);
    ids.add(t.id);
    if (!t.cards?.length) errors.push(`${at}: карт алга`);
    for (const [i, k] of (t.cards || []).entries()) {
      n.cards++;
      if (!k.title || !k.text) errors.push(`${at}: ${i + 1}-р картад гарчиг эсвэл текст алга`);
    }
    for (const [i, q] of (t.questions || []).entries()) {
      n.mcq++;
      const w = `${at}: ${i + 1}-р асуулт`;
      if (!q.q || !Array.isArray(q.o) || q.o.length < 2) errors.push(`${w}: асуулт эсвэл хувилбар дутуу`);
      else {
        if (!Number.isInteger(q.a) || q.a < 0 || q.a >= q.o.length) errors.push(`${w}: зөв хариуны индекс (a) буруу`);
        if (new Set(q.o).size !== q.o.length) errors.push(`${w}: хувилбар давхардсан`);
      }
    }
    if (t.match) {
      const p = t.match.pairs || [];
      n.match += p.length;
      if (p.length < 2) errors.push(`${at}: холбох тоглоомд 2-оос цөөн хос`);
      if (new Set(p.map((x) => x.l)).size !== p.length) errors.push(`${at}: холбох — зүүн тал давхардсан`);
      if (new Set(p.map((x) => x.r)).size !== p.length) errors.push(`${at}: холбох — баруун тал давхардсан`);
    }
    if (t.order) {
      const it = t.order.items || [];
      n.order += it.length;
      if (it.length < 2) errors.push(`${at}: дарааллын тоглоомд 2-оос цөөн зүйл`);
      if (new Set(it).size !== it.length) errors.push(`${at}: дараалал — давхардсан зүйл`);
    }
  }
}

console.log(`${n.topics} сэдэв · ${n.cards} карт · ${n.mcq} сонгох асуулт · ${n.match} холбох хос · ${n.order} дарааллын зүйл`);
if (errors.length) {
  console.error('\nАлдаа:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('✓ Агуулга зөв байна');
