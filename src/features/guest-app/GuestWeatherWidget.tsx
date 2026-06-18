import { getLocale, getTranslations } from "next-intl/server";
import { fetchWeather, weatherEmoji, weatherLabel } from "@/services/weather";

type Props = {
  lat: number;
  lng: number;
};

function formatDay(dateStr: string, locale: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString(
    locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-US",
    { weekday: "short" },
  );
}

export async function GuestWeatherWidget({ lat, lng }: Props) {
  const [t, locale, weather] = await Promise.all([
    getTranslations("guestApp.weather"),
    getLocale(),
    fetchWeather(lat, lng),
  ]);

  if (!weather) return null;

  return (
    <section className="guest-weather">
      <h2 className="guest-app__section-title mb-3">{t("title")}</h2>
      <div className="guest-weather__card">
        <div className="guest-weather__current">
          <span className="guest-weather__emoji">
            {weatherEmoji(weather.currentCode)}
          </span>
          <span className="guest-weather__temp">{weather.currentTemp}°C</span>
          <span className="guest-weather__desc">
            {t(`conditions.${weatherLabel(weather.currentCode)}` as "title")}
          </span>
          <span className="guest-weather__range">
            {weather.minTemp}° / {weather.maxTemp}°
          </span>
        </div>
        {weather.forecast.length > 0 ? (
          <div className="guest-weather__forecast">
            {weather.forecast.map((day) => (
              <div key={day.date} className="guest-weather__day">
                <span className="guest-weather__day-name">
                  {formatDay(day.date, locale)}
                </span>
                <span className="guest-weather__day-emoji">
                  {weatherEmoji(day.code)}
                </span>
                <span className="guest-weather__day-range">
                  {day.minTemp}° / {day.maxTemp}°
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
