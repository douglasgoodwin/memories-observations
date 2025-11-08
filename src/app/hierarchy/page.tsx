'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AudioRecording, LocationData, BROAD_LOCATIONS } from '@/types'
import { MaxHeap, createLocationData } from '@/lib/MaxHeap'

export default function HierarchyPage() {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [heap, setHeap] = useState<MaxHeap>(new MaxHeap());
  const [sortedLocations, setSortedLocations] = useState<LocationData[]>([]);
  const [treeLevels, setTreeLevels] = useState<LocationData[][]>([]);

  useEffect(() => {
    fetchRecordings();
  }, []);

  useEffect(() => {
    if (recordings.length > 0) {
      buildHierarchy();
    }
  }, [recordings]);

  const fetchRecordings = async () => {
    try {
      const response = await fetch('/api/recordings');
      const data = await response.json();
      setRecordings(data);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  };

  const buildHierarchy = () => {
    // Create location data for each location
    const locationDataArray: LocationData[] = BROAD_LOCATIONS.map(loc =>
      createLocationData(loc.id, loc.name, recordings)
    );

    // Build max heap
    const newHeap = new MaxHeap();
    newHeap.buildHeap(locationDataArray);
    setHeap(newHeap);

    // Get sorted array
    setSortedLocations(newHeap.getSorted());

    // Get tree levels for visualization
    setTreeLevels(newHeap.getTreeLevels());
  };

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'bg-red-500';
    if (score >= 6) return 'bg-orange-500';
    if (score >= 4) return 'bg-yellow-500';
    if (score >= 2) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getScoreTextColor = (score: number): string => {
    if (score >= 8) return 'text-red-600';
    if (score >= 6) return 'text-orange-600';
    if (score >= 4) return 'text-yellow-600';
    if (score >= 2) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <main className="min-h-screen p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Location Hierarchy</h1>
      <p className="text-gray-600 mb-6">
        Visualizing the Max Heap data structure based on average scores
      </p>

      {/* Data Structure Info */}
      <Card className="mb-6 bg-blue-50">
        <CardHeader>
          <CardTitle>📚 Data Structure: Max Heap</CardTitle>
          <CardDescription>
            A binary tree where each parent node has a higher score than its children.
            Root contains the highest-scored location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Insert</p>
              <p className="text-xl font-bold">O(log n)</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Extract Max</p>
              <p className="text-xl font-bold">O(log n)</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Peek Max</p>
              <p className="text-xl font-bold">O(1)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ranked List */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🏆 Rankings (Sorted by Average Score)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedLocations.map((loc, index) => (
              <div 
                key={loc.locationId} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-gray-400 w-8">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{loc.locationName}</p>
                    <p className="text-sm text-gray-600">
                      {loc.totalRecordings} recording{loc.totalRecordings !== 1 ? 's' : ''}
                      {loc.hasMemory && ' | 💭'}
                      {loc.hasObservation && ' | 👁️'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${getScoreTextColor(loc.averageScore)}`}>
                    {loc.averageScore.toFixed(1)}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${getScoreColor(loc.averageScore)}`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tree Visualization */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🌳 Heap Tree Structure</CardTitle>
          <CardDescription>
            Visual representation of the Max Heap. Each level shows parent-child relationships.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {treeLevels.map((level, levelIndex) => (
              <div key={levelIndex} className="space-y-2">
                <p className="text-sm font-semibold text-gray-500">
                  Level {levelIndex} {levelIndex === 0 && '(Root)'}
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  {level.map((loc) => (
                    <div 
                      key={loc.locationId}
                      className="flex flex-col items-center"
                    >
                      <div className={`
                        p-4 rounded-lg border-2 
                        ${loc.averageScore >= 8 ? 'border-red-500 bg-red-50' : ''}
                        ${loc.averageScore >= 6 && loc.averageScore < 8 ? 'border-orange-500 bg-orange-50' : ''}
                        ${loc.averageScore >= 4 && loc.averageScore < 6 ? 'border-yellow-500 bg-yellow-50' : ''}
                        ${loc.averageScore < 4 ? 'border-blue-500 bg-blue-50' : ''}
                        min-w-[150px] text-center
                      `}>
                        <p className="font-semibold text-sm mb-1">{loc.locationName}</p>
                        <p className={`text-2xl font-bold ${getScoreTextColor(loc.averageScore)}`}>
                          {loc.averageScore.toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {loc.totalRecordings} rec.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Location Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedLocations.slice(0, 6).map((loc) => (
          <Card key={loc.locationId}>
            <CardHeader>
              <CardTitle className="text-lg">{loc.locationName}</CardTitle>
              <CardDescription>
                Average Score: <span className={`font-bold ${getScoreTextColor(loc.averageScore)}`}>
                  {loc.averageScore.toFixed(1)}/10
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loc.recordings.map((rec) => (
                  <div key={rec.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{rec.title}</span>
                      <span className="text-orange-600 font-semibold">{rec.score}/10</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {rec.recordingType === 'memory' ? '💭' : '👁️'} by {rec.studentName}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Algorithm Explanation */}
      <Card className="mt-6 bg-gray-50">
        <CardHeader>
          <CardTitle>🧮 How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">1. Data Collection</h4>
            <p className="text-sm text-gray-700">
              Students record memories and observations for each location with scores (1-10)
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2. Average Calculation</h4>
            <p className="text-sm text-gray-700">
              For each location, we calculate the average score from all recordings
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">3. Heap Construction</h4>
            <p className="text-sm text-gray-700">
              Locations are inserted into a Max Heap where parent nodes always have higher scores than children
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">4. Hierarchy Visualization</h4>
            <p className="text-sm text-gray-700">
              The tree structure shows which locations are most important/emotional/intense (at the top)
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
