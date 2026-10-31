import { useState } from "react";
import { buildGeneralGuide, generalEnergyToText, type GeneralEnergyGuide } from "@/lib/interpretation/general-guide";
import { getConfig } from "../config";
import { useAdmin } from "../admin";
import { LeadForm } from "../components/LeadForm";
import { GuideDatePdf } from "../components/GuideDatePdf";
import { CheckIcon, SparkleIcon, StarIcon } from "@/components/icons";
import { DocumentIcon } from "../components/icons-extra";

/**
 * Отдельная страница-гайд по 22 энергиям.
 *
 * Общий справочник: те же бытовые аспекты (спорт, каким видят другие, таланты,
 * задача души, утро, ресурс, расслабление, работа, деньги, отношения), но
 * раскрытые для каждой энергии. Здесь нет персонального расчёта — персональные
 * гайды появляются на странице Матрицы и в PDF.
 */
export function GuidePage() {
  const config = getConfig();
  const admin = useAdmin();
  const [askPersonal, setAskPersonal] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const guide = buildGeneralGuide();

  async function copyEnergy(energy: GeneralEnergyGuide) {
    try {
      await navigator.clipboard.writeText(generalEnergyToText(energy));
      setCopied(energy.arcanum);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="container py-8 sm:py-12">
      <div className="container--measure mx-auto">
        <p className="eyebrow">Гайд</p>
        <h1 className="h-display mt-3">22 энергии: что делать, кем работать и где брать силы</h1>
        <p className="lead mt-4">
          Справочник по всем энергиям Матрицы судьбы простыми словами. Для каждой энергии — каким тебя видят
          другие, в чём талант, главная задача души, каким спортом заниматься, как начинать утро, что даёт
          ресурс и расслабляет, кем и где работать, как приходят деньги и что важно в отношениях.
          Под каждым пунктом — короткое объяснение «почему так»: из какой черты характера это следует и на что
          опирается традиция.
        </p>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
          Это общие трактовки традиции, а не персональный расчёт. Свои энергии — те, что стоят в вашей схеме, —
          считаются по дате рождения на странице{" "}
          <a href="matrix.html" className="underline decoration-dotted underline-offset-2">
            Матрицы судьбы
          </a>
          . Здесь же можно найти номер своей энергии и прочитать её целиком.
        </p>

        <nav className="mt-5 flex flex-wrap gap-1.5" aria-label="Энергии">
          {guide.map((energy) => (
            <a
              key={energy.arcanum}
              href={`#energy-${energy.arcanum}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line-gold)] bg-white/80 text-[0.85rem] font-semibold text-[var(--ocean)] transition hover:border-[var(--turquoise-deep)]"
            >
              {energy.arcanum}
            </a>
          ))}
        </nav>
      </div>

      <div className="mt-8 grid gap-4">
        {guide.map((energy, index) => (
          <article key={energy.arcanum} id={`energy-${energy.arcanum}`} className="card p-4 sm:p-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--line-gold)] bg-[linear-gradient(180deg,#fffdfa,#f7ece4)] font-[family-name:var(--font-display)] text-[1.35rem] font-semibold text-[var(--ocean)]">
                  {energy.arcanum}
                </span>
                <div className="min-w-0">
                  <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] leading-snug text-[var(--ocean)]">
                    {energy.label}
                  </h2>
                  <p className="mt-1 text-[0.94rem] leading-relaxed text-[var(--ink)]">{energy.plain}</p>
                  <div className="mt-3 max-w-[64ch] rounded-[var(--radius-sm)] border-l-2 border-[rgba(184,221,224,0.95)] bg-[rgba(246,240,236,0.7)] px-3.5 py-2.5">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#3b7b83]">
                      Логика энергии
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-[0.96rem] italic leading-relaxed text-[var(--turquoise-deep)]">
                      {energy.logic}
                    </p>
                  </div>
                </div>
              </div>
              <span className="mt-1 shrink-0 text-[#c9a777]" aria-hidden="true">
                <SparkleIcon className="h-5 w-5" />
              </span>
            </header>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {energy.aspects.map((aspect) => (
                <div key={aspect.id} className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/70 p-3.5">
                  <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                    {aspect.title}
                  </dt>
                  <dd className="mt-1 text-[0.9rem] leading-relaxed text-[var(--ink)]">{aspect.text}</dd>
                  {aspect.why ? (
                    <dd className="mt-2 border-l-2 border-[rgba(184,221,224,0.9)] pl-2.5 text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
                      <span className="font-semibold text-[#3b7b83]">Почему так: </span>
                      {aspect.why}
                    </dd>
                  ) : null}
                </div>
              ))}
            </dl>

            {energy.strength.length || energy.risk.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {energy.strength.length ? (
                  <div className="rounded-[var(--radius-sm)] border border-[rgba(184,221,224,0.9)] bg-[rgba(244,251,251,0.85)] p-3.5">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[#3b7b83]">
                      Сильные проявления
                    </p>
                    <ul className="mt-1.5 grid gap-1">
                      {energy.strength.map((item) => (
                        <li key={item} className="flex gap-2 text-[0.86rem] leading-snug text-[var(--ocean)]">
                          <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--turquoise-deep)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {energy.risk.length ? (
                  <div className="rounded-[var(--radius-sm)] border border-[rgba(220,197,217,0.9)] bg-[rgba(251,245,250,0.9)] p-3.5">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[#8a5d7c]">
                      Зоны внимания
                    </p>
                    <ul className="mt-1.5 grid gap-1">
                      {energy.risk.map((item) => (
                        <li key={item} className="flex gap-2 text-[0.86rem] leading-snug text-[var(--ocean)]">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#c39ab8]" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => void copyEnergy(energy)}
              >
                {copied === energy.arcanum ? <CheckIcon className="h-4 w-4" /> : null}
                {copied === energy.arcanum ? "Скопировано" : "Скопировать гайд"}
              </button>
              <a
                href={`matrix.html#guides`}
                className="text-[0.82rem] text-[var(--turquoise-deep)] underline decoration-dotted underline-offset-2"
              >
                Посмотреть мои энергии
              </a>
              <span className="text-[0.75rem] text-[var(--ink-faint)]">
                {index + 1} из {guide.length}
              </span>
            </div>
          </article>
        ))}
      </div>

      <section className="card mt-8 grid gap-3 p-4 sm:p-6" id="personal">
        <h2 className="font-[family-name:var(--font-display)] text-[1.5rem] leading-snug text-[var(--ocean)]">
          Персональный гайд по вашим энергиям
        </h2>
        <p className="max-w-[62ch] text-[0.94rem] leading-relaxed text-[var(--ink)]">
          В схеме каждого человека всего несколько энергий — и каждая из них стоит в своей точке: в характере,
          талантах, задаче души, деньгах или отношениях. Персональный гайд собирает именно ваши энергии, в порядке
          вашей схемы, с шагами и практиками.
        </p>

        {admin ? (
          <GuideDatePdf />
        ) : askPersonal ? (
          <LeadForm
            direction="matrix"
            variant="guide"
            summary="Запрос гайда по 22 энергиям (страница гайда)"
            birth=""
            compact
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setAskPersonal(true)}>
              <DocumentIcon className="h-4 w-4" />
              Получить персональный гайд
            </button>
            <a href="matrix.html" className="btn btn--secondary btn--sm">
              Рассчитать свою матрицу
            </a>
          </div>
        )}

        <p className="text-[0.78rem] leading-relaxed text-[var(--ink-faint)]">
          Трактовки — символическая традиция, а не предсказание событий и не медицинская рекомендация.
          Спорт, режим и питание в гайде — примеры для вдохновения: подбирайте их с учётом своего здоровья.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
        <p className="flex items-center gap-2 text-[0.86rem] text-[var(--ink-soft)]">
          <StarIcon className="h-4 w-4 text-[#c9a777]" />
          Хотите разобрать свою схему целиком?
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="matrix.html" className="btn btn--primary btn--sm">
            Открыть Матрицу судьбы
          </a>
          <a href="astrology.html" className="btn btn--secondary btn--sm">
            Рассчитать натальную карту
          </a>
        </div>
      </div>

      <p className="mt-4 text-[0.78rem] text-[var(--ink-faint)]">
        {config.siteName} · полный гайд по 22 энергиям · версия методики matrix-22-v1
      </p>
    </div>
  );
}
