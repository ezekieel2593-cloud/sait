import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { MatrixChart, MatrixPoint } from "@/lib/matrix/engine";
import { MatrixDiagram } from "@/components/charts/MatrixDiagram";
import { getArcanumEntry, getPositionEntry } from "@/lib/knowledge/queries";

import { ZoomIcon } from "./icons-extra";
import { revealSection } from "./section-open";

/**
 * Схема матрицы: точки кликабельны, под схемой открывается описание выбранной
 * энергии — что это за позиция, как она посчитана и о чём говорит. Кнопка
 * «Читать в расшифровке» прокручивает к её карточке, «Увеличить схему» —
 * раскрывает схему на весь экран.
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
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<number | null>(null);

  const select = (key: string) => {
    setSelected((current) => (current === key ? null : key));
    setSelectedAge(null);
  };
  const selectAge = (age: number) => {
    setSelectedAge((current) => (current === age ? null : age));
    setSelected(null);
  };

  const point: MatrixPoint | null =
    selected === "year" ? chart.yearEnergy : selected ? chart.byKey[selected] ?? null : null;
  const lifePoint = selectedAge === null ? null : chart.lifeLine.find((entry) => entry.age === selectedAge) ?? null;
  const position = point ? getPositionEntry(point.key) : undefined;
  const arcana = point ? getArcanumEntry(point.arcanum) : selectedAge !== null ? getArcanumEntry(lifePoint?.arcanum ?? 0) : undefined;

  const scrollToSection = () => {
    if (typeof document === "undefined" || !point) return;
    const own = `sec-point-${point.key}`;
    if (document.getElementById(own)) {
      revealSection(own);
      return;
    }
    revealSection("r-energies");
  };

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
      <div className="rounded-[var(--radius-sm)]">
        <MatrixDiagram
          chart={chart}
          selected={selected}
          onSelect={select}
          selectedAge={selectedAge}
          onSelectAge={selectAge}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 px-2 pt-2">
        <button type="button" className="btn btn--secondary btn--sm" onClick={openLarge}>
          <ZoomIcon className="h-4 w-4" />
          Увеличить схему
        </button>
        <p className="basis-full text-center text-[0.76rem] text-[var(--ink-soft)]">
          Нажмите на круг со схемой — откроется описание этой энергии.
        </p>
      </div>

      {point ? (
        <div className="mx-1 mt-2 rounded-[var(--radius-sm)] border border-[rgba(63,135,145,0.35)] bg-[rgba(244,251,251,0.75)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--turquoise-deep)]">
                {point.title}
                {selected === "year" ? ` · ${chart.yearEnergy.year} год` : ""}
              </p>
              <p className="mt-0.5 text-[1.05rem] font-semibold text-[var(--ocean)]">{point.arcanumTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[0.76rem] text-[var(--ink-faint)] underline decoration-dotted"
            >
              сбросить
            </button>
          </div>

          {position ? (
            <p className="mt-1.5 text-[0.84rem] leading-relaxed text-[var(--ink)]">{position.summary}</p>
          ) : null}
          {arcana ? (
            <p className="mt-1.5 text-[0.84rem] leading-relaxed text-[var(--ink-soft)]">{arcana.summary}</p>
          ) : null}
          <p className="mt-1.5 text-[0.78rem] text-[var(--ink-faint)]">Формула: {point.formula}</p>

          {arcana?.positive?.length ? (
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
              <span className="text-[#2f6f78]">В плюсе:</span> {arcana.positive.slice(0, 2).join(" ")}
            </p>
          ) : null}
          {arcana?.shadow?.length ? (
            <p className="mt-1 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
              <span className="text-[#a86a5a]">В минусе:</span> {arcana.shadow.slice(0, 2).join(" ")}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn btn--primary btn--sm" onClick={scrollToSection}>
              Читать в расшифровке ↓
            </button>
            <a
              href="guide.html"
              className="btn btn--secondary btn--sm"
              title="Гайд по 22 энергиям"
            >
              Что это за энергия
            </a>
          </div>
        </div>
      ) : lifePoint ? (
        <div className="mx-1 mt-2 rounded-[var(--radius-sm)] border border-[rgba(63,135,145,0.35)] bg-[rgba(244,251,251,0.75)] p-3">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--turquoise-deep)]">
            Линия жизни · {selectedAge} лет
          </p>
          <p className="mt-0.5 text-[1.05rem] font-semibold text-[var(--ocean)]">
            {lifePoint.arcanum}-я энергия периода
          </p>
          {arcana ? <p className="mt-1.5 text-[0.84rem] leading-relaxed text-[var(--ink-soft)]">{arcana.summary}</p> : null}
          <p className="mt-1.5 text-[0.78rem] text-[var(--ink-faint)]">Формула: {lifePoint.formula}</p>
          <button
            type="button"
            className="mt-2 text-[0.8rem] text-[var(--turquoise-deep)] underline decoration-dotted"
            onClick={() => setSelectedAge(null)}
          >
            сбросить
          </button>
        </div>
      ) : null}

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
              <MatrixDiagram
                chart={chart}
                compact={false}
                idPrefix="mx-zoom"
                selected={selected}
                onSelect={select}
                selectedAge={selectedAge}
                onSelectAge={selectAge}
              />
            </div>
          </div>

          <p className="mx-auto mt-2 max-w-[1500px] text-center text-[0.76rem] text-[rgba(255,255,255,0.75)]">
            Прокрутите схему, чтобы увидеть край, — по кругу идут возраст и энергия каждого периода. Круги на схеме
            кликабельны: выберите энергию, чтобы прочитать описание. Esc или клик по фону закрывают окно.
          </p>
        </div>
      ) : null}
    </figure>
  );
}
