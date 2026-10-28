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
