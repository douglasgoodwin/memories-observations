import { LocationData } from '../types';

/**
 * Max Heap implementation for hierarchical ranking of locations by score
 * Used for Data Structures & Algorithms class demonstration
 */

// Allowed location identifiers
export const ALLOWED_LOCATION_IDS = [
  "northernlights","luvalle","sculpturegarden","roycehall","printlab",
  "newwightgallery","mathsciencesbuilding","ackerman","yrl","bruinwalk","kerckhoff","tongvasteps",
] as const;

export type LocationId = typeof ALLOWED_LOCATION_IDS[number];

export function toLocationId(s: string): LocationId {
  return (ALLOWED_LOCATION_IDS as readonly string[]).includes(s)
    ? (s as LocationId)
    : "northernlights"; // fallback you prefer
}

export class MaxHeap {
  private heap: LocationData[] = [];

  /**
   * Get parent index
   * Time Complexity: O(1)
   */
  private getParentIndex(index: number): number {
    return Math.floor((index - 1) / 2);
  }

  /**
   * Get left child index
   * Time Complexity: O(1)
   */
  private getLeftChildIndex(index: number): number {
    return 2 * index + 1;
  }

  /**
   * Get right child index
   * Time Complexity: O(1)
   */
  private getRightChildIndex(index: number): number {
    return 2 * index + 2;
  }

  /**
   * Swap two elements in heap
   * Time Complexity: O(1)
   */
  private swap(index1: number, index2: number): void {
    [this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]];
  }

  /**
   * Bubble up: restore heap property after insertion
   * Time Complexity: O(log n)
   */
  private bubbleUp(): void {
    let index = this.heap.length - 1;
    
    while (index > 0) {
      const parentIndex = this.getParentIndex(index);
      
      if (this.heap[parentIndex].averageScore < this.heap[index].averageScore) {
        this.swap(parentIndex, index);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Bubble down: restore heap property after extraction
   * Time Complexity: O(log n)
   */
  private bubbleDown(index: number = 0): void {
    let currentIndex = index;
    
    while (true) {
      const leftChildIndex = this.getLeftChildIndex(currentIndex);
      const rightChildIndex = this.getRightChildIndex(currentIndex);
      let largestIndex = currentIndex;
      
      if (
        leftChildIndex < this.heap.length &&
        this.heap[leftChildIndex].averageScore > this.heap[largestIndex].averageScore
      ) {
        largestIndex = leftChildIndex;
      }
      
      if (
        rightChildIndex < this.heap.length &&
        this.heap[rightChildIndex].averageScore > this.heap[largestIndex].averageScore
      ) {
        largestIndex = rightChildIndex;
      }
      
      if (largestIndex !== currentIndex) {
        this.swap(currentIndex, largestIndex);
        currentIndex = largestIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Insert a location into the heap
   * Time Complexity: O(log n)
   */
  insert(location: LocationData): void {
    this.heap.push(location);
    this.bubbleUp();
  }

  /**
   * Extract the maximum (highest score) location
   * Time Complexity: O(log n)
   */
  extractMax(): LocationData | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop()!;
    
    const max = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown();
    
    return max;
  }

  /**
   * Peek at maximum without removing
   * Time Complexity: O(1)
   */
  peek(): LocationData | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  /**
   * Get size of heap
   * Time Complexity: O(1)
   */
  size(): number {
    return this.heap.length;
  }

  /**
   * Get all elements in heap order (doesn't modify heap)
   * Time Complexity: O(n)
   */
  getAll(): LocationData[] {
    return [...this.heap];
  }

  /**
   * Get sorted array from highest to lowest score
   * Time Complexity: O(n log n)
   */
  getSorted(): LocationData[] {
    const tempHeap = new MaxHeap();
    tempHeap.heap = [...this.heap];
    
    const sorted: LocationData[] = [];
    while (tempHeap.size() > 0) {
      const max = tempHeap.extractMax();
      if (max) sorted.push(max);
    }
    
    return sorted;
  }

  /**
   * Build heap from array of locations
   * Time Complexity: O(n log n) - could be optimized to O(n) with heapify
   */
  buildHeap(locations: LocationData[]): void {
    this.heap = [];
    locations.forEach(loc => this.insert(loc));
  }

  /**
   * Get heap array for visualization
   */
  getHeapArray(): LocationData[] {
    return this.heap;
  }

  /**
   * Get tree structure for visualization
   * Returns array of levels
   */
  getTreeLevels(): LocationData[][] {
    const levels: LocationData[][] = [];
    let level = 0;
    let levelStart = 0;
    
    while (levelStart < this.heap.length) {
      const levelSize = Math.pow(2, level);
      const levelEnd = Math.min(levelStart + levelSize, this.heap.length);
      levels.push(this.heap.slice(levelStart, levelEnd));
      levelStart = levelEnd;
      level++;
    }
    
    return levels;
  }
}

/**
 * Clamp any numeric-ish value to [0, 10]
 */
function clamp01x10(n: unknown): number {
  const v = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
}

/**
 * Compute a per-recording average score, accepting:
 *  - rec.averageScore (preferred if present)
 *  - rec.scores {importance, emotion, intensity, aesthetic}
 *  - legacy rec.score (single number)
 */
function recordingAverage(rec: any): number {
  if (rec && typeof rec === 'object') {
    if (Number.isFinite(rec.averageScore)) {
      return clamp01x10(rec.averageScore);
    }
    if (rec.scores && typeof rec.scores === 'object') {
      const s = rec.scores as {
        importance?: number | string;
        emotion?: number | string;
        intensity?: number | string;
        aesthetic?: number | string;
      };
      const imp  = clamp01x10(s.importance ?? 0);
      const emo  = clamp01x10(s.emotion ?? 0);
      const inten= clamp01x10(s.intensity ?? 0);
      const aest = clamp01x10(s.aesthetic ?? 0);
      return (imp + emo + inten + aest) / 4;
    }
    if (Number.isFinite(rec.score)) {
      return clamp01x10(rec.score);
    }
  }
  return 0;
}

/**
 * Average across a set of recordings (uses recordingAverage)
 */
function averageOfRecordings(recs: any[]): number {
  if (!Array.isArray(recs) || recs.length === 0) return 0;
  const vals = recs.map(recordingAverage);
  const sum = vals.reduce((a, b) => a + b, 0);
  return sum / vals.length;
}

/**
 * Helper to create LocationData from recordings
 */
export function createLocationData(
  locationId: string,
  locationName: string,
  recordings: any[]
): LocationData {
  const id = toLocationId(locationId);
  const locationRecordings = recordings.filter((r) => r.locationId === id);

  const averageScore = averageOfRecordings(locationRecordings);

  return {
    locationId: id,
    locationName,
    recordings: locationRecordings,
    averageScore,
    totalRecordings: locationRecordings.length,
    hasMemory: locationRecordings.some((r) => r.recordingType === 'memory'),
    hasObservation: locationRecordings.some((r) => r.recordingType === 'observation'),
  };
}
