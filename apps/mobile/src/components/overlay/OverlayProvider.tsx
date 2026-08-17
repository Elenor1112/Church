import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  OverlayContextValue,
  OverlayInstance,
  OverlayOptions,
  OverlayRender,
} from "./types";

const OverlayContext = createContext<OverlayContextValue | null>(null);

let counter = 0;
const nextId = () => `overlay-${++counter}`;

/**
 * Owns the overlay stack as React state. Each open instance is rendered by
 * <OverlayHost /> as a self-contained native React Native <Modal> (its own OS
 * window, isolated hit-testing). Mount <OverlayHost /> once at the app root.
 */
export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<OverlayInstance[]>([]);
  // Mirror the stack in a ref so close()/open() stay referentially stable.
  const stackRef = useRef<OverlayInstance[]>(stack);
  stackRef.current = stack;

  const open = useCallback((render: OverlayRender, options?: OverlayOptions) => {
    const id = nextId();
    const instance: OverlayInstance = {
      id,
      render,
      visible: true,
      variant: options?.variant ?? "sheet",
      dismissOnBackdrop: options?.dismissOnBackdrop ?? true,
      dismissOnBackButton: options?.dismissOnBackButton ?? true,
      onClose: options?.onClose,
    };
    setStack((prev) => [...prev, instance]);
    return id;
  }, []);

  // Pending exit timers, keyed by overlay id. Closing the same id twice (e.g.
  // backdrop tap + an onClose-driven state flip) must not schedule two removals
  // — the second would fire after a NEW overlay had already been mounted.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Flip `visible` to false → the native <Modal> plays its exit animation. After
  // the animation window, remove the instance. We drive removal on a timer here
  // (not via Modal.onDismiss, which is iOS-only) so it works on Android too.

  const close = useCallback((id: string) => {
    if (timersRef.current.has(id)) return;
    // Capture the instance NOW; after the removal below, stackRef no longer has it.
    const inst = stackRef.current.find((o) => o.id === id);
    setStack((prev) => prev.map((o) => (o.id === id ? { ...o, visible: false } : o)));
    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setStack((prev) => prev.filter((o) => o.id !== id));
      inst?.onClose?.();
    }, 280);
    timersRef.current.set(id, timer);
  }, []);

  const closeAll = useCallback(() => {
    // Snapshot instances before any state mutation so every onClose still fires.
    const pending = stackRef.current.filter((o) => !timersRef.current.has(o.id));
    if (pending.length === 0) return;
    const ids = pending.map((o) => o.id);
    setStack((prev) => prev.map((o) => (ids.includes(o.id) ? { ...o, visible: false } : o)));
    const timer = setTimeout(() => {
      ids.forEach((id) => timersRef.current.delete(id));
      setStack((prev) => prev.filter((o) => !ids.includes(o.id)));
      pending.forEach((o) => o.onClose?.());
    }, 280);
    ids.forEach((id) => timersRef.current.set(id, timer));
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const _remove = useCallback((id: string) => {
    const inst = stackRef.current.find((o) => o.id === id);
    setStack((prev) => prev.filter((o) => o.id !== id));
    inst?.onClose?.();
  }, []);

  const value = useMemo<OverlayContextValue>(
    () => ({ open, close, closeAll, _stack: stack, _remove }),
    [open, close, closeAll, stack, _remove],
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlayContext(): OverlayContextValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("Overlay hooks must be used within <OverlayProvider>");
  return ctx;
}
