import { getConfig } from "../config";

/** Подвал статической версии. */
export function Footer() {
  const config = getConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[var(--line)] bg-[rgba(255,255,255,0.55)]">
      <div className="container grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:py-16">
        <div className="max-w-sm">
          <p className="brand-name">{config.logoText}</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-[1rem] uppercase tracking-[0.12em] text-[var(--ocean)]">
            {config.brandTitle}
          </p>
          <p className="brand-sub brand-sub--lg mt-2">{config.brandTagline}</p>
          <p className="mt-3 text-[0.92rem] leading-relaxed text-[var(--ink-soft)]">{config.tagline}. Расчёты выполняются по фиксированным алгоритмам с указанием версии методики.</p>
          <p className="mt-4 text-[0.8rem] leading-relaxed text-[var(--ink-faint)]">
            Астрология и Матрица судьбы — традиционные практики без научного подтверждения. Материалы не заменяют
            консультацию врача, юриста или финансового специалиста.
          </p>
        </div>

        <nav aria-label="Разделы сайта">
          <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">Разделы</p>
          <div className="grid gap-2 text-[0.92rem]">
            <a href="index.html" className="text-[var(--ink)] hover:text-[var(--ocean)]">Главная</a>
            <a href="astrology.html" className="text-[var(--ink)] hover:text-[var(--ocean)]">Натальная карта</a>
            <a href="matrix.html" className="text-[var(--ink)] hover:text-[var(--ocean)]">Матрица судьбы</a>
            <a href="full-reading.html" className="text-[var(--ink)] hover:text-[var(--ocean)]">Полный разбор</a>
          </div>
        </nav>

        <div>
          <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">Контакты</p>
          <div className="grid gap-2 text-[0.92rem]">
            {config.contacts.telegram ? (
              <a href={config.contacts.telegram} className="text-[var(--ink)] hover:text-[var(--ocean)]" rel="noopener noreferrer">
                Telegram
              </a>
            ) : null}
            {config.contacts.email ? (
              <a href={`mailto:${config.contacts.email}`} className="text-[var(--ink)] hover:text-[var(--ocean)]">
                {config.contacts.email}
              </a>
            ) : null}
            {config.contacts.phone ? <p className="text-[var(--ink)]">{config.contacts.phone}</p> : null}
            {config.contacts.location ? <p className="text-[var(--ink-soft)]">{config.contacts.location}</p> : null}
            <a href="privacy.html" className="text-[var(--ink)] hover:text-[var(--ocean)]">Политика конфиденциальности</a>
            <a href="terms.html" className="text-[var(--ink)] hover:text-[var(--ocean)]">Условия использования</a>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="container flex flex-wrap items-center justify-between gap-2 py-5 text-[0.78rem] text-[var(--ink-faint)]">
          <p>© {year} {config.siteName}</p>
          <p>Расчёты: astro-v1 · matrix-22-v1</p>
        </div>
      </div>
    </footer>
  );
}
