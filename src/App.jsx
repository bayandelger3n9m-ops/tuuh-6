import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { DEMO } from './lib/api.js';
import AuthPage, { NewPasswordPage } from './pages/AuthPage.jsx';
import { classLabel } from './lib/sections.js';
import { GRADES } from './content/index.js';

// Шинэ хувилбар байршуулсны дараа хуучин файл олдохгүй бол хуудсыг нэг удаа шинэчилнэ.
const page = (load) =>
  lazy(() =>
    load().catch((e) => {
      if (!sessionStorage.getItem('chunk-reload')) {
        sessionStorage.setItem('chunk-reload', '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw e;
    })
  );
sessionStorage.removeItem('chunk-reload');
const StudentHome = page(() => import('./pages/StudentHome.jsx'));
const LessonPage = page(() => import('./pages/LessonPage.jsx'));
const PlayPage = page(() => import('./pages/PlayPage.jsx'));
const ProgressPage = page(() => import('./pages/ProgressPage.jsx'));
const TeacherPage = page(() => import('./pages/TeacherPage.jsx'));

export const APP_NAME = 'Түүх 6';

function Shell() {
  const { user, signOut, recovery } = useAuth();
  if (recovery) return <NewPasswordPage />;
  if (user === undefined) return <div className="center muted">Ачаалж байна…</div>;
  if (!user) return <AuthPage />;

  const teacher = user.role === 'teacher';
  const active = teacher || GRADES.includes(user.grade);
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="logo" aria-hidden="true">🏺</span>
          <span>
            {APP_NAME} <small>· Цахим хичээл</small>
          </span>
        </Link>
        <nav className="nav">
          {teacher ? (
            <>
              <NavLink to="/" end>Самбар</NavLink>
              <NavLink to="/lessons">Хичээлүүд</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end>Хичээл</NavLink>
              <NavLink to="/me">🏆 Миний амжилт</NavLink>
            </>
          )}
        </nav>
        <div className="who">
          <span>
            {user.last_name?.[0]}.{user.first_name}
            <small>{teacher ? ' · багш' : active ? ` · ${classLabel(user.grade, user.section)}` : ' · дүүргэсэн'}</small>
          </span>
          <button className="ghost" onClick={signOut}>Гарах</button>
        </div>
      </header>
      {DEMO && (
        <div className="demo-banner">
          Демо горим: өгөгдөл зөвхөн энэ хөтөч дээр хадгалагдана. Supabase холбоход бүх сурагч, багш нэг санг ашиглана.
        </div>
      )}
      <main className="main">
        <Suspense fallback={<div className="center muted">Ачаалж байна…</div>}>
          <Routes>
            {teacher ? (
              <>
                <Route path="/" element={<TeacherPage />} />
                <Route path="/lessons" element={<StudentHome />} />
              </>
            ) : (
              <>
                <Route path="/" element={<StudentHome />} />
                <Route path="/me" element={<ProgressPage />} />
              </>
            )}
            <Route path="/topic/:topicId" element={<LessonPage />} />
            <Route path="/play/:kind/:topicId" element={<PlayPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
