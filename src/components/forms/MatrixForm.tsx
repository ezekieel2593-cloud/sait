"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, CrystalIcon } from "@/components/icons";

/** Форма Матрицы судьбы: методике нужна только дата рождения. */
export function MatrixForm() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    if (!date) {
      setError("Укажите дату рождения");
      return;
    }
    const year = Number(date.slice(0, 4));
    if (year < 1900) {
      setError("Поддерживаются годы с 1900");
      return;
    }
    if (date > todayIso) {
      setError("Дата не может быть в будущем");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/charts/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = (await response.json()) as { redirectTo?: string; error?: string; fields?: Record<string, string> };
      if (!response.ok || !data.redirectTo) {
        setServerError(data.error ?? "Не удалось выполнить расчёт");
        if (data.fields?.date) setError(data.fields.date);
        setSubmitting(false);
        return;
      }
      router.push(data.redirectTo);
    } catch {
      setServerError("Сеть недоступна. Проверьте соединение и попробуйте снова.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="card" noValidate>
      <div className="flex items-center gap-3">
        <span className="icon-badge icon-badge--gold"><CrystalIcon className="h-5 w-5" /></span>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] text-[var(--ocean)]">Дата рождения</h2>
          <p className="text-[0.84rem] text-[var(--ink-soft)]">Больше ничего не нужно: метод работает только с датой.</p>
        </div>
      </div>

      <div className="mt-5 field">
        <label htmlFor="matrix-date">Дата рождения</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <input
            id="matrix-date"
            type="date"
            className="input pl-10"
            min="1900-01-01"
            max={todayIso}
            value={date}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setDate(event.target.value);
              setError(null);
            }}
          />
        </div>
        {error ? <p className="field__error">{error}</p> : null}
        <span className="field__hint">Время и место рождения для этой методики не используются.</span>
      </div>

      {serverError ? (
        <div className="note note--warn mt-3" role="alert">
          <p>{serverError}</p>
        </div>
      ) : null}

      <button type="submit" className="btn btn--primary btn--block mt-5" disabled={submitting} data-state={submitting ? "loading" : undefined}>
        {submitting ? "Строим матрицу" : "Рассчитать матрицу"}
      </button>
      <p className="mt-3 text-center text-[0.78rem] text-[var(--ink-faint)]">
        Бесплатно · без регистрации · результат сразу на экране
      </p>
    </form>
  );
}
