import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/hooks/useI18n';
import { colors, fonts } from '@/theme';
import { Text } from '@/ui/primitives';

type IconName = 'library' | 'history' | 'settings';

const GLYPH: Record<IconName, string> = {
  library: '▶',
  history: '≡',
  settings: '⚙',
};

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.icon, focused && styles.iconFocused]}>
      <Text variant="h3" color={focused ? colors.textOnAccent : colors.textDim} style={styles.glyph}>
        {GLYPH[name]}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.tabs.library, tabBarIcon: ({ focused }) => <TabIcon name="library" focused={focused} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: t.tabs.history, tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t.tabs.settings, tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bgElevated,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingTop: 6,
  },
  label: { fontFamily: fonts.subheading, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  icon: {
    width: 32,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  iconFocused: { backgroundColor: colors.red, transform: [{ skewX: '-12deg' }] },
  glyph: { fontSize: 15, lineHeight: 18 },
});
