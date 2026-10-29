/**
 * Подробный расчёт для кабинета специалиста.
 *
 * Клиент видит только короткую сводку, а в заявку дополнительно уходит полный
 * расчёт: все планеты с домами и ретроградностью, куспиды домов, все аспекты,
 * все точки Матрицы с формулами. Специалисту не нужно пересчитывать карту
 * вручную — он открывает заявку и видит те же числа, что видел клиент.
 *
 * Формат — обычный текст: он читаемо выглядит в кабинете, копируется одной
 * кнопкой и одинаково хранится в файле заявок.
 */

import type { NatalChart } from "@/lib/astronomy/engine";
import type { MatrixChart } from "@/lib/matrix/engine";
import type { Interpretation } from "@/lib/interpretation/types";

/** Предел длины подробностей: должен совпадать с лимитом в api/lead.php. */
export const DETAILS_LIMIT = 20000;

const SEP = "\n";

function block(title: string, lines: string[]): string {
  const body = lines.filter((line) => line !== "").join(SEP);
  return body === "" ? `${title}${SEP}—` : `${title}${SEP}${body}`;
}

function cut(text: string): string {
  return text.length > DETAILS_LIMIT ? `${text.slice(0, DETAILS_LIMIT - 1)}…` : text;
}

function interpretationPart(interpretation: Interpretation): string[] {
  const free = interpretation.sections.filter((section) => !section.premium);
  const locked = interpretation.sections.filter((section) => section.premium);
  const lines: string[] = [`Заключение: ${interpretation.headline}`];
  if (interpretation.lead) lines.push(interpretation.lead);
  if (free.length > 0) {
    lines.push("");
    lines.push(`Открытые разделы (${free.length} из ${interpretation.sections.length}):`);
    for (const section of free) {
      lines.push(`· ${section.title}`);
      for (const paragraph of section.paragraphs.slice(0, 2)) lines.push(`  ${paragraph}`);
    }
  }
  if (locked.length > 0) {
    lines.push("");
    lines.push(
      `Закрытые разделы (${locked.length}) — тексты доступны только в полном разборе, ` +
        "в браузере их нет: специалист готовит их сам."
    );
    for (const section of locked) lines.push(`· ${section.title}`);
  }
  return lines;
}

/** Полный расчёт натальной карты для кабинета. */
export function astrologyDetails(
  chart: NatalChart,
  label: string,
  interpretation: Interpretation
): string {
  const birth = chart.birth;
  const parts: string[] = [];

  parts.push(
    block("НАТАЛЬНАЯ КАРТА — полный расчёт", [
      `Данные клиента: ${label}`,
      `Место: ${birth.placeName || "—"}`,
      `Координаты: ${birth.latitude.toFixed(4)}°, ${birth.longitude.toFixed(4)}°`,
      `Часовой пояс: ${birth.timezone} (${birth.utcOffset})`,
      `Всемирное время (UT): ${birth.utcIso}`,
      `Юлианский день: ${birth.julianDay.toFixed(5)}`,
      `Время рождения: ${
        birth.timeAccuracy === "unknown"
          ? "неизвестно — дома и асцендент не рассчитывались"
          : `${birth.time}${birth.timeAccuracy === "approx" ? " (примерно)" : " (точно)"}`
      }`,
      `Дома: ${chart.meta.houseSystemLabel} · зодиак: ${chart.meta.zodiac} · версия: ${chart.meta.algorithmVersion}`,
      `Эфемериды: ${chart.meta.ephemeris}`,
      `Посчитано: ${chart.meta.computedAt}`,
    ])
  );

  parts.push(
    block(
      "ПЛАНЕТЫ И ТОЧКИ",
      chart.positions.map((position) => {
        const house = position.house ? `${position.house} дом` : "дом не рассчитывался";
        return `${position.name}: ${position.formatted} · ${house}${position.retrograde ? " · ретроградная" : ""}`;
      })
    )
  );

  parts.push(
    block("УГЛЫ КАРТЫ", [
      `Асцендент: ${chart.ascendant ? chart.ascendant.formatted : "не рассчитывался (время рождения неизвестно)"}`,
      `MC (середина неба): ${chart.midheaven.formatted}`,
    ])
  );

  if (chart.houses) {
    parts.push(block("ДОМА", chart.houses.map((house) => `${house.title}: ${house.formatted} · ${house.sphere}`)));
  } else {
    parts.push(block("ДОМА", ["не рассчитывались: время рождения неизвестно"]));
  }

  parts.push(
    block(
      `АСПЕКТЫ (${chart.aspects.length})`,
      chart.aspects.map(
        (aspect) =>
          `${aspect.aName} — ${aspect.bName}: ${aspect.name}, угол ${aspect.exactAngle.toFixed(1)}°, орб ${aspect.orb.toFixed(2)}° (${aspect.nature === "harmonious" ? "гармоничный" : aspect.nature === "tense" ? "напряжённый" : "нейтральный"})`
      )
    )
  );

  const elements = Object.entries(chart.distribution.elements)
    .map(([key, value]) => `${key} ${value}`)
    .join(", ");
  const modalities = Object.entries(chart.distribution.modalities)
    .map(([key, value]) => `${key} ${value}`)
    .join(", ");
  const hemispheres = chart.distribution.hemispheres
    ? `верх ${chart.distribution.hemispheres.top}, низ ${chart.distribution.hemispheres.bottom}, восток ${chart.distribution.hemispheres.east}, запад ${chart.distribution.hemispheres.west}`
    : "не рассчитывались";

  parts.push(
    block("БАЛАНС КАРТЫ", [
      `Стихии: ${elements || "—"}`,
      `Кресты: ${modalities || "—"}`,
      `Полусферы: ${hemispheres}`,
      `Фаза Луны: ${chart.moonPhase.name}, освещённость ${Math.round(chart.moonPhase.illumination * 100)}%`,
      `Доминирующая стихия: ${chart.summary.dominantElement} · крест: ${chart.summary.dominantModality}`,
    ])
  );

  parts.push(block("РАСШИФРОВКА (что видел клиент)", interpretationPart(interpretation)));

  if (chart.warnings.length > 0) {
    parts.push(block("ОГРАНИЧЕНИЯ РАСЧЁТА", chart.warnings));
  }

  return cut(parts.join(`${SEP}${SEP}`));
}

/** Полный расчёт Матрицы судьбы для кабинета. */
export function matrixDetails(
  chart: MatrixChart,
  date: string,
  interpretation: Interpretation
): string {
  const parts: string[] = [];

  parts.push(
    block("МАТРИЦА СУДЬБЫ — полный расчёт", [
      `Дата рождения: ${date}`,
      `Методика: ${chart.meta.methodology} (${chart.meta.version})`,
      `Свёртка чисел: ${chart.meta.reductionLabel}`,
      `Порядок энергий: ${chart.meta.arcanumOrder}`,
      `Посчитано: ${chart.meta.computedAt}`,
    ])
  );

  parts.push(
    block(
      "ВСЕ ПОЗИЦИИ",
      chart.points.map(
        (point) =>
          `${point.title}: ${point.arcanumTitle} · формула: ${point.formula} (сфера: ${point.sphere}, роль: ${point.role})`
      )
    )
  );

  parts.push(
    block("ЭНЕРГИЯ ГОДА", [
      `${chart.yearEnergy.year}: ${chart.yearEnergy.arcanumTitle} · формула: ${chart.yearEnergy.formula}`,
    ])
  );

  parts.push(
    block("ИТОГИ ПО СФЕРАМ", [
      `Центр: ${chart.summary.center}`,
      `Личное: ${chart.summary.personality}`,
      `Талант: ${chart.summary.talent}`,
      `Карма: ${chart.summary.karma}`,
      `Деньги: ${chart.summary.moneyArcanum}`,
      `Отношения: ${chart.summary.loveArcanum}`,
    ])
  );

  parts.push(block("РАСШИФРОВКА (что видел клиент)", interpretationPart(interpretation)));

  if (chart.warnings.length > 0) {
    parts.push(block("ОГРАНИЧЕНИЯ РАСЧЁТА", chart.warnings));
  }

  return cut(parts.join(`${SEP}${SEP}`));
}
