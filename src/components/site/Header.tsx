"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { CloseIcon } from "@/components/icons";

const NAV = [
  { href: "/astrology", label: "Астрология" },
  { href: "/matrix", label: "Матрица судьбы" },
  { href: "/#how", label: "Как это работает" },
  { href: "/#faq", label: "Вопросы" },
];

export function Header({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => !href.includes("#") && pathname === href;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[var(--line)] bg-[rgba(246,240,236,0.82)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
      style={{ height: "var(--header-h)" }}
    >
      <div className="container flex h-full items-center justify-between gap-4">
        <Logo text={siteName} />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-[0.9rem] font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-white/70 text-[var(--ocean)]"
                  : "text-[var(--ink)] hover:bg-white/60 hover:text-[var(--ocean)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/astrology" className="btn btn--primary btn--sm hidden sm:inline-flex">
            Рассчитать карту
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line-strong)] bg-white/80 text-[var(--ocean)] md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuGlyph />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={`absolute inset-x-0 top-[var(--header-h)] origin-top border-b border-[var(--line)] bg-[rgba(249,245,242,0.97)] backdrop-blur-xl transition-all duration-300 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <nav className="container flex flex-col gap-1 py-3" aria-label="Мобильная навигация">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-3 text-[1rem] font-medium text-[var(--ocean)] hover:bg-white/80"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/full-reading" className="rounded-xl px-3 py-3 text-[1rem] font-medium text-[var(--ocean)] hover:bg-white/80">
            Полный разбор
          </Link>
          <Link href="/astrology" className="btn btn--primary mt-2" onClick={() => setOpen(false)}>
            Рассчитать карту
          </Link>
        </nav>
      </div>
    </header>
  );
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M4 8h16M4 16h16" />
    </svg>
  );
}
