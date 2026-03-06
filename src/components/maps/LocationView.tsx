import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

  return (
    <div className={`w-full ${heightClass} rounded-xl overflow-hidden border border-[#e8e8ed]`}>
      <MapContainer
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
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[position.lat, position.lng]} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}
