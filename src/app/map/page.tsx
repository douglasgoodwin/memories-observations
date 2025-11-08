'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import type { MapContainerProps } from 'react-leaflet';
import type { Map as LeafletMap, LatLngTuple } from 'leaflet';

import { BROAD_LOCATIONS } from '@/types';
import type { AudioRecording, BroadLocation } from '@/types';
import { recordingAverage } from '@/lib/scoring';

// --- Single set of dynamic imports (no duplicates) ---
// --- Single set of dynamic imports (no duplicates) ---
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

// --- Helpers ---
function CaptureMapRef({ onReady }: { onReady: (m: LeafletMap) => void }) {
  const map = useMap();
  React.useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

function boundsFromPoints(points: Array<LatLngTuple>) {
  if (!points.length) return null;
  let minLat = points[0][0], maxLat = points[0][0];
  let minLng = points[0][1], maxLng = points[0][1];
  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return [[minLat, minLng], [maxLat, maxLng]] as [LatLngTuple, LatLngTuple];
}

function FitToAll({ locs, recs }: { locs: BroadLocation[]; recs: AudioRecording[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: LatLngTuple[] = [];
    for (const l of locs) pts.push([l.lat, l.lng]);
    for (const r of recs) if (typeof r.lat === 'number' && typeof r.lng === 'number') pts.push([r.lat, r.lng]);
    const b = boundsFromPoints(pts);
    if (b) map.fitBounds(b, { padding: [24, 24] });
  }, [locs, recs, map]);
  return null;
}

export default function MapPage() {
  // --- State & refs MUST precede hooks that use them ---
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [showLocations, setShowLocations] = useState(true);
  const [showRecordings, setShowRecordings] = useState(true);
  const [activeRecId, setActiveRecId] = useState<string | null>(null);

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const mapRef = useRef<LeafletMap | null>(null);

  // --- Derived values ---
  const center = useMemo<LatLngTuple>(() => [34.0729, -118.4423], []);
  const locationsWithCoords = useMemo(
    () => BROAD_LOCATIONS.filter(l => Number.isFinite(l.lat) && Number.isFinite(l.lng)),
    []
  );
  const recordingsWithCoords = useMemo(
    () => recordings.filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng))),
    [recordings]
  );

  // --- Load data ---
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/recordings');
      if (res.ok) setRecordings(await res.json());
    })();
  }, []);

  // --- Audio control: only one plays at a time ---
  function playExclusive(id: string) {
    Object.entries(audioRefs.current).forEach(([key, el]) => {
      if (key !== id && el) {
        el.pause();
        el.currentTime = 0;
      }
    });
    const el = audioRefs.current[id];
    if (el) el.play().catch(() => { /* user gesture may be required */ });
    setActiveRecId(id);
  }

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Map</h1>
      <p className="text-gray-600">
        Toggle layers to view predefined places and recordings that include coordinates.
      </p>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showLocations}
            onChange={(e) => setShowLocations(e.target.checked)}
          />
          <span>Places</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showRecordings}
            onChange={(e) => setShowRecordings(e.target.checked)}
          />
          <span>Recordings</span>
        </label>
      </div>

      {/* Optional: Quick list of recordings with coordinates */}
      {recordingsWithCoords.length > 0 && (
        <div className="border rounded p-3 max-h-60 overflow-auto text-sm">
          <div className="font-semibold mb-2">Recordings with coordinates</div>
          <ul className="space-y-1">
            {recordingsWithCoords.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <button
                  type="button"
                  className={`underline hover:text-blue-900 ${r.id === activeRecId ? 'text-blue-800' : 'text-blue-700'}`}
                  onClick={() => {
                    if (mapRef.current && typeof r.lat === 'number' && typeof r.lng === 'number') {
                      mapRef.current.flyTo([r.lat, r.lng], 18, { duration: 0.8 });
                    }
                    setTimeout(() => playExclusive(r.id), 300);
                  }}
                  title={`${r.locationName} (${Number(r.lat).toFixed(5)}, ${Number(r.lng).toFixed(5)})`}
                >
                  {r.title}
                </button>
                <span className="text-gray-500">
                  {recordingAverage(r).toFixed(1)}/10
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="w-full h-[70vh] rounded border overflow-hidden">
		<MapContainer
		  center={center}
		  zoom={16}
		  style={{ width: '100%', height: '100%' }}
		>
		<CaptureMapRef onReady={(m) => { mapRef.current = m; }} />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitToAll
            locs={showLocations ? locationsWithCoords : []}
            recs={showRecordings ? recordingsWithCoords : []}
          />

          {showLocations &&
            locationsWithCoords.map((loc) => (
              <Marker key={loc.id} position={[loc.lat, loc.lng] as LatLngTuple}>
                <Popup>
                  <div>
                    <div className="font-semibold">{loc.name}</div>
                    <div className="text-sm text-gray-600">{loc.description}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {showRecordings &&
            recordingsWithCoords.map((r) => (
              <Marker
                key={r.id}
                position={[Number(r.lat), Number(r.lng)] as LatLngTuple}
                eventHandlers={{
                  click: () => playExclusive(r.id),
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className={`font-semibold ${r.id === activeRecId ? 'text-blue-700' : ''}`}>
                      {r.title}
                    </div>
                    <div className="text-sm text-gray-600">
                      {r.locationName} · {r.recordingType}
                    </div>
                    <div className="text-sm">
                      Avg: {recordingAverage(r).toFixed(1)}/10
                    </div>
                    {r.description && <div className="text-sm">{r.description}</div>}
                    <audio
                      ref={(el) => { audioRefs.current[r.id] = el; }}
                      controls
                      src={r.audioUrl}
                      className="w-full mt-2"
                      onPlay={() => playExclusive(r.id)}
                    />
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </main>
  );
}