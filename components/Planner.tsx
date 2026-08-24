"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  CarFront,
  Check,
  CloudRain,
  Coffee,
  Flag,
  Fuel,
  Gauge,
  MapPin,
  Navigation,
  Plus,
  QrCode,
  Route,
  Sparkles,
  Timer,
  Train,
  WalletCards,
  X,
  Zap,
  Leaf,
  CirclePoundSterling,
  TriangleAlert,
  ExternalLink,
  RefreshCcw,
} from "lucide-react";

type PlaceSuggestion = {
  id: string;
  name: string;
  formatted: string;

  postcode: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
  countryCode: string | null;
  resultType: string | null;

  lat: number;
  lon: number;
};

type SelectedPlace = PlaceSuggestion | null;

type LocationFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  icon?: "start" | "end" | "stop";
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
};

type FuelType = "petrol" | "diesel" | "hybrid" | "electric";
type VehicleSize = "small" | "medium" | "large";
type VehicleMode = "generic" | "vehicle";
type Currency = "GBP" | "EUR" | "USD";
type DrivingStyle = "efficient" | "balanced" | "fast";

type RouteLeg = {
  index: number;
  from: string;
  to: string;
  distanceMiles: number;
  durationSeconds: number;
};

type RouteWeatherSample = {
  lat: number;
  lon: number;
  progress: number;
  elapsedSeconds: number;
};

type RouteResult = {
  distanceMiles: number;
  distanceKm: number;
  durationSeconds: number;

  toll: boolean;
  ferry: boolean;

  legs: RouteLeg[];

  weatherSamples: RouteWeatherSample[];

  breakAnchors: RouteAnchor[];

  serviceSearchPoint: RouteAnchor | null;
};

type JourneyCostResult = {
  efficiency: number;
  efficiencyLabel: string;

  energyUsed: number;
  energyUnit: "litres" | "kWh";

  cost: number;

  price: number;
  priceUnit: "litre" | "kWh";
};

type VehicleEfficiencyEstimate = {
  efficiency: number | null;
  unit: "mpg" | "mi_per_kwh";
  confidence: "low" | "medium" | "high";
  matchedVehicle: string;
  note: string;
};

type AIJourneyResult = {
  headline: string;
  summary: string;
  weatherAdvice: string;
  tips: string[];
  handwrittenNote: string;

  travelRecommendation: "drive" | "train" | "either" | "unknown";
  travelReason: string;

  trainEstimate: {
    available: "yes" | "no" | "uncertain";
    durationText: string | null;
    fareText: string | null;
    confidence: "low" | "medium" | "high";
    note: string;
  };
};

type EmissionsResult = {
  emissionsKg: number;

  factor: number;

  factorLabel: string;

  basis: string;

  sourceYear: number;
};

type WeatherRisk = "low" | "medium" | "high";

type WeatherPoint = {
  lat: number;
  lon: number;

  progress: number;
  position: string;

  eta: string;

  temperature: number;
  apparentTemperature: number;

  precipitationProbability: number;

  precipitation: number;
  rain: number;
  snowfall: number;

  visibility: number;

  windSpeed: number;
  windGust: number;

  weatherCode: number;
  condition: string;

  riskLevel: WeatherRisk;

  warnings: string[];
};

type RouteWeatherResult = {
  overallRisk: WeatherRisk;

  warnings: string[];

  points: WeatherPoint[];

  departureTime: string;
};

type RouteAnchor = {
  lat: number;
  lon: number;
  progress: number;
  elapsedSeconds: number;
};

type RecommendedPlace = {
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
};

type RecommendedBreak = {
  anchor: RouteAnchor;

  recommendedBreak: RecommendedPlace | null;
};

type RouteStopsResult = {
  breaks: RecommendedBreak[];

  recommendedVehicleStop: RecommendedPlace | null;
};

const VEHICLE_MAKES = [
  "Audi",
  "BMW",
  "Ford",
  "Honda",
  "Hyundai",
  "Kia",
  "Mercedes-Benz",
  "Nissan",
  "Peugeot",
  "Renault",
  "Skoda",
  "Tesla",
  "Toyota",
  "Vauxhall",
  "Volkswagen",
  "Volvo",
];

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
};

const GENERIC_EFFICIENCY = {
  petrol: {
    small: 50,
    medium: 43,
    large: 35,
  },

  diesel: {
    small: 60,
    medium: 53,
    large: 44,
  },

  hybrid: {
    small: 62,
    medium: 55,
    large: 47,
  },

  electric: {
    small: 4.1,
    medium: 3.5,
    large: 2.9,
  },
} as const;

const DEFAULT_ENERGY_PRICES: Record<FuelType, number> = {
  petrol: 1.46,
  diesel: 1.52,
  hybrid: 1.46,
  electric: 0.45,
};

const UK_GALLON_LITRES = 4.54609;

const DRIVING_STYLE_MULTIPLIER: Record<DrivingStyle, number> = {
  efficient: 0.94,
  balanced: 1,
  fast: 1.08,
};

// UK Government GHG Conversion Factors 2026.
// Petrol/diesel/hybrid: operational fuel combustion kg CO2e per litre.
// Electric: UK electricity generation kg CO2e per kWh.
const EMISSIONS_FACTORS_2026 = {
  petrol: 2.075,
  diesel: 2.58354,
  hybrid: 2.075,
  electric: 0.13096,
} as const;

function LocationField({
  label,
  value,
  placeholder,
  icon = "stop",
  onChange,
  onSelect,
}: LocationFieldProps) {
  const [focused, setFocused] = useState(false);

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);

  const [loading, setLoading] = useState(false);

  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setSearchError(false);

      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        setSearchError(false);

        const response = await fetch(
          `/api/places/autocomplete?text=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Autocomplete request failed.");
        }

        const data = await response.json();

        setSuggestions(data.results ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error(error);

        setSuggestions([]);
        setSearchError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  const showDropdown =
    focused &&
    value.trim().length >= 2 &&
    (loading || searchError || suggestions.length > 0);

  return (
    <div className="location-field-wrap">
      <label className="location-label">{label}</label>

      <div
        className={`location-input-shell ${
          focused ? "location-input-shell-active" : ""
        }`}
      >
        <span
          className={`location-field-icon location-field-icon-${icon}`}
          aria-hidden="true"
        >
          {icon === "end" ? <Flag size={18} /> : <MapPin size={18} />}
        </span>

        <input
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 150);
          }}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />

        {loading && (
          <span className="location-loading" aria-label="Searching">
            <span />
          </span>
        )}

        {!loading && value && (
          <button
            type="button"
            className="location-clear"
            aria-label={`Clear ${label}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("");
              setSuggestions([]);
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="location-suggestions">
          <div className="location-suggestions-heading">
            <Sparkles size={13} />

            {loading ? "looking around..." : "places"}
          </div>

          {loading && (
            <div className="location-search-message">
              <span className="location-search-dots">
                <span />
                <span />
                <span />
              </span>
              Finding places
            </div>
          )}

          {!loading &&
            !searchError &&
            suggestions.map((place) => (
              <button
                type="button"
                key={place.id}
                className="location-suggestion"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(place);
                  setFocused(false);
                  setSuggestions([]);
                }}
              >
                <span className="suggestion-pin">
                  <MapPin size={16} />
                </span>

                <span className="suggestion-copy">
                  <strong>{place.name}</strong>

                  <small>{place.formatted}</small>
                </span>

                {place.postcode && (
                  <span className="suggestion-postcode">{place.postcode}</span>
                )}

                <ArrowRight size={15} className="suggestion-arrow" />
              </button>
            ))}

          {!loading && searchError && (
            <div className="location-search-message location-search-error">
              Couldn&apos;t search right now. Try again.
            </div>
          )}

          {!loading && !searchError && suggestions.length === 0 && (
            <div className="location-search-message">
              No matching places found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);

  const hours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function shortPlaceName(place: SelectedPlace) {
  if (!place) return "";

  return place.name || place.city || place.postcode || place.formatted;
}

function buildGoogleMapsUrl({
  from,
  to,
  stops,
}: {
  from: PlaceSuggestion;
  to: PlaceSuggestion;
  stops: PlaceSuggestion[];
}) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${from.lat},${from.lon}`,
    destination: `${to.lat},${to.lon}`,
    travelmode: "driving",
    dir_action: "navigate",
  });

  if (stops.length > 0) {
    params.set(
      "waypoints",
      stops.map((stop) => `${stop.lat},${stop.lon}`).join("|"),
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildWazeUrl(destination: PlaceSuggestion) {
  const params = new URLSearchParams({
    ll: `${destination.lat},${destination.lon}`,
    navigate: "yes",
  });

  return `https://waze.com/ul?${params.toString()}`;
}

function calculateJourneyCost({
  distanceMiles,
  fuelType,
  vehicleSize,
  energyPrice,
  drivingStyle,
  vehicleEfficiency,
}: {
  distanceMiles: number;
  fuelType: FuelType;
  vehicleSize: VehicleSize;
  energyPrice: number;
  drivingStyle: DrivingStyle;
  vehicleEfficiency: VehicleEfficiencyEstimate | null;
}): JourneyCostResult {
  const styleMultiplier = DRIVING_STYLE_MULTIPLIER[drivingStyle];
  if (fuelType === "electric") {
    const aiEfficiency =
      vehicleEfficiency?.unit === "mi_per_kwh"
        ? vehicleEfficiency.efficiency
        : null;

    const milesPerKwh =
      aiEfficiency && aiEfficiency > 0
        ? aiEfficiency
        : GENERIC_EFFICIENCY.electric[vehicleSize];

    const kwhUsed = (distanceMiles / milesPerKwh) * styleMultiplier;

    return {
      efficiency: milesPerKwh,
      efficiencyLabel: `${milesPerKwh.toFixed(1)} mi/kWh`,
      energyUsed: kwhUsed,
      energyUnit: "kWh",
      cost: kwhUsed * energyPrice,
      price: energyPrice,
      priceUnit: "kWh",
    };
  }

  const aiEfficiency =
    vehicleEfficiency?.unit === "mpg" ? vehicleEfficiency.efficiency : null;

  const mpg =
    aiEfficiency && aiEfficiency > 0
      ? aiEfficiency
      : GENERIC_EFFICIENCY[fuelType][vehicleSize];

  const gallonsUsed = (distanceMiles / mpg) * styleMultiplier;
  const litresUsed = gallonsUsed * UK_GALLON_LITRES;

  return {
    efficiency: mpg,
    efficiencyLabel: `${Math.round(mpg)} MPG`,
    energyUsed: litresUsed,
    energyUnit: "litres",
    cost: litresUsed * energyPrice,
    price: energyPrice,
    priceUnit: "litre",
  };
}

function calculateJourneyEmissions({
  fuelType,
  journeyCost,
}: {
  fuelType: FuelType;
  journeyCost: JourneyCostResult;
}): EmissionsResult {
  const factor = EMISSIONS_FACTORS_2026[fuelType];

  if (fuelType === "electric") {
    const emissionsKg = journeyCost.energyUsed * factor;

    return {
      emissionsKg,

      factor,

      factorLabel: `${factor.toFixed(5)} kg CO₂e/kWh`,

      basis: "Estimated UK electricity generation emissions",

      sourceYear: 2026,
    };
  }

  const emissionsKg = journeyCost.energyUsed * factor;

  return {
    emissionsKg,

    factor,

    factorLabel: `${factor.toFixed(5)} kg CO₂e/litre`,

    basis:
      fuelType === "hybrid"
        ? "Estimated petrol combustion emissions"
        : `Estimated ${fuelType} combustion emissions`,

    sourceYear: 2026,
  };
}

function formatElapsedTime(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);

  const hours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export default function Planner() {
  const [step, setStep] = useState(1);

  const [from, setFrom] = useState("");
  const [fromPlace, setFromPlace] = useState<SelectedPlace>(null);

  const [to, setTo] = useState("");
  const [toPlace, setToPlace] = useState<SelectedPlace>(null);

  const [stops, setStops] = useState<string[]>([]);

  const [stopPlaces, setStopPlaces] = useState<SelectedPlace[]>([]);

  const [vehicleMode, setVehicleMode] = useState<VehicleMode>("generic");
  const [genericFuel, setGenericFuel] = useState<FuelType>("petrol");
  const [vehicleSize, setVehicleSize] = useState<VehicleSize>("medium");

  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleFuel, setVehicleFuel] = useState<FuelType>("petrol");

  const [vehicleEfficiency, setVehicleEfficiency] =
    useState<VehicleEfficiencyEstimate | null>(null);
  const [vehicleEfficiencyLoading, setVehicleEfficiencyLoading] =
    useState(false);
  const [vehicleEfficiencyError, setVehicleEfficiencyError] =
    useState<string | null>(null);

  const [breakFrequency, setBreakFrequency] = useState(2);
  const [currency, setCurrency] = useState<Currency>("GBP");
  const [energyPrice, setEnergyPrice] = useState(1.46);
  const [drivingStyle, setDrivingStyle] = useState<DrivingStyle>("balanced");

  const [avoidTolls, setAvoidTolls] = useState(false);
  const [weatherSensitive, setWeatherSensitive] = useState(true);

  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  const [routeLoading, setRouteLoading] = useState(false);

  const [routeError, setRouteError] = useState<string | null>(null);

  const activeFuel = vehicleMode === "generic" ? genericFuel : vehicleFuel;

  const [weatherResult, setWeatherResult] = useState<RouteWeatherResult | null>(
    null,
  );

  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [routeStopsResult, setRouteStopsResult] =
    useState<RouteStopsResult | null>(null);

  const [routeStopsError, setRouteStopsError] = useState<string | null>(null);

  const [aiJourney, setAiJourney] = useState<AIJourneyResult | null>(null);
  const [aiJourneyError, setAiJourneyError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    setEnergyPrice(DEFAULT_ENERGY_PRICES[activeFuel]);
  }, [activeFuel]);

  useEffect(() => {
    setVehicleEfficiency(null);
    setVehicleEfficiencyError(null);
  }, [vehicleYear, vehicleMake, vehicleModel, vehicleFuel]);

  useEffect(() => {
    if (vehicleMode === "generic") {
      setVehicleEfficiency(null);
      setVehicleEfficiencyError(null);
    }
  }, [vehicleMode]);

  const addStop = () => {
    if (stops.length >= 5) return;

    setStops((current) => [...current, ""]);

    setStopPlaces((current) => [...current, null]);
  };

  const updateStop = (index: number, value: string) => {
    setStops((current) =>
      current.map((stop, stopIndex) => (stopIndex === index ? value : stop)),
    );

    setStopPlaces((current) =>
      current.map((place, stopIndex) => (stopIndex === index ? null : place)),
    );
  };

  const selectStop = (index: number, place: PlaceSuggestion) => {
    setStops((current) =>
      current.map((stop, stopIndex) =>
        stopIndex === index ? place.formatted : stop,
      ),
    );

    setStopPlaces((current) =>
      current.map((currentPlace, stopIndex) =>
        stopIndex === index ? place : currentPlace,
      ),
    );
  };

  const removeStop = (index: number) => {
    setStops((current) =>
      current.filter((_, stopIndex) => stopIndex !== index),
    );

    setStopPlaces((current) =>
      current.filter((_, stopIndex) => stopIndex !== index),
    );
  };

  const routeReady = Boolean(fromPlace && toPlace);

  const vehicleReady =
    vehicleMode === "generic"
      ? Boolean(genericFuel && vehicleSize)
      : Boolean(vehicleMake && vehicleModel && vehicleYear && vehicleFuel);

  const isElectric = activeFuel === "electric";
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  const journeyCost = routeResult
    ? calculateJourneyCost({
        distanceMiles: routeResult.distanceMiles,
        fuelType: activeFuel,
        vehicleSize,
        energyPrice,
        drivingStyle,
        vehicleEfficiency:
          vehicleMode === "vehicle" ? vehicleEfficiency : null,
      })
    : null;

  const emissionsResult = journeyCost
    ? calculateJourneyEmissions({
        fuelType: activeFuel,
        journeyCost,
      })
    : null;

  const breakLabel =
    breakFrequency === 4
      ? "Every 4 hours"
      : `Every ${breakFrequency} hour${breakFrequency === 1 ? "" : "s"}`;

  const displayFrom = shortPlaceName(fromPlace) || from || "Starting point";

  const displayTo = shortPlaceName(toPlace) || to || "Destination";

  const selectedNavigationStops = stopPlaces.filter(
    (place): place is PlaceSuggestion => place !== null,
  );

  const googleMapsUrl =
    fromPlace && toPlace
      ? buildGoogleMapsUrl({
          from: fromPlace,
          to: toPlace,
          stops: selectedNavigationStops,
        })
      : null;

  const wazeUrl = toPlace ? buildWazeUrl(toPlace) : null;

  useEffect(() => {
    if (!googleMapsUrl) {
      setQrCodeUrl(null);
      return;
    }

    let cancelled = false;

    const createQrCode = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(googleMapsUrl, {
          width: 260,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrCodeUrl(dataUrl);
      } catch (error) {
        console.error("QR generation failed:", error);
        if (!cancelled) setQrCodeUrl(null);
      }
    };

    createQrCode();

    return () => {
      cancelled = true;
    };
  }, [googleMapsUrl]);

  const vehicleLabel =
    vehicleMode === "generic"
      ? `${vehicleSize.charAt(0).toUpperCase() + vehicleSize.slice(1)} ${activeFuel}`
      : `${vehicleYear} ${vehicleMake} ${vehicleModel}`;

  const estimateVehicleEfficiency = async () => {
    if (vehicleMode !== "vehicle") return null;

    if (
      !vehicleYear.trim() ||
      !vehicleMake.trim() ||
      !vehicleModel.trim()
    ) {
      return null;
    }

    setVehicleEfficiencyLoading(true);
    setVehicleEfficiencyError(null);

    try {
      const response = await fetch("/api/ai/vehicle-efficiency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: vehicleYear.trim(),
          make: vehicleMake.trim(),
          model: vehicleModel.trim(),
          fuelType: vehicleFuel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to estimate vehicle efficiency.",
        );
      }

      const estimate = data as VehicleEfficiencyEstimate;
      setVehicleEfficiency(estimate);
      return estimate;
    } catch (error) {
      console.error("Vehicle efficiency lookup failed:", error);

      setVehicleEfficiency(null);
      setVehicleEfficiencyError(
        error instanceof Error
          ? error.message
          : "Unable to estimate vehicle efficiency.",
      );

      return null;
    } finally {
      setVehicleEfficiencyLoading(false);
    }
  };

  const runRoutePlanner = async () => {
    if (!fromPlace || !toPlace) {
      setRouteError("Please select a valid starting point and destination.");
      return;
    }

    const selectedStops = stopPlaces.filter(
      (place): place is PlaceSuggestion => place !== null,
    );

    const points = [
      {
        lat: fromPlace.lat,
        lon: fromPlace.lon,
        name: shortPlaceName(fromPlace),
      },
      ...selectedStops.map((place) => ({
        lat: place.lat,
        lon: place.lon,
        name: shortPlaceName(place),
      })),
      {
        lat: toPlace.lat,
        lon: toPlace.lon,
        name: shortPlaceName(toPlace),
      },
    ];

    try {
      setRouteLoading(true);
      setRouteError(null);
      setWeatherResult(null);
      setWeatherError(null);
      setRouteStopsResult(null);
      setRouteStopsError(null);
      setAiJourney(null);
      setAiJourneyError(null);

      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points,
          avoidTolls,
          breakFrequencyHours: breakFrequency,
        }),
      });

      const data = (await response.json()) as RouteResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to calculate route.");
      }

      setRouteResult(data);

      let resolvedWeather: RouteWeatherResult | null = null;
      let resolvedStops: RouteStopsResult | null = null;

      const weatherPromise =
        Array.isArray(data.weatherSamples) && data.weatherSamples.length > 0
          ? fetch("/api/weather/route", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ samples: data.weatherSamples }),
            })
          : null;

      const routeStopsPromise = fetch("/api/places/route-stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breakAnchors: data.breakAnchors ?? [],
          serviceSearchPoint: data.serviceSearchPoint ?? null,
          fuelType: activeFuel,
        }),
      });

      const [weatherResponse, routeStopsResponse] = await Promise.all([
        weatherPromise,
        routeStopsPromise,
      ]);

      if (weatherResponse) {
        try {
          const weatherData = await weatherResponse.json();
          if (!weatherResponse.ok) {
            throw new Error(weatherData.error || "Unable to retrieve weather.");
          }
          resolvedWeather = weatherData as RouteWeatherResult;
          setWeatherResult(resolvedWeather);
        } catch (error) {
          console.error("Weather lookup failed:", error);
          setWeatherResult(null);
          setWeatherError(
            "Route calculated, but weather data is temporarily unavailable.",
          );
        }
      }

      try {
        const stopData = await routeStopsResponse.json();
        if (!routeStopsResponse.ok) {
          throw new Error(stopData.error || "Unable to find route stops.");
        }
        resolvedStops = stopData as RouteStopsResult;
        setRouteStopsResult(resolvedStops);
      } catch (error) {
        console.error("Route stop lookup failed:", error);
        setRouteStopsResult(null);
        setRouteStopsError(
          "Your route is ready, but nearby stop recommendations are temporarily unavailable.",
        );
      }

      const freshJourneyCost = calculateJourneyCost({
        distanceMiles: data.distanceMiles,
        fuelType: activeFuel,
        vehicleSize,
        energyPrice,
        drivingStyle,
        vehicleEfficiency:
          vehicleMode === "vehicle" ? vehicleEfficiency : null,
      });

      const freshEmissions = calculateJourneyEmissions({
        fuelType: activeFuel,
        journeyCost: freshJourneyCost,
      });

      try {
        const aiResponse = await fetch("/api/ai/journey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            route: {
              from: shortPlaceName(fromPlace),
              to: shortPlaceName(toPlace),
              distanceMiles: data.distanceMiles,
              durationSeconds: data.durationSeconds,
              toll: data.toll,
              ferry: data.ferry,
              userStops: selectedStops.map((place) => shortPlaceName(place)),
            },
            vehicle: {
              fuelType: activeFuel,
              description: vehicleLabel,
              efficiencyLabel: freshJourneyCost.efficiencyLabel,
            },
            cost: {
              currency,
              currencySymbol,
              amount: freshJourneyCost.cost,
              energyUsed: freshJourneyCost.energyUsed,
              energyUnit: freshJourneyCost.energyUnit,
              pricePerUnit: freshJourneyCost.price,
            },
            emissions: { emissionsKg: freshEmissions.emissionsKg },
            preferences: {
              breakFrequencyHours: breakFrequency,
              drivingStyle,
              avoidTolls,
              weatherSensitive,
            },
            weather: {
              overallRisk: resolvedWeather?.overallRisk ?? "unknown",
              warnings: resolvedWeather?.warnings ?? [],
              points:
                resolvedWeather?.points.map((point) => ({
                  position: point.position,
                  condition: point.condition,
                  temperature: point.temperature,
                  precipitationProbability: point.precipitationProbability,
                  windGust: point.windGust,
                })) ?? [],
            },
            breaks:
              resolvedStops?.breaks.map((item) => ({
                elapsedSeconds: item.anchor.elapsedSeconds,
                placeName: item.recommendedBreak?.name ?? null,
                distanceMiles: item.recommendedBreak?.distanceMiles ?? null,
              })) ?? [],
            vehicleStop: resolvedStops?.recommendedVehicleStop
              ? {
                  name: resolvedStops.recommendedVehicleStop.name,
                  address: resolvedStops.recommendedVehicleStop.address,
                  distanceMiles:
                    resolvedStops.recommendedVehicleStop.distanceMiles,
                }
              : null,
          }),
        });

        const aiData = await aiResponse.json();
        if (!aiResponse.ok) {
          throw new Error(aiData.error || "Unable to generate AI advice.");
        }
        setAiJourney(aiData as AIJourneyResult);
      } catch (error) {
        console.error("AI journey generation failed:", error);
        setAiJourney(null);
        setAiJourneyError(
          error instanceof Error
            ? error.message
            : "AI journey advice wasn't generated this time.",
        );
      }

      setStep(4);
    } catch (error) {
      console.error(error);
      setRouteError(
        error instanceof Error ? error.message : "Unable to calculate route.",
      );
    } finally {
      setRouteLoading(false);
    }
  };

  const resetPlanner = () => {
    setStep(1);
    setFrom("");
    setFromPlace(null);
    setTo("");
    setToPlace(null);
    setStops([]);
    setStopPlaces([]);
    setVehicleMode("generic");
    setGenericFuel("petrol");
    setVehicleSize("medium");
    setVehicleMake("");
    setVehicleModel("");
    setVehicleYear("");
    setVehicleFuel("petrol");
    setVehicleEfficiency(null);
    setVehicleEfficiencyLoading(false);
    setVehicleEfficiencyError(null);
    setBreakFrequency(2);
    setCurrency("GBP");
    setEnergyPrice(DEFAULT_ENERGY_PRICES.petrol);
    setDrivingStyle("balanced");
    setAvoidTolls(false);
    setWeatherSensitive(true);
    setRouteResult(null);
    setRouteError(null);
    setWeatherResult(null);
    setWeatherError(null);
    setRouteStopsResult(null);
    setRouteStopsError(null);
    setAiJourney(null);
    setAiJourneyError(null);
    setQrCodeUrl(null);
  };

  const invalidStopExists = stops.some(
    (stop, index) => stop.trim().length > 0 && !stopPlaces[index],
  );

  return (
    <section className="planner-section" id="planner">
      <div className="planner-section-inner">
        <div className="planner-heading">
          <span className="hand-note planner-eyebrow">start somewhere ↓</span>

          <div className="planner-heading-row">
            <div>
              <span className="section-kicker">
                <Route size={15} />
                Drive planner
              </span>

              <h2>
                Let&apos;s figure out
                <br />
                <span>your journey.</span>
              </h2>
            </div>

            <p>
              Tell us where you&apos;re going, what you&apos;re driving and how
              you like to travel. We&apos;ll figure out the rest.
            </p>
          </div>
        </div>

        <div className="planner-shell">
          <div className="planner-tape planner-tape-one" />
          <div className="planner-tape planner-tape-two" />

          <div className="planner-progress">
            {["Route", "Vehicle", "Preferences", "Plan"].map((label, index) => {
              const itemStep = index + 1;

              return (
                <div className="planner-progress-group" key={label}>
                  <div
                    className={`planner-progress-item ${
                      step >= itemStep ? "planner-progress-active" : ""
                    }`}
                  >
                    <span>
                      {step > itemStep ? <Check size={14} /> : itemStep}
                    </span>
                    <strong>{label}</strong>
                  </div>

                  {itemStep < 4 && <span className="planner-progress-line" />}
                </div>
              );
            })}
          </div>

          {/* STEP 1 */}

          {step === 1 && (
            <div className="planner-step">
              <div className="planner-step-heading">
                <span className="planner-step-number">01</span>

                <div>
                  <h3>Where are we going?</h3>
                  <p>Search by town, city, landmark or postcode.</p>
                </div>
              </div>

              <div className="route-form">
                <div className="route-form-line" aria-hidden="true">
                  <span className="route-line-dot route-line-dot-start" />

                  {stops.map((_, index) => (
                    <span
                      className="route-line-dot route-line-dot-stop"
                      key={`route-dot-${index}`}
                    />
                  ))}

                  <span className="route-line-dot route-line-dot-end" />
                </div>

                <div className="route-form-fields">
                  <LocationField
                    label="From"
                    value={from}
                    placeholder="Town, postcode or place"
                    icon="start"
                    onChange={(value) => {
                      setFrom(value);
                      setFromPlace(null);
                    }}
                    onSelect={(place) => {
                      setFrom(place.formatted);
                      setFromPlace(place);
                    }}
                  />

                  {stops.map((stop, index) => (
                    <div className="stop-field-row" key={`stop-${index}`}>
                      <LocationField
                        label={`Stop ${index + 1}`}
                        value={stop}
                        placeholder="Town, postcode or place"
                        icon="stop"
                        onChange={(value) => updateStop(index, value)}
                        onSelect={(place) => selectStop(index, place)}
                      />

                      <button
                        type="button"
                        className="remove-stop-button"
                        aria-label={`Remove stop ${index + 1}`}
                        onClick={() => removeStop(index)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}

                  {stops.length < 5 && (
                    <button
                      type="button"
                      className="add-stop-button"
                      onClick={addStop}
                    >
                      <span>
                        <Plus size={17} />
                      </span>
                      Add a stop
                      <small>{5 - stops.length} remaining</small>
                    </button>
                  )}

                  <LocationField
                    label="Destination"
                    value={to}
                    placeholder="Town, postcode or place"
                    icon="end"
                    onChange={(value) => {
                      setTo(value);
                      setToPlace(null);
                    }}
                    onSelect={(place) => {
                      setTo(place.formatted);
                      setToPlace(place);
                    }}
                  />
                </div>
              </div>

              <div className="planner-form-footer">
                <div className="planner-tip">
                  <Sparkles size={16} />
                  <span>
                    You&apos;ll be able to open this exact route in Google Maps
                    or Waze at the end.
                  </span>
                </div>

                <button
                  type="button"
                  className="planner-next-button"
                  disabled={!routeReady}
                  onClick={() => setStep(2)}
                >
                  Continue
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}

          {step === 2 && (
            <div className="planner-step">
              <div className="planner-step-heading">
                <span className="planner-step-number">02</span>

                <div>
                  <h3>What are you driving?</h3>
                  <p>
                    Keep it quick with a generic estimate, or tell us about your
                    actual vehicle.
                  </p>
                </div>
              </div>

              <div className="vehicle-mode-wrap">
                <span className="hand-note vehicle-mode-note">
                  choose your level of detail ↓
                </span>

                <div className="vehicle-mode-toggle">
                  <button
                    type="button"
                    className={vehicleMode === "generic" ? "active" : ""}
                    onClick={() => setVehicleMode("generic")}
                  >
                    Generic estimate
                  </button>

                  <button
                    type="button"
                    className={vehicleMode === "vehicle" ? "active" : ""}
                    onClick={() => setVehicleMode("vehicle")}
                  >
                    My vehicle
                  </button>

                  <span
                    className={`vehicle-mode-slider ${
                      vehicleMode === "vehicle"
                        ? "vehicle-mode-slider-right"
                        : ""
                    }`}
                  />
                </div>
              </div>

              {vehicleMode === "generic" && (
                <div className="generic-vehicle-panel">
                  <div className="vehicle-section-block">
                    <div className="vehicle-block-heading">
                      <div>
                        <span>Fuel type</span>
                        <strong>What powers the car?</strong>
                      </div>

                      <span className="hand-note">close enough is fine!</span>
                    </div>

                    <div className="fuel-type-grid">
                      {[
                        ["petrol", "Petrol", "Typical petrol engine", Fuel],
                        ["diesel", "Diesel", "Long-distance friendly", Gauge],
                        ["hybrid", "Hybrid", "Engine + electric motor", Zap],
                        [
                          "electric",
                          "Electric",
                          "Battery powered",
                          BatteryCharging,
                        ],
                      ].map(([value, label, description, Icon]) => {
                        const fuelValue = value as FuelType;
                        const FuelIcon = Icon as typeof Fuel;

                        return (
                          <button
                            type="button"
                            key={fuelValue}
                            className={`fuel-option ${
                              genericFuel === fuelValue ? "selected" : ""
                            }`}
                            onClick={() => setGenericFuel(fuelValue)}
                          >
                            <span className="fuel-option-icon">
                              <FuelIcon size={23} />
                            </span>

                            <strong>{label as string}</strong>
                            <small>{description as string}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="vehicle-section-block vehicle-size-block">
                    <div className="vehicle-block-heading">
                      <div>
                        <span>Vehicle size</span>
                        <strong>Roughly how big?</strong>
                      </div>
                    </div>

                    <div className="vehicle-size-selector">
                      {(["small", "medium", "large"] as VehicleSize[]).map(
                        (size) => (
                          <button
                            type="button"
                            key={size}
                            className={vehicleSize === size ? "selected" : ""}
                            onClick={() => setVehicleSize(size)}
                          >
                            <CarFront
                              size={
                                size === "small"
                                  ? 22
                                  : size === "medium"
                                    ? 27
                                    : 32
                              }
                            />

                            <span>{size}</span>

                            <small>
                              {size === "small" && "City car"}
                              {size === "medium" && "Hatch / saloon"}
                              {size === "large" && "SUV / large car"}
                            </small>
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="vehicle-assumption-note">
                    <Sparkles size={16} />

                    <div>
                      <strong>
                        We&apos;ll use{" "}
                        {activeFuel === "electric"
                          ? `${GENERIC_EFFICIENCY.electric[vehicleSize].toFixed(
                              1,
                            )} mi/kWh`
                          : `${
                              GENERIC_EFFICIENCY[
                                activeFuel as Exclude<FuelType, "electric">
                              ][vehicleSize]
                            } MPG`}
                        .
                      </strong>

                      <span>
                        You can see exactly how this affects the final journey
                        cost.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {vehicleMode === "vehicle" && (
                <div className="my-vehicle-panel">
                  <div className="vehicle-fields-grid">
                    <div className="vehicle-field">
                      <label htmlFor="vehicle-make">Make</label>

                      <div className="vehicle-select-shell vehicle-text-shell">
                        <input
                          id="vehicle-make"
                          type="text"
                          list="vehicle-make-options"
                          value={vehicleMake}
                          placeholder="e.g. BMW, Toyota, Volkswagen"
                          autoComplete="off"
                          onChange={(event) => {
                            setVehicleMake(event.target.value);
                            setVehicleModel("");
                          }}
                        />

                        <datalist id="vehicle-make-options">
                          {VEHICLE_MAKES.map((make) => (
                            <option value={make} key={make} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="vehicle-field">
                      <label htmlFor="vehicle-model">Model</label>

                      <div className="vehicle-select-shell vehicle-text-shell">
                        <input
                          id="vehicle-model"
                          type="text"
                          value={vehicleModel}
                          disabled={!vehicleMake.trim()}
                          placeholder={
                            vehicleMake.trim()
                              ? "e.g. 320i M Sport, Golf 1.5 TSI"
                              : "Enter a make first"
                          }
                          autoComplete="off"
                          onChange={(event) =>
                            setVehicleModel(event.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="vehicle-field">
                      <label htmlFor="vehicle-year">Year</label>

                      <div className="vehicle-select-shell">
                        <select
                          id="vehicle-year"
                          value={vehicleYear}
                          onChange={(event) =>
                            setVehicleYear(event.target.value)
                          }
                        >
                          <option value="">Choose year</option>

                          {Array.from({ length: 27 }, (_, index) =>
                            String(2026 - index),
                          ).map((year) => (
                            <option value={year} key={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="vehicle-field">
                      <label htmlFor="vehicle-fuel">Fuel type</label>

                      <div className="vehicle-select-shell">
                        <select
                          id="vehicle-fuel"
                          value={vehicleFuel}
                          onChange={(event) =>
                            setVehicleFuel(event.target.value as FuelType)
                          }
                        >
                          <option value="petrol">Petrol</option>
                          <option value="diesel">Diesel</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="electric">Electric</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="vehicle-preview-card">
                    <span className="vehicle-preview-icon">
                      <CarFront size={34} />
                    </span>

                    <div>
                      <span>Your vehicle</span>

                      <strong>
                        {vehicleMake || "Choose a make"}
                        {vehicleModel ? ` ${vehicleModel}` : ""}
                      </strong>

                      <small>
                        {vehicleYear || "Year"} ·{" "}
                        {vehicleFuel.charAt(0).toUpperCase() +
                          vehicleFuel.slice(1)}
                      </small>
                    </div>

                    <span className="hand-note vehicle-preview-note">
                      engine / trim helps accuracy ↗
                    </span>
                  </div>
                </div>
              )}

              <div className="planner-form-footer">
                <button
                  type="button"
                  className="planner-back-button"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <button
                  type="button"
                  className="planner-next-button"
                  disabled={!vehicleReady || vehicleEfficiencyLoading}
                  onClick={async () => {
                    if (vehicleMode === "vehicle") {
                      await estimateVehicleEfficiency();
                    }

                    setStep(3);
                  }}
                >
                  {vehicleEfficiencyLoading
                    ? "Estimating vehicle..."
                    : "Continue"}

                  {!vehicleEfficiencyLoading && <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}

          {step === 3 && (
            <div className="planner-step">
              <div className="planner-step-heading">
                <span className="planner-step-number">03</span>

                <div>
                  <h3>How do you like to drive?</h3>
                  <p>A few quick preferences help us personalise your route.</p>
                </div>
              </div>

              {vehicleMode === "vehicle" && (
                <div className="vehicle-assumption-note">
                  <Sparkles size={16} />

                  <div>
                    {vehicleEfficiency?.efficiency ? (
                      <>
                        <strong>
                          Estimated vehicle efficiency: {" "}
                          {vehicleEfficiency.unit === "mpg"
                            ? `${Math.round(vehicleEfficiency.efficiency)} MPG`
                            : `${vehicleEfficiency.efficiency.toFixed(1)} mi/kWh`}
                        </strong>

                        <span>
                          {vehicleEfficiency.matchedVehicle} · {" "}
                          {vehicleEfficiency.confidence} confidence. {" "}
                          {vehicleEfficiency.note}
                        </span>
                      </>
                    ) : (
                      <>
                        <strong>Using generic vehicle efficiency</strong>
                        <span>
                          {vehicleEfficiencyError ??
                            "We couldn't make a reliable model-specific estimate, so DrivePlanner will use the normal vehicle-size assumption."}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="preferences-grid">
                <div className="preference-card preference-break-card">
                  <div className="preference-card-heading">
                    <span className="preference-icon preference-icon-blue">
                      <Coffee size={22} />
                    </span>

                    <div>
                      <span>Break frequency</span>
                      <strong>{breakLabel}</strong>
                    </div>
                  </div>

                  <p>
                    We&apos;ll suggest convenient places to stop around this
                    interval.
                  </p>

                  <div className="sketch-slider-wrap">
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.5"
                      value={breakFrequency}
                      onChange={(event) =>
                        setBreakFrequency(Number(event.target.value))
                      }
                    />

                    <div className="slider-labels">
                      <span>1h</span>
                      <span>2h</span>
                      <span>3h</span>
                      <span>4h</span>
                    </div>
                  </div>
                </div>

                <div className="preference-card">
                  <div className="preference-card-heading">
                    <span className="preference-icon preference-icon-lime">
                      {isElectric ? (
                        <BatteryCharging size={22} />
                      ) : (
                        <Fuel size={22} />
                      )}
                    </span>

                    <div>
                      <span>
                        {isElectric ? "Electricity price" : "Fuel price"}
                      </span>

                      <strong>
                        {currencySymbol}
                        {energyPrice.toFixed(2)}
                        <small>/{isElectric ? "kWh" : "litre"}</small>
                      </strong>
                    </div>
                  </div>

                  <p>Adjust this if you know the price you usually pay.</p>

                  <div className="sketch-slider-wrap">
                    <input
                      type="range"
                      min={isElectric ? 0.15 : 1.1}
                      max={isElectric ? 0.85 : 2}
                      step="0.01"
                      value={energyPrice}
                      onChange={(event) =>
                        setEnergyPrice(Number(event.target.value))
                      }
                    />

                    <div className="slider-labels">
                      <span>
                        {currencySymbol}
                        {isElectric ? "0.15" : "1.10"}
                      </span>

                      <span>typical</span>

                      <span>
                        {currencySymbol}
                        {isElectric ? "0.85" : "2.00"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="preference-card">
                  <div className="preference-card-heading">
                    <span className="preference-icon preference-icon-coral">
                      <WalletCards size={22} />
                    </span>

                    <div>
                      <span>Currency</span>
                      <strong>{currency}</strong>
                    </div>
                  </div>

                  <div className="currency-selector">
                    {(["GBP", "EUR", "USD"] as Currency[]).map(
                      (currencyOption) => (
                        <button
                          key={currencyOption}
                          type="button"
                          className={
                            currency === currencyOption ? "selected" : ""
                          }
                          onClick={() => setCurrency(currencyOption)}
                        >
                          <strong>{CURRENCY_SYMBOLS[currencyOption]}</strong>
                          <span>{currencyOption}</span>
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="preference-card">
                  <div className="preference-card-heading">
                    <span className="preference-icon">
                      <Timer size={22} />
                    </span>

                    <div>
                      <span>Driving style</span>
                      <strong>
                        {drivingStyle.charAt(0).toUpperCase() +
                          drivingStyle.slice(1)}
                      </strong>
                    </div>
                  </div>

                  <div className="driving-style-selector">
                    {(
                      [
                        ["efficient", "Efficient", "Save fuel"],
                        ["balanced", "Balanced", "Recommended"],
                        ["fast", "Faster", "Less economy"],
                      ] as const
                    ).map(([value, label, description]) => (
                      <button
                        type="button"
                        key={value}
                        className={drivingStyle === value ? "selected" : ""}
                        onClick={() => setDrivingStyle(value)}
                      >
                        <strong>{label}</strong>
                        <small>{description}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="route-options-card">
                <div className="route-options-heading">
                  <div>
                    <span>Optional</span>
                    <strong>A couple more things?</strong>
                  </div>

                  <span className="hand-note">totally up to you</span>
                </div>

                <label className="sketch-switch-row">
                  <div>
                    <span className="switch-row-icon">
                      <WalletCards size={19} />
                    </span>

                    <div>
                      <strong>Prefer routes without tolls</strong>
                      <small>
                        We&apos;ll favour toll-free alternatives where possible.
                      </small>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={avoidTolls}
                    onChange={(event) => setAvoidTolls(event.target.checked)}
                  />

                  <span className="sketch-switch" />
                </label>

                <label className="sketch-switch-row">
                  <div>
                    <span className="switch-row-icon">
                      <CloudRain size={19} />
                    </span>

                    <div>
                      <strong>Be extra cautious about weather</strong>
                      <small>
                        Highlight difficult rain, wind, snow or icy conditions.
                      </small>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={weatherSensitive}
                    onChange={(event) =>
                      setWeatherSensitive(event.target.checked)
                    }
                  />

                  <span className="sketch-switch" />
                </label>
              </div>

              <div className="trip-ready-card">
                <Sparkles size={20} />

                <div>
                  <span>READY TO PLAN</span>

                  <strong>
                    {displayFrom} → {displayTo}
                  </strong>

                  <small>
                    {activeFuel.charAt(0).toUpperCase() + activeFuel.slice(1)}
                    {" · "}
                    {breakLabel.toLowerCase()}
                    {" · "}
                    {currency}
                  </small>
                </div>

                <span className="hand-note trip-ready-note">looks good!</span>
              </div>

              {invalidStopExists && (
                <div className="planner-route-error">
                  <TriangleAlert size={16} />

                  <span>
                    Choose each stop from the location suggestions, or remove
                    the unfinished stop.
                  </span>
                </div>
              )}

              {routeError && (
                <div className="planner-route-error">
                  <TriangleAlert size={16} />

                  <span>{routeError}</span>
                </div>
              )}

              <div className="planner-form-footer">
                <button
                  type="button"
                  className="planner-back-button"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <button
                  type="button"
                  className="planner-run-button"
                  disabled={routeLoading || invalidStopExists}
                  onClick={runRoutePlanner}
                >
                  {routeLoading ? (
                    <>
                      <span className="planner-run-spinner" />
                      Building your plan...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Run planner
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 RESULTS */}

          {step === 4 && (
            <div className="planner-step planner-results-step">
              <div className="results-header">
                <div>
                  <span className="planner-step-number">04</span>

                  <div>
                    <span className="results-kicker">
                      <Sparkles size={14} />
                      Your drive plan
                    </span>

                    <h3>
                      {displayFrom}
                      <span> → </span>
                      {displayTo}
                    </h3>

                    <p>Here&apos;s the full picture before you set off.</p>
                  </div>
                </div>

                <span className="hand-note results-header-note">
                  all figured out ↓
                </span>
              </div>

              <div className="results-overview-grid">
                <div className="result-metric result-metric-lime">
                  <span className="result-metric-icon">
                    <CirclePoundSterling size={22} />
                  </span>

                  <small>Journey cost</small>

                  <strong>
                    {journeyCost
                      ? `${currencySymbol}${journeyCost.cost.toFixed(2)}`
                      : "—"}
                  </strong>

                  <p>
                    {journeyCost
                      ? `${journeyCost.energyUsed.toFixed(
                          1,
                        )} ${journeyCost.energyUnit}`
                      : "estimated energy cost"}
                  </p>
                </div>

                <div className="result-metric result-metric-blue">
                  <span className="result-metric-icon">
                    <Route size={22} />
                  </span>

                  <small>Distance</small>
                  <strong>
                    {routeResult
                      ? `${routeResult.distanceMiles.toFixed(0)} mi`
                      : "—"}
                  </strong>

                  <p>
                    {routeResult
                      ? `${routeResult.distanceKm.toFixed(0)} km total`
                      : "route distance"}
                  </p>
                </div>

                <div className="result-metric">
                  <span className="result-metric-icon">
                    <Timer size={22} />
                  </span>

                  <small>Driving time</small>
                  <strong>
                    {routeResult
                      ? formatDuration(routeResult.durationSeconds)
                      : "—"}
                  </strong>

                  <p>before planned breaks</p>
                </div>

                <div className="result-metric result-metric-coral">
                  <span className="result-metric-icon">
                    <Leaf size={22} />
                  </span>

                  <small>CO₂e estimate</small>

                  <strong>
                    {emissionsResult
                      ? `${emissionsResult.emissionsKg.toFixed(1)} kg`
                      : "—"}
                  </strong>

                  <p>operational journey emissions</p>
                </div>
              </div>

              <div className="results-summary-strip">
                <div>
                  <CarFront size={18} />

                  <span>
                    <small>Vehicle</small>
                    <strong>{vehicleLabel}</strong>
                  </span>
                </div>

                <div>
                  {isElectric ? (
                    <BatteryCharging size={18} />
                  ) : (
                    <Fuel size={18} />
                  )}

                  <span>
                    <small>Estimated efficiency</small>
                    <strong>
                      {journeyCost ? journeyCost.efficiencyLabel : "—"}
                    </strong>
                    <small>
                      {vehicleMode === "vehicle" &&
                      vehicleEfficiency?.efficiency
                        ? `AI-assisted · ${vehicleEfficiency.confidence} confidence`
                        : "Generic vehicle assumption"}
                    </small>
                  </span>
                </div>

                <div>
                  <Coffee size={18} />

                  <span>
                    <small>Break plan</small>
                    <strong>{breakLabel}</strong>
                  </span>
                </div>
              </div>

              {journeyCost && (
                <div className="cost-breakdown-card">
                  <div className="cost-breakdown-heading">
                    <div>
                      <span>COST BREAKDOWN</span>
                      <strong>
                        How we got to {currencySymbol}
                        {journeyCost.cost.toFixed(2)}
                      </strong>
                    </div>

                    <span className="hand-note">no mystery maths ↓</span>
                  </div>

                  <div className="cost-equation">
                    {isElectric ? (
                      <>
                        <span>
                          <small>Distance</small>
                          <strong>
                            {routeResult?.distanceMiles.toFixed(0)} mi
                          </strong>
                        </span>

                        <span className="cost-symbol">÷</span>

                        <span>
                          <small>Efficiency</small>
                          <strong>
                            {journeyCost.efficiency.toFixed(1)} mi/kWh
                          </strong>
                        </span>

                        <span className="cost-symbol">×</span>

                        <span>
                          <small>Electricity</small>
                          <strong>
                            {currencySymbol}
                            {energyPrice.toFixed(2)}/kWh
                          </strong>
                        </span>

                        <span className="cost-symbol">=</span>

                        <span className="cost-total">
                          <small>Estimated cost</small>
                          <strong>
                            {currencySymbol}
                            {journeyCost.cost.toFixed(2)}
                          </strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          <small>Distance</small>
                          <strong>
                            {routeResult?.distanceMiles.toFixed(0)} mi
                          </strong>
                        </span>

                        <span className="cost-symbol">÷</span>

                        <span>
                          <small>Economy</small>
                          <strong>
                            {journeyCost.efficiency.toFixed(0)} MPG
                          </strong>
                        </span>

                        <span className="cost-symbol">→</span>

                        <span>
                          <small>Fuel used</small>
                          <strong>{journeyCost.energyUsed.toFixed(1)} L</strong>
                        </span>

                        <span className="cost-symbol">×</span>

                        <span>
                          <small>Fuel price</small>
                          <strong>
                            {currencySymbol}
                            {energyPrice.toFixed(2)}/L
                          </strong>
                        </span>

                        <span className="cost-symbol">=</span>

                        <span className="cost-total">
                          <small>Estimated cost</small>
                          <strong>
                            {currencySymbol}
                            {journeyCost.cost.toFixed(2)}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {emissionsResult && journeyCost && (
                <div className="emissions-breakdown-card">
                  <div className="emissions-breakdown-header">
                    <span className="emissions-breakdown-icon">
                      <Leaf size={20} />
                    </span>

                    <div>
                      <span>CARBON ESTIMATE</span>

                      <strong>
                        {emissionsResult.emissionsKg.toFixed(1)} kg CO₂e
                      </strong>
                    </div>

                    <span className="hand-note">
                      where did that come from? ↓
                    </span>
                  </div>

                  <div className="emissions-equation">
                    <span>
                      <small>
                        {isElectric ? "Electricity used" : "Fuel used"}
                      </small>

                      <strong>
                        {journeyCost.energyUsed.toFixed(1)}{" "}
                        {journeyCost.energyUnit}
                      </strong>
                    </span>

                    <span className="emissions-symbol">×</span>

                    <span>
                      <small>2026 factor</small>

                      <strong>{emissionsResult.factorLabel}</strong>
                    </span>

                    <span className="emissions-symbol">=</span>

                    <span className="emissions-total">
                      <small>Journey estimate</small>

                      <strong>
                        {emissionsResult.emissionsKg.toFixed(1)} kg CO₂e
                      </strong>
                    </span>
                  </div>

                  <div className="emissions-method-note">
                    <Sparkles size={14} />

                    <p>
                      {isElectric ? (
                        <>
                          Electric cars produce no tailpipe emissions. This
                          estimate represents the emissions associated with
                          generating the UK electricity used for the journey.
                        </>
                      ) : (
                        <>
                          This is an operational fuel-emissions estimate based
                          on the amount of {activeFuel} the journey is expected
                          to use.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="results-main-grid">
                <div className="results-route-card">
                  <div className="results-card-heading">
                    <div>
                      <span>Route overview</span>
                      <strong>Your journey at a glance</strong>
                    </div>

                    <span className="hand-note">one eternity later...</span>
                  </div>

                  <div className="journey-timeline">
                    <div className="journey-timeline-line" />

                    <div className="journey-stop journey-stop-start">
                      <span className="journey-stop-icon">
                        <MapPin size={17} />
                      </span>

                      <div>
                        <small>START</small>

                        <strong>{displayFrom}</strong>

                        <span>Journey begins</span>
                      </div>
                    </div>

                    {/* USER-ADDED STOPS */}

                    {routeResult?.legs.map((leg, index) => {
                      const isFinal = index === routeResult.legs.length - 1;

                      if (isFinal) {
                        return null;
                      }

                      return (
                        <div
                          className="journey-stop journey-stop-user"
                          key={`user-${index}`}
                        >
                          <span className="journey-stop-icon">
                            <MapPin size={17} />
                          </span>

                          <div>
                            <small>YOUR STOP {index + 1}</small>

                            <strong>{leg.to}</strong>

                            <span>selected waypoint</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* RECOMMENDED BREAKS */}

                    {routeStopsResult?.breaks.map((item, index) => {
                      const place = item.recommendedBreak;

                      if (!place) {
                        return null;
                      }

                      return (
                        <div
                          className="journey-stop journey-stop-break"
                          key={`break-${index}`}
                        >
                          <span className="journey-stop-icon">
                            <Coffee size={17} />
                          </span>

                          <div>
                            <small>RECOMMENDED BREAK</small>

                            <strong>{place.name}</strong>

                            <span>
                              around{" "}
                              {formatElapsedTime(item.anchor.elapsedSeconds)}
                              {" · "}
                              {place.distanceMiles.toFixed(1)} mi from route
                              point
                            </span>
                          </div>

                          <span className="journey-stop-tag">
                            break {index + 1}
                          </span>
                        </div>
                      );
                    })}

                    <div className="journey-stop journey-stop-end">
                      <span className="journey-stop-icon">
                        <Flag size={17} />
                      </span>

                      <div>
                        <small>ARRIVE</small>

                        <strong>{displayTo}</strong>

                        <span>
                          {routeResult
                            ? `${routeResult.distanceMiles.toFixed(0)} mi total`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  {routeStopsResult?.recommendedVehicleStop && (
                    <div className="vehicle-stop-result-card">
                      <span className="vehicle-stop-result-icon">
                        {isElectric ? (
                          <BatteryCharging size={23} />
                        ) : (
                          <Fuel size={23} />
                        )}
                      </span>

                      <div className="vehicle-stop-result-copy">
                        <small>
                          {isElectric ? "CHARGING OPTION" : "FUEL OPTION"}
                        </small>

                        <strong>
                          {routeStopsResult.recommendedVehicleStop.name}
                        </strong>

                        <span>
                          {routeStopsResult.recommendedVehicleStop.address}
                        </span>

                        <p>
                          About{" "}
                          {routeStopsResult.recommendedVehicleStop.distanceMiles.toFixed(
                            1,
                          )}{" "}
                          miles from the nearest route search point.
                        </p>
                      </div>

                      <span className="hand-note vehicle-stop-note">
                        handy if needed
                      </span>
                    </div>
                  )}

                  {routeStopsError && (
                    <div className="route-stop-error">{routeStopsError}</div>
                  )}
                </div>

                <div className="results-side-stack">
                  <div className="weather-result-card">
                    <div className="weather-result-top">
                      <span className="weather-result-icon">
                        <CloudRain size={25} />
                      </span>

                      <div>
                        <small>ROUTE WEATHER</small>

                        <strong>
                          {weatherResult
                            ? weatherResult.overallRisk === "high"
                              ? "Difficult conditions"
                              : weatherResult.overallRisk === "medium"
                                ? "Some caution needed"
                                : "Looking good"
                            : weatherError
                              ? "Unavailable"
                              : "Checking route"}
                        </strong>
                      </div>

                      {weatherResult && (
                        <span
                          className={`weather-risk-badge weather-risk-${weatherResult.overallRisk}`}
                        >
                          {weatherResult.overallRisk.toUpperCase()} RISK
                        </span>
                      )}
                    </div>

                    {weatherResult ? (
                      <>
                        <p>
                          {weatherResult.warnings.length > 0
                            ? weatherResult.warnings[0]
                            : "No significant weather hazards are expected along the route at your approximate travel times."}
                        </p>

                        <div className="weather-route-points">
                          {weatherResult.points.map((point) => (
                            <span
                              key={`${point.lat}-${point.lon}`}
                              className={
                                point.riskLevel !== "low"
                                  ? "weather-point-warning"
                                  : ""
                              }
                            >
                              {point.position}

                              <strong>
                                {point.condition}{" "}
                                {Math.round(point.temperature)}°
                              </strong>

                              <small>
                                {Math.round(point.precipitationProbability)}%
                                rain · gusts {Math.round(point.windGust)} km/h
                              </small>
                            </span>
                          ))}
                        </div>

                        {weatherResult.warnings.length > 1 && (
                          <div className="weather-warning-list">
                            {weatherResult.warnings
                              .slice(1, 4)
                              .map((warning) => (
                                <span key={warning}>
                                  <TriangleAlert size={12} />

                                  {warning}
                                </span>
                              ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p>
                        {weatherError ??
                          "Weather data is being checked along your route."}
                      </p>
                    )}
                  </div>

                  <div className="toll-result-card">
                    <span className="result-small-icon">
                      <WalletCards size={20} />
                    </span>

                    <div>
                      <small>TOLLS &amp; ROAD CHARGES</small>
                      <strong>
                        {routeResult?.toll
                          ? "Toll road detected"
                          : avoidTolls
                            ? "Toll-free route"
                            : "No toll detected"}
                      </strong>

                      <p>
                        {routeResult?.toll
                          ? "This calculated route includes at least one toll road. Exact charges will be estimated separately."
                          : avoidTolls
                            ? "The route was calculated with toll roads avoided where possible."
                            : "Geoapify did not flag a toll road on this route."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ai-result-card">
                <div className="ai-result-badge">
                  <Sparkles size={17} />
                  AI DRIVE NOTE
                </div>

                {aiJourney ? (
                  <>
                    <div className="ai-result-content">
                      <div>
                        <h4>{aiJourney.headline}</h4>
                        <p>{aiJourney.summary}</p>
                        <p>{aiJourney.weatherAdvice}</p>
                      </div>

                      <ul>
                        {aiJourney.tips.map((tip, index) => (
                          <li key={`${tip}-${index}`}>
                            <Check size={15} />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <span className="hand-note ai-result-note">
                      {aiJourney.handwrittenNote}
                    </span>
                  </>
                ) : (
                  <div className="ai-result-unavailable">
                    <Sparkles size={18} />
                    <div>
                      <strong>Your factual drive plan is ready.</strong>
                      <p>
                        {aiJourneyError ??
                          "AI journey advice wasn't generated this time."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="travel-choice-section">
                <div className="results-card-heading">
                  <div>
                    <span>Drive or train?</span>
                    <strong>Drive or take the train?</strong>
                  </div>

                  <span className="hand-note">rough comparison ↓</span>
                </div>

                <div className="travel-choice-grid">
                  <div className="travel-choice-card selected">
                    <span className="travel-choice-icon">
                      <CarFront size={27} />
                    </span>

                    {aiJourney?.travelRecommendation === "drive" && (
                      <span className="travel-choice-label">AI PICK</span>
                    )}

                    {aiJourney?.travelRecommendation === "either" && (
                      <span className="travel-choice-label">CLOSE CALL</span>
                    )}

                    <h4>Drive</h4>

                    <div className="travel-choice-stats">
                      <span>
                        <small>TIME</small>
                        <strong>
                          {routeResult
                            ? formatDuration(routeResult.durationSeconds)
                            : "—"}
                        </strong>
                      </span>

                      <span>
                        <small>COST</small>
                        <strong>
                          {journeyCost
                            ? `${currencySymbol}${journeyCost.cost.toFixed(0)}`
                            : "—"}
                        </strong>
                      </span>
                    </div>

                    <p>
                      {aiJourney?.travelReason ??
                        "Calculated from your selected route and vehicle assumptions."}
                    </p>
                  </div>

                  <div className="travel-choice-vs">
                    <span>vs</span>
                  </div>

                  <div className="travel-choice-card">
                    <span className="travel-choice-icon">
                      <Train size={27} />
                    </span>

                    {aiJourney?.travelRecommendation === "train" && (
                      <span className="travel-choice-label">AI PICK</span>
                    )}

                    <h4>Train</h4>

                    <div className="travel-choice-stats">
                      <span>
                        <small>EST. TIME</small>
                        <strong>
                          {aiJourney?.trainEstimate?.durationText ?? "N/A"}
                        </strong>
                      </span>

                      <span>
                        <small>EST. FARE</small>
                        <strong>
                          {aiJourney?.trainEstimate?.fareText ?? "N/A"}
                        </strong>
                      </span>
                    </div>

                    <p>
                      {aiJourney?.trainEstimate?.available === "no"
                        ? "No practical rail journey identified."
                        : aiJourney?.trainEstimate?.available === "uncertain"
                          ? "A rail option may exist, but the estimate is uncertain."
                          : aiJourney?.trainEstimate?.note ??
                            "Approximate AI rail estimate."}
                    </p>

                    {aiJourney?.trainEstimate?.durationText && (
                      <small className="train-estimate-disclaimer">
                        AI estimate · not live rail data
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="navigation-section">
                <div className="navigation-copy">
                  <span className="section-mini-kicker">
                    <Navigation size={14} />
                    Ready to go?
                  </span>

                  <h4>Send the route to your phone.</h4>

                  <p>
                    Open the journey directly in your preferred navigation app,
                    or scan the QR code if you&apos;re planning on desktop.
                  </p>

                  <div className="navigation-buttons">
                    {googleMapsUrl && (
                      <a
                        className="maps-button"
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation size={18} />
                        Google Maps
                        <ExternalLink size={15} />
                      </a>
                    )}

                    {wazeUrl && (
                      <a
                        className="waze-button"
                        href={wazeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <CarFront size={18} />
                        Waze
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>

                  <small className="navigation-link-note">
                    Google Maps includes your planned stops. Waze opens
                    navigation to the final destination.
                  </small>
                </div>

                <div className="qr-result-card">
                  <span className="hand-note qr-note">scan me →</span>

                  {googleMapsUrl ? (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="qr-placeholder"
                      aria-label="Open route in Google Maps"
                    >
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="QR code for this Google Maps route"
                          width={160}
                          height={160}
                        />
                      ) : (
                        <QrCode size={98} strokeWidth={1.4} />
                      )}
                    </a>
                  ) : (
                    <div className="qr-placeholder">
                      <QrCode size={98} strokeWidth={1.4} />
                    </div>
                  )}

                  <strong>Open this route</strong>
                  <small>Scan to open the route in Google Maps.</small>
                </div>
              </div>

              <div className="results-warning">
                <TriangleAlert size={17} />

                <span>
                  Estimates are for planning only. Live traffic, road closures,
                  fuel prices, rail fares and weather may change before you
                  travel.
                </span>
              </div>

              <div className="results-actions">
                <button
                  type="button"
                  className="planner-back-button"
                  onClick={() => setStep(3)}
                >
                  <ArrowLeft size={17} />
                  Edit preferences
                </button>

                <button
                  type="button"
                  className="start-over-button"
                  onClick={resetPlanner}
                >
                  <RefreshCcw size={17} />
                  Plan another drive
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="planner-bottom-note">
          <span className="hand-note">
            no sign-up. no saved location history. just plan &amp; go.
          </span>
        </div>
      </div>
    </section>
  );
}
