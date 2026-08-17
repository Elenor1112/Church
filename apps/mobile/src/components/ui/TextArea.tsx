import React, { forwardRef } from "react";
import { TextInput } from "react-native";
import { Input } from "./Input";
import type { ComponentProps } from "react";

type InputProps = ComponentProps<typeof Input>;

interface TextAreaProps extends Omit<InputProps, "multiline"> {
  /** Visible height in px. Defaults to 100. */
  height?: number;
}

/**
 * Multiline text field built on `Input`. Uses a FIXED height so the field never
 * auto-grows after first render (the cause of the "modal jumps" bug). For a
 * growing field, pass an explicit `height`.
 */
export const TextArea = forwardRef<TextInput, TextAreaProps>(function TextArea(
  { height = 100, style, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      multiline
      style={[{ height, textAlignVertical: "top" }, style]}
      {...rest}
    />
  );
});
