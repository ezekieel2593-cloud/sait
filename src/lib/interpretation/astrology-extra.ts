/**
 * Дополнительные разделы астрологического разбора: узлы, Лилит, Хирон,
 * Парс Фортуны, достоинства планет, доминанты, лунный день, транзиты
 * и прогрессии.
 *
 * Слой интерпретации ничего не вычисляет: все числа приходят из engine.ts
 * и forecast.ts, здесь они только объясняются текстами базы знаний.
 */

import { ELEMENT_LABELS, MODALITY_LABELS, SIGNS, signInSign } from "../astronomy/constants";
import type { ChartPoint, NatalChart } from "../astronomy/engine";
import { computeProgressions, computeSolarReturn, computeSynastry, computeTransits } from "../astronomy/forecast";
import { getEntry, getSignEntry } from "../knowledge/queries";
import type { InterpretationSection } from "./types";

const signIndexByName = (name: string) => SIGNS.find((sign) => sign.name === name)?.index ?? 0;

function houseLabel(house: number | null): string {
  if (!house) return "";
  const entry = getEntry("house", `house${house}`);
  return entry ? `${house} дом — ${entry.details.sphere ?? entry.title}` : `${house} дом`;
}

/** Разбор одной дополнительной точки. */
function pointSection(point: ChartPoint, chart: NatalChart): InterpretationSection {
  const signEntry = getSignEntry(point.signIndex);
  const sign = SIGNS[point.signIndex]!;
  const paragraphs: string[] = [
    `${point.name} — ${point.note}.`,
    `В вашей карте: ${point.formatted}${point.house ? `, ${houseLabel(point.house)}` : ""}.`,
  ];

  if (signEntry) {
    paragraphs.push(
      `В знаке ${signInSign(point.sign)} эта точка читается так: ${signEntry.summary}`
    );
    if (signEntry.details.growth) paragraphs.push(`Зона роста по знаку: ${signEntry.details.growth}`);
  }

  if (point.house) {
    const houseEntry = getEntry("house", `house${point.house}`);
    if (houseEntry) {
      paragraphs.push(
        `Дом, в котором стоит точка, уточняет сферу: ${houseEntry.summary}`
      );
    }
  }

  paragraphs.push(
    `Стихия знака — ${ELEMENT_LABELS[sign.element]}, крест — ${MODALITY_LABELS[sign.modality]}.`
  );

  return {
    id: `point-${point.key}`,
    title: `${point.name} в ${signInSign(point.sign)}`,
    subtitle: `${point.formatted}${point.house ? ` · ${point.house} дом` : ""}`,
    paragraphs,
    positive: signEntry?.positive,
    shadow: signEntry?.shadow,
    recommendations: signEntry?.recommendations,
    premium: point.key !== "north-node",
    sourceNote: `Формула: ${point.formula}`,
  };
}

/** Узлы, Лилит, Хирон и Парс Фортуны — пять отдельных карточек. */
export function pointsSections(chart: NatalChart): InterpretationSection[] {
  return chart.points.map((point) => pointSection(point, chart));
}

/** Как читаются достоинства: сводная таблица и вывод по карте. */
export function dignitySection(chart: NatalChart): InterpretationSection {
  const strong = chart.dignities.filter((item) => item.state === "rulership" || item.state === "exaltation");
  const weak = chart.dignities.filter((item) => item.state === "detriment" || item.state === "fall");

  const paragraphs: string[] = [
    "Достоинство планеты — это её «самочувствие» в знаке. В обители планета действует как у себя дома, в экзальтации — ярко и с опорой на признание, в изгнании и падении — через усилие и пересмотр привычного способа.",
  ];

  if (strong.length) {
    paragraphs.push(
      `Сильные позиции в вашей карте: ${strong
        .map((item) => `${item.name} в ${signInSign(item.sign)} (${item.label})`)
        .join(", ")}. Эти качества обычно не требуют доказательств — на них можно опираться.`
    );
  }
  if (weak.length) {
    paragraphs.push(
      `Позиции, требующие внимания: ${weak
        .map((item) => `${item.name} в ${signInSign(item.sign)} (${item.label})`)
        .join(", ")}. Здесь привычный способ не срабатывает сам: качество развивается сознательной практикой.`
    );
  }
  if (!strong.length && !weak.length) {
    paragraphs.push(
      "Все планеты в нейтральных положениях: в карте нет выраженных «сильных» и «слабых» знаков, поэтому качества проявляются ровно, без крайностей."
    );
  }

  return {
    id: "dignities",
    title: "Достоинства планет",
    subtitle: `${chart.dignities.filter((item) => item.state).length} из ${chart.dignities.length} в сильном или слабом положении`,
    paragraphs,
    table: {
      caption: "Планета, знак и достоинство",
      rows: chart.dignities.map((item) => ({
        label: `${item.name} в ${signInPlace(item.sign)}`,
        value: `${item.label} · ${item.score > 0 ? `+${item.score}` : item.score}`,
      })),
    },
    premium: true,
  };
}

/** «в Козероге» — предложный падеж для строк таблицы. */
function signInPlace(name: string): string {
  return signInSign(name);
}

/** Доминанты карты: три самых «весомых» планеты со шкалой. */
export function dominantsSection(chart: NatalChart): InterpretationSection {
  const top = chart.dominants.slice(0, 3);
  const paragraphs: string[] = [
    "Доминант — планета, которая сильнее остальных влияет на карту. Мы считаем её по открытой шкале: достоинство в знаке (−2…+3), положение в угловом доме (+2), точные аспекты с орбом до 3° (+1 за аспект) и принадлежность к светилам (+1).",
  ];

  for (const item of top) {
    const entry = getEntry("planet", item.key);
    paragraphs.push(
      `${item.name} — ${item.score} балл(а): ${item.reasons.length ? item.reasons.join(", ") : "без дополнительных факторов"}.${
        entry ? ` Тема: ${entry.details.theme ?? entry.summary}` : ""
      }`
    );
  }

  const strongest = top[0];
  if (strongest) {
    paragraphs.push(
      `Ведущая планета карты — ${strongest.name}. Её знак и дом показывают, через какую сферу человеку естественнее всего проявляться: это первый ресурс и первый соблазн одновременно.`
    );
  }

  return {
    id: "dominants",
    title: `Доминант карты — ${top[0]?.name ?? "не определён"}`,
    subtitle: top.map((item) => `${item.name} ${item.score}`).join(" · "),
    paragraphs,
    premium: true,
  };
}

/** Лунный день и фаза — короткая справка. */
export function lunarDaySection(chart: NatalChart): InterpretationSection {
  const phase = chart.moonPhase;
  const illumination = Math.round(phase.illumination * 100);
  return {
    id: "lunar-day",
    title: `Лунный день рождения: ${chart.lunarDay}-й`,
    subtitle: `${phase.name} · освещено ${illumination}% · угол Луна–Солнце ${phase.angle}°`,
    paragraphs: [
      `Лунный день в этой версии расчёта определяется по элонгации Луны (углу между Луной и Солнцем) и указан приблизительно: точный лунный день в традиции отсчитывают от восхода Луны в конкретном месте.`,
      `${phase.name}: освещённая часть диска — ${illumination}%. Фаза показывает, как человеку привычно распределять силы: от накопления к действию и обратно к завершению.`,
      `В карте рождения Луна стоит в ${signInPlace(chart.positions.find((position) => position.key === "moon")!.sign)}, а Солнце — в ${signInPlace(
        chart.positions.find((position) => position.key === "sun")!.sign
      )}. Сочетание светил задаёт основной внутренний ритм.`,
    ],
    premium: false,
  };
}

/** Транзиты на сегодня: медленные — подробно, быстрые — списком. */
export function transitSections(chart: NatalChart, now: Date = new Date()): InterpretationSection[] {
  const transits = computeTransits(chart, now);
  const sections: InterpretationSection[] = [];

  sections.push({
    id: "transits-now",
    title: `Транзиты на ${transits.atLabel}`,
    subtitle: `${transits.aspects.length} аспектов, из них ${transits.slow.length} — от медленных планет`,
    paragraphs: [
      "Транзит — это положение планеты «сейчас» относительно вашей карты. Быстрые планеты (Луна, Меркурий, Венера, Солнце, Марс) дают смену настроений и короткие темы на дни, медленные (Юпитер, Сатурн, Уран, Нептун, Плутон) — темы на месяцы и годы.",
      "Мы показываем аспекты с узким орбисом (2–3°), чтобы список оставался рабочим: при широком орбисе к любой карте находится десяток «событий».",
    ],
    table: {
      caption: "Где планеты сейчас",
      rows: transits.strip.map((item) => ({
        label: `${item.symbol} ${item.name}`,
        value: `${item.formatted}${item.house ? ` · ${item.house} дом` : ""}`,
      })),
    },
    premium: false,
  });

  for (const aspect of transits.slow.slice(0, 6)) {
    const transitEntry = getEntry("planet", aspect.transitKey);
    const natalEntry = getEntry("planet", aspect.natalKey);
    const aspectEntry = getEntry("aspect", aspect.type);
    sections.push({
      id: `transit-${aspect.transitKey}-${aspect.natalKey}-${aspect.type}`,
      title: `${aspect.formatted}`,
      subtitle: `орб ${aspect.orb.toFixed(1)}° · точный угол ${aspect.exactAngle.toFixed(1)}°`,
      paragraphs: [
        transitEntry ? `Тема ${aspect.transitName}: ${transitEntry.details.theme ?? transitEntry.summary}` : "",
        natalEntry
          ? `Точка карты, которую это касается — ${aspect.natalName}: ${natalEntry.details.theme ?? natalEntry.summary}`
          : "",
        aspectEntry
          ? `${aspect.name} — ${aspectEntry.summary}`
          : `${aspect.name}: аспект связывает две темы, и его характер зависит от планет.`,
        aspect.nature === "tense"
          ? "Напряжённый аспект обычно ощущается как давление и требование действия: он не «портит» карту, а показывает, где сейчас нужна работа."
          : aspect.nature === "harmonious"
            ? "Гармоничный аспект даёт поддержку и лёгкость — этим стоит пользоваться, пока он активен."
            : "Нейтральный аспект чаще проявляется как смена темы или усиление уже существующей линии.",
      ].filter(Boolean),
      positive: aspectEntry?.positive,
      shadow: aspectEntry?.shadow,
      recommendations: aspectEntry?.recommendations,
      premium: true,
    });
  }

  return sections;
}

/** Вторичные прогрессии: карта «день за год» на текущий возраст. */
export function progressionSection(chart: NatalChart, now: Date = new Date()): InterpretationSection {
  const progressions = computeProgressions(chart, now);
  const progressed = progressions.chart;
  const sun = progressed.positions.find((position) => position.key === "sun")!;
  const moon = progressed.positions.find((position) => position.key === "moon")!;
  const natalSun = chart.positions.find((position) => position.key === "sun")!;
  const natalMoon = chart.positions.find((position) => position.key === "moon")!;

  const movedSun = sun.sign !== natalSun.sign;
  const movedMoon = moon.sign !== natalMoon.sign;

  const paragraphs: string[] = [
    progressions.note,
    `Ваш возраст: ${progressions.age} лет. Прогрессивная карта посчитана на ${progressions.date.split("-").reverse().join(".")}: это «внутренние часы» человека, где один день после рождения равен одному году жизни.`,
    movedSun
      ? `Прогрессивное Солнце перешло из знака ${natalSun.sign} в ${sun.sign}: за годы жизни изменился сам способ проявляться. Сейчас оно в ${signInPlace(sun.sign)}.`
      : `Прогрессивное Солнце всё ещё в знаке ${sun.sign} — базовый способ проявляться остаётся тем же, что при рождении.`,
    movedMoon
      ? `Прогрессивная Луна сменила знак: ${natalMoon.sign} → ${moon.sign}. Эмоциональные потребности в этом периоде жизни другие, чем в юности.`
      : `Прогрессивная Луна остаётся в знаке ${moon.sign}: эмоциональный ритм устойчив.`,
  ];

  if (progressed.ascendant && chart.ascendant && progressed.ascendant.sign !== chart.ascendant.sign) {
    paragraphs.push(
      `Прогрессивный асцендент сместился: ${chart.ascendant.sign} → ${progressed.ascendant.sign}. Это медленный сдвиг того, как человек входит в новое.`
    );
  }

  const top = progressions.aspects.slice(0, 4);
  if (top.length) {
    paragraphs.push(
      `Самые точные аспекты прогрессий: ${top
        .map((aspect) => `${aspect.formatted} (орб ${aspect.orb.toFixed(1)}°)`)
        .join("; ")}.`
    );
  } else {
    paragraphs.push("Точных аспектов прогрессий к натальным планетам сейчас нет: период спокойный, без смены темы.");
  }

  return {
    id: "progressions",
    title: "Прогрессии: внутренние часы карты",
    subtitle: `${progressions.age} лет · прогрессивное Солнце ${sun.formatted} · Луна ${moon.formatted}`,
    paragraphs,
    table: {
      caption: "Прогрессивные положения",
      rows: progressed.positions.map((position) => ({
        label: `${position.symbol} ${position.name}`,
        value: `${position.formatted}${position.house ? ` · ${position.house} дом` : ""}`,
      })),
    },
    premium: true,
  };
}

/** Соляр: годовая карта на момент возврата Солнца в натальную долготу. */
export function solarReturnSection(chart: NatalChart, now: Date = new Date()): InterpretationSection {
  const solar = computeSolarReturn(chart, now.getFullYear());
  const asc = solar.chart.ascendant;
  const sunPosition = solar.chart.positions.find((position) => position.key === "sun");
  const saturn = solar.chart.positions.find((position) => position.key === "saturn");
  const jupiter = solar.chart.positions.find((position) => position.key === "jupiter");
  const tight = solar.aspects.slice(0, 5);
  const sevenDays = Math.abs(solar.shiftHours) / 24;

  return {
    id: "solar-return",
    title: `Соляр ${solar.year}: карта года`,
    subtitle: `Солнце вернулось в натальную долготу ${solar.date} в ${solar.time} по месту рождения`,
    paragraphs: [
      "Соляр — карта, построенная на момент, когда Солнце возвращается в ту же точку, где оно было при рождении. Это «годовой гороскоп»: он описывает тему ближайших двенадцати месяцев, а не конкретное событие.",
      `Возврат случился ${solar.date} в ${solar.time} (${sevenDays < 1 ? "в день рождения" : `смещение от дня рождения — ${Math.abs(solar.shiftHours).toFixed(1)} ч`}).`,
      asc
        ? `Асцендент соляра в ${signInSign(asc.sign)} — так год «встречается» с вами: ${getSignEntry(signIndexByName(asc.sign))?.summary ?? "тон задаёт знак асцендента"}.`
        : "Время рождения неизвестно, поэтому углы соляра не рассчитывались.",
      sunPosition && sunPosition.house
        ? `Солярное Солнце в ${sunPosition.house}-м доме: год разворачивается вокруг этой сферы — ${SOLAR_HOUSES[sunPosition.house] ?? "личных задач"}.`
        : "Положение солярного Солнца по домам не определено: нужен точный асцендент.",
      jupiter && saturn
        ? `Опорные планеты года: Юпитер в ${signInSign(jupiter.sign)} — где будет легче расширяться, Сатурн в ${signInSign(saturn.sign)} — где придётся набирать форму и дисциплину.`
        : "",
      "Соляр не обещает событий: он показывает, какие темы год будет подсвечивать. Решения по-прежнему за вами.",
    ].filter(Boolean),
    table: {
      caption: "Карта соляра",
      rows: solar.chart.positions.map((position) => ({
        label: `${position.symbol} ${position.name}`,
        value: `${position.formatted}${position.retrograde ? " R" : ""}${position.house ? ` · ${position.house} дом` : ""}`,
      })),
    },
    list: tight.length
      ? {
          title: `Точные аспекты соляра к вашей карте (${tight.length})`,
          items: tight.map(
            (aspect) => `${aspect.transitName} ${aspect.symbol} к ${aspect.natalName} — орб ${aspect.orb.toFixed(1)}°`
          ),
        }
      : undefined,
    note: solar.note,
    premium: true,
  };
}

const SOLAR_HOUSES: Record<number, string> = {
  1: "собственная инициатива и внешность",
  2: "деньги и ресурсы",
  3: "общение, учёба, ближний круг",
  4: "дом, семья, корни",
  5: "творчество, любовь, дети",
  6: "работа и здоровье",
  7: "партнёрство и договоры",
  8: "общие ресурсы и перемены",
  9: "смысл, обучение, дальние поездки",
  10: "карьера и статус",
  11: "друзья, сообщества, планы",
  12: "уединение и завершение",
};

/** Совместимость: аспекты двух карт и наложение домов. */
export function synastrySections(
  natal: NatalChart,
  partner: NatalChart,
  partnerName = "партнёр"
): InterpretationSection[] {
  const synastry = computeSynastry(natal, partner);
  const sections: InterpretationSection[] = [
    {
      id: "synastry-overview",
      title: "Совместимость: общая картина",
      subtitle: `${synastry.harmonious} гармоничных, ${synastry.tense} напряжённых, ${synastry.neutral} нейтральных связей между картами`,
      paragraphs: [
        synastry.summary,
        "Синастрия накладывает одну карту на другую: планеты партнёра встают в дома и к планетам вашей карты. Это описание того, как вы влияете друг на друга, а не рейтинг пары.",
        "Считаются аспекты с тем же узким орбисом, что и в транзитах. Совпадение карт «на 90 %» не гарантирует отношений, а сухая сетка аспектов не отменяет их — учитывайте реальный опыт общения.",
      ],
      table: {
        caption: "Солнце и Луна двух карт",
        rows: [
          {
            label: "Ваши Солнце и Луна",
            value: `${SIGNS.find((sign) => sign.name === natal.positions[0]!.sign)?.name ?? ""}`,
          },
          {
            label: "Солнце партнёра",
            value: `${partner.positions[0]!.formatted} · ${partner.positions[0]!.sign}`,
          },
          {
            label: `Луна ${partnerName}`,
            value: `${partner.positions[1]!.formatted} · ${partner.positions[1]!.sign}`,
          },
        ],
      },
      premium: false,
    },
  ];

  for (const aspect of synastry.aspects.slice(0, 8)) {
    const transitEntry = getEntry("planet", aspect.transitKey);
    const natalEntry = getEntry("planet", aspect.natalKey);
    const aspectEntry = getEntry("aspect", aspect.type);
    sections.push({
      id: `synastry-${aspect.transitKey}-${aspect.natalKey}-${aspect.type}`,
      title: aspect.formatted,
      subtitle: `орб ${aspect.orb.toFixed(1)}° · ${aspect.nature === "harmonious" ? "поддержка" : aspect.nature === "tense" ? "трение и рост" : "смена темы"}`,
      paragraphs: [
        transitEntry ? `У ${partnerName} эта планета отвечает за: ${transitEntry.details.theme ?? transitEntry.summary}` : "",
        natalEntry ? `В вашей карте она касается: ${natalEntry.details.theme ?? natalEntry.summary}` : "",
        aspectEntry ? `${aspect.name} между картами — ${aspectEntry.summary}` : "",
        aspect.nature === "tense"
          ? "В паре такой аспект чаще проявляется как разные скорости: один хочет быстрее, второй — основательнее. Договорённость о правилах снимает половину напряжения."
          : aspect.nature === "harmonious"
            ? "Такую связь легко не заметить: она не требует усилий. Полезно называть её вслух — поддержка работает, когда её видят."
            : "Нейтральная связь чаще усиливает уже существующую тему пары.",
      ].filter(Boolean),
      premium: true,
    });
  }

  if (synastry.overlay.length) {
    sections.push({
      id: "synastry-overlay",
      title: "Планеты партнёра в ваших домах",
      subtitle: "Какие сферы вашей жизни партнёр «включает» своим присутствием",
      paragraphs: [
        "Наложение домов показывает, где именно партнёр будет заметен: его Венера в вашем 7-м доме — про отношения, его Сатурн в 4-м — про быт и дом.",
      ],
      table: {
        caption: "Наложение на ваши дома",
        rows: synastry.overlay.map((hit) => ({
          label: `${hit.fromName} (${partnerName})`,
          value: `${hit.houseTitle}: ${SOLAR_HOUSES[hit.house] ?? ""}`,
        })),
      },
      premium: true,
    });
  }

  return sections;
}
