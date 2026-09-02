import { create } from 'zustand';

import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type InteractionLevel,
  type Locale,
  type UserProfile,
  type VoiceSettings,
} from '@/core/domain';
import { getRepositories } from '@/data';

interface SettingsState {
  settings: AppSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLocale: (locale: Locale) => void;
  setInteractionLevel: (level: InteractionLevel) => void;
  updateVoice: (patch: Partial<VoiceSettings>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  setKeepScreenAwake: (value: boolean) => void;
}

function persist(settings: AppSettings): void {
  getRepositories()
    .settings.save(settings)
    .catch((error) => console.warn('[settings] persist failed', error));
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const update = (patch: (s: AppSettings) => AppSettings) => {
    const next = patch(get().settings);
    set({ settings: next });
    persist(next);
  };

  return {
    settings: DEFAULT_SETTINGS,
    hydrated: false,

    hydrate: async () => {
      try {
        const settings = await getRepositories().settings.load();
        set({ settings, hydrated: true });
      } catch (error) {
        console.warn('[settings] hydrate failed', error);
        set({ hydrated: true });
      }
    },

    setLocale: (locale) => update((s) => ({ ...s, locale })),
    setInteractionLevel: (interactionLevel) => update((s) => ({ ...s, interactionLevel })),
    updateVoice: (patch) => update((s) => ({ ...s, voice: { ...s.voice, ...patch } })),
    updateProfile: (patch) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    setKeepScreenAwake: (keepScreenAwake) => update((s) => ({ ...s, keepScreenAwake })),
  };
});

/** Selector helpers */
export const selectLocale = (s: SettingsState) => s.settings.locale;
export const selectSettings = (s: SettingsState) => s.settings;
