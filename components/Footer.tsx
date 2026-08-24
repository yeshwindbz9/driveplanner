import { Route, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-main">
          <div className="footer-brand">
            <span className="footer-brand-icon">
              <Route size={20} strokeWidth={2.2} />
            </span>

            <div>
              <strong>DrivePlanner</strong>

              <span>AI-powered route &amp; cost estimator</span>
            </div>
          </div>

          <div className="footer-links">
            <a href="#planner">Planner</a>

            <a href="#how-it-works">How it works</a>

            <a href="#why-driveplanner">Why</a>

            <a href="#features">Features</a>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="footer-disclaimer">
            <Sparkles size={13} />

            <span>
              Planning estimates only. Always check live traffic, weather and
              road conditions before travelling.
            </span>
          </div>

          <div className="footer-meta">
            <span className="footer-dot">•</span>

            <span>© 2026 DrivePlanner</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
