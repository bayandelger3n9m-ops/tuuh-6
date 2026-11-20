export function Meter({ value, label }) {
  const v = value == null ? null : Math.max(0, Math.min(100, value));
  const tone = v == null ? '' : v >= 80 ? 'good' : v >= 50 ? 'mid' : 'low';
  return (
    <div className="meter" title={label}>
      <div className={`meter-fill ${tone}`} style={{ width: `${v ?? 0}%` }} />
      <span className="meter-text">{v == null ? '—' : `${v}%`}</span>
    </div>
  );
}

// Оноон хувийн шугаман график (SVG)
export function TrendChart({ points, height = 140 }) {
  if (!points.length) return <p className="muted">Одоогоор өгөгдөл алга.</p>;
  const w = 600, pad = 28, h = height;
  const x = (i) => pad + (points.length === 1 ? (w - 2 * pad) / 2 : (i * (w - 2 * pad)) / (points.length - 1));
  const y = (v) => h - pad - (v / 100) * (h - 2 * pad);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Онооны ахиц">
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} className="grid" />
          <text x={4} y={y(g) + 4} className="axis">{g}</text>
        </g>
      ))}
      <path d={d} className="line" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.v)} r="4" className="dot">
          <title>{`${p.label}: ${p.v}%`}</title>
        </circle>
      ))}
    </svg>
  );
}

// Хэвтээ баганан график: [{label, v, n}]
export function Bars({ rows }) {
  if (!rows.length) return <p className="muted">Одоогоор өгөгдөл алга.</p>;
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.label}>
          <span className="bar-label">{r.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${r.v ?? 0}%` }} />
          </div>
          <span className="bar-val">{r.v == null ? '—' : `${r.v}%`}{r.n != null && <small> · {r.n}</small>}</span>
        </div>
      ))}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// Профайл зураг; зураггүй бол нэрийн эхний үсэг
export function Avatar({ user, size = 36 }) {
  const initials = `${user?.last_name?.[0] || ''}${user?.first_name?.[0] || ''}`.toUpperCase() || '?';
  return user?.avatar_url ? (
    <img className="avatar" src={user.avatar_url} alt="" width={size} height={size} style={{ width: size, height: size }} loading="lazy" />
  ) : (
    <span className="avatar avatar-text" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials}
    </span>
  );
}
