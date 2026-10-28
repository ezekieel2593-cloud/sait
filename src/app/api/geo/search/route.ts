import { NextResponse } from "next/server";
import { searchCities } from "@/lib/astronomy/cities";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const results = searchCities(query, 8);
  return NextResponse.json(
    {
      results: results.map((city) => ({
        id: city.id,
        name: city.name,
        region: city.region ?? null,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
