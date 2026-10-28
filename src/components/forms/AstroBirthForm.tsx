"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BirthPlace, TimeAccuracy } from "@/lib/types";
import { CitySearch } from "./CitySearch";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, ClockIcon, PinIcon, StarIcon } from "@/components/icons";

const STEPS = ["Дата рождения", "Время рождения", "Место рождения", "Проверка данных"] as const;
const DRAFT_KEY = "astra-birth-draft-v1";

interface Draft {
  date: string;
  timeAccuracy: TimeAccuracy;
  time: string;
  place: BirthPlace | null;
}

const EMPTY_DRAFT: Draft = { date: "", timeAccuracy: "exact", time: "", place: null };

export function AstroBirthForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  // Восстановление введённых данных при переходах и возврате на страницу
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Draft;
        if (parsed && typeof parsed === "object" && parsed.date) {
          setDraft({ ...EMPTY_DRAFT, ...parsed });
          setRestored(true);
        }
      }
    } catch {
      /* приватный режим */
    }
  }, []);

  useEffect(() => {
    if (!draft.date && !draft.place) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* игнорируем */
    }
  }, [draft]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const validateStep = (index: number): boolean => {
    const next: Record<string, string> = {};
    if (index === 0) {
      if (!draft.date) next.date = "Укажите дату рождения";
      else {
        const year = Number(draft.date.slice(0, 4));
        if (year < 1900) next.date = "Поддерживаются годы с 1900";
        else if (draft.date > todayIso) next.date = "Дата не может быть в будущем";
      }
    }
    if (index === 1) {
      if (draft.timeAccuracy !== "unknown" && !draft.time) next.time = "Укажите время или выберите «время неизвестно»";
    }
    if (index === 2) {
      if (!draft.place) next.place = "Выберите город рождения из списка";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrors({});
    setServerError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const submit = async () => {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const response = await fetch("/api/charts/astrology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: draft.date,
          timeAccuracy: draft.timeAccuracy,
          time: draft.timeAccuracy === "unknown" ? null : draft.time,
          place: draft.place,
        }),
      });
      const data = (await response.json()) as {
        redirectTo?: string;
        error?: string;
        fields?: Record<string, string>;
      };
      if (!response.ok || !data.redirectTo) {
        setServerError(data.error ?? "Не удалось выполнить расчёт");
        if (data.fields) setErrors(data.fields);
        setSubmitting(false);
        return;
      }
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* игнорируем */
      }
      router.push(data.redirectTo);
    } catch {
      setServerError("Сеть недоступна. Проверьте соединение и попробуйте снова.");
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          Шаг {step + 1} из {STEPS.length}
        </p>
        <p className="text-[0.82rem] text-[var(--ink-soft)]">{STEPS[step]}</p>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(37,61,75,0.1)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Прогресс заполнения формы"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--turquoise-deep),var(--gold))] transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {restored && step === 0 ? (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-[rgba(184,221,224,0.22)] px-3 py-2 text-[0.8rem] text-[var(--ocean)]">
          Мы восстановили ранее введённые данные. Можно продолжить или изменить их.
        </p>
      ) : null}

      <div className="mt-6 min-h-[240px]">
        {step === 0 ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <span className="icon-badge"><CalendarIcon className="h-5 w-5" /></span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] text-[var(--ocean)]">Когда вы родились?</h2>
                <p className="text-[0.84rem] text-[var(--ink-soft)]">Дата нужна для расчёта положений планет.</p>
              </div>
            </div>
            <div className="field">
              <label htmlFor="birth-date">Дата рождения</label>
              <input
                id="birth-date"
                type="date"
                className="input"
                min="1900-01-01"
                max={todayIso}
                value={draft.date}
                aria-invalid={Boolean(errors.date)}
                onChange={(event) => {
                  setDraft({ ...draft, date: event.target.value });
                  setErrors({ ...errors, date: "" });
                }}
              />
              {errors.date ? <p className="field__error">{errors.date}</p> : null}
              <span className="field__hint">Данные используются только для расчёта и не публикуются.</span>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <span className="icon-badge"><ClockIcon className="h-5 w-5" /></span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] text-[var(--ocean)]">Во сколько вы родились?</h2>
                <p className="text-[0.84rem] text-[var(--ink-soft)]">
                  Время определяет асцендент и дома карты. Если его нет — покажем карту без домов.
                </p>
              </div>
            </div>

            <div className="grid gap-2.5">
              {(
                [
                  { value: "exact", title: "Точное время известно", desc: "Из свидетельства о рождении или записи родителей" },
                  { value: "approx", title: "Время известно приблизительно", desc: "Например, «около семи утра»" },
                  { value: "unknown", title: "Время рождения неизвестно", desc: "Рассчитаем на 12:00 и честно покажем ограничения" },
                ] as const
              ).map((option) => (
                <label key={option.value} className="radio-card">
                  <input
                    type="radio"
                    name="time-accuracy"
                    value={option.value}
                    checked={draft.timeAccuracy === option.value}
                    onChange={() => {
                      setDraft({ ...draft, timeAccuracy: option.value });
                      setErrors({ ...errors, time: "" });
                    }}
                  />
                  <span>
                    <span className="radio-card__title">{option.title}</span>
                    <span className="radio-card__desc">{option.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            {draft.timeAccuracy !== "unknown" ? (
              <div className="field">
                <label htmlFor="birth-time">Время рождения (местное)</label>
                <input
                  id="birth-time"
                  type="time"
                  className="input max-w-[200px]"
                  value={draft.time}
                  aria-invalid={Boolean(errors.time)}
                  onChange={(event) => {
                    setDraft({ ...draft, time: event.target.value });
                    setErrors({ ...errors, time: "" });
                  }}
                />
                {errors.time ? <p className="field__error">{errors.time}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <span className="icon-badge"><PinIcon className="h-5 w-5" /></span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] text-[var(--ocean)]">Где вы родились?</h2>
                <p className="text-[0.84rem] text-[var(--ink-soft)]">
                  Координаты и часовой пояс нужны, чтобы пересчитать местное время в UTC с учётом исторического летнего времени.
                </p>
              </div>
            </div>
            <CitySearch
              value={draft.place}
              onChange={(place) => {
                setDraft({ ...draft, place });
                setErrors({ ...errors, place: "" });
              }}
              error={errors.place}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <span className="icon-badge icon-badge--gold"><StarIcon className="h-5 w-5" /></span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] text-[var(--ocean)]">Проверьте данные</h2>
                <p className="text-[0.84rem] text-[var(--ink-soft)]">Если что-то не так — вернитесь на нужный шаг.</p>
              </div>
            </div>

            <dl className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line)]">
              <ReviewRow label="Дата рождения" value={formatDate(draft.date)} onEdit={() => setStep(0)} />
              <ReviewRow
                label="Время рождения"
                value={
                  draft.timeAccuracy === "unknown"
                    ? "Неизвестно (расчёт на 12:00)"
                    : `${draft.time || "—"}${draft.timeAccuracy === "approx" ? " (приблизительно)" : ""}`
                }
                onEdit={() => setStep(1)}
              />
              <ReviewRow
                label="Место рождения"
                value={draft.place ? `${draft.place.name}, ${draft.place.country}` : "—"}
                onEdit={() => setStep(2)}
              />
              <ReviewRow
                label="Координаты и пояс"
                value={
                  draft.place
                    ? `${draft.place.latitude.toFixed(3)}, ${draft.place.longitude.toFixed(3)} · ${draft.place.timezone}`
                    : "—"
                }
              />
            </dl>

            {draft.timeAccuracy !== "exact" ? (
              <div className="note">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {draft.timeAccuracy === "unknown"
                    ? "Без времени рождения асцендент и дома не будут выданы как достоверные. Планеты рассчитаны на полдень."
                    : "Приблизительное время даёт погрешность асцендента примерно 1° на каждые 4 минуты."}
                </p>
              </div>
            ) : null}

            {serverError ? (
              <div className="note note--warn" role="alert">
                <p>{serverError}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={goBack}
          disabled={step === 0 || submitting}
          aria-label="Вернуться на предыдущий шаг"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Назад
        </button>

        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn--primary" onClick={goNext}>
            Далее
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={submit}
            disabled={submitting}
            data-state={submitting ? "loading" : undefined}
          >
            {submitting ? "Считаем карту" : "Рассчитать карту"}
            {!submitting ? <StarIcon className="h-4 w-4" /> : null}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
      <div className="min-w-0">
        <dt className="text-[0.74rem] uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</dt>
        <dd className="truncate text-[0.92rem] text-[var(--ocean)]">{value}</dd>
      </div>
      {onEdit ? (
        <button type="button" className="shrink-0 text-[0.8rem] text-[var(--turquoise-deep)] underline" onClick={onEdit}>
          изменить
        </button>
      ) : null}
    </div>
  );
}

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
