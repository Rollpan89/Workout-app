import type { AppSettings, Exercise, SessionLog, Workout } from '@/core/domain';

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
  readonly sessions: SessionRepository;
  readonly settings: SettingsRepository;
}
