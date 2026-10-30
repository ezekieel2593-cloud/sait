import { useEffect, useState } from "react";
import { computeNatalChart, type NatalChart } from "@/lib/astronomy/engine";
import { buildAstrologyInterpretation } from "@/lib/interpretation/astrology";
import { NatalWheel } from "@/components/charts/NatalWheel";
import { InterpretationCard, LockedCard } from "@/components/result/InterpretationCard";
import { offsetLabelAt } from "@/lib/astronomy/timezone";
import { getConfig } from "../config";
import { useAdmin } from "../admin";
import { LeadForm } from "../components/LeadForm";
import { CitySearch, type PlaceValue } from "../components/CitySearch";
import { astrologyDetails } from "../details";
import { AdminNote } from "../components/AdminNote";
import { CalendarIcon, ClockIcon } from "../components/icons-extra";
import type { TimeAccuracy } from "@/lib/types";

const STEPS = ["Дата рождения", "Время и точность", "Место рождения"] as const;

const TIME_ACCURACY_OPTIONS: { value: TimeAccuracy; label: string; hint: string }[] = [
  { value: "exact", label: "Знаю точно", hint: "Из документов или со слов родителей" },
  { value: "approx", label: "Примерно", hint: "Плюс-минус час — дома могут сместиться" },
  { value: "unknown", label: "Не знаю", hint: "Асцендент и дома не рассчитываем" },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AstrologyPage() {
  const config = getConfig();
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [timeAccuracy, setTimeAccuracy] = useState<TimeAccuracy>("exact");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState<PlaceValue | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ chart: NatalChart; label: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("d")) {
      // Данные из ссылки: сразу считаем и показываем результат.
      const parsed = parseParams(params);
      if (parsed) {
        setDate(parsed.date);
        setTimeAccuracy(parsed.timeAccuracy);
        setTime(parsed.time ?? "");
        setPlace(parsed.place);
        calculate(parsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateStep(current: number): boolean {
    const next: Record<string, string> = {};
    if (current === 0) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = "Укажите дату рождения";
      else {
        const year = Number(date.slice(0, 4));
        const parsed = new Date(`${date}T00:00:00Z`);
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) next.date = "Такой даты не существует";
        else if (year < 1900 || date > today()) next.date = "Поддерживаются даты с 1900 года и не в будущем";
      }
    }
    if (current === 1 && timeAccuracy !== "unknown" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      next.time = "Укажите время в формате ЧЧ:ММ или выберите «Не знаю»";
    }
    if (current === 2 && !place) next.place = "Выберите город из списка или введите координаты";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function calculate(source?: { date: string; timeAccuracy: TimeAccuracy; time?: string | null; place: PlaceValue }) {
    const input = source ?? { date, timeAccuracy, time: timeAccuracy === "unknown" ? null : time, place: place! };
    const chart = computeNatalChart(
      {
        date: input.date,
        time: input.timeAccuracy === "unknown" ? null : input.time ?? null,
        timeAccuracy: input.timeAccuracy,
        latitude: input.place.latitude,
        longitude: input.place.longitude,
        timezone: input.place.timezone,
        placeName: `${input.place.name}, ${input.place.country}`,
      },
      config.methodology.astrologyHouseSystem
    );
    const label = `${input.date}${input.timeAccuracy === "unknown" ? "" : `, ${input.time}`}, ${input.place.name}`;
    setResult({ chart, label });
    const query = new URLSearchParams({
      d: input.date,
      a: input.timeAccuracy,
      ...(input.timeAccuracy === "unknown" || !input.time ? {} : { t: input.time }),
      la: String(input.place.latitude),
      lo: String(input.place.longitude),
      tz: input.place.timezone,
      p: input.place.name,
      c: input.place.country,
    });
    window.history.replaceState(null, "", `?${query.toString()}`);
  }

  return (
    <div className="container py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="eyebrow">Астрология</p>
          <h1 className="h-display mt-3">Натальная карта с реальными расчётами</h1>
          <p className="lead mt-4">
            Планеты, знаки, асцендент, дома и аспекты считаются по эфемеридам с учётом исторического часового пояса
            места рождения. Если время рождения неизвестно, дома и асцендент не выдаются как достоверные.
          </p>

          <div className="card mt-6">
            <ol className="flex flex-wrap items-center gap-2 text-[0.8rem]" aria-label="Этапы формы">
              {STEPS.map((label, index) => (
                <li key={label} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => index < step && setStep(index)}
                    className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                      index === step
                        ? "bg-[var(--ocean)] text-white"
                        : index < step
                          ? "bg-[rgba(169,214,236,0.42)] text-[#1d4a60]"
                          : "bg-[rgba(37,61,75,0.06)] text-[var(--ink-faint)]"
                    }`}
                    aria-current={index === step ? "step" : undefined}
                  >
                    {index + 1}. {label}
                  </button>
                </li>
              ))}
            </ol>

            <div className="mt-4 grid gap-3">
              {step === 0 ? (
                <div className="field">
                  <label htmlFor="astro-date">Дата рождения</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]">
                      <CalendarIcon className="h-4 w-4" />
                    </span>
                    <input
                      id="astro-date"
                      className="input input--date"
                      type="date"
                      min="1900-01-01"
                      max={today()}
                      value={date}
                      aria-invalid={Boolean(errors.date)}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </div>
                  {errors.date ? <p className="field__error">{errors.date}</p> : null}
                </div>
              ) : null}

              {step === 1 ? (
                <>
                  <fieldset className="field">
                    <legend className="field__label">Насколько точно известно время?</legend>
                    <div className="mt-1.5 grid gap-2">
                      {TIME_ACCURACY_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="radio-card cursor-pointer"
                          data-active={timeAccuracy === option.value}
                        >
                          <input
                            type="radio"
                            name="accuracy"
                            className="sr-only"
                            checked={timeAccuracy === option.value}
                            onChange={() => setTimeAccuracy(option.value)}
                          />
                          <span className="text-[0.9rem] font-medium text-[var(--ocean)]">{option.label}</span>
                          <span className="block text-[0.76rem] text-[var(--ink-soft)]">{option.hint}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {timeAccuracy !== "unknown" ? (
                    <div className="field">
                      <label htmlFor="astro-time">Время рождения</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]">
                          <ClockIcon className="h-4 w-4" />
                        </span>
                        <input
                          id="astro-time"
                          className="input input--time"
                          type="time"
                          value={time}
                          aria-invalid={Boolean(errors.time)}
                          onChange={(event) => setTime(event.target.value)}
                        />
                      </div>
                      {errors.time ? <p className="field__error">{errors.time}</p> : null}
                    </div>
                  ) : (
                    <p className="note note--info">
                      Без времени рождения карта строится без домов и асцендента: положения планет остаются точными, а
                      дома недостоверны, поэтому мы их не показываем.
                    </p>
                  )}
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <CitySearch value={place} onChange={setPlace} error={errors.place} />
                  {place ? (
                    <p className="field__hint">
                      Часовой пояс на дату рождения: {place.timezone}
                      {date ? ` · ${offsetLabelAt(new Date(`${date}T12:00:00Z`), place.timezone)}` : ""}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setStep((value) => Math.max(value - 1, 0))}
                disabled={step === 0}
              >
                Назад
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => {
                    if (validateStep(step)) setStep((value) => value + 1);
                  }}
                >
                  Далее
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    if (validateStep(2)) calculate();
                  }}
                >
                  Рассчитать карту
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
            Методика: тропический зодиак, система домов — {config.methodology.astrologyHouseSystemLabel}, эфемериды
            astronomy-engine (VSOP87/ELP2000), версия алгоритма <code>astro-v1</code>. Всё считается прямо в браузере:
            данные рождения не отправляются на сервер.
          </p>
        </div>

        <div className="grid gap-4">{result ? <AstroResult result={result} /> : null}</div>
      </div>
    </div>
  );
}

function AstroResult({ result }: { result: { chart: NatalChart; label: string } }) {
  const config = getConfig();
  const admin = useAdmin();
  const { chart, label } = result;
  const interpretation = buildAstrologyInterpretation(chart, {
    freeSections: admin ? 999 : config.freeResult.astrologyCardCount,
    includeHouses: true,
    includePremium: admin,
  });
  const free = interpretation.sections.filter((section) => !section.premium);
  const locked = interpretation.sections.filter((section) => section.premium);
  const sun = chart.positions.find((position) => position.key === "sun");
  const moon = chart.positions.find((position) => position.key === "moon");

  const summary = [
    `Натальная карта: ${label}`,
    `Солнце: ${sun?.formatted ?? "—"}`,
    `Луна: ${moon?.formatted ?? "—"}`,
    `Асцендент: ${chart.ascendant?.formatted ?? "не рассчитывался (время неизвестно)"}`,
    `Стихия: ${chart.summary.dominantElement}`,
  ].join("\n");

  return (
    <div className="grid gap-4">
      <section className="card gold-frame p-4 sm:p-6">
        <p className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--turquoise-deep)]">Результат</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-[1.5rem] leading-snug text-[var(--ocean)]">
          {interpretation.headline}
        </h2>
        <p className="mt-1.5 text-[0.84rem] text-[var(--ink-soft)]">{label}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[0.95fr_1.05fr] sm:items-start">
          <figure className="m-0 rounded-[var(--radius-md)] border border-[var(--line)] bg-[linear-gradient(180deg,#fffdfa,#fbf3ec)] p-2">
            <NatalWheel chart={chart} />
            <figcaption className="px-2 pb-1 pt-1 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">
              Карта развёрнута так, что асцендент слева. Внутри — Солнце, на кольце — планеты с домами,
              снаружи — знаки зодиака.
            </figcaption>
          </figure>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Солнце" value={sun ? degreeOnly(sun.formatted) : "—"} note={sun ? `${sun.sign}${sun.house ? ` · ${sun.house} дом` : ""}` : ""} />
              <Metric label="Луна" value={moon ? degreeOnly(moon.formatted) : "—"} note={moon ? `${moon.sign}${moon.house ? ` · ${moon.house} дом` : ""}` : ""} />
              <Metric
                label="Асцендент"
                value={chart.ascendant ? degreeOnly(chart.ascendant.formatted) : "не рассчитан"}
                note={chart.ascendant ? chart.ascendant.sign : "время рождения неизвестно"}
              />
              <Metric label="MC" value={degreeOnly(chart.midheaven.formatted)} note={chart.midheaven.sign} />
            </div>
            <details className="rounded-[0.75rem] border border-[var(--line)] bg-white p-3 text-[0.84rem]">
              <summary className="cursor-pointer text-[var(--turquoise-deep)]">Планеты, дома и аспекты</summary>
              <ul className="mt-2 grid gap-1">
                {chart.positions.map((position) => (
                  <li key={position.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] py-1 last:border-0">
                    <span className="text-[var(--ocean)]">{position.name}</span>
                    <span>{position.formatted}</span>
                    <span className="text-[0.76rem] text-[var(--ink-soft)]">
                      {position.house ? `${position.house} дом` : "дом —"} {position.retrograde ? "· R" : ""}
                    </span>
                  </li>
                ))}
              </ul>
              {chart.houses ? (
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.8rem]">
                  {chart.houses.map((house) => (
                    <p key={house.number} className="flex justify-between gap-2 border-b border-[var(--line)] py-0.5">
                      <span className="text-[var(--ink-soft)]">{house.title}</span>
                      <span className="text-[var(--ocean)]">{house.formatted}</span>
                    </p>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-[0.78rem] text-[var(--ink-soft)]">
                Аспектов в пределах орбисов: {chart.aspects.length}
              </p>
            </details>
          </div>
        </div>

        {chart.warnings.length > 0 ? (
          <div className="note note--warn mt-4">
            <ul className="grid gap-1 text-[0.82rem]">
              {chart.warnings.map((warning) => (
                <li key={warning}>· {warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
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
          <h2 className="h-section">Что ещё видно в вашей карте</h2>
          <p className="max-w-[62ch] text-[0.94rem] leading-relaxed text-[var(--ink)]">
            Мы уже посчитали {locked.length} {locked.length === 1 ? "раздел" : locked.length < 5 ? "раздела" : "разделов"} —
            остальные планеты, их дома и точные аспекты. Именно они объясняют то, что не видно в общих словах: почему
            в одном и том же деле вы выкладываетесь, а отклика нет, и где ваша сила работает на вас без сопротивления.
            Разбираем это вместе — спокойно и под вашу ситуацию.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {locked.slice(0, 4).map((section, index) => (
              <LockedCard key={section.id} section={section} index={index} />
            ))}
          </div>
        </section>
      ) : null}

      {admin ? null : (
        <LeadForm
          direction="astrology"
          summary={summary}
          details={astrologyDetails(chart, label, interpretation)}
          birth={`${chart.birth.date}${chart.birth.time ? `, ${chart.birth.time}` : ""}${chart.birth.timeAccuracy === "unknown" ? " (время неизвестно)" : chart.birth.timeAccuracy === "approx" ? " (примерно)" : ""}`}
          place={chart.birth.placeName || label}
        />
      )}
    </div>
  );
}

/** «10° 22′ Козерог» → «10° 22′»: знак показываем отдельной подписью. */
function degreeOnly(formatted: string): string {
  const match = formatted.match(/^[\d°′\s.]+/);
  return (match ? match[0] : formatted).trim();
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[0.75rem] border border-[var(--line)] bg-white p-3">
      <p className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-[1.3rem] leading-tight text-[var(--ocean)]">{value}</p>
      <p className="mt-0.5 text-[0.72rem] text-[var(--ink-soft)]">{note}</p>
    </div>
  );
}

function parseParams(params: URLSearchParams):
  | { date: string; timeAccuracy: TimeAccuracy; time?: string | null; place: PlaceValue }
  | null {
  const date = params.get("d");
  const accuracy = params.get("a");
  const latitude = Number(params.get("la"));
  const longitude = Number(params.get("lo"));
  const timezone = params.get("tz");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!timezone || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const timeAccuracy: TimeAccuracy = accuracy === "approx" || accuracy === "unknown" ? accuracy : "exact";
  const time = params.get("t");
  if (timeAccuracy !== "unknown" && !time) return null;
  return {
    date,
    timeAccuracy,
    time,
    place: {
      name: params.get("p") || "Место рождения",
      country: params.get("c") || "—",
      latitude,
      longitude,
      timezone,
    },
  };
}

