import Link from "next/link";
import { Logo } from "./Logo";
import type { Settings } from "@/lib/types";
import { LockIcon } from "@/components/icons";

export function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  const { contacts, site } = settings;

  return (
    <footer className="border-t border-[var(--line)] bg-[rgba(255,255,255,0.55)]">
      <div className="container grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:py-16">
        <div className="max-w-sm">
          <Logo text={site.logoText} />
          <p className="mt-4 text-[0.92rem] leading-relaxed text-[var(--ink-soft)]">{site.description}</p>
          <p className="mt-5 text-[0.8rem] leading-relaxed text-[var(--ink-faint)]">
            Расчёты выполняются по открытым астрономическим данным и опубликованной формуле Матрицы судьбы.
            Материалы сервиса носят информационно-развлекательный характер и не заменяют консультацию врача,
            юриста или финансового специалиста.
          </p>
        </div>

        <nav aria-label="Разделы сайта" className="text-[0.92rem]">
          <h2 className="mb-3 font-[family-name:var(--font-sans)] text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Разделы
          </h2>
          <ul className="grid gap-2">
            <li><Link className="text-[var(--ink)] hover:text-[var(--ocean)]" href="/astrology">Астрология</Link></li>
            <li><Link className="text-[var(--ink)] hover:text-[var(--ocean)]" href="/matrix">Матрица судьбы</Link></li>
            <li><Link className="text-[var(--ink)] hover:text-[var(--ocean)]" href="/full-reading">Полный разбор</Link></li>
            <li><Link className="text-[var(--ink)] hover:text-[var(--ocean)]" href="/#how">Как это работает</Link></li>
            <li><Link className="text-[var(--ink)] hover:text-[var(--ocean)]" href="/#faq">Частые вопросы</Link></li>
          </ul>
        </nav>

        <div className="text-[0.92rem]">
          <h2 className="mb-3 font-[family-name:var(--font-sans)] text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Контакты
          </h2>
          <ul className="grid gap-2">
            {contacts.email ? (
              <li>
                <a className="text-[var(--ink)] hover:text-[var(--ocean)]" href={`mailto:${contacts.email}`}>
                  {contacts.email}
                </a>
              </li>
            ) : null}
            {contacts.telegram ? (
              <li>
                <a className="text-[var(--ink)] hover:text-[var(--ocean)]" href={contacts.telegram} rel="noopener noreferrer nofollow" target="_blank">
                  Telegram
                </a>
              </li>
            ) : null}
            {contacts.max ? (
              <li>
                <a className="text-[var(--ink)] hover:text-[var(--ocean)]" href={contacts.max} rel="noopener noreferrer nofollow" target="_blank">
                  MAX
                </a>
              </li>
            ) : null}
            {contacts.phone ? (
              <li><a className="text-[var(--ink)] hover:text-[var(--ocean)]" href={`tel:${contacts.phone.replace(/\s/g, "")}`}>{contacts.phone}</a></li>
            ) : null}
          </ul>

          <h2 className="mt-6 mb-3 font-[family-name:var(--font-sans)] text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Документы
          </h2>
          <ul className="grid gap-2">
            <li><Link className="text-[var(--ink)] hover:text-[var(--ocean)]" href="/privacy">Политика конфиденциальности</Link></li>
            <li><Link className="text-[var(--ink)] hover:text-[var(--ocean)]" href="/terms">Условия использования</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--line)]">
        <div className="container flex flex-col-reverse items-start justify-between gap-4 py-5 text-[0.8rem] text-[var(--ink-faint)] sm:flex-row sm:items-center">
          <p>© {year} {site.name}. Все права защищены.</p>
          <Link
            href="/specialist/login"
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[var(--ink-faint)] transition-colors hover:text-[var(--ocean)]"
          >
            <LockIcon className="h-3.5 w-3.5" />
            Вход для специалиста
          </Link>
        </div>
      </div>
    </footer>
  );
}
