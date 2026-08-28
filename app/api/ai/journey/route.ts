import { NextResponse } from "next/server";

type JourneyPayload = {
  trip: {
    type: "one_way" | "round_trip";
    outboundDeparture: string;
    returnDeparture: string | null;
  };
  route: {
    from: string;
    to: string;
    distanceMiles: number;
    durationSeconds: number;
    toll: boolean;
    ferry: boolean;
    userStops: string[];
  };
  vehicle: {
    fuelType: string;
    description: string;
    efficiencyLabel: string;
  };
  cost: {
    currency: string;
    currencySymbol: string;
    amount: number;
    energyUsed: number;
    energyUnit: string;
    pricePerUnit: number;
  };
  emissions: {
    emissionsKg: number;
  };
  preferences: {
    breakFrequencyHours: number;
    drivingStyle: string;
    avoidTolls: boolean;
    weatherSensitive: boolean;
  };
  weather: JourneyWeather;
  returnWeather: JourneyWeather | null;
  breaks: JourneyBreak[];
  returnBreaks: JourneyBreak[];
  vehicleStop: JourneyVehicleStop | null;
  returnVehicleStop: JourneyVehicleStop | null;
};

type JourneyWeather = {
  overallRisk: "low" | "medium" | "high" | "unknown";
  warnings: string[];
  points: Array<{
    position: string;
    condition: string;
    temperature: number;
    precipitationProbability: number;
    windGust: number;
  }>;
};

type JourneyBreak = {
  elapsedSeconds: number;
  placeName: string | null;
  distanceMiles: number | null;
};

type JourneyVehicleStop = {
  name: string;
  address: string;
  distanceMiles: number;
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    weatherAdvice: { type: "string" },
    tips: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
    },
    handwrittenNote: { type: "string" },
    travelRecommendation: {
      type: "string",
      enum: ["drive", "train", "either", "unknown"],
    },
    travelReason: { type: "string" },
    trainEstimate: {
      type: "object",
      properties: {
        available: {
          type: "string",
          enum: ["yes", "no", "uncertain"],
        },
        durationText: {
          type: "string",
          nullable: true,
          description:
            "Approximate total rail journey duration such as '~3h 20m'. Null if a reasonable estimate cannot be made.",
        },
        fareText: {
          type: "string",
          nullable: true,
          description:
            "Broad approximate fare range in the supplied currency, such as '£45–£80'. Null if a reasonable estimate cannot be made.",
        },
        confidence: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
        note: { type: "string" },
      },
      required: ["available", "durationText", "fareText", "confidence", "note"],
    },
  },
  required: [
    "headline",
    "summary",
    "weatherAdvice",
    "tips",
    "handwrittenNote",
    "travelRecommendation",
    "travelReason",
    "trainEstimate",
  ],
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as JourneyPayload;

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;

    if (!apiKey || !model) {
      return NextResponse.json(
        { error: "Gemini is not configured." },
        { status: 500 },
      );
    }

    const prompt = `
You are the recommendation layer for DrivePlanner, a UK-focused driving journey planner.

All route distance, duration, cost, energy use, emissions, weather and stop information below has already been calculated by other services. Treat those values as facts. Do NOT recalculate or replace them.

Journey data:
${JSON.stringify(payload, null, 2)}

Write concise, practical advice for the driver.

Rules:
- headline: short and useful.
- summary: explain the overall drive using the supplied facts.
- weatherAdvice: use only the supplied weather information. If weather is unknown, say so briefly.
- tips: exactly 3 practical tips grounded in this journey.
- handwrittenNote: very short informal note suitable for a handwritten annotation.
- travelRecommendation: drive, train, either, or unknown.
- travelReason: a short explanation comparing the calculated drive with the rough train estimate.

TRAIN ESTIMATE RULES:
- Train values are rough AI planning estimates based on general knowledge only.
- They are NOT live, current, checked, booked, timetable or fare data.
- Estimate a typical city-centre-to-city-centre passenger rail journey where that interpretation is reasonable.
- Use broad time/fare estimates, never false precision.
- Good examples: "~2h 10m", "~3h–3h 30m", "£35–£70".
- Bad example: "£63.42".
- Use the journey currency: ${payload.cost.currency} (${payload.cost.currencySymbol}).
- If you are not reasonably confident that a practical rail journey exists, use available="uncertain" or "no" and set durationText and fareText to null.
- Do not invent a train journey merely to fill the fields.
- If the destination is an airport/landmark with a normal rail connection, estimate the practical rail journey to that destination where reasonable.
- note should include a short caveat/context, not repeat the entire disclaimer.

ROUND TRIP RULES:
- If trip.type is "round_trip", the supplied driving distance, duration, cost, energy use and emissions represent the ENTIRE outbound + return journey.
- Do not describe those combined driving totals as one-way figures.
- For a round trip, trainEstimate.durationText should be the approximate ONE-WAY rail journey duration.
- For a round trip, trainEstimate.fareText should be a broad approximate RETURN rail fare in the supplied currency.
- For a round trip, make the trainEstimate.note clear that time is one-way and fare is return.
- Consider both outbound and return supplied weather when writing weatherAdvice.
- If return weather is unknown/unavailable, say that briefly rather than inventing conditions.
- Return-route breaks and vehicle stops are optional context; use them only when helpful.

SCHEDULE RULES:
- Respect trip.outboundDeparture and trip.returnDeparture as the planned travel times supplied by the app.
- If the journey is scheduled, write advice for those planned times, not as though the user is leaving immediately.

Do not claim that you checked live rail data, traffic, fuel prices or weather outside the supplied data.
`.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );

    if (!response.ok) {
      const details = await response.text();
      console.error("Gemini API error:", response.status, details);
      return NextResponse.json(
        { error: "Unable to generate journey advice." },
        { status: 502 },
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "Gemini returned an empty journey response." },
        { status: 502 },
      );
    }

    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error("AI journey route failed:", error);
    return NextResponse.json(
      { error: "Unable to generate journey advice." },
      { status: 500 },
    );
  }
}
