import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { SLANT } from '@/theme';

export interface SlantBoxProps extends ViewProps {
  /** Background colour of the slanted shape. */
  color: string;
  /** Skew angle; defaults to the theme slant. */
  skew?: string;
  /** Padding applied to the (un-skewed) content. */
  padding?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * A parallelogram container: only the background layer is skewed, so the
 * children stay perfectly upright. The signature shape of the app.
 */
export function SlantBox({
  color,
  skew = SLANT,
  padding = 0,
  style,
  contentStyle,
  children,
  ...rest
}: SlantBoxProps) {
  return (
    <View {...rest} style={[styles.root, style]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: color, transform: [{ skewX: skew }] }]}
      />
      <View style={[{ padding }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', overflow: 'visible' },
});
