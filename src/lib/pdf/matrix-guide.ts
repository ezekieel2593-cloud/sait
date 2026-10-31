/**
 * PDF-гайд по энергиям Матрицы: документ для клиента, который владелец
 * создаёт одной кнопкой и скачивает.
 *
 * Внутри — всё, что нужно человеку для работы с энергиями: его схема, гайд
 * по каждой энергии (суть, проявления, шаги, практика, признаки и риски)
 * и методическая сноска. Файл собирается в браузере, данные никуда не уходят.
 */

import { energyLabel, type MatrixChart } from "../matrix/engine";
import type { MatrixGuide } from "../interpretation/guides";
import type { SimpleGuideItem } from "../interpretation/simple";
import { PdfDocument } from "./document";
import { parseTrueType, type TrueTypeFont } from "./truetype";

export interface MatrixGuidePdfInput {
  chart: MatrixChart;
  guides: MatrixGuide[];
  /** Ответы «простыми словами» — в PDF попадают все, даже закрытые на сайте. */
  simple?: SimpleGuideItem[];
  /** Имя клиента, если известно. */
  name?: string;
  /** Дата рождения в формате 23.06.1992. */
  birthDate: string;
  /** Короткий персональный абзац (заголовок разбора). */
  intro?: string;
  /** Когда сформирован гайд. */
  generatedAt?: Date;
}

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function longDate(value: Date): string {
  return `${value.getDate()} ${MONTHS[value.getMonth()]} ${value.getFullYear()}`;
}

/** «1992-06-23» → «23.06.1992»; нераспознанное возвращаем как есть. */
export function formatBirthDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

export function renderMatrixGuidePdf(font: TrueTypeFont, input: MatrixGuidePdfInput): Uint8Array {
  const { chart, guides } = input;
  const generated = input.generatedAt ?? new Date();
  const doc = new PdfDocument(font, { title: `Гайд по энергиям — ${input.birthDate}` });

  doc.titleBlock(
    "Гайд по энергиям Матрицы судьбы",
    [
      input.name ? `Для кого: ${input.name}` : "",
      `Дата рождения: ${formatBirthDate(input.birthDate)}`,
      `Сформирован: ${longDate(generated)}`,
    ]
      .filter(Boolean)
      .join("  ·  ")
  );

  doc.rule();
  doc.heading("Как пользоваться гайдом");
  doc.text(
    "В вашей схеме есть несколько энергий — каждая описана отдельным разделом. Гайд не нужно читать целиком за один раз: выберите ту энергию, которая сейчас отзывается сильнее, и начните с блока «Что делать». Шаги рассчитаны на обычную жизнь: их можно делать по одному, без специальных условий и подготовки."
  );
  if (input.intro) doc.text(input.intro);
  doc.muted(
    "Трактовки — символическая традиция, а не предсказание событий и не медицинская рекомендация. Решения остаются за вами."
  );

  doc.heading("Ваша схема");
  for (const point of [...chart.points, chart.yearEnergy]) {
    doc.bullet(`${point.title} — ${energyLabel(point.arcanum)} (${point.formula})`);
  }
  doc.space(4);
  doc.muted(
    `Методика: ${chart.meta.methodology}; редукция: ${chart.meta.reductionLabel}; версия ${chart.meta.version}.`
  );

  if (input.simple?.length) {
    doc.rule();
    doc.heading("Матрица простыми словами");
    for (const item of input.simple) {
      doc.heading(item.title, 2);
      doc.muted(`${item.where} · ${item.label}`);
      doc.text(item.text);
    }
  }

  guides.forEach((guide) => {
    doc.rule();
    doc.heading(`${guide.label}`);
    doc.muted(`Где в вашей схеме: ${guide.where}`);

    if (guide.essence) {
      doc.heading("Суть энергии", 2);
      doc.text(guide.essence);
    }
    if (guide.signs.length) {
      doc.heading("Как это проявляется в жизни", 2);
      for (const item of guide.signs) doc.bullet(item);
    }
    if (guide.steps.length) {
      doc.heading("Что делать", 2);
      guide.steps.forEach((step, index) => doc.numbered(index + 1, step));
    }
    if (guide.practice) {
      doc.heading("Практика на неделю", 2);
      doc.text(guide.practice);
    }
    if (guide.strength.length) {
      doc.heading("Сильные проявления", 2);
      for (const item of guide.strength) doc.bullet(item);
    }
    // В печатной версии не дублируем «зону внимания» из базы знаний:
    // пункты «чего избегать» уже покрывают её своими словами.
    const avoid = guide.avoid.length > 0 ? guide.avoid : guide.risk;
    if (avoid.length) {
      doc.heading("Чего избегать", 2);
      for (const item of avoid) doc.bullet(item);
    }
    if (guide.check) {
      doc.heading("Как понять, что энергия работает в плюсе", 2);
      doc.text(guide.check);
    }
  });

  doc.rule();
  doc.heading("Что дальше");
  doc.text(
    "Возьмите из гайда две практики — одну из энергии центра и одну из той сферы, которая сейчас важнее всего (деньги, отношения, дело). Делайте их три недели и отмечайте результат: через три недели видно, что действительно работает именно для вас."
  );
  doc.muted(
    "Гайд сформирован автоматически по расчёту Матрицы судьбы. Все числа детерминированы: одна и та же дата рождения всегда даёт одну и ту же схему."
  );

  return doc.build();
}

let cachedFont: TrueTypeFont | null = null;
let pendingFont: Promise<TrueTypeFont> | null = null;

/** Загружает встроенный шрифт гайда (один раз за сессию). */
export async function loadGuideFont(url = "fonts/guide-sans.ttf"): Promise<TrueTypeFont> {
  if (cachedFont) return cachedFont;
  if (!pendingFont) {
    pendingFont = (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Не удалось загрузить шрифт для PDF");
      const buffer = await response.arrayBuffer();
      cachedFont = parseTrueType(new Uint8Array(buffer));
      return cachedFont;
    })().finally(() => {
      pendingFont = null;
    });
  }
  return pendingFont;
}

/** Готовит файл и отдаёт его браузеру как скачивание. */
export async function downloadMatrixGuidePdf(
  input: MatrixGuidePdfInput,
  options: { fontUrl?: string; fileName?: string } = {}
): Promise<void> {
  const font = await loadGuideFont(options.fontUrl);
  const bytes = renderMatrixGuidePdf(font, input);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeDate = input.birthDate.replace(/[^\d.-]/g, "");
  link.href = url;
  link.download = options.fileName ?? `gayd-energii-${safeDate || "matrica"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
