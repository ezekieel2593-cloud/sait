import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { listServices } from "@/lib/repositories/services";
import { LeadForm } from "@/components/forms/LeadForm";
import type { Direction } from "@/lib/types";
import { CheckIcon, ClockIcon, DocumentIcon, MessageIcon, StarIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Полный персональный разбор",
  description:
    "Полный астрологический разбор или разбор Матрицы судьбы: все позиции методики, подробные интерпретации и консультация специалиста.",
  alternates: { canonical: "/full-reading" },
};

export default async function FullReadingPage({ searchParams }: { searchParams: Promise<{ direction?: string }> }) {
  const settings = getSettings();
  const params = await searchParams;
  const direction: Direction = params.direction === "matrix" ? "matrix" : "astrology";
  const services = listServices(direction).map((service) => ({ id: service.id, title: service.title }));
  const priceNote = settings.services.priceNote?.trim();
  const turnaround = settings.services.turnaround?.trim();

  return (
    <>
      <section className="relative pb-6 pt-8 sm:pt-12">
        <div className="container">
          <p className="eyebrow">Консультация</p>
          <h1 className="h-display mt-4 max-w-3xl">Полный персональный разбор</h1>
          <p className="lead mt-4 max-w-2xl">
            Бесплатный результат показывает главное. Полный разбор — это все позиции методики, подробные
            трактовки и ответы на ваши вопросы от специалиста.
          </p>

          <div className="mt-6 inline-flex rounded-full border border-[var(--line-strong)] bg-white/80 p-1">
            <Link
              href="/full-reading?direction=astrology"
              className={`rounded-full px-4 py-2 text-[0.86rem] font-medium transition-colors ${
                direction === "astrology" ? "bg-[var(--ocean)] text-white" : "text-[var(--ink)] hover:text-[var(--ocean)]"
              }`}
            >
              Астрология
            </Link>
            <Link
              href="/full-reading?direction=matrix"
              className={`rounded-full px-4 py-2 text-[0.86rem] font-medium transition-colors ${
                direction === "matrix" ? "bg-[var(--ocean)] text-white" : "text-[var(--ink)] hover:text-[var(--ocean)]"
              }`}
            >
              Матрица судьбы
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-8">
        <div className="container grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="grid gap-4">
            <div className="card">
              <h2 className="h-card">Что входит в услугу</h2>
              <ul className="mt-3 grid gap-2">
                {settings.services.fullReadingIncludes.map((item) => (
                  <li key={item} className="flex gap-2 text-[0.92rem] leading-relaxed text-[var(--ink)]">
                    <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-[var(--turquoise-deep)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2 className="h-card">Как проходит работа</h2>
              <ol className="mt-3 grid gap-3">
                {[
                  "Вы отправляете заявку и (по желанию) делаете бесплатный расчёт — данные уже будут в карточке.",
                  "Специалист открывает расчёт, готовит полную расшифровку и уточняет ваш запрос.",
                  "Вы получаете разбор в согласованном формате и можете задать вопросы.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-3 text-[0.92rem] leading-relaxed text-[var(--ink)]">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--line-gold)] text-[0.75rem] font-semibold text-[#9c7b4c]">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-3 text-[0.85rem] text-[var(--ink-soft)]">
                {settings.services.fullReadingFormat.map((item) => (
                  <p key={item} className="flex gap-2">
                    <DocumentIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--turquoise-deep)]" />
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="card card--turquoise">
              <h2 className="h-card">Стоимость и сроки</h2>
              {priceNote ? (
                <p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--ink)]">{priceNote}</p>
              ) : (
                <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">
                  Стоимость и сроки специалист уточняет после знакомства с запросом — на сайте они не публикуются,
                  чтобы не давать неверных ожиданий.
                </p>
              )}
              {turnaround ? (
                <p className="mt-2 flex gap-2 text-[0.86rem] text-[var(--ink-soft)]">
                  <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  {turnaround}
                </p>
              ) : null}
              <p className="mt-3 flex gap-2 text-[0.82rem] text-[var(--ink-soft)]">
                <MessageIcon className="mt-0.5 h-4 w-4 shrink-0" />
                Оплата и формат согласуются лично. Заявка ни к чему не обязывает.
              </p>
            </div>

            <div className="note note--info">
              <StarIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Мы не публикуем отзывы, которых не было, и не указываем опыт или сертификаты без подтверждения —
                информация о специалисте заполняется владельцем проекта.
              </p>
            </div>
          </div>

          <div id="lead">
            <LeadForm direction={direction} services={services} />
          </div>
        </div>
      </section>
    </>
  );
}
