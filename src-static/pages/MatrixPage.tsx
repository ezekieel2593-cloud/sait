import { useEffect, useState } from "react";
import { computeMatrix, type MatrixChart } from "@/lib/matrix/engine";
import { buildMatrixInterpretation } from "@/lib/interpretation/matrix";
import { buildMatrixGuides, guideToText } from "@/lib/interpretation/guides";
import { buildSimpleGuide } from "@/lib/interpretation/simple";
import { MATRIX_DIAGRAM_KEYS, MatrixDiagram } from "@/components/charts/MatrixDiagram";
import { InterpretationCard, LockedCard } from "@/components/result/InterpretationCard";
import { getConfig } from "../config";
import { useAdmin } from "../admin";
import { LeadForm } from "../components/LeadForm";
import { matrixDetails } from "../details";
import { AdminNote } from "../components/AdminNote";
import { EnergyGuideCard, LockedGuideCard } from "../components/EnergyGuideCard";
import { GuidePdfPanel } from "../components/GuidePdfPanel";
import { SimpleGuideGrid } from "../components/SimpleGuideGrid";
import { CalendarIcon } from "../components/icons-extra";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Минимальная дата: 1900-01-01 — как в серверной валидации. */
const MIN_DATE = "1900-01-01";

export function MatrixPage() {
  const config = getConfig();
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ chart: MatrixChart; date: string } | null>(null);
  /**
   * Параметры «гайд по человеку» (?guide=1&name=Имя) считываем до первого
   * обновления адреса: дальше в адресе остаётся только дата рождения.
   */
  const [guideRequest] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { auto: params.get("guide") === "1", name: params.get("name") ?? "" };
  });

  // Дата из ссылки (?d=1992-06-23) — чтобы результатом можно было поделиться.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("d");
    if (fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl)) {
      setDate(fromUrl);
      runCalculation(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runCalculation(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setError("Укажите дату рождения");
      return;
    }
    const year = Number(value.slice(0, 4));
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      setError("Такой даты не существует");
      return;
    }
    if (year < 1900 || value > today()) {
      setError("Поддерживаются даты с 1900 года и не в будущем");
      return;
    }
    setError(null);
    const chart = computeMatrix({ date: value });
    setResult({ chart, date: value });
    const share = new URLSearchParams({ d: value });
    if (guideRequest.auto) {
      share.set("guide", "1");
      if (guideRequest.name) share.set("name", guideRequest.name);
    }
    window.history.replaceState(null, "", `?${share.toString()}`);
  }

  return (
    <div className="container py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="eyebrow">Матрица судьбы</p>
          <h1 className="h-display mt-3">Матрица судьбы по 22 энергиям</h1>
          <p className="lead mt-4">
            Дата рождения раскладывается на 22 энергии: личный квадрат, родовые программы, каналы денег и отношений.
            Расчёт арифметический и детерминированный — без случайных чисел. Каждая энергия у вас своя — и читается
            она по-своему.
          </p>

          <form
            className="card mt-6 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              runCalculation(date);
            }}
            noValidate
          >
            <div className="field">
              <label htmlFor="matrix-date">Дата рождения</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <input
                  id="matrix-date"
                  className="input input--date"
                  type="date"
                  min={MIN_DATE}
                  max={today()}
                  value={date}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              {error ? <p className="field__error">{error}</p> : null}
              <p className="field__hint">Время и место рождения для Матрицы судьбы не нужны.</p>
            </div>
            <button type="submit" className="btn btn--primary btn--lg btn--block">
              Рассчитать матрицу
            </button>
          </form>

          <p className="mt-4 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
            Методика: школа Ладини, правило редукции — сложение цифр до диапазона 1–22, версия алгоритма
            <code>matrix-22-v1</code>. Трактовки энергий — эзотерическая традиция, а не научно доказанные утверждения.
          </p>
        </div>

        <div className="grid gap-4">
          {result ? <MatrixResult result={result} guideRequest={guideRequest} /> : null}
        </div>
      </div>
    </div>
  );
}

function MatrixResult({
  result,
  guideRequest,
}: {
  result: { chart: MatrixChart; date: string };
  guideRequest: { auto: boolean; name: string };
}) {
  const config = getConfig();
  const admin = useAdmin();
  const { chart, date } = result;
  // Владелец видит все разделы: ограничения бесплатной версии к нему не применяются.
  const interpretation = buildMatrixInterpretation(chart, {
    freeSections: admin ? 999 : config.freeResult.matrixPointCount,
    includePremium: admin,
    // Владелец получает расширенный вариант: формула и «сырое» число у каждой
    // энергии, трактовки по всем сферам и полная схема расчёта.
    detailed: admin,
  });
  const free = interpretation.sections.filter((section) => !section.premium);
  const locked = interpretation.sections.filter((section) => section.premium);
  // Подсветка в схеме: нажали пункт «простыми словами» — эта точка загорается.
  const [highlight, setHighlight] = useState<string[] | null>(null);
  const [askGuide, setAskGuide] = useState(false);

  const summary = [
    `Матрица судьбы, дата рождения ${date}`,
    `Личный квадрат: A=${chart.byKey.A.arcanumTitle}, B=${chart.byKey.B.arcanumTitle}, C=${chart.byKey.C.arcanumTitle}, D=${chart.byKey.D.arcanumTitle}`,
    `Центр: ${chart.byKey.center.arcanumTitle}`,
    `Деньги: вход ${chart.byKey["money-entry"].arcanumTitle}, середина ${chart.byKey["money-middle"].arcanumTitle}`,
    `Отношения: вход ${chart.byKey["love-entry"].arcanumTitle}, середина ${chart.byKey["love-middle"].arcanumTitle}`,
  ].join("\n");

  return (
    <div className="grid gap-4">
      <section className="card gold-frame p-4 sm:p-6">
        <p className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--turquoise-deep)]">Результат</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-[1.5rem] leading-snug text-[var(--ocean)]">
          {interpretation.headline}
        </h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--ink)]">{interpretation.lead}</p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <figure className="m-0 rounded-[var(--radius-md)] border border-[var(--line)] bg-[linear-gradient(180deg,#fffdfa,#fbf3ec)] p-2">
            <MatrixDiagram chart={chart} highlight={highlight} />
            <figcaption className="px-2 pb-1 pt-1 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">
              Полная схема: {MATRIX_DIAGRAM_KEYS.length} точек — центр, личный квадрат, родовые углы, каналы денег
              и отношений, энергия года. Нажмите пункт в блоке «Простыми словами» — точка подсветится.
            </figcaption>
          </figure>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Центр" value={`${chart.byKey.center.arcanum}`} note="зона комфорта" />
              <Metric label="Сила рода" value={`${chart.byKey["family-force"].arcanum}`} note="опора семьи" />
              <Metric
                label="Деньги"
                value={`${chart.byKey["money-entry"].arcanum} / ${chart.byKey["money-middle"].arcanum}`}
                note="вход / середина"
              />
              <Metric
                label="Отношения"
                value={`${chart.byKey["love-entry"].arcanum} / ${chart.byKey["love-middle"].arcanum}`}
                note="вход / середина"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <EnergyChip value={chart.byKey["money-entry"].arcanum} label="вход в денежный канал" />
              <EnergyChip value={chart.byKey["money-middle"].arcanum} label="середина денег" />
              <EnergyChip value={chart.byKey["love-entry"].arcanum} label="вход в канал любви" />
              <EnergyChip value={chart.byKey["love-middle"].arcanum} label="середина отношений" />
              <EnergyChip value={chart.byKey.shared.arcanum} label="общая точка каналов" />
              <EnergyChip value={chart.yearEnergy.arcanum} label={`энергия ${chart.yearEnergy.year} года`} />
            </div>
            <details className="rounded-[0.75rem] border border-[var(--line)] bg-white p-3 text-[0.84rem]">
              <summary className="cursor-pointer text-[var(--turquoise-deep)]">Все расчётные позиции и формулы</summary>
              <ul className="mt-2 grid gap-1">
                {[...chart.points, chart.yearEnergy].map((point) => (
                  <li key={point.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] py-1 last:border-0">
                    <span className="text-[var(--ink-soft)]">{point.title}</span>
                    <span className="text-[var(--ocean)]">{point.arcanumTitle}</span>
                    <span className="w-full text-[0.72rem] text-[var(--ink-faint)] sm:w-auto">{point.formula}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </section>

      {admin ? <AdminNote locked={locked.length} /> : null}

      <section className="grid gap-3">
        <h2 className="h-section">{admin ? "Полная расшифровка" : "Ваша расшифровка"}</h2>
        {free.map((section, index) => (
          <InterpretationCard key={section.id} section={section} index={index} />
        ))}
      </section>

      {locked.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="h-section">Что скрыто в вашей схеме</h2>
          <p className="max-w-[62ch] text-[0.94rem] leading-relaxed text-[var(--ink)]">
            В вашей матрице посчитаны все энергии — открыто пока {free.length}. За остальными {locked.length} стоят ответы
            на самые частые вопросы: почему деньги приходят рывками, откуда берётся один и тот же сценарий в отношениях,
            что вы повторяете за родом и куда вам действительно стоит идти в этом году. Каждая энергия у вас уже есть —
            остаётся прочитать её про вас.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {locked.slice(0, 4).map((section, index) => (
              <LockedCard key={section.id} section={section} index={index} />
            ))}
          </div>
        </section>
      ) : null}

      <SimpleSection
        chart={chart}
        admin={admin}
        highlight={highlight}
        onHighlight={setHighlight}
        onRequest={() => setAskGuide(true)}
      />

      <GuidesSection
        chart={chart}
        date={date}
        summary={summary}
        details={matrixDetails(chart, date, interpretation)}
        admin={admin}
        guideRequest={guideRequest}
        askGuide={askGuide}
        setAskGuide={setAskGuide}
      />

      {admin ? null : (
        <LeadForm
          direction="matrix"
          summary={summary}
          details={matrixDetails(chart, date, interpretation)}
          birth={date}
        />
      )}
    </div>
  );
}

/**
 * «Матрица простыми словами»: короткие бытовые ответы по точкам схемы.
 *
 * Гостю открыто несколько пунктов (`matrixSimpleCount` в config.js), остальные
 * видны темой и открываются вместе с гайдом. Владелец видит все.
 */
function SimpleSection({
  chart,
  admin,
  highlight,
  onHighlight,
  onRequest,
}: {
  chart: MatrixChart;
  admin: boolean;
  highlight: string[] | null;
  onHighlight: (keys: string[] | null) => void;
  onRequest: () => void;
}) {
  const config = getConfig();
  const freeCount = admin ? 999 : Number(config.freeResult.matrixSimpleCount ?? 4);
  const items = buildSimpleGuide(chart, { freeCount, includePremium: admin });

  return (
    <section className="grid gap-3" id="simple">
      <h2 className="h-section">Матрица простыми словами</h2>
      <p className="max-w-[62ch] text-[0.94rem] leading-relaxed text-[var(--ink)]">
        Короткие ответы на бытовые вопросы: каким спортом заниматься, каким тебя видят другие, в чём талант,
        в чём главная задача души, как начинать утро и что даёт ресурс. Каждый ответ взят из конкретной точки
        схемы — нажмите на пункт, и она подсветится.
      </p>
      <SimpleGuideGrid items={items} active={highlight} onHighlight={onHighlight} onRequest={onRequest} />
    </section>
  );
}

/** Сколько гайдов открыто без заявки. */
function guideFreeCount(config: ReturnType<typeof getConfig>): number {
  const value = (config.freeResult as { matrixGuideCount?: number }).matrixGuideCount;
  return typeof value === "number" && value >= 0 ? value : 2;
}

/**
 * Гайды по энергиям: практическая часть к каждой энергии схемы.
 *
 * Гостю открыто несколько гайдов — остальные видны заголовками и темой, шаги
 * и практики закрыты. Кнопка «Получить гайд» открывает форму с контактами.
 * Владелец видит все гайды и кнопку сборки PDF.
 */
function GuidesSection({
  chart,
  date,
  summary,
  details,
  admin,
  guideRequest,
  askGuide,
  setAskGuide,
}: {
  chart: MatrixChart;
  date: string;
  summary: string;
  details: string;
  admin: boolean;
  guideRequest: { auto: boolean; name: string };
  askGuide: boolean;
  setAskGuide: (value: boolean) => void;
}) {
  const config = getConfig();
  const guides = buildMatrixGuides(chart, {
    freeCount: admin ? 999 : guideFreeCount(config),
    includePremium: admin,
  });
  const open = guides.filter((guide) => !guide.premium);
  const closed = guides.filter((guide) => guide.premium);
  const name = guideRequest.name;
  const autoPdf = admin && guideRequest.auto;

  return (
    <section className="grid gap-3" id="guides">
      <h2 className="h-section">{admin ? "Гайды по энергиям" : "Гайды: что делать с вашими энергиями"}</h2>
      <p className="max-w-[62ch] text-[0.94rem] leading-relaxed text-[var(--ink)]">
        У каждой энергии есть практическая часть: как она выглядит в обычной жизни, что делать по шагам,
        практика на неделю и признак того, что энергия работает в плюсе. Делать всё сразу не нужно —
        выберите энергию, которая сейчас отзывается сильнее.
      </p>

      {admin ? (
        <GuidePdfPanel
          chart={chart}
          guides={guides}
          simple={buildSimpleGuide(chart, { freeCount: 999, includePremium: true })}
          birthDate={date}
          defaultName={name}
          auto={autoPdf}
        />
      ) : (
        <div className="card grid gap-3 p-4 sm:p-5">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-[1.2rem] text-[var(--ocean)]">
              Гайд по вашим энергиям
            </h3>
            <p className="mt-1 text-[0.9rem] leading-relaxed text-[var(--ink)]">
              {closed.length > 0
                ? `Открыто ${open.length} из ${guides.length} гайдов. В полном гайде — шаги и практики по всем вашим энергиям.`
                : "Все гайды по вашим энергиям открыты."}
            </p>
          </div>
          {askGuide ? (
            <LeadForm
              direction="matrix"
              variant="guide"
              summary={`Запрос гайда по энергиям Матрицы. ${summary}`}
              details={details}
              birth={date}
              compact
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setAskGuide(true)}>
                Получить гайд
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  const text = guides
                    .filter((guide) => !guide.premium)
                    .map((guide) => guideToText(guide))
                    .join("\n\n");
                  void navigator.clipboard?.writeText(text);
                }}
              >
                Скопировать открытые гайды
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {open.map((guide, index) => (
          <EnergyGuideCard key={guide.id} guide={guide} index={index} />
        ))}
      </div>

      {closed.length > 0 ? (
        <div className="grid gap-3">
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-[1.15rem] text-[var(--ocean)]">
            Гайды, которые открываются после запроса
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {closed.map((guide, index) => (
              <LockedGuideCard key={guide.id} guide={guide} index={index} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Жемчужная плашка для энергий, которые не вошли в схему. */
function EnergyChip({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line-gold)] bg-[linear-gradient(180deg,#fffdfa,#fbf1ea)] py-1 pl-1 pr-3 text-[0.8rem] text-[var(--ink)]">
      <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--line-gold)] bg-white font-[family-name:var(--font-display)] text-[0.95rem] font-semibold text-[var(--ocean)]">
        {value}
      </span>
      {label}
    </span>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[0.75rem] border border-[var(--line)] bg-white p-3">
      <p className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-[1.5rem] leading-none text-[var(--ocean)]">{value}</p>
      <p className="mt-1 text-[0.76rem] text-[var(--ink-soft)]">{note}</p>
    </div>
  );
}
