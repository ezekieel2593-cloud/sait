"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutIcon } from "@/components/icons";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await fetch("/api/specialist/logout", { method: "POST" });
      router.replace("/specialist/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-[0.8rem] text-[var(--ink)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ocean)]"
    >
      <LogoutIcon className="h-3.5 w-3.5" />
      {loading ? "Выходим…" : "Выйти"}
    </button>
  );
}
