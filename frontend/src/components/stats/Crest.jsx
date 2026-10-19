import { useState } from 'react';

// Team/league logo with graceful initials fallback.
export default function Crest({ src, alt = '', size = 28, className = '', rounded = 'rounded-md' }) {
  const [err, setErr] = useState(false);
  const initials = String(alt || '?').replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  if (!src || err) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-ink-700 text-slate-400 font-bold ${rounded} ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.36) }}
      >
        {initials}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErr(true)}
      className={`object-contain ${rounded} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
