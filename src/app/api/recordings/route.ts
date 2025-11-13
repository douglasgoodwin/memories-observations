import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import crypto from 'node:crypto';

export const runtime = 'nodejs'; // ensure Node runtime (for Buffer/fs)

const RECORDINGS_DIR = join(process.cwd(), 'public', 'recordings');
const METADATA_FILE  = join(RECORDINGS_DIR, 'metadata.json');

// Ensure storage exists
async function ensureDirectoryExists() {
  if (!existsSync(RECORDINGS_DIR)) {
    await mkdir(RECORDINGS_DIR, { recursive: true });
  }
  if (!existsSync(METADATA_FILE)) {
    await writeFile(METADATA_FILE, JSON.stringify([]));
  }
}

function bad(status: number, msg: string) {
  // Will show in `pm2 logs ucla-sound-recorder`
  console.error(`POST /api/recordings ${status}: ${msg}`);
  return NextResponse.json({ error: msg }, { status });
}

function getHeader(req: NextRequest, name: string): string {
  const v = req.headers.get(name);
  return v ? v.toLowerCase() : '';
}

// ---------- GET /api/recordings ----------
export async function GET() {
  try {
    await ensureDirectoryExists();
    const data = await readFile(METADATA_FILE, 'utf8');
    const recordings = JSON.parse(data);

    // Ensure each entry has audioUrl
    const normalized = recordings.map((rec: any) =>
      rec.audioUrl ? rec : { ...rec, audioUrl: `/recordings/${rec.filename}` }
    );

    return NextResponse.json(normalized);
  } catch (err) {
    console.error('Error in GET:', err);
    return NextResponse.json({ error: 'Failed to read recordings' }, { status: 500 });
  }
}

// ---------- POST /api/recordings ----------
// POST /api/recordings
export async function POST(request: Request) {
  try {
    // Parse incoming JSON once
    const body = await request.json();

    // Destructure once (no duplicate const declarations later)
    const {
      audioData,
      title,
      description = '',
      locationId,
      locationName,
      recordingType,
      score,
      studentName,
      lat,
      lng,
      scores,
      averageScore,
    } = body;

    // Basic validation
    if (!audioData) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!studentName) {
      return NextResponse.json({ error: 'Student name is required' }, { status: 400 });
    }
    if (!locationId || !locationName) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 });
    }
    if (score !== undefined) {
      const sNum = typeof score === 'number' ? score : parseInt(String(score), 10);
      if (!Number.isFinite(sNum) || sNum < 0 || sNum > 10) {
        return NextResponse.json({ error: 'Score must be between 0 and 10' }, { status: 400 });
      }
    }

    await ensureDirectoryExists();

    // Decode base64 audio
    const base64 = String(audioData).split(';base64,').pop();
    if (!base64) {
      return NextResponse.json({ error: 'Invalid audio payload' }, { status: 400 });
    }
    const audioBuffer = Buffer.from(base64, 'base64');

    // Filenames
    const timestamp = Date.now();
    const safeLoc = String(locationId).replace(/[^\w-]/g, '');
    const safeType = String(recordingType || 'unknown').replace(/[^\w-]/g, '');
    const filename = `${timestamp}_${safeLoc}_${safeType}.webm`;
    const filePath = join(RECORDINGS_DIR, filename);

    // Persist audio
    await writeFile(filePath, audioBuffer);

    // Build new metadata entry
    const newRecording = {
      id: String(timestamp),
      locationId,
      locationName,
      title,
      description,
      studentName,
      recordingType,
      score: score !== undefined ? (typeof score === 'number' ? score : parseInt(String(score), 10)) : undefined,
      scores,           // optional four-score object if you send it
      averageScore,     // optional precomputed if you send it
      filename,
      audioUrl: `/recordings/${filename}`,
      date: new Date().toISOString(),
      lat: lat !== undefined ? (typeof lat === 'number' ? lat : parseFloat(String(lat))) : undefined,
      lng: lng !== undefined ? (typeof lng === 'number' ? lng : parseFloat(String(lng))) : undefined,
    };

    // Append to metadata.json
    const metaStr = existsSync(METADATA_FILE) ? await readFile(METADATA_FILE, 'utf8') : '[]';
    const meta = JSON.parse(metaStr);
    meta.push(newRecording);
    await writeFile(METADATA_FILE, JSON.stringify(meta, null, 2));

    return NextResponse.json(newRecording);
  } catch (err) {
    console.error('Detailed error in POST /api/recordings:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save recording', details: message }, { status: 500 });
  }
}

// ---------- DELETE /api/recordings?id=... ----------
export async function DELETE(request: NextRequest) {
  try {
    // Check admin password
    const password = request.headers.get('x-admin-password');
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid password' }, 
        { status: 401 }
      );
    }

    await ensureDirectoryExists();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

    const metaStr = await readFile(METADATA_FILE, 'utf8');
    const meta    = JSON.parse(metaStr);
    const idx     = meta.findIndex((r: any) => r.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Recording not found' }, { status: 404 });

    const rec = meta[idx];
    const audioPath = join(RECORDINGS_DIR, rec.filename);
    if (existsSync(audioPath)) {
      await unlink(audioPath);
    }

    meta.splice(idx, 1);
    await writeFile(METADATA_FILE, JSON.stringify(meta, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE:', err);
    return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
  }
}