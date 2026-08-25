# DrivePlanner

**AI-powered route, cost and journey planning for road trips.**

DrivePlanner is a lightweight single-page web application that goes beyond standard directions. It combines real route data with deterministic cost and emissions calculations, route-aware weather checks, break and fuel/charging recommendations, AI assisted vehicle efficiency estimates, AI journey advice, rough drive vs train comparison, and one-click navigation handoff to Google Maps or Waze.

The project was built as a **single-day MVP** with a focus on keeping the architecture simple, practical, explainable, and inexpensive to run.

---

## What DrivePlanner does

Most route planners answer one question:

> **How do I get there?**

DrivePlanner tries to answer the questions around the journey too:

- How far is the drive?
- How long will it take?
- Roughly how much fuel or electricity will I use?
- What will the journey cost?
- What are the estimated operational CO₂e emissions?
- What will the weather be like along the route?
- When should I stop for a break?
- Is there a useful café, fuel station, charger or service stop nearby?
- Would taking the train potentially make more sense?
- Can I send the route straight to my phone?

The result is a compact journey-planning experience that combines routing, calculations, enrichment and AI advice in one place.

---

# Core features

## Route planning

Users can enter:

- Starting location
- Destination
- Up to five intermediate stops

Location search uses **Geoapify autocomplete**, with the selected place stored as structured coordinates rather than plain text.

The route is then calculated using Geoapify routing.

The planner returns:

- Distance
- Estimated driving time
- Route legs
- Toll presence
- Ferry presence
- Route geometry
- Weather sampling points
- Suggested break anchors
- Mid-route service search point

---

## Vehicle modes

DrivePlanner supports two vehicle modes.

### Generic vehicle

Users select:

- Fuel type
  - Petrol
  - Diesel
  - Hybrid
  - Electric
- Vehicle size
  - Small
  - Medium
  - Large

DrivePlanner uses internal representative efficiency assumptions to estimate MPG or miles per kWh.

### My vehicle

Users can enter:

- Year
- Make
- Model
- Fuel type

DrivePlanner then asks Gemini for a **rough real-world efficiency estimate** for that specific vehicle.

Examples:

```text
2020 BMW 320i Petrol
≈ 42 MPG
Medium confidence
```

or:

```text
2022 Tesla Model 3 Electric
≈ 4.1 mi/kWh
Medium confidence
```

The estimate is explicitly treated as an approximation rather than an official manufacturer figure.

If Gemini cannot produce a reliable estimate, DrivePlanner falls back to the generic efficiency model so the journey planner continues working.

---

# Journey cost engine

Journey cost is calculated deterministically.

Gemini does **not** calculate the journey price.

For petrol, diesel and hybrid vehicles:

```text
Distance
÷ MPG
= Imperial gallons used

Imperial gallons
× 4.54609
= Litres used

Litres used
× fuel price
= Journey cost
```

For electric vehicles:

```text
Distance
÷ miles per kWh
= kWh used

kWh used
× electricity price
= Journey cost
```

Users can customise:

- Fuel/electricity price
- Currency
- Driving style

Driving style applies a small deterministic efficiency adjustment:

- Efficient
- Balanced
- Faster

This keeps the calculation transparent and repeatable.

---

# Emissions estimate

DrivePlanner calculates estimated **operational journey CO₂e** from the expected energy consumed.

For combustion vehicles:

```text
Litres used × fuel emissions factor
```

For EVs:

```text
kWh used × electricity emissions factor
```

The emissions value is an operational estimate only and is not intended to represent full lifecycle emissions such as:

- Vehicle manufacturing
- Battery manufacturing
- Fuel production lifecycle
- Infrastructure
- Maintenance

---

# Route-aware weather

DrivePlanner uses **Open-Meteo** to check weather at multiple points along the route.

The routing API generates sampling points at approximately:

- Start
- 25%
- 50%
- 75%
- Destination

Each weather point is evaluated around the estimated time the user would reach that location.

Weather checks can include:

- Temperature
- Apparent temperature
- Rain
- Snow
- Precipitation probability
- Visibility
- Wind speed
- Wind gusts
- Weather condition codes

DrivePlanner converts these into simple journey risk levels:

- Low
- Medium
- High

It can surface warnings for conditions such as:

- Heavy rain
- Strong wind
- Snow
- Ice risk
- Poor visibility
- Thunderstorms

Weather failure is intentionally **non-blocking**. A routing result can still be shown if the weather API is unavailable.

---

# Smart break planning

Users choose how frequently they would normally like to stop.

DrivePlanner maps that interval onto the calculated route and creates approximate break anchors.

For example:

```text
Journey duration: 5h 20m
Break interval: 2h

Suggested break points:
~2h
~4h
```

A break is avoided if it would occur too close to the final destination.

Geoapify Places is then used to search around the break points for useful nearby locations.

Potential stop types include:

- Cafés
- Restaurants
- Supermarkets
- Toilets
- Fuel stations
- EV charging stations

The search expands its radius if necessary.

If no suitable place is found, the break itself is still shown rather than being silently removed.

---

# Fuel and EV charging stops

DrivePlanner also searches near a useful route point for:

### Petrol / diesel / hybrid

- Fuel stations

### Electric

- EV charging stations

These recommendations are intended as route-planning suggestions rather than guaranteed availability.

---

# Gemini journey intelligence

Gemini is deliberately used as a **recommendation layer**, not as the source of factual route calculations.

The following values are calculated before Gemini is called:

- Route distance
- Route duration
- Fuel/electricity consumption
- Cost
- CO₂e
- Weather
- Break timing
- Nearby stops
- Toll/ferry presence

Gemini receives those results and turns them into a concise journey summary.

It can provide:

- Journey headline
- Practical summary
- Weather advice
- Three journey tips
- Handwritten-style note
- Drive-vs-train recommendation

This architecture keeps deterministic information separate from generative recommendations.

---

# Train comparison

DrivePlanner also asks Gemini for a **rough rail comparison**.

Gemini may estimate:

- Approximate train journey time
- Broad fare range
- Confidence
- Whether a realistic rail option is likely to exist

Example:

```text
Train
Est. time: ~3h 10m
Est. fare: £45–£80

AI estimate · not live rail data
```

If Gemini cannot reasonably identify a practical rail journey:

```text
Est. time: N/A
Est. fare: N/A
```

Train information is deliberately labelled as an **AI estimate**.

It is not:

- A live timetable
- A live ticket price
- A booking system
- A verified rail journey

---

# Navigation handoff

Once the journey is calculated, users can open it externally.

## Google Maps

The generated Google Maps URL contains:

- Origin
- Destination
- Intermediate stops
- Driving mode

This allows the planned route to be transferred directly to Google Maps.

## Waze

Waze navigation opens using the final destination coordinates.

Because Waze launch URLs do not preserve the same full waypoint itinerary in the same way, DrivePlanner clearly treats Waze as destination navigation rather than pretending it receives the complete itinerary.

---

# QR route handoff

DrivePlanner generates a QR code in the browser using the `qrcode` package.

The QR contains the same Google Maps route URL used by the Google Maps button.

This allows a user planning on desktop to:

1. Calculate the journey
2. Scan the QR with their phone
3. Open the route directly in Google Maps

QR generation happens locally in the browser and does not require an external QR API.

---

# UI and design

DrivePlanner uses a hand-drawn whiteboard / notebook visual style.

Design characteristics include:

- Off-white dotted background
- Handwritten annotations
- Slightly imperfect borders
- Tape details
- Lime, blue and coral accents
- Large editorial typography
- Clean aligned card layouts
- Mobile-responsive planner steps

The page is structured as:

```text
Header
↓
Hero
↓
Interactive Planner
↓
How It Works
↓
Why DrivePlanner
↓
Features
↓
Final CTA
↓
Footer
```

The main planner itself is a four-step flow:

```text
1. Route
2. Vehicle
3. Preferences
4. Journey result
```

---

# Technology stack

## Frontend

- Next.js
- React
- TypeScript
- Next.js App Router
- Custom CSS
- Lucide React
- QRCode

## External services

### Geoapify

Used for:

- Location autocomplete
- Driving routes
- Route geometry
- Nearby places
- Fuel stations
- EV chargers
- Break recommendations

### Open-Meteo

Used for:

- Route weather
- Temperature
- Precipitation
- Wind
- Visibility
- Weather codes

### Google Gemini

Used for:

- Vehicle-specific efficiency estimation
- Journey summary
- Journey tips
- Weather interpretation
- Rough drive-vs-train comparison

### Google Maps

Used as an external destination for the generated full route.

### Waze

Used to launch destination navigation.

---

# Architecture

DrivePlanner follows a simple server-mediated architecture.

```text
Browser
   │
   ├── /api/places/autocomplete
   │       └── Geoapify
   │
   ├── /api/route
   │       └── Geoapify Routing
   │
   ├── /api/weather/route
   │       └── Open-Meteo
   │
   ├── /api/places/route-stops
   │       └── Geoapify Places
   │
   ├── /api/ai/vehicle-efficiency
   │       └── Gemini
   │
   └── /api/ai/journey
           └── Gemini
```

API keys remain server-side.

The client never needs direct access to:

- Gemini API key
- Geoapify API key

This also keeps provider logic separate from the React interface.

---

# Project structure

A simplified project structure looks like:

```text
DrivePlanner/
│
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── journey/
│   │   │   │   └── route.ts
│   │   │   │
│   │   │   └── vehicle-efficiency/
│   │   │       └── route.ts
│   │   │
│   │   ├── places/
│   │   │   ├── autocomplete/
│   │   │   │   └── route.ts
│   │   │   │
│   │   │   └── route-stops/
│   │   │       └── route.ts
│   │   │
│   │   ├── route/
│   │   │   └── route.ts
│   │   │
│   │   └── weather/
│   │       └── route/
│   │           └── route.ts
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── Planner.tsx
│   ├── HowItWorks.tsx
│   ├── WhyDrivePlanner.tsx
│   ├── Features.tsx
│   ├── FinalCTA.tsx
│   └── Footer.tsx
│
├── public/
│
├── .env.local
├── package.json
└── README.md
```

---

# Environment variables

Create:

```text
.env.local
```

Add:

```env
GEOAPIFY_API_KEY=your_geoapify_api_key

GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=your_working_gemini_model

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Important

Do not expose provider secrets using variables such as:

```env
NEXT_PUBLIC_GEMINI_API_KEY=
NEXT_PUBLIC_GEOAPIFY_API_KEY=
```

The API keys should remain server-side.

Do not commit `.env.local` to Git.

---

# Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd <your-project-folder>
```

Install dependencies:

```bash
npm install
```

If QRCode is not already installed:

```bash
npm install qrcode
npm install -D @types/qrcode
```

Create your `.env.local` file and add the required keys.

Start development mode:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Production build

Before deployment, run:

```bash
npm run build
```

Then optionally test the production build locally:

```bash
npm start
```

A successful production build is a good final check for:

- TypeScript errors
- Missing imports
- Client/server component issues
- Environment variable problems
- Invalid route handlers

---

# API resilience

DrivePlanner is designed so that optional enrichment services do not unnecessarily destroy the whole journey result.

Examples:

### Weather API fails

The route can still be shown.

### Nearby place search fails

The journey can still be shown.

### Journey Gemini call fails

Distance, cost, weather and deterministic journey data still remain valid.

### Vehicle-efficiency Gemini call fails

DrivePlanner falls back to generic vehicle efficiency assumptions.

This is intentional.

A route-planning tool should not become unusable just because one optional enhancement is temporarily unavailable.

---

# Deterministic vs AI-generated data

One of the main architectural principles of the project is separating factual calculations from generative advice.

## Deterministic / API-backed

These come from calculations or external data:

- Coordinates
- Route
- Distance
- Driving time
- Route legs
- Toll presence
- Ferry presence
- Fuel/electricity consumption
- Journey cost
- Operational CO₂e
- Weather
- Break timing
- Nearby places
- Fuel/charging stop suggestions

## AI-assisted

Gemini is used for:

- Approximate model-specific vehicle efficiency
- Journey summary
- Practical journey advice
- Weather interpretation
- Rough rail estimate
- Drive/train recommendation

This prevents Gemini from becoming the source of truth for values that can be calculated directly.

---

# Current limitations

DrivePlanner is an MVP and deliberately avoids pretending to provide more precision than it really has.

## Vehicle efficiency

Model-specific MPG / mi-kWh is AI-assisted and approximate.

Actual efficiency depends on factors such as:

- Exact engine
- Trim
- Gearbox
- Tyres
- Payload
- Driving conditions
- Temperature
- Driving behaviour

## Train information

Rail times and fares are rough AI estimates.

They are not live National Rail data.

## Traffic

Driving time should be treated as a planning estimate rather than guaranteed live traffic prediction.

## Toll cost

DrivePlanner can identify whether tolls are present, but does not currently calculate exact toll charges.

## Weather

Weather is sampled at selected points along the route rather than continuously along every road segment.

## Break timing

Break positions are approximate route anchors and should be treated as recommendations.

## Emissions

The CO₂e result represents operational journey emissions only.

---

# Potential future improvements

The current architecture leaves several natural upgrade paths.

## More accurate vehicle data

Replace or supplement Gemini vehicle efficiency with:

- DVLA / DVSA vehicle datasets
- Manufacturer specifications
- Registration-based vehicle lookup
- Real-world efficiency databases

## Live rail data

Integrate a rail API for:

- Live timetables
- Transfers
- Actual stations
- Live fares
- Booking links

## Live traffic

Add traffic-sensitive journey duration and congestion-aware routing.

## Toll pricing

Estimate actual toll costs rather than just toll presence.

## EV route intelligence

Add:

- Battery capacity
- Starting state of charge
- Required charging stops
- Charger speed
- Charging duration
- Estimated charging cost

## Departure time

Allow users to select:

```text
Leave now
Leave at...
```

This would make weather and traffic timing more useful.

## Saved journeys

Optional accounts could allow:

- Favourite journeys
- Saved vehicles
- Saved fuel prices
- Journey history

The current MVP deliberately avoids authentication to keep the experience immediate.

---

# Design philosophy

DrivePlanner was built around four principles.

## 1. Facts before AI

If something can be calculated or retrieved from a reliable API, do that first.

AI should explain and assist rather than fabricate core numbers.

## 2. Useful approximation beats fake precision

Values such as vehicle efficiency and rail fares are clearly labelled as estimates.

## 3. Optional services should fail gracefully

Weather or AI should enhance the planner, not become single points of failure.

## 4. Keep the MVP small

The project intentionally avoids:

- Authentication
- Databases
- Large cloud infrastructure
- Complicated microservices
- Heavy mapping SDKs
- Paid enterprise architecture

That keeps the code understandable and the deployment lightweight.

---

# Example journey flow

A typical user journey might look like:

```text
Cardiff
    ↓
Manchester

Vehicle:
2020 BMW 320i Petrol

Preferences:
Break every 2 hours
£1.46/L
Balanced driving

            ↓

Geoapify
calculates route

            ↓

Gemini
estimates ~42 MPG

            ↓

DrivePlanner
calculates fuel + cost + CO₂e

            ↓

Open-Meteo
checks route weather

            ↓

Geoapify Places
checks useful stops

            ↓

Gemini
creates journey summary
and rough train comparison

            ↓

User receives:

184 miles
~3h 40m
~£29 fuel
~38 kg CO₂e
Weather warnings
Suggested break
Fuel stop
AI journey tips
Train comparison

            ↓

Google Maps / Waze / QR
```

---

# Disclaimer

DrivePlanner is intended as a journey planning and estimation tool.

All results should be treated as guidance.

Users should verify important information using appropriate live services before travelling, especially:

- Road closures
- Traffic
- Weather
- Tolls
- Fuel/charging availability
- Train schedules
- Train fares

Drive safely and follow official road signage and local regulations.

---

# Status

**MVP complete**

Current completed areas include:

- Route search
- Routing
- Intermediate stops
- Vehicle configuration
- Model-specific AI efficiency
- Journey cost
- Emissions
- Route weather
- Break planning
- Nearby services
- Fuel / EV charger recommendations
- AI journey advice
- Rough train comparison
- Google Maps handoff
- Waze handoff
- QR route transfer
- Responsive single-page UI
