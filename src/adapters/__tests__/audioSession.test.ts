import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { BACKGROUND_TICK_MS, ExpoAudioSession } from '../audio/audioSession';

type Listener = () => void;

interface FakePlayer {
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  addListener: jest.Mock;
  loop: boolean;
  volume: number;
  listeners: Listener[];
  subscriptions: { remove: jest.Mock }[];
}

function makePlayer(): FakePlayer {
  const player: FakePlayer = {
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(),
    loop: false,
    volume: 1,
    listeners: [],
    subscriptions: [],
  };
  player.addListener.mockImplementation((_event: string, listener: Listener) => {
    player.listeners.push(listener);
    const sub = {
      remove: jest.fn(() => {
        player.listeners = player.listeners.filter((l) => l !== listener);
      }),
    };
    player.subscriptions.push(sub);
    return sub;
  });
  return player;
}

const mockedCreate = createAudioPlayer as jest.Mock;
const mockedMode = setAudioModeAsync as jest.Mock;

describe('ExpoAudioSession', () => {
  let player: FakePlayer;

  beforeEach(() => {
    player = makePlayer();
    mockedCreate.mockReset();
    mockedCreate.mockImplementation(() => player);
    mockedMode.mockClear();
  });

  it('activates a background-capable, ducking session and loops a silent keep-alive track', async () => {
    const session = new ExpoAudioSession();
    await session.begin();

    expect(session.isActive()).toBe(true);
    expect(mockedMode).toHaveBeenCalledWith(
      expect.objectContaining({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
        allowsRecording: false,
      }),
    );
    expect(mockedCreate).toHaveBeenCalledWith(expect.anything(), { updateInterval: BACKGROUND_TICK_MS });
    expect(player.loop).toBe(true);
    expect(player.volume).toBe(0);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('turns player status events into ticks while active, and stops on end()', async () => {
    const onTick = jest.fn();
    const session = new ExpoAudioSession();
    await session.begin({ onTick });

    expect(player.addListener).toHaveBeenCalledWith('playbackStatusUpdate', expect.any(Function));
    player.listeners.forEach((l) => l());
    player.listeners.forEach((l) => l());
    expect(onTick).toHaveBeenCalledTimes(2);

    await session.end();
    expect(session.isActive()).toBe(false);
    expect(player.subscriptions[0]?.remove).toHaveBeenCalled();
    expect(player.listeners).toHaveLength(0);
    expect(player.pause).toHaveBeenCalled();
    expect(player.remove).toHaveBeenCalled();
    // Music from other apps gets its volume back.
    expect(mockedMode).toHaveBeenLastCalledWith(
      expect.objectContaining({ shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }),
    );
  });

  it('does not subscribe when no tick handler is given', async () => {
    const session = new ExpoAudioSession();
    await session.begin();
    expect(player.addListener).not.toHaveBeenCalled();
    await session.end();
  });

  it('is idempotent: a second begin() does not create a second player', async () => {
    const session = new ExpoAudioSession();
    await session.begin();
    await session.begin();
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    await session.end();
    await session.end();
    expect(player.remove).toHaveBeenCalledTimes(1);
  });

  it('does not start a player if end() arrives while the audio mode is still being set', async () => {
    let resolveMode: () => void = () => undefined;
    mockedMode.mockImplementationOnce(() => new Promise<void>((resolve) => (resolveMode = resolve)));
    const session = new ExpoAudioSession();
    const begun = session.begin({ onTick: jest.fn() });
    await session.end();
    resolveMode();
    await begun;
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(session.isActive()).toBe(false);
  });

  it('survives a failing native module', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockedMode.mockImplementationOnce(() => Promise.reject(new Error('no audio')));
    const session = new ExpoAudioSession();
    await expect(session.begin({ onTick: jest.fn() })).resolves.toBeUndefined();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    await session.end();
  });
});
