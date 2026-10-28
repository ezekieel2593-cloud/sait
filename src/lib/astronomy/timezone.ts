/**
 * Работа с часовыми поясами.
 *
 * Используется база IANA из ICU (Intl), поэтому учитываются исторические
 * смещения и правила летнего времени для конкретной даты, а не только
 * текущий UTC-offset города.
 */

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = dtfCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(timeZone, fmt);
  }
  return fmt;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partsInZone(date: Date, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Смещение зоны относительно UTC (мс) в конкретный момент времени. */
export function offsetMsAt(date: Date, timeZone: string): number {
  const p = partsInZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Локальное время в зоне → UTC.
 * Для неоднозначных моментов (переход на летнее время) выбирается первое
 * корректное смещение; для несуществующих — ближайшее следующее.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = naive;

  for (let i = 0; i < 3; i += 1) {
    const offset = offsetMsAt(new Date(guess), timeZone);
    const next = naive - offset;
    if (next === guess) break;
    guess = next;
  }

  // Проверяем, что полученное время действительно отображается в ту же дату/время
  const check = partsInZone(new Date(guess), timeZone);
  if (
    check.year !== year ||
    check.month !== month ||
    check.day !== day ||
    check.hour !== hour ||
    check.minute !== minute
  ) {
    // Несуществующее локальное время (переход часов вперёд): сдвигаем на час
    const shifted = naive - offsetMsAt(new Date(naive - 3_600_000), timeZone);
    const checkShifted = partsInZone(new Date(shifted), timeZone);
    if (checkShifted.hour === (hour + 1) % 24) return new Date(shifted);
  }

  return new Date(guess);
}

export function formatUtcOffset(offsetMs: number): string {
  const totalMinutes = Math.round(offsetMs / 60_000);
  const sign = totalMinutes < 0 ? "−" : "+";
  const abs = Math.abs(totalMinutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export function offsetLabelAt(date: Date, timeZone: string): string {
  return formatUtcOffset(offsetMsAt(date, timeZone));
}
