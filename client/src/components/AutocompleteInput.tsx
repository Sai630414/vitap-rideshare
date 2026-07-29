import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { popularLocations, campusShortcuts, type LocationSuggestion } from '../utils/locationUtils';

interface AutocompleteInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (coords: [number, number], name: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  icon = <MapPin className="w-4 h-4 text-zinc-500" />,
  required = false,
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search / filtering logic
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = popularLocations.filter((loc) =>
      loc.name.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(filtered);
    setActiveIndex(-1);
  }, [value]);

  // Click outside listener
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
        handleSelectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    onChange(suggestion.name);
    onSelect(suggestion.coordinates, suggestion.name);
    setShowDropdown(false);
  };

  // Highlights the query text in the suggestion name
  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={index} className="text-violet-400 font-extrabold">
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
      <label className="text-sm font-semibold text-zinc-300 light:text-zinc-700">
        {label}
      </label>
      
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-zinc-500 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={twMerge(
            'w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900',
            icon ? 'pl-11' : ''
          )}
          required={required}
          autoComplete="off"
        />
      </div>

      {/* Suggestion Dropdown */}
      {showDropdown && (value.trim() !== '' || campusShortcuts.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-[calc(100%+4px)] bg-zinc-950 border border-zinc-850 rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto light:bg-white light:border-zinc-250 scrollbar-thin"
        >
          {value.trim() === '' ? (
            <div className="p-3">
              <p className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-2 px-1">
                Campus Shortcuts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {campusShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.name}
                    type="button"
                    onClick={() => handleSelectSuggestion({
                      name: `VIT-AP ${shortcut.name}`,
                      coordinates: shortcut.coordinates
                    })}
                    className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded-lg text-xs font-bold transition-all border border-zinc-800 hover:border-zinc-700 active:scale-95 cursor-pointer light:bg-zinc-100 light:border-zinc-200 light:text-zinc-700 light:hover:bg-zinc-200"
                  >
                    {shortcut.name}
                  </button>
                ))}
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-550">
              No matching locations found. You can keep this custom name.
            </div>
          ) : (
            <div className="py-1">
              {suggestions.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className={twMerge(
                    'w-full text-left px-4 py-3 text-xs font-medium flex items-center gap-3 transition-colors border-b border-zinc-900/40 last:border-b-0 cursor-pointer',
                    index === activeIndex
                      ? 'bg-violet-600/15 text-violet-300 light:bg-violet-50'
                      : 'hover:bg-zinc-900/60 text-zinc-350 hover:text-zinc-200 light:hover:bg-zinc-50 light:text-zinc-700'
                  )}
                >
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="truncate">{highlightMatch(item.name, value)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
