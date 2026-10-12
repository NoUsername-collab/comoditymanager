/** CSS-only app mockups for feature showcase sections */

type BookingFormMockupLabels = {
  checkIn: string;
  nights: string;
  roomsAvailable: string;
  month: string;
  roomDouble: string;
  roomTwin: string;
  roomSuite: string;
  free: string;
  occupied: string;
  sendRequest: string;
  room: string;
};

export function BookingFormMockup({ labels }: { labels: BookingFormMockupLabels }) {
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
        <p className="feat-mockup__label">{labels.checkIn}</p>
        <div className="feat-mockup__date-row">
          <div className="feat-mockup__date-box feat-mockup__date-box--active">
            <span className="feat-mockup__date-num">14</span>
            <span className="feat-mockup__date-month">{labels.month}</span>
          </div>
          <div className="feat-mockup__arrow">→</div>
          <div className="feat-mockup__date-box">
            <span className="feat-mockup__date-num">19</span>
            <span className="feat-mockup__date-month">{labels.month}</span>
          </div>
          <div className="feat-mockup__nights">{labels.nights}</div>
        </div>
        <p className="feat-mockup__label" style={{ marginTop: 12 }}>
          {labels.roomsAvailable}
        </p>
        {[
          { id: "101", type: labels.roomDouble, price: "290 RON", avail: true },
          { id: "201", type: labels.roomTwin, price: "260 RON", avail: true },
          { id: "301", type: labels.roomSuite, price: "450 RON", avail: false },
        ].map((row) => (
          <div
            key={row.id}
            className={`feat-mockup__room-row ${!row.avail ? "feat-mockup__room-row--unavail" : ""}`}
          >
            <div>
              <p className="feat-mockup__room-name">
                {labels.room} {row.id}
              </p>
              <p className="feat-mockup__room-type">{row.type}</p>
            </div>
            <div className="feat-mockup__room-right">
              <span className="feat-mockup__room-price">{row.price}</span>
              {row.avail ? (
                <span className="feat-mockup__tag feat-mockup__tag--green">
                  {labels.free}
                </span>
              ) : (
                <span className="feat-mockup__tag feat-mockup__tag--gray">
                  {labels.occupied}
                </span>
              )}
            </div>
          </div>
        ))}
        <button className="feat-mockup__btn" type="button" tabIndex={-1}>
          {labels.sendRequest}
        </button>
      </div>
    </div>
  );
}

type GuestAppMockupLabels = {
  welcome: string;
  guestName: string;
  stay: string;
  wifi: string;
  facilities: string;
  breakfast: string;
  localGuide: string;
  onlineCheckin: string;
  onlineCheckinHint: string;
  wifiNetwork: string;
  wifiName: string;
  wifiPassword: string;
};

export function GuestAppMockup({ labels }: { labels: GuestAppMockupLabels }) {
  return (
    <div className="phone-frame" aria-hidden>
      <div className="phone-frame__shell">
        <div className="phone-frame__notch" />
        <div className="phone-frame__screen">
          <div className="phone-status">
            <span>9:41</span>
            <span className="phone-status__signal" aria-hidden />
          </div>
          <div className="phone-app">
            <div className="phone-app__hero">
              <p className="phone-app__welcome">{labels.welcome}</p>
              <p className="phone-app__name">{labels.guestName}</p>
              <p className="phone-app__stay">{labels.stay}</p>
            </div>
            <div className="phone-app__tiles">
              {[
                labels.wifi,
                labels.facilities,
                labels.breakfast,
                labels.localGuide,
              ].map((tile) => (
                <div key={tile} className="phone-tile">
                  <span className="phone-tile__icon" aria-hidden />
                  <span className="phone-tile__label">{tile}</span>
                </div>
              ))}
            </div>
            <div className="phone-app__checkin">
              <span className="phone-app__checkin-icon" aria-hidden />
              <div>
                <p className="phone-app__checkin-title">{labels.onlineCheckin}</p>
                <p className="phone-app__checkin-sub">{labels.onlineCheckinHint}</p>
              </div>
              <span className="phone-app__chevron">›</span>
            </div>
            <div className="phone-app__wifi-card">
              <p className="phone-app__wifi-label">{labels.wifiNetwork}</p>
              <p className="phone-app__wifi-name">{labels.wifiName}</p>
              <p className="phone-app__wifi-pass">{labels.wifiPassword}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
