import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppFonts } from '@/hooks/useAppFonts';
import { useCustomWorkoutStore } from '@/state/customWorkoutStore';
import { useHistoryStore } from '@/state/historyStore';
import { useSessionStore } from '@/state/sessionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors } from '@/theme';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';

// Keep the native splash visible until fonts + persisted state are ready.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const isReady = useInitialLoad();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isReady]);

  if (!isReady || (!fontsLoaded && !fontError)) {
    return <View style={styles.splash} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary onReset={() => useSessionStore.getState().reset()}>
          <AppStack />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Hook to handle the orchestrated hydration of all global stores.
 * Ensures all asynchronous persistence tasks are completed before the app renders.
 */
function useInitialLoad() {
  const [ready, setReady] = useState(false);
  
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateHistory = useHistoryStore((s) => s.hydrate);
  const hydrateCustom = useCustomWorkoutStore((s) => s.hydrate);
  const loadPendingCheckpoint = useSessionStore((s) => s.loadPendingCheckpoint);

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        // Execute all hydration and recovery tasks in parallel
        await Promise.all([
          hydrateSettings(),
          hydrateHistory(),
          hydrateCustom(),
          loadPendingCheckpoint(),
        ]);
      } catch (error) {
        console.error('[RootLayout] Critical hydration failure:', error);
      } finally {
        if (isMounted) setReady(true);
      }
    }

    prepare();
    return () => { isMounted = false; };
  }, [hydrateSettings, hydrateHistory, hydrateCustom, loadPendingCheckpoint]);

  return ready;
}

function AppStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade_from_bottom',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workout/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="history/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="builder/[id]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="session" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="summary" options={{ gestureEnabled: false, animation: 'fade' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  splash: { flex: 1, backgroundColor: colors.bg },
});
