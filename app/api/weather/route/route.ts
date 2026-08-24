import { NextRequest, NextResponse } from "next/server";

type WeatherSample = {
  lat: number;
  lon: number;
  progress: number;
  elapsedSeconds: number;
};

type WeatherRequest = {
  samples: WeatherSample[];
};

type HourlyWeather = {
  time: string[];

  temperature_2m: number[];
  apparent_temperature: number[];

  precipitation_probability: number[];

  precipitation: number[];
  rain: number[];
  snowfall: number[];

  weather_code: number[];

  visibility: number[];

  wind_speed_10m: number[];
  wind_gusts_10m: number[];
};

type OpenMeteoLocation = {
  latitude: number;
  longitude: number;

  hourly: HourlyWeather;
};

type RiskLevel = "low" | "medium" | "high";

function weatherCodeLabel(code: number) {
  if (code === 0) return "Clear";

  if ([1, 2].includes(code)) {
    return "Partly cloudy";
  }

  if (code === 3) {
    return "Overcast";
  }

  if ([45, 48].includes(code)) {
    return "Fog";
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return "Drizzle";
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "Rain";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "Snow";
  }

  if ([95, 96, 99].includes(code)) {
    return "Thunderstorm";
  }

  return "Mixed conditions";
}

function routePositionLabel(progress: number) {
  if (progress <= 0.01) {
    return "Start";
  }

  if (progress >= 0.99) {
    return "Destination";
  }

  if (progress < 0.4) {
    return "First quarter";
  }

  if (progress < 0.6) {
    return "Halfway";
  }

  return "Final quarter";
}

function nearestHourIndex(times: string[], target: Date) {
  let closestIndex = 0;

  let closestDifference = Number.POSITIVE_INFINITY;

  times.forEach((time, index) => {
    // API timezone is explicitly GMT,
    // therefore this string represents UTC.
    const timestamp = new Date(`${time}Z`).getTime();

    const difference = Math.abs(timestamp - target.getTime());

    if (difference < closestDifference) {
      closestDifference = difference;

      closestIndex = index;
    }
  });

  return closestIndex;
}

function getRisk({
  temperature,
  precipitation,
  precipitationProbability,
  rain,
  snowfall,
  visibility,
  windSpeed,
  windGust,
  weatherCode,
}: {
  temperature: number;
  precipitation: number;
  precipitationProbability: number;
  rain: number;
  snowfall: number;
  visibility: number;
  windSpeed: number;
  windGust: number;
  weatherCode: number;
}): {
  level: RiskLevel;
  warnings: string[];
} {
  const warnings: string[] = [];

  let score = 0;

  if (snowfall >= 0.2) {
    score = Math.max(score, 3);

    warnings.push("Snow may affect road conditions.");
  }

  if (temperature <= 1 && precipitation > 0) {
    score = Math.max(score, 3);

    warnings.push("Possible icy road conditions.");
  } else if (temperature <= 2 && precipitation > 0) {
    score = Math.max(score, 2);

    warnings.push("Low temperature with precipitation may increase ice risk.");
  }

  if (rain >= 6 || precipitation >= 6) {
    score = Math.max(score, 3);

    warnings.push("Heavy precipitation expected.");
  } else if (
    rain >= 2 ||
    precipitation >= 2 ||
    precipitationProbability >= 70
  ) {
    score = Math.max(score, 2);

    warnings.push("Wet driving conditions are likely.");
  }

  if (windGust >= 70) {
    score = Math.max(score, 3);

    warnings.push("Strong wind gusts may make driving difficult.");
  } else if (windGust >= 50 || windSpeed >= 40) {
    score = Math.max(score, 2);

    warnings.push("Strong winds are possible.");
  }

  if (visibility < 500) {
    score = Math.max(score, 3);

    warnings.push("Very poor visibility expected.");
  } else if (visibility < 2000) {
    score = Math.max(score, 2);

    warnings.push("Reduced visibility possible.");
  }

  if ([95, 96, 99].includes(weatherCode)) {
    score = Math.max(score, 3);

    warnings.push("Thunderstorms may affect the route.");
  }

  const level: RiskLevel = score >= 3 ? "high" : score === 2 ? "medium" : "low";

  return {
    level,
    warnings,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WeatherRequest;

    const samples = body.samples;

    if (!Array.isArray(samples) || samples.length === 0) {
      return NextResponse.json(
        {
          error: "Weather sample points are required.",
        },
        {
          status: 400,
        },
      );
    }

    const latitude = samples.map((sample) => sample.lat).join(",");

    const longitude = samples.map((sample) => sample.lon).join(",");

    const params = new URLSearchParams({
      latitude,
      longitude,

      hourly: [
        "temperature_2m",
        "apparent_temperature",
        "precipitation_probability",
        "precipitation",
        "rain",
        "snowfall",
        "weather_code",
        "visibility",
        "wind_speed_10m",
        "wind_gusts_10m",
      ].join(","),

      timezone: "GMT",

      temperature_unit: "celsius",

      wind_speed_unit: "kmh",

      precipitation_unit: "mm",

      forecast_days: "7",
    });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },

        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error(
        "Open-Meteo error:",
        response.status,
        await response.text(),
      );

      return NextResponse.json(
        {
          error: "Unable to retrieve route weather.",
        },
        {
          status: 502,
        },
      );
    }

    const raw = await response.json();

    const locations: OpenMeteoLocation[] = Array.isArray(raw) ? raw : [raw];

    const departureTime = new Date();

    const points = samples
      .map((sample, sampleIndex) => {
        const location = locations[sampleIndex];

        if (!location?.hourly) {
          return null;
        }

        const eta = new Date(
          departureTime.getTime() + sample.elapsedSeconds * 1000,
        );

        const hourIndex = nearestHourIndex(location.hourly.time, eta);

        const temperature = location.hourly.temperature_2m[hourIndex] ?? 0;

        const apparentTemperature =
          location.hourly.apparent_temperature[hourIndex] ?? temperature;

        const precipitationProbability =
          location.hourly.precipitation_probability[hourIndex] ?? 0;

        const precipitation = location.hourly.precipitation[hourIndex] ?? 0;

        const rain = location.hourly.rain[hourIndex] ?? 0;

        const snowfall = location.hourly.snowfall[hourIndex] ?? 0;

        const weatherCode = location.hourly.weather_code[hourIndex] ?? 0;

        const visibility = location.hourly.visibility[hourIndex] ?? 10000;

        const windSpeed = location.hourly.wind_speed_10m[hourIndex] ?? 0;

        const windGust = location.hourly.wind_gusts_10m[hourIndex] ?? 0;

        const risk = getRisk({
          temperature,
          precipitation,
          precipitationProbability,
          rain,
          snowfall,
          visibility,
          windSpeed,
          windGust,
          weatherCode,
        });

        return {
          lat: sample.lat,
          lon: sample.lon,

          progress: sample.progress,

          position: routePositionLabel(sample.progress),

          eta: eta.toISOString(),

          temperature,

          apparentTemperature,

          precipitationProbability,

          precipitation,

          rain,

          snowfall,

          visibility,

          windSpeed,

          windGust,

          weatherCode,

          condition: weatherCodeLabel(weatherCode),

          riskLevel: risk.level,

          warnings: risk.warnings,
        };
      })
      .filter(Boolean);

    const riskOrder = {
      low: 1,
      medium: 2,
      high: 3,
    };

    const overallRisk = points.reduce<RiskLevel>((highest, point) => {
      if (!point) {
        return highest;
      }

      return riskOrder[point.riskLevel] > riskOrder[highest]
        ? point.riskLevel
        : highest;
    }, "low");

    const warnings = Array.from(
      new Set(points.flatMap((point) => point?.warnings ?? [])),
    );

    return NextResponse.json({
      overallRisk,
      warnings,
      points,

      departureTime: departureTime.toISOString(),
    });
  } catch (error) {
    console.error("Weather API error:", error);

    return NextResponse.json(
      {
        error: "Unable to retrieve route weather.",
      },
      {
        status: 500,
      },
    );
  }
}
