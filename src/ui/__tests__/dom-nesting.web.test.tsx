/**
 * Renders the UI through react-native-web to real HTML and asserts DOM
 * validity: a pressable Card is a <button> on web, so nothing interactive
 * (Button, Chip) may end up nested inside it.
 */
import { renderToStaticMarkup } from 'react-dom/server';

import { getWorkout } from '@/content';
import type { Workout } from '@/core/domain';
import { WorkoutCard } from '@/ui/components/WorkoutCard';
import { Button, Card, Chip } from '@/ui/primitives';

jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));

/** Every <button> whose subtree contains another <button>. */
function nestedButtons(html: string): string[] {
  const offenders: string[] = [];
  const re = /<(\/?)button\b[^>]*>/g;
  const open: { index: number; tag: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1] === '/') open.pop();
    else {
      if (open.length > 0) offenders.push(open[open.length - 1]!.tag);
      open.push({ index: m.index, tag: m[0] });
    }
  }
  return offenders;
}

const custom: Workout = { ...getWorkout('core-crusher')!, id: 'cw_1', custom: true, createdAt: '2026-01-01T00:00:00.000Z' };

describe('DOM nesting on web', () => {
  it('the detector catches the bug this suite guards against', () => {
    // A Button rendered as a child of a pressable Card = <button> inside <button>
    const html = renderToStaticMarkup(
      <Card onPress={() => undefined}>
        <Button label="nested" onPress={() => undefined} />
      </Card>,
    );
    expect(nestedButtons(html)).toHaveLength(1);
  });

  it('a pressable Card renders as <button> and its body inside it', () => {
    const html = renderToStaticMarkup(
      <Card onPress={() => undefined} testID="c">
        <Chip label="static" />
      </Card>,
    );
    expect(html).toMatch(/<button[^>]*data-testid="c"/);
    expect(nestedButtons(html)).toEqual([]);
  });

  it('Card.footer keeps Buttons and Chips outside the pressable <button>', () => {
    const html = renderToStaticMarkup(
      <Card
        onPress={() => undefined}
        footer={
          <>
            <Button label="Edit" onPress={() => undefined} />
            <Chip label="pick" onPress={() => undefined} />
          </>
        }
      >
        <Chip label="static" />
      </Card>,
    );
    expect((html.match(/<button\b/g) ?? []).length).toBe(3); // card + Button + Chip
    expect(nestedButtons(html)).toEqual([]);
  });

  it('a custom WorkoutCard with edit/delete has no <button> inside <button>', () => {
    const html = renderToStaticMarkup(
      <WorkoutCard workout={custom} onPress={() => undefined} onEdit={() => undefined} onDelete={() => undefined} />,
    );
    expect(html).toContain('data-testid="workout-cw_1"');
    expect(html).toContain('data-testid="workout-cw_1-edit"');
    expect(html).toContain('data-testid="workout-cw_1-delete"');
    expect(nestedButtons(html)).toEqual([]);
  });

  it('a built-in WorkoutCard renders exactly one <button>', () => {
    const html = renderToStaticMarkup(<WorkoutCard workout={getWorkout('full-body-blast')!} onPress={() => undefined} />);
    expect((html.match(/<button\b/g) ?? []).length).toBe(1);
  });
});
