import { useEffect, useRef } from "react";
import { useOverlayContext } from "./OverlayProvider";
import type { OverlayOptions, OverlayRender } from "./types";

/**
 * Imperative overlay API.
 *
 *   const overlay = useOverlay();
 *   const id = overlay.open(({ close }) => <AppDialog ... onClose={close} />, { variant: "dialog" });
 *   overlay.close(id);
 */
export function useOverlay() {
  const { open, close, closeAll } = useOverlayContext();
  return { open, close, closeAll };
}

/**
 * Declarative helper: mounts an overlay while `isOpen` is true and tears it
 * down when it flips to false, preserving the exit animation.
 *
 * `render` is read live on each open (kept in a ref), so it always sees the
 * latest closure without forcing the caller to memoize it.
 */
export function useControlledOverlay(
  isOpen: boolean,
  render: OverlayRender,
  options?: OverlayOptions,
) {
  const { open, close } = useOverlayContext();
  const idRef = useRef<string | null>(null);
  const renderRef = useRef(render);
  renderRef.current = render;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (isOpen && idRef.current == null) {
      idRef.current = open((api) => renderRef.current(api), optionsRef.current);
    } else if (!isOpen && idRef.current != null) {
      close(idRef.current);
      idRef.current = null;
    }
  }, [isOpen, open, close]);

  // Ensure teardown if the host component unmounts while open.
  useEffect(() => {
    return () => {
      if (idRef.current != null) {
        close(idRef.current);
        idRef.current = null;
      }
    };
  }, [close]);
}
