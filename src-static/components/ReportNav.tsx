import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Навигация по готовому разбору: липкая полоса с основными блоками и кнопка
 * «Содержание», которая раскрывает весь список разделов.
 *
 * Зачем: после расчёта на странице десятки карточек, и искать нужную прокруткой
 * неудобно. Полоса остаётся на экране, активный раздел подсвечивается, а
 * «Содержание» показывает сразу все названия с номерами и пометкой «закрыто».
 */

export interface ReportNavItem {
  /** id элемента на странице. */
  id: string;
  label: string;
  /** Короткая подпись-пояснение под названием. */
  hint?: string;
  /** Раздел доступен только в полном разборе. */
  locked?: boolean;
  /** Служебные разделы (технические таблицы) — не показываем в основной полосе. */
  secondary?: boolean;
}

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;
  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function ReportNav({ items, title = "Содержание разбора" }: { items: ReportNavItem[]; title?: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const primary = useMemo(() => items.filter((item) => !item.secondary), [items]);

  // Активный раздел: ближайший к верху экрана. IntersectionObserver может
  // отсутствовать (старый браузер) — тогда подсветка просто не включается.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 0.2, 1] }
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [items]);

  const go = useCallback((id: string) => {
    setOpen(false);
    scrollToId(id);
  }, []);

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-4 border-b border-[var(--line)] bg-[rgba(253,249,245,0.94)] px-1 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5" role="navigation" aria-label={title}>
          {primary.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={isActive ? "true" : undefined}
                className={`shrink-0 rounded-full border px-3 py-1 text-[0.8rem] transition-colors ${
                  isActive
                    ? "border-[rgba(63,135,145,0.6)] bg-[rgba(184,221,224,0.42)] text-[#1d4a60]"
                    : "border-[var(--line)] bg-white text-[var(--ink-soft)] hover:text-[var(--ocean)]"
                }`}
              >
                {item.locked ? "· " : ""}
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-[rgba(63,135,145,0.45)] bg-white px-3 py-1 text-[0.8rem] font-medium text-[#1d4a60]"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="report-nav-list"
        >
          {open ? "Свернуть" : "Все разделы"}
        </button>
      </div>

      {open ? (
        <div
          id="report-nav-list"
          className="mt-2 max-h-[60vh] overflow-auto rounded-[var(--radius-md)] border border-[var(--line)] bg-white p-2"
        >
          <p className="px-1 pb-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            {title}
          </p>
          <ol className="grid gap-0.5">
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(item.id)}
                  className="flex w-full items-baseline gap-2 rounded-[0.5rem] px-2 py-1.5 text-left text-[0.86rem] hover:bg-[rgba(184,221,224,0.18)]"
                >
                  <span className="w-5 shrink-0 text-right text-[0.72rem] text-[var(--ink-faint)]">{index + 1}.</span>
                  <span className="min-w-0 flex-1 text-[var(--ocean)]">
                    {item.label}
                    {item.hint ? <span className="ml-1 text-[0.76rem] text-[var(--ink-soft)]">— {item.hint}</span> : null}
                  </span>
                  {item.locked ? (
                    <span className="shrink-0 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--ink-faint)]">закрыто</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-1 border-t border-[var(--line)] pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="w-full rounded-[0.5rem] px-2 py-1.5 text-left text-[0.82rem] text-[var(--turquoise-deep)]"
            >
              ↑ Наверх страницы
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
