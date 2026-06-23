import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
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
 * Owns the overlay stack as React state. Overlays are mounted in-tree by
 * <OverlayHost />, which must be rendered as a sibling AFTER the app's
 * navigator (so overlays paint above every screen and the tab bar).
 *
 * There is intentionally no React Native <Modal> anywhere in this system —
 * overlays are plain absolutely-positioned Views, so they never spawn a
 * separate native window (the source of the Fabric re-measure freeze).
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

  // Flip `visible` to false → the host plays the exit animation, then calls
  // _remove to actually unmount. This keeps close animations working even when
  // the caller drops its reference immediately.
  const close = useCallback((id: string) => {
    setStack((prev) => prev.map((o) => (o.id === id ? { ...o, visible: false } : o)));
  }, []);

  const closeAll = useCallback(() => {
    setStack((prev) => prev.map((o) => ({ ...o, visible: false })));
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
