import { useMemo, useState } from "react";
import { computeNatalChart, type NatalChart } from "@/lib/astronomy/engine";
import { computeSynastry } from "@/lib/astronomy/forecast";
import { synastrySections } from "@/lib/interpretation/astrology-extra";
import { getConfig } from "../config";
import { CitySearch, type PlaceValue } from "./CitySearch";
import { InterpretationCard } from "@/components/result/InterpretationCard";
import type { TimeAccuracy } from "@/lib/types";

/**
 * Совместимость с партнёром. Отдельная форма: данные второго человека
 * не сохраняются и не уходят на сервер — карта считается в браузере.
 */
export function SynastryPanel({ chart, showAll = false }: { chart: NatalChart; showAll?: boolean }) {
  const config = getConfig();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timeAccuracy, setTimeAccuracy] = useState<TimeAccuracy>("exact");
  const [place, setPlace] = useState<PlaceValue | null>(null);
  const [error, setError] = useState("");
  const [partner, setPartner] = useState<NatalChart | null>(null);

  const sections = useMemo(() => {
    if (!partner) return [];
    // Владельцу — все связи двух карт, гостю — четыре самых точных.
    const all = synastrySections(chart, partner, "партнёр", showAll);
    return showAll ? all : all.slice(0, 4);
  }, [chart, partner, showAll]);

  const synastry = useMemo(() => (partner ? computeSynastry(chart, partner) : null), [chart, partner]);

  function calculate() {
    setError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Укажите дату рождения партнёра");
      return;
    }
    const year = Number(date.slice(0, 4));
    if (year < 1900 || Number.isNaN(year)) {
      setError("Поддерживаются даты с 1900 года");
      return;
    }
    if (timeAccuracy !== "unknown" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError("Укажите время в формате ЧЧ:ММ или выберите «Не знаю»");
      return;
    }
    if (!place) {
      setError("Выберите город из списка или введите координаты");
      return;
    }
    const partnerChart = computeNatalChart(
      {
        date,
        time: timeAccuracy === "unknown" ? null : time,
        timeAccuracy,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
        placeName: `${place.name}, ${place.country}`,
      },
      config.methodology.astrologyHouseSystem
    );
    setPartner(partnerChart);
  }

  return (
    <section id="synastry" className="card gold-frame p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--turquoise-deep)]">Совместимость</p>
          <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-[1.35rem] leading-snug text-[var(--ocean)]">
            Синастрия: ваша карта и карта партнёра
          </h2>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          {open ? "Свернуть" : "Добавить партнёра"}
        </button>
      </div>

      <p className="mt-2 text-[0.86rem] leading-relaxed text-[var(--ink-soft)]">
        Планеты партнёра встают к вашим планетам и в ваши дома. Расчёт идёт в браузере: данные второго человека
        никуда не отправляются и не сохраняются.
      </p>

      {open ? (
        <div className="mt-4 grid gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="syn-date">Дата рождения партнёра</label>
              <input
                id="syn-date"
                type="date"
                className="input"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                min="1900-01-01"
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="syn-time">Время рождения</label>
              <input
                id="syn-time"
                type="time"
                className="input"
                value={time}
                disabled={timeAccuracy === "unknown"}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <span className="text-[0.82rem] text-[var(--ink-soft)]">Насколько известно время</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {(
                [
                  { value: "exact", label: "Точно" },
                  { value: "approx", label: "Примерно" },
                  { value: "unknown", label: "Не знаю" },
                ] as { value: TimeAccuracy; label: string }[]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeAccuracy(option.value)}
                  className={`rounded-full px-3 py-1 text-[0.8rem] transition-colors ${
                    timeAccuracy === option.value
                      ? "bg-[var(--ocean)] text-white"
                      : "bg-[rgba(37,61,75,0.06)] text-[var(--ink-soft)]"
                  }`}
                  aria-pressed={timeAccuracy === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <CitySearch value={place} onChange={setPlace} id="syn-place-input" label="Место рождения партнёра" />
          {error ? <p className="text-[0.82rem] text-[#a9542f]">{error}</p> : null}
          <div>
            <button type="button" className="btn btn--primary" onClick={calculate}>
              Рассчитать совместимость
            </button>
          </div>
          <p className="text-[0.76rem] leading-relaxed text-[var(--ink-faint)]">
            Синастрия показывает, как карты влияют друг на друга. Это не оценка отношений и не прогноз их исхода.
          </p>
        </div>
      ) : null}

      {synastry ? (
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Поддержка", value: synastry.harmonious, tone: "#3b7b83" },
              { label: "Трение", value: synastry.tense, tone: "#a86a5a" },
              { label: "Нейтральные", value: synastry.neutral, tone: "#6a5b62" },
            ].map((item) => (
              <div key={item.label} className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-white p-2.5">
                <p className="text-[0.72rem] uppercase tracking-[0.1em] text-[var(--ink-faint)]">{item.label}</p>
                <p className="mt-0.5 text-[1.15rem] font-semibold" style={{ color: item.tone }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[0.88rem] leading-relaxed text-[var(--ocean)]">{synastry.summary}</p>
          {synastry.overlay.length ? (
            <details className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-white p-3 text-[0.84rem]">
              <summary className="cursor-pointer text-[var(--turquoise-deep)]">
                Планеты партнёра в ваших домах ({synastry.overlay.length})
              </summary>
              <ul className="mt-2 grid gap-1">
                {synastry.overlay.map((hit) => (
                  <li
                    key={hit.fromName}
                    className="flex justify-between gap-2 border-b border-[var(--line)] py-0.5 last:border-0"
                  >
                    <span className="text-[var(--ink-soft)]">{hit.fromName}</span>
                    <span className="text-[var(--ocean)]">{hit.houseTitle}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <div className="grid gap-3">
            {sections.map((section, index) => (
              <InterpretationCard key={section.id} section={{ ...section, premium: false }} index={index} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
