import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'UCLA Broad - Memory & Observation Recorder',
  description: 'Record and rank memories and observations around UCLA Broad Arts Building',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="font-bold text-xl">UCLA Memories and Observations</div>
            <div className="flex gap-6">
              <Link href="/" className="hover:text-blue-200 transition">
                Record
              </Link>
              <Link href="/recordings" className="hover:text-blue-200 transition">
                All Recordings
              </Link>
              <Link href="/hierarchy" className="hover:text-blue-200 transition">
                Hierarchy
              </Link>
            </div>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </body>
    </html>
  )
}
