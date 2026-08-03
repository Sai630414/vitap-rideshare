import React from 'react';
import { AlertTriangle, Wind, Droplets, Thermometer } from 'lucide-react';

interface WeatherData {
  available: boolean;
  temperature?: number;
  rainProbability?: number;
  weatherCode?: number;
  weatherDescription?: string;
  weatherIcon?: string;
  travelAdvice?: string;
  windspeed?: number;
}

interface WeatherWidgetProps {
  weather: WeatherData;
  departureDate?: string;
  loading?: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather, departureDate, loading }) => {
  if (loading) {
    return (
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3" />
        <div className="h-8 bg-zinc-800 rounded w-1/2 mb-2" />
        <div className="h-3 bg-zinc-800 rounded w-full" />
      </div>
    );
  }

  if (!weather.available) {
    return null; // Silently hide if weather data unavailable
  }

  const isRainy = (weather.rainProbability ?? 0) > 40;
  const isStormy = weather.weatherCode !== undefined && [95, 96, 99].includes(weather.weatherCode);

  const borderColor = isStormy
    ? 'border-red-700/50'
    : isRainy
    ? 'border-blue-700/50'
    : 'border-zinc-800';

  const bgColor = isStormy
    ? 'bg-red-950/20'
    : isRainy
    ? 'bg-blue-950/20'
    : 'bg-zinc-900/60';

  const formattedDate = departureDate
    ? new Date(departureDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className={`p-4 rounded-2xl border ${bgColor} ${borderColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{weather.weatherIcon}</span>
          <div>
            <p className="text-xs font-bold text-zinc-300">{weather.weatherDescription}</p>
            {formattedDate && (
              <p className="text-[10px] text-zinc-500">{formattedDate} forecast</p>
            )}
          </div>
        </div>
        {isStormy && (
          <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-sm font-bold text-zinc-200">{weather.temperature}°C</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-sm font-bold text-zinc-200">{weather.rainProbability}%</span>
          <span className="text-[10px] text-zinc-500">rain</span>
        </div>
        {weather.windspeed !== undefined && (
          <div className="flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-sm font-bold text-zinc-200">{weather.windspeed}</span>
            <span className="text-[10px] text-zinc-500">km/h</span>
          </div>
        )}
      </div>

      {/* Travel Advice */}
      {weather.travelAdvice && (
        <p className={`text-[11px] leading-relaxed font-medium ${
          isStormy ? 'text-red-300' : isRainy ? 'text-blue-300' : 'text-emerald-300'
        }`}>
          {weather.travelAdvice}
        </p>
      )}
    </div>
  );
};

export default WeatherWidget;
