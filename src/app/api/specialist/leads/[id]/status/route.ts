import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, assertSameOrigin, requestMeta } from "@/lib/auth";
import { updateLeadStatus } from "@/lib/repositories/leads";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({ status: z.enum(LEAD_STATUSES as [string, ...string[]]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertSameOrigin())) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Неизвестный статус" }, { status: 422 });

  const lead = updateLeadStatus(id, parsed.data.status as LeadStatus, user.email);
  if (!lead) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  return NextResponse.json({ ok: true, status: lead.status });
}
