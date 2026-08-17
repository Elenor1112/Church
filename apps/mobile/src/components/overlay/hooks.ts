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

  // True from close() until the exit animation has removed the instance. While
  // closing, the outgoing overlay must keep rendering the content it opened
  // with — re-reading `renderRef` would repaint it with the NEXT overlay's
  // content if the caller reopens within the exit window.
  const closingRef = useRef(false);

  useEffect(() => {
    if (isOpen && idRef.current == null) {
      closingRef.current = false;
      idRef.current = open((api) => (closingRef.current ? null : renderRef.current(api)), optionsRef.current);
    } else if (!isOpen && idRef.current != null) {
      closingRef.current = true;
      close(idRef.current);
      idRef.current = null;
    }
  }, [isOpen, open, close]);

  // Ensure teardown if the host component unmounts while open.
  useEffect(() => {
    return () => {
      if (idRef.current != null) {
        closingRef.current = true;
        close(idRef.current);
        idRef.current = null;
      }
    };
  }, [close]);
}
