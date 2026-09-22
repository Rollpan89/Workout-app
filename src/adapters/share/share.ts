import { Clipboard, Platform, Share } from 'react-native';

/**
 * Sharing port
 * ------------
 * Workouts are shared as plain text (see `core/domain/shareCode.ts`), so the
 * platform edge is small: open the native share sheet, fall back to the
 * clipboard, and tell the caller which of the two happened. On web the Web
 * Share API and `navigator.clipboard` are used – both are optional, and the
 * UI shows the raw code when neither exists.
 */
export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'unavailable';

export interface SharePort {
  /** Hand `text` to the platform (share sheet → clipboard → give up). */
  shareText(text: string, title?: string): Promise<ShareOutcome>;
  /** Put `text` on the clipboard. Returns false when no clipboard is available. */
  copyText(text: string): Promise<boolean>;
}

function webNavigator(): Navigator | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator;
}

async function copyOnWeb(text: string): Promise<boolean> {
  const clipboard = webNavigator()?.clipboard;
  if (!clipboard?.writeText) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function createSharePort(): SharePort {
  if (Platform.OS === 'web') {
    return {
      async shareText(text, title) {
        const nav = webNavigator();
        if (nav?.share) {
          try {
            await nav.share({ text, title });
            return 'shared';
          } catch (error) {
            // AbortError = the user dismissed the sheet; anything else falls through.
            if ((error as { name?: string } | undefined)?.name === 'AbortError') return 'dismissed';
          }
        }
        return (await copyOnWeb(text)) ? 'copied' : 'unavailable';
      },
      copyText: copyOnWeb,
    };
  }

  return {
    async shareText(text, title) {
      try {
        const result = await Share.share({ message: text, title });
        if (result.action === Share.dismissedAction) return 'dismissed';
        return 'shared';
      } catch {
        return 'unavailable';
      }
    },
    async copyText(text) {
      try {
        Clipboard.setString(text);
        return true;
      } catch {
        return false;
      }
    },
  };
}

let instance: SharePort | undefined;

/** Shared instance – created lazily so tests can mock the platform edge. */
export function getShare(): SharePort {
  instance ??= createSharePort();
  return instance;
}
