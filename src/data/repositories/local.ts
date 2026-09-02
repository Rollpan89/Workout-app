import { EXERCISES, getExercise, WORKOUTS } from '@/content';
import { DEFAULT_SETTINGS, type AppSettings, type Exercise, type SessionLog, type Workout } from '@/core/domain';

import type { KeyValueStore } from '../storage/KeyValueStore';
import type { Repositories, SessionRepository, SettingsRepository, WorkoutRepository } from './types';

const KEYS = {
  sessions: 'sessions',
  settings: 'settings',
} as const;

/** Workouts ship with the app bundle, so this repository is fully in-memory. */
export class StaticWorkoutRepository implements WorkoutRepository {
  constructor(
    private readonly workouts: readonly Workout[] = WORKOUTS,
    private readonly exercises: readonly Exercise[] = EXERCISES,
  ) {}

  async listWorkouts(): Promise<readonly Workout[]> {
    return this.workouts;
  }

  async getWorkout(id: string): Promise<Workout | undefined> {
    return this.workouts.find((w) => w.id === id);
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    return this.exercises.find((e) => e.id === id);
  }

  exerciseLookup(): (id: string) => Exercise | undefined {
    if (this.exercises === EXERCISES) return getExercise;
    const map = new Map(this.exercises.map((e) => [e.id, e]));
    return (id) => map.get(id);
  }
}

export class LocalSessionRepository implements SessionRepository {
  constructor(private readonly store: KeyValueStore) {}

  async listSessions(): Promise<readonly SessionLog[]> {
    const logs = (await this.store.get<SessionLog[]>(KEYS.sessions)) ?? [];
    return [...logs].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  }

  async saveSession(log: SessionLog): Promise<void> {
    const logs = (await this.store.get<SessionLog[]>(KEYS.sessions)) ?? [];
    const next = [log, ...logs.filter((l) => l.id !== log.id)];
    await this.store.set(KEYS.sessions, next);
  }

  async deleteSession(id: string): Promise<void> {
    const logs = (await this.store.get<SessionLog[]>(KEYS.sessions)) ?? [];
    await this.store.set(
      KEYS.sessions,
      logs.filter((l) => l.id !== id),
    );
  }

  async clear(): Promise<void> {
    await this.store.remove(KEYS.sessions);
  }
}

export class LocalSettingsRepository implements SettingsRepository {
  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<AppSettings> {
    const stored = await this.store.get<Partial<AppSettings>>(KEYS.settings);
    return mergeSettings(stored);
  }

  async save(settings: AppSettings): Promise<void> {
    await this.store.set(KEYS.settings, settings);
  }
}

/** Deep-merge stored settings over defaults so new fields get sane values. */
export function mergeSettings(stored: Partial<AppSettings> | undefined): AppSettings {
  if (!stored) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    voice: { ...DEFAULT_SETTINGS.voice, ...(stored.voice ?? {}) },
    profile: { ...DEFAULT_SETTINGS.profile, ...(stored.profile ?? {}) },
  };
}

export function createLocalRepositories(store: KeyValueStore): Repositories {
  return {
    workouts: new StaticWorkoutRepository(),
    sessions: new LocalSessionRepository(store),
    settings: new LocalSettingsRepository(store),
  };
}
