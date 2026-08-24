import { NextRequest, NextResponse } from "next/server";

type GeoapifyResult = {
  place_id?: string;
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
  postcode?: string;
  lat?: number;
  lon?: number;
  result_type?: string;
};

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text")?.trim();

  if (!text || text.length < 2) {
    return NextResponse.json({
      results: [],
    });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    console.error("GEOAPIFY_API_KEY is missing.");

    return NextResponse.json(
      {
        error: "Geoapify API key is not configured.",
        results: [],
      },
      {
        status: 500,
      },
    );
  }

  try {
    const params = new URLSearchParams({
      text,
      format: "json",
      limit: "6",
      apiKey,
    });

    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },

        // Autocomplete should always be reasonably fresh.
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error(
        "Geoapify autocomplete failed:",
        response.status,
        response.statusText,
      );

      return NextResponse.json(
        {
          error: "Unable to search locations.",
          results: [],
        },
        {
          status: 502,
        },
      );
    }

    const data = await response.json();

    const results = (data.results ?? [])
      .filter(
        (result: GeoapifyResult) =>
          typeof result.lat === "number" && typeof result.lon === "number",
      )
      .map((result: GeoapifyResult) => {
        const name =
          result.name ||
          result.address_line1 ||
          result.city ||
          result.postcode ||
          result.formatted ||
          "Unknown location";

        const formatted =
          result.formatted ||
          [result.address_line1, result.address_line2]
            .filter(Boolean)
            .join(", ");

        return {
          id: result.place_id || `${result.lat}-${result.lon}-${formatted}`,

          name,

          formatted,

          postcode: result.postcode ?? null,

          city: result.city ?? null,

          county: result.county ?? null,

          country: result.country ?? null,

          countryCode: result.country_code ?? null,

          resultType: result.result_type ?? null,

          lat: result.lat,
          lon: result.lon,
        };
      });

    return NextResponse.json({
      results,
    });
  } catch (error) {
    console.error("Autocomplete route error:", error);

    return NextResponse.json(
      {
        error: "Unable to search locations.",
        results: [],
      },
      {
        status: 500,
      },
    );
  }
}
