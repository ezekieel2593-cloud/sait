import { useState } from "react";
import { computeMatrix } from "@/lib/matrix/engine";
import { buildMatrixGuides } from "@/lib/interpretation/guides";
import { buildSimpleGuide } from "@/lib/interpretation/simple";
import { downloadMatrixGuidePdf } from "@/lib/pdf/matrix-guide";
import { DocumentIcon } from "./icons-extra";

/**
 * Владельцу на странице гайда: ввести дату рождения клиента и получить PDF.
 *
 * Расчёт и сборка идут в браузере: ни дата, ни готовый файл никуда не уходят.
 * Внутри PDF — схема человека, ответы простыми словами по его энергиям
 * и полные гайды с шагами и практиками.
 */
export function GuideDatePdf() {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Укажите дату рождения в формате ГГГГ-ММ-ДД");
      setStatus("error");
      return;
    }
    setStatus("working");
    setError(null);
    try {
      const chart = computeMatrix({ date });
      await downloadMatrixGuidePdf({
        chart,
        guides: buildMatrixGuides(chart, { freeCount: 999, includePremium: true }),
        simple: buildSimpleGuide(chart, { freeCount: 999, includePremium: true }),
        birthDate: date,
        name: name.trim() || undefined,
      });
      setStatus("done");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Не удалось собрать PDF");
    }
  }

  return (
    <div className="note note--admin" role="status">
      <p className="font-semibold">Владелец: гайд в PDF по дате рождения</p>
      <p className="mt-1">
        Введите дату клиента — соберётся файл со схемой, ответами простыми словами и полными гайдами
        по его энергиям. Всё формируется в браузере.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[14rem_14rem_auto] sm:items-end">
        <label className="field">
          <span className="text-[0.82rem] text-[var(--ink-soft)]">Дата рождения</span>
          <input
            className="input"
            id="guide-pdf-date"
            type="date"
            min="1900-01-01"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="text-[0.82rem] text-[var(--ink-soft)]">Имя клиента (необязательно)</span>
          <input
            className="input"
            id="guide-pdf-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например: Анна"
          />
        </label>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => void generate()}
          disabled={status === "working"}
        >
          <DocumentIcon className="h-4 w-4" />
          {status === "working" ? "Собираем PDF" : "Создать гайд (PDF)"}
        </button>
      </div>
      {status === "done" ? (
        <p className="mt-2 text-[0.82rem] text-[var(--turquoise-deep)]">
          Файл готов — он в загрузках браузера.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-[0.82rem] text-[#8a4b4b]">{error}</p> : null}
    </div>
  );
}
