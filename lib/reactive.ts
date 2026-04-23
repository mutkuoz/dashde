import { Accessor, createState } from "ags";
import { Timer } from "ags/time";

export type Binding<T> = Accessor<T>;

export interface Variable<T> extends Accessor<T> {
  get(): T;
  set(value: T | ((prev: T) => T)): void;
  poll(intervalMs: number, producer: () => T | Promise<T>): Variable<T>;
  subscribe(callback: (value: T) => void): () => void;
  drop(): void;
}

export function Variable<T>(init: T): Variable<T> {
  const [acc, setter] = createState<T>(init);
  let timer: ReturnType<typeof Timer.interval> | null = null;

  const baseSubscribe = acc.subscribe.bind(acc);
  const v = acc as unknown as Variable<T>;
  v.set = (value) => (setter as (v: T | ((p: T) => T)) => void)(value);
  // Old astal Variable.subscribe passed the new value; gnim's Accessor.subscribe
  // doesn't. Shim so existing call sites keep working.
  v.subscribe = (cb) => baseSubscribe(() => cb(acc.peek()));
  v.poll = (intervalMs, producer) => {
    timer?.cancel?.();
    const tick = async () => {
      try {
        v.set(await producer());
      } catch {
        // polling errors should not kill the timer
      }
    };
    tick();
    timer = Timer.interval(intervalMs, tick);
    return v;
  };
  v.drop = () => {
    timer?.cancel?.();
    timer = null;
  };
  return v;
}

/** 1-arg compat for old `bind(variable)` / `bind(accessor)` — identity. */
export function bind<T>(accessor: Accessor<T>): Accessor<T> {
  return accessor;
}
