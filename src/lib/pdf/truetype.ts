/**
 * Минимальный разбор TrueType-шрифта для встраивания в PDF.
 *
 * Нужен ровно один шрифт с кириллицей (`assets/fonts/guide-sans.ttf`, подмножество
 * DejaVu Sans). Читаем только те таблицы, без которых PDF не соберётся:
 * `head` (масштаб и габариты), `hhea`/`hmtx` (ширины глифов), `maxp` (число глифов),
 * `cmap` (символ → глиф) и `name` (имя шрифта для PDF).
 *
 * Шрифт встраивается целиком как CIDFontType2 с кодировкой Identity-H:
 * CID совпадает с номером глифа, поэтому в содержимом страницы мы пишем
 * сразу глифы в hex-виде — никаких таблиц кодировок на стороне просмотрщика.
 */

export interface TrueTypeFont {
  /** Имя шрифта из таблицы name (PostScript-имя). */
  name: string;
  data: Uint8Array;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  bbox: [number, number, number, number];
  numGlyphs: number;
  /** Ширина глифа в единицах шрифта. */
  widthOf(glyph: number): number;
  /** Номер глифа для кода символа; 0 — если символа нет. */
  glyphOf(code: number): number;
  /** Обратное соответствие: глиф → символ (для ToUnicode). */
  charOf(glyph: number): number | null;
}

const TAG = (view: DataView, offset: number) =>
  String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );

interface TableDirectory {
  offset: number;
  length: number;
}

function readTables(view: DataView): Map<string, TableDirectory> {
  const count = view.getUint16(4);
  const tables = new Map<string, TableDirectory>();
  for (let index = 0; index < count; index += 1) {
    const entry = 12 + index * 16;
    tables.set(TAG(view, entry), {
      offset: view.getUint32(entry + 8),
      length: view.getUint32(entry + 12),
    });
  }
  return tables;
}

/** Разбор таблицы cmap: берём подтаблицу с кириллицей (формат 4 или 12). */
function readCmap(view: DataView, table: TableDirectory): Map<number, number> {
  const base = table.offset;
  const count = view.getUint16(base + 2);
  let chosen = 0;
  let chosenScore = -1;

  for (let index = 0; index < count; index += 1) {
    const record = base + 4 + index * 8;
    const platform = view.getUint16(record);
    const encoding = view.getUint16(record + 2);
    const offset = base + view.getUint32(record + 4);
    const format = view.getUint16(offset);
    // Windows Unicode BMP (3/1) и Windows Unicode полный (3/10) — приоритет.
    let score = 0;
    if (platform === 3 && encoding === 1 && format === 4) score = 3;
    else if (platform === 0 && format === 4) score = 2;
    else if (platform === 3 && encoding === 10 && format === 12) score = 1;
    if (score > chosenScore) {
      chosenScore = score;
      chosen = offset;
    }
  }

  const map = new Map<number, number>();
  if (chosenScore < 0) return map;

  const format = view.getUint16(chosen);
  if (format === 4) {
    const segCountX2 = view.getUint16(chosen + 6);
    const segCount = segCountX2 / 2;
    const endCodes = chosen + 14;
    const startCodes = endCodes + segCountX2 + 2;
    const idDeltas = startCodes + segCountX2;
    const idRangeOffsets = idDeltas + segCountX2;

    for (let segment = 0; segment < segCount; segment += 1) {
      const end = view.getUint16(endCodes + segment * 2);
      const start = view.getUint16(startCodes + segment * 2);
      const delta = view.getInt16(idDeltas + segment * 2);
      const rangeOffset = view.getUint16(idRangeOffsets + segment * 2);
      if (start === 0xffff) continue;
      for (let code = start; code <= end && code <= 0xfffe; code += 1) {
        let glyph = 0;
        if (rangeOffset === 0) {
          glyph = (code + delta) & 0xffff;
        } else {
          const address = idRangeOffsets + segment * 2 + rangeOffset + (code - start) * 2;
          if (address + 1 >= view.byteLength) continue;
          glyph = view.getUint16(address);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
        if (glyph !== 0) map.set(code, glyph);
      }
    }
  } else if (format === 12) {
    const groups = view.getUint32(chosen + 12);
    for (let group = 0; group < groups; group += 1) {
      const record = chosen + 16 + group * 12;
      const start = view.getUint32(record);
      const end = view.getUint32(record + 4);
      const startGlyph = view.getUint32(record + 8);
      for (let code = start; code <= end && code <= 0x10ffff; code += 1) {
        map.set(code, startGlyph + (code - start));
      }
    }
  }

  return map;
}

/** Имя шрифта из таблицы name: сначала PostScript (id 6), затем имя семейства (id 1). */
function readName(view: DataView, table: TableDirectory): string {
  const base = table.offset;
  const count = view.getUint16(base + 2);
  const stringOffset = base + view.getUint16(base + 4);
  const storage = stringOffset;
  let postScript = "";
  let family = "";
  for (let index = 0; index < count; index += 1) {
    const record = base + 6 + index * 12;
    const platform = view.getUint16(record);
    const nameId = view.getUint16(record + 6);
    const length = view.getUint16(record + 8);
    const offset = view.getUint16(record + 10);
    if (nameId !== 1 && nameId !== 6) continue;
    if (platform !== 3 && platform !== 0) continue;
    let value = "";
    for (let byte = 0; byte < length; byte += 2) {
      value += String.fromCharCode(view.getUint16(storage + offset + byte));
    }
    if (nameId === 6 && postScript === "") postScript = value;
    if (nameId === 1 && family === "") family = value;
  }
  return (postScript || family || "GuideSans").replace(/[^\w-]/g, "");
}

export function parseTrueType(data: Uint8Array): TrueTypeFont {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const tables = readTables(view);
  const head = tables.get("head");
  const hhea = tables.get("hhea");
  const hmtx = tables.get("hmtx");
  const maxp = tables.get("maxp");
  const cmapTable = tables.get("cmap");
  if (!head || !hhea || !hmtx || !maxp || !cmapTable) {
    throw new Error("Шрифт не подходит: нет обязательных таблиц TrueType");
  }

  const unitsPerEm = view.getUint16(head.offset + 18);
  const bbox: [number, number, number, number] = [
    view.getInt16(head.offset + 36),
    view.getInt16(head.offset + 38),
    view.getInt16(head.offset + 40),
    view.getInt16(head.offset + 42),
  ];
  const ascent = view.getInt16(hhea.offset + 4);
  const descent = view.getInt16(hhea.offset + 6);
  const numberOfHMetrics = view.getUint16(hhea.offset + 34);
  const numGlyphs = view.getUint16(maxp.offset + 4);

  const widths: number[] = new Array(numGlyphs).fill(0);
  let lastWidth = 0;
  for (let glyph = 0; glyph < numGlyphs; glyph += 1) {
    if (glyph < numberOfHMetrics) {
      lastWidth = view.getUint16(hmtx.offset + glyph * 4);
    }
    widths[glyph] = lastWidth;
  }

  const codeToGlyph = readCmap(view, cmapTable);
  const glyphToChar = new Map<number, number>();
  for (const [code, glyph] of codeToGlyph) {
    if (!glyphToChar.has(glyph)) glyphToChar.set(glyph, code);
  }

  return {
    name: tables.has("name") ? readName(view, tables.get("name")!) : "GuideSans",
    data,
    unitsPerEm,
    ascent,
    descent,
    bbox,
    numGlyphs,
    widthOf: (glyph) => widths[glyph] ?? 0,
    glyphOf: (code) => codeToGlyph.get(code) ?? 0,
    charOf: (glyph) => glyphToChar.get(glyph) ?? null,
  };
}
