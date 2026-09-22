import { useMemo } from 'react';
import { create } from 'zustand';

import { getExercise, getWorkout as getBuiltInWorkout, WORKOUTS } from '@/content';
import {
  compileDraft,
  createEmptyDraft,
  draftFromWorkout,
  lz,
  nextAccent,
  resolveLocalized,
  type CustomWorkoutDraft,
  type LocalizedString,
  type Workout,
  type WorkoutOverride,
} from '@/core/domain';
import { createId } from '@/core/utils/id';
import { getRepositories } from '@/data';

interface CustomWorkoutState {
  drafts: readonly CustomWorkoutDraft[];
  /** Compiled, runnable versions of `drafts` (same order). */
  workouts: readonly Workout[];
  /**
   * Admin: user-made replacements for the built-in programs, keyed by
   * workout id. Anything not overridden stays exactly as it shipped.
   */
  overrides: readonly WorkoutOverride[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Persist a draft (create or update). Returns the compiled workout. */
  save: (draft: CustomWorkoutDraft) => Promise<Workout>;
  remove: (id: string) => Promise<void>;
  /** Fresh empty draft with the least-used accent. Not persisted until `save`. */
  newDraft: () => CustomWorkoutDraft;
  /** Draft copied from any workout (built-in or custom). Not persisted until `save`. */
  duplicate: (source: Workout, name: string) => CustomWorkoutDraft;
  getDraft: (id: string) => CustomWorkoutDraft | undefined;
  /** Admin: the editable version of a built-in workout (existing edit or a copy). */
  overrideDraft: (workoutId: string) => CustomWorkoutDraft | undefined;
  /** Admin: store a user version of a built-in workout. */
  saveOverride: (workoutId: string, draft: CustomWorkoutDraft) => Promise<Workout | undefined>;
  /** Admin: drop the user version so the original ships again. */
  removeOverride: (workoutId: string) => Promise<void>;
  removeAllOverrides: () => Promise<void>;
  /** A built-in workout as it currently plays (override applied when one exists). */
  effectiveWorkout: (id: string) => Workout | undefined;
  isOverridden: (workoutId: string) => boolean;
}

const compile = (drafts: readonly CustomWorkoutDraft[]) =>
  drafts.map((d) => compileDraft(d, getExercise));

/**
 * A built-in workout with the user's admin edit applied. The draft carries
 * the built-in id, so the compiled workout takes the original's place
 * everywhere. Tagline/description stay from the original (they describe the
 * program, not the sets) unless the admin renamed it in the builder.
 */
export function applyOverride(workout: Workout, override: WorkoutOverride | undefined): Workout {
  if (!override) return workout;
  const compiled = compileDraft({ ...override.draft, id: workout.id }, getExercise);
  const name = override.draft.name.trim();
  const originalTitle = resolveLocalized(workout.title, 'sv');
  const title: LocalizedString =
    name.length > 0 && name !== originalTitle ? lz(name, name) : workout.title;
  return {
    ...compiled,
    title,
    tagline: workout.tagline,
    description: workout.description,
    custom: workout.custom,
    createdAt: workout.createdAt,
  };
}

/** Built-in programs with the user's admin edits applied, in shipped order. */
export function applyOverrides(
  base: readonly Workout[],
  overrides: readonly WorkoutOverride[],
): readonly Workout[] {
  if (overrides.length === 0) return base;
  const byId = new Map(overrides.map((o) => [o.workoutId, o]));
  return base.map((workout) => applyOverride(workout, byId.get(workout.id)));
}

export const useCustomWorkoutStore = create<CustomWorkoutState>((set, get) => ({
  drafts: [],
  workouts: [],
  overrides: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const [drafts, overrides] = await Promise.all([
        getRepositories().customWorkouts.listDrafts(),
        getRepositories().customWorkouts.listOverrides(),
      ]);
      set({ drafts, workouts: compile(drafts), overrides, hydrated: true });
    } catch (error) {
      console.warn('[customWorkouts] hydrate failed', error);
      set({ hydrated: true });
    }
  },

  save: async (draft) => {
    const stamped: CustomWorkoutDraft = {
      ...draft,
      name: draft.name.trim(),
      updatedAt: new Date().toISOString(),
    };
    const drafts = [stamped, ...get().drafts.filter((d) => d.id !== stamped.id)];
    const workouts = compile(drafts);
    set({ drafts, workouts });
    await getRepositories().customWorkouts.saveDraft(stamped);
    return workouts[0] as Workout;
  },

  remove: async (id) => {
    const drafts = get().drafts.filter((d) => d.id !== id);
    set({ drafts, workouts: compile(drafts) });
    await getRepositories().customWorkouts.deleteDraft(id);
  },

  newDraft: () =>
    createEmptyDraft(
      createId('cw'),
      nextAccent([...WORKOUTS, ...get().drafts]),
      new Date().toISOString(),
    ),

  duplicate: (source, name) =>
    draftFromWorkout(
      source,
      createId('cw'),
      name,
      nextAccent([...WORKOUTS, ...get().drafts]),
      new Date().toISOString(),
    ),

  getDraft: (id) => get().drafts.find((d) => d.id === id),

  overrideDraft: (workoutId) => {
    const existing = get().overrides.find((o) => o.workoutId === workoutId);
    if (existing) return existing.draft;
    const source = getBuiltInWorkout(workoutId);
    if (!source) return undefined;
    // Keyed by the built-in id so the compiled result replaces the original;
    // the name is only a fallback – the builder shows the resolved title.
    return draftFromWorkout(
      source,
      source.id,
      source.title.sv,
      source.accent,
      new Date().toISOString(),
    );
  },

  saveOverride: async (workoutId, draft) => {
    if (!getBuiltInWorkout(workoutId)) return undefined;
    const stamped: WorkoutOverride = {
      workoutId,
      draft: {
        ...draft,
        id: workoutId,
        name: draft.name.trim(),
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    const overrides = [stamped, ...get().overrides.filter((o) => o.workoutId !== workoutId)];
    set({ overrides });
    await getRepositories().customWorkouts.saveOverride(stamped);
    return applyOverrides(WORKOUTS, overrides).find((w) => w.id === workoutId);
  },

  removeOverride: async (workoutId) => {
    const overrides = get().overrides.filter((o) => o.workoutId !== workoutId);
    set({ overrides });
    await getRepositories().customWorkouts.deleteOverride(workoutId);
  },

  removeAllOverrides: async () => {
    const previous = get().overrides;
    set({ overrides: [] });
    await Promise.all(
      previous.map((o) => getRepositories().customWorkouts.deleteOverride(o.workoutId)),
    );
  },

  effectiveWorkout: (id) => {
    const builtIn = getBuiltInWorkout(id);
    if (!builtIn) return get().workouts.find((w) => w.id === id);
    return applyOverrides(WORKOUTS, get().overrides).find((w) => w.id === id) ?? builtIn;
  },

  isOverridden: (workoutId) => get().overrides.some((o) => o.workoutId === workoutId),
}));

/** Resolve any workout id – built-in (with admin edits) first, then the user's own. */
export function findWorkout(id: string | undefined): Workout | undefined {
  if (!id) return undefined;
  const custom = useCustomWorkoutStore.getState().workouts.find((w) => w.id === id);
  if (custom) return custom;
  return useCustomWorkoutStore.getState().effectiveWorkout(id);
}

/** Reactive variant of `findWorkout` for screens. */
export function useWorkout(id: string | undefined): Workout | undefined {
  const custom = useCustomWorkoutStore((s) => s.workouts);
  const overrides = useCustomWorkoutStore((s) => s.overrides);
  if (!id) return undefined;
  const mine = custom.find((w) => w.id === id);
  if (mine) return mine;
  const base = getBuiltInWorkout(id);
  if (!base) return undefined;
  return applyOverride(
    base,
    overrides.find((o) => o.workoutId === id),
  );
}

/** Reactive built-in list (admin edits applied) for the library and admin screens. */
export function useBuiltInWorkouts(): readonly Workout[] {
  const overrides = useCustomWorkoutStore((s) => s.overrides);
  return useMemo(() => applyOverrides(WORKOUTS, overrides), [overrides]);
}
