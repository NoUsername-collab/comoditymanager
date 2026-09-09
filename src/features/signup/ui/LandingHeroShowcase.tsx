/** Reception calendar mockup — desk screen, not a browser chrome clone. */
export function LandingHeroShowcase({ title }: { title: string }) {
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
  const days = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  return (
    <div className="hero-browser hero-browser--desk" aria-hidden>
      <div className="hero-browser__chrome">
        <span className="hero-browser__desk-title">{title}</span>
      </div>

      <div className="hero-browser__body">
        <div className="hero-browser__main">
          <div className="hero-browser__gantt-head">
            <span className="hero-browser__room-col" />
            {days.map((day, i) => (
              <span
                key={day}
                className={`hero-browser__day ${i === 3 ? "hero-browser__day--today" : ""}`}
              >
                {day}
              </span>
            ))}
          </div>

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
    </div>
  );
}
