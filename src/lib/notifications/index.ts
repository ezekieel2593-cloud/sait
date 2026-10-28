import nodemailer from "nodemailer";
import { getDb, get, all, run, newId, nowIso } from "../db";
import type { Lead } from "../types";
import { buildChannelMessage, buildEmailHtml, buildEmailSubject, buildEmailText, type LeadNotificationContext } from "./templates";

/**
 * Уведомления о заявках.
 *
 * Порядок гарантирует, что заявка не потеряется:
 *   1) заявка сохраняется в базе;
 *   2) создаётся запись в notifications со статусом pending;
 *   3) выполняется отправка по каждому настроенному каналу;
 *   4) результат (sent/failed/skipped) и текст ошибки пишутся в журнал.
 *
 * Каналы, для которых нет переменных окружения, помечаются как skipped —
 * интерфейс честно показывает, что канал не подключён.
 */

export type NotificationChannel = "telegram" | "max" | "email";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

export interface ChannelConfig {
  channel: NotificationChannel;
  configured: boolean;
  reason: string;
}

export function channelConfigs(): ChannelConfig[] {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const telegramChat = process.env.TELEGRAM_CHAT_ID?.trim();
  const maxToken = process.env.MAX_BOT_TOKEN?.trim();
  const maxChat = process.env.MAX_CHAT_ID?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();

  return [
    {
      channel: "telegram",
      configured: Boolean(telegramToken && telegramChat),
      reason: telegramToken && telegramChat ? "Подключено" : "Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID",
    },
    {
      channel: "max",
      configured: Boolean(maxToken && maxChat),
      reason: maxToken && maxChat ? "Подключено" : "Нужны MAX_BOT_TOKEN и MAX_CHAT_ID (требуется верифицированное юрлицо)",
    },
    {
      channel: "email",
      configured: Boolean(smtpHost && smtpUser),
      reason: smtpHost && smtpUser ? "Подключено" : "Нужны SMTP_HOST, SMTP_USER и SMTP_PASSWORD",
    },
  ];
}

interface SendResult {
  ok: boolean;
  status: NotificationStatus;
  error?: string;
}

async function sendTelegram(context: LeadNotificationContext): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID!.trim();
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildChannelMessage(context),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const body = await response.text();
      return { ok: false, status: "failed", error: `Telegram ${response.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true, status: "sent" };
  } catch (error) {
    return { ok: false, status: "failed", error: error instanceof Error ? error.message : "Неизвестная ошибка Telegram" };
  }
}

/**
 * MAX Bot API (platform-api.max.ru).
 * Токен передаётся только в заголовке Authorization — query-параметр больше не поддерживается.
 * chat_id — идентификатор чата, в который бот должен отправить сообщение.
 */
async function sendMax(context: LeadNotificationContext): Promise<SendResult> {
  const token = process.env.MAX_BOT_TOKEN!.trim();
  const chatId = process.env.MAX_CHAT_ID!.trim();
  const base = (process.env.MAX_API_BASE || "https://platform-api.max.ru").replace(/\/$/, "");
  try {
    const response = await fetch(`${base}/messages?chat_id=${encodeURIComponent(chatId)}`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: buildChannelMessage(context) }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const body = await response.text();
      return { ok: false, status: "failed", error: `MAX ${response.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true, status: "sent" };
  } catch (error) {
    return { ok: false, status: "failed", error: error instanceof Error ? error.message : "Неизвестная ошибка MAX" };
  }
}

async function sendEmail(context: LeadNotificationContext, recipient: string): Promise<SendResult> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: recipient,
      subject: buildEmailSubject(context.lead),
      text: buildEmailText(context),
      html: buildEmailHtml(context),
    });
    return { ok: true, status: "sent" };
  } catch (error) {
    return { ok: false, status: "failed", error: error instanceof Error ? error.message : "Неизвестная ошибка SMTP" };
  }
}

export interface NotifyOutcome {
  channel: NotificationChannel;
  status: NotificationStatus;
  error?: string;
}

export async function notifyLead(context: LeadNotificationContext): Promise<NotifyOutcome[]> {
  const db = getDb();
  const configs = channelConfigs();
  const outcomes: NotifyOutcome[] = [];

  for (const config of configs) {
    const notificationId = newId("ntf");
    run(
      db,
      "INSERT INTO notifications (id, lead_id, channel, status, attempts, last_error, payload, created_at, sent_at) VALUES (?, ?, ?, 'pending', 0, NULL, ?, ?, NULL)",
      [
        notificationId,
        context.lead.id,
        config.channel,
        JSON.stringify({ leadRef: context.lead.publicRef }),
        nowIso(),
      ]
    );

    if (!config.configured) {
      run(db, "UPDATE notifications SET status = 'skipped', last_error = ? WHERE id = ?", [config.reason, notificationId]);
      outcomes.push({ channel: config.channel, status: "skipped", error: config.reason });
      continue;
    }

    let result: SendResult;
    if (config.channel === "telegram") result = await sendTelegram(context);
    else if (config.channel === "max") result = await sendMax(context);
    else result = await sendEmail(context, context.adminEmail);

    run(
      db,
      "UPDATE notifications SET status = ?, attempts = attempts + 1, last_error = ?, sent_at = ? WHERE id = ?",
      [result.status, result.error ?? null, result.ok ? nowIso() : null, notificationId]
    );
    outcomes.push({ channel: config.channel, status: result.status, error: result.error });
  }

  return outcomes;
}

export interface NotificationRow {
  id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export function listNotifications(leadId: string): NotificationRow[] {
  const db = getDb();
  const rows = all<{
    id: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    attempts: number;
    last_error: string | null;
    created_at: string;
    sent_at: string | null;
  }>(db, "SELECT * FROM notifications WHERE lead_id = ? ORDER BY created_at DESC", [leadId]);

  return rows.map((row) => ({
    id: row.id,
    channel: row.channel,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  }));
}

/** Повторная отправка уведомлений по заявке (кнопка в кабинете). */
export async function retryLeadNotifications(lead: Lead, siteUrl: string, adminEmail: string, specialistName: string) {
  return notifyLead({ lead, siteUrl, adminEmail, specialistName });
}

export function notificationStats(): { sent: number; failed: number; skipped: number } {
  const db = getDb();
  const rows = all<{ status: string; count: number }>(db, "SELECT status, COUNT(*) AS count FROM notifications GROUP BY status");
  const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});
  return { sent: byStatus.sent ?? 0, failed: byStatus.failed ?? 0, skipped: byStatus.skipped ?? 0 };
}

export function lastFailedNotification(): { leadId: string; error: string } | null {
  const db = getDb();
  const row = get<{ lead_id: string; last_error: string | null }>(
    db,
    "SELECT lead_id, last_error FROM notifications WHERE status = 'failed' ORDER BY created_at DESC LIMIT 1"
  );
  return row ? { leadId: row.lead_id, error: row.last_error ?? "неизвестная ошибка" } : null;
}
