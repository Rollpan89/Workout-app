/**
 * Web counterpart to `typography.test.tsx`: renders through react-native-web
 * to real HTML and checks that a button label gets the *file* for the italic
 * cut instead of a browser-synthesised `font-style: italic` oblique.
 */
import { renderToStaticMarkup } from 'react-dom/server';

import { Button, type ButtonSize } from '@/ui/primitives';
import { Text } from '@/ui/primitives/Text';

jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));

/** The inline style react-native-web put on the node holding `label`. */
function labelStyle(element: React.ReactElement, label: string): string {
  const html = renderToStaticMarkup(element);
  return html.match(new RegExp(`<[a-z]+[^>]*style="([^"]*)"[^>]*>${label}<`))?.[1] ?? '';
}

describe('typography on web', () => {
  it.each<ButtonSize>(['sm', 'md', 'lg', 'xl'])(
    'renders a %s button label with the real italic face',
    (size) => {
      const style = labelStyle(<Button label="Kör" size={size} />, 'Kör');

      expect(style).toMatch(/font-family:\s*BarlowCondensed_\w+_Italic/);
      // A synthesised slant is exactly what we are guarding against.
      expect(style).not.toMatch(/font-style:\s*italic/);
    },
  );

  it('gives an italic Text the italic file', () => {
    const style = labelStyle(
      <Text variant="label" italic>
        Kör
      </Text>,
      'Kör',
    );

    expect(style).toContain('font-family:BarlowCondensed_600SemiBold_Italic');
    expect(style).not.toMatch(/font-style:\s*italic/);
  });

  it('leaves upright text alone', () => {
    const style = labelStyle(<Text variant="label">Kör</Text>, 'Kör');

    expect(style).toContain('font-family:BarlowCondensed_600SemiBold;');
    expect(style).not.toContain('Italic');
  });
});
