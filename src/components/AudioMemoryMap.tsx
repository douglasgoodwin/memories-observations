'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, StopCircle } from 'lucide-react';
import { BROAD_LOCATIONS, AudioRecording, LocationId } from '@/types';

/* ---------- Sorting helpers and types (single definitions) ---------- */

type FourScores = {
  importance: number;
  emotion: number;
  intensity: number;
  aesthetic: number;
};

type FourScoresKey = 'importance' | 'emotion' | 'intensity' | 'aesthetic';
type SortKey = FourScoresKey | 'average';
type SortDir = 'asc' | 'desc';

const clamp01x10 = (n: unknown) => {
  const v = typeof n === 'number' ? n : parseInt(String(n), 10);
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
};

function hasScores(
  r: AudioRecording | any
): r is AudioRecording & { scores?: Partial<FourScores> } {
  return r && typeof r === 'object' && 'scores' in r;
}

const getRecordingScore = (r: AudioRecording, key: SortKey): number => {
  if (hasScores(r) && r.scores && typeof r.scores === 'object') {
    const { importance = 0, emotion = 0, intensity = 0, aesthetic = 0 } =
      r.scores as Partial<FourScores>;
    if (key === 'average') {
      return (
        clamp01x10(importance) +
        clamp01x10(emotion) +
        clamp01x10(intensity) +
        clamp01x10(aesthetic)
      ) / 4;
    }
    return clamp01x10((r.scores as Record<string, unknown>)[key] as number);
  }
  // Legacy fallback: single numeric score
  return key === 'average' ? clamp01x10((r as any).score ?? 0) : 0;
};

const byScore =
  (key: SortKey, dir: SortDir) =>
  (a: AudioRecording, b: AudioRecording): number => {
    const va = getRecordingScore(a, key);
    const vb = getRecordingScore(b, key);
    return dir === 'desc' ? vb - va : va - vb;
  };

/* ------------------------------ Component ------------------------------ */

export default function AudioMemoryMap() {
const [recordings, setRecordings] = useState<AudioRecording[]>([]);
const [recording, setRecording] = useState(false);
const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

const [geo, setGeo] = useState<{lat?: number; lng?: number; error?: string}>({});

const requestLocation = () => {
  if (!('geolocation' in navigator)) {
    setGeo({ error: 'Geolocation not supported on this device.' });
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    },
    (err) => {
      setGeo({ error: err.message || 'Unable to get location.' });
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
};


// Form state
const [studentName, setStudentName] = useState('');
const [locationId, setLocationId] = useState<LocationId>('northernlights');
const [title, setTitle] = useState('');
const [description, setDescription] = useState('');
const [recordingType, setRecordingType] = useState<'memory' | 'observation'>('memory');
const [scores, setScores] = useState({
  importance: 0,
  emotion: 0,
  intensity: 0,
  aesthetic: 0,
});
const average = useMemo(
  () => (scores.importance + scores.emotion + scores.intensity + scores.aesthetic) / 4,
  [scores]
);

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>('average');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      const response = await fetch('/api/recordings');
      if (response.ok) {
        const data = await response.json();
        setRecordings(data);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  };

  const startRecording = async () => {
    if (!title || !studentName) {
      alert('Please enter your name and a title before recording');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const selectedLocation = BROAD_LOCATIONS.find((loc) => loc.id === locationId)!;

          const newRecording = {
            locationId,
            locationName: selectedLocation.name,
            title,
            description,
            studentName,
            recordingType,
			scores,              // send the four-field object
            audioData: base64Audio,
			lat: geo.lat,
			lng: geo.lng,
          };

          try {
            const response = await fetch('/api/recordings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newRecording),
            });

            if (response.ok) {
				loadRecordings();
				setTitle('');
				setDescription('');
				setScores({ importance: 0, emotion: 0, intensity: 0, aesthetic: 0 });
				alert('Recording saved successfully!');
            }
          } catch (error) {
            console.error('Error saving recording:', error);
            alert('Failed to save recording');
          }
        };

        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  const deleteRecording = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      const response = await fetch(`/api/recordings?id=${id}`, { method: 'DELETE' });
      if (response.ok) loadRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  const selectedLocation = BROAD_LOCATIONS.find((loc) => loc.id === locationId);

  // Apply sorting at the top level (not inside callbacks)
  const sortedRecordings = useMemo(
    () =>
      Array.isArray(recordings) ? [...recordings].sort(byScore(sortKey, sortDir)) : [],
    [recordings, sortKey, sortDir]
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>UCLA Broad Arts Building - Memory & Observation Recorder</CardTitle>
          <CardDescription>
            Record a memory and an observation for each of the 12 locations. Rate the
            importance/emotion/intensity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Student Name */}
            <div>
              <Label htmlFor="studentName">Your Name</Label>
              <Input
                id="studentName"
                placeholder="Enter your name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>

            {/* Location Selection */}
            <div>
              <Label htmlFor="location">Location</Label>
              <Select
                value={locationId}
                onValueChange={(value) => setLocationId(value as LocationId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BROAD_LOCATIONS.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      📍 {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLocation && (
                <p className="text-sm text-gray-500 mt-1">{selectedLocation.description}</p>
              )}
            </div>
            
			<div className="space-y-2">
			  <Label>Your Location (optional)</Label>
			  <div className="flex items-center gap-2">
				<Button type="button" variant="outline" onClick={requestLocation}>
				  Use my current location
				</Button>
				{geo.lat && geo.lng && (
				  <span className="text-sm text-gray-600">
					{geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
				  </span>
				)}
				{geo.error && <span className="text-sm text-red-600">{geo.error}</span>}
			  </div>
			</div>

            {/* Recording Type */}
            <div className="space-y-2">
              <Label>Recording Type</Label>
              <RadioGroup
                value={recordingType}
                onValueChange={(value) =>
                  setRecordingType(value as 'memory' | 'observation')
                }
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="memory" id="memory" />
                  <div className="space-y-1">
                    <Label htmlFor="memory" className="font-medium">
                      Memory
                    </Label>
                    <p className="text-sm text-gray-500">
                      A personal experience or story about this place
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="observation" id="observation" />
                  <div className="space-y-1">
                    <Label htmlFor="observation" className="font-medium">
                      Observation
                    </Label>
                    <p className="text-sm text-gray-500">
                      What you notice, hear, or feel about this space
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Give your recording a title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

			{/* Assign Four Scores */}
			<div className="space-y-4 border-t pt-4">
			  <div className="flex items-baseline justify-between">
				<Label className="text-base font-semibold">Assign Four Scores (0–10)</Label>
				<div className="text-sm text-gray-700">Average: <span className="font-semibold">{average.toFixed(1)}</span></div>
			  </div>

			  {/* Importance */}
			  <div>
				<div className="flex justify-between items-center mb-2">
				  <Label htmlFor="importance" className="font-medium">Importance</Label>
				  <span className="text-lg font-semibold">{scores.importance}</span>
				</div>
				<p className="text-sm text-gray-600 mb-2">How meaningful this place feels</p>
				<div className="flex items-center gap-4">
				  <span className="text-sm text-gray-500">0</span>
				  <input
					id="importance"
					type="range"
					min="0"
					max="10"
					value={scores.importance}
					onChange={(e) =>
					  setScores((s) => ({ ...s, importance: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) }))
					}
					className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
				  />
				  <span className="text-sm text-gray-500">10</span>
				</div>
			  </div>

			  {/* Emotion */}
			  <div>
				<div className="flex justify-between items-center mb-2">
				  <Label htmlFor="emotion" className="font-medium">Emotion</Label>
				  <span className="text-lg font-semibold">{scores.emotion}</span>
				</div>
				<p className="text-sm text-gray-600 mb-2">How strongly you feel it</p>
				<div className="flex items-center gap-4">
				  <span className="text-sm text-gray-500">0</span>
				  <input
					id="emotion"
					type="range"
					min="0"
					max="10"
					value={scores.emotion}
					onChange={(e) =>
					  setScores((s) => ({ ...s, emotion: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) }))
					}
					className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
				  />
				  <span className="text-sm text-gray-500">10</span>
				</div>
			  </div>

			  {/* Intensity */}
			  <div>
				<div className="flex justify-between items-center mb-2">
				  <Label htmlFor="intensity" className="font-medium">Intensity</Label>
				  <span className="text-lg font-semibold">{scores.intensity}</span>
				</div>
				<p className="text-sm text-gray-600 mb-2">How vivid or stimulating it is</p>
				<div className="flex items-center gap-4">
				  <span className="text-sm text-gray-500">0</span>
				  <input
					id="intensity"
					type="range"
					min="0"
					max="10"
					value={scores.intensity}
					onChange={(e) =>
					  setScores((s) => ({ ...s, intensity: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) }))
					}
					className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
				  />
				  <span className="text-sm text-gray-500">10</span>
				</div>
			  </div>

			  {/* Aesthetic */}
			  <div>
				<div className="flex justify-between items-center mb-2">
				  <Label htmlFor="aesthetic" className="font-medium">Aesthetic</Label>
				  <span className="text-lg font-semibold">{scores.aesthetic}</span>
				</div>
				<p className="text-sm text-gray-600 mb-2">How attractive or aesthetic it is</p>
				<div className="flex items-center gap-4">
				  <span className="text-sm text-gray-500">0</span>
				  <input
					id="aesthetic"
					type="range"
					min="0"
					max="10"
					value={scores.aesthetic}
					onChange={(e) =>
					  setScores((s) => ({ ...s, aesthetic: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) }))
					}
					className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
				  />
				  <span className="text-sm text-gray-500">10</span>
				</div>
			  </div>
			</div>

            {/* Record Button */}
            <Button
              onClick={recording ? stopRecording : startRecording}
              className={`w-full ${
                recording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}
              size="lg"
            >
              {recording ? (
                <>
                  <StopCircle className="mr-2" /> Stop Recording
                </>
              ) : (
                <>
                  <Mic className="mr-2" /> Start Recording
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Recordings + Sort Controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Recordings</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm">Sort by</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="average">Average</option>
            <option value="importance">Importance</option>
            <option value="emotion">Emotion</option>
            <option value="intensity">Intensity</option>
            <option value="aesthetic">Aesthetic</option>
          </select>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as SortDir)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="desc">High → Low</option>
            <option value="asc">Low → High</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {sortedRecordings.slice(0, 5).map((rec) => (
          <Card key={rec.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold">{rec.title}</h3>


					<div className="flex items-center gap-2 text-sm">
					  <span className="text-gray-700">{rec.recordingType === 'memory' ? 'Memory' : 'Observation'}</span>
					  <span className="text-gray-600">Location: {rec.locationName}</span>
					  {hasScores(rec) && rec.scores ? (
						<span className="font-semibold text-gray-700">
						  Avg {(
							(clamp01x10((rec.scores as any).importance) +
							 clamp01x10((rec.scores as any).emotion) +
							 clamp01x10((rec.scores as any).intensity) +
							 clamp01x10((rec.scores as any).aesthetic)) / 4
						  ).toFixed(1)}
						  {'  '}
						  [ I {clamp01x10((rec.scores as any).importance)} | 
							E {clamp01x10((rec.scores as any).emotion)} | 
							In {clamp01x10((rec.scores as any).intensity)} | 
							A {clamp01x10((rec.scores as any).aesthetic)} ]
						</span>
					  ) : (
						<span className="font-semibold text-gray-700">Score {rec.score}/10</span>
					  )}
					</div>
                  
                  
                  <p className="text-sm text-gray-500">by {rec.studentName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteRecording(rec.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
              {rec.description && <p className="text-gray-700 mb-2">{rec.description}</p>}
              <audio controls src={rec.audioUrl} className="w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
