import type { SessionLog } from '../domain';
import type { SessionSnapshot } from '../engine/types';
import {
  buildSessionLog,
  caloriesFor,
  computeSessionMetrics,
  computeStreak,
  summarizeHistory,
} from '../metrics/metrics';
import { lookup, plan } from '../testing/fixtures';

const profile = { displayName: 'Test', bodyweightKg: 80, sex: 'unspecified' as const, goal: 'strength' as const };

function snapshot(overrides: Partial<SessionSnapshot['stats']> = {}): SessionSnapshot {
  return {
    phase: 'finished',
    stepIndex: 2,
    totalSteps: 3,
    intensity: 1.0,
    interactionLevel: 'handsFree',
    repsDone: 0,
    workElapsedSeconds: 0,
    restRemainingSeconds: 0,
    restTotalSeconds: 0,
    announceRemainingSeconds: 0,
    sessionElapsedSeconds: 60,
    startedAt: 1_000_000,
    stats: {
      completedSets: [
        { stepIndex: 0, exerciseId: 'squat', reps: 10, seconds: 20, intensity: 1.0 },
        { stepIndex: 1, exerciseId: 'squat', reps: 10, seconds: 20, intensity: 1.25 },
        { stepIndex: 2, exerciseId: 'plank', reps: 0, seconds: 30, intensity: 1.25 },
      ],
      workSeconds: 70,
      restSeconds: 30,
      pausedSeconds: 0,
      intensitySecondsSum: 20 * 1.0 + 20 * 1.25 + 30 * 1.25 + 30 * 1.25,
      ...overrides,
    },
  };
}

describe('caloriesFor', () => {
  it('implements MET × 3.5 × kg / 200 per minute', () => {
    // MET 5, 80 kg, 1 minute → 5 × 3.5 × 80 / 200 = 7 kcal
    expect(caloriesFor(5, 60, 80)).toBeCloseTo(7, 5);
  });

  it('returns 0 for non-positive inputs', () => {
    expect(caloriesFor(0, 60, 80)).toBe(0);
    expect(caloriesFor(5, 0, 80)).toBe(0);
    expect(caloriesFor(5, 60, 0)).toBe(0);
  });
});

describe('computeSessionMetrics', () => {
  it('sums reps and sets', () => {
    const m = computeSessionMetrics(snapshot(), profile, lookup);
    expect(m.totalReps).toBe(20);
    expect(m.totalSets).toBe(3);
  });

  it('estimates calories including rest', () => {
    const m = computeSessionMetrics(snapshot(), profile, lookup);
    expect(m.estimatedCalories).toBeGreaterThan(0);
    // Sanity: a 2-minute mixed session for 80 kg should be well under 50 kcal
    expect(m.estimatedCalories).toBeLessThan(50);
  });

  it('normalises muscle impact so the top group is 1', () => {
    const m = computeSessionMetrics(snapshot(), profile, lookup);
    // quads: 10×1×1.0 + 10×1×1.25 = 22.5; glutes: 0.8 × 22.5 = 18
    // core (plank, time-based): 30 s / 1 s-per-rep × 1 × 1.25 = 37.5 → the max
    expect(m.muscleImpact.core).toBe(1);
    expect(m.muscleImpact.quads).toBeCloseTo(22.5 / 37.5, 2);
    expect(m.muscleImpact.glutes).toBeCloseTo(18 / 37.5, 2);
  });

  it('keeps the ratio between groups of the same exercise', () => {
    const m = computeSessionMetrics(
      snapshot({
        completedSets: [{ stepIndex: 0, exerciseId: 'squat', reps: 10, seconds: 20, intensity: 1.0 }],
      }),
      profile,
      lookup,
    );
    expect(m.muscleImpact.quads).toBe(1);
    expect(m.muscleImpact.glutes).toBeCloseTo(0.8, 2);
    expect(m.muscleImpact.core).toBeUndefined();
  });

  it('computes time-weighted average intensity', () => {
    const m = computeSessionMetrics(snapshot(), profile, lookup);
    // (20 + 25 + 37.5 + 37.5) / 100 = 1.2
    expect(m.averageIntensity).toBeCloseTo(1.2, 2);
  });

  it('handles an empty session', () => {
    const m = computeSessionMetrics(
      snapshot({ completedSets: [], workSeconds: 0, restSeconds: 0, intensitySecondsSum: 0 }),
      profile,
      lookup,
    );
    expect(m.estimatedCalories).toBe(0);
    expect(m.muscleImpact).toEqual({});
    expect(m.averageIntensity).toBe(1.0);
  });
});

describe('buildSessionLog', () => {
  it('produces a persisted log record', () => {
    const log = buildSessionLog(plan(), snapshot(), true, profile, lookup, 2_000_000);
    expect(log.workoutId).toBe('test-workout');
    expect(log.completed).toBe(true);
    expect(log.durationSeconds).toBe(60);
    expect(log.workSeconds).toBe(70);
    expect(log.startedAt).toBe(new Date(1_000_000).toISOString());
    expect(log.endedAt).toBe(new Date(2_000_000).toISOString());
    expect(log.id).toMatch(/^session_/);
  });
});

describe('history', () => {
  const DAY = 86_400_000;
  const now = new Date(2026, 8, 2, 12).getTime();
  const mk = (endedAt: number, extra: Partial<SessionLog> = {}): SessionLog => ({
    id: `s${endedAt}`,
    workoutId: 'w',
    startedAt: new Date(endedAt - 600_000).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    durationSeconds: 600,
    workSeconds: 400,
    completed: true,
    averageIntensity: 1,
    totalReps: 50,
    totalSets: 5,
    estimatedCalories: 100,
    muscleImpact: { quads: 1, core: 0.5 },
    ...extra,
  });

  it('counts a streak ending today', () => {
    expect(computeStreak([mk(now), mk(now - DAY), mk(now - 2 * DAY)], now)).toBe(3);
  });

  it('keeps the streak alive if the last session was yesterday', () => {
    expect(computeStreak([mk(now - DAY), mk(now - 2 * DAY)], now)).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    expect(computeStreak([mk(now - 2 * DAY), mk(now - 3 * DAY)], now)).toBe(0);
    expect(computeStreak([mk(now), mk(now - 2 * DAY)], now)).toBe(1);
  });

  it('summarises totals and muscle balance', () => {
    const s = summarizeHistory([mk(now), mk(now - DAY, { muscleImpact: { core: 1 } })], now);
    expect(s.sessions).toBe(2);
    expect(s.totalCalories).toBe(200);
    expect(s.totalMinutes).toBe(20);
    expect(s.totalReps).toBe(100);
    expect(s.streakDays).toBe(2);
    expect(s.muscleImpact.core).toBe(1); // 0.5 + 1 = 1.5 is the max
    expect(s.muscleImpact.quads).toBeCloseTo(0.67, 2);
  });

  it('handles empty history', () => {
    const s = summarizeHistory([], now);
    expect(s.sessions).toBe(0);
    expect(s.streakDays).toBe(0);
    expect(s.muscleImpact).toEqual({});
  });
});
