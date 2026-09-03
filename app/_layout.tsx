import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppFonts } from '@/hooks/useAppFonts';
import { useCustomWorkoutStore } from '@/state/customWorkoutStore';
import { useHistoryStore } from '@/state/historyStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors } from '@/theme';

// Keep the native splash visible until fonts + persisted state are ready.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const historyHydrated = useHistoryStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateHistory = useHistoryStore((s) => s.hydrate);
  const customHydrated = useCustomWorkoutStore((s) => s.hydrated);
  const hydrateCustom = useCustomWorkoutStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateSettings();
    void hydrateHistory();
    void hydrateCustom();
  }, [hydrateSettings, hydrateHistory, hydrateCustom]);

  const ready = (fontsLoaded || !!fontError) && settingsHydrated && historyHydrated && customHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) {
    return <View style={styles.splash} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="workout/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="builder/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="session" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="summary" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  splash: { flex: 1, backgroundColor: colors.bg },
});
