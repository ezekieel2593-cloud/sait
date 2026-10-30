import { useCallback, useEffect, useRef, useState } from "react";
import type { Direction } from "@/lib/types";
import { LeadForm } from "./LeadForm";
import { useAdmin } from "../admin";

/**
 * Мягкое приглашение через некоторое время на сайте.
 *
 * Задача — не перехватить человека сразу, а дать ему спокойно посмотреть
 * страницу и предложить разбор со специалистом.
 *
 * Правила, чтобы окно не мешало:
 *  - появляется каждые 3 минуты нахождения на сайте (`invite.delayMs`);
 *  - после отправки заявки из окна больше не показывается;
 *  - не показывается на юридических страницах;
 *  - закрывается крестиком, клавишей Esc и кликом по фону;
 *  - не перекрывает окно тому, кто в этот момент заполняет форму;
 *  - таймер запускается только в браузере.
 */

const DEFAULT_DELAY_MS = 180_000;

/**
 * Задержку можно переопределить в config.js (`invite.delayMs`) —
 * например, 300000 для показа раз в 5 минут или 0 для проверки.
 * Отключить окно целиком: `invite.enabled: false`.
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
  // Владельцу окно с приглашением не нужно: он и так знает про услуги.
  const admin = useAdmin();
  const closeRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef(0);
  /** Заявка из окна отправлена — больше не показываем. */
  const sentRef = useRef(false);
  const copy = COPY[page] ?? COPY.home!;

  /** Открыть сейчас или, если человек печатает, повторить попытку позже. */
  const openWhenFree = useCallback((attempt = 0) => {
    const active = document.activeElement;
    const busy =
      active instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
    if (busy && attempt < 3) {
      timerRef.current = window.setTimeout(() => openWhenFree(attempt + 1), 20_000);
      return;
    }
    setOpen(true);
  }, []);

  const scheduleNext = useCallback(
    (delayMs: number) => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (sentRef.current) return;
        openWhenFree();
      }, delayMs);
    },
    [openWhenFree],
  );

  useEffect(() => {
    if (admin) return;
    if (page === "privacy" || page === "terms") return;
    if (typeof window === "undefined") return;
    const settings = inviteSettings();
    if (!settings.enabled) return;
    // Первое окно — через delayMs, дальше — заново после каждого закрытия.
    scheduleNext(settings.delayMs);
    return () => window.clearTimeout(timerRef.current);
  }, [page, scheduleNext, admin]);

  /** Закрыть окно и назначить следующее через тот же интервал. */
  const close = () => {
    setOpen(false);
    if (!sentRef.current) scheduleNext(inviteSettings().delayMs);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
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

  if (!open || admin) return null;

  const handleSent = () => {
    sentRef.current = true;
    window.clearTimeout(timerRef.current);
  };

  return (
    <div className="invite" role="presentation" onClick={close}>
      <div
        className="invite__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="invite__close" aria-label="Закрыть окно" onClick={close}>
          ✕
        </button>

        <p className="eyebrow">Жемчужина · короткий вопрос</p>
        <h2 id="invite-title" className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] leading-snug text-[var(--ocean)]">
          {copy.question}
        </h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--ink)]">{copy.text}</p>

        <div className="mt-4">
          <LeadForm direction={copy.direction} summary="Заявка из всплывающего окна" compact onSent={handleSent} />
        </div>

        <button type="button" className="invite__later" onClick={close}>
          Позже, сначала посмотрю сайт
        </button>
      </div>
    </div>
  );
}
