/** Premium browser + Gantt mockup — no real screenshots needed */
export function LandingHeroShowcase() {
  const rooms = [
    { id: "101", bars: [{ cls: "rb rb--ok", style: { left: "5%", width: "35%" } }] },
    {
      id: "102",
      bars: [
        { cls: "rb rb--pending", style: { left: "3%", width: "22%" } },
        { cls: "rb rb--ok", style: { left: "42%", width: "32%" } },
      ],
    },
    { id: "201", bars: [{ cls: "rb rb--hold", style: { left: "28%", width: "45%" } }] },
    {
      id: "202",
      bars: [
        { cls: "rb rb--past", style: { left: "0%", width: "28%" } },
        { cls: "rb rb--ok", style: { left: "68%", width: "28%" } },
      ],
    },
    { id: "301", bars: [{ cls: "rb rb--ok", style: { left: "15%", width: "55%" } }] },
    { id: "401", bars: [{ cls: "rb rb--pending", style: { left: "2%", width: "40%" } }] },
  ];
  const days = ["L", "M", "M", "J", "V", "S", "D", "L", "M", "M", "J", "V", "S", "D"];

  return (
    <div className="hero-browser" aria-hidden>
      {/* Chrome bar */}
      <div className="hero-browser__chrome">
        <div className="hero-browser__dots">
          <span className="hero-browser__dot hero-browser__dot--red" />
          <span className="hero-browser__dot hero-browser__dot--yellow" />
          <span className="hero-browser__dot hero-browser__dot--green" />
        </div>
        <div className="hero-browser__url">
          <span className="hero-browser__url-lock" aria-hidden />
          zalmox.app/admin/calendar
        </div>
        <div className="hero-browser__actions">
          <span className="hero-browser__action" />
          <span className="hero-browser__action" />
        </div>
      </div>

      {/* App body */}
      <div className="hero-browser__body">
        {/* Sidebar */}
        <nav className="hero-browser__sidebar">
          <div className="hero-browser__brand-dot">Z</div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`hero-browser__nav${i === 0 ? " hero-browser__nav--active" : ""}`}
            />
          ))}
        </nav>

        {/* Main */}
        <div className="hero-browser__main">
          {/* Toolbar */}
          <div className="hero-browser__toolbar">
            <span className="hero-browser__month">Sept 2026</span>
            <div className="hero-browser__toolbar-right">
              <span className="hero-browser__chip hero-browser__chip--active">Gantt</span>
              <span className="hero-browser__chip">Luna</span>
              <span className="hero-browser__chip">Zi</span>
            </div>
          </div>

          {/* Gantt head */}
          <div className="hero-browser__gantt-head">
            <span className="hero-browser__room-col" />
            {days.map((d, i) => (
              <span key={i} className={`hero-browser__day ${i === 3 ? "hero-browser__day--today" : ""}`}>
                {d}
                {i === 3 && <span className="hero-browser__today-dot" />}
              </span>
            ))}
          </div>

          {/* Gantt rows */}
          {rooms.map((room) => (
            <div key={room.id} className="hero-browser__gantt-row">
              <span className="hero-browser__room-label">{room.id}</span>
              <div className="hero-browser__track">
                {room.bars.map((bar, bi) => (
                  <div key={bi} className={bar.cls} style={bar.style} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating notification */}
      <div className="hero-notif">
        <div className="hero-notif__icon" aria-hidden />
        <div className="hero-notif__text">
          <p className="hero-notif__title">Rezervare nouă</p>
          <p className="hero-notif__sub">Camera 201 · 5 nopți · 450 RON</p>
        </div>
        <span className="hero-notif__dot" />
      </div>

      {/* Floating stats card */}
      <div className="hero-stat-card">
        <p className="hero-stat-card__label">Ocupare azi</p>
        <p className="hero-stat-card__value">4 / 6</p>
        <p className="hero-stat-card__trend">camere ocupate</p>
      </div>
    </div>
  );
}
