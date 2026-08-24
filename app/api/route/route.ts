import { NextRequest, NextResponse } from "next/server";

type RoutePoint = {
  lat: number;
  lon: number;
  name?: string;
};

type RouteRequestBody = {
  points: RoutePoint[];
  avoidTolls?: boolean;
  breakFrequencyHours?: number;
};

type GeoapifyLeg = {
  distance?: number;
  time?: number;
};

type GeoapifyRouteProperties = {
  distance?: number;
  distance_units?: string;
  time?: number;
  toll?: boolean;
  ferry?: boolean;
  legs?: GeoapifyLeg[];
};
type GeoapifyGeometry = {
  type?: string;
  coordinates?: number[][][];
};

type GeoapifyRouteFeature = {
  type?: "Feature";

  properties?: GeoapifyRouteProperties;

  geometry?: GeoapifyGeometry;
};

type GeoapifyRouteResponse = {
  type?: "FeatureCollection";

  features?: GeoapifyRouteFeature[];
};

type Coordinate = {
  lat: number;
  lon: number;
};

type RouteAnchor = Coordinate & {
  progress: number;
  elapsedSeconds: number;
};

function haversineMiles(a: Coordinate, b: Coordinate) {
  const radius = 3958.8;

  const toRadians = (value: number) => (value * Math.PI) / 180;

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const deltaLat = toRadians(b.lat - a.lat);

  const deltaLon = toRadians(b.lon - a.lon);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * radius * Math.asin(Math.sqrt(h));
}

/*
 * Accept both:
 *
 * LineString:
 * [
 *   [lon, lat],
 *   [lon, lat]
 * ]
 *
 * MultiLineString:
 * [
 *   [
 *     [lon, lat],
 *     [lon, lat]
 *   ]
 * ]
 *
 * Geoapify documents the route geometry as
 * MultiLineString, but this deliberately
 * tolerates either representation.
 */
function flattenRouteGeometry(
  geometry?: GeoapifyRouteFeature["geometry"],
): Coordinate[] {
  const raw = geometry?.coordinates;

  if (!Array.isArray(raw)) {
    return [];
  }

  const result: Coordinate[] = [];

  const addCoordinate = (item: unknown) => {
    if (!Array.isArray(item) || item.length < 2) {
      return;
    }

    const lon = item[0];
    const lat = item[1];

    if (
      typeof lon !== "number" ||
      typeof lat !== "number" ||
      !Number.isFinite(lon) ||
      !Number.isFinite(lat)
    ) {
      return;
    }

    const previous = result[result.length - 1];

    if (previous && previous.lat === lat && previous.lon === lon) {
      return;
    }

    result.push({
      lat,
      lon,
    });
  };

  /*
   * LineString detection.
   */
  const looksLikeLineString =
    Array.isArray(raw[0]) && typeof raw[0]?.[0] === "number";

  if (looksLikeLineString) {
    for (const coordinate of raw) {
      addCoordinate(coordinate);
    }

    return result;
  }

  /*
   * MultiLineString.
   */
  for (const line of raw) {
    if (!Array.isArray(line)) {
      continue;
    }

    for (const coordinate of line) {
      addCoordinate(coordinate);
    }
  }

  return result;
}

function buildDistanceIndex(coordinates: Coordinate[]) {
  const cumulative = [0];

  for (let index = 1; index < coordinates.length; index++) {
    cumulative.push(
      cumulative[index - 1] +
        haversineMiles(coordinates[index - 1], coordinates[index]),
    );
  }

  return cumulative;
}

function coordinateAtProgress(
  coordinates: Coordinate[],
  progress: number,
): Coordinate | null {
  if (coordinates.length === 0) {
    return null;
  }

  if (coordinates.length === 1) {
    return coordinates[0];
  }

  const cumulative = buildDistanceIndex(coordinates);

  const totalDistance = cumulative[cumulative.length - 1];

  if (totalDistance <= 0) {
    return coordinates[0];
  }

  const safeProgress = Math.min(Math.max(progress, 0), 1);

  const targetDistance = totalDistance * safeProgress;

  let segmentIndex = 1;

  while (
    segmentIndex < cumulative.length &&
    cumulative[segmentIndex] < targetDistance
  ) {
    segmentIndex++;
  }

  if (segmentIndex >= coordinates.length) {
    return coordinates[coordinates.length - 1];
  }

  const previousIndex = segmentIndex - 1;

  const segmentStart = cumulative[previousIndex];

  const segmentEnd = cumulative[segmentIndex];

  const segmentLength = segmentEnd - segmentStart;

  const localProgress =
    segmentLength > 0 ? (targetDistance - segmentStart) / segmentLength : 0;

  const start = coordinates[previousIndex];

  const end = coordinates[segmentIndex];

  return {
    lat: start.lat + (end.lat - start.lat) * localProgress,

    lon: start.lon + (end.lon - start.lon) * localProgress,
  };
}

function sampleRoute(
  coordinates: Coordinate[],
  durationSeconds: number,
): RouteAnchor[] {
  if (coordinates.length < 2 || durationSeconds <= 0) {
    return [];
  }

  return [0, 0.25, 0.5, 0.75, 1]
    .map((progress) => {
      const coordinate = coordinateAtProgress(coordinates, progress);

      if (!coordinate) {
        return null;
      }

      return {
        ...coordinate,
        progress,
        elapsedSeconds: durationSeconds * progress,
      };
    })
    .filter((item): item is RouteAnchor => item !== null);
}

function calculateBreakAnchors({
  coordinates,
  durationSeconds,
  breakFrequencyHours,
}: {
  coordinates: Coordinate[];
  durationSeconds: number;
  breakFrequencyHours: number;
}): RouteAnchor[] {
  if (coordinates.length < 2 || durationSeconds <= 0) {
    return [];
  }

  const intervalSeconds = breakFrequencyHours * 60 * 60;

  if (intervalSeconds <= 0 || durationSeconds <= intervalSeconds) {
    return [];
  }

  const anchors: RouteAnchor[] = [];

  for (
    let elapsedSeconds = intervalSeconds;
    elapsedSeconds < durationSeconds - 15 * 60;
    elapsedSeconds += intervalSeconds
  ) {
    const progress = elapsedSeconds / durationSeconds;

    const coordinate = coordinateAtProgress(coordinates, progress);

    if (!coordinate) {
      continue;
    }

    anchors.push({
      ...coordinate,
      progress,
      elapsedSeconds,
    });
  }

  return anchors;
}

/*
 * Important fallback:
 *
 * If route geometry ever fails to parse,
 * we can still approximate break positions
 * between the user's actual waypoints.
 *
 * This prevents the entire break system
 * silently disappearing.
 */
function buildFallbackCoordinates(points: RoutePoint[]) {
  return points.map((point) => ({
    lat: point.lat,
    lon: point.lon,
  }));
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
    const body = (await request.json()) as RouteRequestBody;

    const { points, avoidTolls = false, breakFrequencyHours = 2 } = body;

    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json(
        {
          error: "At least two route points are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (points.length > 7) {
      return NextResponse.json(
        {
          error: "A maximum of 7 route points is supported.",
        },
        {
          status: 400,
        },
      );
    }

    const validPoints = points.every(
      (point) =>
        typeof point.lat === "number" &&
        Number.isFinite(point.lat) &&
        typeof point.lon === "number" &&
        Number.isFinite(point.lon),
    );

    if (!validPoints) {
      return NextResponse.json(
        {
          error: "Invalid route coordinates.",
        },
        {
          status: 400,
        },
      );
    }

    const safeBreakFrequency = Number.isFinite(breakFrequencyHours)
      ? Math.min(Math.max(breakFrequencyHours, 1), 4)
      : 2;

    const waypoints = points
      .map((point) => `${point.lat},${point.lon}`)
      .join("|");

    const params = new URLSearchParams({
      waypoints,
      mode: "drive",

      units: "imperial",

      traffic: "free_flow",

      intermediate_waypoint_mode: "stopover",

      apiKey,
    });

    if (avoidTolls) {
      params.set("avoid", "tolls:1");
    }

    const response = await fetch(
      `https://api.geoapify.com/v1/routing?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },

        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error(
        "Geoapify routing failed:",
        response.status,
        await response.text(),
      );

      return NextResponse.json(
        {
          error: "Unable to calculate this route.",
        },
        {
          status: 502,
        },
      );
    }

    const data = (await response.json()) as GeoapifyRouteResponse;

    const feature = data.features?.[0];

    const route = feature?.properties;

    const geometry = feature?.geometry;

    if (!feature || !route) {
      return NextResponse.json(
        {
          error: "No driving route could be found.",
        },
        {
          status: 404,
        },
      );
    }

    const distanceMiles =
      typeof route.distance === "number" ? route.distance : 0;

    const durationSeconds = typeof route.time === "number" ? route.time : 0;

    const legs = (route.legs ?? []).map((leg, index) => ({
      index,

      from: points[index]?.name ?? `Point ${index + 1}`,

      to: points[index + 1]?.name ?? `Point ${index + 2}`,

      distanceMiles: typeof leg.distance === "number" ? leg.distance : 0,

      durationSeconds: typeof leg.time === "number" ? leg.time : 0,
    }));

    let geometryCoordinates = flattenRouteGeometry(geometry);

    /*
     * Critical fallback.
     */
    if (geometryCoordinates.length < 2) {
      console.warn(
        "Geoapify route geometry was unavailable. Falling back to waypoint coordinates.",
      );

      geometryCoordinates = points.map((point) => ({
        lat: point.lat,
        lon: point.lon,
      }));
    }

    const weatherSamples = sampleRoute(geometryCoordinates, durationSeconds);

    const breakAnchors = calculateBreakAnchors({
      coordinates: geometryCoordinates,

      durationSeconds,

      breakFrequencyHours: safeBreakFrequency,
    });

    const midRouteCoordinate = coordinateAtProgress(geometryCoordinates, 0.5);

    const serviceSearchPoint = midRouteCoordinate
      ? {
          ...midRouteCoordinate,

          progress: 0.5,

          elapsedSeconds: durationSeconds * 0.5,
        }
      : null;

    /*
     * TEMP debug information is useful
     * while we're confirming this fix.
     */
    console.log("DrivePlanner route debug:", {
      durationSeconds,

      durationHours: durationSeconds / 3600,

      breakFrequencyHours: safeBreakFrequency,

      geometryType: geometry?.type,

      geometryCoordinates: geometryCoordinates.length,

      breakAnchors: breakAnchors.length,

      anchors: breakAnchors.map((anchor) => ({
        progress: anchor.progress,

        elapsedHours: anchor.elapsedSeconds / 3600,

        lat: anchor.lat,

        lon: anchor.lon,
      })),
    });

    return NextResponse.json({
      distanceMiles,

      distanceKm: distanceMiles * 1.609344,

      durationSeconds,

      toll: Boolean(route.toll),

      ferry: Boolean(route.ferry),

      legs,

      weatherSamples,

      breakAnchors,

      serviceSearchPoint,
    });
  } catch (error) {
    console.error("Routing API error:", error);

    return NextResponse.json(
      {
        error: "Unable to calculate the route.",
      },
      {
        status: 500,
      },
    );
  }
}
