import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, assertSameOrigin } from "@/lib/auth";
import { updateKnowledgeEntry } from "@/lib/knowledge/queries";
import { KNOWLEDGE_SOURCES } from "@/lib/knowledge/sources";

export const runtime = "nodejs";

const schema = z.object({
  id: z.string().min(3).max(200),
  summary: z.string().trim().min(20, "Слишком короткое описание").max(2000).optional(),
  positive: z.array(z.string().trim().max(300)).max(10).optional(),
  shadow: z.array(z.string().trim().max(300)).max(10).optional(),
  recommendations: z.array(z.string().trim().max(300)).max(10).optional(),
  methodology: z.string().trim().min(3).max(200).optional(),
  sourceId: z.string().trim().max(80).nullable().optional(),
  version: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  if (!(await assertSameOrigin())) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Проверьте поля" }, { status: 422 });
  }

  if (parsed.data.sourceId && !KNOWLEDGE_SOURCES.some((source) => source.id === parsed.data.sourceId)) {
    return NextResponse.json({ error: "Неизвестный источник — выберите из реестра" }, { status: 422 });
  }

  const { id, ...patch } = parsed.data;
  const updated = updateKnowledgeEntry(id, patch);
  if (!updated) return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });

  return NextResponse.json({ ok: true, entry: { id: updated.id, summary: updated.summary, version: updated.version } });
}
