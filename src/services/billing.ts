/**
 * Сервисный модуль платежей: тарифы и проведение оплаты подписки/PDF.
 *
 * Интерфейс готов к подключению ЮKassa: нужно реализовать createCheckout()
 * через серверный endpoint (webhook ЮKassa → POST api/booking/… или отдельный
 * api/billing.php) и активацию подписки в кабинете специалиста. Интерфейс
 * кабинета менять не придётся — он работает через этот модуль.
 */

export interface SubscriptionTariff {
  title: string;
  price: number;
  period: string;
  note: string;
}

export interface PdfTariff {
  id: string;
  title: string;
  price: number;
  description: string;
}

export interface ConsultationTariff {
  price: number;
  themes: string[];
}

export interface Tariffs {
  subscription: SubscriptionTariff;
  pdfs: PdfTariff[];
  consultation: ConsultationTariff;
}

/** Адрес API хостинга (api.enabled в config.js). */
const apiBase = (): string | null => {
  try {
    const config = (window as unknown as { ASTRA_CONFIG?: { api?: { enabled?: boolean; base?: string } } })
      .ASTRA_CONFIG;
    if (!config?.api?.enabled) return null;
    return (config.api.base || "api").replace(/\/$/, "");
  } catch {
    return null;
  }
};

/** Тарифы с хостинга; при недоступности — локальные значения по умолчанию. */
export async function getTariffs(): Promise<Tariffs | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const response = await fetch(`${base}/tariffs.php`, {
      credentials: "same-origin",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { tariffs?: Tariffs };
    return data.tariffs ?? null;
  } catch {
    return null;
  }
}

export type CheckoutResult =
  | { status: "manual"; instructions: string }
  | { status: "redirect"; confirmationUrl: string };

/**
 * Оформление оплаты подписки.
 *
 * Сейчас — «ручной» сценарий: клиент видит инструкцию, а специалист активирует
 * доступ в панели (Клиенты → Выдать). После подключения ЮKassa метод вернёт
 * confirmation_url — кабинет просто перенаправит клиента.
 */
export async function createSubscriptionCheckout(
  _tariff: SubscriptionTariff,
): Promise<CheckoutResult> {
  return {
    status: "manual",
    instructions:
      "Оплата картой подключается к платформе ЮKassa. Нажмите «Отправить заявку на активацию» — специалист свяжется с вами в Telegram и включит полный доступ сразу после оплаты.",
  };
}

/** Оформление покупки персонального PDF-гайда (тот же ручной сценарий). */
export async function createPdfCheckout(
  _tariff: PdfTariff,
): Promise<CheckoutResult> {
  return {
    status: "manual",
    instructions:
      "Персональный PDF готовит специалист по вашим данным. После оплаты он появится на полке «Мои PDF» в кабинете — скачать можно в один клик.",
  };
}
