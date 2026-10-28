"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContactChannel, Direction } from "@/lib/types";
import { CHANNEL_LABELS, CONTACT_CHANNELS, DIRECTION_LABELS } from "@/lib/types";
import { CheckIcon, MessageIcon, SendIcon, ShieldIcon } from "@/components/icons";

interface ServiceOption {
  id: string;
  title: string;
}

interface LeadFormProps {
  direction: Direction;
  calculationId?: string | null;
  services: ServiceOption[];
  defaultServiceId?: string | null;
  compact?: boolean;
}

const CONTACT_HINTS: Record<ContactChannel, { label: string; placeholder: string; type: string; inputMode?: "email" | "tel" | "text" }> = {
  telegram: { label: "Telegram", placeholder: "@username или +7 999 123-45-67", type: "text" },
  max: { label: "MAX", placeholder: "+7 999 123-45-67 или @username", type: "text" },
  email: { label: "Электронная почта", placeholder: "you@example.com", type: "email", inputMode: "email" },
};

export function LeadForm({ direction, calculationId, services, defaultServiceId, compact = false }: LeadFormProps) {
  const [form, setForm] = useState({
    name: "",
    serviceId: defaultServiceId ?? services[0]?.id ?? "",
    channel: "telegram" as ContactChannel,
    contact: "",
    question: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ reference: string; delivered: string[]; failed: string[] } | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);
    const nextErrors: Record<string, string> = {};

    if (form.name.trim().length < 2) nextErrors.name = "Укажите имя или обращение";
    if (form.contact.trim().length < 3) nextErrors.contact = "Укажите контакт для связи";
    if (!form.consent) nextErrors.consent = "Нужно согласие на обработку данных";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          direction,
          serviceId: form.serviceId || null,
          channel: form.channel,
          contact: form.contact,
          question: form.question || null,
          consent: form.consent,
          calculationId: calculationId ?? null,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        reference?: string;
        delivered?: string[];
        failed?: string[];
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok || !data.ok || !data.reference) {
        setServerError(data.error ?? "Не удалось отправить заявку");
        if (data.fields) setErrors(data.fields);
        setSubmitting(false);
        return;
      }

      setSuccess({ reference: data.reference, delivered: data.delivered ?? [], failed: data.failed ?? [] });
    } catch {
      setServerError("Сеть недоступна. Попробуйте отправить ещё раз.");
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="card animate-in" role="status" aria-live="polite">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-[rgba(184,221,224,0.9)] bg-[rgba(244,251,251,0.95)] text-[var(--turquoise-deep)]">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-[1.6rem] text-[var(--ocean)]">Заявка сохранена</h2>
        <p className="mt-2 text-[0.94rem] leading-relaxed text-[var(--ink)]">
          Номер вашей заявки — <strong className="text-[var(--ocean)]">{success.reference}</strong>. Специалист увидит её
          в кабинете и свяжется с вами удобным способом в течение рабочего дня.
        </p>
        <dl className="mt-4 grid gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/70 p-4 text-[0.86rem]">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--ink-soft)]">Направление</dt>
            <dd className="text-[var(--ocean)]">{DIRECTION_LABELS[direction]}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--ink-soft)]">Способ связи</dt>
            <dd className="text-[var(--ocean)]">{CHANNEL_LABELS[form.channel]}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--ink-soft)]">Контакт</dt>
            <dd className="truncate text-[var(--ocean)]">{form.contact}</dd>
          </div>
        </dl>
        {success.failed.length > 0 || success.delivered.length === 0 ? (
          <p className="mt-3 text-[0.8rem] text-[var(--ink-soft)]">
            Заявка уже в базе. Если специалист не ответит в течение дня — напишите на почту, указанную в разделе
            «Контакты».
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className="btn btn--secondary btn--sm">
            На главную
          </Link>
          <Link href={`/${direction === "astrology" ? "matrix" : "astrology"}`} className="btn btn--ghost btn--sm">
            Попробовать другое направление
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`card ${compact ? "" : "lg:p-7"}`} noValidate>
      <div className="flex items-center gap-3">
        <span className="icon-badge icon-badge--gold"><SendIcon className="h-5 w-5" /></span>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] text-[var(--ocean)]">Заявка на полный разбор</h2>
          <p className="text-[0.84rem] text-[var(--ink-soft)]">
            {direction === "astrology" ? "Астрология" : "Матрица судьбы"} · ответим в течение рабочего дня
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="field">
          <label htmlFor="lead-name">Имя или обращение</label>
          <input
            id="lead-name"
            className="input"
            autoComplete="name"
            value={form.name}
            aria-invalid={Boolean(errors.name)}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Как к вам обращаться"
          />
          {errors.name ? <p className="field__error">{errors.name}</p> : null}
        </div>

        {services.length > 0 ? (
          <div className="field">
            <label htmlFor="lead-service">Что вас интересует</label>
            <select
              id="lead-service"
              className="select"
              value={form.serviceId}
              onChange={(event) => update("serviceId", event.target.value)}
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <fieldset className="field">
          <legend className="field__label">Удобный способ связи</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {CONTACT_CHANNELS.map((channel) => (
              <label key={channel} className="radio-card">
                <input
                  type="radio"
                  name="lead-channel"
                  value={channel}
                  checked={form.channel === channel}
                  onChange={() => {
                    update("channel", channel);
                    setForm((current) => ({ ...current, channel, contact: "" }));
                  }}
                />
                <span className="radio-card__title">{CHANNEL_LABELS[channel]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="lead-contact">{CONTACT_HINTS[form.channel].label}</label>
          <input
            id="lead-contact"
            className="input"
            type={CONTACT_HINTS[form.channel].type}
            inputMode={CONTACT_HINTS[form.channel].inputMode}
            autoComplete={form.channel === "email" ? "email" : "off"}
            value={form.contact}
            aria-invalid={Boolean(errors.contact)}
            onChange={(event) => update("contact", event.target.value)}
            placeholder={CONTACT_HINTS[form.channel].placeholder}
          />
          {errors.contact ? <p className="field__error">{errors.contact}</p> : null}
          <span className="field__hint">
            {form.channel === "email"
              ? "На этот адрес специалист ответит письмом."
              : "Укажите номер или username в мессенджере — без него связаться не получится."}
          </span>
        </div>

        <div className="field">
          <label htmlFor="lead-question">Дополнительный вопрос (необязательно)</label>
          <textarea
            id="lead-question"
            className="textarea"
            value={form.question}
            maxLength={1000}
            onChange={(event) => update("question", event.target.value)}
            placeholder="Например: хочу разобрать тему отношений и смены профессии"
          />
          <span className="field__hint">{form.question.length}/1000</span>
        </div>

        <div className="note note--info">
          <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Специалист получит: имя, способ связи, ваш вопрос, дату и место рождения из расчёта и рассчитанную карту.
            Данные используются только для подготовки ответа.
          </p>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.consent}
            aria-invalid={Boolean(errors.consent)}
            onChange={(event) => update("consent", event.target.checked)}
          />
          <span>
            Согласен(-на) на обработку персональных данных в соответствии с{" "}
            <Link href="/privacy" className="underline decoration-dotted underline-offset-2">
              политикой конфиденциальности
            </Link>
            .
          </span>
        </label>
        {errors.consent ? <p className="field__error">{errors.consent}</p> : null}

        {serverError ? (
          <div className="note note--warn" role="alert">
            <MessageIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{serverError}</p>
          </div>
        ) : null}

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting} data-state={submitting ? "loading" : undefined}>
          {submitting ? "Отправляем" : "Отправить заявку"}
        </button>
        <p className="text-center text-[0.76rem] text-[var(--ink-faint)]">
          Заявка считается отправленной только после подтверждения сохранения на сервере.
        </p>
      </div>
    </form>
  );
}
