import { useMemo } from 'react';

import type { Workout } from '@/core/domain';
import type { SessionSnapshot } from '@/core/engine/types';
import { findWorkout } from '@/state/customWorkoutStore';
import { useSessionStore } from '@/state/sessionStore';

/**
 * A session that is *running right now* (as opposed to the checkpoint banner,
 * which is about a session that died with the app).
 *
 * Backing out of the session screen does not stop anything – the engine keeps
 * ticking in the background – so every tab can offer a way back in.
 */
export interface ActiveSessionInfo {
  readonly active: boolean;
  readonly workout?: Workout;
  readonly snapshot?: SessionSnapshot;
}

export function useActiveSession(): ActiveSessionInfo {
  const plan = useSessionStore((s) => s.plan);
  const snapshot = useSessionStore((s) => s.snapshot);

  return useMemo(() => {
    const active =
      !!plan && !!snapshot && snapshot.phase !== 'idle' && snapshot.phase !== 'finished';
    if (!active) return { active: false };
    return { active: true, workout: findWorkout(plan?.workout.id), snapshot };
  }, [plan, snapshot]);
}
