import Link from "next/link";

export function Logo({ text = "Жемчужина", href = "/" }: { text?: string; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label={`${text} — на главную`}>
      <span className="relative grid h-9 w-9 place-items-center rounded-full border border-[var(--line-gold)] bg-white/70">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="7.6" stroke="var(--gold)" strokeWidth="1.1" />
          <path
            d="M12 4.4c1.6 3.1 1.6 5.9 0 7.6-1.6 1.7-1.6 4.4 0 7.6 3.2-1.4 4.9-4.4 4.9-7.6S15.2 5.8 12 4.4Z"
            fill="url(#pearlGrad)"
            stroke="var(--turquoise-deep)"
            strokeWidth="0.9"
          />
          <defs>
            <linearGradient id="pearlGrad" x1="8" y1="4" x2="17" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F7FBFC" />
              <stop offset="0.5" stopColor="#B8DDE0" />
              <stop offset="1" stopColor="#DCC5D9" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span className="font-[family-name:var(--font-display)] text-[1.35rem] leading-none tracking-[0.01em] text-[var(--ocean)]">
        {text}
      </span>
    </Link>
  );
}
