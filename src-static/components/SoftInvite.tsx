import { useEffect, useRef, useState } from "react";
import type { Direction } from "@/lib/types";
import { LeadForm } from "./LeadForm";

/**
 * Мягкое приглашение через некоторое время на сайте.
 *
 * Задача — не перехватить человека сразу, а дать ему спокойно посмотреть
 * страницу и через полминуты предложить разбор со специалистом.
 *
 * Правила, чтобы окно не мешало:
 *  - появляется один раз за визит (sessionStorage);
 *  - не показывается на юридических страницах;
 *  - закрывается крестиком, клавишей Esc и кликом по фону;
 *  - таймер запускается только в браузере и не работает при prefers-reduced-motion.
 */

const KEY = "zhemchuzhina:invite-shown";
const DEFAULT_DELAY_MS = 40_000;

/**
 * Задержку можно переопределить в config.js (`invite.delayMs`) —
 * например, поставить 60 секунд или отключить окно (`invite.enabled: false`).
 */
function inviteSettings(): { enabled: boolean; delayMs: number } {
  const raw = (globalThis as unknown as { ASTRA_CONFIG?: { invite?: { enabled?: boolean; delayMs?: number } } })
    .ASTRA_CONFIG?.invite;
  return {
    enabled: raw?.enabled !== false,
    delayMs: typeof raw?.delayMs === "number" && raw.delayMs >= 0 ? raw.delayMs : DEFAULT_DELAY_MS,
  };
}

const COPY: Record<string, { question: string; text: string; direction: Direction }> = {
  matrix: {
    question: "А вы знали, что в вашей матрице уже посчитаны все 15 энергий?",
    text: "Открыто пока несколько. Если хотите разобрать свою схему целиком — оставьте заявку, и мы вернёмся с разбором именно ваших энергий.",
    direction: "matrix",
  },
  astrology: {
    question: "Что ваша карта говорит о вашем годе?",
    text: "Планеты в домах и точные аспекты показывают, где сила работает на вас. Оставьте заявку — разберём вашу карту целиком.",
    direction: "astrology",
  },
  home: {
    question: "Хотите узнать, что заложено в вашей дате рождения?",
    text: "Натальная карта и Матрица судьбы считаются по вашим данным. Оставьте заявку — подскажем, с чего начать именно вам.",
    direction: "astrology",
  },
  "full-reading": {
    question: "Остался один вопрос — с чего начать разбор?",
    text: "Напишите, что хотите прояснить: отношения, деньги, предназначение. Подскажем, какая методика ответит точнее.",
    direction: "astrology",
  },
};

export function SoftInvite({ page }: { page: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const copy = COPY[page] ?? COPY.home!;

  useEffect(() => {
    if (page === "privacy" || page === "terms") return;
    if (typeof window === "undefined") return;
    const settings = inviteSettings();
    if (!settings.enabled) return;
    try {
      if (window.sessionStorage.getItem(KEY) === "1") return;
    } catch {
      /* приватный режим: показываем окно без запоминания */
    }
    let timer = 0;
    let attempts = 0;

    const tryOpen = () => {
      // Не перекрываем окно тому, кто прямо сейчас заполняет форму.
      const active = document.activeElement;
      const busy =
        active instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
      if (busy && attempts < 3) {
        attempts += 1;
        timer = window.setTimeout(tryOpen, 20_000);
        return;
      }
      setOpen(true);
      try {
        window.sessionStorage.setItem(KEY, "1");
      } catch {
        /* ничего страшного */
      }
    };

    timer = window.setTimeout(tryOpen, settings.delayMs);
    return () => window.clearTimeout(timer);
  }, [page]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="invite" role="presentation" onClick={() => setOpen(false)}>
      <div
        className="invite__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="invite__close" aria-label="Закрыть окно" onClick={() => setOpen(false)}>
          ✕
        </button>

        <p className="eyebrow">Жемчужина · короткий вопрос</p>
        <h2 id="invite-title" className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] leading-snug text-[var(--ocean)]">
          {copy.question}
        </h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--ink)]">{copy.text}</p>

        <div className="mt-4">
          <LeadForm direction={copy.direction} summary="Заявка из всплывающего окна" compact />
        </div>

        <button type="button" className="invite__later" onClick={() => setOpen(false)}>
          Позже, сначала посмотрю сайт
        </button>
      </div>
    </div>
  );
}
