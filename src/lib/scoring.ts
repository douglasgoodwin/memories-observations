// src/lib/scoring.ts
export type FourScores = {
  importance?: number | string;
  emotion?: number | string;
  intensity?: number | string;
  aesthetic?: number | string;
};

// Clamp to [0,10]
const clamp01x10 = (n: unknown) => {
  const v = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
};

// Compute average for a single recording that may have
//   - scores {importance, emotion, intensity, aesthetic}, or
//   - averageScore, or
//   - legacy score
export function recordingAverage(rec: any): number {
  if (rec && typeof rec === 'object') {
    if (Number.isFinite(rec.averageScore)) {
      return clamp01x10(rec.averageScore);
    }
    if (rec.scores && typeof rec.scores === 'object') {
      const s = rec.scores as FourScores;
      const imp = clamp01x10(s.importance ?? 0);
      const emo = clamp01x10(s.emotion ?? 0);
      const inten = clamp01x10(s.intensity ?? 0);
      const aest = clamp01x10(s.aesthetic ?? 0);
      return (imp + emo + inten + aest) / 4;
    }
    if (Number.isFinite(rec.score)) {
      return clamp01x10(rec.score);
    }
  }
  return 0;
}

// Average across many recordings (for a location)
export function averageOfRecordings(recs: any[]): number {
  if (!Array.isArray(recs) || recs.length === 0) return 0;
  const vals = recs.map(recordingAverage);
  const sum = vals.reduce((a, b) => a + b, 0);
  return sum / vals.length;
}
