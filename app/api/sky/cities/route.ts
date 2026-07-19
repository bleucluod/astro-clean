import { filterIranCities } from "@/lib/locations/iran-cities";

const MAX_QUERY_LENGTH = 80;
const MAX_RESULTS = 8;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2 || query.length > MAX_QUERY_LENGTH) {
    return Response.json({ cities: [] });
  }

  const cities = filterIranCities(query).slice(0, MAX_RESULTS).map((city) => ({
    id: city.id,
    faName: city.faName,
    provinceFaName: city.provinceFaName,
  }));

  return Response.json(
    { cities },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
