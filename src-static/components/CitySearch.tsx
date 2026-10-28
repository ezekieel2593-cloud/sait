import { useMemo, useState } from "react";
import { searchCities, type City } from "@/lib/astronomy/cities";
import { PinIcon } from "./icons-extra";

export interface PlaceValue {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/**
 * Поиск места рождения по локальному справочнику — тот же список городов,
 * что и в серверной версии, но без запросов к серверу.
 */
export function CitySearch({
  value,
  onChange,
  error,
}: {
  value: PlaceValue | null;
  onChange: (place: PlaceValue | null) => void;
  error?: string;
}) {
  const [query, setQuery] = useState(value ? value.name : "");
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "",
    country: "",
    latitude: "",
    longitude: "",
    timezone: "",
  });

  const results = useMemo(() => (query.trim().length < 2 ? [] : searchCities(query, 8)), [query]);

  const select = (city: City) => {
    onChange({
      name: city.name,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
    });
    setQuery(city.name);
    setOpen(false);
  };

  const applyManual = () => {
    const latitude = Number(manualForm.latitude.replace(",", "."));
    const longitude = Number(manualForm.longitude.replace(",", "."));
    if (!manualForm.name.trim() || !manualForm.timezone.trim()) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    onChange({
      name: manualForm.name.trim(),
      country: manualForm.country.trim() || "—",
      latitude,
      longitude,
      timezone: manualForm.timezone.trim(),
    });
    setQuery(manualForm.name.trim());
    setManual(false);
  };

  return (
    <div className="field">
      <label htmlFor="place-input">Место рождения</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]">
          <PinIcon className="h-4 w-4" />
        </span>
        <input
          id="place-input"
          className="input pl-9"
          type="text"
          value={query}
          placeholder="Начните вводить город"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "place-error" : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value && event.target.value !== value.name) onChange(null);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && results.length > 0 ? (
        <ul className="mt-1 max-h-64 overflow-auto rounded-[12px] border border-[var(--line)] bg-white shadow-[var(--shadow-soft)]">
          {results.map((city) => (
            <li key={`${city.id}-${city.country}`}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-[0.9rem] hover:bg-[rgba(184,221,224,0.16)]"
                onClick={() => select(city)}
              >
                <span className="text-[var(--ocean)]">
                  {city.name}
                  {city.region ? <span className="text-[var(--ink-soft)]">, {city.region}</span> : null}
                </span>
                <span className="shrink-0 text-[0.76rem] text-[var(--ink-faint)]">
                  {city.country} · {city.timezone}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {value ? (
        <p className="field__hint">
          {value.name}, {value.country} · {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)} · {value.timezone}
        </p>
      ) : (
        <p className="field__hint">
          Координаты и часовой пояс подставляются автоматически.{" "}
          <button type="button" className="underline decoration-dotted" onClick={() => setManual((v) => !v)}>
            {manual ? "скрыть ручной ввод" : "ввести координаты вручную"}
          </button>
        </p>
      )}

      {manual ? (
        <div className="mt-2 grid gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[0.8rem]">
            <span className="text-[var(--ink-soft)]">Название</span>
            <input
              className="input py-2"
              value={manualForm.name}
              onChange={(event) => setManualForm({ ...manualForm, name: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-[0.8rem]">
            <span className="text-[var(--ink-soft)]">Страна</span>
            <input
              className="input py-2"
              value={manualForm.country}
              onChange={(event) => setManualForm({ ...manualForm, country: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-[0.8rem]">
            <span className="text-[var(--ink-soft)]">Широта</span>
            <input
              className="input py-2"
              inputMode="decimal"
              placeholder="55.7558"
              value={manualForm.latitude}
              onChange={(event) => setManualForm({ ...manualForm, latitude: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-[0.8rem]">
            <span className="text-[var(--ink-soft)]">Долгота</span>
            <input
              className="input py-2"
              inputMode="decimal"
              placeholder="37.6173"
              value={manualForm.longitude}
              onChange={(event) => setManualForm({ ...manualForm, longitude: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-[0.8rem] sm:col-span-2">
            <span className="text-[var(--ink-soft)]">Часовой пояс (IANA)</span>
            <input
              className="input py-2"
              placeholder="Europe/Moscow"
              value={manualForm.timezone}
              onChange={(event) => setManualForm({ ...manualForm, timezone: event.target.value })}
            />
          </label>
          <div className="sm:col-span-2">
            <button type="button" className="btn btn--secondary btn--sm" onClick={applyManual}>
              Применить координаты
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="field__error" id="place-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
