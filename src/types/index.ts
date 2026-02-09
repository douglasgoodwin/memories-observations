// UCLA Broad Arts Building - 12 Locations

export type LocationId =
  | 'atlarge'
  | 'northernlights' | 'luvalle' | 'sculpturegarden' | 'roycehall' | 'printlab'
  | 'newwightgallery' | 'mathsciencesbuilding' | 'ackerman' | 'yrl'
  | 'bruinwalk' | 'kerckhoff' | 'tongvasteps';

export interface BroadLocation {
  id: LocationId;
  name: string;
  description: string;
  lat: number;
  lng: number;
}

export interface AudioRecording {
  id: string;
  locationId: LocationId;
  locationName: string;
  title: string;
  description?: string;
  studentName: string;
  recordingType: 'memory' | 'observation';
  score?: number;
  scores?: {
    importance?: number; emotion?: number; intensity?: number; aesthetic?: number;
  };
  averageScore?: number;
  audioUrl: string;
  date: string;

  // NEW:
  lat?: number;
  lng?: number;
}

export const BROAD_LOCATIONS: BroadLocation[] = [
  { id: 'atlarge', name: 'AT LARGE', description: 'Recording at your current location', lat: 0, lng: 0 },
  { id: 'northernlights', name: 'Northern Lights', description: '—', lat: 34.07442071255393, lng: -118.44235863646719 },
  { id: 'luvalle', name: 'Lu Valle Commons', description: '—', lat: 34.07358407052256, lng: -118.43924636157925 },
  { id: 'sculpturegarden', name: 'Sculpture Garden', description: '—', lat: 34.07490402208068, lng: -118.44005202769344 },
  { id: 'roycehall', name: 'Royce Hall', description: '—', lat: 34.07270663598194, lng: -118.44217093540396 },
  { id: 'printlab', name: 'Print Lab', description: '—', lat: 34.07601991731391, lng: -118.44069145779318 },
  { id: 'newwightgallery', name: 'New Wight Gallery', description: '—', lat: 34.076009768873966, lng: -118.44076522496871 },
  { id: 'mathsciencesbuilding', name: 'Mathematical Sciences Building', description: '—', lat: 34.069749, lng: -118.442560 },
  { id: 'ackerman', name: 'Ackerman', description: '—', lat: 34.07049151137256, lng: -118.44412719235386 },
  { id: 'yrl', name: 'YRL', description: '—', lat: 34.07493725669435, lng: -118.44145607313261 },
  { id: 'bruinwalk', name: 'Bruin Walk', description: '—', lat: 34.07099341426743, lng: -118.44507296793255 },
  { id: 'kerckhoff', name: 'Kerckhoff', description: '—', lat: 34.07057784312767, lng: -118.44340944785897 },
  { id: 'tongvasteps', name: 'Tongva (Kuruvungna) Steps', description: '—', lat: 34.07219172773654, lng: -118.44326816984622 },
];

// Northern Lights, 34.07442071255393, -118.44235863646719
// Luvalle Commons 34.07358407052256, -118.43924636157925
// Sculpture gardens 34.07490402208068, -118.44005202769344
// Royce Hall 34.07270663598194, -118.44217093540396
// Print Lab 34.07601991731391, -118.44069145779318
// New Wight Gallery 34.076009768873966, -118.44076522496871
// Mathematical Sciences Building 34.069749, -118.442560
// Ackerman 34.07049151137256, -118.44412719235386
// YRL 34.07493725669435, -118.44145607313261
// Bruin Walk 34.07099341426743, -118.44507296793255
// Kerckhoff 34.07057784312767, -118.44340944785897
// Tongva (Kuruvungna steps) 34.07219172773654, -118.44326816984622

// export type LocationId = typeof BROAD_LOCATIONS[number]['id'];

// export interface AudioRecording {
//   id: string;
//   locationId: LocationId;
//   locationName: string;
//   title: string;
//   recordingType: 'memory' | 'observation';
//   score: number; // 1-10: importance/emotion/intensity
//   description: string;
//   studentName: string;
//   audioUrl: string;
//   filename: string;
//   date: string;
// }

export interface LocationData {
  locationId: LocationId;
  locationName: string;
  recordings: AudioRecording[];
  averageScore: number;
  totalRecordings: number;
  hasMemory: boolean;
  hasObservation: boolean;
}
