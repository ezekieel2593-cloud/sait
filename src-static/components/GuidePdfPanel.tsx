import { useEffect, useRef, useState } from "react";
import type { MatrixChart } from "@/lib/matrix/engine";
import type { MatrixGuide } from "@/lib/interpretation/guides";
import type { SimpleGuideItem } from "@/lib/interpretation/simple";
import { downloadMatrixGuidePdf } from "@/lib/pdf/matrix-guide";
import { DocumentIcon } from "./icons-extra";

/**
 * Панель владельца: собрать PDF-гайд по человеку и скачать файл.
 *
 * Имя подставляется из ссылки (`?name=Анна`), дата рождения — из выполненного
 * расчёта. Всё считается в браузере: ни расчёт, ни гайд никуда не отправляются.
 */
export function GuidePdfPanel({
  chart,
  guides,
  simple,
  birthDate,
  defaultName = "",
  auto = false,
}: {
  chart: MatrixChart;
  guides: MatrixGuide[];
  simple?: SimpleGuideItem[];
  birthDate: string;
  defaultName?: string;
  auto?: boolean;
}) {
  const [name, setName] = useState(defaultName);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function generate() {
    setStatus("working");
    setError(null);
    try {
      await downloadMatrixGuidePdf({
        chart,
        guides,
        simple,
        name: name.trim() || undefined,
        birthDate,
      });
      setStatus("done");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Не удалось собрать PDF");
    }
  }

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return (
    <div className="note note--admin" role="status">
      <p className="font-semibold">Владелец: гайд в PDF</p>
      <p className="mt-1">
        Собирается по этому расчёту: схема, все энергии с шагами и практиками, методика. Всё
        формируется в браузере — данные никуда не отправляются.
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="field min-w-[14rem] flex-1">
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
          Файл готов — он в загрузках браузера. Если скачивание не началось, нажмите кнопку ещё раз.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-[0.82rem] text-[#8a4b4b]">{error}</p> : null}
    </div>
  );
}
