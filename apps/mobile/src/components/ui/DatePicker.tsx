import React, { useMemo, useState } from "react";
import { View, Pressable, Keyboard, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { spacing, typography, iconSize, radius, touchTarget, hairline } from "@/theme/tokens";
import { Text } from "./Typography";
import { FieldShell } from "./FieldShell";
import { PickerSheet } from "./PickerSheet";

interface Props {
  label?: string;
  /** Title shown in the picker header. Falls back to `label`. */
  title?: string;
  placeholder?: string;
  /** Selected date as "YYYY-MM-DD", or undefined when unset. */
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Parse "YYYY-MM-DD" into a local Date (midday to avoid TZ edges), or null. */
function parseKey(key: string | undefined): Date | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!, 12);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

const WEEKDAY_LABELS_EN = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_LABELS_AR = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

/**
 * Calendar date field. Matches <Input>/<Select> via <FieldShell>; the month grid
 * opens centered through <PickerSheet> (see that file for the Android nested-
 * Modal constraint that forbids `statusBarTranslucent`).
 */
export function DatePicker({
  label,
  title,
  placeholder,
  value,
  onChange,
  error,
  hint,
  required,
  icon,
}: Props) {
  const { colors } = useTheme();
  const { isRTL, lang } = useI18n();
  const { width: screenW } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const selected = parseKey(value);
  // Month currently displayed in the grid; defaults to the selected date's month.
  const [view, setView] = useState(() => selected ?? new Date());

  const openPicker = () => {
    // Close the keyboard first so the calendar Modal never has to share the
    // screen (and touch handling) with it.
    Keyboard.dismiss();
    // Re-parse `value` here rather than reusing the `selected` captured by this
    // handler's closure: when `value` changed while the picker was closed, that
    // closure can be a render behind and would open on the wrong month.
    setView(parseKey(value) ?? new Date());
    setOpen(true);
  };

  const pick = (day: number) => {
    onChange(toKey(view.getFullYear(), view.getMonth(), day));
    setOpen(false);
  };

  const shiftMonth = (delta: number) =>
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1, 12));

  const { weeks, monthLabel } = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Build a flat array of cells: leading blanks + day numbers, chunked to weeks.
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    const label = new Date(year, month, 1).toLocaleDateString(lang === "ar" ? "ar" : "en-US", {
      month: "long",
      year: "numeric",
    });
    return { weeks: rows, monthLabel: label };
  }, [view, lang]);

  const weekdayLabels = lang === "ar" ? WEEKDAY_LABELS_AR : WEEKDAY_LABELS_EN;
  const cellSize = Math.min(touchTarget, (screenW - 48 - 6 * 6) / 7);
  const today = new Date();
  const isSameYMD = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Display the stored ISO key in the reader's locale — "1998-03-14" is data,
  // "14 March 1998" is a date. The stored value is unchanged.
  const displayValue = selected
    ? selected.toLocaleDateString(lang === "ar" ? "ar" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Pressable onPress={openPicker} accessibilityRole="button" accessibilityLabel={label}>
        <FieldShell label={label} error={error} hint={hint} required={required}>
          {icon ? <Ionicons name={icon} size={iconSize.md} color={colors.subtle} /> : null}
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: typography.body.fontSize,
              color: displayValue ? colors.ink : colors.subtle,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {displayValue ?? placeholder ?? ""}
          </Text>
          <Ionicons name="calendar-outline" size={iconSize.md} color={colors.subtle} />
        </FieldShell>
      </Pressable>

      <PickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title ?? label ?? ""}
        placement="center"
      >
        {/* Month navigation */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            onPress={() => shiftMonth(-1)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={{ padding: spacing.xs }}
          >
            <Ionicons name="chevron-back" size={iconSize.lg} color={colors.ink} />
          </Pressable>
          <Text variant="subheading">{monthLabel}</Text>
          <Pressable
            onPress={() => shiftMonth(1)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={{ padding: spacing.xs }}
          >
            <Ionicons name="chevron-forward" size={iconSize.lg} color={colors.ink} />
          </Pressable>
        </View>

        {/* Weekday header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {weekdayLabels.map((w, i) => (
            <View key={i} style={{ width: cellSize, alignItems: "center" }}>
              <Text variant="small" tone="subtle" weight="600">
                {w}
              </Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={{ gap: spacing.xs }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {week.map((day, di) => {
                if (day == null) {
                  return <View key={di} style={{ width: cellSize, height: cellSize }} />;
                }
                const cellDate = new Date(view.getFullYear(), view.getMonth(), day, 12);
                const isSelected = selected != null && isSameYMD(cellDate, selected);
                const isToday = isSameYMD(cellDate, today);
                return (
                  <Pressable
                    key={di}
                    onPress={() => pick(day)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      // Squircle rather than a full circle — reads as a calendar
                      // cell instead of a bubble, and matches the field radius.
                      borderRadius: radius.sm,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? colors.primary : "transparent",
                      borderWidth: !isSelected && isToday ? hairline : 0,
                      borderColor: colors.borderStrong,
                    }}
                  >
                    <Text
                      variant="caption"
                      tabular
                      weight={isSelected || isToday ? "600" : "400"}
                      tone={isSelected ? "inverse" : "ink"}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </PickerSheet>
    </>
  );
}
