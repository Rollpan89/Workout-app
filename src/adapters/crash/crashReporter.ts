/**
 * Crash / error reporting port.
 *
 * Reporting is strictly opt-in (`settings.crashReports`, default off) and
 * the app never sends anything unless a real backend is plugged in here.
 * The default implementation only logs to the console, which is what we
 * want in development and the only honest default for a local-first app.
 *
 * To ship with Sentry:
 *   1. `npx expo install @sentry/react-native` and add the config plugin.
 *   2. Implement `CrashReporter` with `Sentry.init` in `enable()`,
 *      `Sentry.captureException` in `capture()`, `Sentry.close()` in `disable()`.
 *   3. `setCrashReporter(new SentryCrashReporter())` in `app/_layout.tsx`.
 * Nothing else in the app needs to change.
 */
export interface CrashReporter {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  capture(error: unknown, context?: Record<string, unknown>): void;
}

export class ConsoleCrashReporter implements CrashReporter {
  private enabled = false;

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  capture(error: unknown, context?: Record<string, unknown>): void {
    // Always log locally; "reporting" only happens when the user opted in
    // and a real reporter has been plugged in.
    console.error('[crash]', error, context ?? '');
  }
}

let instance: CrashReporter = new ConsoleCrashReporter();

export function getCrashReporter(): CrashReporter {
  return instance;
}

export function setCrashReporter(reporter: CrashReporter): void {
  instance = reporter;
}
