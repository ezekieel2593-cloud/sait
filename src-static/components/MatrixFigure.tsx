import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { MatrixChart } from "@/lib/matrix/engine";
import { MatrixDiagram } from "@/components/charts/MatrixDiagram";

import { ZoomIcon } from "./icons-extra";

/**
 * Схема матрицы с кнопкой «Открыть схему крупно».
 *
 * В браузерной версии мелкие цифры по краю читаются плохо, поэтому схему можно
 * раскрыть на весь экран и приблизить: масштаб меняется кнопками «−» и «+»,
 * закрытие — по Esc, клику по фону или кнопке «Закрыть».
 */

const BASE_WIDTH = 880;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function MatrixFigure({
  chart,
  caption,
}: {
  chart: MatrixChart;
  /** Подпись под схемой. */
  caption?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const close = useCallback(() => setOpen(false), []);

  const openLarge = useCallback(() => {
    // На телефоне схема сразу открывается по ширине экрана, на ПК — крупнее оригинала.
    const width = typeof window === "undefined" ? BASE_WIDTH : window.innerWidth;
    const fit = width > 0 ? (width - 48) / BASE_WIDTH : 1;
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(fit * 10) / 10)));
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <figure className="m-0 rounded-[var(--radius-md)] border border-[var(--line)] bg-[linear-gradient(180deg,#fffdfa,#fbf3ec)] p-2">
      <button
        type="button"
        onClick={openLarge}
        className="block w-full cursor-zoom-in rounded-[var(--radius-sm)] p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--turquoise-deep)]"
        aria-label="Открыть схему матрицы крупно"
        title="Открыть схему крупно"
      >
        <MatrixDiagram chart={chart} />
      </button>

      <div className="flex flex-wrap items-center justify-center gap-2 px-2 pt-2">
        <button type="button" className="btn btn--secondary btn--sm" onClick={openLarge}>
          <ZoomIcon className="h-4 w-4" />
          Открыть схему крупно
        </button>
      </div>

      {caption ? (
        <figcaption className="px-2 pb-1 pt-2 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">{caption}</figcaption>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-[rgba(26,34,40,0.78)] p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Схема матрицы крупно"
          onClick={close}
        >
          <div
            className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[#fffdfa] px-3 py-2"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[0.9rem] font-semibold text-[var(--ocean)]">Схема матрицы крупно</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setZoom((value) => Math.max(MIN_ZOOM, Math.round((value - 0.25) * 100) / 100))}
                aria-label="Уменьшить схему"
              >
                −
              </button>
              <span className="min-w-[3.5rem] text-center text-[0.82rem] text-[var(--ink-soft)]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setZoom((value) => Math.min(MAX_ZOOM, Math.round((value + 0.25) * 100) / 100))}
                aria-label="Увеличить схему"
              >
                +
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setZoom(1)}>
                Сбросить
              </button>
              <button type="button" className="btn btn--primary btn--sm" onClick={close}>
                Закрыть
              </button>
            </div>
          </div>

          <div
            className="mx-auto mt-3 w-full max-w-[1500px] flex-1 overflow-auto rounded-[var(--radius-md)] bg-[#fffdfa] p-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ width: `${BASE_WIDTH * zoom}px`, maxWidth: "100%" }}>
              <MatrixDiagram chart={chart} compact={false} idPrefix="mx-zoom" />
            </div>
          </div>

          <p className="mx-auto mt-2 max-w-[1500px] text-center text-[0.76rem] text-[rgba(255,255,255,0.75)]">
            Прокрутите схему, чтобы увидеть край, — по кругу идут возраст и энергия каждого периода. Esc или клик по
            фону закрывают окно.
          </p>
        </div>
      ) : null}
    </figure>
  );
}
