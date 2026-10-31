import { useMemo } from "react";

import type { MatrixChart } from "@/lib/matrix/engine";
import { CHAKRA_VERSION, computeChakras } from "@/lib/matrix/chakras";
import { SparkleIcon } from "@/components/icons";

/**
 * Значения семи чакр по схеме человека.
 *
 * Показываем номер чакры, её значение (энергию), формулу и по одной сильной
 * и одной напряжённой черте из базы знаний. Формулы зафиксированы версией
 * `chakra-22-v1` — об этом сказано в подписи, потому что в школе есть и другие
 * варианты расчёта.
 */
export function ChakraResult({ chart, compact = false }: { chart: MatrixChart; compact?: boolean }) {
  const chakras = useMemo(() => computeChakras(chart), [chart]);

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {chakras.map((chakra) => (
          <li
            key={chakra.id}
            className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/75 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-[var(--turquoise-deep)]">
                  {chakra.number} · {chakra.sanskrit}
                </p>
                <p className="mt-0.5 text-[0.78rem] text-[var(--ink-soft)]">{chakra.sphere}</p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgba(184,221,224,0.55)] font-[family-name:var(--font-display)] text-[1.15rem] font-semibold text-[var(--ocean)]">
                {chakra.arcanum}
              </span>
            </div>

            {compact ? null : (
              <>
                <p className="mt-2 text-[0.86rem] leading-snug text-[var(--ink)]">
                  <span className="font-semibold">Энергия: </span>
                  {chakra.label}
                </p>
                {chakra.strength ? (
                  <p className="mt-1 flex gap-1.5 text-[0.82rem] leading-snug text-[var(--ink)]">
                    <SparkleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3b7b83]" />
                    <span>{chakra.strength}</span>
                  </p>
                ) : null}
                {chakra.risk ? (
                  <p className="mt-1 text-[0.82rem] leading-snug text-[var(--ink-soft)]">
                    <span className="font-semibold text-[#8a6a5a]">Зона внимания: </span>
                    {chakra.risk}
                  </p>
                ) : null}
              </>
            )}

            <p className="mt-1.5 text-[0.72rem] text-[var(--ink-faint)]">Как считали: {chakra.formula}</p>
          </li>
        ))}
      </ul>

      <p className="text-[0.75rem] leading-relaxed text-[var(--ink-faint)]">
        Версия расчёта чакр — <code>{CHAKRA_VERSION}</code>: цепочка от верхнего угла, центра и нижнего угла схемы.
        В школе есть и другие формулы чакр, поэтому числа здесь — один зафиксированный вариант, а не единственно
        верный. Значения — символические ориентиры, а не медицинские показатели.
      </p>
    </div>
  );
}
