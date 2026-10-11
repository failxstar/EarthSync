import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default marker icon paths in modern bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom SVG Icons for colored priority or category pins
export const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

interface MarkerItem {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category?: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  color?: string;
  onClick?: () => void;
}

interface MapProps {
  markers?: MarkerItem[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: [number, number] | null;
}

const LocationPickerHandler: React.FC<{ onSelect: (lat: number, lng: number) => void }> = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const MapView: React.FC<MapProps> = ({
  markers = [],
  center = [37.7749, -122.4194],
  zoom = 12,
  height = '400px',
  className = '',
  onLocationSelect,
  selectedLocation,
}) => {
  // If markers exist and center is not explicitly different, center around first marker
  const mapCenter: [number, number] = selectedLocation 
    ? selectedLocation 
    : markers.length > 0 && markers[0].latitude && markers[0].longitude
      ? [markers[0].latitude, markers[0].longitude]
      : center;

  return (
    <div style={{ height, width: '100%' }} className={`rounded-xl overflow-hidden shadow-inner border border-slate-200 z-0 relative ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onLocationSelect && <LocationPickerHandler onSelect={onLocationSelect} />}

        {selectedLocation && (
          <Marker position={selectedLocation} icon={createCustomIcon('#16a34a')}>
            <Popup>
              <div className="text-xs p-1">
                <strong>Selected Location</strong>
                <br />
                {selectedLocation[0].toFixed(5)}, {selectedLocation[1].toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {markers.map((m) => {
          if (!m.latitude || !m.longitude) return null;
          return (
            <Marker
              key={m.id}
              position={[m.latitude, m.longitude]}
              icon={createCustomIcon(m.color || '#2563eb')}
            >
              <Popup>
                <div className="p-1 min-w-[160px]">
                  {m.badge && (
                    <span 
                      className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 text-white"
                      style={{ backgroundColor: m.badgeColor || '#16a34a' }}
                    >
                      {m.badge}
                    </span>
                  )}
                  <h4 className="font-semibold text-sm text-slate-900 leading-tight">{m.title}</h4>
                  {m.subtitle && <p className="text-xs text-slate-500 mt-1">{m.subtitle}</p>}
                  {m.onClick && (
                    <button
                      onClick={m.onClick}
                      className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 underline block cursor-pointer"
                    >
                      View Details &rarr;
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
