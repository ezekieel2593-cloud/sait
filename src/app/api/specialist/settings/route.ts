import { NextResponse } from "next/server";
import { getCurrentUser, assertSameOrigin } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";
import { settingsPatchSchema, formatZodError } from "@/lib/validation";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await assertSameOrigin())) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = settingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте поля", fields: formatZodError(parsed.error) }, { status: 422 });
  }

  const saved = saveSettings(parsed.data as Partial<Settings>, user.email);
  return NextResponse.json({ ok: true, settings: saved });
}
