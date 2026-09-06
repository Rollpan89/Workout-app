import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ConsoleCrashReporter, setCrashReporter, type CrashReporter } from '@/adapters/crash/crashReporter';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('kaboom');
  return <Text>fine</Text>;
}

describe('ErrorBoundary', () => {
  let captured: unknown[];
  let reporter: CrashReporter;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    captured = [];
    reporter = {
      enable: jest.fn(),
      disable: jest.fn(),
      isEnabled: () => false,
      capture: (e) => captured.push(e),
    };
    setCrashReporter(reporter);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined); // React logs the throw
  });

  afterEach(() => {
    setCrashReporter(new ConsoleCrashReporter());
    consoleError.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeTruthy();
    expect(screen.queryByTestId('error-boundary')).toBeNull();
  });

  it('shows the fallback in Swedish, hands the error to the crash reporter and recovers on restart', () => {
    const onReset = jest.fn();
    let explode = true;
    const { rerender } = render(
      <ErrorBoundary onReset={onReset}>
        <Bomb explode={explode} />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary')).toBeTruthy();
    expect(screen.getByText('Oj.')).toBeTruthy();
    expect(screen.getByText(/Ett pågående pass har sparats/)).toBeTruthy();
    expect(screen.getByText('kaboom')).toBeTruthy();
    expect(captured).toHaveLength(1);
    expect((captured[0] as Error).message).toBe('kaboom');

    // Fix the child, then restart → children render again
    explode = false;
    rerender(
      <ErrorBoundary onReset={onReset}>
        <Bomb explode={explode} />
      </ErrorBoundary>,
    );
    fireEvent.press(screen.getByTestId('error-restart'));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('fine')).toBeTruthy();
  });
});
