import { NextResponse } from "next/server";
import { leadSchema, formatZodError } from "@/lib/validation";
import { createLead, countRecentLeadsByIp, addEvent } from "@/lib/repositories/leads";
import { getCalculation } from "@/lib/repositories/calculations";
import { hashIp, requestMeta, assertSameOrigin } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { notifyLead } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await assertSameOrigin())) {
    return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  }

  const meta = await requestMeta();
  const ipHash = hashIp(meta.ip);

  const limit = checkRateLimit(`lead:${ipHash}`, RATE_LIMITS.leads(), RATE_LIMITS.windowMs());
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Заявка уже отправлена. Если нужно связаться снова — напишите на указанную почту." },
      { status: 429 }
    );
  }

  if (countRecentLeadsByIp(ipHash, 24 * 3600_000) > 12) {
    return NextResponse.json({ error: "Слишком много заявок с этого адреса." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте поля формы", fields: formatZodError(parsed.error) }, { status: 422 });
  }

  // Расчёт должен существовать и соответствовать направлению — защита от подмены id.
  let calculationId: string | null = null;
  if (parsed.data.calculationId) {
    const calculation = getCalculation(parsed.data.calculationId);
    if (!calculation || calculation.direction !== parsed.data.direction) {
      return NextResponse.json({ error: "Расчёт не найден. Пересчитайте результат и попробуйте снова." }, { status: 422 });
    }
    calculationId = calculation.id;
  }

  let lead;
  try {
    lead = createLead({
      name: parsed.data.name,
      direction: parsed.data.direction,
      serviceId: parsed.data.serviceId ?? null,
      channel: parsed.data.channel,
      contact: parsed.data.contact,
      question: parsed.data.question ?? null,
      consent: parsed.data.consent,
      calculationId,
      ipHash,
      userAgent: meta.userAgent,
    });
  } catch (error) {
    console.error("lead creation failed", error);
    return NextResponse.json({ error: "Не удалось сохранить заявку. Попробуйте ещё раз." }, { status: 500 });
  }

  // Уведомления отправляются после сохранения: сбой внешнего сервиса не теряет заявку.
  const settings = getSettings();
  const outcomes = await notifyLead({
    lead,
    siteUrl: settings.site.siteUrl,
    specialistName: settings.specialist.name,
    adminEmail: settings.notifications.adminEmail || settings.contacts.email,
  });

  const delivered = outcomes.filter((outcome) => outcome.status === "sent").map((outcome) => outcome.channel);
  const failed = outcomes.filter((outcome) => outcome.status === "failed").map((outcome) => outcome.channel);

  addEvent({
    leadId: lead.id,
    type: "notifications",
    actor: "system",
    message: `Отправлено: ${delivered.join(", ") || "нет"}; ошибки: ${failed.join(", ") || "нет"}`,
  });

  return NextResponse.json({
    apiVersion: "1",
    ok: true,
    reference: lead.publicRef,
    leadId: lead.id,
    delivered,
    failed,
  });
}
