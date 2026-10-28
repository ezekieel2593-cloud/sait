"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types";
import { CheckIcon, CopyIcon, RefreshIcon } from "@/components/icons";

interface LeadActionsProps {
  leadId: string;
  status: LeadStatus;
  notes: string | null;
  fullText: string;
  hasContact: boolean;
}

export function LeadActions({ leadId, status, notes, fullText, hasContact }: LeadActionsProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(status);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [noteValue, setNoteValue] = useState(notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesMessage, setNotesMessage] = useState<string | null>(null);

  const [notifyState, setNotifyState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [anonymizeState, setAnonymizeState] = useState<"idle" | "confirm">("idle");

  const saveStatus = async (next: LeadStatus) => {
    setStatusSaving(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/specialist/leads/${leadId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; status?: LeadStatus };
      if (!response.ok || !data.ok) {
        setStatusMessage(data.error ?? "Не удалось изменить статус");
        setCurrentStatus(status);
      } else {
        setCurrentStatus(next);
        setStatusMessage("Статус обновлён");
        router.refresh();
      }
    } catch {
      setStatusMessage("Сеть недоступна");
      setCurrentStatus(status);
    } finally {
      setStatusSaving(false);
    }
  };

  const saveNotes = async () => {
    setNotesSaving(true);
    setNotesMessage(null);
    try {
      const response = await fetch(`/api/specialist/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteValue }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setNotesMessage(data.error ?? "Не удалось сохранить заметку");
      } else {
        setNotesMessage("Сохранено");
        router.refresh();
      }
    } catch {
      setNotesMessage("Сеть недоступна");
    } finally {
      setNotesSaving(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const retryNotify = async () => {
    setNotifyState("loading");
    setNotifyMessage(null);
    try {
      const response = await fetch(`/api/specialist/leads/${leadId}/notify`, { method: "POST" });
      const data = (await response.json()) as { ok?: boolean; error?: string; outcomes?: { channel: string; status: string; error?: string }[] };
      if (!response.ok || !data.ok) {
        setNotifyState("error");
        setNotifyMessage(data.error ?? "Не удалось отправить");
        return;
      }
      setNotifyState("done");
      setNotifyMessage(
        (data.outcomes ?? [])
          .map((outcome) => `${outcome.channel}: ${outcome.status}${outcome.error ? ` (${outcome.error})` : ""}`)
          .join(" · ") || "Нет настроенных каналов"
      );
      router.refresh();
    } catch {
      setNotifyState("error");
      setNotifyMessage("Сеть недоступна");
    }
  };

  const [anonymizeBusy, setAnonymizeBusy] = useState(false);

  const anonymize = async () => {
    setAnonymizeBusy(true);
    try {
      await fetch(`/api/specialist/leads/${leadId}/anonymize`, { method: "POST" });
      setAnonymizeState("idle");
      router.refresh();
    } finally {
      setAnonymizeBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
        <h2 className="font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">Статус заявки</h2>
        <select
          className="select mt-2 py-2 text-[0.88rem]"
          value={currentStatus}
          disabled={statusSaving}
          onChange={(event) => saveStatus(event.target.value as LeadStatus)}
          aria-label="Статус заявки"
        >
          {LEAD_STATUSES.map((item) => (
            <option key={item} value={item}>
              {LEAD_STATUS_LABELS[item]}
            </option>
          ))}
        </select>
        {statusMessage ? <p className="mt-1.5 text-[0.76rem] text-[var(--ink-soft)]">{statusMessage}</p> : null}
        <p className="mt-2 text-[0.72rem] text-[var(--ink-faint)]">Изменения фиксируются в истории заявки.</p>
      </section>

      <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
        <h2 className="font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">Внутренняя заметка</h2>
        <p className="mt-1 text-[0.72rem] text-[var(--ink-faint)]">Клиент эти заметки не видит.</p>
        <textarea
          className="textarea mt-2 text-[0.86rem]"
          rows={5}
          value={noteValue}
          maxLength={5000}
          onChange={(event) => setNoteValue(event.target.value)}
          placeholder="Что важно помнить по этой заявке"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[0.72rem] text-[var(--ink-faint)]">{noteValue.length}/5000</span>
          <button type="button" className="btn btn--primary btn--sm" onClick={saveNotes} disabled={notesSaving}>
            {notesSaving ? "Сохраняем" : "Сохранить"}
          </button>
        </div>
        {notesMessage ? <p className="mt-1.5 text-[0.76rem] text-[var(--ink-soft)]">{notesMessage}</p> : null}
      </section>

      <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
        <h2 className="font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[var(--ocean)]">Действия</h2>
        <div className="mt-2 grid gap-2">
          <button type="button" className="btn btn--secondary btn--sm justify-start" onClick={copyText}>
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? "Скопировано" : "Скопировать полный разбор"}
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm justify-start"
            onClick={retryNotify}
            disabled={notifyState === "loading"}
            data-state={notifyState === "loading" ? "loading" : undefined}
          >
            {notifyState !== "loading" ? <RefreshIcon className="h-4 w-4" /> : null}
            Отправить уведомления повторно
          </button>
          {notifyMessage ? <p className="text-[0.74rem] text-[var(--ink-soft)]">{notifyMessage}</p> : null}
        </div>
      </section>

      <section className="rounded-[14px] border border-[rgba(198,106,112,0.35)] bg-[rgba(253,246,246,0.7)] p-4">
        <h2 className="font-[family-name:var(--font-sans)] text-[0.92rem] font-semibold text-[#8d4147]">Персональные данные</h2>
        <p className="mt-1 text-[0.76rem] text-[#8d4147]/80">
          Удаление необратимо: имя, контакт и вопрос будут обезличены, расчёт отвязан. История останется без персональных данных.
        </p>
        {anonymizeState === "confirm" ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn btn--sm"
              style={{ background: "#8d4147", color: "#fff" }}
              onClick={anonymize}
              disabled={anonymizeBusy}
            >
              Да, удалить данные
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAnonymizeState("idle")}>
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--secondary btn--sm mt-2"
            onClick={() => setAnonymizeState("confirm")}
            disabled={!hasContact}
          >
            Удалить персональные данные
          </button>
        )}
      </section>
    </div>
  );
}
