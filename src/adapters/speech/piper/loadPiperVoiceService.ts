import { Platform } from 'react-native';

import type { PiperVoiceService } from './PiperVoiceService.types';

let servicePromise: Promise<PiperVoiceService> | undefined;

/**
 * Load the native Piper bridge only on iOS/Android. The regular Expo Go client
 * cannot load this custom native module; use the project's piper-poc APK build.
 */
export function getPiperVoiceService(): Promise<PiperVoiceService> {
  if (Platform.OS === 'web') {
    return Promise.reject(new Error('The Piper voice proof of concept runs in a native Android build, not in the web preview.'));
  }
  servicePromise ??= import('./PiperVoiceService.native').then((module) => module.getNativePiperVoiceService());
  return servicePromise;
}
