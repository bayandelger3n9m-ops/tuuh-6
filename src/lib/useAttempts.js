import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth.jsx';
import { api } from './api.js';

// Нэвтэрсэн хэрэглэгчийн бүх оролдлого (хичээл, тест). rows === null бол ачаалж байна.
export function useMyAttempts() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const reload = useCallback(async () => {
    setErr('');
    try {
      setRows(await api.listAttempts({ userId: user.id }));
    } catch (e) {
      setErr('Мэдээлэл ачаалж чадсангүй: ' + e.message);
      setRows((r) => r || []);
    }
  }, [user.id]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { rows, err, reload, setRows };
}

// Оролдлого хадгална. Багш урьдчилан харж байвал хадгалахгүй.
export async function saveAttempt(user, row) {
  if (user.role === 'teacher') return { ...row, id: 'preview', created_at: new Date().toISOString(), preview: true };
  return api.addAttempt(row);
}
