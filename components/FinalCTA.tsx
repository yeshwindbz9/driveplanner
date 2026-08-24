import { ArrowUpRight, Check, MapPin, Sparkles } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="final-cta-section">
      <div className="final-cta-inner">
        <div className="final-cta-board">
          <span className="final-cta-tape final-cta-tape-left" />
          <span className="final-cta-tape final-cta-tape-right" />

          <div className="final-cta-copy">
            <span className="section-kicker">
              <Sparkles size={15} />
              Ready when you are
            </span>

            <span className="hand-note final-cta-note">
              one route. much less guesswork ↓
            </span>

            <h2>
              Where are you
              <br />
              <span>driving next?</span>
            </h2>

            <p>
              Plan the route, understand the likely cost, check the weather,
              find sensible stops and send the journey straight to your phone.
            </p>

            <div className="final-cta-actions">
              <a href="#planner" className="final-cta-button">
                <MapPin size={18} />
                Plan my drive
                <ArrowUpRight size={17} />
              </a>

              <span className="final-cta-small-note">No account needed.</span>
            </div>
          </div>

          <div className="final-cta-side">
            <div className="final-cta-checklist">
              <span className="final-cta-check">
                <Check size={14} />
                Route &amp; drive time
              </span>

              <span className="final-cta-check">
                <Check size={14} />
                Fuel / EV cost
              </span>

              <span className="final-cta-check">
                <Check size={14} />
                Weather along the route
              </span>

              <span className="final-cta-check">
                <Check size={14} />
                Breaks &amp; nearby stops
              </span>

              <span className="final-cta-check">
                <Check size={14} />
                AI journey summary
              </span>
            </div>

            <div className="final-cta-mini-card">
              <small>FROM ROUTE TO ROAD</small>

              <strong>
                Plan.
                <br />
                Check.
                <br />
                Go.
              </strong>

              <span className="hand-note">that&apos;s the idea.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
