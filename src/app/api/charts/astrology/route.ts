import { NextResponse } from "next/server";
import { birthSchema, formatZodError } from "@/lib/validation";
import { createAstrologyCalculation } from "@/lib/services/charts";
import { hashIp, requestMeta } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const meta = await requestMeta();
  const ipHash = hashIp(meta.ip);

  const limit = checkRateLimit(`calc:${ipHash}`, RATE_LIMITS.calculations(), RATE_LIMITS.windowMs());
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много расчётов подряд. Попробуйте через несколько минут." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = birthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте данные рождения", fields: formatZodError(parsed.error) }, { status: 422 });
  }

  try {
    const result = createAstrologyCalculation({ ...parsed.data, time: parsed.data.time ?? null, ipHash });
    return NextResponse.json({
      apiVersion: "1",
      calculationId: result.calculationId,
      headline: result.interpretation.headline,
      freeCount: result.interpretation.freeCount,
      warnings: result.chart.warnings,
      redirectTo: `/astrology/result/${result.calculationId}`,
    });
  } catch (error) {
    console.error("astrology calculation failed", error);
    return NextResponse.json({ error: "Не удалось выполнить расчёт. Попробуйте ещё раз." }, { status: 500 });
  }
}
