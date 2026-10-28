"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BirthPlace } from "@/lib/types";
import { PinIcon, SearchIcon } from "@/components/icons";
import { TIMEZONE_SUGGESTIONS } from "@/lib/astronomy/cities";

interface CityResult {
  id: string;
  name: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface CitySearchProps {
  value: BirthPlace | null;
  onChange: (place: BirthPlace | null) => void;
  error?: string;
}

/**
 * Поиск места рождения: локальная база городов (160+ населённых пунктов),
 * плюс ручной ввод координат и часового пояса для остальных случаев.
 */
export function CitySearch({ value, onChange, error }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [manual, setManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "",
    country: "",
    latitude: "",
    longitude: "",
    timezone: "Europe/Moscow",
  });
  const [manualError, setManualError] = useState<string | null>(null);

  const listId = useId();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geo/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { results: CityResult[] };
        setResults(data.results ?? []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectCity = (city: CityResult) => {
    onChange({
      name: city.name,
      region: city.region ?? undefined,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
    });
    setQuery(`${city.name}, ${city.country}`);
    setOpen(false);
    setResults([]);
  };

  const submitManual = () => {
    const latitude = Number(manualForm.latitude.replace(",", "."));
    const longitude = Number(manualForm.longitude.replace(",", "."));
    if (!manualForm.name.trim() || manualForm.name.trim().length < 2) {
      setManualError("Укажите название места");
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setManualError("Широта должна быть числом от -90 до 90");
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setManualError("Долгота должна быть числом от -180 до 180");
      return;
    }
    setManualError(null);
    onChange({
      name: manualForm.name.trim(),
      country: manualForm.country.trim() || "—",
      latitude,
      longitude,
      timezone: manualForm.timezone,
    });
    setManual(false);
    setQuery(manualForm.name.trim());
  };

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    return `${value.name}${value.region ? `, ${value.region}` : ""}, ${value.country}`;
  }, [value]);

  if (manual) {
    return (
      <div className="grid gap-3" ref={containerRef}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor={`${inputId}-name`}>Название места</label>
            <input
              id={`${inputId}-name`}
              className="input"
              value={manualForm.name}
              onChange={(event) => setManualForm({ ...manualForm, name: event.target.value })}
              placeholder="Например, посёлок Северный"
            />
          </div>
          <div className="field">
            <label htmlFor={`${inputId}-country`}>Страна</label>
            <input
              id={`${inputId}-country`}
              className="input"
              value={manualForm.country}
              onChange={(event) => setManualForm({ ...manualForm, country: event.target.value })}
              placeholder="Россия"
            />
          </div>
          <div className="field">
            <label htmlFor={`${inputId}-lat`}>Широта</label>
            <input
              id={`${inputId}-lat`}
              className="input"
              inputMode="decimal"
              value={manualForm.latitude}
              onChange={(event) => setManualForm({ ...manualForm, latitude: event.target.value })}
              placeholder="55.7558"
            />
            <span className="field__hint">Север — положительное значение, юг — отрицательное</span>
          </div>
          <div className="field">
            <label htmlFor={`${inputId}-lon`}>Долгота</label>
            <input
              id={`${inputId}-lon`}
              className="input"
              inputMode="decimal"
              value={manualForm.longitude}
              onChange={(event) => setManualForm({ ...manualForm, longitude: event.target.value })}
              placeholder="37.6173"
            />
            <span className="field__hint">Восток — положительное значение, запад — отрицательное</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${inputId}-tz`}>Часовой пояс места рождения</label>
          <select
            id={`${inputId}-tz`}
            className="select"
            value={manualForm.timezone}
            onChange={(event) => setManualForm({ ...manualForm, timezone: event.target.value })}
          >
            {TIMEZONE_SUGGESTIONS.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <span className="field__hint">
            Пояс нужен, чтобы корректно пересчитать местное время рождения в UTC с учётом исторического летнего времени.
          </span>
        </div>
        {manualError ? <p className="field__error">{manualError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn--primary btn--sm" onClick={submitManual}>
            Использовать эти координаты
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setManual(false)}>
            Вернуться к поиску
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid gap-2" ref={containerRef}>
      <label htmlFor={inputId} className="field__label">
        Город рождения
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          id={inputId}
          className="input pl-10"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          autoComplete="off"
          value={query}
          placeholder="Начните вводить город — например, Казань"
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              selectCity(results[activeIndex]!);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      {open && (results.length > 0 || loading) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-white p-1 shadow-[var(--shadow-card)]"
        >
          {loading && results.length === 0 ? (
            <li className="px-3 py-2 text-[0.86rem] text-[var(--ink-soft)]">Ищем город…</li>
          ) : null}
          {results.map((city, index) => (
            <li key={city.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                  index === activeIndex ? "bg-[rgba(184,221,224,0.35)]" : "hover:bg-[rgba(184,221,224,0.22)]"
                }`}
                onClick={() => selectCity(city)}
              >
                <PinIcon className="h-4 w-4 shrink-0 text-[var(--turquoise-deep)]" />
                <span className="min-w-0">
                  <span className="block truncate text-[0.92rem] font-medium text-[var(--ocean)]">
                    {city.name}
                    {city.region ? <span className="text-[var(--ink-soft)]">, {city.region}</span> : null}
                  </span>
                  <span className="block truncate text-[0.75rem] text-[var(--ink-soft)]">
                    {city.country} · {city.timezone}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {!loading && results.length === 0 ? (
            <li className="px-3 py-2 text-[0.86rem] text-[var(--ink-soft)]">Ничего не нашли</li>
          ) : null}
        </ul>
      ) : null}

      {value ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[rgba(184,221,224,0.8)] bg-[rgba(244,251,251,0.9)] px-3 py-2 text-[0.82rem] text-[var(--ocean)]">
          <PinIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
          <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
          <span className="text-[var(--ink-soft)]">
            {value.latitude.toFixed(3)}, {value.longitude.toFixed(3)} · {value.timezone}
          </span>
        </div>
      ) : null}

      {error ? <p className="field__error">{error}</p> : null}

      <button
        type="button"
        className="justify-self-start text-[0.8rem] text-[var(--turquoise-deep)] underline decoration-dotted underline-offset-4 hover:text-[var(--ocean)]"
        onClick={() => {
          setManual(true);
          setManualForm((form) => ({
            ...form,
            name: value?.name ?? query,
            country: value?.country ?? "",
            latitude: value ? String(value.latitude) : "",
            longitude: value ? String(value.longitude) : "",
            timezone: value?.timezone ?? "Europe/Moscow",
          }));
        }}
      >
        Нет моего города — указать координаты вручную
      </button>
    </div>
  );
}
