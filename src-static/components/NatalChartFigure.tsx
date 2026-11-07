import { useCallback, useEffect, useMemo, useState } from "react";

import { NatalWheel, NatalWheelLegend } from "@/components/charts/NatalWheel";
import type { NatalChart } from "@/lib/astronomy/engine";
import { getEntry } from "@/lib/knowledge/queries";

import { ZoomIcon } from "./icons-extra";
import { revealSection } from "./section-open";

/**
 * Большая натальная карта с управлением: включение слоёв, выбор планеты,
 * увеличение на весь экран.
 *
 * Клик по планете (или строке таблицы справа) подсвечивает её аспекты на карте
 * и открывает карточку с положением, достоинством и связями. Кнопка «Крупно»
 * раскрывает карту на весь экран — на телефоне это единственный способ
 * разглядеть градусы.
 */

type LayerKey = "aspects" | "houses" | "points";

export function NatalChartFigure({
  chart,
  caption,
}: {
  chart: NatalChart;
  caption?: string;
}) {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    aspects: true,
    houses: true,
    points: true,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const close = useCallback(() => setOpen(false), []);

  const openLarge = useCallback(() => {
    const width = typeof window === "undefined" ? 760 : window.innerWidth;
    const fit = width > 0 ? (width - 48) / 760 : 1;
    setZoom(Math.max(1, Math.min(3, Math.round(fit * 10) / 10)));
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

  const toggle = (key: LayerKey) => setLayers((value) => ({ ...value, [key]: !value[key] }));

  const rows = useMemo(
    () => [
      ...chart.positions.map((position) => ({
        key: position.key as string,
        name: position.name,
        symbol: position.symbol,
        formatted: position.formatted,
        house: position.house,
        retrograde: position.retrograde,
        kind: "planet" as const,
      })),
      ...chart.points.map((point) => ({
        key: point.key,
        name: point.name,
        symbol: point.symbol,
        formatted: point.formatted,
        house: point.house,
        retrograde: point.retrograde,
        kind: "point" as const,
      })),
      ...(chart.ascendant
        ? [
            {
              key: "ascendant",
              name: "Асцендент",
              symbol: "ASC",
              formatted: chart.ascendant.formatted,
              house: 1 as number | null,
              retrograde: false,
              kind: "axis" as const,
            },
          ]
        : []),
      {
        key: "midheaven",
        name: "Середина неба",
        symbol: "MC",
        formatted: chart.midheaven.formatted,
        house: 10 as number | null,
        retrograde: false,
        kind: "axis" as const,
      },
    ],
    [chart]
  );

  const selectedRow = rows.find((row) => row.key === selected) ?? null;
  // Текстовая подсказка к выбранной планете — из той же базы знаний, что и разбор.
  const selectedEntry = selectedRow?.kind === "planet" ? getEntry("planet", selectedRow.key) : undefined;
  const selectedPoint = chart.points.find((point) => point.key === selected) ?? null;
  const selectedDignity = chart.dignities.find((item) => item.key === selected) ?? null;
  const selectedAspects = useMemo(
    () => chart.aspects.filter((aspect) => aspect.a === selected || aspect.b === selected),
    [chart, selected]
  );

  const wheelProps = {
    showAspects: layers.aspects,
    showHouses: layers.houses,
    showPoints: layers.points,
    highlight: selected,
    onSelect: (key: string) => setSelected((current) => (current === key ? null : key)),
  };

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {(
          [
            { key: "aspects", label: "Аспекты" },
            { key: "houses", label: "Дома" },
            { key: "points", label: "Точки" },
          ] as { key: LayerKey; label: string }[]
        ).map((item) => {
          const active = layers[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-[0.8rem] transition-colors ${
                active
                  ? "border-[rgba(63,135,145,0.55)] bg-[rgba(184,221,224,0.32)] text-[#1d4a60]"
                  : "border-[var(--line)] bg-white text-[var(--ink-faint)]"
              }`}
            >
              {active ? "✓ " : ""}
              {item.label}
            </button>
          );
        })}
        <button type="button" className="btn btn--secondary btn--sm" onClick={openLarge}>
          <ZoomIcon className="h-4 w-4" />
          Увеличить карту
        </button>
      </div>

      <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[linear-gradient(180deg,#fffdfa,#fbf3ec)] p-1.5">
          <NatalWheel chart={chart} idPrefix="wheel-main" {...wheelProps} />
        </div>

        <div className="grid gap-2">
          <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line)] bg-white">
            <p className="border-b border-[var(--line)] px-2.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
              Положения планет и точек
            </p>
            <ul className="max-h-[26rem] overflow-y-auto overflow-x-hidden">
              {rows.map((row) => {
                const active = selected === row.key;
                if (row.kind === "axis") {
                  return (
                    <li
                      key={row.key}
                      className="flex items-baseline justify-between gap-2 border-b border-[var(--line)] bg-[rgba(37,61,75,0.03)] px-2.5 py-1 text-[0.82rem] last:border-0"
                    >
                      <span className="flex min-w-0 items-baseline gap-1.5 text-[var(--ocean)]">
                        <span className="text-[0.66rem] uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                          {row.symbol}
                        </span>
                        <span className="truncate">{row.name}</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-[0.78rem] text-[var(--ink-soft)]">{row.formatted}</span>
                    </li>
                  );
                }
                return (
                  <li key={row.key}>
                    <button
                      type="button"
                      onClick={() => setSelected(active ? null : row.key)}
                      className={`flex w-full items-baseline justify-between gap-2 border-b border-[var(--line)] px-2.5 py-1 text-left text-[0.82rem] transition-colors last:border-0 ${
                        active ? "bg-[rgba(184,221,224,0.28)]" : "hover:bg-[rgba(184,221,224,0.12)]"
                      }`}
                      aria-pressed={active}
                    >
                      <span className="flex min-w-0 items-baseline gap-1.5 text-[var(--ocean)]">
                        <span aria-hidden="true">{row.symbol}</span>
                        <span className="truncate">{row.name}</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-[0.78rem] text-[var(--ink-soft)]">
                        {row.formatted}
                        {row.retrograde ? " R" : ""}
                        {row.house ? ` · ${row.house}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedRow ? (
            <div className="rounded-[var(--radius-sm)] border border-[rgba(63,135,145,0.35)] bg-[rgba(244,251,251,0.7)] p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[0.92rem] font-semibold text-[var(--ocean)]">
                  {selectedRow.symbol} {selectedRow.name}
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-[0.76rem] text-[var(--ink-faint)] underline decoration-dotted"
                >
                  сбросить
                </button>
              </div>
              <p className="mt-1 text-[0.82rem] text-[var(--ink)]">
                {selectedRow.formatted}
                {selectedRow.retrograde ? " · попятное движение" : ""}
                {selectedRow.house ? ` · ${selectedRow.house}-й дом` : ""}
              </p>

              {selectedEntry ? (
                <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
                  <span className="text-[var(--ocean)]">За что отвечает:</span>{" "}
                  {selectedEntry.details.theme ?? selectedEntry.summary}
                </p>
              ) : null}

              {selectedDignity ? (
                <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
                  <span className="font-semibold text-[var(--ocean)]">{selectedDignity.label}</span> ·{" "}
                  {selectedDignity.note}
                </p>
              ) : null}

              {selectedPoint ? (
                <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
                  <span className="text-[var(--ocean)]">Как считается:</span> {selectedPoint.formula}
                </p>
              ) : null}

              {selectedAspects.length ? (
                <ul className="mt-2 grid gap-0.5 text-[0.78rem] text-[var(--ink-soft)]">
                  {selectedAspects.map((aspect) => {
                    const otherName = aspect.a === selectedRow.key ? aspect.bName : aspect.aName;
                    return (
                      <li key={`${aspect.a}-${aspect.b}`} className="flex flex-wrap justify-between gap-2">
                        <span>
                          {aspect.symbol} {aspect.name} — {otherName}
                        </span>
                        <span className="text-[var(--ink-faint)]">орб {aspect.orb.toFixed(1)}°</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1.5 text-[0.78rem] text-[var(--ink-soft)]">Точных аспектов нет.</p>
              )}

              <button
                type="button"
                className="mt-2 text-[0.8rem] text-[var(--turquoise-deep)] underline decoration-dotted"
                onClick={() => {
                  const id = `sec-${selectedRow.kind === "planet" ? "planet" : "point"}-${selectedRow.key}`;
                  if (document.getElementById(id)) revealSection(id);
                  else revealSection("r-locked");
                }}
              >
                {selectedRow.kind === "planet" ? "Читать в расшифровке ↓" : "Читать про эту точку ↓"}
              </button>
            </div>
          ) : (
            <p className="text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">
              Нажмите на планету на карте или строку в таблице: подсветятся её аспекты и появится пояснение.
            </p>
          )}

          <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-white p-2.5">
            <NatalWheelLegend />
          </div>
        </div>
      </div>

      {caption ? (
        <figcaption className="px-1 pt-2 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">{caption}</figcaption>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-[rgba(26,34,40,0.78)] p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Натальная карта крупно"
          onClick={close}
        >
          <div
            className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[#fffdfa] px-3 py-2"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[0.9rem] font-semibold text-[var(--ocean)]">Натальная карта крупно</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setZoom((value) => Math.max(1, Math.round((value - 0.25) * 100) / 100))}
                aria-label="Уменьшить карту"
              >
                −
              </button>
              <span className="min-w-[3.5rem] text-center text-[0.82rem] text-[var(--ink-soft)]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setZoom((value) => Math.min(3, Math.round((value + 0.25) * 100) / 100))}
                aria-label="Увеличить карту"
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
            <div style={{ width: `${760 * zoom}px`, maxWidth: "100%" }}>
              <NatalWheel chart={chart} idPrefix="wheel-zoom" {...wheelProps} />
            </div>
          </div>

          <p className="mx-auto mt-2 max-w-[1500px] text-center text-[0.76rem] text-[rgba(255,255,255,0.75)]">
            Esc или клик по фону закрывают окно. Планеты можно выбирать и здесь — подсветка остаётся общей с картой на
            странице.
          </p>
        </div>
      ) : null}
    </figure>
  );
}
