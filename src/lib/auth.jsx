import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api.js';
import { applyTheme } from './theme.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = ачаалж байна
  const [questions, setQuestions] = useState([]);
  const [recovery, setRecovery] = useState(false); // нууц үг сэргээх холбоосоор орж ирсэн
  const navigate = useNavigate();

  const refreshQuestions = useCallback(async () => {
    try {
      setQuestions(await api.listQuestions());
    } catch {
      setQuestions([]);
    }
  }, []);

  useEffect(() => {
    api.getSession().then((p) => setUser(p || null)).catch(() => setUser(null));
    return api.onRecovery(() => setRecovery(true));
  }, []);

  useEffect(() => {
    applyTheme(user?.theme);
    if (user) refreshQuestions();
  }, [user, refreshQuestions]);

  const value = {
    user,
    setUser,
    questions,
    refreshQuestions,
    recovery,
    resetPassword: (email) => api.resetPassword(email),
    finishRecovery: async (pw) => {
      await api.updatePassword(pw);
      setRecovery(false);
      setUser(await api.getSession());
      navigate('/', { replace: true });
    },
    signIn: async (u, p) => {
      setUser(await api.signIn(u, p));
      navigate('/', { replace: true });
    },
    signUp: async (f) => {
      setUser(await api.signUp(f));
      navigate('/', { replace: true });
    },
    signOut: async () => {
      await api.signOut();
      setUser(null);
      navigate('/', { replace: true });
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
