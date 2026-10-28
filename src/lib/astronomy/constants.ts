/**
 * Справочные константы астрологического движка.
 * Астрономические величины (долготы, дома, аспекты) — расчётные.
 * Значения знаков и планет ниже — символический слой интерпретации.
 */

export interface SignInfo {
  index: number; // 0 = Овен
  name: string;
  genitive: string;
  symbol: string;
  element: "fire" | "earth" | "air" | "water";
  modality: "cardinal" | "fixed" | "mutable";
  ruler: string;
}

export const SIGNS: SignInfo[] = [
  { index: 0, name: "Овен", genitive: "Овна", symbol: "♈", element: "fire", modality: "cardinal", ruler: "Марс" },
  { index: 1, name: "Телец", genitive: "Тельца", symbol: "♉", element: "earth", modality: "fixed", ruler: "Венера" },
  { index: 2, name: "Близнецы", genitive: "Близнецов", symbol: "♊", element: "air", modality: "mutable", ruler: "Меркурий" },
  { index: 3, name: "Рак", genitive: "Рака", symbol: "♋", element: "water", modality: "cardinal", ruler: "Луна" },
  { index: 4, name: "Лев", genitive: "Льва", symbol: "♌", element: "fire", modality: "fixed", ruler: "Солнце" },
  { index: 5, name: "Дева", genitive: "Девы", symbol: "♍", element: "earth", modality: "mutable", ruler: "Меркурий" },
  { index: 6, name: "Весы", genitive: "Весов", symbol: "♎", element: "air", modality: "cardinal", ruler: "Венера" },
  { index: 7, name: "Скорпион", genitive: "Скорпиона", symbol: "♏", element: "water", modality: "fixed", ruler: "Плутон" },
  { index: 8, name: "Стрелец", genitive: "Стрельца", symbol: "♐", element: "fire", modality: "mutable", ruler: "Юпитер" },
  { index: 9, name: "Козерог", genitive: "Козерога", symbol: "♑", element: "earth", modality: "cardinal", ruler: "Сатурн" },
  { index: 10, name: "Водолей", genitive: "Водолея", symbol: "♒", element: "air", modality: "fixed", ruler: "Уран" },
  { index: 11, name: "Рыбы", genitive: "Рыб", symbol: "♓", element: "water", modality: "mutable", ruler: "Нептун" },
];

export type PlanetKey =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

export interface PlanetInfo {
  key: PlanetKey;
  name: string;
  symbol: string;
  kind: "luminary" | "personal" | "social" | "outer";
  /** Условный цикл для подсказок в интерфейсе (не используется в расчёте). */
  note?: string;
}

export const PLANETS: PlanetInfo[] = [
  { key: "sun", name: "Солнце", symbol: "☉", kind: "luminary" },
  { key: "moon", name: "Луна", symbol: "☽", kind: "luminary" },
  { key: "mercury", name: "Меркурий", symbol: "☿", kind: "personal" },
  { key: "venus", name: "Венера", symbol: "♀", kind: "personal" },
  { key: "mars", name: "Марс", symbol: "♂", kind: "personal" },
  { key: "jupiter", name: "Юпитер", symbol: "♃", kind: "social" },
  { key: "saturn", name: "Сатурн", symbol: "♄", kind: "social" },
  { key: "uranus", name: "Уран", symbol: "♅", kind: "outer" },
  { key: "neptune", name: "Нептун", symbol: "♆", kind: "outer" },
  { key: "pluto", name: "Плутон", symbol: "♇", kind: "outer" },
];

export type AspectKey = "conjunction" | "sextile" | "square" | "trine" | "opposition";

export interface AspectInfo {
  key: AspectKey;
  name: string;
  symbol: string;
  angle: number;
  orb: number;
  /** Для светил допускается расширенный орбис. */
  luminaryOrb: number;
  nature: "harmonious" | "tense" | "neutral";
}

export const ASPECTS: AspectInfo[] = [
  { key: "conjunction", name: "Соединение", symbol: "☌", angle: 0, orb: 8, luminaryOrb: 10, nature: "neutral" },
  { key: "sextile", name: "Секстиль", symbol: "⚹", angle: 60, orb: 4, luminaryOrb: 5, nature: "harmonious" },
  { key: "square", name: "Квадрат", symbol: "□", angle: 90, orb: 6, luminaryOrb: 8, nature: "tense" },
  { key: "trine", name: "Трин", symbol: "△", angle: 120, orb: 7, luminaryOrb: 8, nature: "harmonious" },
  { key: "opposition", name: "Оппозиция", symbol: "☍", angle: 180, orb: 6, luminaryOrb: 8, nature: "tense" },
];

export const HOUSES: { number: number; title: string; sphere: string }[] = [
  { number: 1, title: "I дом", sphere: "личность, внешность, начало пути" },
  { number: 2, title: "II дом", sphere: "деньги, ценности, ресурсы" },
  { number: 3, title: "III дом", sphere: "общение, обучение, ближний круг" },
  { number: 4, title: "IV дом", sphere: "дом, семья, корни" },
  { number: 5, title: "V дом", sphere: "творчество, любовь, дети" },
  { number: 6, title: "VI дом", sphere: "работа, привычки, здоровье" },
  { number: 7, title: "VII дом", sphere: "партнёрство, брак, договоры" },
  { number: 8, title: "VIII дом", sphere: "общие ресурсы, трансформация" },
  { number: 9, title: "IX дом", sphere: "мировоззрение, путешествия, смысл" },
  { number: 10, title: "X дом", sphere: "карьера, статус, цель" },
  { number: 11, title: "XI дом", sphere: "друзья, сообщества, планы" },
  { number: 12, title: "XII дом", sphere: "уединение, внутренний мир, завершение" },
];

export const ELEMENT_LABELS: Record<SignInfo["element"], string> = {
  fire: "Огонь",
  earth: "Земля",
  air: "Воздух",
  water: "Вода",
};

export const MODALITY_LABELS: Record<SignInfo["modality"], string> = {
  cardinal: "Кардинальный",
  fixed: "Фиксированный",
  mutable: "Мутабельный",
};

export function signFromLongitude(longitude: number): SignInfo {
  const normalized = ((longitude % 360) + 360) % 360;
  const index = Math.floor(normalized / 30) % 12;
  return SIGNS[index]!;
}

export function formatDegree(longitude: number): string {
  const normalized = ((longitude % 360) + 360) % 360;
  const sign = signFromLongitude(normalized);
  const withinSign = normalized - sign.index * 30;
  const degrees = Math.floor(withinSign);
  const minutes = Math.round((withinSign - degrees) * 60);
  const safeDegrees = minutes === 60 ? degrees + 1 : degrees;
  const safeMinutes = minutes === 60 ? 0 : minutes;
  return `${safeDegrees}° ${String(safeMinutes).padStart(2, "0")}′ ${sign.name}`;
}

/** Названия знаков в предложном падеже: «Солнце в Козероге». */
export const SIGN_PREPOSITIONAL: Record<string, string> = {
  "Овен": "Овне",
  "Телец": "Тельце",
  "Близнецы": "Близнецах",
  "Рак": "Раке",
  "Лев": "Льве",
  "Дева": "Деве",
  "Весы": "Весах",
  "Скорпион": "Скорпионе",
  "Стрелец": "Стрельце",
  "Козерог": "Козероге",
  "Водолей": "Водолее",
  "Рыбы": "Рыбах",
};

export function signInSign(name: string): string {
  return SIGN_PREPOSITIONAL[name] ?? name;
}
