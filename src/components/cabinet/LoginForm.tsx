"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockIcon } from "@/components/icons";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/specialist/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; redirectTo?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Не удалось войти");
        setLoading(false);
        return;
      }
      router.replace(data.redirectTo ?? "/specialist");
      router.refresh();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="field">
        <label htmlFor="login-email">Электронная почта</label>
        <input
          id="login-email"
          className="input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="specialist@example.com"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="login-password">Пароль</label>
        <input
          id="login-password"
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••••"
          required
        />
      </div>

      {error ? (
        <div className="note note--warn" role="alert">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <button type="submit" className="btn btn--primary btn--block" disabled={loading} data-state={loading ? "loading" : undefined}>
        {loading ? "Входим" : "Войти"}
      </button>

      <p className="text-center text-[0.78rem] text-[var(--ink-faint)]">
        После нескольких неудачных попыток вход временно блокируется. Восстановление пароля — через владельца проекта:
        см. документацию.
      </p>
    </form>
  );
}
