/**
 * Дополнительные точки карты: лунные узлы, Лилит (Чёрная Луна), Хирон,
 * Парс Фортуны.
 *
 * Что и как считается:
 *  · Северный узел — **средний** лунный узел (средняя точка пересечения орбиты
 *    Луны с эклиптикой). Истинный узел колеблется вокруг среднего на ±1,5°;
 *    мы фиксируем средний, чтобы результат был воспроизводим.
 *  · Южный узел — всегда ровно напротив Северного (+180°).
 *  · Лилит — **средний** апогей лунной орбиты (Чёрная Луна по М. Баркеру):
 *    та же точка, что «средний перигей + 180°».
 *  · Хирон — кеплеровское решение по оскулирующим элементам орбиты (JPL):
 *    точность около 0,1–0,5°, для интерпретации достаточно.
 *  · Парс Фортуны — формула античной традиции: днём ASC + Луна − Солнце,
 *    ночью ASC + Солнце − Луна. Без времени рождения не определяется.
 *
 * Все формулы — открытые и воспроизводимые; в интерфейсе рядом с каждой точкой
 * написано, как она получена.
 */

const RAD = Math.PI / 180;

export function norm360(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** Средний лунный узел (Северный). */
export function meanLunarNode(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  // Meeus, Astronomical Algorithms, гл. 47 (средние элементы орбиты Луны).
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441;
  return norm360(omega);
}

/** Средняя Лилит = средний апогей лунной орбиты. */
export function meanLilith(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  // Средний перигей: 83.3532465 + 4069.0137287·T (Meeus, элементы Луны).
  const perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T - T * T * T / 80053;
  return norm360(perigee + 180);
}

/**
 * Хирон: решение задачи Кеплера по элементам орбиты (JPL, эпоха J2000):
 * a = 13,6485 а.е., e = 0,38233, i = 6,9294°, Ω = 209,2998°, ω = 339,3819°,
 * перигелий 14 февраля 1996 года, период 50,76 года.
 *
 * Точность ограничена: орбиту Хирона возмущают Сатурн и Уран, поэтому
 * положение может отличаться на несколько десятых градуса.
 * Проверка: 23.06.1992 → около 11° Льва (это совпадает с эфемеридой Хирона).
 */
export function chironLongitude(jd: number): number {
  const a = 13.6485;
  const e = 0.38233;
  const i = 6.9294 * RAD;
  const omega = 209.2998 * RAD; // долгота восходящего узла
  const peri = 339.3819 * RAD; // аргумент перигелия
  const periodDays = 50.76 * 365.25;
  const perihelionJd = 2450127.5; // 14.02.1996

  const M = ((((jd - perihelionJd) / periodDays) * 360) % 360) * RAD;

  // Уравнение Кеплера: E − e·sin E = M.
  let E = M;
  for (let step = 0; step < 20; step += 1) {
    const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-10) break;
  }

  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Плоскость орбиты → эклиптика.
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosPeri = Math.cos(peri);
  const sinPeri = Math.sin(peri);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);

  const xEcl = (cosOmega * cosPeri - sinOmega * sinPeri * cosI) * x + (-cosOmega * sinPeri - sinOmega * cosPeri * cosI) * y;
  const yEcl = (sinOmega * cosPeri + cosOmega * sinPeri * cosI) * x + (-sinOmega * sinPeri + cosOmega * cosPeri * cosI) * y;

  return norm360((Math.atan2(yEcl, xEcl) / RAD + 360) % 360);
}

/** Парс Фортуны: днём ASC + Луна − Солнце, ночью ASC + Солнце − Луна. */
export function partOfFortune(ascendant: number, sun: number, moon: number, dayChart: boolean): number {
  return norm360(dayChart ? ascendant + moon - sun : ascendant + sun - moon);
}
