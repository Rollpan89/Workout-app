import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Text } from '@/ui/primitives';

export default function NotFound() {
  return (
    <View style={styles.root}>
      <Text variant="hero" upper>
        404
      </Text>
      <Link href="/" style={styles.link}>
        <Text variant="label" color={colors.red} upper>
          ← Home
        </Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  link: { padding: spacing.md },
});
