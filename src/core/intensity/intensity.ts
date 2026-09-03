import type { ReadinessLevel } from '../domain/session';
import type { SetPrescription } from '../domain/workout';

/**
 * Intensity is a scalar multiplier applied to the *volume* of a workout:
 * higher intensity → more reps / longer holds / shorter rest.
 *
 * The rep *cadence* is intentionally NOT affected – a steady, predictable
 * tempo is what makes audio-only counting work.
 *
 * The scale is discrete so that the coach can name each level out loud and
 * the user can reason about "one step up".
 */
export const INTENSITY_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5] as const;

export type IntensityLevel = (typeof INTENSITY_LEVELS)[number];

export type IntensityLabelKey = 'light' | 'easy' | 'normal' | 'hard' | 'max';

export const INTENSITY_LABEL_KEYS: Readonly<Record<IntensityLevel, IntensityLabelKey>> = {
  0.5: 'light',
  0.75: 'easy',
  1.0: 'normal',
  1.25: 'hard',
  1.5: 'max',
};

export const DEFAULT_INTENSITY: IntensityLevel = 1.0;

export const MIN_REST_SECONDS = 5;
export const MAX_REST_SECONDS = 600;

export function isIntensityLevel(value: number): value is IntensityLevel {
  return (INTENSITY_LEVELS as readonly number[]).includes(value);
}

export function intensityIndex(level: IntensityLevel): number {
  return INTENSITY_LEVELS.indexOf(level);
}

/** Step the intensity up (+1) or down (-1); clamps at the ends of the scale. */
export function stepIntensity(current: IntensityLevel, delta: 1 | -1): IntensityLevel {
  const idx = intensityIndex(current);
  const next = Math.min(INTENSITY_LEVELS.length - 1, Math.max(0, idx + delta));
  return INTENSITY_LEVELS[next] ?? DEFAULT_INTENSITY;
}

export function intensityLabelKey(level: IntensityLevel): IntensityLabelKey {
  return INTENSITY_LABEL_KEYS[level];
}

/** Map the user's daily-form check-in to a sensible starting intensity. */
export function intensityForReadiness(readiness: ReadinessLevel): IntensityLevel {
  switch (readiness) {
    case 'low':
      return 0.75;
    case 'high':
      return 1.25;
    case 'normal':
    default:
      return 1.0;
  }
}

export type ResolvedPrescription =
  | { readonly kind: 'reps'; readonly reps: number }
  | { readonly kind: 'time'; readonly seconds: number };

/** Apply intensity to a set prescription. Always yields at least 1 rep / 5 s. */
export function resolvePrescription(
  prescription: SetPrescription,
  intensity: IntensityLevel,
): ResolvedPrescription {
  if (prescription.kind === 'reps') {
    return { kind: 'reps', reps: Math.max(1, Math.round(prescription.reps * intensity)) };
  }
  return { kind: 'time', seconds: Math.max(5, Math.round(prescription.seconds * intensity)) };
}

/** Apply intensity to a rest duration. Rest scales *inversely* with intensity. */
export function resolveRestSeconds(baseSeconds: number, intensity: IntensityLevel): number {
  if (baseSeconds <= 0) return 0;
  const scaled = Math.round(baseSeconds / intensity);
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, scaled));
}
