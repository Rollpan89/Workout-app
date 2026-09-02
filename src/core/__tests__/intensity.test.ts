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
    expect(stepIntensity(1.0, 1)).toBe(1.2);
    expect(stepIntensity(1.0, -1)).toBe(0.8);
    expect(stepIntensity(1.4, 1)).toBe(1.4);
    expect(stepIntensity(0.6, -1)).toBe(0.6);
  });

  it('exposes a label key for every level', () => {
    for (const level of INTENSITY_LEVELS) {
      expect(typeof intensityLabelKey(level)).toBe('string');
    }
    expect(intensityLabelKey(1.0)).toBe('normal');
    expect(intensityLabelKey(1.4)).toBe('max');
  });

  it('type-guards numbers', () => {
    expect(isIntensityLevel(1.2)).toBe(true);
    expect(isIntensityLevel(1.1)).toBe(false);
  });

  it('maps readiness to a starting intensity', () => {
    expect(intensityForReadiness('low')).toBe(0.8);
    expect(intensityForReadiness('normal')).toBe(1.0);
    expect(intensityForReadiness('high')).toBe(1.2);
  });

  it('scales reps and time, never below 1 rep / 5 s', () => {
    expect(resolvePrescription({ kind: 'reps', reps: 10 }, 1.2)).toEqual({ kind: 'reps', reps: 12 });
    expect(resolvePrescription({ kind: 'reps', reps: 1 }, 0.6)).toEqual({ kind: 'reps', reps: 1 });
    expect(resolvePrescription({ kind: 'time', seconds: 30 }, 0.6)).toEqual({ kind: 'time', seconds: 18 });
    expect(resolvePrescription({ kind: 'time', seconds: 5 }, 0.6)).toEqual({ kind: 'time', seconds: 5 });
  });

  it('scales rest inversely with intensity and clamps', () => {
    expect(resolveRestSeconds(60, 1.0)).toBe(60);
    expect(resolveRestSeconds(60, 1.2)).toBe(50);
    expect(resolveRestSeconds(60, 0.8)).toBe(75);
    expect(resolveRestSeconds(0, 1.0)).toBe(0);
    expect(resolveRestSeconds(3, 1.4)).toBe(5);
    expect(resolveRestSeconds(10_000, 0.6)).toBe(600);
  });
});
