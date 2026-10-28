import type { InterpretationSection } from "@/lib/interpretation/types";
import { CheckIcon, LockIcon, SparkleIcon, StarIcon } from "@/components/icons";

export function InterpretationCard({ section, index }: { section: InterpretationSection; index: number }) {
  return (
    <article className="card animate-in" style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-[1.3rem] leading-snug text-[var(--ocean)]">
            {section.title}
          </h3>
          {section.subtitle ? (
            <p className="mt-1 text-[0.8rem] uppercase tracking-[0.1em] text-[var(--turquoise-deep)]">{section.subtitle}</p>
          ) : null}
        </div>
        <span className="mt-1 shrink-0 text-[#c9a777]" aria-hidden="true">
          <SparkleIcon className="h-5 w-5" />
        </span>
      </header>

      <div className="mt-3 grid gap-2.5">
        {section.paragraphs.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex} className="text-[0.94rem] leading-relaxed text-[var(--ink)]">
            {paragraph}
          </p>
        ))}
      </div>

      {section.positive?.length || section.shadow?.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {section.positive?.length ? (
            <div className="rounded-[var(--radius-sm)] border border-[rgba(184,221,224,0.9)] bg-[rgba(244,251,251,0.85)] p-3.5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#3b7b83]">Сильные стороны</p>
              <ul className="mt-2 grid gap-1.5">
                {section.positive.map((item) => (
                  <li key={item} className="flex gap-2 text-[0.85rem] leading-snug text-[var(--ocean)]">
                    <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--turquoise-deep)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {section.shadow?.length ? (
            <div className="rounded-[var(--radius-sm)] border border-[rgba(220,197,217,0.9)] bg-[rgba(251,245,250,0.9)] p-3.5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#8a5d7c]">Зоны внимания</p>
              <ul className="mt-2 grid gap-1.5">
                {section.shadow.map((item) => (
                  <li key={item} className="flex gap-2 text-[0.85rem] leading-snug text-[var(--ocean)]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#c39ab8]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {section.recommendations?.length ? (
        <div className="mt-3 rounded-[var(--radius-sm)] border border-[rgba(201,167,119,0.35)] bg-[rgba(255,251,245,0.9)] p-3.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#9c7b4c]">Рекомендации</p>
          <ul className="mt-2 grid gap-1.5">
            {section.recommendations.map((item) => (
              <li key={item} className="flex gap-2 text-[0.86rem] leading-relaxed text-[#6b5a45]">
                <StarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {section.sourceNote ? (
        <p className="mt-3 text-[0.72rem] text-[var(--ink-faint)]">Источник трактовки: {section.sourceNote}</p>
      ) : null}
    </article>
  );
}

export function LockedCard({ section, index }: { section: InterpretationSection; index: number }) {
  return (
    <article className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-white/60 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--line-gold)] bg-[rgba(255,251,245,0.9)] text-[#9c7b4c]">
          <LockIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-[1.1rem] leading-snug text-[var(--ocean)]">
            {section.title}
          </h3>
          <p className="mt-0.5 text-[0.78rem] text-[var(--ink-soft)]">
            {section.subtitle ? `${section.subtitle} · ` : ""}
            {section.arcana ? "полная трактовка аркана" : "подробная расшифровка"} в полном разборе
          </p>
          <div className="mt-3 space-y-1.5" aria-hidden="true">
            <div className="h-2 w-full rounded-full bg-[rgba(37,61,75,0.07)]" />
            <div className="h-2 w-[86%] rounded-full bg-[rgba(37,61,75,0.07)]" />
            <div className="h-2 w-[64%] rounded-full bg-[rgba(37,61,75,0.07)]" />
          </div>
        </div>
      </div>
      <span className="sr-only">Содержимое доступно только в полном разборе</span>
      <span className="absolute right-4 top-4 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]" style={{ animationDelay: `${index * 50}ms` }}>
        закрыто
      </span>
    </article>
  );
}
