import { computeNatalChart, type NatalChart } from "../astronomy/engine";
import { computeMatrix, type MatrixChart } from "../matrix/engine";
import { buildAstrologyInterpretation } from "../interpretation/astrology";
import { buildMatrixInterpretation } from "../interpretation/matrix";
import type { Interpretation } from "../interpretation/types";
import { saveCalculation, getCalculation } from "../repositories/calculations";
import { getSettings } from "../settings";
import type { CalculationRecord } from "../types";

/**
 * Сервисный слой расчётов: связывает движки, интерпретацию и сохранение.
 * API-маршруты и страницы используют только этот модуль — так бизнес-логика
 * остаётся отдельно от интерфейса и её легко переиспользовать в мобильном приложении.
 */

export interface ChartResult<TChart> {
  calculationId: string;
  chart: TChart;
  interpretation: Interpretation;
}

export function createAstrologyCalculation(payload: {
  date: string;
  timeAccuracy: "exact" | "approx" | "unknown";
  time?: string | null;
  place: { name: string; country: string; latitude: number; longitude: number; timezone: string };
  ipHash?: string | null;
}): ChartResult<NatalChart> {
  const settings = getSettings();
  const chart = computeNatalChart(
    {
      date: payload.date,
      time: payload.time ?? null,
      timeAccuracy: payload.timeAccuracy,
      latitude: payload.place.latitude,
      longitude: payload.place.longitude,
      timezone: payload.place.timezone,
      placeName: `${payload.place.name}, ${payload.place.country}`,
    },
    settings.methodology.astrologyHouseSystemKey
  );

  const interpretation = buildAstrologyInterpretation(chart, {
    freeSections: settings.freeResult.astrologyCardCount,
    includeHouses: true,
  });

  const calculationId = saveCalculation({
    direction: "astrology",
    input: payload,
    result: chart,
    methodology: settings.methodology.astrologyHouseSystemKey,
    algorithmVersion: chart.meta.algorithmVersion,
    birthDate: payload.date,
    birthTime: payload.timeAccuracy === "unknown" ? null : payload.time ?? null,
    birthPlace: `${payload.place.name}, ${payload.place.country}`,
    timezone: payload.place.timezone,
    latitude: payload.place.latitude,
    longitude: payload.place.longitude,
    timeAccuracy: payload.timeAccuracy,
    ipHash: payload.ipHash ?? null,
  });

  return { calculationId, chart, interpretation };
}

export function createMatrixCalculation(payload: { date: string; ipHash?: string | null }): ChartResult<MatrixChart> {
  const settings = getSettings();
  const chart = computeMatrix({ date: payload.date });
  const interpretation = buildMatrixInterpretation(chart, {
    freeSections: settings.freeResult.matrixPointCount,
  });

  const calculationId = saveCalculation({
    direction: "matrix",
    input: payload,
    result: chart,
    methodology: chart.meta.methodology,
    algorithmVersion: chart.meta.version,
    birthDate: payload.date,
    ipHash: payload.ipHash ?? null,
  });

  return { calculationId, chart, interpretation };
}

export interface LoadedCalculation {
  record: CalculationRecord;
  chart: NatalChart | MatrixChart;
  interpretation: Interpretation;
}

/** Загрузка сохранённого расчёта и пересборка интерпретации (без доверия клиенту). */
export function loadCalculation(id: string): LoadedCalculation | null {
  const record = getCalculation(id);
  if (!record) return null;
  const settings = getSettings();

  if (record.direction === "astrology") {
    const chart = record.result as NatalChart;
    const interpretation = buildAstrologyInterpretation(chart, {
      freeSections: settings.freeResult.astrologyCardCount,
      includeHouses: true,
    });
    return { record, chart, interpretation };
  }

  const chart = record.result as MatrixChart;
  const interpretation = buildMatrixInterpretation(chart, {
    freeSections: settings.freeResult.matrixPointCount,
  });
  return { record, chart, interpretation };
}

export function isNatalChart(value: unknown): value is NatalChart {
  return Boolean(value && typeof value === "object" && "positions" in value && "meta" in value);
}

export function isMatrixChart(value: unknown): value is MatrixChart {
  return Boolean(value && typeof value === "object" && "byKey" in value && "points" in value);
}
