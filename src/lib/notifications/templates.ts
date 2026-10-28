import { CHANNEL_LABELS, DIRECTION_LABELS, LEAD_STATUS_LABELS, type Lead } from "../types";

export interface LeadNotificationContext {
  lead: Lead;
  siteUrl: string;
  specialistName: string;
  adminEmail: string;
}

export function cabinetLeadUrl(siteUrl: string, leadId: string): string {
  return `${siteUrl.replace(/\/$/, "")}/specialist/leads/${leadId}`;
}

/** Текст для Telegram и MAX: без лишних персональных данных, с ссылкой в кабинет. */
export function buildChannelMessage(context: LeadNotificationContext): string {
  const { lead, siteUrl } = context;
  const created = new Date(lead.createdAt);
  const createdLabel = created.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return [
    `Новая заявка ${lead.publicRef}`,
    ``,
    `Дата: ${createdLabel} (МСК)`,
    `Имя: ${lead.name}`,
    `Направление: ${DIRECTION_LABELS[lead.direction]}`,
    lead.serviceTitle ? `Услуга: ${lead.serviceTitle}` : "",
    `Связь: ${CHANNEL_LABELS[lead.channel]} — ${lead.contact}`,
    lead.question ? `Вопрос: ${lead.question}` : "",
    `Статус: ${LEAD_STATUS_LABELS[lead.status]}`,
    ``,
    `Карточка в кабинете: ${cabinetLeadUrl(siteUrl, lead.id)}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildEmailSubject(lead: Lead): string {
  return `Новая заявка ${lead.publicRef} — ${DIRECTION_LABELS[lead.direction]}`;
}

export function buildEmailText(context: LeadNotificationContext): string {
  return `${buildChannelMessage(context)}\n\nОтветьте клиенту в кабинете специалиста.`;
}

export function buildEmailHtml(context: LeadNotificationContext): string {
  const { lead, siteUrl } = context;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#8b8085;font-size:13px;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;color:#253d4b;font-size:14px">${escapeHtml(value)}</td></tr>`;

  return `<!doctype html>
<html lang="ru"><body style="margin:0;background:#f6f0ec;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid rgba(37,61,75,0.12);border-radius:16px;padding:24px">
    <p style="margin:0 0 4px;color:#6fa8ae;font-size:12px;letter-spacing:0.14em;text-transform:uppercase">Новая заявка</p>
    <h1 style="margin:0 0 16px;color:#253d4b;font-size:22px;font-weight:600">${escapeHtml(lead.publicRef)}</h1>
    <table style="border-collapse:collapse;width:100%">
      ${row("Имя", lead.name)}
      ${row("Направление", DIRECTION_LABELS[lead.direction])}
      ${lead.serviceTitle ? row("Услуга", lead.serviceTitle) : ""}
      ${row("Связь", `${CHANNEL_LABELS[lead.channel]} — ${lead.contact}`)}
      ${lead.question ? row("Вопрос", lead.question) : ""}
      ${row("Статус", LEAD_STATUS_LABELS[lead.status])}
    </table>
    <p style="margin:22px 0 0">
      <a href="${cabinetLeadUrl(siteUrl, lead.id)}" style="display:inline-block;background:#253d4b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px">Открыть карточку в кабинете</a>
    </p>
  </div>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
