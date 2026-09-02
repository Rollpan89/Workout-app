import { createLocalRepositories } from './repositories/local';
import type { Repositories } from './repositories/types';
import { AsyncStorageStore } from './storage/AsyncStorageStore';

export * from './repositories/types';
export * from './repositories/local';
export * from './storage/KeyValueStore';
export * from './storage/AsyncStorageStore';

let instance: Repositories | undefined;

/**
 * App-wide repository singleton. Swap the factory here (or inject via
 * `setRepositories`) to point the app at a remote backend.
 */
export function getRepositories(): Repositories {
  instance ??= createLocalRepositories(new AsyncStorageStore());
  return instance;
}

export function setRepositories(repos: Repositories): void {
  instance = repos;
}
