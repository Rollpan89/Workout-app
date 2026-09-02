import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { SlantBox, Text } from '@/ui/primitives';

export interface StatTileProps {
  value: string | number;
  label: string;
  unit?: string;
  color?: string;
  /** Solid accent fill vs. subtle surface. */
  emphasis?: boolean;
}

export function StatTile({ value, label, unit, color = colors.red, emphasis }: StatTileProps) {
  const bg = emphasis ? color : colors.surface;
  const fg = emphasis ? colors.textOnAccent : colors.text;
  const muted = emphasis ? 'rgba(255,255,255,0.8)' : colors.textMuted;
  return (
    <SlantBox color={bg} padding={spacing.md} style={styles.tile} contentStyle={styles.content}>
      <View style={styles.valueRow}>
        <Text variant="stat" color={fg} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {unit ? (
          <Text variant="labelSmall" color={muted} upper style={styles.unit}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="labelSmall" color={muted} upper numberOfLines={1}>
        {label}
      </Text>
    </SlantBox>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 120, marginHorizontal: 6 },
  content: { gap: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  unit: { marginBottom: 4 },
});
