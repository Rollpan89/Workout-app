# Piper voice proof of concept

## Review target

The first prototype targets Android and uses the US English male `norman-medium` Piper-compatible VITS model as a **provisional test candidate**, not an approved voice. It has not yet been auditioned against the female reference, so the POC does not establish that it is equally natural. Its model card describes one US English male speaker, medium quality, 22.05 kHz audio, and a public-domain LibriVox dataset. The Sherpa release archive is 67,203,672 bytes (about 64.1 MiB compressed). The corresponding model is listed as public-domain/commercial-use-yes in the React Native Sherpa model license inventory, but that inventory is not legal clearance; confirm the terms again before a store release.

- [Norman model card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/norman/medium/MODEL_CARD)
- [Sherpa-ONNX model archive](https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-norman-medium.tar.bz2)
- [Sherpa model-license inventory](https://github.com/XDcobra/react-native-sherpa-onnx/blob/main/android/src/main/assets/model_licenses/tts-models-license-status.csv)

## What the POC does

- Exposes a developer-only **Piper voice lab** from Settings. `EXPO_PUBLIC_PIPER_POC=1` enables it in the dedicated review APK; development builds also show it.
- Downloads the voice pack on demand using the Sherpa model manager. The model is not bundled in the APK. The build unlocks the test feature but does not bypass the model download.
- Synthesizes a small set of common lines once on-device and saves them as local WAV cue files: numbers 0–30, `Go`, `Last one`, `Two more`, `Get ready`, `Nice work`, and breathing cues. The cache is generated from the selected model and can be deleted with it.
- Uses live Piper synthesis for arbitrary English text. The lab compares dynamic lines with cached countdown and count playback, reports approximate first-audio and synthesis timings, and has a priority/interrupt test.
- Leaves the current workout `Coach` on `ExpoSpeech` for now. The POC exercises a separate `PiperSpeechPort` that preserves the existing `interrupt`, `queue`, `drop`, and `onDone` contract before connecting it to workout sessions.

The premium purchase flow is not implemented yet. This review build makes the POC screen available for testing; production entitlement checks will be added with the app's purchase flow.

## Building an Android review APK

**Expo Go is a client app, not an APK builder, and cannot load the Piper native module.** Use a custom native build.

With EAS CLI available and the project signed in to Expo:

```sh
npx eas-cli build --platform android --profile piper-poc
```

The `piper-poc` profile produces an internal APK and sets the POC feature flag. The existing `development` profile also creates a development-client APK (not the stock Expo Go app). For a local Android build, use the repository's `android:apk` script on a machine with Java 17 and the Android SDK installed; set `EXPO_PUBLIC_PIPER_POC=1` when building so the POC link appears in the release-mode APK.

The first review requires internet access to fetch the voice pack. After installation, synthesis and cached cues run locally/offline.

## Release/licensing gate

The voice-model terms and the native runtime terms are separate. The Norman voice is listed as public-domain, but the selected Sherpa-ONNX prebuilt dependency has a licensing question to resolve before commercial distribution: an upstream report says its native binaries statically link eSpeak-NG (GPL-3.0), while the React Native package's bundled third-party notice inventory does not list eSpeak-NG. The package also lists LGPL components. Treat this as a technical POC, not a production-cleared dependency, until the exact binary's notices and distribution obligations are verified.

- [React Native Sherpa package notices](https://github.com/XDcobra/react-native-sherpa-onnx/tree/main/THIRD_PARTY_LICENSES)
- [Upstream Sherpa/eSpeak licensing report](https://github.com/muxable/rtchat/issues/1500)
