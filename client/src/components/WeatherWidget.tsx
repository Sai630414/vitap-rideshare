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
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl animate-pulse flex flex-col gap-2">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-6 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-200 rounded w-full" />
      </div>
    );
  }

  if (!weather.available) {
    return null;
  }

  const isRainy = (weather.rainProbability ?? 0) > 40;
  const isStormy = weather.weatherCode !== undefined && [95, 96, 99].includes(weather.weatherCode);

  const containerStyle = isStormy
    ? 'bg-rose-50 border-rose-200/80 text-rose-950'
    : isRainy
    ? 'bg-sky-50 border-sky-200/80 text-sky-950'
    : 'bg-slate-50 border-slate-200/80 text-slate-900';

  const badgeStyle = isStormy
    ? 'bg-rose-100/90 border-rose-300 text-rose-900'
    : isRainy
    ? 'bg-sky-100/90 border-sky-300 text-sky-900'
    : 'bg-emerald-100/90 border-emerald-300 text-emerald-950';

  const formattedDate = departureDate
    ? new Date(departureDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className={`p-4 rounded-2xl border shadow-xs ${containerStyle} flex flex-col gap-3 transition-all`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl filter drop-shadow-xs">{weather.weatherIcon || '⛅'}</span>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
              {weather.weatherDescription}
            </h4>
            {formattedDate && (
              <p className="text-[10px] font-extrabold text-slate-500 mt-0.5 uppercase tracking-wider">
                {formattedDate} forecast
              </p>
            )}
          </div>
        </div>
        {isStormy && (
          <div className="p-1.5 bg-rose-100 text-rose-600 rounded-xl animate-bounce">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 py-2 px-3 bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5">
          <Thermometer className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-black text-slate-900">{weather.temperature}°C</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-1.5">
          <Droplets className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-black text-slate-900">{weather.rainProbability}%</span>
          <span className="text-[10px] font-bold text-slate-500">rain</span>
        </div>
        {weather.windspeed !== undefined && (
          <>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-black text-slate-900">{weather.windspeed}</span>
              <span className="text-[10px] font-bold text-slate-500">km/h</span>
            </div>
          </>
        )}
      </div>

      {/* Travel Advice */}
      {weather.travelAdvice && (
        <div className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center gap-2 ${badgeStyle}`}>
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="leading-snug">{weather.travelAdvice}</span>
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
