/**
 * Regression tests for "wrong typeface on some buttons".
 *
 * The bug: `Button` slanted its label with `fontStyle: 'italic'` instead of
 * using a real italic cut. The large sizes happened to use an italic family
 * already, but `sm`/`md` used the upright SemiBold and got a synthesised
 * (faked) slant. Every variant must now point at a font file that is actually
 * loaded, so nothing can silently fall back to a faked style again.
 */
import { render } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { APP_FONTS } from '@/hooks/useAppFonts';
import { fonts, italicFonts, typography } from '@/theme';
import { Button, type ButtonSize } from '@/ui/primitives';
import { Text } from '@/ui/primitives/Text';

const LOADED = Object.keys(APP_FONTS);
const VARIANTS = Object.keys(typography) as (keyof typeof typography)[];

/** Flattens the (possibly nested) style array React Native hands the node. */
function labelStyle(label: string, element: React.ReactElement): TextStyle {
  const node = render(element).getByText(label);
  return StyleSheet.flatten<TextStyle>(node.props.style as StyleProp<TextStyle>);
}

describe('app fonts', () => {
  it('loads every family the theme can ask for', () => {
    for (const family of new Set([...Object.values(fonts), ...Object.values(italicFonts)])) {
      expect(LOADED).toContain(family);
    }
  });

  it('has a real italic cut for every variant', () => {
    for (const variant of VARIANTS) {
      const family = italicFonts[variant];
      expect(family).toMatch(/_Italic$/);
      expect(LOADED).toContain(family);
    }
  });

  it('renders italic text with the italic file, never a synthesised slant', () => {
    const style = labelStyle(
      'Kör',
      <Text variant="label" italic>
        Kör
      </Text>,
    );

    expect(style.fontFamily).toBe(fonts.subheadingItalic);
    expect(style.fontStyle).toBeUndefined();
  });

  it('keeps the upright face when italic is not asked for', () => {
    const style = labelStyle('Kör', <Text variant="label">Kör</Text>);

    expect(style.fontFamily).toBe(fonts.subheading);
    expect(style.fontStyle).toBeUndefined();
  });

  it.each<ButtonSize>(['sm', 'md', 'lg', 'xl'])(
    'gives a %s button the real italic face',
    (size) => {
      const style = labelStyle('Kör', <Button label="Kör" size={size} />);

      expect(style.fontFamily).toMatch(/_Italic$/);
      expect(LOADED).toContain(style.fontFamily);
    },
  );
});
