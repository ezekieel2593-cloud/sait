"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/types";
import { CheckIcon, PlusIcon, CloseIcon } from "@/components/icons";

type Section = "site" | "specialist" | "contacts" | "services" | "freeResult" | "methodology" | "legal" | "content";

const TABS: { id: Section; label: string }[] = [
  { id: "site", label: "Сайт" },
  { id: "specialist", label: "Специалист" },
  { id: "contacts", label: "Контакты" },
  { id: "services", label: "Услуги" },
  { id: "freeResult", label: "Бесплатный результат" },
  { id: "methodology", label: "Методика" },
  { id: "content", label: "Отзывы и FAQ" },
  { id: "legal", label: "Данные" },
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [tab, setTab] = useState<Section>("site");
  const [settings, setSettings] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = async (payload: Partial<Settings>) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/specialist/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; settings?: Settings };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Не удалось сохранить настройки");
        return;
      }
      if (data.settings) setSettings(data.settings);
      setMessage("Сохранено");
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1.5 text-[0.82rem] font-medium transition-colors ${
              tab === item.id ? "bg-[var(--ocean)] text-white" : "border border-[var(--line)] bg-white text-[var(--ink)] hover:text-[var(--ocean)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="flex items-center gap-1.5 rounded-[10px] bg-[rgba(184,221,224,0.3)] px-3 py-2 text-[0.82rem] text-[#245b66]">
          <CheckIcon className="h-4 w-4" /> {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[10px] bg-[rgba(198,106,112,0.15)] px-3 py-2 text-[0.82rem] text-[#8d4147]">{error}</p>
      ) : null}

      <div className="rounded-[14px] border border-[var(--line)] bg-white p-4">
        {tab === "site" ? (
          <div className="grid gap-4">
            <Field label="Название проекта">
              <input
                className="input"
                value={settings.site.name}
                onChange={(event) => update("site", { ...settings.site, name: event.target.value })}
              />
            </Field>
            <Field label="Текст логотипа">
              <input
                className="input"
                value={settings.site.logoText}
                onChange={(event) => update("site", { ...settings.site, logoText: event.target.value })}
              />
            </Field>
            <Field label="Подзаголовок (используется в title)" >
              <input
                className="input"
                value={settings.site.tagline}
                onChange={(event) => update("site", { ...settings.site, tagline: event.target.value })}
              />
            </Field>
            <Field label="Описание для поисковиков">
              <textarea
                className="textarea"
                rows={3}
                value={settings.site.description}
                onChange={(event) => update("site", { ...settings.site, description: event.target.value })}
              />
            </Field>
            <Field label="Публичный URL сайта" hint="Нужен для ссылок в уведомлениях и canonical">
              <input
                className="input"
                value={settings.site.siteUrl}
                onChange={(event) => update("site", { ...settings.site, siteUrl: event.target.value })}
              />
            </Field>
            <SaveRow onSave={() => patch({ site: settings.site })} saving={saving} />
          </div>
        ) : null}

        {tab === "specialist" ? (
          <div className="grid gap-4">
            <Field label="Имя специалиста">
              <input
                className="input"
                value={settings.specialist.name}
                onChange={(event) => update("specialist", { ...settings.specialist, name: event.target.value })}
              />
            </Field>
            <Field label="Подпись / специализация">
              <input
                className="input"
                value={settings.specialist.title}
                onChange={(event) => update("specialist", { ...settings.specialist, title: event.target.value })}
              />
            </Field>
            <Field label="О специалисте">
              <textarea
                className="textarea"
                rows={5}
                value={settings.specialist.bio}
                onChange={(event) => update("specialist", { ...settings.specialist, bio: event.target.value })}
              />
            </Field>
            <Field label="Ссылка на фотографию" hint="Например /images/specialist.jpg — файл загружается в public/images">
              <input
                className="input"
                value={settings.specialist.photoUrl}
                onChange={(event) => update("specialist", { ...settings.specialist, photoUrl: event.target.value })}
              />
            </Field>
            <Field label="Примечание о данных" hint="Показывается рядом с профилем">
              <input
                className="input"
                value={settings.specialist.note}
                onChange={(event) => update("specialist", { ...settings.specialist, note: event.target.value })}
              />
            </Field>
            <SaveRow onSave={() => patch({ specialist: settings.specialist })} saving={saving} />
          </div>
        ) : null}

        {tab === "contacts" ? (
          <div className="grid gap-4">
            {(
              [
                ["email", "Email"],
                ["telegram", "Ссылка Telegram"],
                ["max", "Ссылка MAX"],
                ["phone", "Телефон"],
                ["location", "Город / география"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  className="input"
                  value={settings.contacts[key]}
                  onChange={(event) => update("contacts", { ...settings.contacts, [key]: event.target.value })}
                />
              </Field>
            ))}
            <Field label="Email для уведомлений о заявках" hint="На этот адрес придёт письмо о новой заявке (если настроен SMTP)">
              <input
                className="input"
                value={settings.notifications.adminEmail}
                onChange={(event) => update("notifications", { ...settings.notifications, adminEmail: event.target.value })}
              />
            </Field>
            <SaveRow onSave={() => patch({ contacts: settings.contacts, notifications: settings.notifications })} saving={saving} />
          </div>
        ) : null}

        {tab === "services" ? (
          <div className="grid gap-4">
            <ListEditor
              label="Что входит в полный разбор"
              items={settings.services.fullReadingIncludes}
              onChange={(items) => update("services", { ...settings.services, fullReadingIncludes: items })}
            />
            <ListEditor
              label="Формат и организация"
              items={settings.services.fullReadingFormat}
              onChange={(items) => update("services", { ...settings.services, fullReadingFormat: items })}
            />
            <Field label="Стоимость (свободный текст)" hint="Оставьте пустым — на сайте будет корректная пометка «уточняется»">
              <input
                className="input"
                value={settings.services.priceNote}
                onChange={(event) => update("services", { ...settings.services, priceNote: event.target.value })}
              />
            </Field>
            <Field label="Сроки подготовки">
              <input
                className="input"
                value={settings.services.turnaround}
                onChange={(event) => update("services", { ...settings.services, turnaround: event.target.value })}
              />
            </Field>
            <SaveRow onSave={() => patch({ services: settings.services })} saving={saving} />
          </div>
        ) : null}

        {tab === "freeResult" ? (
          <div className="grid gap-4">
            <Field label="Сколько разделов открыто в бесплатной натальной карте" hint="От 3 до 20">
              <input
                type="number"
                min={3}
                max={20}
                className="input max-w-[140px]"
                value={settings.freeResult.astrologyCardCount}
                onChange={(event) =>
                  update("freeResult", { ...settings.freeResult, astrologyCardCount: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Сколько позиций открыто в бесплатной матрице" hint="От 3 до 20">
              <input
                type="number"
                min={3}
                max={20}
                className="input max-w-[140px]"
                value={settings.freeResult.matrixPointCount}
                onChange={(event) => update("freeResult", { ...settings.freeResult, matrixPointCount: Number(event.target.value) })}
              />
            </Field>
            <p className="text-[0.8rem] text-[var(--ink-soft)]">
              Закрытые разделы видны в результате как заголовки без текста — полный текст не отправляется в браузер.
            </p>
            <SaveRow onSave={() => patch({ freeResult: settings.freeResult })} saving={saving} />
          </div>
        ) : null}

        {tab === "methodology" ? (
          <div className="grid gap-4">
            <Field label="Система домов (отображаемое название)">
              <input
                className="input"
                value={settings.methodology.astrologyHouseSystem}
                onChange={(event) => update("methodology", { ...settings.methodology, astrologyHouseSystem: event.target.value })}
              />
            </Field>
            <Field label="Расчётная система домов" hint="Влияет на новые расчёты">
              <select
                className="select"
                value={settings.methodology.astrologyHouseSystemKey}
                onChange={(event) =>
                  update("methodology", {
                    ...settings.methodology,
                    astrologyHouseSystemKey: event.target.value as Settings["methodology"]["astrologyHouseSystemKey"],
                  })
                }
              >
                <option value="placidus">Placidus</option>
                <option value="equal">Равные дома</option>
                <option value="whole">Whole Sign</option>
              </select>
            </Field>
            <Field label="Зодиак">
              <input
                className="input"
                value={settings.methodology.astrologyZodiac}
                onChange={(event) => update("methodology", { ...settings.methodology, astrologyZodiac: event.target.value })}
              />
            </Field>
            <Field label="Орбисы аспектов">
              <input
                className="input"
                value={settings.methodology.astrologyOrbs}
                onChange={(event) => update("methodology", { ...settings.methodology, astrologyOrbs: event.target.value })}
              />
            </Field>
            <Field label="Эфемериды">
              <input
                className="input"
                value={settings.methodology.astrologyEphemeris}
                onChange={(event) => update("methodology", { ...settings.methodology, astrologyEphemeris: event.target.value })}
              />
            </Field>
            <Field label="Методика Матрицы">
              <input
                className="input"
                value={settings.methodology.matrixMethodology}
                onChange={(event) => update("methodology", { ...settings.methodology, matrixMethodology: event.target.value })}
              />
            </Field>
            <SaveRow onSave={() => patch({ methodology: settings.methodology })} saving={saving} />
          </div>
        ) : null}

        {tab === "content" ? (
          <div className="grid gap-6">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[0.9rem] font-semibold text-[var(--ocean)]">Отзывы</h3>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() =>
                    update("reviews", [
                      ...settings.reviews,
                      { id: `r-${Date.now()}`, author: "", text: "", context: "" },
                    ])
                  }
                >
                  <PlusIcon className="h-3.5 w-3.5" /> Добавить
                </button>
              </div>
              <p className="mt-1 text-[0.76rem] text-[var(--ink-soft)]">
                Добавляйте только настоящие отзывы. Пустой список — блок на сайте не показывается.
              </p>
              <div className="mt-2 grid gap-2">
                {settings.reviews.map((review, index) => (
                  <div key={review.id} className="grid gap-2 rounded-[10px] border border-[var(--line)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[0.76rem] text-[var(--ink-faint)]">Отзыв {index + 1}</span>
                      <button
                        type="button"
                        className="text-[var(--ink-soft)] hover:text-[#8d4147]"
                        aria-label="Удалить отзыв"
                        onClick={() => update("reviews", settings.reviews.filter((item) => item.id !== review.id))}
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      className="input py-2 text-[0.86rem]"
                      placeholder="Имя"
                      value={review.author}
                      onChange={(event) =>
                        update(
                          "reviews",
                          settings.reviews.map((item) => (item.id === review.id ? { ...item, author: event.target.value } : item))
                        )
                      }
                    />
                    <textarea
                      className="textarea text-[0.86rem]"
                      rows={3}
                      placeholder="Текст отзыва"
                      value={review.text}
                      onChange={(event) =>
                        update(
                          "reviews",
                          settings.reviews.map((item) => (item.id === review.id ? { ...item, text: event.target.value } : item))
                        )
                      }
                    />
                    <input
                      className="input py-2 text-[0.86rem]"
                      placeholder="Контекст (необязательно)"
                      value={review.context ?? ""}
                      onChange={(event) =>
                        update(
                          "reviews",
                          settings.reviews.map((item) => (item.id === review.id ? { ...item, context: event.target.value } : item))
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[0.9rem] font-semibold text-[var(--ocean)]">FAQ</h3>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => update("faq", [...settings.faq, { id: `q-${Date.now()}`, question: "", answer: "" }])}
                >
                  <PlusIcon className="h-3.5 w-3.5" /> Добавить
                </button>
              </div>
              <div className="mt-2 grid gap-2">
                {settings.faq.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-[10px] border border-[var(--line)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        className="input py-2 text-[0.86rem]"
                        placeholder="Вопрос"
                        value={item.question}
                        onChange={(event) =>
                          update("faq", settings.faq.map((faq) => (faq.id === item.id ? { ...faq, question: event.target.value } : faq)))
                        }
                      />
                      <button
                        type="button"
                        className="text-[var(--ink-soft)] hover:text-[#8d4147]"
                        aria-label="Удалить вопрос"
                        onClick={() => update("faq", settings.faq.filter((faq) => faq.id !== item.id))}
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      className="textarea text-[0.86rem]"
                      rows={2}
                      placeholder="Ответ"
                      value={item.answer}
                      onChange={(event) =>
                        update("faq", settings.faq.map((faq) => (faq.id === item.id ? { ...faq, answer: event.target.value } : faq)))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <SaveRow onSave={() => patch({ reviews: settings.reviews, faq: settings.faq })} saving={saving} />
          </div>
        ) : null}

        {tab === "legal" ? (
          <div className="grid gap-4">
            <Field label="Дата редакции политики">
              <input
                className="input max-w-[220px]"
                value={settings.legal.privacyUpdatedAt}
                onChange={(event) => update("legal", { ...settings.legal, privacyUpdatedAt: event.target.value })}
              />
            </Field>
            <Field label="Срок хранения заявок (дней)">
              <input
                type="number"
                min={30}
                max={3650}
                className="input max-w-[160px]"
                value={settings.legal.dataRetentionDays}
                onChange={(event) => update("legal", { ...settings.legal, dataRetentionDays: Number(event.target.value) })}
              />
            </Field>
            <Field label="Ответственный за обработку данных">
              <input
                className="input"
                value={settings.legal.responsiblePerson}
                onChange={(event) => update("legal", { ...settings.legal, responsiblePerson: event.target.value })}
              />
            </Field>
            <SaveRow onSave={() => patch({ legal: settings.legal })} saving={saving} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.82rem] font-semibold text-[var(--ocean)]">{label}</span>
      {children}
      {hint ? <span className="text-[0.74rem] text-[var(--ink-soft)]">{hint}</span> : null}
    </label>
  );
}

function SaveRow({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end border-t border-[var(--line)] pt-3">
      <button type="button" className="btn btn--primary btn--sm" onClick={onSave} disabled={saving} data-state={saving ? "loading" : undefined}>
        {saving ? "Сохраняем" : "Сохранить раздел"}
      </button>
    </div>
  );
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div>
      <p className="text-[0.82rem] font-semibold text-[var(--ocean)]">{label}</p>
      <div className="mt-2 grid gap-2">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <input
              className="input py-2 text-[0.86rem]"
              value={item}
              onChange={(event) => onChange(items.map((value, i) => (i === index ? event.target.value : value)))}
            />
            <button
              type="button"
              className="text-[var(--ink-soft)] hover:text-[#8d4147]"
              aria-label="Удалить пункт"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn--secondary btn--sm mt-2" onClick={() => onChange([...items, ""])}>
        <PlusIcon className="h-3.5 w-3.5" /> Добавить пункт
      </button>
    </div>
  );
}
