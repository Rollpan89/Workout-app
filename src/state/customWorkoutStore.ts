import { create } from 'zustand';

import { getExercise, getWorkout as getBuiltInWorkout, WORKOUTS } from '@/content';
import {
  compileDraft,
  createEmptyDraft,
  draftFromWorkout,
  nextAccent,
  type CustomWorkoutDraft,
  type Workout,
} from '@/core/domain';
import { createId } from '@/core/utils/id';
import { getRepositories } from '@/data';

interface CustomWorkoutState {
  drafts: readonly CustomWorkoutDraft[];
  /** Compiled, runnable versions of `drafts` (same order). */
  workouts: readonly Workout[];
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
}

const compile = (drafts: readonly CustomWorkoutDraft[]) => drafts.map((d) => compileDraft(d, getExercise));

export const useCustomWorkoutStore = create<CustomWorkoutState>((set, get) => ({
  drafts: [],
  workouts: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const drafts = await getRepositories().customWorkouts.listDrafts();
      set({ drafts, workouts: compile(drafts), hydrated: true });
    } catch (error) {
      console.warn('[customWorkouts] hydrate failed', error);
      set({ hydrated: true });
    }
  },

  save: async (draft) => {
    const stamped: CustomWorkoutDraft = { ...draft, name: draft.name.trim(), updatedAt: new Date().toISOString() };
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

  newDraft: () => createEmptyDraft(createId('cw'), nextAccent([...WORKOUTS, ...get().drafts]), new Date().toISOString()),

  duplicate: (source, name) =>
    draftFromWorkout(source, createId('cw'), name, nextAccent([...WORKOUTS, ...get().drafts]), new Date().toISOString()),

  getDraft: (id) => get().drafts.find((d) => d.id === id),
}));

/** Resolve any workout id – built-in first, then the user's own. */
export function findWorkout(id: string | undefined): Workout | undefined {
  if (!id) return undefined;
  return getBuiltInWorkout(id) ?? useCustomWorkoutStore.getState().workouts.find((w) => w.id === id);
}

/** Reactive variant of `findWorkout` for screens. */
export function useWorkout(id: string | undefined): Workout | undefined {
  const custom = useCustomWorkoutStore((s) => s.workouts);
  if (!id) return undefined;
  return getBuiltInWorkout(id) ?? custom.find((w) => w.id === id);
}
