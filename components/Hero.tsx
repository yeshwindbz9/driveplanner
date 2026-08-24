import {
  ArrowDownRight,
  CarFront,
  Coffee,
  CloudSun,
  Fuel,
  MapPin,
  Sparkles,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-kicker">
            <Sparkles size={16} />
            AI-powered drive planning
          </div>

          <h1 className="hero-title">
            Know the drive
            <br />
            <span className="hero-title-accent">before you drive.</span>
          </h1>

          <p className="hero-description">
            Route, fuel, weather, breaks and the true cost of your journey —
            planned together in one smart drive assistant.
          </p>

          <div className="hero-actions">
            <a href="#planner" className="primary-button">
              Plan my drive
              <ArrowDownRight size={19} />
            </a>

            <span className="hand-note hero-button-note">
              takes about 30 seconds
            </span>
          </div>

          <div className="hero-mini-features">
            <span>
              <Fuel size={16} />
              Fuel cost
            </span>

            <span>
              <CloudSun size={16} />
              Route weather
            </span>

            <span>
              <Coffee size={16} />
              Smart breaks
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <span className="hand-note visual-note">
            your trip, figured out ↓
          </span>

          <div className="route-board">
            <div className="tape tape-left" />
            <div className="tape tape-right" />

            <div className="route-board-content">
              <div className="route-board-header">
                <div>
                  <span className="board-label">TODAY&apos;S DRIVE</span>
                  <strong>Cardiff → Manchester</strong>
                </div>

                <div className="board-distance">
                  186
                  <span>mi</span>
                </div>
              </div>

              <div className="route-sketch">
                <div className="route-point route-start">
                  <span className="point-circle">
                    <MapPin size={17} />
                  </span>
                  <span>Cardiff</span>
                </div>

                <div className="route-line">
                  <span className="route-dash" />

                  <div className="route-stop stop-coffee">
                    <Coffee size={18} />
                  </div>

                  <div className="route-stop stop-fuel">
                    <Fuel size={18} />
                  </div>

                  <CarFront className="route-car" size={34} />
                </div>

                <div className="route-point route-end">
                  <span className="point-circle destination-circle">
                    <MapPin size={17} />
                  </span>
                  <span>Manchester</span>
                </div>
              </div>

              <div className="board-stats">
                <div className="stat-card stat-card-lime stat-card-left">
                  <div className="stat-card-inner">
                    <span>fuel estimate</span>
                    <strong>£28.40</strong>
                    <small>based on 45 MPG</small>
                  </div>
                </div>

                <div className="stat-card stat-card-center">
                  <div className="stat-card-inner">
                    <span>drive time</span>
                    <strong>3h 42m</strong>
                    <small>+ one suggested break</small>
                  </div>
                </div>

                <div className="stat-card stat-card-blue stat-card-right">
                  <div className="stat-card-inner">
                    <span>weather</span>
                    <strong>Mostly clear</strong>
                    <small>rain later near Shrewsbury</small>
                  </div>
                </div>
              </div>

              <div className="ai-note">
                <Sparkles size={18} />

                <div className="ai-note-content">
                  <span>AI DRIVE NOTE</span>
                  <p>
                    Leave before 11:30 to avoid the wettest part of the route.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <span className="scribble-arrow" aria-hidden="true">
            ↝
          </span>

          <span className="hand-note bottom-note">fuel + weather + breaks</span>
        </div>
      </div>

      <div className="hero-scroll-hint">
        <span>scroll to build your route</span>
        <span className="scroll-line" />
      </div>
    </section>
  );
}
