export interface InterpretationRow {
  label: string;
  value: string;
}

export interface InterpretationTable {
  caption?: string;
  rows: InterpretationRow[];
}

export interface InterpretationSection {
  id: string;
  title: string;
  subtitle?: string;
  /** Текст расшифровки. Для закрытых разделов на клиент не передаётся. */
  paragraphs: string[];
  positive?: string[];
  shadow?: string[];
  recommendations?: string[];
  /** true — раздел доступен только в полном разборе. */
  premium: boolean;
  /** Пометка о методике/источнике. */
  sourceNote?: string;
  /** Техническая таблица — только в расширенном разборе для владельца. */
  table?: InterpretationTable;
  /** Короткий список под таблицей: аспекты, совпадения, перечни. */
  list?: { title: string; items: string[] };
  /** Примечание к методике именно этого раздела. */
  note?: string;
  arcana?: number;
}

export interface Interpretation {
  direction: "astrology" | "matrix";
  headline: string;
  lead: string;
  sections: InterpretationSection[];
  freeCount: number;
  totalCount: number;
  methodology: string;
  version: string;
  warnings: string[];
  limitations: string[];
}
