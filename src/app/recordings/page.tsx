'use client'

import { recordingAverage, averageOfRecordings } from '@/lib/scoring';
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react'
import { AudioRecording, BROAD_LOCATIONS, LocationId } from '@/types'

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRecordings = async () => {
      const response = await fetch('/api/recordings')
      const data = await response.json()
      setRecordings(data)
    }
    fetchRecordings()
  }, [])

  // Check completion status for each location
  const getLocationStatus = (locationId: LocationId) => {
    const locationRecs = recordings.filter(r => r.locationId === locationId);
    const hasMemory = locationRecs.some(r => r.recordingType === 'memory');
    const hasObservation = locationRecs.some(r => r.recordingType === 'observation');
    const count = locationRecs.length;
    const avgScore = count > 0 ? averageOfRecordings(locationRecs) : 0;
    return {
      hasMemory,
      hasObservation,
      count,
      avgScore,
      isComplete: hasMemory && hasObservation,
      recordings: locationRecs
    };
  };

  const toggleLocation = (locationId: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedLocations(newExpanded);
  };

  const completedCount = BROAD_LOCATIONS.filter(loc => 
    getLocationStatus(loc.id).isComplete
  ).length;

  return (
    <main className="min-h-screen p-4 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">All Recordings by Location</h1>
        <p className="text-gray-600">
          Progress: {completedCount} / {BROAD_LOCATIONS.length} locations complete
          <span className="ml-2 text-sm">
            (Complete = 1 Memory + 1 Observation per location)
          </span>
        </p>
        <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / BROAD_LOCATIONS.length) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-3">
        {BROAD_LOCATIONS.map((location) => {
          const status = getLocationStatus(location.id);
          const isExpanded = expandedLocations.has(location.id);

          return (
            <Card 
              key={location.id}
              className={`${status.isComplete ? 'border-green-500 border-2' : ''}`}
            >
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleLocation(location.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {status.isComplete ? (
                        <CheckCircle2 className="text-green-500 w-5 h-5" />
                      ) : (
                        <Circle className="text-gray-400 w-5 h-5" />
                      )}
                      <CardTitle className="text-lg">
                        📍 {location.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                      {location.description}
                    </CardDescription>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className={status.hasMemory ? 'text-green-600' : 'text-gray-400'}>
                        💭 Memory {status.hasMemory && '✓'}
                      </span>
                      <span className={status.hasObservation ? 'text-green-600' : 'text-gray-400'}>
                        👁️ Observation {status.hasObservation && '✓'}
                      </span>
                      {status.count > 0 && (
                        <span className="text-orange-600 font-semibold">
			   Avg Score: {status.avgScore.toFixed(1)}/10
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {status.count} recording{status.count !== 1 ? 's' : ''}
                    </span>
                    {isExpanded ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && status.recordings.length > 0 && (
                <CardContent>
                  <div className="space-y-4">
                    {status.recordings.map((rec) => (
                      <div key={rec.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold">{rec.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-blue-600">
                                {rec.recordingType === 'memory' ? '💭 Memory' : '👁️ Observation'}
                              </span>
                              <span className="text-sm text-gray-600">
                                by {rec.studentName}
                              </span>
			      <span className="text-sm font-semibold text-orange-600">
				  Score: {recordingAverage(rec).toFixed(1)}/10
				</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(rec.date).toLocaleDateString()}
                          </span>
                        </div>
                        {rec.description && (
                          <p className="text-gray-700 text-sm mb-2">{rec.description}</p>
                        )}
                        <audio 
                          controls 
                          src={rec.audioUrl} 
                          className="w-full mt-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}

              {isExpanded && status.recordings.length === 0 && (
                <CardContent>
                  <p className="text-gray-500 text-center py-4">
                    No recordings yet for this location
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card className="mt-8 bg-blue-50">
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-blue-600">{recordings.length}</p>
              <p className="text-sm text-gray-600">Total Recordings</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{completedCount}</p>
              <p className="text-sm text-gray-600">Complete Locations</p>
            </div>
	    <div>
		  <p className="text-3xl font-bold text-orange-600">
		    {recordings.length > 0
		      ? averageOfRecordings(recordings).toFixed(1)
		      : '0'}
		  </p>
		  <p className="text-sm text-gray-600">Average Score</p>
		</div>
		<div>
		  <p className="text-3xl font-bold text-purple-600">
		    {new Set(recordings.map(r => String(r.studentName || ''))).size}
		  </p>
		  <p className="text-sm text-gray-600">Students</p>
		</div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
