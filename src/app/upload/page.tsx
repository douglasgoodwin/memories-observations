'use client';

import React, { useMemo, useState } from 'react';
import { BROAD_LOCATIONS, LocationId } from '@/types';
import { recordingAverage } from '@/lib/scoring';

type FourScores = {
  importance: number;
  emotion: number;
  intensity: number;
  aesthetic: number;
};

const clamp01x10 = (n: unknown) => {
  const v = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [locationId, setLocationId] = useState<LocationId>('northernlights');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordingType, setRecordingType] = useState<'memory' | 'observation'>('memory');

  const [scores, setScores] = useState<FourScores>({
    importance: 5,
    emotion: 5,
    intensity: 5,
    aesthetic: 5,
  });

  const avg = useMemo(
    () =>
      (clamp01x10(scores.importance) +
        clamp01x10(scores.emotion) +
        clamp01x10(scores.intensity) +
        clamp01x10(scores.aesthetic)) / 4,
    [scores]
  );

  const selectedLocation = useMemo(
    () => BROAD_LOCATIONS.find((l) => l.id === locationId),
    [locationId]
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f || null);
    setPreviewUrl(f ? URL.createObjectURL(f) : '');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      alert('Please choose an audio file.');
      return;
    }
    if (!studentName || !title) {
      alert('Please enter your name and a title.');
      return;
    }
    if (!selectedLocation) {
      alert('Please choose a location.');
      return;
    }

    const form = new FormData();
    form.append('file', file);
    form.append('studentName', studentName);
    form.append('title', title);
    form.append('description', description);
    form.append('locationId', locationId);
    form.append('locationName', selectedLocation.name);
    form.append('recordingType', recordingType);

    // Four scores
    form.append('scores[importance]', String(scores.importance));
    form.append('scores[emotion]', String(scores.emotion));
    form.append('scores[intensity]', String(scores.intensity));
    form.append('scores[aesthetic]', String(scores.aesthetic));
    // Also send an average for convenience (API will accept it, but can recompute)
    form.append('averageScore', String(avg));

    // Optional: if you captured lat/lng elsewhere on this page, append them too
    // form.append('lat', String(lat));
    // form.append('lng', String(lng));

    const res = await fetch('/api/recordings/upload', {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Upload failed: ${err?.error || res.statusText}`);
      return;
    }

    // Reset for another upload
    setFile(null);
    setPreviewUrl('');
    setTitle('');
    setDescription('');
    setScores({ importance: 5, emotion: 5, intensity: 5, aesthetic: 5 });
    alert('Upload complete.');
  }

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Upload an Audio Recording</h1>
      <p className="text-gray-600 mb-6">
        Select a file, choose the location, and assign four scores. The recording will
        appear on the All Recordings and Map pages once saved.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">Audio file (mp3, m4a, wav, webm)</label>
          <input type="file" accept="audio/*" onChange={onPick} />
          {previewUrl && (
            <audio controls src={previewUrl} className="mt-3 w-full" />
          )}
        </div>

        <div>
          <label className="block font-medium mb-1">Your Name</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Location</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value as LocationId)}
          >
            {BROAD_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          {selectedLocation && (
            <p className="text-sm text-gray-600 mt-1">{selectedLocation.description}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Title</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The cafe"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Type</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={recordingType}
              onChange={(e) => setRecordingType(e.target.value as 'memory' | 'observation')}
            >
              <option value="memory">Memory</option>
              <option value="observation">Observation</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Description (optional)</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief notes"
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="font-semibold">Assign Four Scores (0–10)</div>

          {(['importance', 'emotion', 'intensity', 'aesthetic'] as (keyof FourScores)[]).map(
            (k) => (
              <div key={k}>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium capitalize">{k}</label>
                  <span className="text-lg font-bold">{scores[k]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">0</span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={scores[k]}
                    onChange={(e) =>
                      setScores((s) => ({ ...s, [k]: parseInt(e.target.value, 10) }))
                    }
                    className="flex-1 h-2 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">10</span>
                </div>
              </div>
            )
          )}

          <div className="text-sm text-gray-700">
            Average: <strong>{avg.toFixed(1)}/10</strong>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            disabled={!file || !studentName || !title}
          >
            Upload and Save
          </button>
        </div>
      </form>
    </main>
  );
}