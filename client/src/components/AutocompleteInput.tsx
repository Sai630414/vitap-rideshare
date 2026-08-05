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
  icon = <MapPin className="w-5 h-5 text-muted-foreground" />,
  required = false,
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={index} className="text-primary font-black">
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
    <div className="w-full flex flex-col gap-2 relative">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
        {label}
      </label>
      
      <div className="relative flex items-center group">
        {icon && (
          <div className="absolute left-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none z-10">
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
            'w-full px-5 py-4 bg-white border-2 border-border rounded-2xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm shadow-soft',
            icon ? 'pl-12' : ''
          )}
          required={required}
          autoComplete="off"
        />
      </div>

      {showDropdown && (value.trim() !== '' || campusShortcuts.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white border border-border rounded-[1.5rem] shadow-2xl z-[60] max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {value.trim() === '' ? (
            <div className="p-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 px-2">
                Quick Shortcuts
              </p>
              <div className="flex flex-wrap gap-2">
                {campusShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.name}
                    type="button"
                    onClick={() => handleSelectSuggestion({
                      name: `VIT-AP ${shortcut.name}`,
                      coordinates: shortcut.coordinates
                    })}
                    className="px-4 py-2.5 bg-muted/5 hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-all border border-border active:scale-95 cursor-pointer"
                  >
                    {shortcut.name}
                  </button>
                ))}
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-6 text-center text-xs font-bold text-muted-foreground">
              Location not found. Using custom address.
            </div>
          ) : (
            <div className="py-2">
              {suggestions.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className={twMerge(
                    'w-full text-left px-5 py-4 text-xs font-bold flex items-center gap-4 transition-all',
                    index === activeIndex
                      ? 'bg-primary text-white'
                      : 'hover:bg-muted/5 text-foreground'
                  )}
                >
                  <MapPin className={twMerge("w-5 h-5", index === activeIndex ? "text-white" : "text-muted-foreground")} />
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
