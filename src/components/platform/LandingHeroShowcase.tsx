/** Decorative Gantt-style preview — no real product screenshot. */
export function LandingHeroShowcase() {
  return (
    <div className="landing-showcase landing-showcase--pro landing-showcase--gantt" aria-hidden>
      <div className="landing-showcase__chrome">
        <span />
        <span />
        <span />
      </div>
      <div className="landing-showcase__gantt">
        <div className="landing-showcase__gantt-head">
          <span className="landing-showcase__gantt-room-label" />
          {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
            <span key={`${day}-${i}`} className="landing-showcase__gantt-day">
              {day}
            </span>
          ))}
        </div>
        <div className="landing-showcase__gantt-row">
          <span className="landing-showcase__gantt-room">101</span>
          <span className="landing-showcase__gantt-track">
            <span className="landing-showcase__stay landing-showcase__stay--a" />
          </span>
        </div>
        <div className="landing-showcase__gantt-row">
          <span className="landing-showcase__gantt-room">102</span>
          <span className="landing-showcase__gantt-track">
            <span className="landing-showcase__stay landing-showcase__stay--b" />
            <span className="landing-showcase__stay landing-showcase__stay--c" />
          </span>
        </div>
        <div className="landing-showcase__gantt-row">
          <span className="landing-showcase__gantt-room">201</span>
          <span className="landing-showcase__gantt-track">
            <span className="landing-showcase__stay landing-showcase__stay--d" />
          </span>
        </div>
        <div className="landing-showcase__gantt-row">
          <span className="landing-showcase__gantt-room">202</span>
          <span className="landing-showcase__gantt-track">
            <span className="landing-showcase__stay landing-showcase__stay--e" />
          </span>
        </div>
      </div>
    </div>
  );
}
