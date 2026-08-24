import {
  ArrowRight,
  CloudRain,
  Fuel,
  MapPin,
  Route,
  Sparkles,
  WalletCards,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Tell us the route",
    description:
      "Pick where you’re leaving from, where you’re going and any stops you already want to make.",
    icon: MapPin,
    accent: "blue",
    note: "start here",
  },
  {
    number: "02",
    title: "We do the maths",
    description:
      "DrivePlanner calculates distance, journey time, fuel or electricity use, cost and operational CO₂e.",
    icon: WalletCards,
    accent: "lime",
    note: "actual numbers!",
  },
  {
    number: "03",
    title: "We check the journey",
    description:
      "Weather, tolls, break timing and useful fuel, charging or refreshment stops are checked along the route.",
    icon: CloudRain,
    accent: "coral",
    note: "the useful bits",
  },
  {
    number: "04",
    title: "You decide & go",
    description:
      "Get an AI journey summary, compare driving with a rough train estimate, then send the route to your phone.",
    icon: Route,
    accent: "neutral",
    note: "off you go →",
  },
];

export default function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="how-inner">
        <div className="how-heading">
          <div>
            <span className="section-kicker">
              <Sparkles size={15} />
              How it works
            </span>

            <h2>
              Route in.
              <br />
              <span>Useful answers out.</span>
            </h2>
          </div>

          <div className="how-heading-copy">
            <span className="hand-note">no spreadsheet required ↓</span>

            <p>
              Most route planners stop at directions. DrivePlanner adds the
              practical stuff you usually have to work out yourself.
            </p>
          </div>
        </div>

        <div className="how-board">
          <span className="how-board-tape how-board-tape-left" />
          <span className="how-board-tape how-board-tape-right" />

          <div className="how-flow-line" aria-hidden="true" />

          <div className="how-grid">
            {STEPS.map(
              (
                { number, title, description, icon: Icon, accent, note },
                index,
              ) => (
                <article className={`how-card how-card-${accent}`} key={number}>
                  <div className="how-card-inner">
                    <div className="how-card-top">
                      <span className="how-step-number">{number}</span>

                      <span className="how-step-icon">
                        <Icon size={23} />
                      </span>
                    </div>

                    <h3>{title}</h3>

                    <p>{description}</p>

                    <span className="hand-note how-card-note">{note}</span>
                  </div>

                  {index < STEPS.length - 1 && (
                    <span className="how-card-arrow" aria-hidden="true">
                      <ArrowRight size={24} strokeWidth={1.7} />
                    </span>
                  )}
                </article>
              ),
            )}
          </div>

          <div className="how-bottom-strip">
            <Fuel size={18} />

            <span>
              One route gives you
              <strong>
                {" "}
                cost, weather, breaks, emissions and onward navigation
              </strong>
              .
            </span>

            <span className="hand-note">much nicer.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
