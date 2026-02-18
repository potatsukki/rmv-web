import { useEffect, useMemo, useState } from 'react';
import { Loader2, LocateFixed, Search } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchMapPlaces, type MapPoint, type PlaceSuggestion } from '@/lib/maps';

interface LocationPickerProps {
  value: MapPoint | null;
  onChange: (location: MapPoint, formattedAddress?: string) => void;
}

const DEFAULT_PIN: MapPoint = { lat: 14.5995, lng: 120.9842 };

let leafletIconConfigured = false;

function ensureLeafletIcon() {
  if (leafletIconConfigured) return;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  leafletIconConfigured = true;
}

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
  ensureLeafletIcon();

  const markerPosition = useMemo(() => value ?? DEFAULT_PIN, [value]);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
              className="h-11 bg-gray-50/50 border-gray-200 pl-9"
              aria-label="Search location"
            />
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
          <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
            {isSearching ? (
              <p className="px-2 py-2 text-sm text-gray-500">Searching locations...</p>
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
                    }}
                    className="block w-full rounded-lg px-2 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {place.description}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <MapContainer
          center={[markerPosition.lat, markerPosition.lng]}
          zoom={13}
          scrollWheelZoom
          className="h-[320px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={(location) => onChange(location)} />
          <RecenterMap location={markerPosition} />
          <Marker
            position={[markerPosition.lat, markerPosition.lng]}
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

      <p className="text-xs text-gray-500">
        Tap the map or drag the pin to your exact site location.
      </p>

      {value && (
        <p className="text-xs text-gray-600 font-mono">
          Lat: {value.lat.toFixed(6)} | Lng: {value.lng.toFixed(6)}
        </p>
      )}

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
