'use client'

import AudioMemoryMap from '@/components/AudioMemoryMap'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">UCLA Sound Recorder</h1>
        <Link
          href="/upload"
          className="text-blue-600 underline hover:text-blue-800 text-sm"
        >
          Upload existing audio
        </Link>
      </div>

      <AudioMemoryMap />
    </main>
  )
}