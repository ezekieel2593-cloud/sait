import { NextResponse } from "next/server";
import { getCurrentUser, assertSameOrigin } from "@/lib/auth";
import { anonymizeLead, getLead } from "@/lib/repositories/leads";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertSameOrigin())) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { id } = await params;
  if (!getLead(id)) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });

  anonymizeLead(id, user.email);
  return NextResponse.json({ ok: true });
}
