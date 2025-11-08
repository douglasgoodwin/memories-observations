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
export async function POST(req: NextRequest) {
  try {
    await ensureDirectoryExists();

    const ctype = getHeader(req, 'content-type');
    let payload: any = {};
    let audioBuffer: Buffer | null = null;
    let originalFilename = 'recording.webm';

    if (ctype.includes('multipart/form-data')) {
      // New path: client posts FormData with a binary file
      const form = await req.formData();

      const file = form.get('audio');
      if (file instanceof File) {
        const ab = await file.arrayBuffer();
        audioBuffer = Buffer.from(ab);
        originalFilename = file.name || originalFilename;
      }

      // Scalars
      for (const k of [
        'locationId',
        'locationName',
        'title',
        'description',
        'studentName',
        'recordingType',
        'averageScore',
        'score',
        'scores', // JSON string if provided
      ]) {
        const v = form.get(k);
        if (typeof v === 'string') payload[k] = v;
      }

      // Parse scores JSON if present
      if (typeof payload.scores === 'string' && payload.scores.length) {
        try { payload.scores = JSON.parse(payload.scores); } catch { payload.scores = null; }
      }
    } else if (ctype.includes('application/json')) {
      // Back-compat path: JSON with base64 audioData
      payload = await req.json();

      if (payload.audioData && typeof payload.audioData === 'string') {
        // accept data URL or raw base64
        const b64 = payload.audioData.includes(';base64,')
          ? payload.audioData.split(';base64,').pop()!
          : payload.audioData;
        audioBuffer = Buffer.from(b64, 'base64');
      }
    } else {
      return bad(415, `Unsupported Content-Type: ${ctype || '(none)'}`);
    }

    // Normalize/validate fields
    const locationId    = String(payload.locationId || '').trim();
    const locationName  = String(payload.locationName || '').trim();
    const title         = String(payload.title || '').trim();
    const description   = String(payload.description || '').trim();
    const studentName   = String(payload.studentName || '').trim();
    const recordingType = payload.recordingType === 'observation' ? 'observation' : 'memory';

    if (!locationId)   return bad(400, 'Missing locationId');
    if (!locationName) return bad(400, 'Missing locationName');
    if (!title)        return bad(400, 'Missing title');
    if (!studentName)  return bad(400, 'Missing studentName');

    // Scores: accept legacy single `score` or new `scores` object
    let scores: any = null;
    if (payload.scores && typeof payload.scores === 'object') {
      const s = payload.scores;
      scores = {
        importance: Number(s.importance ?? 0),
        emotion:    Number(s.emotion ?? 0),
        intensity:  Number(s.intensity ?? 0),
        aesthetic:  Number(s.aesthetic ?? 0),
      };
    }

    // averageScore: trust provided value, otherwise compute from scores,
    // otherwise fall back to legacy single `score`
    let averageScore = Number(payload.averageScore ?? NaN);
    if (!Number.isFinite(averageScore)) {
      if (scores) {
        averageScore =
          (scores.importance + scores.emotion + scores.intensity + scores.aesthetic) / 4;
      } else if (payload.score !== undefined) {
        averageScore = Number(payload.score);
      } else {
        averageScore = 0;
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return bad(400, 'No audio data provided');
    }

    // Persist file
    const id        = crypto.randomUUID();
    const timestamp = Date.now();
    const filename  = `${timestamp}_${locationId}_${recordingType}.webm`;
    const filePath  = join(RECORDINGS_DIR, filename);
    await writeFile(filePath, audioBuffer);

    // Persist metadata (append)
    const metaStr = await readFile(METADATA_FILE, 'utf8');
    const meta    = JSON.parse(metaStr);

    const newRecording = {
      id,
      date: new Date().toISOString(),
      filename,
      audioUrl: `/recordings/${filename}`,
      originalFilename,

      // user fields
      locationId,
      locationName,
      title,
      description,
      studentName,
      recordingType,

      // scoring
      score: Number.isFinite(Number(payload.score)) ? Number(payload.score) : undefined, // legacy
      scores: scores ?? null,
      averageScore,
    };

    meta.push(newRecording);
    await writeFile(METADATA_FILE, JSON.stringify(meta, null, 2));

    return NextResponse.json(newRecording);
  } catch (err: any) {
    console.error('POST /api/recordings 500:', err?.stack || err);
    return NextResponse.json({ error: 'Failed to save recording' }, { status: 500 });
  }
}

// ---------- DELETE /api/recordings?id=... ----------
export async function DELETE(request: NextRequest) {
  try {
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
