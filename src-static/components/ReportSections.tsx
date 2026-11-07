import { useEffect, useMemo, useState } from "react";

import type { InterpretationSection } from "@/lib/interpretation/types";
import { plainHint } from "@/lib/interpretation/plain";
import { InterpretationCard, LockedCard } from "@/components/result/InterpretationCard";

import { registerSectionOpener } from "./section-open";

/**
 * Все разделы разбора одним списком.
 *
 * Раньше расшифровка шла сплошной лентой карточек — десятки экранов, и нужный
 * раздел приходилось искать прокруткой. Теперь названия собраны в столбик:
 * видно весь состав разбора сразу, а по нажатию раскрывается полный текст
 * выбранного раздела. Рядом с профессиональным названием в скобках стоит
 * бытовое пояснение — чтобы было понятно, о чём раздел и где это в жизни.
 */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ReportSections({
  sections,
  locked = [],
  heading = "Все разделы разбора",
  intro,
  lockedHeading = "Что ещё видно",
  lockedIntro,
  defaultOpenFirst = true,
}: {
  sections: InterpretationSection[];
  locked?: InterpretationSection[];
  heading?: string;
  intro?: string;
  lockedHeading?: string;
  lockedIntro?: string;
  defaultOpenFirst?: boolean;
}) {
  const [openIds, setOpenIds] = useState<string[]>(() => (defaultOpenFirst && sections[0] ? [sections[0].id] : []));

  // Навигация снаружи (полоса разделов, кнопки у схем) раскрывает нужный пункт.
  useEffect(
    () =>
      registerSectionOpener((sectionId) => {
        const id = sectionId.replace(/^sec-/, "");
        if (!sections.some((section) => section.id === id)) return false;
        setOpenIds((current) => (current.includes(id) ? current : [...current, id]));
        return true;
      }),
    [sections]
  );

  const allOpen = sections.length > 0 && openIds.length === sections.length;

  const toggle = (id: string) =>
    setOpenIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const introText = useMemo(
    () =>
      intro ??
      "Ниже — весь разбор по разделам. Нажмите на название, чтобы раскрыть его: под ним появится полный текст, таблицы и рекомендации. Рядом с названием в скобках — то же самое простыми словами.",
    [intro]
  );

  return (
    <section id="r-report" className="grid scroll-mt-28 gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="h-section">{heading}</h2>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => setOpenIds(allOpen ? [] : sections.map((section) => section.id))}
          aria-pressed={allOpen}
        >
          {allOpen ? "Свернуть все" : "Раскрыть все"}
        </button>
      </div>
      <p className="max-w-[62ch] text-[0.9rem] leading-relaxed text-[var(--ink-soft)]">{introText}</p>

      <ol className="grid gap-2">
        {sections.map((section, index) => {
          const open = openIds.includes(section.id);
          const hint = plainHint(section.id);
          return (
            <li
              key={section.id}
              id={`sec-${section.id}`}
              className="scroll-mt-28 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-white"
            >
              <button
                type="button"
                onClick={() => toggle(section.id)}
                aria-expanded={open}
                aria-controls={`sec-body-${section.id}`}
                className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                  open ? "bg-[rgba(184,221,224,0.20)]" : "hover:bg-[rgba(184,221,224,0.10)]"
                }`}
              >
                <span className="mt-0.5 w-5 shrink-0 text-right text-[0.76rem] text-[var(--ink-faint)]">{index + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-[family-name:var(--font-display)] text-[1.08rem] leading-snug text-[var(--ocean)]">
                    {section.title}
                    {hint ? <span className="text-[var(--ink-soft)]"> ({hint})</span> : null}
                  </span>
                  {section.subtitle ? (
                    <span className="mt-0.5 block text-[0.76rem] text-[var(--turquoise-deep)]">{section.subtitle}</span>
                  ) : null}
                </span>
                <span className="mt-1 text-[var(--turquoise-deep)]">
                  <Chevron open={open} />
                </span>
              </button>

              {open ? (
                <div id={`sec-body-${section.id}`} className="border-t border-[var(--line)] px-3 py-3">
                  <InterpretationCard section={section} index={index} hideTitle />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {locked.length > 0 ? (
        <div id="r-locked" className="grid scroll-mt-28 gap-3 pt-2">
          <h3 className="h-section">{lockedHeading}</h3>
          {lockedIntro ? (
            <p className="max-w-[62ch] text-[0.94rem] leading-relaxed text-[var(--ink)]">{lockedIntro}</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {locked.slice(0, 4).map((section, index) => (
              <LockedCard key={section.id} section={section} index={index} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
