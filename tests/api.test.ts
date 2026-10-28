import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Маршруты вызываются напрямую, как обычные функции. `next/headers` подменён,
 * потому что вне запроса Next.js контекст заголовков недоступен.
 */
vi.mock("next/headers", () => {
  const store = new Headers({
    host: "localhost:3000",
    origin: "http://localhost:3000",
    "x-forwarded-for": "203.0.113.7",
    "user-agent": "vitest",
  });
  return {
    headers: async () => store,
    cookies: async () => ({
      get: () => undefined,
      has: () => false,
      set: () => undefined,
      delete: () => undefined,
    }),
  };
});

type RouteModule = { POST: (request: Request) => Promise<Response> };

let matrixRoute: RouteModule;
let astrologyRoute: RouteModule;
let leadsRoute: RouteModule;

beforeAll(async () => {
  matrixRoute = (await import("@/app/api/charts/matrix/route")) as unknown as RouteModule;
  astrologyRoute = (await import("@/app/api/charts/astrology/route")) as unknown as RouteModule;
  leadsRoute = (await import("@/app/api/leads/route")) as unknown as RouteModule;
});

const json = (body: unknown) =>
  new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });

const birth = {
  date: "1992-06-23",
  timeAccuracy: "exact",
  time: "14:30",
  place: {
    name: "Москва",
    region: "Москва",
    country: "Россия",
    latitude: 55.7558,
    longitude: 37.6173,
    timezone: "Europe/Moscow",
  },
};

describe("POST /api/charts/matrix", () => {
  it("создаёт расчёт и возвращает ссылку на результат", async () => {
    const response = await matrixRoute.POST(json({ date: "1992-06-23" }));
    const data = (await response.json()) as { calculationId: string; redirectTo: string; headline: string };
    expect(response.status).toBe(200);
    expect(data.calculationId).toMatch(/^calc_/);
    expect(data.redirectTo).toBe(`/matrix/result/${data.calculationId}`);
    expect(data.headline).toContain("Центр матрицы");
  });

  it("отклоняет будущую и несуществующую дату", async () => {
    expect((await matrixRoute.POST(json({ date: "2999-01-01" }))).status).toBe(422);
    expect((await matrixRoute.POST(json({ date: "1990-02-31" }))).status).toBe(422);
    expect((await matrixRoute.POST(json({}))).status).toBe(422);
  });
});

describe("POST /api/charts/astrology", () => {
  it("создаёт натальную карту", async () => {
    const response = await astrologyRoute.POST(json(birth));
    const data = (await response.json()) as { calculationId: string; headline: string; freeCount: number };
    expect(response.status).toBe(200);
    expect(data.calculationId).toMatch(/^calc_/);
    expect(data.headline).toContain("асцендент");
    expect(data.freeCount).toBeGreaterThan(0);
  });

  it("требует время при точности «exact»", async () => {
    const response = await astrologyRoute.POST(json({ ...birth, time: null }));
    const data = (await response.json()) as { fields?: Record<string, string> };
    expect(response.status).toBe(422);
    expect(data.fields?.time).toBeTruthy();
  });

  it("принимает неизвестное время без домов", async () => {
    const response = await astrologyRoute.POST(json({ ...birth, timeAccuracy: "unknown", time: null }));
    expect(response.status).toBe(200);
  });
});

describe("POST /api/leads", () => {
  it("сохраняет заявку и возвращает публичный номер", async () => {
    const calculation = (await (await matrixRoute.POST(json({ date: "1992-06-23" }))).json()) as { calculationId: string };
    const response = await leadsRoute.POST(
      json({
        name: "Тестовый клиент",
        direction: "matrix",
        channel: "telegram",
        contact: "@test_client",
        question: "Вопрос по работе",
        consent: true,
        calculationId: calculation.calculationId,
      })
    );
    const data = (await response.json()) as { ok: boolean; reference: string; leadId: string };
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.reference).toMatch(/^AP-\d{4}-\d{3}$/);
    expect(data.leadId).toMatch(/^lead_/);
  });

  it("не принимает заявку без согласия", async () => {
    const response = await leadsRoute.POST(
      json({ name: "Без согласия", direction: "astrology", channel: "email", contact: "a@b.co", consent: false })
    );
    const data = (await response.json()) as { fields?: Record<string, string> };
    expect(response.status).toBe(422);
    expect(data.fields?.consent).toBeTruthy();
  });

  it("проверяет формат контакта по каналу", async () => {
    const response = await leadsRoute.POST(
      json({ name: "Кривой контакт", direction: "matrix", channel: "email", contact: "не-почта", consent: true })
    );
    expect(response.status).toBe(422);
  });

  it("не принимает чужой calculationId другого направления", async () => {
    const astrology = (await (await astrologyRoute.POST(json(birth))).json()) as { calculationId: string };
    const response = await leadsRoute.POST(
      json({
        name: "Подмена",
        direction: "matrix",
        channel: "telegram",
        contact: "@fake_user",
        consent: true,
        calculationId: astrology.calculationId,
      })
    );
    expect(response.status).toBe(422);
  });
});
