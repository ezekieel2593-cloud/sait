import type { MatrixGuide } from "@/lib/interpretation/guides";
import { CheckIcon, LockIcon, SparkleIcon } from "@/components/icons";

/**
 * Карточка гайда по одной энергии.
 *
 * Открытый гайд — рабочая инструкция: что делать по шагам, практика на неделю,
 * признак «энергия в плюсе» и чего избегать. Закрытый — заголовок, где энергия
 * стоит в схеме, и первая фраза сути: видно тему, но шагов нет.
 */
export function EnergyGuideCard({ guide, index }: { guide: MatrixGuide; index: number }) {
  return (
    <article
      id={guide.id}
      className="card animate-in"
      style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-[1.3rem] leading-snug text-[var(--ocean)]">
            {guide.label}
          </h3>
          <p className="mt-1 text-[0.8rem] uppercase tracking-[0.1em] text-[var(--turquoise-deep)]">
            {guide.where}
          </p>
        </div>
        <span className="mt-1 shrink-0 text-[#c9a777]" aria-hidden="true">
          <SparkleIcon className="h-5 w-5" />
        </span>
      </header>

      {guide.essence ? (
        <p className="mt-3 text-[0.94rem] leading-relaxed text-[var(--ink)]">{guide.essence}</p>
      ) : null}

      {guide.signs.length ? (
        <div className="mt-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            Как это проявляется
          </p>
          <ul className="mt-2 grid gap-1.5">
            {guide.signs.map((item) => (
              <li key={item} className="flex gap-2 text-[0.9rem] leading-snug text-[var(--ink)]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--turquoise-deep)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {guide.steps.length ? (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-[rgba(184,221,224,0.9)] bg-[rgba(244,251,251,0.85)] p-3.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#3b7b83]">Что делать</p>
          <ol className="mt-2 grid gap-2">
            {guide.steps.map((step, stepIndex) => (
              <li key={step} className="flex gap-2 text-[0.9rem] leading-relaxed text-[var(--ocean)]">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[rgba(59,123,131,0.35)] bg-white text-[0.7rem] font-semibold text-[#3b7b83]">
                  {stepIndex + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {guide.practice ? (
        <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--line-gold)] bg-[rgba(255,251,245,0.9)] p-3.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#9c7b4c]">Практика на неделю</p>
          <p className="mt-1.5 text-[0.9rem] leading-relaxed text-[#6b5a45]">{guide.practice}</p>
        </div>
      ) : null}

      {guide.check ? (
        <p className="mt-3 flex gap-2 text-[0.88rem] leading-relaxed text-[var(--ink)]">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--turquoise-deep)]" />
          <span>
            <strong className="font-semibold text-[var(--ocean)]">Признак, что энергия в плюсе: </strong>
            {guide.check}
          </span>
        </p>
      ) : null}

      {guide.avoid.length ? (
        <p className="mt-2 text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
          <strong className="font-semibold text-[var(--ocean)]">Чего избегать: </strong>
          {guide.avoid.join(" ")}
        </p>
      ) : null}
    </article>
  );
}

/** Закрытый гайд: тема видна, шагов и практик нет. */
export function LockedGuideCard({ guide, index }: { guide: MatrixGuide; index: number }) {
  return (
    <article className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-white/60 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--line-gold)] bg-[rgba(255,251,245,0.9)] text-[#9c7b4c]">
          <LockIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-[1.1rem] leading-snug text-[var(--ocean)]">
            {guide.label}
          </h3>
          <p className="mt-0.5 text-[0.78rem] text-[var(--ink-soft)]">{guide.where}</p>
          <p className="mt-2 text-[0.86rem] leading-relaxed text-[var(--ink)]">
            {guide.essence ? `${guide.essence.split(". ")[0]}.` : "Гайд по этой энергии"}
          </p>
          <p className="mt-2 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
            Шаги, практика на неделю и признаки «энергия в плюсе» — в гайде.
          </p>
        </div>
      </div>
      <span className="absolute right-4 top-4 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]" style={{ animationDelay: `${index * 50}ms` }}>
        закрыто
      </span>
    </article>
  );
}
