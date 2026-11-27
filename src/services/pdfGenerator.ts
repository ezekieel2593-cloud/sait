/**
 * Сервисный модуль генерации PDF и изображений для соцсетей.
 *
 * Два сценария:
 *  1. Сторис-картинка «Поделиться картой» — генерируется в браузере (canvas)
 *     и скачивается одним кликом. Работает без сервера.
 *  2. Персональные PDF-гайды — на сервере (клиент получает готовые файлы
 *     на полке «Мои PDF»). Точка расширения для внешнего генератора.
 */

export interface ShareCardInput {
  name: string;
  /** Подпись-эмблема: аркан матрицы или знак светила. */
  emblem: string;
  subtitle: string;
  birthday: string;
  world: "astro" | "matrix";
  siteUrl: string;
}

const WORLD_COLORS: Record<ShareCardInput["world"], { from: string; to: string; accent: string }> = {
  astro: { from: "#0a1228", to: "#2a2350", accent: "#ecd094" },
  matrix: { from: "#05131f", to: "#0e4a63", accent: "#9fe9ff" },
};

/** Сторис-картинка 1080×1920: фон мира, эмблема, имя и ссылка на сайт. */
export function generateShareImage(input: ShareCardInput): Promise<Blob> {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен в этом браузере");

  const colors = WORLD_COLORS[input.world];

  // Фон: диагональный градиент мира + мягкие круги свечения.
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.from);
  gradient.addColorStop(1, colors.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  for (const [x, y, r, alpha] of [
    [240, 420, 320, 0.18],
    [860, 1500, 380, 0.14],
    [820, 300, 180, 0.1],
  ] as const) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `${colors.accent}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Звёзды.
  ctx.fillStyle = "rgba(255,255,255,.8)";
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 90; i += 1) {
    const r = random() * 1.6 + 0.4;
    ctx.globalAlpha = 0.25 + random() * 0.55;
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Рамка.
  ctx.strokeStyle = `${colors.accent}66`;
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, width - 128, height - 128);

  const center = width / 2;
  ctx.textAlign = "center";

  // Эмблема: круг + подпись аркана/знака.
  ctx.beginPath();
  ctx.arc(center, 560, 190, 0, Math.PI * 2);
  ctx.strokeStyle = `${colors.accent}aa`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center, 560, 150, 0, Math.PI * 2);
  ctx.strokeStyle = `${colors.accent}55`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = colors.accent;
  ctx.font = "500 132px Georgia, serif";
  ctx.fillText(input.emblem.slice(0, 10), center, 610);

  // Заголовки.
  ctx.fillStyle = "#f2f8ff";
  ctx.font = "600 34px Georgia, serif";
  ctx.fillText("МОЯ КАРТА", center, 330);
  ctx.font = "italic 52px Georgia, serif";
  ctx.fillText(input.name ? input.name : "Моя вселенная", center, 900);
  ctx.font = "26px Georgia, serif";
  ctx.fillStyle = `${colors.accent}`;
  ctx.fillText(input.subtitle, center, 980);
  ctx.font = "24px Georgia, serif";
  ctx.fillStyle = "rgba(235,244,255,.85)";
  if (input.birthday) ctx.fillText(input.birthday, center, 1040);

  ctx.font = "600 30px Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(input.siteUrl, center, height - 170);
  ctx.font = "20px Arial, sans-serif";
  ctx.fillStyle = "rgba(235,244,255,.7)";
  ctx.fillText("рассчитай свою карту бесплатно", center, height - 126);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Не удалось создать изображение"));
      },
      "image/png",
      0.95,
    );
  });
}

/** Скачивает blob как файл (кнопка «Поделиться»). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface PdfRenderTask {
  /** Название гайда, как в кабинете специалиста. */
  title: string;
  /** Данные клиента для персонализации. */
  client: { name: string; birthday: string };
}

/**
 * Точка расширения: персональный PDF рендерится на сервере или внешним
 * сервисом (готовая структура: кабинет специалиста загружает готовый файл
 * в полку клиента, поэтому интерфейсу здесь ничего менять не нужно).
 */
export async function renderPersonalPdf(_task: PdfRenderTask): Promise<Blob> {
  throw new Error(
    "Персональные PDF собираются на сервере: гайды прикрепляет специалист в панели (Клиенты → Прикрепить PDF). Подключение внешнего генератора — следующий шаг, интерфейс менять не придётся.",
  );
}
