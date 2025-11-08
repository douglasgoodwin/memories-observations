// UCLA Broad Arts Building - 12 Locations
export const BROAD_LOCATIONS = [
  { id: 'northernlights', name: 'Northern Lights', description: 'the cafe' },
  { id: 'luvalle', name: 'Luvalle Commons', description: 'the lunch spot' },
  { id: 'sculpturegarden', name: 'Sculpture garden', description: 'North campus' },
  { id: 'roycehall', name: 'Royce Hall', description: 'Royce Hall' },
  { id: 'printlab', name: 'Print Lab', description: 'in Broad, 4th floor' },
  { id: 'newwightgallery', name: 'New Wight Gallery', description: 'In the Art Building' },
  { id: 'mathsciencesbuilding', name: 'Mathematical Sciences Building', description: 'The one and only' },
  { id: 'ackerman', name: 'Ackerman Union', description: 'Cant miss it' },
  { id: 'yrl', name: 'YRL', description: 'Young Research Library' },
  { id: 'bruinwalk', name: 'Bruin Walk', description: 'The main East West path in the south campus' },
  { id: 'kerckhoff', name: 'Kerckhoff Coffee Shop', description: '' },
  { id: 'tongvasteps', name: 'Tongva (Kuruvungna steps)', description: 'The main steps up to Royce Hall' },
] as const;


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


export type LocationId = typeof BROAD_LOCATIONS[number]['id'];

export interface AudioRecording {
  id: string;
  locationId: LocationId;
  locationName: string;
  title: string;
  recordingType: 'memory' | 'observation';
  score: number; // 1-10: importance/emotion/intensity
  description: string;
  studentName: string;
  audioUrl: string;
  filename: string;
  date: string;
}

export interface LocationData {
  locationId: LocationId;
  locationName: string;
  recordings: AudioRecording[];
  averageScore: number;
  totalRecordings: number;
  hasMemory: boolean;
  hasObservation: boolean;
}
