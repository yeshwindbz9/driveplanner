import { NextResponse } from "next/server";

type JourneyPayload = {
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
  weather: {
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
  breaks: Array<{
    elapsedSeconds: number;
    placeName: string | null;
    distanceMiles: number | null;
  }>;
  vehicleStop: {
    name: string;
    address: string;
    distanceMiles: number;
  } | null;
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
      required: [
        "available",
        "durationText",
        "fareText",
        "confidence",
        "note",
      ],
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
