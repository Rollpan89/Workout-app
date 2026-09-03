import {
  INTENSITY_LEVELS,
  intensityForReadiness,
  intensityLabelKey,
  isIntensityLevel,
  resolvePrescription,
  resolveRestSeconds,
  stepIntensity,
} from '../intensity/intensity';

describe('intensity', () => {
  it('steps up and down and clamps at the ends', () => {
    expect(stepIntensity(1.0, 1)).toBe(1.25);
    expect(stepIntensity(1.0, -1)).toBe(0.75);
    expect(stepIntensity(1.5, 1)).toBe(1.5);
    expect(stepIntensity(0.5, -1)).toBe(0.5);
  });

  it('exposes a label key for every level', () => {
    for (const level of INTENSITY_LEVELS) {
      expect(typeof intensityLabelKey(level)).toBe('string');
    }
    expect(intensityLabelKey(1.0)).toBe('normal');
    expect(intensityLabelKey(1.5)).toBe('max');
  });

  it('type-guards numbers', () => {
    expect(isIntensityLevel(1.25)).toBe(true);
    expect(isIntensityLevel(1.2)).toBe(false);
  });

  it('maps readiness to a starting intensity', () => {
    expect(intensityForReadiness('low')).toBe(0.75);
    expect(intensityForReadiness('normal')).toBe(1.0);
    expect(intensityForReadiness('high')).toBe(1.25);
  });

  it('scales reps and time, never below 1 rep / 5 s', () => {
    expect(resolvePrescription({ kind: 'reps', reps: 10 }, 1.25)).toEqual({ kind: 'reps', reps: 13 });
    expect(resolvePrescription({ kind: 'reps', reps: 10 }, 1.5)).toEqual({ kind: 'reps', reps: 15 });
    expect(resolvePrescription({ kind: 'reps', reps: 10 }, 0.5)).toEqual({ kind: 'reps', reps: 5 });
    expect(resolvePrescription({ kind: 'reps', reps: 1 }, 0.5)).toEqual({ kind: 'reps', reps: 1 });
    expect(resolvePrescription({ kind: 'time', seconds: 30 }, 0.5)).toEqual({ kind: 'time', seconds: 15 });
    expect(resolvePrescription({ kind: 'time', seconds: 5 }, 0.5)).toEqual({ kind: 'time', seconds: 5 });
  });

  it('scales rest inversely with intensity and clamps', () => {
    expect(resolveRestSeconds(60, 1.0)).toBe(60);
    expect(resolveRestSeconds(60, 1.25)).toBe(48);
    expect(resolveRestSeconds(60, 0.75)).toBe(80);
    expect(resolveRestSeconds(0, 1.0)).toBe(0);
    expect(resolveRestSeconds(3, 1.5)).toBe(5);
    expect(resolveRestSeconds(10_000, 0.5)).toBe(600);
  });
});
