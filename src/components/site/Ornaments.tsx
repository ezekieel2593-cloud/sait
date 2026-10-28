/**
 * Декоративные SVG-иллюстрации в едином стиле: жемчуг, орбиты, тонкое золото.
 * Все — оригинальные, без внешних изображений; масштабируются и не весят ничего.
 */

export function HeroPearl({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 520"
      className={className}
      role="img"
      aria-label="Жемчужина в перламутровых орбитах и бирюзовом свечении"
    >
      <defs>
        <radialGradient id="hp-glow" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#DDF0F1" stopOpacity="0.55" />
          <stop offset="1" stopColor="#DCC5D9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hp-pearl" cx="0.34" cy="0.26" r="0.78">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#FBF7F5" />
          <stop offset="0.8" stopColor="#EDE7E6" />
          <stop offset="1" stopColor="#D8D2D3" />
        </radialGradient>
        <linearGradient id="hp-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3C79E" />
          <stop offset="0.5" stopColor="#C9A777" />
          <stop offset="1" stopColor="#B8935F" />
        </linearGradient>
        <linearGradient id="hp-turq" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DCEFF0" />
          <stop offset="0.6" stopColor="#B8DDE0" />
          <stop offset="1" stopColor="#8FC6CB" />
        </linearGradient>
        <filter id="hp-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      <circle cx="260" cy="252" r="236" fill="url(#hp-glow)" />

      <g fill="none" stroke="url(#hp-gold)" strokeWidth="0.9" opacity="0.6">
        <ellipse cx="260" cy="256" rx="222" ry="96" transform="rotate(-18 260 256)" />
        <ellipse cx="260" cy="256" rx="196" ry="196" opacity="0.5" />
        <ellipse cx="260" cy="256" rx="150" ry="150" opacity="0.35" strokeDasharray="2 7" />
      </g>

      <g filter="url(#hp-blur)" opacity="0.55">
        <ellipse cx="150" cy="360" rx="110" ry="54" fill="url(#hp-turq)" transform="rotate(-12 150 360)" />
        <ellipse cx="380" cy="180" rx="96" ry="46" fill="#DCC5D9" opacity="0.55" transform="rotate(14 380 180)" />
      </g>

      <g>
        <circle cx="260" cy="252" r="104" fill="url(#hp-pearl)" />
        <ellipse cx="232" cy="214" rx="34" ry="24" fill="#FFFFFF" opacity="0.85" transform="rotate(-24 232 214)" />
        <path
          d="M330 300a104 104 0 0 0-140 0"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
      </g>

      <circle cx="260" cy="252" r="104" fill="none" stroke="url(#hp-gold)" strokeWidth="1.1" opacity="0.75" />

      {/* жемчужины-спутники */}
      <g>
        <circle cx="96" cy="196" r="26" fill="url(#hp-pearl)" />
        <circle cx="96" cy="196" r="26" fill="none" stroke="#C9A777" strokeOpacity="0.5" strokeWidth="0.8" />
        <circle cx="415" cy="352" r="19" fill="url(#hp-pearl)" />
        <circle cx="415" cy="352" r="19" fill="none" stroke="#C9A777" strokeOpacity="0.5" strokeWidth="0.8" />
        <circle cx="390" cy="120" r="12" fill="url(#hp-turq)" opacity="0.9" />
        <circle cx="140" cy="420" r="10" fill="#DCC5D9" opacity="0.9" />
      </g>

      <g stroke="url(#hp-gold)" strokeWidth="1" fill="none" opacity="0.75">
        <path d="M78 118c6-10 18-10 24 0-6 10-18 10-24 0Z" />
        <path d="M432 236l10 18-10 18-10-18 10-18Z" />
      </g>
    </svg>
  );
}

export function PearlDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 20" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pd-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C9A777" stopOpacity="0" />
          <stop offset="0.5" stopColor="#C9A777" />
          <stop offset="1" stopColor="#C9A777" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 10h108M132 10h108" stroke="url(#pd-gold)" strokeWidth="1" />
      <circle cx="120" cy="10" r="5" fill="url(#pd-gold)" />
      <circle cx="120" cy="10" r="9" fill="none" stroke="url(#pd-gold)" strokeWidth="0.7" opacity="0.6" />
    </svg>
  );
}

export function OrbitBadge({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" fill="none">
      <circle cx="60" cy="60" r="46" stroke="#C9A777" strokeOpacity="0.45" strokeWidth="0.9" />
      <circle cx="60" cy="60" r="34" stroke="#B8DDE0" strokeWidth="1.1" strokeDasharray="3 5" />
      <circle cx="60" cy="60" r="10" fill="#FFFFFF" stroke="#C9A777" strokeWidth="1" />
      <circle cx="92" cy="38" r="4" fill="#DCC5D9" />
      <circle cx="30" cy="84" r="3" fill="#B8DDE0" />
    </svg>
  );
}
