import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { DEMO, DEMO_TEACHER_CODE } from '../lib/api.js';
import { SECTIONS, classLabel } from '../lib/sections.js';

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
);
const KeyIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7.5" cy="12" r="3.5" />
    <path d="M11 12h10M18 12v3M21 12v2" />
  </svg>
);

function IconInput({ icon, ...props }) {
  return (
    <div className="icon-input">
      <span className="icon-input-icon">{icon}</span>
      <input {...props} />
    </div>
  );
}

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ role: 'student', grade: 6, section: '1', username: '', password: '', last_name: '', first_name: '', teacher_code: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const switchMode = (m) => {
    setMode(m);
    setErr('');
    setInfo('');
  };

  function forgot() {
    setErr('');
    setInfo('Нууц үгээ шинэчлүүлэхийн тулд багшдаа хандана уу.');
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'login') await signIn(f.username, f.password);
      else {
        if (!f.last_name.trim() || !f.first_name.trim()) throw new Error('Овог, нэрээ бичнэ үү.');
        await signUp(f);
      }
    } catch (x) {
      if (x.info) {
        setInfo(x.message);
        setMode('login');
      } else setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo big" aria-hidden="true">🏺</span>
          <h1 className="auth-title">{isLogin ? 'Түүх 6-д нэвтрэх' : 'Шинээр бүртгүүлэх'}</h1>
          {isLogin && <p className="muted small">6-р ангийн түүхийн цахим хичээл</p>}
        </div>
        <form onSubmit={submit} className="form">
          {!isLogin && (
            <>
              <div className="seg small">
                <button type="button" className={f.role === 'student' ? 'on' : ''} onClick={() => setF({ ...f, role: 'student' })}>Сурагч</button>
                <button type="button" className={f.role === 'teacher' ? 'on' : ''} onClick={() => setF({ ...f, role: 'teacher' })}>Багш</button>
              </div>
              <div className="row2">
                <label>Овог<input value={f.last_name} onChange={set('last_name')} required /></label>
                <label>Нэр<input value={f.first_name} onChange={set('first_name')} required /></label>
              </div>
              <div className="row2">
                <label>
                  {f.role === 'teacher' ? 'Заадаг анги' : 'Анги'}
                  <select value={f.grade} onChange={set('grade')}>
                    <option value={6}>6-р анги</option>
                  </select>
                </label>
                {f.role === 'student' ? (
                  <label>
                    Бүлэг
                    <select value={f.section} onChange={set('section')}>
                      {SECTIONS.map((s) => (
                        <option key={s} value={s}>{classLabel(f.grade, s)}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    Багшийн код
                    <input value={f.teacher_code} onChange={set('teacher_code')} required placeholder={DEMO ? DEMO_TEACHER_CODE : ''} />
                  </label>
                )}
              </div>
            </>
          )}

          <IconInput
            icon={<PhoneIcon />}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={f.username}
            onChange={set('username')}
            required
            placeholder="Утасны дугаараа оруулна уу"
            aria-label="Утасны дугаар"
          />
          <IconInput
            icon={<KeyIcon />}
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={f.password}
            onChange={set('password')}
            required
            placeholder={isLogin ? 'Нууц үгээ оруулна уу' : 'Нууц үг (6+ тэмдэгт)'}
            aria-label="Нууц үг"
          />

          {isLogin && (
            <div className="auth-forgot">
              <button type="button" className="link" onClick={forgot} disabled={busy}>Нууц үг мартсан?</button>
            </div>
          )}
          {info && <p className="auth-note">{info}</p>}

          {err && <div className="error">{err}</div>}
          <button className="primary auth-submit" disabled={busy}>
            {busy ? '…' : isLogin ? 'Нэвтрэх' : 'Бүртгүүлэх'} {!busy && <span aria-hidden="true">→</span>}
          </button>

          {!isLogin && f.role === 'student' && (
            <p className="muted small">Өөрийн утасны дугаараа ашиглаарай. Анги, бүлгийг дараа нь зөвхөн багш өөрчилнө.</p>
          )}
          {DEMO && !isLogin && f.role === 'teacher' && (
            <p className="muted small">Демо горимын багшийн код: <b>{DEMO_TEACHER_CODE}</b></p>
          )}
        </form>

        {isLogin ? (
          <div className="auth-register">
            <div className="auth-or"><span>Бүртгэлгүй юу?</span></div>
            <button type="button" className="auth-secondary" onClick={() => switchMode('register')}>
              Шинээр бүртгүүлэх
            </button>
            <p className="muted small">Сурагч, багш хэн ч утасны дугаараараа нэг минутад бүртгүүлнэ.</p>
          </div>
        ) : (
          <p className="auth-switch">
            Бүртгэлтэй юу? <button type="button" className="link strong" onClick={() => switchMode('login')}>Нэвтрэх</button>
          </p>
        )}
      </div>
    </div>
  );
}

// Имэйлээр ирсэн "нууц үг сэргээх" холбоосоор орж ирэхэд харагдана.
export function NewPasswordPage() {
  const { finishRecovery } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (pw !== pw2) return setErr('Хоёр нууц үг таарахгүй байна.');
    setBusy(true);
    try {
      await finishRecovery(pw);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <h1 className="auth-title">Шинэ нууц үг</h1>
        <form onSubmit={submit} className="form">
          <IconInput icon={<KeyIcon />} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required placeholder="Шинэ нууц үг (6+ тэмдэгт)" aria-label="Шинэ нууц үг" />
          <IconInput icon={<KeyIcon />} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required placeholder="Нууц үгээ давтана уу" aria-label="Нууц үг давтах" />
          {err && <div className="error">{err}</div>}
          <button className="primary auth-submit" disabled={busy}>
            {busy ? '…' : 'Хадгалаад нэвтрэх'} {!busy && <span aria-hidden="true">→</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
