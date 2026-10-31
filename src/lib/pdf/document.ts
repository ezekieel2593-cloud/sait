/**
 * Сборка PDF без внешних библиотек.
 *
 * Мы не тянем jsPDF или pdfkit: нужен один документ с текстом на русском,
 * а любой генератор потребовал бы всё равно встроить шрифт с кириллицей.
 * Здесь около трёхсот строк: страницы A4, абзацы с переносами по ширине,
 * заголовки, списки, линейки и номера страниц. Шрифт встраивается целиком
 * (подмножество DejaVu Sans, ~30 КБ) — файл открывается в любом просмотрщике
 * и корректно копируется текстом.
 */

import type { TrueTypeFont } from "./truetype";

export interface PdfOptions {
  /** Размер страницы в пунктах (A4 по умолчанию). */
  width?: number;
  height?: number;
  margin?: number;
  /** Размер основного текста. */
  fontSize?: number;
  /** Заголовок документа в метаданных PDF. */
  title?: string;
}

type Rgb = [number, number, number];

const INK: Rgb = [0.16, 0.2, 0.22];
const SOFT: Rgb = [0.36, 0.41, 0.44];
const ACCENT: Rgb = [0.17, 0.35, 0.42];
const LINE: Rgb = [0.83, 0.8, 0.78];

const encoder = new TextEncoder();

const ascii = (text: string): Uint8Array => encoder.encode(text);
const pad10 = (value: number) => String(value).padStart(10, "0");

/** Склеивает произвольное число частей в один Uint8Array. */
function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

export class PdfDocument {
  private readonly font: TrueTypeFont;
  private readonly width: number;
  private readonly height: number;
  private readonly margin: number;
  private readonly baseSize: number;
  private readonly title: string;

  private pages: string[] = [];
  private current: string[] = [];
  private cursorY = 0;
  /** Использованные глифы — из них собирается таблица ToUnicode. */
  private readonly usedGlyphs = new Map<number, number>();

  constructor(font: TrueTypeFont, options: PdfOptions = {}) {
    this.font = font;
    this.width = options.width ?? 595.28;
    this.height = options.height ?? 841.89;
    this.margin = options.margin ?? 48;
    this.baseSize = options.fontSize ?? 10.5;
    this.title = options.title ?? "Гайд";
    this.newPage();
  }

  private get contentWidth(): number {
    return this.width - this.margin * 2;
  }

  private newPage(): void {
    if (this.current.length > 0) this.pages.push(this.current.join("\n"));
    this.current = [];
    this.cursorY = this.height - this.margin;
  }

  private ensure(height: number): void {
    if (this.cursorY - height < this.margin + 24) this.newPage();
  }

  private color([r, g, b]: Rgb): string {
    return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
  }

  /** Ширина строки в пунктах — по ширинам глифов из самого шрифта. */
  private measure(text: string, size: number): number {
    let units = 0;
    for (const char of text) {
      const glyph = this.font.glyphOf(char.codePointAt(0) ?? 32);
      units += this.font.widthOf(glyph);
    }
    return (units / this.font.unitsPerEm) * size;
  }

  private encode(text: string): string {
    let hex = "";
    for (const char of text) {
      const code = char.codePointAt(0) ?? 32;
      const glyph = this.font.glyphOf(code);
      if (glyph !== 0 && !this.usedGlyphs.has(glyph)) this.usedGlyphs.set(glyph, code);
      hex += glyph.toString(16).padStart(4, "0").toUpperCase();
    }
    return hex;
  }

  private drawLine(text: string, x: number, y: number, size: number, color: Rgb): void {
    if (text.trim() === "") return;
    this.current.push(
      `BT /F1 ${size.toFixed(2)} Tf ${this.color(color)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm <${this.encode(
        text
      )}> Tj ET`
    );
  }

  /** Разбивает текст на строки по ширине. Длинные слова переносит. */
  private wrap(text: string, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const rawLine of text.split("\n")) {
      const words = rawLine.split(/\s+/).filter((word) => word !== "");
      if (words.length === 0) {
        lines.push("");
        continue;
      }
      let line = "";
      for (const word of words) {
        const candidate = line === "" ? word : `${line} ${word}`;
        if (this.measure(candidate, size) <= maxWidth) {
          line = candidate;
          continue;
        }
        if (line !== "") {
          lines.push(line);
          line = "";
        }
        if (this.measure(word, size) <= maxWidth) {
          line = word;
          continue;
        }
        // Слово длиннее строки — режем по символам.
        let chunk = "";
        for (const char of word) {
          if (this.measure(chunk + char, size) > maxWidth && chunk !== "") {
            lines.push(chunk);
            chunk = "";
          }
          chunk += char;
        }
        line = chunk;
      }
      if (line !== "") lines.push(line);
    }
    return lines;
  }

  private paragraph(
    text: string,
    options: { size: number; color: Rgb; lineHeight: number; indent?: number; spaceAfter: number }
  ): void {
    const indent = options.indent ?? 0;
    const maxWidth = this.contentWidth - indent;
    const lines = this.wrap(text, options.size, maxWidth);
    for (const line of lines) {
      this.ensure(options.lineHeight);
      this.cursorY -= options.lineHeight;
      this.drawLine(line, this.margin + indent, this.cursorY, options.size, options.color);
    }
    this.cursorY -= options.spaceAfter;
  }

  /** Заголовок документа: крупно, с отбивкой снизу. */
  titleBlock(text: string, subtitle?: string): void {
    this.paragraph(text, { size: 20, color: ACCENT, lineHeight: 26, spaceAfter: 4 });
    if (subtitle) this.paragraph(subtitle, { size: 10.5, color: SOFT, lineHeight: 15, spaceAfter: 10 });
  }

  heading(text: string, level: 1 | 2 = 1): void {
    this.cursorY -= 6;
    // Заголовок не должен оставаться внизу страницы один: держим вместе с двумя строками.
    this.ensure(level === 1 ? 66 : 44);
    this.paragraph(text, {
      size: level === 1 ? 14 : 11.5,
      color: level === 1 ? ACCENT : INK,
      lineHeight: level === 1 ? 19 : 16,
      spaceAfter: 4,
    });
  }

  text(text: string): void {
    this.paragraph(text, {
      size: this.baseSize,
      color: INK,
      lineHeight: this.baseSize * 1.5,
      spaceAfter: 4,
    });
  }

  muted(text: string): void {
    this.paragraph(text, { size: 9, color: SOFT, lineHeight: 13, spaceAfter: 3 });
  }

  bullet(text: string): void {
    const size = this.baseSize;
    const lineHeight = size * 1.5;
    const lines = this.wrap(text, size, this.contentWidth - 14);
    lines.forEach((line, index) => {
      this.ensure(lineHeight);
      this.cursorY -= lineHeight;
      if (index === 0) this.drawLine("•", this.margin, this.cursorY, size, ACCENT);
      this.drawLine(line, this.margin + 14, this.cursorY, size, INK);
    });
    this.cursorY -= 2;
  }

  /** Пункт нумерованного списка: номер слева, текст с отступом. */
  numbered(index: number, text: string): void {
    const size = this.baseSize;
    const lineHeight = size * 1.5;
    const lines = this.wrap(text, size, this.contentWidth - 22);
    lines.forEach((line, lineIndex) => {
      this.ensure(lineHeight);
      this.cursorY -= lineHeight;
      if (lineIndex === 0) this.drawLine(`${index}.`, this.margin, this.cursorY, size, ACCENT);
      this.drawLine(line, this.margin + 22, this.cursorY, size, INK);
    });
    this.cursorY -= 2;
  }

  rule(): void {
    this.ensure(12);
    this.cursorY -= 6;
    this.current.push(
      `${this.color(LINE)} RG 0.7 w ${this.margin} ${this.cursorY.toFixed(2)} m ${(this.width - this.margin).toFixed(
        2
      )} ${this.cursorY.toFixed(2)} l S`
    );
    this.cursorY -= 6;
  }

  space(height = 8): void {
    this.cursorY -= height;
  }

  /** Итоговые байты PDF: объекты, шрифт, страницы и таблица xref. */
  build(): Uint8Array {
    // Последняя страница закрывается здесь же; полностью пустая не попадает в файл.
    if (this.current.length > 0) this.pages.push(this.current.join("\n"));
    if (this.pages.length === 0) this.pages.push("");

    // Номера страниц — уже известны.
    const pages = this.pages.map((content, index) => {
      const footer = `Страница ${index + 1} из ${this.pages.length}`;
      return `${content}\nBT /F1 8 Tf ${this.color(SOFT)} rg 1 0 0 1 ${this.margin} 24 Tm <${this.encode(
        footer
      )}> Tj ET`;
    });

    const objects: Uint8Array[] = [];
    const push = (chunks: string | (string | Uint8Array)[]) =>
      objects.push(
        concat(
          (Array.isArray(chunks) ? chunks : [chunks]).map((chunk) =>
            typeof chunk === "string" ? ascii(chunk) : chunk
          )
        )
      );

    const firstPageObject = 8;
    const kids = pages.map((_, index) => `${firstPageObject + index * 2} 0 R`).join(" ");

    push(`<< /Type /Catalog /Pages 2 0 R >>`);
    push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
    push(
      `<< /Type /Font /Subtype /Type0 /BaseFont /${this.font.name} /Encoding /Identity-H /DescendantFonts [4 0 R] /ToUnicode 7 0 R >>`
    );

    // Ширины в /W задаются в тысячных долях текстового пространства,
    // а в шрифте они в единицах unitsPerEm — пересчитываем.
    const widths: string[] = [];
    for (const glyph of [...this.usedGlyphs.keys()].sort((a, b) => a - b)) {
      const thousands = Math.round((this.font.widthOf(glyph) * 1000) / this.font.unitsPerEm);
      widths.push(`${glyph} [${thousands}]`);
    }
    push(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${this.font.name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 5 0 R /W [${widths.join(
        " "
      )}] /CIDToGIDMap /Identity >>`
    );
    const [x0, y0, x1, y1] = this.font.bbox;
    push(
      `<< /Type /FontDescriptor /FontName /${this.font.name} /Flags 32 /FontBBox [${x0} ${y0} ${x1} ${y1}] /ItalicAngle 0 /Ascent ${this.font.ascent} /Descent ${this.font.descent} /CapHeight ${Math.round(
        this.font.ascent * 0.7
      )} /StemV 80 /FontFile2 6 0 R >>`
    );

    const fontData = this.font.data;
    push([
      `<< /Length ${fontData.byteLength} /Length1 ${fontData.byteLength} >>\nstream\n`,
      fontData,
      `\nendstream`,
    ]);

    const toUnicode = this.toUnicodeStream();
    push([`<< /Length ${toUnicode.byteLength} >>\nstream\n`, toUnicode, `\nendstream`]);

    pages.forEach((content, index) => {
      const pageNumber = firstPageObject + index * 2;
      const streamNumber = pageNumber + 1;
      const data = ascii(content);
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width.toFixed(2)} ${this.height.toFixed(
          2
        )}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamNumber} 0 R >>`
      );
      push([`<< /Length ${data.byteLength} >>\nstream\n`, data, `\nendstream`]);
    });

    const infoIndex = objects.length + 1;
    push(
      `<< /Title (${escapeText(this.title)}) /Producer (Жемчужина — гайд по энергиям) /Creator (Жемчужина) >>`
    );

    const parts: Uint8Array[] = [];
    let length = 0;
    const append = (bytes: Uint8Array) => {
      parts.push(bytes);
      length += bytes.byteLength;
    };

    append(ascii("%PDF-1.4\n"));
    append(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

    const offsets: number[] = [];
    objects.forEach((body, index) => {
      offsets.push(length);
      append(ascii(`${index + 1} 0 obj\n`));
      append(body);
      append(ascii("\nendobj\n"));
    });

    const startxref = length;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) xref += `${pad10(offset)} 00000 n \n`;
    append(ascii(xref));
    append(
      ascii(
        `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoIndex} 0 R >>\nstartxref\n${startxref}\n%%EOF\n`
      )
    );

    return concat(parts);
  }

  /** Таблица «глиф → символ»: по ней PDF-просмотрщик и поиск понимают текст. */
  private toUnicodeStream(): Uint8Array {
    const chunks: string[] = [];
    const glyphs = [...this.usedGlyphs.entries()].sort((a, b) => a[0] - b[0]);
    const chunkSize = 100;
    chunks.push(
      "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n"
    );
    for (let start = 0; start < glyphs.length; start += chunkSize) {
      const slice = glyphs.slice(start, start + chunkSize);
      chunks.push(`${slice.length} beginbfchar\n`);
      for (const [glyph, code] of slice) {
        const hex = glyph.toString(16).toUpperCase().padStart(4, "0");
        const unicode = code.toString(16).toUpperCase().padStart(4, "0");
        chunks.push(`<${hex}> <${unicode}>\n`);
      }
      chunks.push("endbfchar\n");
    }
    chunks.push("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
    return ascii(chunks.join(""));
  }
}

/** Экранирование строки для строкового литерала PDF. */
function escapeText(text: string): string {
  return text.replace(/[\\()]/g, (char) => `\\${char}`);
}
