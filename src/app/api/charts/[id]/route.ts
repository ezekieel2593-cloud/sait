import { NextResponse } from "next/server";
import { loadCalculation, isNatalChart, isMatrixChart } from "@/lib/services/charts";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIp, requestMeta } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Публичное чтение сохранённого расчёта (для мобильного приложения и внешних клиентов).
 * Отдаём только бесплатную часть интерпретации: закрытые разделы возвращаются
 * заголовками без текста, поэтому платный контент не утекает через API.
 * Персональные данные заявок здесь недоступны в принципе.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const meta = await requestMeta();
  const limit = checkRateLimit(`chart-read:${hashIp(meta.ip)}`, 120, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  if (!/^calc_[a-z0-9]{8,40}$/.test(id)) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  const loaded = loadCalculation(id);
  if (!loaded) return NextResponse.json({ error: "Расчёт не найден" }, { status: 404 });

  const { record, chart, interpretation } = loaded;
  const free = interpretation.sections.filter((section) => !section.premium);
  const locked = interpretation.sections.filter((section) => section.premium);

  return NextResponse.json(
    {
      apiVersion: "1",
      calculationId: record.id,
      direction: record.direction,
      algorithmVersion: record.algorithmVersion,
      methodology: record.methodology,
      id: record.id,
      createdAt: record.createdAt,
      chart: isNatalChart(chart) || isMatrixChart(chart) ? chart : null,
      interpretation: {
        headline: interpretation.headline,
        lead: interpretation.lead,
        freeCount: free.length,
        totalCount: interpretation.sections.length,
        methodology: interpretation.methodology,
        version: interpretation.version,
        warnings: interpretation.warnings,
        limitations: interpretation.limitations,
        sections: free.map((section) => ({
          id: section.id,
          title: section.title,
          subtitle: section.subtitle ?? null,
          paragraphs: section.paragraphs,
          positive: section.positive ?? [],
          shadow: section.shadow ?? [],
          recommendations: section.recommendations ?? [],
          sourceNote: section.sourceNote ?? null,
        })),
        lockedTitles: locked.map((section) => section.title),
      },
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  );
}
