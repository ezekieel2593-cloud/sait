import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCalculation } from "@/lib/services/charts";
import { MatrixDiagram } from "@/components/charts/MatrixDiagram";
import { InterpretationCard, LockedCard } from "@/components/result/InterpretationCard";
import { LeadForm } from "@/components/forms/LeadForm";
import { listServices } from "@/lib/repositories/services";
import type { MatrixChart } from "@/lib/matrix/engine";
import { ArrowRightIcon, CalendarIcon, CrystalIcon, LockIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Результат Матрицы судьбы",
  robots: { index: false, follow: false, nocache: true },
};

export default async function MatrixResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadCalculation(id);
  if (!loaded || loaded.record.direction !== "matrix") notFound();

  const chart = loaded.chart as MatrixChart;
  const { interpretation } = loaded;
  const free = interpretation.sections.filter((section) => !section.premium);
  const locked = interpretation.sections.filter((section) => section.premium);
  const services = listServices("matrix").map((service) => ({ id: service.id, title: service.title }));

  return (
    <>
      <section className="relative pb-4 pt-6 sm:pt-8">
        <div className="container">
          <Link href="/matrix" className="text-[0.82rem] text-[#a8799b] hover:text-[var(--ocean)]">
            ← Изменить дату рождения
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Матрица судьбы</p>
              <h1 className="h-display mt-3 text-[clamp(2rem,4.6vw,3.2rem)]">{interpretation.headline}</h1>
              <p className="lead mt-3 max-w-2xl">{interpretation.lead}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[0.8rem]">
              <span className="chip chip--soft">
                <CalendarIcon className="h-3.5 w-3.5" />
                {formatDate(chart.birth.date)}
              </span>
              <span className="chip chip--soft">
                <CrystalIcon className="h-3.5 w-3.5" />
                {chart.meta.version}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-8">
        <div className="container grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="card gold-frame p-4 sm:p-6">
            <MatrixDiagram chart={chart} />
            <p className="mt-3 text-center text-[0.76rem] text-[var(--ink-faint)]">
              {chart.meta.methodology} · {chart.meta.reductionLabel}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <MetricTile label="Центр" value={String(chart.byKey.center.arcanum)} title={chart.byKey.center.arcanumTitle} note="Зона комфорта" />
              <MetricTile label="Личность" value={String(chart.byKey.A.arcanum)} title={chart.byKey.A.arcanumTitle} note="Точка дня" />
              <MetricTile label="Талант" value={String(chart.byKey.B.arcanum)} title={chart.byKey.B.arcanumTitle} note="Точка месяца" />
              <MetricTile label="Задача" value={String(chart.byKey.D.arcanum)} title={chart.byKey.D.arcanumTitle} note="Кармическая задача" />
            </div>

            <div className="card">
              <h2 className="font-[family-name:var(--font-display)] text-[1.2rem] text-[var(--ocean)]">Расчётные позиции</h2>
              <p className="mt-1 text-[0.8rem] text-[var(--ink-soft)]">
                Все числа получены по формуле метода; рядом указана используемая формула.
              </p>
              <ul className="mt-3 grid gap-1.5">
                {chart.points.map((point) => (
                  <li key={point.key} className="flex items-start justify-between gap-3 border-b border-[var(--line)] py-1.5 last:border-0">
                    <span className="min-w-0">
                      <span className="block text-[0.86rem] text-[var(--ocean)]">{point.title}</span>
                      <span className="block text-[0.72rem] text-[var(--ink-faint)]">{point.formula}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-[family-name:var(--font-display)] text-[1rem] text-[var(--ocean)]">
                        {point.arcanum}
                      </span>
                      <span className="block text-[0.7rem] text-[var(--ink-soft)]">{point.arcanumTitle}</span>
                    </span>
                  </li>
                ))}
                <li className="flex items-start justify-between gap-3 py-1.5">
                  <span>
                    <span className="block text-[0.86rem] text-[var(--ocean)]">{chart.yearEnergy.title}</span>
                    <span className="block text-[0.72rem] text-[var(--ink-faint)]">{chart.yearEnergy.formula}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-[family-name:var(--font-display)] text-[1rem] text-[var(--ocean)]">
                      {chart.yearEnergy.arcanum}
                    </span>
                    <span className="block text-[0.7rem] text-[var(--ink-soft)]">{chart.yearEnergy.arcanumTitle}</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {chart.limitations.length > 0 && (
        <section className="pb-6">
          <div className="container">
            <details className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/70 px-4 py-3 text-[0.82rem] text-[var(--ink-soft)]">
              <summary className="cursor-pointer font-semibold text-[var(--ocean)]">Ограничения методики</summary>
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
              <h2 className="h-section mt-3">Расшифровка ключевых энергий</h2>
            </div>
            <p className="text-[0.82rem] text-[var(--ink-soft)]">
              Открыто {interpretation.freeCount} из {interpretation.totalCount} позиций
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
          <div className="grid gap-6 rounded-[var(--radius-xl)] border border-[rgba(220,197,217,0.9)] bg-[linear-gradient(160deg,#fdf9fc,#f7eff5)] p-6 sm:p-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="eyebrow">Полный разбор</p>
              <h2 className="h-section mt-3">В полной версии открыто всё</h2>
              <p className="lead mt-3 text-[0.95rem]">
                Все позиции схемы, родовой квадрат, каналы денег и отношений, подробные рекомендации и разбор
                ваших вопросов со специалистом.
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
            <div className="grid gap-3">
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
            <h2 className="h-section mt-3">Полный разбор матрицы</h2>
            <p className="lead mt-3">
              Специалист откроет все позиции вашей схемы, объяснит связи между каналами и ответит на вопросы.
            </p>
            <div className="mt-5 grid gap-2.5">
              {[
                "Все 22 значения в контексте вашей схемы",
                "Родовой квадрат и каналы денег и отношений",
                "Энергия текущего года",
                "Данные расчёта сохранены — повторно вводить не нужно",
              ].map((item) => (
                <p key={item} className="flex gap-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a8799b]" />
                  {item}
                </p>
              ))}
            </div>
          </div>
          <LeadForm direction="matrix" calculationId={loaded.record.id} services={services} />
        </div>
      </section>

      <p className="container pb-10 text-[0.75rem] leading-relaxed text-[var(--ink-faint)]">
        Матрица судьбы — символическая система саморефлексии. Результат не является предсказанием и не индексируется
        поисковыми системами.
      </p>
    </>
  );
}

function MetricTile({ label, value, title, note }: { label: string; value: string; title: string; note: string }) {
  return (
    <div className="card">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#a8799b]">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-display)] text-[1.8rem] leading-none text-[var(--ocean)]">{value}</span>
        <span className="text-[0.86rem] text-[var(--ink)]">{title}</span>
      </p>
      <p className="mt-1 text-[0.76rem] text-[var(--ink-soft)]">{note}</p>
    </div>
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
