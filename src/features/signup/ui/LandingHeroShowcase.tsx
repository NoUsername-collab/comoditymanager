type StayTone = "ok" | "pending" | "hold" | "past";

export type LandingHeroLabels = {
  title: string;
  confirmed: string;
  request: string;
  hold: string;
  stays: {
    ionescu: string;
    popa: string;
    marin: string;
    georgiev: string;
    dumitru: string;
    request: string;
    hold: string;
  };
};

/** Reception calendar mockup. Sample surnames illustrate stays; they are not testimonials. */
export function LandingHeroShowcase({ labels }: { labels: LandingHeroLabels }) {
  const rooms: {
    id: string;
    bars: { tone: StayTone; style: { left: string; width: string }; label: string }[];
  }[] = [
    { id: "101", bars: [{ tone: "ok", style: { left: "5%", width: "35%" }, label: labels.stays.ionescu }] },
    {
      id: "102",
      bars: [
        { tone: "pending", style: { left: "3%", width: "22%" }, label: labels.stays.request },
        { tone: "ok", style: { left: "42%", width: "32%" }, label: labels.stays.popa },
      ],
    },
    { id: "201", bars: [{ tone: "hold", style: { left: "28%", width: "45%" }, label: labels.stays.hold }] },
    {
      id: "202",
      bars: [
        { tone: "past", style: { left: "0%", width: "28%" }, label: labels.stays.georgiev },
        { tone: "ok", style: { left: "68%", width: "28%" }, label: labels.stays.marin },
      ],
    },
    { id: "301", bars: [{ tone: "ok", style: { left: "15%", width: "55%" }, label: labels.stays.dumitru }] },
    { id: "401", bars: [{ tone: "pending", style: { left: "2%", width: "40%" }, label: labels.stays.request }] },
  ];
  const days = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  return (
    <div className="hero-browser hero-browser--desk" aria-hidden>
      <div className="hero-browser__chrome">
        <span className="hero-browser__desk-title">{labels.title}</span>
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
                  <div key={bi} className={`rb rb--${bar.tone}`} style={bar.style}>
                    {bar.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ul className="hero-browser__legend">
        <li><span className="hero-browser__swatch hero-browser__swatch--ok" />{labels.confirmed}</li>
        <li><span className="hero-browser__swatch hero-browser__swatch--pending" />{labels.request}</li>
        <li><span className="hero-browser__swatch hero-browser__swatch--hold" />{labels.hold}</li>
      </ul>
    </div>
  );
}
