import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => {
  const store = new Headers({
    host: "localhost:3000",
    origin: "http://localhost:3000",
    "x-forwarded-for": "198.51.100.9",
    "user-agent": "vitest",
  });
  return {
    headers: async () => store,
    cookies: async () => ({ get: () => undefined, has: () => false, set: () => undefined, delete: () => undefined }),
  };
});

let chartRoute: { GET: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response> };
let matrixRoute: { POST: (request: Request) => Promise<Response> };
let astrologyRoute: { POST: (request: Request) => Promise<Response> };

beforeAll(async () => {
  chartRoute = (await import("@/app/api/charts/[id]/route")) as typeof chartRoute;
  matrixRoute = (await import("@/app/api/charts/matrix/route")) as typeof matrixRoute;
  astrologyRoute = (await import("@/app/api/charts/astrology/route")) as typeof astrologyRoute;
});

const request = (body: unknown) =>
  new Request("http://localhost:3000/api/charts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });

const read = (id: string) => chartRoute.GET(new Request(`http://localhost:3000/api/charts/${id}`), { params: Promise.resolve({ id }) });

describe("GET /api/charts/[id]", () => {
  it("отдаёт расчёт матрицы и только бесплатные разделы", async () => {
    const created = (await (await matrixRoute.POST(request({ date: "1992-06-23" }))).json()) as { calculationId: string };
    const response = await read(created.calculationId);
    const data = (await response.json()) as {
      apiVersion: string;
      direction: string;
      chart: { byKey: { center: { arcanum: number } } };
      interpretation: { sections: { id: string }[]; lockedTitles: string[]; totalCount: number; freeCount: number };
    };
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(data.apiVersion).toBe("1");
    expect(data.direction).toBe("matrix");
    expect(data.chart.byKey.center.arcanum).toBe(10);
    expect(data.interpretation.freeCount).toBe(data.interpretation.sections.length);
    expect(data.interpretation.totalCount).toBeGreaterThan(data.interpretation.freeCount);
    expect(data.interpretation.lockedTitles.length).toBeGreaterThan(0);
    // Тексты закрытых разделов в ответ не попадают.
    expect(data.interpretation.sections.every((section) => !data.interpretation.lockedTitles.includes(section.id))).toBe(true);
  });

  it("отдаёт натальную карту", async () => {
    const created = (await (
      await astrologyRoute.POST(
        request({
          date: "1990-05-05",
          timeAccuracy: "unknown",
          time: null,
          place: { name: "Казань", country: "Россия", latitude: 55.7963, longitude: 49.1088, timezone: "Europe/Moscow" },
        })
      )
    ).json()) as { calculationId: string };
    const data = (await (await read(created.calculationId)).json()) as { direction: string; chart: { ascendant: unknown } };
    expect(data.direction).toBe("astrology");
    expect(data.chart.ascendant).toBeNull();
  });

  it("возвращает 404 для неизвестного и 400 для некорректного id", async () => {
    expect((await read("calc_000000000000000000000000")).status).toBe(404);
    expect((await read("../../etc/passwd")).status).toBe(400);
  });
});
