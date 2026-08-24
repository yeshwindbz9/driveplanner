import {
  CloudRain,
  Coffee,
  Gauge,
  Leaf,
  Sparkles,
  Train,
  WalletCards,
  Zap,
} from "lucide-react";

const DIFFERENTIATORS = [
  {
    icon: WalletCards,
    title: "Know the likely cost",
    text: "See estimated petrol, diesel, hybrid or EV energy cost before you leave.",
    accent: "lime",
  },
  {
    icon: CloudRain,
    title: "See weather along the route",
    text: "We check conditions at several points along the journey, not just at your destination.",
    accent: "blue",
  },
  {
    icon: Coffee,
    title: "Plan sensible breaks",
    text: "Break timing follows your preference, with nearby places suggested around each stop point.",
    accent: "coral",
  },
  {
    icon: Leaf,
    title: "Understand emissions",
    text: "Get an operational CO₂e estimate based on the energy your journey is expected to use.",
    accent: "neutral",
  },
];

export default function WhyDrivePlanner() {
  return (
    <section className="why-section" id="why-driveplanner">
      <div className="why-inner">
        <div className="why-intro">
          <span className="section-kicker">
            <Sparkles size={15} />
            Why DrivePlanner
          </span>

          <div className="why-statement-wrap">
            <span className="hand-note why-statement-note">
              directions are only half the story ↓
            </span>

            <h2>
              Google Maps tells you
              <br />
              <span>where to go.</span>
            </h2>

            <h3>
              DrivePlanner helps you understand
              <br />
              <span>the journey.</span>
            </h3>
          </div>
        </div>

        <div className="why-layout">
          <div className="why-main-board">
            <span className="why-tape why-tape-one" />
            <span className="why-tape why-tape-two" />

            <div className="why-board-heading">
              <div>
                <small>BEFORE YOU LEAVE</small>

                <strong>
                  One journey.
                  <br />
                  More useful context.
                </strong>
              </div>

              <span className="hand-note">
                the bits you normally Google separately
              </span>
            </div>

            <div className="why-difference-list">
              {DIFFERENTIATORS.map(({ icon: Icon, title, text, accent }) => (
                <article className="why-difference-row" key={title}>
                  <span
                    className={`why-difference-icon why-difference-icon-${accent}`}
                  >
                    <Icon size={21} />
                  </span>

                  <div>
                    <strong>{title}</strong>

                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="why-board-bottom">
              <Gauge size={18} />

              <span>
                Deterministic calculations for
                <strong> distance, cost and emissions</strong>.
              </span>

              <span className="hand-note">AI comes later.</span>
            </div>
          </div>

          <div className="why-side-stack">
            <article className="why-side-card why-side-card-ai">
              <span className="why-side-icon">
                <Zap size={23} />
              </span>

              <small>AI, BUT IN THE RIGHT PLACE</small>

              <h4>
                Facts first.
                <br />
                Advice second.
              </h4>

              <p>
                Gemini gets the route facts after they&apos;ve already been
                calculated, then turns them into practical journey advice.
              </p>

              <span className="hand-note">no made-up mileage!</span>
            </article>

            <article className="why-side-card why-side-card-train">
              <span className="why-side-icon">
                <Train size={23} />
              </span>

              <small>A LITTLE PERSPECTIVE</small>

              <h4>
                Is driving really
                <br />
                the obvious choice?
              </h4>

              <p>
                Compare your calculated driving result with a rough AI rail
                estimate before deciding how to travel.
              </p>

              <span className="hand-note">worth a quick check →</span>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
