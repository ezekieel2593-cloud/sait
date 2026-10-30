import { useState } from "react";
import { getConfig, mailtoLink, telegramLink } from "../config";
import { validateContact } from "@/lib/validation";
import type { ContactChannel, Direction } from "@/lib/types";
import { ArrowRightIcon, CheckIcon, CopyIcon } from "./icons";
import { DocumentIcon, ShieldIcon } from "./icons-extra";

/**
 * Заявка в статической версии.
 *
 * Сервера нет, поэтому заявка не сохраняется в базе: форма собирает готовый
 * текст и открывает диалог в Telegram или письмо в почтовом клиенте. Это
 * честно показано пользователю — никакой «успешной отправки» без доставки.
 */
export function LeadForm({
  direction,
  summary,
  details = "",
  birth = "",
  place = "",
  compact = false,
  onSent,
}: {
  direction: Direction;
  summary: string;
  /**
   * Полный расчёт для кабинета специалиста (все планеты, дома, аспекты,
   * все точки Матрицы). Клиент его не видит — он уходит вместе с заявкой.
   */
  details?: string;
  /** Строка с данными рождения: «1992-06-23, 14:30 · Москва». */
  birth?: string;
  place?: string;
  compact?: boolean;
  /** Вызывается после того, как заявка принята сервером. */
  onSent?: () => void;
}) {
  const config = getConfig();
  const [form, setForm] = useState({
    name: "",
    channel: (config.contacts.telegram ? "telegram" : config.contacts.email ? "email" : "telegram") as ContactChannel,
    contact: "",
    question: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState<{ reference: string; delivered: string[] } | null>(null);

  const apiEnabled = Boolean(config.api?.enabled);
  const apiUrl = `${config.api?.base || "api"}/lead.php`;

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Укажите имя или обращение";
    const contactError = validateContact(form.channel, form.contact);
    if (contactError) next.contact = contactError;
    if (!form.consent) next.consent = "Нужно согласие на обработку данных";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    if (apiEnabled) {
      setSending(true);
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            direction,
            channel: form.channel,
            contact: form.contact.trim(),
            question: form.question.trim(),
            consent: true,
            calc: summary,
            details,
            birth,
            place,
            trap: "",
          }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          reference?: string;
          delivered?: string[];
          error?: string;
          fields?: Record<string, string>;
        };
        if (!response.ok || !data.ok || !data.reference) {
          setErrors(data.fields ?? {});
          setErrors((current) => ({ ...current, form: data.error ?? "Не удалось отправить заявку" }));
          setSending(false);
          return;
        }
        setSaved({ reference: data.reference, delivered: data.delivered ?? [] });
        onSent?.();
      } catch {
        setErrors({ form: "Сеть недоступна. Попробуйте отправить заявку ещё раз." });
      } finally {
        setSending(false);
      }
      return;
    }

    const channelLabel =
      form.channel === "telegram" ? "Telegram" : form.channel === "max" ? "MAX" : "Email";
    const text = [
      `Заявка на полный разбор (${direction === "astrology" ? "Астрология" : "Матрица судьбы"})`,
      "",
      `Имя: ${form.name.trim()}`,
      `Связь: ${channelLabel} — ${form.contact.trim()}`,
      form.question.trim() ? `Вопрос: ${form.question.trim()}` : "",
      "",
      "Данные расчёта:",
      summary,
      "",
      "Согласие на обработку персональных данных получено.",
    ]
      .filter(Boolean)
      .join("\n");

    setMessage(text);
    setCopied(false);
  };

  const copy = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const tg = message ? telegramLink(config, message) : null;
  const mail = message ? mailtoLink(config, message, "Заявка на полный разбор") : null;

  if (saved) {
    return (
      <div className="card animate-in" role="status" aria-live="polite">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-[rgba(184,221,224,0.9)] bg-[rgba(244,251,251,0.95)] text-[var(--turquoise-deep)]">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-[1.55rem] text-[var(--ocean)]">Заявка принята</h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--ink)]">
          Номер вашей заявки — <strong className="text-[var(--ocean)]">{saved.reference}</strong>. Специалист свяжется
          с вами по выбранному каналу связи.
        </p>
        <p className="note note--info mt-3 text-[0.84rem]">
          Если в течение дня ответа нет — напишите ещё раз: заявка могла не дойти.
        </p>
        <p className="mt-3 text-[0.82rem] text-[var(--ink-soft)]">
          Сохраните номер: по нему проще найти переписку. Данные хранятся не дольше{" "}
          {config.legal.dataRetentionDays} дней и удаляются по запросу.
        </p>
      </div>
    );
  }

  if (message) {
    return (
      <div className="card animate-in" role="status" aria-live="polite">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-[rgba(184,221,224,0.9)] bg-[rgba(244,251,251,0.95)] text-[var(--turquoise-deep)]">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-[1.55rem] text-[var(--ocean)]">Заявка готова к отправке</h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--ink)]">
          Текст сформирован. Отправьте его специалисту в Telegram или письмом — переписка и будет вашей заявкой.
          После отправки специалист подтвердит получение.
        </p>

        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-[12px] border border-[var(--line)] bg-[#fbfbfc] p-3 text-[0.82rem] leading-relaxed text-[var(--ink)]">
{message}
        </pre>

        <div className="mt-3 flex flex-wrap gap-2">
          {tg ? (
            <a href={tg} target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--sm">
              Открыть Telegram <ArrowRightIcon className="h-4 w-4" />
            </a>
          ) : null}
          {mail ? (
            <a href={mail} className="btn btn--secondary btn--sm">
              Написать на почту
            </a>
          ) : null}
          <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? "Скопировано" : "Скопировать текст"}
          </button>
        </div>

        {!tg && !mail ? (
          <div className="note note--warn mt-3">
            <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Владелец ещё не указал контакты в файле <code>config.js</code>. Скопируйте текст и отправьте его удобным
              способом — либо попросите владельца заполнить раздел <code>contacts</code>.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "grid gap-3" : "card grid gap-4"} noValidate>
      {!compact ? (
        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[1.45rem] text-[var(--ocean)]">
            <DocumentIcon className="h-5 w-5 text-[var(--turquoise-deep)]" />
            Заявка на полный разбор
          </h2>
          <p className="mt-1 text-[0.9rem] text-[var(--ink-soft)]">
            Специалист получит ваши данные рождения и вопрос. Ответ — в выбранном вами канале.
          </p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="lead-name">Как к вам обращаться</label>
        <input
          id="lead-name"
          className="input"
          value={form.name}
          aria-invalid={Boolean(errors.name)}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Имя"
        />
        {errors.name ? <p className="field__error">{errors.name}</p> : null}
      </div>

      <fieldset className="field">
        <legend className="field__label">Удобный канал связи</legend>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
          {(
            [
              ["telegram", "Telegram"],
              ["max", "MAX"],
              ["email", "Email"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`radio-card cursor-pointer ${form.channel === value ? "radio-card--active" : ""}`}
              data-active={form.channel === value}
            >
              <input
                type="radio"
                name="channel"
                value={value}
                checked={form.channel === value}
                onChange={() => {
                  update("channel", value);
                  update("contact", "");
                }}
                className="sr-only"
              />
              <span className="text-[0.9rem] font-medium text-[var(--ocean)]">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="lead-contact">
          {form.channel === "email" ? "Адрес почты" : "Ник или телефон в мессенджере"}
        </label>
        <input
          id="lead-contact"
          className="input"
          value={form.contact}
          aria-invalid={Boolean(errors.contact)}
          onChange={(event) => update("contact", event.target.value)}
          placeholder={form.channel === "email" ? "you@example.com" : "@username или +7…"}
        />
        {errors.contact ? <p className="field__error">{errors.contact}</p> : null}
      </div>

      {errors.form ? (
        <div className="note note--warn" role="alert">
          <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{errors.form}</p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="lead-question">Вопрос или тема разбора</label>
        <textarea
          id="lead-question"
          className="textarea"
          rows={4}
          maxLength={1000}
          value={form.question}
          onChange={(event) => update("question", event.target.value)}
          placeholder="Например: хочу разобрать тему отношений и смены профессии"
        />
        <span className="field__hint">{form.question.length}/1000</span>
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
          <a href="privacy.html" className="underline decoration-dotted underline-offset-2">
            политикой конфиденциальности
          </a>
          .
        </span>
      </label>
      {errors.consent ? <p className="field__error">{errors.consent}</p> : null}

      {apiEnabled ? (
        <div className="note note--info">
          <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Заявка сразу уходит специалисту. Данные используются только для подготовки ответа. Нажимая кнопку,
            вы подтверждаете согласие на обработку персональных данных.
          </p>
        </div>
      ) : (
        <div className="note note--info">
          <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Эта версия сайта работает без сервера: заявка не сохраняется в базе, а формируется как сообщение, которое вы
            отправляете сами. Данные не покидают устройство, пока вы не нажмёте «Открыть Telegram» или «Написать на почту».
          </p>
        </div>
      )}

      <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={sending} data-state={sending ? "loading" : undefined}>
        {sending ? "Отправляем" : apiEnabled ? "Отправить заявку" : "Сформировать заявку"}
      </button>
    </form>
  );
}
