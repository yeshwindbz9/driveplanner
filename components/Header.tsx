import { Route } from "lucide-react";

export default function Header() {
  return (
    <header className="site-header">
      <div className="nav-pill">
        <a href="#" className="brand">
          <span className="brand-icon">
            <Route size={20} strokeWidth={2.2} />
          </span>

          <span>DrivePlanner</span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#planner">Planner</a>
          <a href="#how-it-works">How it works</a>
          <a href="#why-driveplanner">Why</a>
        </nav>

        <a href="#planner" className="nav-cta">
          Plan a drive
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </header>
  );
}
