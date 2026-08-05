import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Navigation, Clock, Trash2, Building, Landmark, Compass } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import {
  searchPlaces,
  getPlaceDetails,
  getCurrentLocationPlace,
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  type PlaceSuggestion,
} from '../services/placeSearchService';
import { campusShortcuts } from '../utils/locationUtils';

interface AutocompleteInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (coords: [number, number], name: string, details?: { formattedAddress: string; placeId: string }) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  onSelect,
  placeholder = 'Search places, landmarks, stations...',
  icon = <MapPin className="w-5 h-5 text-slate-400" />,
  required = false,
}) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locatingCurrent, setLocatingCurrent] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on mount and when dropdown opens
  const refreshRecents = useCallback(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    refreshRecents();
  }, [refreshRecents]);

  // Debounced search trigger
  useEffect(() => {
    if (!value.trim() || value.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(value);
        setSuggestions(results);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoading(false);
        setActiveIndex(-1);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPlace = async (place: PlaceSuggestion) => {
    try {
      setShowDropdown(false);
      const detailedPlace = await getPlaceDetails(place);
      saveRecentSearch(detailedPlace);
      refreshRecents();

      const selectedName = detailedPlace.mainText || detailedPlace.formattedAddress;
      onChange(selectedName);
      onSelect(detailedPlace.coordinates, selectedName, {
        formattedAddress: detailedPlace.formattedAddress,
        placeId: detailedPlace.placeId,
      });
    } catch (err) {
      onChange(place.mainText);
      onSelect(place.coordinates, place.mainText);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLocatingCurrent(true);
    try {
      const place = await getCurrentLocationPlace();
      handleSelectPlace(place);
    } catch (err) {
      console.error('Failed to get current location:', err);
    } finally {
      setLocatingCurrent(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelectPlace(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={index} className="text-emerald-600 font-black">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-1.5 relative">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
        {label}
      </label>

      <div className="relative flex items-center group">
        <div className="absolute left-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none z-10">
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : icon}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            refreshRecents();
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={twMerge(
            'w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-xs font-extrabold shadow-sm'
          )}
          required={required}
          autoComplete="off"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-full"
          >
            ✕
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown Panel */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border border-slate-200 rounded-3xl shadow-2xl z-[80] max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-slate-100"
        >
          {/* Option: Current Location Button */}
          <div className="p-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locatingCurrent}
              className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-700 text-xs font-black flex items-center gap-3 transition-colors"
            >
              {locatingCurrent ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              ) : (
                <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className="block truncate">
                  {locatingCurrent ? 'Locating device position...' : 'Use Current Location (GPS)'}
                </span>
                <span className="text-[9px] text-emerald-600/80 font-bold block">
                  Autofill exact current coordinates & address
                </span>
              </div>
            </button>
          </div>

          {/* Search Query Mode: Suggestions List */}
          {value.trim().length >= 2 ? (
            <div className="py-1">
              {loading ? (
                <div className="p-5 text-center flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Searching places across India...</span>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-5 text-center text-xs font-bold text-slate-400">
                  No matching places found. Using custom address.
                </div>
              ) : (
                suggestions.map((item, index) => (
                  <button
                    key={item.placeId || index}
                    type="button"
                    onClick={() => handleSelectPlace(item)}
                    className={twMerge(
                      'w-full text-left px-4 py-3 text-xs flex items-start gap-3 transition-colors',
                      index === activeIndex ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50 text-slate-800'
                    )}
                  >
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">
                        {highlightMatch(item.mainText, value)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
                        {item.secondaryText || item.formattedAddress}
                      </div>
                    </div>
                    {item.category && (
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-slate-100 text-slate-500 shrink-0">
                        {item.category}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Empty Query Mode: Recent Searches & Campus Shortcuts */
            <div className="p-3 space-y-3">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clearRecentSearches();
                        setRecentSearches([]);
                      }}
                      className="text-[9px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-0.5"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {recentSearches.slice(0, 4).map((rec) => (
                      <button
                        key={rec.placeId}
                        type="button"
                        onClick={() => handleSelectPlace(rec)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-xs font-bold text-slate-800 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate flex-1">{rec.mainText || rec.formattedAddress}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Campus Shortcuts */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1 mb-2">
                  Campus Shortcuts
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {campusShortcuts.map((shortcut) => (
                    <button
                      key={shortcut.name}
                      type="button"
                      onClick={() =>
                        handleSelectPlace({
                          placeId: `campus_${shortcut.name}`,
                          mainText: `VIT-AP ${shortcut.name}`,
                          secondaryText: 'VIT-AP University Campus',
                          formattedAddress: `VIT-AP ${shortcut.name}, Amaravati, AP`,
                          coordinates: shortcut.coordinates,
                        })
                      }
                      className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-600 hover:text-white rounded-xl text-[11px] font-extrabold transition-all border border-slate-100 active:scale-95 cursor-pointer text-slate-700"
                    >
                      {shortcut.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
