// src/services/weatherService.ts
// Real-time location-based weather integration using Open-Meteo & reverse geocoding

export interface LiveWeatherInfo {
  condition: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  locationName: string;
  latitude: number;
  longitude: number;
  isRain: boolean;
  isExtremelyHot: boolean;
  shouldWater: boolean;
  recommendation: string;
  icon: string;
  lastUpdated: string;
}

export interface ClimateData {
  temperature: string;
  humidity: string;
  recommendations: string[];
}

const WEATHER_CACHE_KEY = 'plantscan_live_weather_cache';

// Fallback when offline or before real weather is loaded
const DEFAULT_WEATHER: LiveWeatherInfo = {
  condition: 'Extremely Hot & Sunny (35°C)',
  temperature: 35.5,
  apparentTemperature: 37.6,
  humidity: 34,
  precipitation: 0.0,
  weatherCode: 1,
  locationName: 'Mumbai, Maharashtra',
  latitude: 19.076,
  longitude: 72.877,
  isRain: false,
  isExtremelyHot: true,
  shouldWater: true,
  recommendation: 'Extreme heat detected (35.5°C)! Water outdoor plants thoroughly in the early morning or evening to prevent heat shock. Avoid harsh midday watering.',
  icon: '☀️🔥',
  lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export const getCachedWeather = (): LiveWeatherInfo => {
  try {
    const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch {
    // ignore parse error
  }
  return DEFAULT_WEATHER;
};

// Check if outdoor plants should be watered based on condition string or live data
export const shouldWaterOutdoorPlants = (currentCondition?: string): boolean => {
  if (currentCondition) {
    const rainyConditions = ['rain', 'monsoon', 'drizzle', 'thunderstorm', 'shower'];
    const lower = currentCondition.toLowerCase();
    const isRaining = rainyConditions.some(r => lower.includes(r));
    return !isRaining;
  }
  const cached = getCachedWeather();
  return cached.shouldWater;
};

// Interpret WMO code to human-friendly weather condition & details
const interpretWmoCode = (code: number, temp: number, apparentTemp: number, precip: number) => {
  let conditionText = 'Clear & Sunny';
  let icon = '☀️';
  let isRain = false;

  if (precip > 0.1 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    isRain = true;
    conditionText = `Rain / Showers (${temp}°C)`;
    icon = '🌧️';
  } else if ([95, 96, 99].includes(code)) {
    isRain = true;
    conditionText = `Thunderstorm (${temp}°C)`;
    icon = '⛈️';
  } else if ([45, 48].includes(code)) {
    conditionText = `Foggy (${temp}°C)`;
    icon = '🌫️';
  } else if (code === 3) {
    conditionText = `Overcast (${temp}°C)`;
    icon = '☁️';
  } else if ([1, 2].includes(code)) {
    conditionText = `Mainly Clear / Sunny (${temp}°C)`;
    icon = '🌤️';
  } else {
    conditionText = `Clear Sky (${temp}°C)`;
    icon = '☀️';
  }

  const isExtremelyHot = !isRain && temp >= 32;
  if (isExtremelyHot) {
    conditionText = `Extreme Heat / Sunny (${temp}°C)`;
    icon = '☀️🔥';
  }

  let recommendation = '';
  let shouldWater = true;

  if (isRain) {
    shouldWater = false;
    recommendation = `Rain detected (${precip.toFixed(1)} mm). Skip outdoor watering today to conserve water and prevent root rot.`;
  } else if (isExtremelyHot) {
    shouldWater = true;
    recommendation = `Extreme heat detected (${temp}°C, feels like ${apparentTemp}°C)! Water outdoor plants thoroughly early in the morning or late evening. Avoid harsh midday watering.`;
  } else if (temp >= 28) {
    shouldWater = true;
    recommendation = `Warm conditions (${temp}°C). Check soil moisture and water outdoor plants as needed.`;
  } else {
    shouldWater = true;
    recommendation = `Pleasant conditions (${temp}°C). Standard watering routine recommended.`;
  }

  return { conditionText, icon, isRain, isExtremelyHot, shouldWater, recommendation };
};

// Reverse geocode lat/lon to friendly city name
const fetchCityName = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: { 'Accept-Language': 'en' }
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
      const city = addr.city || addr.town || addr.state_district || addr.county || 'Mumbai';
      const state = addr.state || 'Maharashtra';
      if (suburb) return `${suburb}, ${city}, ${state}`;
      return `${city}, ${state}`;
    }
  } catch (e) {
    console.warn('Reverse geocoding failed:', e);
  }
  return 'Mumbai, Maharashtra';
};

// Main function to fetch real-time weather from Open-Meteo
export const fetchLiveWeather = async (targetLat?: number, targetLon?: number, forceRefresh: boolean = false): Promise<LiveWeatherInfo> => {
  try {
    // If not forcing refresh, check cached weather if recent (< 10 minutes)
    if (!forceRefresh) {
      const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && Date.now() - (cached.timestampMs || 0) < 10 * 60 * 1000) {
          return cached;
        }
      }
    }

    let lat = targetLat;
    let lon = targetLon;
    let locationName = '';

    // If no coordinates provided, try browser geolocation
    if (lat === undefined || lon === undefined) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
          } else {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
          }
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch (err) {
        console.warn('Browser geolocation failed or was denied, falling back to IP/default location.', err);
      }
    }

    // If still undefined, fallback to Mumbai default
    if (lat === undefined || lon === undefined) {
      lat = 19.076;
      lon = 72.877;
      locationName = 'Mumbai, Maharashtra';
    } else {
      locationName = await fetchCityName(lat, lon);
    }

    // Call Open-Meteo free API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,weather_code,precipitation,apparent_temperature,is_day&timezone=auto`;
    const response = await fetch(weatherUrl);

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;

    const temp = Math.round((current.temperature_2m ?? 35) * 10) / 10;
    const apparentTemp = Math.round((current.apparent_temperature ?? temp) * 10) / 10;
    const humidity = current.relative_humidity_2m ?? 35;
    const precip = current.precipitation ?? 0.0;
    const weatherCode = current.weather_code ?? 1;

    const interpreted = interpretWmoCode(weatherCode, temp, apparentTemp, precip);

    const result: LiveWeatherInfo = {
      condition: interpreted.conditionText,
      temperature: temp,
      apparentTemperature: apparentTemp,
      humidity,
      precipitation: precip,
      weatherCode,
      locationName: locationName || 'Present Location',
      latitude: lat,
      longitude: lon,
      isRain: interpreted.isRain,
      isExtremelyHot: interpreted.isExtremelyHot,
      shouldWater: interpreted.shouldWater,
      recommendation: interpreted.recommendation,
      icon: interpreted.icon,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Save with timestamp
    sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ...result, timestampMs: Date.now() }));
    return result;
  } catch (e) {
    console.error('Error fetching live weather:', e);
    return DEFAULT_WEATHER;
  }
};

export const getClimateByPin = (pin: string): ClimateData => {
  const normalizedPin = pin?.trim() || '400001';

  if (normalizedPin.startsWith('4') || normalizedPin.startsWith('5')) {
    return {
      temperature: 'Warm and humid',
      humidity: 'High',
      recommendations: ['Tulsi', 'Neem', 'Basil']
    };
  } else if (normalizedPin.startsWith('1') || normalizedPin.startsWith('2')) {
    return {
      temperature: 'Hot',
      humidity: 'Low to medium',
      recommendations: ['Cactus', 'Succulents', 'Aloe Vera']
    };
  } else {
    return {
      temperature: 'Mild to cool',
      humidity: 'Medium to high',
      recommendations: ['Fern', 'Moss', 'Banyan']
    };
  }
};