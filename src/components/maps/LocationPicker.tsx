import { useEffect, useMemo, useState } from 'react';
import { Loader2, LocateFixed, Search, X } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchMapPlaces, type MapPoint, type PlaceSuggestion } from '@/lib/maps';
import { useThemeStore } from '@/stores/theme.store';

interface LocationPickerProps {
  value: MapPoint | null;
  onChange: (location: MapPoint, formattedAddress?: string) => void;
}

const DEFAULT_PIN: MapPoint = { lat: 14.5995, lng: 120.9842 };

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({ onPick }: { onPick: (location: MapPoint) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function RecenterMap({ location }: { location: MapPoint }) {
  const map = useMap();
  useEffect(() => {
    map.setView([location.lat, location.lng], Math.max(map.getZoom(), 14), { animate: true });
  }, [location.lat, location.lng, map]);
  return null;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const isDark = resolvedTheme === 'dark';
  const markerPosition = useMemo(() => value ?? DEFAULT_PIN, [value]);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapErrorCount, setMapErrorCount] = useState(0);
  const [mapReloadKey, setMapReloadKey] = useState(0);

  const mapUnavailable = mapErrorCount >= 3;

  useEffect(() => {
    const query = searchInput.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const places = await searchMapPlaces(query);
        if (!cancelled) {
          setSuggestions(places);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage('Unable to search locations right now.');
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('This browser does not support geolocation.');
      return;
    }

    setErrorMessage(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setIsLocating(false);
        setErrorMessage('Unable to access your current location.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(event) => {
                setErrorMessage(null);
                setSearchInput(event.target.value);
              }}
              placeholder="Search area, street, or landmark"
              className="h-11 bg-gray-50/50 border-gray-200 pl-9 pr-9"
              aria-label="Search location"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSuggestions([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="h-11 border-gray-200"
          >
            {isLocating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="mr-2 h-4 w-4" />
            )}
            Use my location
          </Button>
        </div>

        {(isSearching || suggestions.length > 0) && (
          <div className="rounded-xl border border-[color:var(--color-border)]/65 bg-[var(--metal-panel-background)] p-2 shadow-sm shadow-black/10">
            {isSearching ? (
              <p className="px-2 py-2 text-sm text-[var(--text-metal-muted-color)]">Searching locations...</p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {suggestions.map((place) => (
                  <button
                    key={place.placeId}
                    type="button"
                    onClick={() => {
                      onChange(place.location, place.formattedAddress);
                      setSearchInput(place.description);
                      setSuggestions([]);
                      setErrorMessage(null);
                    }}
                          className="block w-full rounded-lg px-2 py-2 text-left text-sm text-[var(--color-card-foreground)] transition-colors hover:bg-[color:var(--color-card)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-card-foreground)]/35 focus-visible:ring-offset-2"
                          role="option"
                  >
                    {place.description}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

            {mapUnavailable ? (
              <div className="space-y-3 rounded-xl border border-amber-300/45 bg-amber-50/85 p-4 dark:border-amber-400/25 dark:bg-amber-500/10">
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Map preview is temporarily unavailable</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-100/80">
                    You can still search for a place, use your current location, and save the exact address below. If the map tiles recover, you can retry the preview.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-amber-300/70 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-300/30 dark:bg-amber-500/12 dark:text-amber-100 dark:hover:bg-amber-500/18"
                  onClick={() => {
                    setMapErrorCount(0);
                    setMapReloadKey((current) => current + 1);
                    setErrorMessage(null);
                  }}
                >
                  Retry Map Preview
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)]/65">
                <MapContainer
                  key={mapReloadKey}
                  center={[markerPosition.lat, markerPosition.lng]}
                  zoom={13}
                  scrollWheelZoom
                  attributionControl={false}
                  className="h-[320px] w-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    eventHandlers={{
                      tileerror: () => {
                        setMapErrorCount((count) => count + 1);
                      },
                    }}
                  />
                  <MapClickHandler onPick={(location) => onChange(location)} />
                  <RecenterMap location={markerPosition} />
                  <Marker
                    position={[markerPosition.lat, markerPosition.lng]}
                    icon={markerIcon}
                    draggable
                    eventHandlers={{
                      dragend: (event) => {
                        const nextPoint = (event.target as L.Marker).getLatLng();
                        onChange({ lat: nextPoint.lat, lng: nextPoint.lng });
                      },
                    }}
                  />
                </MapContainer>
              </div>
            )}

      <p className="text-xs text-[var(--text-metal-muted-color)]">
              {mapUnavailable
                ? 'Use search or your current location while the map preview is unavailable.'
                : 'Tap the map or drag the pin to your exact site location.'}
      </p>

      {value && (
        <p className="text-xs font-mono text-[var(--text-metal-muted-color)]">
          Lat: {value.lat.toFixed(6)} | Lng: {value.lng.toFixed(6)}
        </p>
      )}

      {value && (
        <div
          className={[
            'flex items-center gap-2 rounded-xl px-3 py-2 text-xs',
            isDark
              ? 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
              : 'border border-emerald-300/70 bg-emerald-50 text-emerald-700',
          ].join(' ')}
        >
          <LocateFixed className="h-3.5 w-3.5" />
          <span className="font-semibold">Pinned Location</span>
          <span className={isDark ? 'text-emerald-200/90' : 'text-emerald-600'}>
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        </div>
      )}

      {errorMessage && <p className="text-sm text-red-500 dark:text-red-300" aria-live="polite">{errorMessage}</p>}
    </div>
  );
}
