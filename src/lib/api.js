// Өгөгдлийн давхарга. VITE_SUPABASE_URL тохируулсан бол Supabase, үгүй бол демо горим (localStorage).
import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const DEMO = !(URL_ && KEY);
export const DEMO_TEACHER_CODE = 'BAGSH2026';

const EMAIL_DOMAIN = 'tuuh6.school';
const toEmail = (username) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const now = () => new Date().toISOString();

// Имэйл: зайг арилгаж, жижиг үсгээр хадгална.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function normEmail(v) {
  const s = (v || '').trim().toLowerCase();
  return EMAIL_RE.test(s) ? s : null;
}
// Утасны дугаар: зай, зураас, +976 угтварыг арилгаад 8 оронтой тоо болгоно.
function normPhone(v) {
  let s = (v || '').replace(/[\s\-()]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.length === 11 && s.startsWith('976')) s = s.slice(3);
  return /^\d{8}$/.test(s) ? s : null;
}
function phoneOrThrow(v) {
  const s = normPhone(v);
  if (!s) throw new Error('Утасны дугаараа 8 оронтой тоогоор оруулна уу.');
  return s;
}
// Нэвтрэхэд: утасны дугаар (өмнө имэйлээр бүртгүүлсэн цөөн хүн имэйлээрээ нэвтэрсээр болно).
function loginId(v) {
  return normPhone(v) || normEmail(v) || (v || '').trim().toLowerCase();
}
function authEmail(v) {
  const id = loginId(v);
  return id.includes('@') ? id : toEmail(id);
}
const PW_MIN = 6;
function pwOrThrow(pw) {
  if ((pw || '').length < PW_MIN) throw new Error(`Нууц үг хамгийн багадаа ${PW_MIN} тэмдэгт.`);
}

// ---------------- Демо (localStorage) ----------------
const LS = 'tuuh6-demo-v1';
function load() {
  try {
    return JSON.parse(localStorage.getItem(LS)) || null;
  } catch {
    return null;
  }
}
function save(db) {
  try {
    localStorage.setItem(LS, JSON.stringify(db));
  } catch {
    /* хадгалах боломжгүй — санах ойд үлдэнэ */
  }
}
let memDb = null;
function db() {
  if (!memDb) memDb = load() || { users: [], profiles: [], attempts: [], questions: [], assignments: [], session: null };
  return memDb;
}
function commit() {
  save(memDb);
}


const demo = {
  async getSession() {
    const d = db();
    return d.profiles.find((p) => p.id === d.session) || null;
  },
  async signUp(f) {
    const d = db();
    const username = phoneOrThrow(f.username);
    if (d.users.some((u) => u.username === username)) throw new Error('Энэ утасны дугаар бүртгэлтэй байна.');
    pwOrThrow(f.password);
    if (f.role === 'teacher' && f.teacher_code !== DEMO_TEACHER_CODE) throw new Error('Багшийн код буруу байна.');
    const id = uid();
    d.users.push({ id, username, password: f.password });
    d.profiles.push({
      id,
      username,
      role: f.role,
      last_name: f.last_name.trim(),
      first_name: f.first_name.trim(),
      grade: Number(f.grade),
      section: f.role === 'student' ? f.section.trim().toLowerCase() : null,
      theme: null,
      login_count: 1,
      last_seen: now(),
      created_at: now(),
    });
    d.session = id;
    commit();
    return d.profiles.find((p) => p.id === id);
  },
  async signIn(username, password) {
    const d = db();
    const u = d.users.find((x) => x.username === loginId(username) && x.password === password);
    if (!u) throw new Error('Утасны дугаар эсвэл нууц үг буруу.');
    d.session = u.id;
    const p = d.profiles.find((x) => x.id === u.id);
    p.login_count = (p.login_count || 0) + 1;
    p.last_seen = now();
    commit();
    return p;
  },
  async signOut() {
    db().session = null;
    commit();
  },
  async resetPassword() {
    throw new Error('Нууц үгээ шинэчлүүлэхийн тулд багшдаа хандана уу.');
  },
  async updatePassword(pw) {
    pwOrThrow(pw);
    const d = db();
    const u = d.users.find((x) => x.id === d.session);
    if (u) u.password = pw;
    commit();
  },
  onRecovery() {
    return () => {};
  },
  async updateMyProfile(patch) {
    const d = db();
    const p = d.profiles.find((x) => x.id === d.session);
    const allowed = ['theme', 'last_name', 'first_name', ...(p.role === 'teacher' ? ['grade'] : [])];
    for (const k of allowed) if (k in patch) p[k] = patch[k];
    commit();
    return p;
  },
  async listProfiles({ grade, role = 'student' } = {}) {
    return db().profiles.filter((p) => p.role === role && (grade == null || p.grade === grade));
  },
  async resetStudentPassword(id, pw) {
    pwOrThrow(pw);
    const d = db();
    const u = d.users.find((x) => x.id === id);
    if (!u) throw new Error('Сурагч олдсонгүй');
    u.password = pw;
    commit();
  },
  async updateStudent(id, patch) {
    const p = db().profiles.find((x) => x.id === id);
    if ('grade' in patch) p.grade = Number(patch.grade);
    if ('section' in patch) p.section = patch.section;
    commit();
  },
  async promoteAll() {
    // 6 → 7 (6-р ангиа дүүргэсэн)
    for (const p of db().profiles) if (p.role === 'student' && p.grade === 6) p.grade = 7;
    commit();
  },
  async addAttempt(a) {
    const d = db();
    const row = { ...a, id: uid(), user_id: d.session, created_at: now() };
    d.attempts.push(row);
    commit();
    return row;
  },
  async listAttempts({ userId, grade } = {}) {
    const d = db();
    let rows = d.attempts;
    if (userId) rows = rows.filter((r) => r.user_id === userId);
    if (grade != null) {
      const ids = new Set(d.profiles.filter((p) => p.grade === grade).map((p) => p.id));
      rows = rows.filter((r) => ids.has(r.user_id));
    }
    return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async listQuestions() {
    return db().questions;
  },
  async addQuestion(q) {
    db().questions.push({ ...q, id: uid(), created_by: db().session, created_at: now() });
    commit();
  },
  async deleteQuestion(id) {
    const d = db();
    d.questions = d.questions.filter((q) => q.id !== id);
    commit();
  },
  async listAssignments({ grade } = {}) {
    return db().assignments.filter((a) => grade == null || a.grade === grade);
  },
  async addAssignment(a) {
    db().assignments.push({ ...a, id: uid(), created_by: db().session, created_at: now() });
    commit();
  },
  async deleteAssignment(id) {
    const d = db();
    d.assignments = d.assignments.filter((a) => a.id !== id);
    commit();
  },
};


// ---------------- Supabase ----------------
const sb = DEMO ? null : createClient(URL_, KEY);
const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
// Сессийг хөтчөөс уншина (getUser шиг Auth сервер рүү хүсэлт явуулдаггүй) — олон хүн зэрэг ороход ачаалал багасна.
async function myId() {
  const { data } = await sb.auth.getSession();
  return data.session?.user?.id || null;
}

// Supabase нэг удаад 1000 мөр л буцаадаг тул хуудаслаж бүгдийг авна.
const PAGE = 1000;
async function fetchAll(build) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const rows = must(await build().range(from, from + PAGE - 1));
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

// Түр зуурын сүлжээний/ачааллын алдаанд дахин оролдоно (0.5с, 1.5с, 3.5с)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function retry(fn, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries - 1 || /violates|permission|policy|invalid|JWT/i.test(e.message)) throw e;
      await sleep(500 * (2 ** (i + 1) - 1));
    }
  }
}

// Хадгалж чадаагүй оролдлогыг хөтөчид түр хадгалж, дараа нь автоматаар илгээнэ — оноо алдагдахгүй.
const PENDING = 'tuuh6-pending-attempts';
const readPending = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING)) || [];
  } catch {
    return [];
  }
};
const writePending = (rows) => {
  try {
    if (rows.length) localStorage.setItem(PENDING, JSON.stringify(rows));
    else localStorage.removeItem(PENDING);
  } catch {
    /* */
  }
};
let flushing = false;
async function flushPending() {
  if (flushing) return;
  const rows = readPending();
  if (!rows.length) return;
  flushing = true;
  const left = [];
  for (const r of rows) {
    try {
      must(await sb.from('attempts').insert(r));
    } catch {
      left.push(r);
    }
  }
  writePending(left);
  flushing = false;
  attemptsCache.clear();
}

// Сурагчийн өөрийн оролдлогыг хуудас хооронд 30 секунд кэшлэнэ (нэг хуудас солих бүрт дахин татахгүй).
const attemptsCache = new Map();
const LIGHT_COLS = 'id, user_id, kind, grade, topic_id, title, score, total, points, streak, duration_sec, assignment_id, created_at';

const supa = {
  async getSession() {
    const id = await myId();
    if (!id) return null;
    const p = await retry(async () => must(await sb.from('profiles').select('*').eq('id', id).maybeSingle()));
    if (p) flushPending();
    return p;
  },
  async signUp(f) {
    const username = phoneOrThrow(f.username);
    pwOrThrow(f.password);
    const { data, error } = await sb.auth.signUp({
      email: toEmail(username),
      password: f.password,
      options: {
        data: {
          username,
          role: f.role,
          last_name: f.last_name.trim(),
          first_name: f.first_name.trim(),
          grade: Number(f.grade),
          section: f.role === 'student' ? f.section.trim().toLowerCase() : null,
          teacher_code: f.teacher_code || null,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      if (/already/i.test(error.message)) throw new Error('Энэ утасны дугаар бүртгэлтэй байна.');
      // Supabase триггерийн алдааг "Database error saving new user" гэж нууж буцаадаг.
      if (/teacher/i.test(error.message) || (f.role === 'teacher' && /database error/i.test(error.message)))
        throw new Error('Багшийн код буруу байна.');
      if (/database error/i.test(error.message)) throw new Error('Бүртгэл үүсгэхэд алдаа гарлаа. Анги, мэдээллээ шалгаад дахин оролдоно уу.');
      throw new Error(error.message);
    }
    // Supabase дээр "Confirm email" асаалттай бол сесс үүсэхгүй — утасны дугаарт имэйл байхгүй тул унтраах ёстой.
    if (!data.session) {
      throw new Error('Бүртгэл баталгаажуулалт хүлээж байна. Сайтын админ Supabase дээр "Confirm email"-ийг унтраах шаардлагатай.');
    }
    return supa.getSession();
  },
  async signIn(username, password) {
    const { error } = await sb.auth.signInWithPassword({ email: authEmail(username), password });
    if (error) {
      if (/confirm/i.test(error.message)) throw new Error('Бүртгэл баталгаажаагүй байна. Сайтын админ Supabase дээр "Confirm email"-ийг унтраах шаардлагатай.');
      throw new Error('Утасны дугаар эсвэл нууц үг буруу.');
    }
    await sb.rpc('touch_login');
    return supa.getSession();
  },
  async signOut() {
    await sb.auth.signOut();
  },
  async resetPassword() {
    // Утасны дугаараар бүртгүүлсэн тул сэргээх имэйл илгээх боломжгүй.
    throw new Error('Нууц үгээ шинэчлүүлэхийн тулд багшдаа хандана уу.');
  },
  async updatePassword(pw) {
    pwOrThrow(pw);
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) throw new Error(error.message);
  },
  // Сэргээх холбоосоор орж ирэхэд дуудагдана.
  onRecovery(cb) {
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') cb();
    });
    return () => data.subscription.unsubscribe();
  },
  async updateMyProfile(patch) {
    const id = await myId();
    const p = {};
    for (const k of ['theme', 'last_name', 'first_name', 'grade']) if (k in patch) p[k] = patch[k];
    const { data, error } = await sb.from('profiles').update(p).eq('id', id).select().single();
    if (error) {
      if (/Анги, бүлгийг/.test(error.message)) throw new Error('Анги, бүлгээ зөвхөн багш өөрчилнө.');
      throw new Error(error.message);
    }
    return data;
  },
  async listProfiles({ grade, role = 'student' } = {}) {
    return fetchAll(() => {
      let q = sb.from('profiles').select('*').eq('role', role);
      if (grade != null) q = q.eq('grade', grade);
      return q.order('section').order('last_name').order('id');
    });
  },
  async updateStudent(id, patch) {
    must(await sb.from('profiles').update(patch).eq('id', id));
  },
  // Багш сурагчийн нууц үгийг шинэчлэх (supabase/reset_password.sql)
  async resetStudentPassword(id, pw) {
    pwOrThrow(pw);
    const { error } = await sb.rpc('teacher_reset_password', { p_user: id, p_password: pw });
    if (error) {
      if (/teacher_reset_password|schema cache|PGRST202|function/i.test(error.message))
        throw new Error('Нууц үг шинэчлэх тохиргоо Supabase дээр хийгдээгүй байна. supabase/reset_password.sql-ийг ажиллуулна уу.');
      throw new Error(error.message);
    }
  },
  async promoteAll() {
    must(await sb.rpc('promote_all_students'));
  },
  async addAttempt(a) {
    const user_id = await myId();
    const row = { ...a, user_id, id: crypto.randomUUID ? crypto.randomUUID() : undefined };
    attemptsCache.clear();
    try {
      await retry(async () => must(await sb.from('attempts').insert(row)));
      flushPending();
      return { ...row, created_at: now() };
    } catch (e) {
      // Сүлжээ ачаалалтай байсан ч оноо алдагдахгүй: хөтөчид хадгалж, дараа нь илгээнэ.
      if (/violates|permission|policy/i.test(e.message)) throw e;
      const saved = { ...row, created_at: now() };
      writePending([...readPending(), saved]);
      return { ...saved, pending: true };
    }
  },
  // light: хариултын дэлгэрэнгүй (answers)-гүйгээр — багшийн самбарын хураангуйд
  async listAttempts({ userId, grade, light } = {}) {
    const key = userId && !light ? userId : null;
    const hit = key && attemptsCache.get(key);
    if (hit && Date.now() - hit.at < 30000) return hit.rows;
    const cols = light ? LIGHT_COLS : '*';
    const rows = await retry(() =>
      fetchAll(() => {
        let q = sb.from('attempts').select(grade != null ? `${cols}, profiles!inner(grade)` : cols);
        if (userId) q = q.eq('user_id', userId);
        if (grade != null) q = q.eq('profiles.grade', grade);
        return q.order('created_at').order('id');
      })
    );
    const out = rows.map(({ profiles, ...r }) => r);
    const pend = userId ? readPending().filter((p) => p.user_id === userId).map((p) => ({ ...p, created_at: p.created_at || now(), pending: true })) : [];
    const all = [...out, ...pend.filter((p) => !out.some((o) => o.id === p.id))];
    if (key) attemptsCache.set(key, { at: Date.now(), rows: all });
    return all;
  },
  async listQuestions() {
    return retry(() => fetchAll(() => sb.from('custom_questions').select('*').order('created_at').order('id')));
  },
  async addQuestion(q) {
    must(await sb.from('custom_questions').insert({ ...q, created_by: await myId() }));
  },
  async deleteQuestion(id) {
    must(await sb.from('custom_questions').delete().eq('id', id));
  },
  async listAssignments({ grade } = {}) {
    let q = sb.from('assignments').select('*');
    if (grade != null) q = q.eq('grade', grade);
    return must(await q.order('created_at', { ascending: false }));
  },
  async addAssignment(a) {
    must(await sb.from('assignments').insert({ ...a, created_by: await myId() }));
  },
  async deleteAssignment(id) {
    must(await sb.from('assignments').delete().eq('id', id));
  },
};

if (!DEMO && typeof window !== 'undefined') window.addEventListener('online', () => flushPending());

export const api = DEMO ? demo : supa;
