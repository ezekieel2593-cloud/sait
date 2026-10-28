"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, DocumentIcon, InboxIcon, SettingsIcon } from "@/components/icons";

const LINKS = [
  { href: "/specialist", label: "Обзор", icon: ChartIcon },
  { href: "/specialist/leads", label: "Заявки", icon: InboxIcon },
  { href: "/specialist/knowledge", label: "База знаний", icon: DocumentIcon },
  { href: "/specialist/settings", label: "Настройки", icon: SettingsIcon },
];

export function CabinetNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Навигация кабинета" className="grid gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/specialist" ? pathname === link.href : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[0.9rem] font-medium transition-colors ${
              active
                ? "bg-[rgba(184,221,224,0.35)] text-[var(--ocean)]"
                : "text-[var(--ink)] hover:bg-[rgba(37,61,75,0.05)] hover:text-[var(--ocean)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CabinetTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Навигация кабинета" className="flex items-center gap-1 overflow-x-auto pb-1 md:hidden">
      {LINKS.map((link) => {
        const active = link.href === "/specialist" ? pathname === link.href : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[0.82rem] font-medium ${
              active ? "bg-[var(--ocean)] text-white" : "bg-white text-[var(--ink)] border border-[var(--line)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
