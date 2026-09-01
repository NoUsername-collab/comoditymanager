/** CSS-only app mockups for feature showcase sections */

export function BookingFormMockup() {
  return (
    <div className="feat-mockup feat-mockup--booking" aria-hidden>
      <div className="feat-mockup__card">
        <div className="feat-mockup__card-header">
          <span className="feat-mockup__avatar" aria-hidden />
          <div>
            <div className="feat-bar feat-bar--title" style={{ width: 120 }} />
            <div className="feat-bar feat-bar--sub" style={{ width: 80, marginTop: 4 }} />
          </div>
        </div>
        <div className="feat-mockup__divider" />
        <p className="feat-mockup__label">Check-in</p>
        <div className="feat-mockup__date-row">
          <div className="feat-mockup__date-box feat-mockup__date-box--active">
            <span className="feat-mockup__date-num">14</span>
            <span className="feat-mockup__date-month">Iul</span>
          </div>
          <div className="feat-mockup__arrow">→</div>
          <div className="feat-mockup__date-box">
            <span className="feat-mockup__date-num">19</span>
            <span className="feat-mockup__date-month">Iul</span>
          </div>
          <div className="feat-mockup__nights">5 nopți</div>
        </div>
        <p className="feat-mockup__label" style={{ marginTop: 12 }}>Camere disponibile</p>
        {[
          { room: "Camera 101", type: "Dublă", price: "290 RON", avail: true },
          { room: "Camera 201", type: "Twin", price: "260 RON", avail: true },
          { room: "Camera 301", type: "Suite", price: "450 RON", avail: false },
        ].map((r) => (
          <div key={r.room} className={`feat-mockup__room-row ${!r.avail ? "feat-mockup__room-row--unavail" : ""}`}>
            <div>
              <p className="feat-mockup__room-name">{r.room}</p>
              <p className="feat-mockup__room-type">{r.type}</p>
            </div>
            <div className="feat-mockup__room-right">
              <span className="feat-mockup__room-price">{r.price}</span>
              {r.avail
                ? <span className="feat-mockup__tag feat-mockup__tag--green">Liber</span>
                : <span className="feat-mockup__tag feat-mockup__tag--gray">Ocupat</span>}
            </div>
          </div>
        ))}
        <button className="feat-mockup__btn" type="button" tabIndex={-1}>
          Trimite cerere
        </button>
      </div>
    </div>
  );
}

export function GuestAppMockup() {
  return (
    <div className="phone-frame" aria-hidden>
      <div className="phone-frame__shell">
        <div className="phone-frame__notch" />
        <div className="phone-frame__screen">
          {/* Status bar */}
          <div className="phone-status">
            <span>9:41</span>
            <span className="phone-status__signal" aria-hidden />
          </div>
          {/* App content */}
          <div className="phone-app">
            <div className="phone-app__hero">
              <p className="phone-app__welcome">Bun venit,</p>
              <p className="phone-app__name">Andrei</p>
              <p className="phone-app__stay">Camera 201 · 5 nopți</p>
            </div>
            <div className="phone-app__tiles">
              {[
                { label: "Wi-Fi" },
                { label: "Facilități" },
                { label: "Mic dejun" },
                { label: "Ghid local" },
              ].map((tile) => (
                <div key={tile.label} className="phone-tile">
                  <span className="phone-tile__icon" aria-hidden />
                  <span className="phone-tile__label">{tile.label}</span>
                </div>
              ))}
            </div>
            <div className="phone-app__checkin">
              <span className="phone-app__checkin-icon" aria-hidden />
              <div>
                <p className="phone-app__checkin-title">Check-in online</p>
                <p className="phone-app__checkin-sub">Completează în avans</p>
              </div>
              <span className="phone-app__chevron">›</span>
            </div>
            <div className="phone-app__wifi-card">
              <p className="phone-app__wifi-label">Rețea Wi-Fi</p>
              <p className="phone-app__wifi-name">Zalmox_Guests</p>
              <p className="phone-app__wifi-pass">Parolă: <b>welcome2025</b></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardMockup() {
  return (
    <div className="feat-mockup feat-mockup--dashboard" aria-hidden>
      <div className="feat-mockup__dash">
        {/* Stats row */}
        <div className="dash-stats">
          {[
            { label: "Ocupare azi", value: "82%", trend: "↑", color: "#4ade80" },
            { label: "Rezervări luna", value: "47", trend: "↑", color: "#60a5fa" },
            { label: "Venit net", value: "8.4k", trend: "↑", color: "#a78bfa" },
          ].map((s) => (
            <div key={s.label} className="dash-stat">
              <p className="dash-stat__label">{s.label}</p>
              <p className="dash-stat__value" style={{ color: s.color }}>{s.value}</p>
              <p className="dash-stat__trend">{s.trend} față de luna trecută</p>
            </div>
          ))}
        </div>
        {/* Mini chart bars */}
        <div className="dash-chart">
          <p className="dash-chart__label">Rezervări — ultimele 7 zile</p>
          <div className="dash-chart__bars">
            {[45, 72, 58, 89, 94, 67, 82].map((h, i) => (
              <div key={i} className="dash-chart__bar-wrap">
                <div className="dash-chart__bar" style={{ height: `${h}%`, background: `hsl(${250 + i * 18}, 80%, 65%)` }} />
                <span className="dash-chart__bar-label">{["L","M","M","J","V","S","D"][i]}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Recent bookings */}
        <div className="dash-recent">
          <p className="dash-recent__title">Rezervări recente</p>
          {[
            { name: "Popescu A.", room: "101", nights: "3n", status: "confirmed" },
            { name: "Ionescu M.", room: "201", nights: "5n", status: "checkin" },
            { name: "Dumitrescu C.", room: "301", nights: "2n", status: "pending" },
          ].map((b) => (
            <div key={b.name} className="dash-booking">
              <div className="dash-booking__avatar">{b.name[0]}</div>
              <div className="dash-booking__info">
                <p className="dash-booking__name">{b.name}</p>
                <p className="dash-booking__meta">Camera {b.room} · {b.nights}</p>
              </div>
              <span className={`dash-booking__status dash-booking__status--${b.status}`}>
                {b.status === "confirmed" ? "Confirmat" : b.status === "checkin" ? "Check-in" : "În așteptare"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
