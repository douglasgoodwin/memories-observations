'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useState } from 'react';
import type { MapContainerProps } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import type { AudioRecording, BroadLocation } from '@/types';
import { BROAD_LOCATIONS } from '@/types';

// Type the dynamic imports to satisfy TS
const MapContainer = dynamic<MapContainerProps>(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(m => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(m => m.Popup),
  { ssr: false }
);

export default function MapPage() {
  const [recs, setRecs] = useState<AudioRecording[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/recordings');
      const data = await res.json();
      setRecs(Array.isArray(data) ? data : []);
    })();
  }, []);

  // Royce Hall area
  const center = useMemo<LatLngTuple>(() => [34.0729, -118.4423], []);

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-2">Sound Map</h1>
      <p className="text-gray-600 mb-4">
        Recordings with coordinates are shown as markers. Predefined places are shown as reference pins.
      </p>

      <div className="w-full h-[70vh] rounded overflow-hidden border">
        <MapContainer center={center} zoom={16} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Reference pins */}
          {(BROAD_LOCATIONS as BroadLocation[]).map((loc) => (
            <Marker key={loc.id} position={[loc.lat, loc.lng] as LatLngTuple}>
              <Popup>
                <strong>{loc.name}</strong>
                <div className="text-xs text-gray-600">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* User recordings with coordinates */}
          {recs
            .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
            .map((r) => (
              <Marker key={r.id} position={[r.lat as number, r.lng as number] as LatLngTuple}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{r.title}</div>
                    <div className="text-gray-600">{r.locationName}</div>
                    <div className="text-gray-600">
                      {r.date ? new Date(r.date).toLocaleString() : ''}
                    </div>
                    <audio controls src={r.audioUrl} style={{ width: '100%', marginTop: 8 }} />
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </main>
  );
}