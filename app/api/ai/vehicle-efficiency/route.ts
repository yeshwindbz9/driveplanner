import { NextResponse } from "next/server";

type FuelType = "petrol" | "diesel" | "hybrid" | "electric";

type VehicleEfficiencyRequest = {
  year?: string;
  make?: string;
  model?: string;
  fuelType?: FuelType;
};

type VehicleEfficiencyResponse = {
  efficiency: number | null;
  unit: "mpg" | "mi_per_kwh";
  confidence: "low" | "medium" | "high";
  matchedVehicle: string;
  note: string;
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    efficiency: {
      type: "number",
      nullable: true,
      description:
        "Estimated typical real-world combined efficiency. Return UK imperial MPG for petrol, diesel or hybrid, or miles per kWh for electric.",
    },
    unit: {
      type: "string",
      enum: ["mpg", "mi_per_kwh"],
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    matchedVehicle: {
      type: "string",
      description:
        "Concise description of the vehicle the estimate is based on.",
    },
    note: {
      type: "string",
      description:
        "Short caveat explaining the approximation, especially if several engines or trims exist.",
    },
  },
  required: [
    "efficiency",
    "unit",
    "confidence",
    "matchedVehicle",
    "note",
  ],
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key is not configured." },
      { status: 500 },
    );
  }

  if (!modelName) {
    return NextResponse.json(
      { error: "Gemini model is not configured." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as VehicleEfficiencyRequest;

    const year = body.year?.trim() ?? "";
    const make = body.make?.trim() ?? "";
    const model = body.model?.trim() ?? "";
    const fuelType = body.fuelType;

    if (!year || !make || !model || !fuelType) {
      return NextResponse.json(
        { error: "Year, make, model and fuel type are required." },
        { status: 400 },
      );
    }

    if (!["petrol", "diesel", "hybrid", "electric"].includes(fuelType)) {
      return NextResponse.json(
        { error: "Invalid fuel type." },
        { status: 400 },
      );
    }

    const expectedUnit = fuelType === "electric" ? "mi_per_kwh" : "mpg";

    const prompt = `
You estimate vehicle efficiency for a UK journey-planning application.

Vehicle supplied by the user:
- Year: ${year}
- Make: ${make}
- Model: ${model}
- Fuel type: ${fuelType}

Return a useful but conservative estimate of TYPICAL REAL-WORLD COMBINED efficiency.

Rules:
1. This is a planning estimate, not an official manufacturer specification.
2. For petrol, diesel and hybrid vehicles, return UK MPG using imperial gallons, never US MPG.
3. For electric vehicles, return miles per kWh.
4. Identify the most likely model generation around the supplied year and fuel type.
5. If an exact engine or trim is not supplied, do NOT return null merely because several variants existed. Instead choose a sensible middle-of-the-range representative real-world figure across common variants.
6. Prefer a useful broad estimate whenever the year, make, model and fuel type identify a genuine vehicle.
7. Return null only if the vehicle appears invalid, the model cannot reasonably be identified, the fuel type is clearly incompatible, or there is genuinely not enough information to make even a broad estimate.
8. Avoid false precision. MPG should normally be a whole number. EV efficiency should normally use one decimal place.
9. Confidence meanings:
   - high: the supplied details strongly identify a typical efficiency range
   - medium: several common variants exist but a representative estimate is reasonable
   - low: substantial ambiguity remains
10. The unit MUST be exactly: ${expectedUnit}
11. matchedVehicle should be concise, such as "${year} ${make} ${model} ${fuelType}".
12. Keep note to one short sentence.
13. Do not calculate journey cost, fuel volume, electricity use, emissions or journey distance. Only estimate vehicle efficiency.
`.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        modelName,
      )}:generateContent`,
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
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Gemini vehicle efficiency API error:",
        response.status,
        errorText,
      );

      return NextResponse.json(
        { error: "Unable to estimate vehicle efficiency." },
        { status: 502 },
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned an empty vehicle efficiency response.");
    }

    const result = JSON.parse(text) as VehicleEfficiencyResponse;

    // Force the unit to match the selected fuel type.
    result.unit = expectedUnit;

    if (result.efficiency !== null) {
      if (result.unit === "mpg") {
        if (result.efficiency < 10 || result.efficiency > 120) {
          result.efficiency = null;
          result.confidence = "low";
          result.note =
            "The model-specific MPG estimate fell outside the expected range, so the generic fallback should be used.";
        } else {
          result.efficiency = Math.round(result.efficiency);
        }
      } else {
        if (result.efficiency < 1 || result.efficiency > 8) {
          result.efficiency = null;
          result.confidence = "low";
          result.note =
            "The model-specific EV efficiency estimate fell outside the expected range, so the generic fallback should be used.";
        } else {
          result.efficiency = Math.round(result.efficiency * 10) / 10;
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Vehicle efficiency estimation failed:", error);

    return NextResponse.json(
      { error: "Unable to estimate vehicle efficiency." },
      { status: 500 },
    );
  }
}
