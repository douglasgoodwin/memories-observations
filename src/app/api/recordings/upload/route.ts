import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

const RECORDINGS_DIR = join(process.cwd(), 'public', 'recordings');
const METADATA_FILE = join(RECORDINGS_DIR, 'metadata.json');

async function ensureDirectoryExists() {
  if (!existsSync(RECORDINGS_DIR)) {
    await mkdir(RECORDINGS_DIR, { recursive: true });
  }
  if (!existsSync(METADATA_FILE)) {
    await writeFile(METADATA_FILE, JSON.stringify([]));
  }
}

const clamp01x10 = (n: unknown) => {
  const v = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
};

function parseScores(form: FormData) {
  // Accepts fields as scores[importance], scores[emotion], etc.
  const importance = clamp01x10(form.get('scores[importance]') ?? 0);
  const emotion = clamp01x10(form.get('scores[emotion]') ?? 0);
  const intensity = clamp01x10(form.get('scores[intensity]') ?? 0);
  const aesthetic = clamp01x10(form.get('scores[aesthetic]') ?? 0);
  const average = (importance + emotion + intensity + aesthetic) / 4;
  return {
    scores: { importance, emotion, intensity, aesthetic },
    averageScore: average,
  };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get('file') as File | null;
    const studentName = String(form.get('studentName') || '');
    const title = String(form.get('title') || '');
    const description = String(form.get('description') || '');
    const locationId = String(form.get('locationId') || '');
    const locationName = String(form.get('locationName') || '');
    const recordingType = String(form.get('recordingType') || 'memory');

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!studentName) return NextResponse.json({ error: 'Student name is required' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!locationId || !locationName) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 });
    }

    // Optional lat/lng
    const latRaw = form.get('lat');
    const lngRaw = form.get('lng');
    const lat = latRaw !== null ? parseFloat(String(latRaw)) : undefined;
    const lng = lngRaw !== null ? parseFloat(String(lngRaw)) : undefined;

    const { scores, averageScore } = parseScores(form);

    await ensureDirectoryExists();

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const timestamp = Date.now();
    const safeLoc = locationId.replace(/[^\w-]/g, '');
    const safeType = recordingType.replace(/[^\w-]/g, '');
    // Keep original extension if possible
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'webm';
    const filename = `${timestamp}_${safeLoc}_${safeType}.${ext}`;
    const filePath = join(RECORDINGS_DIR, filename);

    await writeFile(filePath, buffer);

    // Append metadata
    const metaStr = existsSync(METADATA_FILE) ? await readFile(METADATA_FILE, 'utf8') : '[]';
    const meta = JSON.parse(metaStr);

    const newRecording = {
      id: String(timestamp),
      locationId,
      locationName,
      title,
      description,
      studentName,
      recordingType,
      // retain legacy single score for compatibility; store the computed average
      score: Math.round(averageScore), // legacy field (0–10)
      scores,                          // full set
      averageScore,                    // precise average
      filename,
      audioUrl: `/recordings/${filename}`,
      date: new Date().toISOString(),
      lat: Number.isFinite(lat as number) ? lat : undefined,
      lng: Number.isFinite(lng as number) ? lng : undefined,
    };

    meta.push(newRecording);
    await writeFile(METADATA_FILE, JSON.stringify(meta, null, 2));

    return NextResponse.json(newRecording);
  } catch (err) {
    console.error('Upload error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to upload recording', details: message }, { status: 500 });
  }
}