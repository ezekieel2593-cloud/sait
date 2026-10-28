import { NextResponse } from "next/server";
import { getCurrentUser, assertSameOrigin } from "@/lib/auth";
import { getLead, addEvent } from "@/lib/repositories/leads";
import { notifyLead } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertSameOrigin())) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { id } = await params;
  const limit = checkRateLimit(`notify:${id}`, 6, 10 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Слишком часто. Попробуйте позже." }, { status: 429 });

  const lead = getLead(id);
  if (!lead) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });

  const settings = getSettings();
  const outcomes = await notifyLead({
    lead,
    siteUrl: settings.site.siteUrl,
    specialistName: settings.specialist.name,
    adminEmail: settings.notifications.adminEmail || settings.contacts.email,
  });

  addEvent({
    leadId: id,
    type: "notifications_retry",
    actor: user.email,
    message: outcomes.map((outcome) => `${outcome.channel}: ${outcome.status}${outcome.error ? ` (${outcome.error})` : ""}`).join("; "),
  });

  return NextResponse.json({ ok: true, outcomes });
}
