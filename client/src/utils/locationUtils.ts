export interface LocationSuggestion {
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export const popularLocations: LocationSuggestion[] = [
  { name: 'VIT-AP Main Gate', coordinates: [80.5015, 16.4960] },
  { name: 'VIT-AP Academic Block 1', coordinates: [80.5002, 16.4972] },
  { name: 'VIT-AP Academic Block 2', coordinates: [80.4990, 16.4975] },
  { name: 'VIT-AP Library', coordinates: [80.4996, 16.4970] },
  { name: 'VIT-AP Food Court', coordinates: [80.4982, 16.4965] },
  { name: 'VIT-AP Boys Hostel', coordinates: [80.4950, 16.4980] },
  { name: 'VIT-AP Girls Hostel', coordinates: [80.4965, 16.4955] },
  { name: 'VIT-AP Parking', coordinates: [80.5020, 16.4950] },
  { name: 'VIT-AP Sports Complex', coordinates: [80.4940, 16.4990] },
  { name: 'VIT-AP Medical Centre', coordinates: [80.4975, 16.4960] },
  { name: 'Vijayawada Railway Station', coordinates: [80.6204, 16.5186] },
  { name: 'Vijayawada Railway Junction', coordinates: [80.6200, 16.5180] },
  { name: 'Railway Station Road', coordinates: [80.6210, 16.5190] },
  { name: 'Railway Colony', coordinates: [80.6150, 16.5150] },
  { name: 'Vijayawada Bus Stand (RTC)', coordinates: [80.6234, 16.5132] },
  { name: 'RTC Bus Stand', coordinates: [80.6230, 16.5130] },
  { name: 'Private Bus Stop', coordinates: [80.6250, 16.5140] },
  { name: 'College Bus Parking', coordinates: [80.5025, 16.4945] },
  { name: 'Gannavaram Airport (Vijayawada)', coordinates: [80.7969, 16.5303] },
  { name: 'Guntur Railway Station', coordinates: [80.4365, 16.3008] },
];

export const campusShortcuts: LocationSuggestion[] = [
  { name: 'Main Gate', coordinates: [80.5015, 16.4960] },
  { name: 'Academic Block 1', coordinates: [80.5002, 16.4972] },
  { name: 'Academic Block 2', coordinates: [80.4990, 16.4975] },
  { name: 'Library', coordinates: [80.4996, 16.4970] },
  { name: 'Food Court', coordinates: [80.4982, 16.4965] },
  { name: 'Boys Hostel', coordinates: [80.4950, 16.4980] },
  { name: 'Girls Hostel', coordinates: [80.4965, 16.4955] },
  { name: 'Parking', coordinates: [80.5020, 16.4950] },
  { name: 'Sports Complex', coordinates: [80.4940, 16.4990] },
  { name: 'Medical Centre', coordinates: [80.4975, 16.4960] },
];

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  // Check if it matches popular locations within ~100 meters
  const threshold = 0.0012;
  const match = popularLocations.find((loc) => {
    const latDiff = Math.abs(loc.coordinates[1] - lat);
    const lngDiff = Math.abs(loc.coordinates[0] - lng);
    return latDiff < threshold && lngDiff < threshold;
  });

  if (match) {
    return match.name;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Waygo-VIT-AP-Rideshare-App',
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        // Grab top 3 parts of the description for a readable layout
        return parts.slice(0, 3).join(',').trim();
      }
    }
  } catch (err) {
    console.error('Nominatim reverse geocode failed:', err);
  }

  // Fallback
  return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
};
