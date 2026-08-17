import React, { useCallback, useEffect, useRef } from "react";
import { Button } from "./Button";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

/**
 * Submit button that is impossible to double-fire. Two guards:
 *  1. `loading`/`disabled` (caller-driven, e.g. mutation.isPending) blocks taps.
 *  2. A 600ms ref-based debounce blocks a rapid second tap in the window before
 *     `loading` flips true — the classic double-submit race.
 *
 * Use for any action that triggers a network mutation.
 */
export function SubmitButton({ onPress, loading, disabled, ...rest }: ButtonProps) {
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlock = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lockRef.current = false;
  }, []);

  // `loading` going true→false is the real "operation finished" signal — release
  // the lock immediately instead of stranding the button for the rest of the
  // 600ms window (which made a retry after a failed submit silently no-op).
  useEffect(() => {
    if (!loading) unlock();
  }, [loading, unlock]);

  // Never leave a timer running against an unmounted sheet.
  useEffect(() => unlock, [unlock]);

  const guardedPress = useCallback(
    (e: Parameters<NonNullable<ButtonProps["onPress"]>>[0]) => {
      if (lockRef.current || loading || disabled) return;
      lockRef.current = true;
      onPress?.(e);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        lockRef.current = false;
      }, 600);
    },
    [onPress, loading, disabled],
  );

  return <Button onPress={guardedPress} loading={loading} disabled={disabled} {...rest} />;
}
