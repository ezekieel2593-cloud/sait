import { useEffect, useState } from "react";
import { getConfig } from "../config";
import { CloseIcon, MenuIcon } from "./icons";

const links = [
  { href: "astrology.html", label: "Астрология", symbol: "✧" },
  { href: "matrix.html", label: "Матрица судьбы", symbol: "◇" },
  { href: "store.html", label: "Витрина разборов" },
  { href: "forecast.html", label: "Прогноз на день" },
  { href: "blog.html", label: "Блог" },
  { href: "guide.html", label: "Гайд по энергиям" },
  { href: "chakras.html", label: "Чакры" },
  { href: "cabinet.html", label: "Личный кабинет" },
];

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
  return (
    <header className="portal-header">
      <div className="container portal-header__inner">
        <a
          href="index.html"
          className="portal-brand"
          aria-label={`${config.siteName} — главная`}
        >
          <span className="brand-seal" aria-hidden="true">
            <span>Ж</span>
          </span>
          <span>
            <strong>{config.logoText}</strong>
            <small>{config.brandTitle}</small>
          </span>
        </a>
        <nav className="portal-nav" aria-label="Основная навигация">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={active === link.href ? "page" : undefined}
            >
              {link.symbol && <span aria-hidden="true">{link.symbol} </span>}
              {link.label}
            </a>
          ))}
        </nav>
        <div className="portal-header__actions">
          {config.api?.enabled ? (
            <a className="portal-header__login" href="cabinet/index.php">
              Войти
            </a>
          ) : null}
          <a
            className="btn btn--primary btn--sm portal-header__cta"
            href="astrology.html"
          >
            Рассчитать карту
          </a>
          <button
            type="button"
            className="portal-menu-button"
            aria-expanded={open}
            aria-controls="portal-mobile-nav"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="portal-mobile-nav"
          className="portal-mobile-nav"
          aria-label="Мобильная навигация"
        >
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.symbol && <span aria-hidden="true">{link.symbol} </span>}
              {link.label}
            </a>
          ))}
          <a href="astrology.html" onClick={() => setOpen(false)}>
            Рассчитать натальную карту
          </a>
        </nav>
      )}
    </header>
  );
}
