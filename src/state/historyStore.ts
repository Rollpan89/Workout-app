import { create } from 'zustand';

import type { SessionLog } from '@/core/domain';
import { getRepositories } from '@/data';

interface HistoryState {
  logs: readonly SessionLog[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (log: SessionLog) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  logs: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const logs = await getRepositories().sessions.listSessions();
      set({ logs, hydrated: true });
    } catch (error) {
      console.warn('[history] hydrate failed', error);
      set({ hydrated: true });
    }
  },

  add: async (log) => {
    // Optimistic update so the summary screen can render instantly
    set({ logs: [log, ...get().logs.filter((l) => l.id !== log.id)] });
    await getRepositories().sessions.saveSession(log);
  },

  remove: async (id) => {
    set({ logs: get().logs.filter((l) => l.id !== id) });
    await getRepositories().sessions.deleteSession(id);
  },

  clear: async () => {
    set({ logs: [] });
    await getRepositories().sessions.clear();
  },
}));
