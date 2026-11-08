import { useMemo } from "react";

import type { MatrixChart } from "@/lib/matrix/engine";
import { CHAKRA_VERSION, chakraColor, computeChakras } from "@/lib/matrix/chakras";
import { SparkleIcon } from "@/components/icons";

/**
 * Значения семи чакр по схеме человека.
 *
 * Главное — цветная таблица как в классических разборах: сверху сахасрара,
 * снизу муладхара, каждая строка в цвете своей чакры. Ниже — пояснения:
 * сфера, сильная и напряжённая черта, формула расчёта.
 *
 * Формулы зафиксированы версией `chakra-22-v1` — об этом сказано в подписи,
 * потому что в школе есть и другие варианты расчёта.
 */
export function ChakraResult({ chart, compact = false }: { chart: MatrixChart; compact?: boolean }) {
  const chakras = useMemo(() => computeChakras(chart), [chart]);
  /* В таблице читаем сверху вниз: сахасрара → муладхара, как на схемах. */
  const topDown = useMemo(() => [...chakras].reverse(), [chakras]);

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/70">
        <table className="w-full border-collapse text-left text-[0.86rem]">
          <caption className="px-3 py-2 text-left text-[0.74rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Чакры по дате рождения
          </caption>
          <thead>
            <tr className="bg-[rgba(255,255,255,0.85)] text-[0.7rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              <th scope="col" className="px-3 py-2 font-semibold">
                Название чакры
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Энергия
              </th>
              <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">
                Сфера
              </th>
            </tr>
          </thead>
          <tbody>
            {topDown.map((chakra) => {
              const color = chakraColor(chakra.id);
              return (
                <tr key={chakra.id} className="border-t border-[var(--line)]">
                  <th scope="row" className="px-3 py-2 text-left font-semibold" style={{ background: color.fill, color: color.ink }}>
                    {chakra.number}. {chakra.sanskrit}
                  </th>
                  <td
                    className="whitespace-nowrap px-3 py-2 font-semibold"
                    style={{ background: color.fill, color: color.ink, opacity: 0.94 }}
                  >
                    {chakra.arcanum}
                  </td>
                  <td className="hidden px-3 py-2 text-[var(--ink)] sm:table-cell">{chakra.sphere}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {compact ? null : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {chakras.map((chakra) => {
            const color = chakraColor(chakra.id);
            return (
              <li
                key={chakra.id}
                className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/75 p-3"
                style={{ borderLeft: `4px solid ${color.fill}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[0.78rem] font-semibold uppercase tracking-[0.1em]" style={{ color: color.fill }}>
                      {chakra.number} · {chakra.sanskrit}
                    </p>
                    <p className="mt-0.5 text-[0.78rem] text-[var(--ink-soft)]">{chakra.sphere}</p>
                  </div>
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[1.05rem] font-semibold"
                    style={{ background: color.fill, color: color.ink }}
                  >
                    {chakra.arcanum}
                  </span>
                </div>

                <p className="mt-2 text-[0.86rem] leading-snug text-[var(--ink)]">
                  <span className="font-semibold">Энергия: </span>
                  {chakra.label}
                </p>
                {chakra.strength ? (
                  <p className="mt-1 flex gap-1.5 text-[0.82rem] leading-snug text-[var(--ink)]">
                    <SparkleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: color.fill }} />
                    <span>{chakra.strength}</span>
                  </p>
                ) : null}
                {chakra.risk ? (
                  <p className="mt-1 text-[0.82rem] leading-snug text-[var(--ink-soft)]">
                    <span className="font-semibold text-[#8a6a5a]">Зона внимания: </span>
                    {chakra.risk}
                  </p>
                ) : null}

                <p className="mt-1.5 text-[0.72rem] text-[var(--ink-faint)]">Как считали: {chakra.formula}</p>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[0.75rem] leading-relaxed text-[var(--ink-faint)]">
        Версия расчёта чакр — <code>{CHAKRA_VERSION}</code>: цепочка от верхнего угла, центра и нижнего угла схемы.
        В школе есть и другие формулы чакр, поэтому числа здесь — один зафиксированный вариант, а не единственно
        верный. Значения — символические ориентиры, а не медицинские показатели.
      </p>
    </div>
  );
}
