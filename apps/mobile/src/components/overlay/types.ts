import type React from "react";

/** Visual presentation styles supported by the overlay host. */
export type OverlayVariant = "sheet" | "dialog" | "fullscreen";

/** A function that renders an overlay's content, given a `close` callback. */
export type OverlayRender = (api: { close: () => void }) => React.ReactNode;

export interface OverlayOptions {
  /** How the overlay is presented. Defaults to "sheet". */
  variant?: OverlayVariant;
  /** Tap on the dimmed backdrop closes the overlay. Defaults to true. */
  dismissOnBackdrop?: boolean;
  /** Android hardware back button closes the overlay. Defaults to true. */
  dismissOnBackButton?: boolean;
  /** Called after the overlay has fully closed (exit animation done). */
  onClose?: () => void;
}

/** An overlay instance tracked by the host's stack. */
export interface OverlayInstance extends Required<Omit<OverlayOptions, "onClose">> {
  id: string;
  render: OverlayRender;
  onClose?: () => void;
  /** Drives mount/unmount; flips to false to trigger the exit animation. */
  visible: boolean;
}

export interface OverlayContextValue {
  /** Mount an overlay; returns its id. */
  open: (render: OverlayRender, options?: OverlayOptions) => string;
  /** Begin closing the overlay with the given id (runs exit animation). */
  close: (id: string) => void;
  /** Close every open overlay. */
  closeAll: () => void;
  /** Internal: the live stack, consumed by OverlayHost. */
  _stack: OverlayInstance[];
  /** Internal: called by the host once an exit animation completes. */
  _remove: (id: string) => void;
}
