/** Client API boundary; keep payment and bot credentials on the server side. */
export type ConsultationRequest = {
  name: string;
  contact: string;
  channel: "telegram" | "max" | "email";
  topic: string;
  message?: string;
};
export type CheckoutRequest = {
  productId: string;
  title: string;
  amountRub: number;
};
const API_BASE = "api";
async function post<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(
      result.error || `Сервис временно недоступен (${response.status})`,
    );
  return result;
}
export const api = {
  async consultation(
    payload: ConsultationRequest,
  ): Promise<{ accepted: boolean; demo?: boolean }> {
    if (typeof window !== "undefined" && window.ASTRA_CONFIG?.api?.enabled) {
      return post("lead.php", {
        name: payload.name,
        direction: "astrology",
        channel: payload.channel,
        contact: payload.contact,
        question: [payload.topic, payload.message].filter(Boolean).join(" — "),
        consent: true,
      });
    }
    return { accepted: false, demo: true };
  },
  async checkout(
    payload: CheckoutRequest,
  ): Promise<{ ready: false; message: string }> {
    return {
      ready: false,
      message: `Оплата «${payload.title}» пока не подключена. Платёж не создан и деньги не списываются.`,
    };
  },
};
declare global {
  interface Window {
    ASTRA_CONFIG?: { api?: { enabled?: boolean } };
  }
}
