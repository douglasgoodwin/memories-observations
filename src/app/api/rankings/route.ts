import { NextResponse, NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Paths used elsewhere in your app
const RECORDINGS_DIR = join(process.cwd(), 'public', 'recordings');
const METADATA_FILE  = join(RECORDINGS_DIR, 'metadata.json');

// ----- Types -----
type Dir = 'asc' | 'desc';
type Metric = 'average' | 'importance' | 'emotion' | 'intensity' | 'aesthetic' | 'count';
type Kind = 'locations' | 'recordings'; // what to rank

type FourScores = {
  importance?: number | string;
  emotion?: number | string;
  intensity?: number | string;
  aesthetic?: number | string;
};

type Recording = {
  id: string;
  title?: string;
  description?: string;
  studentName?: string;
  recordingType: 'memory' | 'observation';
  locationId: string;
  locationName: string;
  filename?: string;
  audioUrl?: string;
  date?: string;
  score?: number;           // legacy single score
  averageScore?: number;    // optional precomputed
  scores?: FourScores;      // new four scores
  lat?: number;
  lng?: number;
};

type LocationAggregate = {
  locationId: string;
  locationName: string;
  count: number;
  avg: number; // overall average
  avgByDim: {
    importance: number;
    emotion: number;
    intensity: number;
    aesthetic: number;
  };
  // small sample for UI convenience
  topExamples: Array<{
    id: string;
    title: string;
    recordingType: string;
    audioUrl?: string;
    average: number;
  }>;
};

// ----- Scoring helpers (robust to mixed data) -----
const clamp01x10 = (n: unknown) => {
  const v = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
};

const recordingAverage = (rec: any): number => {
  if (rec && typeof rec === 'object') {
    if (Number.isFinite(rec.averageScore)) return clamp01x10(rec.averageScore);
    if (rec.scores && typeof rec.scores === 'object') {
      const s = rec.scores as FourScores;
      const imp  = clamp01x10(s.importance ?? 0);
      const emo  = clamp01x10(s.emotion ?? 0);
      const inten= clamp01x10(s.intensity ?? 0);
      const aest = clamp01x10(s.aesthetic ?? 0);
      return (imp + emo + inten + aest) / 4;
    }
    if (Number.isFinite(rec.score)) return clamp01x10(rec.score);
  }
  return 0;
};

const recordingDim = (rec: any, dim: keyof FourScores): number => {
  if (rec && rec.scores && typeof rec.scores === 'object') {
    return clamp01x10((rec.scores as FourScores)[dim] ?? 0);
  }
  // fallback to overall average when dim not present
  return recordingAverage(rec);
};

// ----- Aggregation -----
function aggregateByLocation(recs: Recording[]): LocationAggregate[] {
  const byLoc = new Map<string, { name: string; recs: Recording[] }>();
  for (const r of recs) {
    const key = r.locationId || 'unknown';
    if (!byLoc.has(key)) byLoc.set(key, { name: r.locationName || key, recs: [] });
    byLoc.get(key)!.recs.push(r);
  }

  const result: LocationAggregate[] = [];
  for (const [locationId, { name, recs }] of byLoc.entries()) {
    const count = recs.length;
    const avg = count
      ? recs.map(recordingAverage).reduce((a, b) => a + b, 0) / count
      : 0;

    const dims: (keyof FourScores)[] = ['importance', 'emotion', 'intensity', 'aesthetic'];
    const avgByDim = dims.reduce((acc, d) => {
      const vals = recs.map(r => recordingDim(r, d));
      acc[d] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return acc;
    }, {} as Record<keyof FourScores, number>) as LocationAggregate['avgByDim'];

    const topExamples = recs
      .slice()
      .sort((a, b) => recordingAverage(b) - recordingAverage(a))
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        title: r.title || '(untitled)',
        recordingType: r.recordingType,
        audioUrl: r.audioUrl,
        average: recordingAverage(r),
      }));

    result.push({
      locationId,
      locationName: name,
      count,
      avg,
      avgByDim,
      topExamples,
    });
  }
  return result;
}

// ----- Sorting -----
function selectValueForMetric(
  metric: Metric,
  loc: LocationAggregate | undefined,
  rec?: Recording
): number {
  if (rec) {
    if (metric === 'average') return recordingAverage(rec);
    if (metric === 'count') return 1; // not meaningful per-record
    return recordingDim(rec, metric as keyof FourScores);
  }
  // location case
  if (!loc) return 0;
  if (metric === 'average') return loc.avg;
  if (metric === 'count') return loc.count;
  return loc.avgByDim[metric as keyof FourScores] ?? 0;
}

function sortDir(dir: Dir) {
  return dir === 'desc' ? (a: number, b: number) => b - a : (a: number, b: number) => a - b;
}

// ----- Handler -----
export async function GET(req: NextRequest) {
  try {
    if (!existsSync(METADATA_FILE)) {
      return NextResponse.json([], { status: 200 });
    }

    const url = new URL(req.url);
    const kind   = (url.searchParams.get('type')   || 'locations') as Kind;
    const metric = (url.searchParams.get('metric') || 'average')   as Metric;
    const dir    = (url.searchParams.get('dir')    || 'desc')      as Dir;
    const limitQ = url.searchParams.get('limit');
    const limit  = limitQ ? Math.max(1, Math.min(1000, parseInt(limitQ, 10))) : undefined;
    const onlyLoc= url.searchParams.get('locationId') || undefined;

    const metaStr = await readFile(METADATA_FILE, 'utf8');
    const all: Recording[] = JSON.parse(metaStr);

    const filtered = onlyLoc ? all.filter(r => r.locationId === onlyLoc) : all;

    if (kind === 'recordings') {
      // rank individual recordings
      const scored = filtered
        .slice()
        .sort((a, b) =>
          sortDir(dir)(
            selectValueForMetric(metric, undefined, a),
            selectValueForMetric(metric, undefined, b)
          )
        )
        .map(r => ({
          id: r.id,
          title: r.title || '(untitled)',
          locationId: r.locationId,
          locationName: r.locationName,
          recordingType: r.recordingType,
          audioUrl: r.audioUrl,
          average: recordingAverage(r),
          importance: recordingDim(r, 'importance'),
          emotion: recordingDim(r, 'emotion'),
          intensity: recordingDim(r, 'intensity'),
          aesthetic: recordingDim(r, 'aesthetic'),
          lat: r.lat ?? null,
          lng: r.lng ?? null,
          date: r.date ?? null,
        }));

      const out = typeof limit === 'number' ? scored.slice(0, limit) : scored;
      return NextResponse.json(out, { status: 200 });
    }

    // default: rank locations
    const agg = aggregateByLocation(filtered);
    const ranked = agg
      .slice()
      .sort((a, b) => sortDir(dir)(selectValueForMetric(metric, a), selectValueForMetric(metric, b)));

    const out = typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    // Surface a concise error for diagnosis
    return NextResponse.json(
      { error: 'Failed to compute rankings', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// Optional: respond to CORS preflight if the request reaches the app directly.
// Your NGINX already handles CORS for /api/, so this is defensive.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}