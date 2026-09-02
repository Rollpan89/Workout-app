import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from './KeyValueStore';

const NAMESPACE = 'pulsecoach:v1:';

export class AsyncStorageStore implements KeyValueStore {
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await AsyncStorage.getItem(NAMESPACE + key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch (error) {
      console.warn(`[storage] failed to read "${key}"`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(NAMESPACE + key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(NAMESPACE + key);
  }
}
