import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, assertSameOrigin } from "@/lib/auth";
import { updateLeadNotes } from "@/lib/repositories/leads";

export const runtime = "nodejs";

const schema = z.object({ notes: z.string().max(5000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertSameOrigin())) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Слишком длинная заметка" }, { status: 422 });

  const lead = updateLeadNotes(id, parsed.data.notes, user.email);
  if (!lead) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
