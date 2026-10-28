import Link from "next/link";
import { notFound } from "next/navigation";
import { getLead, listLeadEvents } from "@/lib/repositories/leads";
import { getCalculation } from "@/lib/repositories/calculations";
import { listNotifications } from "@/lib/notifications";
import { StatusBadge } from "@/components/cabinet/StatusBadge";
import { LeadActions } from "@/components/cabinet/LeadActions";
import { NatalWheel } from "@/components/charts/NatalWheel";
import { MatrixDiagram } from "@/components/charts/MatrixDiagram";
import { InterpretationCard } from "@/components/result/InterpretationCard";
import { buildAstrologyInterpretation, fullInterpretationText as astroText } from "@/lib/interpretation/astrology";
import { buildMatrixInterpretation, fullInterpretationText as matrixText } from "@/lib/interpretation/matrix";
import type { NatalChart } from "@/lib/astronomy/engine";
import type { MatrixChart } from "@/lib/matrix/engine";
import { CHANNEL_LABELS, DIRECTION_LABELS, LEAD_STATUS_LABELS, TIME_ACCURACY_LABELS, type TimeAccuracy } from "@/lib/types";
import { DocumentIcon, LockIcon, MessageIcon, ShieldIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function LeadCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = getLead(id);
  if (!lead) notFound();

  const events = listLeadEvents(lead.id);
  const notifications = listNotifications(lead.id);
  const calculation = lead.calculationId ? getCalculation(lead.calculationId) : null;

  let fullText = `${lead.publicRef}\n${lead.name}\n${DIRECTION_LABELS[lead.direction]}\n${CHANNEL_LABELS[lead.channel]}: ${lead.contact}`;
  let chartBlock: React.ReactNode = null;

  if (calculation) {
    if (calculation.direction === "astrology") {
      const chart = calculation.result as NatalChart;
      const interpretation = buildAstrologyInterpretation(chart, { freeSections: 999, includeHouses: true });
      fullText = astroText(chart, interpretation);
      chartBlock = (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
          <div className="rounded-[14px] border border-[var(--line)] bg-white p-3">
            <NatalWheel chart={chart} />
            <p className="mt-2 text-center text-[0.72rem] text-[var(--ink-faint)]">
              {chart.meta.houseSystemLabel} · {chart.meta.zodiac} · {chart.meta.algorithmVersion}
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-[14px] border border-[var(--line)] bg-white p-4">
              <h3 className="font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">Планеты</h3>
              <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[320px] text-[0.82rem]">
                <thead>
                  <tr className="text-left text-[0.68rem] uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                    <th className="pb-1">Планета</th>
                    <th className="pb-1">Положение</th>
                    <th className="pb-1">Дом</th>
                    <th className="pb-1">R</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.positions.map((position) => (
                    <tr key={position.key} className="border-t border-[var(--line)]">
                      <td className="py-1 text-[var(--ocean)]">{position.name}</td>
                      <td className="py-1">{position.formatted}</td>
                      <td className="py-1 text-[var(--ink-soft)]">{position.house ?? "—"}</td>
                      <td className="py-1 text-[var(--ink-soft)]">{position.retrograde ? "R" : ""}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-[var(--line)]">
                    <td className="py-1 text-[var(--ocean)]">Асцендент</td>
                    <td className="py-1" colSpan={3}>
                      {chart.ascendant?.formatted ?? "не рассчитан"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-[var(--ocean)]">MC</td>
                    <td className="py-1" colSpan={3}>{chart.midheaven.formatted}</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>

            {chart.houses ? (
              <div className="rounded-[14px] border border-[var(--line)] bg-white p-4">
                <h3 className="font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">Дома</h3>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.8rem] sm:grid-cols-3">
                  {chart.houses.map((house) => (
                    <p key={house.number} className="flex justify-between gap-2 border-b border-[var(--line)] py-0.5">
                      <span className="text-[var(--ink-soft)]">{house.title}</span>
                      <span className="text-[var(--ocean)]">{house.formatted}</span>
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[14px] border border-[var(--line)] bg-white p-4">
              <h3 className="font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">Аспекты</h3>
              <ul className="mt-2 grid gap-1 text-[0.8rem] sm:grid-cols-2">
                {chart.aspects.slice(0, 20).map((aspect) => (
                  <li key={`${aspect.a}-${aspect.b}`} className="flex justify-between gap-2 border-b border-[var(--line)] py-0.5">
                    <span>
                      {aspect.aName} {aspect.symbol} {aspect.bName}
                    </span>
                    <span className="text-[var(--ink-soft)]">{aspect.orb.toFixed(1)}°</span>
                  </li>
                ))}
                {chart.aspects.length === 0 ? <li className="text-[var(--ink-soft)]">Аспекты в пределах орбисов не найдены</li> : null}
              </ul>
            </div>
          </div>
        </div>
      );
      chartBlock = (
        <div className="grid gap-4">
          {chartBlock}
          <div className="grid gap-3 lg:grid-cols-2">
            {interpretation.sections.map((section, index) => (
              <InterpretationCard key={section.id} section={section} index={index} />
            ))}
          </div>
        </div>
      );
    } else {
      const chart = calculation.result as MatrixChart;
      const interpretation = buildMatrixInterpretation(chart, { freeSections: 999 });
      fullText = matrixText(chart, interpretation);
      chartBlock = (
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr] xl:items-start">
            <div className="rounded-[14px] border border-[var(--line)] bg-white p-3">
              <MatrixDiagram chart={chart} />
            </div>
            <div className="rounded-[14px] border border-[var(--line)] bg-white p-4">
              <h3 className="font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">Расчётные позиции</h3>
              <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[280px] text-[0.82rem]">
                <tbody>
                  {chart.points.map((point) => (
                    <tr key={point.key} className="border-t border-[var(--line)]">
                      <td className="py-1 text-[var(--ink-soft)]">{point.title}</td>
                      <td className="py-1 text-right text-[var(--ocean)]">
                        {point.arcanum} · {point.arcanumTitle}
                      </td>
                      <td className="hidden py-1 pl-3 text-right text-[0.72rem] text-[var(--ink-faint)] sm:table-cell">{point.formula}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-[var(--line)]">
                    <td className="py-1 text-[var(--ink-soft)]">{chart.yearEnergy.title}</td>
                    <td className="py-1 text-right text-[var(--ocean)]">
                      {chart.yearEnergy.arcanum} · {chart.yearEnergy.arcanumTitle}
                    </td>
                    <td className="hidden py-1 pl-3 text-right text-[0.72rem] text-[var(--ink-faint)] sm:table-cell">
                      {chart.yearEnergy.formula}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {interpretation.sections.map((section, index) => (
              <InterpretationCard key={section.id} section={section} index={index} />
            ))}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <Link href="/specialist/leads" className="text-[0.8rem] text-[var(--turquoise-deep)] hover:text-[var(--ocean)]">
          ← Ко всем заявкам
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[1.9rem] text-[var(--ocean)]">{lead.name}</h1>
            <p className="mt-0.5 text-[0.82rem] text-[var(--ink-soft)]">
              {lead.publicRef} · {DIRECTION_LABELS[lead.direction]}
              {lead.serviceTitle ? ` · ${lead.serviceTitle}` : ""}
            </p>
          </div>
          <StatusBadge status={lead.status} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px] xl:items-start">
        <div className="grid gap-4">
          <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">
              <MessageIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
              Данные клиента
            </h2>
            <dl className="mt-2 grid gap-2 text-[0.86rem] sm:grid-cols-2">
              <Row label="Способ связи" value={CHANNEL_LABELS[lead.channel]} />
              <Row label="Контакт" value={lead.contact || "удалён"} />
              <Row label="Дата заявки" value={formatDate(lead.createdAt)} />
              <Row label="Статус" value={LEAD_STATUS_LABELS[lead.status]} />
              <Row label="Согласие на обработку" value={lead.consent ? "да" : "нет"} />
              <Row label="Направление" value={DIRECTION_LABELS[lead.direction]} />
            </dl>
            {lead.question ? (
              <div className="mt-3 rounded-[10px] bg-[rgba(184,221,224,0.16)] p-3 text-[0.86rem] text-[var(--ink)]">
                <p className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--ink-faint)]">Вопрос клиента</p>
                <p className="mt-1">{lead.question}</p>
              </div>
            ) : null}
          </section>

          {calculation ? (
            <section className="grid gap-3">
              <div className="rounded-[14px] border border-[var(--line)] bg-white p-4">
                <h2 className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">
                  <DocumentIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
                  Исходные данные расчёта
                </h2>
                <dl className="mt-2 grid gap-2 text-[0.84rem] sm:grid-cols-2 lg:grid-cols-3">
                  <Row label="Дата рождения" value={calculation.birthDate} />
                  <Row
                    label="Время"
                    value={`${calculation.birthTime ?? "неизвестно"}${
                      calculation.timeAccuracy ? ` · ${TIME_ACCURACY_LABELS[calculation.timeAccuracy as TimeAccuracy]}` : ""
                    }`}
                  />
                  <Row label="Место" value={calculation.birthPlace ?? "—"} />
                  <Row
                    label="Координаты"
                    value={
                      calculation.latitude !== null && calculation.longitude !== null
                        ? `${calculation.latitude.toFixed(4)}, ${calculation.longitude.toFixed(4)}`
                        : "—"
                    }
                  />
                  <Row label="Часовой пояс" value={calculation.timezone ?? "—"} />
                  <Row label="Методика" value={`${calculation.methodology} · ${calculation.algorithmVersion}`} />
                  <Row label="Расчёт создан" value={formatDate(calculation.createdAt)} />
                  <Row label="ID расчёта" value={calculation.id} />
                </dl>
              </div>
              {chartBlock}
            </section>
          ) : (
            <section className="rounded-[14px] border border-dashed border-[var(--line-strong)] bg-white/60 p-6 text-center text-[0.86rem] text-[var(--ink-soft)]">
              К заявке не привязан расчёт: клиент оставил заявку без предварительного результата.
              Попросите данные рождения и выполните расчёт по ссылке из публичной части сайта.
            </section>
          )}

          <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">
              <ShieldIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
              История изменений
            </h2>
            <ul className="mt-2 grid gap-1.5 text-[0.8rem]">
              {events.map((event) => (
                <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] py-1 last:border-0">
                  <span className="text-[var(--ink)]">
                    {eventLabel(event.type)}
                    {event.fromStatus && event.toStatus ? `: ${LEAD_STATUS_LABELS[event.fromStatus]} → ${LEAD_STATUS_LABELS[event.toStatus]}` : ""}
                    {event.message ? <span className="text-[var(--ink-soft)]"> — {event.message}</span> : null}
                  </span>
                  <span className="text-[0.72rem] text-[var(--ink-faint)]">
                    {event.actor} · {formatDate(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-4 xl:sticky xl:top-20">
          <LeadActions
            leadId={lead.id}
            status={lead.status}
            notes={lead.internalNotes}
            fullText={fullText}
            hasContact={Boolean(lead.contact)}
          />

          <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
            <h2 className="font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">Уведомления</h2>
            {notifications.length === 0 ? (
              <p className="mt-2 text-[0.78rem] text-[var(--ink-soft)]">Уведомления по заявке ещё не создавались.</p>
            ) : (
              <ul className="mt-2 grid gap-1.5 text-[0.78rem]">
                {notifications.map((notification) => (
                  <li key={notification.id} className="flex items-start justify-between gap-2 border-b border-[var(--line)] py-1 last:border-0">
                    <span>
                      <span className="block text-[var(--ocean)]">{CHANNEL_LABELS[notification.channel]}</span>
                      {notification.lastError ? (
                        <span className="block text-[0.7rem] text-[#8d4147]">{notification.lastError}</span>
                      ) : null}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${
                        notification.status === "sent"
                          ? "bg-[rgba(184,221,224,0.45)] text-[#2f6570]"
                          : notification.status === "failed"
                            ? "bg-[rgba(198,106,112,0.2)] text-[#8d4147]"
                            : "bg-[rgba(37,61,75,0.07)] text-[var(--ink-soft)]"
                      }`}
                    >
                      {notification.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[14px] border border-[var(--line)] bg-[#fbfbfc] p-4 text-[0.78rem] text-[var(--ink-soft)]">
            <p className="flex items-center gap-1.5 font-semibold text-[var(--ocean)]">
              <LockIcon className="h-3.5 w-3.5" /> Безопасность
            </p>
            <ul className="mt-1.5 grid gap-1">
              <li>· Данные видны только авторизованному специалисту.</li>
              <li>· Внутренние заметки не отправляются клиенту.</li>
              <li>· Страница не индексируется и не имеет публичного API.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-[0.08em] text-[var(--ink-faint)]">{label}</dt>
      <dd className="break-words text-[var(--ocean)]">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    created: "Заявка создана",
    status_changed: "Статус изменён",
    note_updated: "Заметка обновлена",
    notifications: "Уведомления",
    notifications_retry: "Повторная отправка уведомлений",
    anonymized: "Данные обезличены",
  };
  return map[type] ?? type;
}
