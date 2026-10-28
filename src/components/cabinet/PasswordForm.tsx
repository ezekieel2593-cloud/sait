"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockIcon } from "@/components/icons";

export function PasswordForm() {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", repeatPassword: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/specialist/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string; fields?: Record<string, string> };
      if (!response.ok || !data.ok) {
        setError(data.fields ? Object.values(data.fields)[0] ?? data.error : data.error ?? "Не удалось изменить пароль");
        return;
      }
      setMessage(data.message ?? "Пароль изменён");
      setForm({ currentPassword: "", newPassword: "", repeatPassword: "" });
      window.setTimeout(() => {
        router.replace("/specialist/login");
        router.refresh();
      }, 1600);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      {(
        [
          ["currentPassword", "Текущий пароль", "current-password"],
          ["newPassword", "Новый пароль (минимум 10 символов)", "new-password"],
          ["repeatPassword", "Повторите новый пароль", "new-password"],
        ] as const
      ).map(([key, label, autocomplete]) => (
        <label key={key} className="grid gap-1.5">
          <span className="text-[0.82rem] font-semibold text-[var(--ocean)]">{label}</span>
          <input
            className="input"
            type="password"
            autoComplete={autocomplete}
            value={form[key]}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            required
          />
        </label>
      ))}
      {message ? <p className="text-[0.82rem] text-[#2f6570]">{message}</p> : null}
      {error ? (
        <p className="flex items-center gap-1.5 text-[0.82rem] text-[#8d4147]">
          <LockIcon className="h-3.5 w-3.5" /> {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving} data-state={saving ? "loading" : undefined}>
          {saving ? "Меняем" : "Изменить пароль"}
        </button>
      </div>
      <p className="text-[0.74rem] text-[var(--ink-soft)]">
        После смены пароля все сессии завершаются — потребуется войти заново.
      </p>
    </form>
  );
}
