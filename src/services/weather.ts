const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export type WeatherData = {
  currentTemp: number;
  currentCode: number;
  minTemp: number;
  maxTemp: number;
  forecast: DayForecast[];
};

export type DayForecast = {
  date: string;
  minTemp: number;
  maxTemp: number;
  code: number;
};

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: "temperature_2m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,weather_code",
      forecast_days: "4",
      timezone: "auto",
    });

    const res = await fetch(`${OPEN_METEO_URL}?${params}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;

    const data = await res.json();

    const forecast: DayForecast[] = [];
    const daily = data.daily;
    if (daily?.time) {
      for (let i = 1; i < daily.time.length; i++) {
        forecast.push({
          date: daily.time[i],
          minTemp: Math.round(daily.temperature_2m_min[i]),
          maxTemp: Math.round(daily.temperature_2m_max[i]),
          code: daily.weather_code[i],
        });
      }
    }

    return {
      currentTemp: Math.round(data.current.temperature_2m),
      currentCode: data.current.weather_code,
      minTemp: Math.round(daily?.temperature_2m_min?.[0] ?? data.current.temperature_2m),
      maxTemp: Math.round(daily?.temperature_2m_max?.[0] ?? data.current.temperature_2m),
      forecast,
    };
  } catch {
    return null;
  }
}

export function weatherLabel(code: number): string {
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 65) return "rain";
  if (code <= 67) return "freezingRain";
  if (code <= 77) return "snow";
  if (code <= 82) return "showers";
  if (code <= 86) return "snowShowers";
  if (code <= 99) return "thunderstorm";
  return "cloudy";
}

export function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 67) return "🌨️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  if (code <= 99) return "⚡";
  return "☁️";
}
