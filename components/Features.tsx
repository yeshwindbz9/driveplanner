"use client";

import { useState } from "react";
import {
  BatteryCharging,
  CloudRain,
  Coffee,
  Fuel,
  Leaf,
  Sparkles,
  Train,
  WalletCards,
} from "lucide-react";

const FEATURES = [
  {
    key: "cost",
    label: "Journey cost",
    icon: WalletCards,
    accent: "lime",
    title: "Know roughly what the drive will cost.",
    description:
      "DrivePlanner uses the real route distance plus your selected vehicle assumptions and fuel or electricity price to estimate the journey cost.",
    points: [
      "Petrol, diesel, hybrid and EV supported",
      "Transparent MPG / mi-kWh assumptions",
      "User-adjustable fuel or electricity price",
    ],
    previewLabel: "ESTIMATED JOURNEY COST",
    previewValue: "£28.40",
    previewMeta: "19.5 litres · 184 miles",
  },
  {
    key: "weather",
    label: "Route weather",
    icon: CloudRain,
    accent: "blue",
    title: "Check the weather along the journey.",
    description:
      "Instead of looking only at your destination, DrivePlanner samples conditions at several points along the route and around your approximate travel times.",
    points: [
      "Rain and precipitation risk",
      "Wind and gust warnings",
      "Snow, ice and visibility checks",
    ],
    previewLabel: "ROUTE WEATHER",
    previewValue: "Medium risk",
    previewMeta: "Rain likely around halfway",
  },
  {
    key: "breaks",
    label: "Smart breaks",
    icon: Coffee,
    accent: "coral",
    title: "Stop when it actually makes sense.",
    description:
      "Your selected break interval is mapped onto the route and matched with nearby refreshment, fuel or charging options.",
    points: [
      "Choose your own break frequency",
      "Route-aware break timing",
      "Nearby café, toilet and service options",
    ],
    previewLabel: "NEXT BREAK",
    previewValue: "~2h",
    previewMeta: "Nearby refreshment stop found",
  },
  {
    key: "fuel",
    label: "Fuel & charging",
    icon: Fuel,
    accent: "neutral",
    title: "Find useful energy stops on the way.",
    description:
      "DrivePlanner searches around relevant route points for fuel stations or EV chargers, depending on the vehicle you selected.",
    points: [
      "Petrol and diesel station search",
      "EV charger search",
      "Location kept close to the route",
    ],
    previewLabel: "NEARBY OPTION",
    previewValue: "0.6 mi",
    previewMeta: "from route search point",
  },
  {
    key: "carbon",
    label: "CO₂e",
    icon: Leaf,
    accent: "lime",
    title: "Understand the journey’s operational emissions.",
    description:
      "The app estimates operational CO₂e using expected fuel or electricity usage rather than asking AI to guess a carbon footprint.",
    points: [
      "Fuel-use based estimate",
      "EV electricity emissions included",
      "Calculation assumptions shown clearly",
    ],
    previewLabel: "CO₂e ESTIMATE",
    previewValue: "40.5 kg",
    previewMeta: "operational journey emissions",
  },
  {
    key: "compare",
    label: "Drive vs train",
    icon: Train,
    accent: "blue",
    title: "Get a little perspective before you travel.",
    description:
      "Compare your real driving result with a rough AI-estimated rail option so you can decide whether driving still makes sense.",
    points: [
      "Calculated driving time and cost",
      "Approximate rail time and fare",
      "Clearly labelled AI estimate",
    ],
    previewLabel: "QUICK COMPARISON",
    previewValue: "Drive",
    previewMeta: "likely cheaper · similar timing",
  },
] as const;

export default function Features() {
  const [activeKey, setActiveKey] =
    useState<(typeof FEATURES)[number]["key"]>("cost");

  const activeFeature =
    FEATURES.find((feature) => feature.key === activeKey) ?? FEATURES[0];

  const ActiveIcon = activeFeature.icon;

  return (
    <section className="features-section" id="features">
      <div className="features-inner">
        <div className="features-heading">
          <div>
            <span className="section-kicker">
              <Sparkles size={15} />
              What you get
            </span>

            <h2>
              More than
              <br />
              <span>just directions.</span>
            </h2>
          </div>

          <div className="features-heading-copy">
            <span className="hand-note">pick one ↓</span>

            <p>
              Every feature is there to answer a practical question before you
              start driving.
            </p>
          </div>
        </div>

        <div className="features-layout">
          <div
            className="features-tabs"
            role="tablist"
            aria-label="DrivePlanner features"
          >
            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              const selected = feature.key === activeKey;

              return (
                <button
                  type="button"
                  key={feature.key}
                  className={`feature-tab ${
                    selected ? "feature-tab-active" : ""
                  }`}
                  onClick={() => setActiveKey(feature.key)}
                  role="tab"
                  aria-selected={selected}
                >
                  <span
                    className={`feature-tab-icon feature-tab-icon-${feature.accent}`}
                  >
                    <Icon size={19} />
                  </span>

                  <span>{feature.label}</span>
                </button>
              );
            })}
          </div>

          <div className="feature-detail-board">
            <span className="feature-detail-tape feature-detail-tape-left" />
            <span className="feature-detail-tape feature-detail-tape-right" />

            <div className="feature-detail-content">
              <span
                className={`feature-main-icon feature-main-icon-${activeFeature.accent}`}
              >
                <ActiveIcon size={28} />
              </span>

              <div className="feature-detail-copy">
                <small>{activeFeature.label}</small>

                <h3>{activeFeature.title}</h3>

                <p>{activeFeature.description}</p>

                <ul>
                  {activeFeature.points.map((point) => (
                    <li key={point}>
                      <span>✓</span>

                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="feature-preview-card">
              <div>
                <small>{activeFeature.previewLabel}</small>

                <strong>{activeFeature.previewValue}</strong>

                <span>{activeFeature.previewMeta}</span>
              </div>

              <span className="hand-note">example result</span>
            </div>
          </div>
        </div>

        <div className="features-bottom-note">
          <BatteryCharging size={17} />

          <span>
            Built to answer the things you normally work out in
            <strong> several different apps.</strong>
          </span>

          <span className="hand-note">one place is nicer.</span>
        </div>
      </div>
    </section>
  );
}
