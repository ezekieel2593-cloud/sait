import { NextResponse } from "next/server";
import { loginSchema, formatZodError } from "@/lib/validation";
import { authenticate, setSessionCookie, requestMeta, assertSameOrigin } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await assertSameOrigin())) {
    return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  }

  const meta = await requestMeta();
  const limit = checkRateLimit(`login:${meta.ip}`, RATE_LIMITS.login(), RATE_LIMITS.windowMs());
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много попыток входа. Попробуйте позже." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте поля", fields: formatZodError(parsed.error) }, { status: 422 });
  }

  const result = authenticate(parsed.data.email, parsed.data.password, meta.ip, meta.userAgent);
  if (!result.ok || !result.token) {
    return NextResponse.json({ error: result.error ?? "Не удалось войти" }, { status: 401 });
  }

  await setSessionCookie(result.token);
  return NextResponse.json({ ok: true, redirectTo: "/specialist" });
}
