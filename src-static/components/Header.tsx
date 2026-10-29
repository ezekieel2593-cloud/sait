import { useEffect, useState } from "react";
import { getConfig } from "../config";
import { CloseIcon, MenuIcon } from "./icons";

/** Шапка статической версии: обычные ссылки на .html, работает с любого хостинга. */
export function Header({ active }: { active?: string }) {
  const config = getConfig();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links = [
    { href: "astrology.html", label: "Астрология" },
    { href: "matrix.html", label: "Матрица судьбы" },
    { href: "full-reading.html", label: "Полный разбор" },
    { href: "index.html#faq", label: "Вопросы" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(246,240,236,0.86)] backdrop-blur">
      <div className="container flex h-[68px] items-center justify-between gap-4">
        <a href="index.html" className="flex items-center gap-2.5" aria-label={`${config.siteName} — на главную`}>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line-gold)] bg-white/70">
            <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
              <circle cx="16" cy="16" r="10.5" fill="none" stroke="#C9A777" strokeWidth="1.2" />
              <circle cx="16" cy="16" r="6.5" fill="url(#pearlGrad)" stroke="#6FA8AE" strokeWidth="0.8" />
              <defs>
                <linearGradient id="pearlGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#BFE3E6" />
                  <stop offset="1" stopColor="#DCC5D9" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="brand-name">{config.logoText}</span>
            <span className="mt-1 hidden lg:block">
              <span className="brand-sub">{config.brandTagline}</span>
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-2 text-[0.9rem] transition-colors hover:text-[var(--ocean)] ${
                active === link.href ? "text-[var(--ocean)]" : "text-[var(--ink)]"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Кабинет есть только там, где включён серверный приём заявок (PHP). */}
          {config.api?.enabled ? (
            <a href="cabinet/" className="btn btn--secondary btn--sm hidden md:inline-flex" title="Кабинет специалиста">
              Войти
            </a>
          ) : null}
          <a href="astrology.html" className="btn btn--primary btn--sm hidden md:inline-flex">
            Рассчитать карту
          </a>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line-strong)] bg-white/80 text-[var(--ocean)] lg:hidden"
            aria-expanded={open}
            aria-controls="static-mobile-nav"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="static-mobile-nav" className="border-t border-[var(--line)] bg-[rgba(250,246,243,0.98)] lg:hidden">
          <nav className="container flex flex-col gap-1 py-3" aria-label="Мобильная навигация">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-[1rem] font-medium text-[var(--ocean)] hover:bg-white/80"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a href="matrix.html" className="btn btn--primary mt-2" onClick={() => setOpen(false)}>
              Открыть Матрицу судьбы
            </a>
            {config.api?.enabled ? (
              <a
                href="cabinet/"
                className="btn btn--secondary"
                onClick={() => setOpen(false)}
              >
                Войти в кабинет
              </a>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
