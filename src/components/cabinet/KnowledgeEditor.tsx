"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeEntry } from "@/lib/knowledge/queries";
import type { KnowledgeSource } from "@/lib/knowledge/sources";
import { CheckIcon, CloseIcon } from "@/components/icons";

interface Props {
  entry: KnowledgeEntry;
  sources: KnowledgeSource[];
}

const toLines = (values: string[]) => values.join("\n");
const fromLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function KnowledgeEditor({ entry, sources }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState(entry.summary);
  const [positive, setPositive] = useState(toLines(entry.positive));
  const [shadow, setShadow] = useState(toLines(entry.shadow));
  const [recommendations, setRecommendations] = useState(toLines(entry.recommendations));
  const [methodology, setMethodology] = useState(entry.methodology);
  const [sourceId, setSourceId] = useState(entry.sourceId ?? "");
  const [version, setVersion] = useState(entry.version);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/specialist/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          summary,
          positive: fromLines(positive),
          shadow: fromLines(shadow),
          recommendations: fromLines(recommendations),
          methodology,
          sourceId: sourceId || null,
          version,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Не удалось сохранить");
        return;
      }
      setMessage("Сохранено");
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className="mt-1.5 text-[0.74rem] font-medium text-[var(--turquoise-deep)] hover:text-[var(--ocean)]"
        onClick={() => setOpen(true)}
      >
        Редактировать текст
      </button>
    );
  }

  return (
    <div className="mt-2 grid gap-2 rounded-[10px] border border-[var(--line-strong)] bg-[#fbfbfc] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.76rem] font-semibold text-[var(--ocean)]">Правка записи</p>
        <button
          type="button"
          className="text-[var(--ink-soft)] hover:text-[var(--ocean)]"
          aria-label="Закрыть редактор"
          onClick={() => setOpen(false)}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <label className="grid gap-1">
        <span className="text-[0.74rem] font-medium text-[var(--ink)]">Краткая трактовка</span>
        <textarea className="textarea text-[0.82rem]" rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} />
      </label>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-[0.74rem] font-medium text-[#2f6570]">Плюсы (по строке)</span>
          <textarea className="textarea text-[0.8rem]" rows={4} value={positive} onChange={(event) => setPositive(event.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-[0.74rem] font-medium text-[#8a5d7c]">Риски (по строке)</span>
          <textarea className="textarea text-[0.8rem]" rows={4} value={shadow} onChange={(event) => setShadow(event.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-[0.74rem] font-medium text-[var(--ink)]">Рекомендации (по строке)</span>
          <textarea
            className="textarea text-[0.8rem]"
            rows={4}
            value={recommendations}
            onChange={(event) => setRecommendations(event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-[0.74rem] font-medium text-[var(--ink)]">Методика</span>
          <input className="input py-1.5 text-[0.8rem]" value={methodology} onChange={(event) => setMethodology(event.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-[0.74rem] font-medium text-[var(--ink)]">Источник</span>
          <select className="select py-1.5 text-[0.8rem]" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
            <option value="">Без источника</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[0.74rem] font-medium text-[var(--ink)]">Версия</span>
          <input className="input py-1.5 text-[0.8rem]" value={version} onChange={(event) => setVersion(event.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.72rem] text-[var(--ink-soft)]">
          {message ? (
            <span className="inline-flex items-center gap-1 text-[#2f6570]">
              <CheckIcon className="h-3.5 w-3.5" /> {message}
            </span>
          ) : error ? (
            <span className="text-[#8d4147]">{error}</span>
          ) : (
            "Изменения применяются к новым расшифровкам сразу."
          )}
        </p>
        <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={saving} data-state={saving ? "loading" : undefined}>
          {saving ? "Сохраняем" : "Сохранить запись"}
        </button>
      </div>
    </div>
  );
}
