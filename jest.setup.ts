// Global Jest setup. Mocks native modules that have no JS fallback in the
// test environment so that pure-logic modules can be tested in isolation.

// Reanimated v4 sits on top of react-native-worklets; both ship Jest mocks.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
  useKeepAwake: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
   
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
