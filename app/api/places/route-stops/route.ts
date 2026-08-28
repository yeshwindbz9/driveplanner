import { NextRequest, NextResponse } from "next/server";

type FuelType = "petrol" | "diesel" | "hybrid" | "electric";

type SearchAnchor = {
  lat: number;
  lon: number;
  progress: number;
  elapsedSeconds: number;
};

type RequestBody = {
  breakAnchors?: SearchAnchor[];
  serviceSearchPoint?: SearchAnchor | null;
  fuelType: FuelType;
};

type PlaceFeature = {
  properties?: {
    place_id?: string;

    name?: string;
    formatted?: string;

    address_line1?: string;
    address_line2?: string;

    city?: string;
    postcode?: string;

    lat?: number;
    lon?: number;

    categories?: string[];

    /*
     * Geoapify may also return
     * distance from proximity bias.
     */
    distance?: number;
  };
};

type CleanPlace = {
  id: string;

  name: string;
  address: string;

  city: string | null;
  postcode: string | null;

  lat: number;
  lon: number;

  categories: string[];

  distanceMiles: number;

  isVehicleStop: boolean;
  isRefreshment: boolean;
  hasToilet: boolean;
};

function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const radius = 3958.8;

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);

  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * radius * Math.asin(Math.sqrt(a));
}

function hasCategory(categories: string[], prefix: string) {
  return categories.some(
    (category) => category === prefix || category.startsWith(`${prefix}.`),
  );
}

async function searchPlaces({
  anchor,
  apiKey,
  fuelType,
  radiusMeters,
}: {
  anchor: SearchAnchor;
  apiKey: string;
  fuelType: FuelType;
  radiusMeters: number;
}): Promise<CleanPlace[]> {
  const vehicleCategory =
    fuelType === "electric"
      ? "service.vehicle.charging_station"
      : "service.vehicle.fuel";

  /*
   * Use broad catering as well as
   * specific services.
   */
  const categories = [
    "catering",
    "commercial.supermarket",
    vehicleCategory,
    "amenity.toilet",
  ].join(",");

  const params = new URLSearchParams({
    categories,

    filter: `circle:${anchor.lon},${anchor.lat},${radiusMeters}`,

    bias: `proximity:${anchor.lon},${anchor.lat}`,

    limit: "50",

    lang: "en",

    apiKey,
  });

  const response = await fetch(
    `https://api.geoapify.com/v2/places?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },

      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error(
      "Geoapify Places failed:",
      response.status,
      await response.text(),
    );

    return [];
  }

  const data = await response.json();

  const features = (data.features ?? []) as PlaceFeature[];

  const places: CleanPlace[] = [];

  for (const feature of features) {
    const properties = feature.properties;

    if (
      typeof properties?.lat !== "number" ||
      typeof properties?.lon !== "number"
    ) {
      continue;
    }

    const categories = Array.isArray(properties.categories)
      ? properties.categories
      : [];

    const isFuel = hasCategory(categories, "service.vehicle.fuel");

    const isCharging = hasCategory(
      categories,
      "service.vehicle.charging_station",
    );

    const isRefreshment =
      hasCategory(categories, "catering") ||
      hasCategory(categories, "commercial.supermarket");

    const hasToilet = hasCategory(categories, "amenity.toilet");

    const isVehicleStop = fuelType === "electric" ? isCharging : isFuel;

    const distanceMiles = haversineMiles(
      anchor.lat,
      anchor.lon,
      properties.lat,
      properties.lon,
    );

    places.push({
      id: properties.place_id ?? `${properties.lat}-${properties.lon}`,

      name:
        properties.name ??
        properties.address_line1 ??
        properties.formatted ??
        "Nearby stop",

      address:
        properties.formatted ??
        [properties.address_line1, properties.address_line2]
          .filter(Boolean)
          .join(", "),

      city: properties.city ?? null,

      postcode: properties.postcode ?? null,

      lat: properties.lat,

      lon: properties.lon,

      categories,

      distanceMiles,

      isVehicleStop,

      isRefreshment,

      hasToilet,
    });
  }

  return places.sort((a, b) => a.distanceMiles - b.distanceMiles);
}

async function searchWithFallback({
  anchor,
  apiKey,
  fuelType,
}: {
  anchor: SearchAnchor;
  apiKey: string;
  fuelType: FuelType;
}) {
  /*
   * Route points often land in a
   * rural piece of road, so widen
   * progressively.
   */
  for (const radius of [5000, 10000, 15000]) {
    const places = await searchPlaces({
      anchor,
      apiKey,
      fuelType,
      radiusMeters: radius,
    });

    if (places.length > 0) {
      return {
        places,
        searchRadiusMeters: radius,
      };
    }
  }

  return {
    places: [],
    searchRadiusMeters: 15000,
  };
}

function sameAnchor(first: SearchAnchor, second: SearchAnchor) {
  return (
    Math.abs(first.lat - second.lat) < 0.0001 &&
    Math.abs(first.lon - second.lon) < 0.0001
  );
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Geoapify API key is not configured.",
      },
      {
        status: 500,
      },
    );
  }

  try {
    const body = (await request.json()) as RequestBody;

    const breakAnchors = Array.isArray(body.breakAnchors)
      ? body.breakAnchors
      : [];

    const serviceSearchPoint = body.serviceSearchPoint ?? null;

    const fuelType = body.fuelType;

    if (!["petrol", "diesel", "hybrid", "electric"].includes(fuelType)) {
      return NextResponse.json(
        {
          error: "Invalid fuel type.",
        },
        {
          status: 400,
        },
      );
    }

    // console.log("DrivePlanner stop search:", {
    //   breakAnchorCount: breakAnchors.length,

    //   breakAnchors,

    //   serviceSearchPoint,

    //   fuelType,
    // });

    const allAnchors = [...breakAnchors];

    if (serviceSearchPoint) {
      const exists = allAnchors.some((anchor) =>
        sameAnchor(anchor, serviceSearchPoint),
      );

      if (!exists) {
        allAnchors.push(serviceSearchPoint);
      }
    }

    if (allAnchors.length === 0) {
      return NextResponse.json({
        breaks: [],
        recommendedVehicleStop: null,
      });
    }

    const searchResults = await Promise.all(
      allAnchors.map(async (anchor) => {
        const result = await searchWithFallback({
          anchor,
          apiKey,
          fuelType,
        });

        // console.log("Stop anchor result:", {
        //   progress: anchor.progress,

        //   elapsedHours: anchor.elapsedSeconds / 3600,

        //   places: result.places.length,

        //   radius: result.searchRadiusMeters,
        // });

        return {
          anchor,
          ...result,
        };
      }),
    );

    const breaks = breakAnchors.map((breakAnchor) => {
      const result = searchResults.find(({ anchor }) =>
        sameAnchor(anchor, breakAnchor),
      );

      const places = result?.places ?? [];

      /*
       * Score a useful break.
       *
       * Catering first.
       * Vehicle stop second.
       * Toilet third.
       * Anything else last.
       */
      const recommendedBreak =
        places.find((place) => place.isRefreshment) ??
        places.find((place) => place.isVehicleStop) ??
        places.find((place) => place.hasToilet) ??
        places[0] ??
        null;

      return {
        anchor: breakAnchor,

        recommendedBreak,

        searchRadiusMeters: result?.searchRadiusMeters ?? null,
      };
    });

    const vehicleCandidates = searchResults.flatMap(({ places }) =>
      places.filter((place) => place.isVehicleStop),
    );

    const uniqueVehicleStops = Array.from(
      new Map(vehicleCandidates.map((place) => [place.id, place])).values(),
    ).sort((a, b) => a.distanceMiles - b.distanceMiles);

    // console.log("DrivePlanner stops result:", {
    //   breaks: breaks.length,

    //   breaksWithPlaces: breaks.filter((item) => item.recommendedBreak).length,

    //   vehicleStops: uniqueVehicleStops.length,
    // });

    return NextResponse.json({
      breaks,

      recommendedVehicleStop: uniqueVehicleStops[0] ?? null,
    });
  } catch (error) {
    console.error("Route stop search error:", error);

    return NextResponse.json(
      {
        error: "Unable to find route stops.",
      },
      {
        status: 500,
      },
    );
  }
}
