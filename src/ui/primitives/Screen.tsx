import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

export interface ScreenProps {
  children: React.ReactNode;
  /** Scrollable content (default) or a fixed layout. */
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Include bottom safe area (off inside tab navigators). */
  bottomInset?: boolean;
  topInset?: boolean;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  contentStyle,
  bottomInset = false,
  topInset = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingStyle = {
    paddingTop: topInset ? insets.top + spacing.md : 0,
    paddingBottom: (bottomInset ? insets.bottom : 0) + spacing.xl,
    paddingHorizontal: padded ? spacing.lg : 0,
  };

  return (
    <View style={[styles.root, style]}>
      <StatusBar style="light" />
      {scroll ? (
        <ScrollView
          style={styles.root}
          contentContainerStyle={[paddingStyle, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, paddingStyle, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
