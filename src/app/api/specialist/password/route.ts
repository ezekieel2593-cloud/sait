import { NextResponse } from "next/server";
import { getCurrentUser, assertSameOrigin, changePassword, clearSessionCookie } from "@/lib/auth";
import { passwordChangeSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await assertSameOrigin())) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте поля", fields: formatZodError(parsed.error) }, { status: 422 });
  }

  const result = await changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Не удалось изменить пароль" }, { status: 400 });
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true, message: "Пароль изменён. Войдите заново." });
}
