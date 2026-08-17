/**
 * Camera-overlay palette.
 *
 * A viewfinder is a live image, not a themed surface, so these values are fixed
 * rather than theme-derived — legibility over arbitrary camera content requires
 * known contrast in both light and dark mode. Glass panels rather than solid
 * blocks so the operator can still see what the camera sees.
 */
export const camera = {
  /** Panel behind overlay text and controls. */
  glass: "rgba(16,18,23,0.62)",
  /** Slightly heavier panel for status messages. */
  glassStrong: "rgba(16,18,23,0.78)",
  glassBorder: "rgba(255,255,255,0.14)",
  /** Full-screen dim when scanning is disarmed. */
  scrim: "rgba(10,12,16,0.78)",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.68)",
  /** Active selection / reticle sweep. */
  accent: "#FFFFFF",
  /** Text placed on top of `accent`. */
  onAccent: "#15171C",
  frame: "rgba(255,255,255,0.28)",
} as const;
