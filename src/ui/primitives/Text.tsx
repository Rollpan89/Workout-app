import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { colors, typography } from '@/theme';

export type TextVariant = keyof typeof typography;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  /** Uppercase + tracking – used for labels and slanted headings. */
  upper?: boolean;
  align?: 'left' | 'center' | 'right';
}

export function Text({
  variant = 'body',
  color = colors.text,
  upper,
  align,
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color },
        upper && styles.upper,
        align && { textAlign: align },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  upper: { textTransform: 'uppercase' },
});
