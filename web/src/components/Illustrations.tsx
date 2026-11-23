/** Hand-made SVG illustrations: sharp at any size, tiny, and they work offline. */

const SKIN_A = '#f1c8a4'
const SKIN_B = '#c58a60'

/** A parent and child holding hands; the child's speech bubble holds a heart. */
export function WelcomeScene({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 360 250" role="img" aria-label="A parent holding hands with a child who has a heart in a speech bubble">
      <defs>
        <linearGradient id="ws-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dff3ee" />
          <stop offset="1" stopColor="#fff1e8" />
        </linearGradient>
      </defs>
      <path d="M38 150c0-70 60-118 140-118s150 40 150 108-46 92-150 92S38 214 38 150z" fill="url(#ws-sky)" />
      <circle cx="300" cy="62" r="22" fill="#ffd977" opacity="0.9" />
      <g fill="#f2b134">
        <path d="M84 70l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
        <path d="M318 132l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
        <path d="M58 182l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" opacity="0.7" />
      </g>
      <rect x="70" y="216" width="230" height="8" rx="4" fill="#e8ddd0" />

      {/* Parent */}
      <rect x="132" y="178" width="14" height="40" rx="7" fill="#075d54" />
      <rect x="154" y="178" width="14" height="40" rx="7" fill="#075d54" />
      <rect x="124" y="104" width="52" height="88" rx="24" fill="#0b7a6e" />
      <path d="M176 128c14 10 22 22 30 36" stroke="#0b7a6e" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M126 130c-8 14-10 28-8 40" stroke="#0b7a6e" strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="150" cy="80" r="22" fill={SKIN_A} />
      <path d="M127 78c0-16 11-26 24-26s24 10 24 24c-7-6-16-9-25-9s-17 4-23 11z" fill="#3a2a20" />
      <circle cx="143" cy="83" r="2.2" fill="#2b1d16" />
      <circle cx="158" cy="83" r="2.2" fill="#2b1d16" />
      <path d="M144 91c3.5 3 9 3 12 0" stroke="#2b1d16" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Child */}
      <rect x="211" y="186" width="11" height="32" rx="5.5" fill="#a8432e" />
      <rect x="227" y="186" width="11" height="32" rx="5.5" fill="#a8432e" />
      <rect x="205" y="146" width="40" height="50" rx="18" fill="#f26b4e" />
      <path d="M208 162c-3 2-4 3-4 4" stroke="#f26b4e" strokeWidth="9" strokeLinecap="round" fill="none" />
      <circle cx="205" cy="165" r="6" fill={SKIN_A} />
      <path d="M244 158c6 6 8 12 8 18" stroke="#f26b4e" strokeWidth="9" strokeLinecap="round" fill="none" />
      <circle cx="225" cy="128" r="17" fill={SKIN_B} />
      <path d="M208 126c0-12 8-19 17-19s17 7 17 17c-5-5-11-7-17-7s-12 3-17 9z" fill="#2b1d16" />
      <circle cx="220" cy="130" r="1.8" fill="#2b1d16" />
      <circle cx="231" cy="130" r="1.8" fill="#2b1d16" />
      <path d="M221 136c2.5 2 5.5 2 8 0" stroke="#2b1d16" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Speech bubble with a heart */}
      <path d="M250 58h52a18 18 0 0 1 18 18v14a18 18 0 0 1-18 18h-34l-14 12 2-12h-6a18 18 0 0 1-18-18V76a18 18 0 0 1 18-18z" fill="#ffffff" stroke="#e8ddd0" strokeWidth="2" />
      <path d="M276 96s-16-9-16-19a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 10-16 19-16 19z" fill="#e11d48" />
    </svg>
  )
}

/** A big tick with confetti, for a finished passport. */
export function CelebrateScene({ className }: { className?: string }) {
  const confetti = [
    [40, 40, '#f26b4e', 20],
    [200, 34, '#f2b134', -25],
    [60, 120, '#35c9b5', 35],
    [196, 116, '#8b7cf6', -15],
    [120, 18, '#e11d48', 10],
    [24, 84, '#f2b134', 50],
    [220, 78, '#f26b4e', -40],
  ] as const
  return (
    <svg className={className} viewBox="0 0 240 150" role="img" aria-label="A green tick with confetti">
      {confetti.map(([x, y, c, r], i) => (
        <rect key={i} x={x} y={y} width="12" height="6" rx="3" fill={c} transform={`rotate(${r} ${x + 6} ${y + 3})`} />
      ))}
      <circle cx="120" cy="78" r="46" fill="#dff3ee" />
      <circle cx="120" cy="78" r="34" fill="#0b7a6e" />
      <path d="M104 79l11 11 22-24" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
