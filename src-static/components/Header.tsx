import { useEffect, useState } from "react";
import { getConfig } from "../config";
import { CloseIcon, MenuIcon } from "./icons";

/**
 * Меню мира: после выбора вселенной показываются только разделы этого
 * направления + кнопка переключения в соседний мир. Никакой путаницы.
 */
export type World = "astro" | "matrix" | "shared";

const WORLD_MENUS: Record<World, { href: string; label: string }[]> = {
  astro: [
    { href: "astrology.html", label: "Моя карта" },
    { href: "forecast.html", label: "Прогноз на сегодня" },
    { href: "store.html", label: "PDF-разборы" },
    { href: "cabinet.html", label: "Личный кабинет" },
  ],
  matrix: [
    { href: "matrix.html", label: "Расчёт Матрицы" },
    { href: "chakras.html", label: "Карта Чакр" },
    { href: "store.html", label: "PDF-разборы" },
    { href: "cabinet.html", label: "Личный кабинет" },
  ],
  shared: [
    { href: "astrology.html", label: "Астрология" },
    { href: "matrix.html", label: "Матрица судьбы" },
    { href: "store.html", label: "PDF-разборы" },
    { href: "cabinet.html", label: "Личный кабинет" },
  ],
};

const SWITCH: Record<Exclude<World, "shared">, { href: string; label: string }> = {
  astro: { href: "matrix.html", label: "❄️ Матрица судьбы" },
  matrix: { href: "astrology.html", label: "🌌 Астрология" },
};

export function Header({ active, world }: { active?: string; world: World }) {
  const config = getConfig();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links = WORLD_MENUS[world];
  const switcher = world === "shared" ? null : SWITCH[world];

  return (
    <header className="portal-header">
      <div className="container portal-header__inner">
        <a
          href="index.html"
          className="portal-brand"
          aria-label={`${config.siteName} — на главную`}
        >
          <span className="brand-seal" aria-hidden="true">
            <span>Ж</span>
          </span>
          <span>
            <strong>{config.logoText}</strong>
            <small>{config.brandTitle}</small>
          </span>
        </a>
        <nav className="portal-nav" aria-label="Меню раздела">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={active === link.href ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
          {switcher ? (
            <a href={switcher.href} className="portal-switch">
              {switcher.label}
            </a>
          ) : null}
        </nav>
        <div className="portal-header__actions">
          <a className="portal-header__cta" href="cabinet.html">
            Войти
          </a>
          <button
            type="button"
            className="portal-menu-button"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="portal-mobile-nav" aria-label="Меню раздела (мобильное)">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          {switcher ? (
            <a href={switcher.href} className="portal-switch">
              {switcher.label}
            </a>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
