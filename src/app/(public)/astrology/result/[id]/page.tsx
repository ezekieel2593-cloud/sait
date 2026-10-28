import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCalculation } from "@/lib/services/charts";
import { NatalWheel } from "@/components/charts/NatalWheel";
import { InterpretationCard, LockedCard } from "@/components/result/InterpretationCard";
import { LeadForm } from "@/components/forms/LeadForm";
import { listServices } from "@/lib/repositories/services";
import type { NatalChart } from "@/lib/astronomy/engine";
import { PLANETS } from "@/lib/astronomy/constants";
import { ArrowRightIcon, CalendarIcon, LockIcon, MoonIcon, OrbitIcon, PinIcon, SunIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Результат расчёта натальной карты",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AstrologyResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadCalculation(id);
  if (!loaded || loaded.record.direction !== "astrology") notFound();

  const chart = loaded.chart as NatalChart;
  const { interpretation } = loaded;
  const free = interpretation.sections.filter((section) => !section.premium);
  const locked = interpretation.sections.filter((section) => section.premium);
  const services = listServices("astrology").map((service) => ({ id: service.id, title: service.title }));

  const sun = chart.positions.find((position) => position.key === "sun");
  const moon = chart.positions.find((position) => position.key === "moon");

  return (
    <>
      <section className="relative pb-4 pt-6 sm:pt-8">
        <div className="container">
          <Link href="/astrology" className="text-[0.82rem] text-[var(--turquoise-deep)] hover:text-[var(--ocean)]">
            ← Изменить данные рождения
          </Link>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Натальная карта</p>
              <h1 className="h-display mt-3 text-[clamp(2rem,4.6vw,3.2rem)]">{interpretation.headline}</h1>
              <p className="lead mt-3 max-w-2xl">{interpretation.lead}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[0.8rem]">
              <span className="chip chip--soft">
                <CalendarIcon className="h-3.5 w-3.5" />
                {formatDate(chart.birth.date)}
              </span>
              <span className="chip chip--soft">
                <OrbitIcon className="h-3.5 w-3.5" />
                {chart.birth.time ?? "время неизвестно"}
              </span>
              <span className="chip chip--soft">
                <PinIcon className="h-3.5 w-3.5" />
                {chart.birth.placeName || `${chart.birth.latitude.toFixed(2)}, ${chart.birth.longitude.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-6">
        <div className="container grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="card gold-frame relative overflow-hidden p-4 sm:p-6">
            <NatalWheel chart={chart} />
            <p className="mt-3 text-center text-[0.76rem] text-[var(--ink-faint)]">
              {chart.meta.houseSystemLabel} · {chart.meta.zodiac} · {chart.meta.algorithmVersion}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryTile
              icon={<SunIcon className="h-4 w-4" />}
              label="Солнце"
              value={sun?.formatted ?? "—"}
              note="Центр личности и воля"
            />
            <SummaryTile
              icon={<MoonIcon className="h-4 w-4" />}
              label="Луна"
              value={moon?.formatted ?? "—"}
              note="Эмоции и внутренняя опора"
            />
            <SummaryTile
              icon={<OrbitIcon className="h-4 w-4" />}
              label="Асцендент"
              value={chart.ascendant?.formatted ?? "не рассчитан"}
              note={chart.ascendant ? "Как вас видят другие" : "Нужно время рождения"}
            />
            <SummaryTile
              icon={<StarGlyph />}
              label="Ведущая стихия"
              value={chart.summary.dominantElement}
              note={`${chart.summary.dominantModality} крест`}
            />

            <div className="card sm:col-span-2">
              <h2 className="font-[family-name:var(--font-display)] text-[1.2rem] text-[var(--ocean)]">Положения планет</h2>
              <div className="mt-3 hidden grid-cols-[1.2fr_1.6fr_0.7fr_0.6fr] gap-2 border-b border-[var(--line)] pb-2 text-[0.72rem] uppercase tracking-[0.1em] text-[var(--ink-faint)] sm:grid">
                <span>Планета</span>
                <span>Положение</span>
                <span>Дом</span>
                <span>Движение</span>
              </div>
              <ul className="mt-1 divide-y divide-[var(--line)]">
                {chart.positions.map((position) => (
                  <li key={position.key} className="grid grid-cols-2 gap-2 py-2 text-[0.85rem] sm:grid-cols-[1.2fr_1.6fr_0.7fr_0.6fr] sm:items-center">
                    <span className="flex items-center gap-1.5 font-medium text-[var(--ocean)]">
                      <span className="text-[var(--turquoise-deep)]" aria-hidden="true">{position.symbol}</span>
                      {position.name}
                    </span>
                    <span className="text-[var(--ink)]">{position.formatted}</span>
                    <span className="text-[var(--ink-soft)]">{position.house ? `${position.house} дом` : "—"}</span>
                    <span className="text-[var(--ink-soft)]">{position.retrograde ? "ретро" : "прямое"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.74rem] text-[var(--ink-faint)]">
                Эфемериды: {chart.meta.ephemeris}. Точность Плутона ограничена библиотекой.
              </p>
            </div>
          </div>
        </div>
      </section>

      {(chart.warnings.length > 0 || chart.limitations.length > 0) && (
        <section className="pb-6">
          <div className="container">
            <div className="grid gap-3">
              {chart.warnings.map((warning) => (
                <div key={warning} className="note">
                  <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{warning}</p>
                </div>
              ))}
            </div>
            <details className="mt-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/70 px-4 py-3 text-[0.82rem] text-[var(--ink-soft)]">
              <summary className="cursor-pointer font-semibold text-[var(--ocean)]">Ограничения расчёта</summary>
              <ul className="mt-2 grid gap-1.5">
                {chart.limitations.map((limitation) => (
                  <li key={limitation}>· {limitation}</li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      )}

      <section className="section section--tight">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Бесплатная часть</p>
              <h2 className="h-section mt-3">Ваши ключевые расшифровки</h2>
            </div>
            <p className="text-[0.82rem] text-[var(--ink-soft)]">
              Открыто {interpretation.freeCount} из {interpretation.totalCount} разделов
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {free.map((section, index) => (
              <InterpretationCard key={section.id} section={section} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="grid gap-6 rounded-[var(--radius-xl)] border border-[var(--line-gold)] bg-[linear-gradient(160deg,#fffdfb,#f8f2ec)] p-6 sm:p-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="eyebrow">Полный разбор</p>
              <h2 className="h-section mt-3">{locked.length} разделов открываются в полной версии</h2>
              <p className="lead mt-3 text-[0.95rem]">
                Полная карта включает все планеты в домах, все дома, аспекты с подробной трактовкой и консультацию
                специалиста. Ниже — темы, которые уже рассчитаны, но закрыты в бесплатной версии.
              </p>
              <ul className="mt-4 grid gap-2">
                {locked.slice(0, 6).map((section) => (
                  <li key={section.id} className="flex items-center gap-2 text-[0.88rem] text-[var(--ink)]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgba(201,167,119,0.18)] text-[#9c7b4c]">
                      <LockIcon className="h-3 w-3" />
                    </span>
                    {section.title}
                  </li>
                ))}
              </ul>
              <a href="#lead" className="btn btn--primary mt-5">
                Получить полный разбор
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {locked.slice(0, 4).map((section, index) => (
                <LockedCard key={section.id} section={section} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="lead">
        <div className="container grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="eyebrow">Заявка</p>
            <h2 className="h-section mt-3">Полный разбор вашей карты</h2>
            <p className="lead mt-3">
              Оставьте заявку — специалист откроет вашу карту целиком, подготовит расшифровку и свяжется с вами
              удобным способом.
            </p>
            <div className="mt-5 grid gap-2.5">
              {[
                "Полная натальная карта с интерпретацией всех позиций",
                "Ответы на ваши вопросы по карте",
                "Формат и стоимость уточняются у специалиста",
                "Данные расчёта уже сохранены — повторно вводить не нужно",
              ].map((item) => (
                <p key={item} className="flex gap-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--turquoise-deep)]" />
                  {item}
                </p>
              ))}
            </div>
          </div>
          <LeadForm direction="astrology" calculationId={loaded.record.id} services={services} />
        </div>
      </section>

      <p className="container pb-10 text-[0.75rem] leading-relaxed text-[var(--ink-faint)]">
        Расчёт основан на реальных астрономических данных и не является предсказанием событий. Персональные данные
        обрабатываются согласно политике конфиденциальности; результат не индексируется поисковыми системами.
      </p>
    </>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--turquoise-deep)]">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-[family-name:var(--font-display)] text-[1.28rem] leading-tight text-[var(--ocean)]">{value}</p>
      <p className="mt-1 text-[0.78rem] text-[var(--ink-soft)]">{note}</p>
    </div>
  );
}

function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 3.6l2.35 5.06 5.53.66-4.08 3.79 1.09 5.47L12 15.9l-4.89 2.68 1.09-5.47L4.12 9.32l5.53-.66L12 3.6Z" />
    </svg>
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
