# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UCLA Sound Recorder — a Next.js web app for recording, rating, and mapping audio memories/observations at UCLA campus locations. Students record audio in-browser, assign four subjective scores (Importance, Emotion, Intensity, Aesthetic), and browse results on a Leaflet map and in ranked views.

## Commands

- `npm run dev` — Start dev server with Turbopack (port 3000)
- `npm run build` — Production build
- `npm start` — Start production server (port 3001)
- `npm run lint` — Run ESLint
- `npm run lint:fix` — Auto-fix lint issues

No test framework is configured.

## Tech Stack

- **Next.js 16** with App Router, React 19, TypeScript
- **Tailwind CSS** with shadcn/ui components (Radix primitives)
- **Leaflet / react-leaflet** for the interactive map
- **Scalar** for OpenAPI reference docs (`/reference` page)
- Production deployment: NGINX reverse proxy + PM2 on Ubuntu (see `configs/ecosystem.config.js`)

## Architecture

### Data Flow

Recordings are stored entirely on the local filesystem — no database:
- Audio files (WebM): `public/recordings/*.webm`
- All metadata: `public/recordings/metadata.json` (auto-created on first request)
- The API routes read/write this JSON file directly with `fs` operations

### API Routes (`src/app/api/`)

- `recordings/route.ts` — GET (list all), POST (create with base64 audio + metadata), DELETE (requires `x-admin-password` header matching `ADMIN_PASSWORD` env var)
- `recordings/upload/route.ts` — Separate upload endpoint
- `rankings/route.ts` — Rankings data

### Scoring System (`src/lib/scoring.ts`)

Supports three modes for backward compatibility:
1. **Four-score** (`scores` object with importance/emotion/intensity/aesthetic, each 0-10)
2. **Pre-computed** (`averageScore` field)
3. **Legacy single** (`score` field)

`recordingAverage()` resolves in that priority order. All values clamped to [0, 10].

### Key Components

- `AudioMemoryMap.tsx` — Main UI: Leaflet map with location markers, in-browser audio recording via MediaRecorder API, score input, and recording playback
- `MaxHeap.ts` — Heap data structure for the hierarchy/ranked visualization page

### Pages

- `/` — Main map + recording interface
- `/recordings` — List view of all recordings
- `/hierarchy` — Heap-based ranked visualization
- `/upload` — Upload pre-existing audio files
- `/map` — Standalone map view
- `/reference` — OpenAPI docs (Scalar)

### Location Data (`src/types/index.ts`)

12 hardcoded UCLA campus locations with lat/lng coordinates. The `LocationId` type union constrains valid location identifiers. Recordings can also carry custom lat/lng overrides.
