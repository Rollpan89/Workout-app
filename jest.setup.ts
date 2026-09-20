// Global Jest setup. Mocks native modules that have no JS fallback in the
// test environment so that pure-logic modules can be tested in isolation.

// Reanimated v4 sits on top of react-native-worklets; both ship Jest mocks.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

jest.mock('expo-speech', () => ({
  // Complete immediately in Jest so tests model a successful TTS utterance
  // without waiting for the adapter's real-device watchdog timeout.
  speak: jest.fn((_text: string, options?: { onDone?: () => void }) => options?.onDone?.()),
  stop: jest.fn(() => Promise.resolve()),
  pause: jest.fn(() => Promise.resolve()),
  resume: jest.fn(() => Promise.resolve()),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
  getAvailableVoicesAsync: jest.fn(() =>
    Promise.resolve([
      { identifier: 'com.apple.voice.compact.sv-SE.Alva', name: 'Alva', language: 'sv-SE', quality: 'Default' },
      { identifier: 'com.apple.voice.premium.sv-SE.Klara', name: 'Klara (Premium)', language: 'sv-SE', quality: 'Enhanced' },
      { identifier: 'com.apple.voice.enhanced.en-US.Samantha', name: 'Samantha', language: 'en-US', quality: 'Enhanced' },
    ]),
  ),
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
  maxSpeechInputLength: 4000,
}));

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    loop: false,
    volume: 1,
  })),
}));

jest.mock('expo-screen-orientation', () => ({
  unlockAsync: jest.fn(() => Promise.resolve()),
  lockAsync: jest.fn(() => Promise.resolve()),
  OrientationLock: { PORTRAIT_UP: 3, DEFAULT: 0 },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-navigation-bar', () => {
  const setHidden = jest.fn();
  const setStyle = jest.fn();
  return {
    setHidden,
    setStyle,
    setVisibilityAsync: jest.fn(() => Promise.resolve()),
    getVisibilityAsync: jest.fn(() => Promise.resolve('visible')),
    NavigationBar: Object.assign(() => null, { setHidden, setStyle }),
  };
});

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
  useKeepAwake: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
   
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
