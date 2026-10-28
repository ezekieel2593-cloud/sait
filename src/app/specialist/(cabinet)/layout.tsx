import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { CabinetNav, CabinetTabs } from "@/components/cabinet/CabinetNav";
import { LogoutButton } from "@/components/cabinet/LogoutButton";
import { Logo } from "@/components/site/Logo";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Кабинет специалиста",
  robots: { index: false, follow: false, nocache: true },
};

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/specialist/login");
  const settings = getSettings();

  return (
    <div className="min-h-screen bg-[#f4f6f7]">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col md:flex-row">
        <aside className="border-b border-[var(--line)] bg-white/80 px-4 py-4 md:min-h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:px-4 md:py-6">
          <div className="flex items-center justify-between gap-2 md:block">
            <Logo />
            <span className="chip chip--soft mt-0 md:mt-3">кабинет</span>
          </div>
          <div className="mt-4 hidden md:block">
            <CabinetNav />
          </div>
          <div className="mt-5 hidden rounded-[12px] border border-[var(--line)] bg-[#fbfbfc] p-3 text-[0.76rem] text-[var(--ink-soft)] md:block">
            <p className="font-semibold text-[var(--ocean)]">{user.name}</p>
            <p className="truncate">{user.email}</p>
            <div className="mt-2">
              <LogoutButton />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(244,246,247,0.92)] px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.8rem] text-[var(--ink-soft)]">
                {settings.site.name} · <span className="text-[var(--ocean)]">{user.name}</span>
              </p>
              <div className="flex items-center gap-2">
                <Link href="/" className="text-[0.78rem] text-[var(--ink-soft)] hover:text-[var(--ocean)]">
                  На сайт
                </Link>
                <span className="md:hidden">
                  <LogoutButton />
                </span>
              </div>
            </div>
            <div className="mt-2">
              <CabinetTabs />
            </div>
          </header>

          <div className="px-4 py-5 md:px-6 md:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
