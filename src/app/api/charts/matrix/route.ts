import { NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError, birthSchema } from "@/lib/validation";
import { createMatrixCalculation } from "@/lib/services/charts";
import { hashIp, requestMeta } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const matrixSchema = z.object({
  date: birthSchema.shape.date,
});

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

  const parsed = matrixSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте дату рождения", fields: formatZodError(parsed.error) }, { status: 422 });
  }

  try {
    const result = createMatrixCalculation({ date: parsed.data.date, ipHash });
    return NextResponse.json({
      apiVersion: "1",
      calculationId: result.calculationId,
      headline: result.interpretation.headline,
      freeCount: result.interpretation.freeCount,
      redirectTo: `/matrix/result/${result.calculationId}`,
    });
  } catch (error) {
    console.error("matrix calculation failed", error);
    return NextResponse.json({ error: "Не удалось выполнить расчёт. Попробуйте ещё раз." }, { status: 500 });
  }
}
