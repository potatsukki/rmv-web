import { useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationViewProps {
  lat: number;
  lng: number;
  /** Optional height class, defaults to h-52 */
  heightClass?: string;
}

export function LocationView({ lat, lng, heightClass = 'h-52' }: LocationViewProps) {
  const position = useMemo(() => ({ lat, lng }), [lat, lng]);
  const [mapErrorCount, setMapErrorCount] = useState(0);
  const [mapReloadKey, setMapReloadKey] = useState(0);

  const mapUnavailable = mapErrorCount >= 3;

  return (
    <div className={`w-full ${heightClass} rounded-xl overflow-hidden border border-[#e8e8ed]`}>
      {mapUnavailable ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-amber-50/70 px-4 text-center">
          <div>
            <p className="text-sm font-semibold text-amber-900">Map preview unavailable</p>
            <p className="mt-1 text-xs text-amber-800">
              Coordinates are still available and the external map link can be used instead.
            </p>
          </div>
          <p className="text-xs font-mono text-amber-900">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
            onClick={() => {
              setMapErrorCount(0);
              setMapReloadKey((current) => current + 1);
            }}
          >
            Retry Map
          </Button>
        </div>
      ) : (
        <MapContainer
          key={mapReloadKey}
          center={[position.lat, position.lng]}
          zoom={15}
          scrollWheelZoom={false}
          dragging={false}
          zoomControl={false}
          doubleClickZoom={false}
          keyboard={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileerror: () => {
                setMapErrorCount((count) => count + 1);
              },
            }}
          />
          <Marker position={[position.lat, position.lng]} icon={markerIcon} />
        </MapContainer>
      )}
    </div>
  );
}
