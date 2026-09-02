/**
 * Minimal, fully typed event emitter. Used by the session engine to publish
 * events to the coach (audio) and the UI store without coupling to either.
 */
export type Listener<T> = (payload: T) => void;

export type Unsubscribe = () => void;

export class TypedEmitter<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): Unsubscribe {
    const set = (this.listeners[event] ??= new Set());
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  /** Subscribe to every event. Handy for logging and for the coach. */
  onAny(listener: <K extends keyof Events>(event: K, payload: Events[K]) => void): Unsubscribe {
    this.anyListeners.add(listener);
    return () => {
      this.anyListeners.delete(listener);
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((l) => l(payload));
    this.anyListeners.forEach((l) => l(event, payload));
  }

  removeAll(): void {
    this.listeners = {};
    this.anyListeners.clear();
  }

  private anyListeners = new Set<<K extends keyof Events>(event: K, payload: Events[K]) => void>();
}
