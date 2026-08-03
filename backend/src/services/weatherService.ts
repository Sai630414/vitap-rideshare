/**
 * Weather Service — Feature 5
 * Uses Open-Meteo API (free, no API key required, production-ready)
 * https://open-meteo.com/
 *
 * Includes in-memory cache with 30-minute TTL to avoid redundant API calls.
 */

import https from 'https';
import logger from '../utils/logger';

interface WeatherResult {
  available: boolean;
  temperature?: number;      // Celsius
  rainProbability?: number;  // 0–100 %
  weatherCode?: number;      // WMO code
  weatherDescription?: string;
  weatherIcon?: string;      // emoji
  travelAdvice?: string;
  windspeed?: number;        // km/h
}

// ─── WMO Weather Interpretation Codes ──────────────────────────────────────
const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0:  { description: 'Clear sky',                icon: '☀️' },
  1:  { description: 'Mainly clear',             icon: '🌤️' },
  2:  { description: 'Partly cloudy',            icon: '⛅' },
  3:  { description: 'Overcast',                 icon: '☁️' },
  45: { description: 'Foggy',                    icon: '🌫️' },
  48: { description: 'Icy fog',                  icon: '🌫️' },
  51: { description: 'Light drizzle',            icon: '🌦️' },
  53: { description: 'Moderate drizzle',         icon: '🌦️' },
  55: { description: 'Dense drizzle',            icon: '🌧️' },
  61: { description: 'Slight rain',              icon: '🌧️' },
  63: { description: 'Moderate rain',            icon: '🌧️' },
  65: { description: 'Heavy rain',               icon: '🌧️' },
  71: { description: 'Slight snowfall',          icon: '🌨️' },
  73: { description: 'Moderate snowfall',        icon: '❄️' },
  75: { description: 'Heavy snowfall',           icon: '❄️' },
  80: { description: 'Slight rain showers',      icon: '🌦️' },
  81: { description: 'Moderate rain showers',    icon: '🌧️' },
  82: { description: 'Violent rain showers',     icon: '⛈️' },
  85: { description: 'Slight snow showers',      icon: '🌨️' },
  86: { description: 'Heavy snow showers',       icon: '❄️' },
  95: { description: 'Thunderstorm',             icon: '⛈️' },
  96: { description: 'Thunderstorm with hail',   icon: '⛈️' },
  99: { description: 'Thunderstorm heavy hail',  icon: '⛈️' },
};

const getTravelAdvice = (code: number, rain: number, temp: number): string => {
  if ([95, 96, 99].includes(code)) return '⚠️ Severe weather! Avoid riding if possible — thunderstorm conditions ahead.';
  if ([65, 82].includes(code) || rain > 70) return '🌧️ Heavy rain expected. Carry rainwear and allow extra travel time.';
  if ([61, 63, 80, 81].includes(code) || rain > 40) return '☔ Rain likely. Consider bringing an umbrella or raincoat.';
  if (code === 45 || code === 48) return '🌫️ Foggy conditions. Drive slowly and use fog lights.';
  if (temp > 38) return '🌡️ Extreme heat. Stay hydrated and wear sunscreen during the ride.';
  if (temp < 10) return '🥶 Cold weather. Dress warmly for your ride.';
  return '✅ Conditions look good for your ride. Have a safe journey!';
};

// ─── In-Memory Cache ─────────────────────────────────────────────────────────
interface CacheEntry {
  data: WeatherResult;
  expiry: number;
}

const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const getCacheKey = (lat: number, lng: number, date: string): string =>
  `${lat.toFixed(2)},${lng.toFixed(2)},${date}`;

// ─── HTTP Fetch Helper ────────────────────────────────────────────────────────
const fetchJson = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON from weather API'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Weather API request timed out'));
    });
  });
};

// ─── Main Weather Fetcher ─────────────────────────────────────────────────────
export const getWeatherForecast = async (
  lat: number,
  lng: number,
  date: string // YYYY-MM-DD
): Promise<WeatherResult> => {
  const cacheKey = getCacheKey(lat, lng, date);

  // Check cache
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max` +
      `&timezone=auto` +
      `&start_date=${date}&end_date=${date}`;

    const json = await fetchJson(url);

    if (!json?.daily?.weathercode?.length) {
      return { available: false };
    }

    const weatherCode: number = json.daily.weathercode[0] ?? 0;
    const tempMax: number = json.daily.temperature_2m_max[0] ?? 25;
    const tempMin: number = json.daily.temperature_2m_min[0] ?? 20;
    const rain: number = json.daily.precipitation_probability_max[0] ?? 0;
    const wind: number = json.daily.windspeed_10m_max[0] ?? 0;
    const avgTemp = Math.round((tempMax + tempMin) / 2);

    const wmoInfo = WMO_CODES[weatherCode] ?? { description: 'Unknown', icon: '🌡️' };

    const result: WeatherResult = {
      available: true,
      temperature: avgTemp,
      rainProbability: Math.round(rain),
      weatherCode,
      weatherDescription: wmoInfo.description,
      weatherIcon: wmoInfo.icon,
      travelAdvice: getTravelAdvice(weatherCode, rain, avgTemp),
      windspeed: Math.round(wind),
    };

    // Store in cache
    weatherCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });

    return result;
  } catch (err) {
    logger.warn(`Weather API unavailable: ${(err as Error).message}`);
    return { available: false };
  }
};
