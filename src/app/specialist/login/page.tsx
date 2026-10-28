import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/cabinet/LoginForm";
import { Logo } from "@/components/site/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход для специалиста",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SpecialistLoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/specialist");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="card">
          <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] text-[var(--ocean)]">Кабинет специалиста</h1>
          <p className="mt-1.5 text-[0.88rem] text-[var(--ink-soft)]">
            Закрытая зона: заявки, полные расчёты и настройки сайта.
          </p>
          <div className="mt-5">
            <LoginForm />
          </div>
        </div>
        <p className="mt-4 text-center text-[0.76rem] text-[var(--ink-faint)]">
          Публичная регистрация отключена. Первый аккаунт создаётся владельцем через{" "}
          <code className="rounded bg-white/70 px-1 py-0.5">npm run create-specialist</code>.
        </p>
      </div>
    </div>
  );
}
