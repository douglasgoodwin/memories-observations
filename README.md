# UCLA Sound Recorder

An interactive web application for recording, rating, and organizing sound memories and observations throughout the UCLA Broad Arts complex. Built with Next.js (TypeScript) and deployed behind NGINX with automatic SSL via Certbot.

The project combines student field recordings, location-based metadata, and multi-dimensional scoring to create an evolving audio map of place and perception.

## Overview

UCLA Sound Recorder enables participants to:
	•	Record short audio clips directly in the browser.
	•	Assign four subjective scores to each location: Importance, Emotion, Intensity, and Aesthetic.
	•	Automatically compute and visualize average scores per location.
	•	Browse hierarchical and list-based summaries of all recordings.
	•	Persist audio and metadata locally on the server (no external storage dependency).

It is designed for classroom, gallery, and research contexts that explore sound, memory, and spatial experience.

## Features

Category	Description
Frontend	Next.js 15 + React + TypeScript + Tailwind
Audio	Uses MediaRecorder API to capture WebM audio
Scoring System	Supports both legacy single-score and new four-score modes
Data Model	recordings stored as JSON metadata + WebM audio files
Visualization	Two views — All Recordings and Hierarchy (Heap visualization)
Deployment	NGINX reverse proxy on Ubuntu with PM2 process manager
SSL	Certificates managed via Certbot using webroot authentication




## Directory Structure

```text
src/
 ├── app/
 │    ├── api/
 │    │     └── recordings/
 │    │           └── route.ts        # Handles GET, POST, DELETE for recordings
 │    ├── hierarchy/                  # Heap visualization page
 │    └── recordings/                 # "All Recordings" summary page
 ├── components/
 │    └── AudioMemoryMap.tsx          # Main interface for recording and scoring
 ├── lib/
 │    ├── MaxHeap.ts                  # Data structure for ranked visualization
 │    └── scoring.ts                  # Four-score averaging and clamping utilities
 └── types/
      └── index.ts                    # Shared TypeScript interfaces

public/
 ├── recordings/                      # Audio files + metadata.json (auto-generated)
 └── favicon.ico
```



## Installation

```text
git clone https://github.com/<your-username>/ucla-sound-recorder.git
cd ucla-sound-recorder
npm install
```



## Development

```npm run dev```

The app will be available at http://localhost:3000￼.



## Production Build

```text
npm run build
npm start

# Or via PM2:

PORT=3001 NODE_ENV=production pm2 start npm --name "ucla-sound-recorder" -- start
```



## Environment Variables

Create a .env.local or .env.production file as needed:

```text
PORT=3001
NODE_ENV=production


# NGINX Configuration (Example)

server {
    listen 80;
    server_name sounds.cairn.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sounds.cairn.com;

    ssl_certificate /etc/letsencrypt/live/sounds.cairn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sounds.cairn.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

}
```



## Data Persistence
​	•	All recordings are saved under public/recordings/.
​	•	Metadata is stored in public/recordings/metadata.json.
​	•	On first run, these files and directories are automatically created.

Note: Audio and metadata are kept on the local filesystem; no external database is required.

## Credits

Author: Douglas Goodwin
Experimental Animation / Design Media Arts
California Institute of the Arts & UCLA

## License

MIT License © Douglas Goodwin.
Feel free to fork, extend, and adapt for educational or artistic use.

