import { createContext, useContext, useEffect, useState } from "react";
import { getConfig } from "./config";

/**
 * Признак «смотрит владелец».
 *
 * Бесплатная версия показывает часть расшифровки, остальное — закрытые
 * разделы. Владельцу, который вошёл в кабинет, ограничения не нужны: он
 * видит весь разбор. Проверяем это у сервера, а не в браузере — иначе
 * флаг можно было бы включить из консоли.
 *
 * В версии без сервера запрос не делается: там админа нет.
 */

const AdminContext = createContext(false);

/** true — текущий посетитель вошёл как владелец. */
export function useAdmin(): boolean {
  return useContext(AdminContext);
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const config = getConfig();
    if (!config.api?.enabled) return;
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;

    let cancelled = false;
    const controller = new AbortController();
    // Если сервер молчит, страница не должна ждать: через 4 с — гость.
    const timer = window.setTimeout(() => controller.abort(), 4000);

    // try/catch: если fetch недоступен или выбросил исключение синхронно,
    // страница всё равно отрисуется — просто без прав владельца.
    let request: Promise<Response>;
    try {
      request = window.fetch(`${config.api.base || "api"}/session.php`, {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      window.clearTimeout(timer);
      return;
    }

    request
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { admin?: boolean } | null) => {
        if (!cancelled && data?.admin === true) setAdmin(true);
      })
      .catch(() => {
        /* гость: закрытые разделы остаются закрытыми */
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return <AdminContext.Provider value={admin}>{children}</AdminContext.Provider>;
}
