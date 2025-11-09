import { NextResponse } from 'next/server';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// ---- Storage locations (keep in sync with your recordings route) ----
const RECORDINGS_DIR =
  process.env.RECORDINGS_DIR // optional override (e.g., "/srv/sounds-recordings")
  ?? join(process.cwd(), 'public', 'recordings');

const METADATA_FILE = join(RECORDINGS_DIR, 'metadata.json');

async function ensureStorage() {
  if (!existsSync(RECORDINGS_DIR)) {
    await mkdir(RECORDINGS_DIR, { recursive: true });
  }
  if (!existsSync(METADATA_FILE)) {
    await writeFile(METADATA_FILE, JSON.stringify([]), 'utf8');
  }
}

// ---- Scoring helpers (mirrors src/lib/scoring.ts logic; you can import instead) ----
type FourScores = {
  importance?: number | string;
  emotion?: number | string;
  intensity?: number | string;
  aesthetic?: number | string;
};

function clamp01x10(n: unknown) {
  const v = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
}

function recordingAverage(rec: any): number {
  if (rec && typeof rec === 'object') {
    if (Number.isFinite(rec.averageScore)) return clamp01x10(rec.averageScore);
    if (rec.scores && typeof rec.scores === 'object') {
      const s = rec.scores as FourScores;
      const imp = clamp01x10(s.importance ?? 0);
      const emo = clamp01x10(s.emotion ?? 0);
      const inten = clamp01x10(s.intensity ?? 0);
      const aest = clamp01x10(s.aesthetic ?? 0);
      return (imp + emo + inten + aest) / 4;
    }
    if (Number.isFinite(rec.score)) return clamp01x10(rec.score);
  }
  return 0;
}

function recDim(rec: any, key: keyof FourScores): number {
  if (rec && rec.scores && typeof rec.scores === 'object') {
    return clamp01x10((rec.scores as FourScores)[key] ?? 0);
  }
  // If no four-scores present, fall back to average for ranking consistency
  return recordingAverage(rec);
}

// ---- Aggregation ----
function aggregateByLocation(recs: any[]) {
  const byLoc = new Map<string, { locationName: string; recs: any[] }>();

  for (const r of recs) {
    const id = r.locationId || 'unknown';
    const name = r.locationName || id;
    if (!byLoc.has(id)) byLoc.set(id, { locationName: name, recs: [] });
    byLoc.get(id)!.recs.push(r);
  }

  const result: Array<{
    locationId: string;
    locationName: string;
    count: number;
    avg: number;
    avgByDim: { importance: number; emotion: number; intensity: number; aesthetic: number };
  }> = [];

  for (const [locationId, { locationName, recs }] of byLoc.entries()) {
    const count = recs.length;
    const avg = count ? recs.map(recordingAverage).reduce((a, b) => a + b, 0) / count : 0;

    const dims: (keyof FourScores)[] = ['importance', 'emotion', 'intensity', 'aesthetic'];
    const avgByDim = Object.fromEntries(
      dims.map((d) => {
        const vals = recs.map((r) => recDim(r, d));
        const val = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return [d, val];
      })
    ) as { importance: number; emotion: number; intensity: number; aesthetic: number };

    result.push({ locationId, locationName, count, avg, avgByDim });
  }

  return result;
}

// ---- GET /api/rankings ----
export async function GET() {
  try {
    await ensureStorage();
    const raw = await readFile(METADATA_FILE, 'utf8');
    const recordings = JSON.parse(raw);

    const aggregated = aggregateByLocation(Array.isArray(recordings) ? recordings : []);
    // Optionally sort by overall avg, highest first:
    aggregated.sort((a, b) => b.avg - a.avg);

    return NextResponse.json(aggregated);
  } catch (err) {
    console.error('Error building rankings:', err);
    return NextResponse.json({ error: 'Failed to compute rankings' }, { status: 500 });
  }
}