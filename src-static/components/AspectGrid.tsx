import { useState } from "react";
import type { NatalChart } from "@/lib/astronomy/engine";

/**
 * Аспектная сетка: планеты по вертикали и горизонтали, в клетках — символы
 * аспектов. Такую таблицу используют профессиональные программы: она
 * показывает всю структуру связей за один взгляд.
 *
 * В клетке — символ и орб в градусах; цвет символа говорит о характере
 * аспекта (гармоничный, напряжённый, нейтральный).
 */

const NATURE_COLOR: Record<string, string> = {
  harmonious: "#3b7b83",
  tense: "#a86a5a",
  neutral: "#6a5b62",
};

export function AspectGrid({ chart }: { chart: NatalChart }) {
  const [filter, setFilter] = useState<"all" | "harmonious" | "tense">("all");
  if (chart.aspects.length === 0) {
    return (
      <p className="text-[0.86rem] text-[var(--ink-soft)]">
        Точных аспектов в допустимых орбисах нет.
      </p>
    );
  }

  const positions = chart.positions;
  const cell = (aKey: string, bKey: string) => {
    if (aKey === bKey)
      return { symbol: "", orb: null as number | null, nature: "" };
    const hit = chart.aspects.find(
      (aspect) =>
        (aspect.a === aKey && aspect.b === bKey) ||
        (aspect.a === bKey && aspect.b === aKey),
    );
    return hit
      ? { symbol: hit.symbol, orb: hit.orb, nature: hit.nature }
      : { symbol: "", orb: null, nature: "" };
  };

  return (
    <div>
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Фильтр аспектов"
      >
        {[
          { id: "all", label: "Все" },
          { id: "harmonious", label: "Гармоничные" },
          { id: "tense", label: "Напряжённые" },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => setFilter(option.id as typeof filter)}
            className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-[0.75rem] aria-pressed:bg-[var(--ocean)] aria-pressed:text-white"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[0.78rem]">
          <caption className="sr-only">
            Аспектная сетка: планеты и аспекты между ними
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="p-1 text-left font-semibold text-[var(--ink-faint)]"
              >
                <span className="sr-only">Планета</span>
              </th>
              {positions.map((position) => (
                <th
                  key={position.key}
                  scope="col"
                  className="p-1 text-center font-semibold text-[var(--turquoise-deep)]"
                >
                  <span aria-hidden="true">{position.symbol}</span>
                  <span className="sr-only">{position.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((row) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="whitespace-nowrap p-1 text-left font-medium text-[var(--ocean)]"
                >
                  <span aria-hidden="true">{row.symbol}</span> {row.name}
                </th>
                {positions.map((column) => {
                  const hit = cell(row.key, column.key);
                  const visible = filter === "all" || hit.nature === filter;
                  return (
                    <td
                      key={column.key}
                      className="border border-[var(--line)] p-1 text-center"
                      style={{
                        color: NATURE_COLOR[hit.nature] ?? "var(--ink-faint)",
                      }}
                      title={
                        hit.symbol
                          ? `${row.name} — ${column.name}: орб ${hit.orb?.toFixed(1)}°`
                          : `${row.name} — ${column.name}: аспекта нет`
                      }
                    >
                      {visible ? hit.symbol : ""}
                      {visible && hit.orb !== null ? (
                        <span className="ml-0.5 text-[0.66rem] text-[var(--ink-faint)]">
                          {hit.orb.toFixed(0)}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
