import type { AppSettings, CustomWorkoutDraft, Exercise, SessionLog, Workout } from '@/core/domain';

/**
 * Repository interfaces – the *only* contract the app layer depends on for
 * data access. Today they are implemented by local storage adapters; a REST
 * or GraphQL implementation can be dropped in without touching the UI.
 */

export interface WorkoutRepository {
  listWorkouts(): Promise<readonly Workout[]>;
  getWorkout(id: string): Promise<Workout | undefined>;
  getExercise(id: string): Promise<Exercise | undefined>;
  /** Synchronous lookup used by the engine/metrics (content is preloaded). */
  exerciseLookup(): (id: string) => Exercise | undefined;
}

/**
 * User-created workouts. Stored as editable drafts; `WorkoutRepository`
 * compiles them into runnable `Workout`s so the rest of the app never has
 * to distinguish built-in from custom.
 */
export interface CustomWorkoutRepository {
  listDrafts(): Promise<readonly CustomWorkoutDraft[]>;
  getDraft(id: string): Promise<CustomWorkoutDraft | undefined>;
  saveDraft(draft: CustomWorkoutDraft): Promise<void>;
  deleteDraft(id: string): Promise<void>;
}

export interface SessionRepository {
  listSessions(): Promise<readonly SessionLog[]>;
  saveSession(log: SessionLog): Promise<void>;
  deleteSession(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SettingsRepository {
  load(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
}

export interface Repositories {
  readonly workouts: WorkoutRepository;
  readonly customWorkouts: CustomWorkoutRepository;
  readonly sessions: SessionRepository;
  readonly settings: SettingsRepository;
}
