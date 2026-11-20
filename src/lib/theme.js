export const PRESETS = [
  { name: 'Түүхийн хүрэн', primary: '#A0522D' },
  { name: 'Тайван хөх', primary: '#1E5AA8' },
  { name: 'Ногоон', primary: '#1F8A4C' },
  { name: 'Улбар шар', primary: '#D9661F' },
  { name: 'Ягаан', primary: '#C2185B' },
  { name: 'Нил ягаан', primary: '#6A3FB5' },
  { name: 'Цэнхэр ногоон', primary: '#0F8C8C' },
  { name: 'Бараан', primary: '#37474F' },
];

export const DEFAULT_THEME = { primary: '#A0522D', mode: 'auto', font: 'md' };

export function applyTheme(theme) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const root = document.documentElement;
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--primary-soft', t.primary + '1f');
  if (t.mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t.mode);
  root.style.setProperty('--font-scale', { sm: '0.93', md: '1', lg: '1.1' }[t.font] || '1');
}
