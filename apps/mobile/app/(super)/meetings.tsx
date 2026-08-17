import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useMeetings, useCreateMeeting, useDeleteMeeting } from "@/features/hooks";
import { ApiError } from "@/lib/api";
import {
  Screen,
  ScreenHeader,
  SectionHeader,
  Text,
  Button,
  SubmitButton,
  Input,
  DatePicker,
  TimePicker,
  EmptyState,
  SkeletonCard,
  ListRow,
  IconTile,
  Badge,
} from "@/components/ui";
import { AppSheet, useControlledOverlay } from "@/components/overlay";
import { FormError } from "@/components/FormError";
import {
  dayLabel,
  meetingDayLabel,
  formatTime12h,
  parseTimeToMinutes,
  DATE_ONLY_REGEX,
} from "@church/shared";
import { spacing, iconSize, touchTarget, staggerDelay } from "@/theme/tokens";

export default function SuperMeetings() {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const meetings = useMeetings();
  const del = useDeleteMeeting();
  const [creating, setCreating] = useState(false);

  useControlledOverlay(creating, ({ close }) => <CreateMeetingForm onDone={close} />, {
    variant: "sheet",
    onClose: () => setCreating(false),
  });

  const items = meetings.data?.meetings ?? [];

  return (
    <Screen>
      <ScreenHeader title={t("meetings")} subtitle={t("meetingsSubtitle")} />

      <Button
        title={t("createMeeting")}
        leftIcon={<Ionicons name="add" size={iconSize.sm} color={colors.onPrimary} />}
        onPress={() => setCreating(true)}
      />

      {/* Always-on default window, shown read-only for clarity. */}
      <SectionHeader title={t("defaultWindow")} />
      <ListRow
        leading={<IconTile icon="star" tone="neutral" />}
        title="Holy Family Meeting"
        subtitle={`${dayLabel(5, lang)} · ${formatTime12h("10:30")}`}
        trailing={<Badge label={t("defaultWindow")} variant="neutral" />}
      />

      <SectionHeader title={t("meetings")} />
      {meetings.isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : items.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={t("noMeetings")}
          action={{ label: t("createMeeting"), onPress: () => setCreating(true) }}
        />
      ) : (
        items.map((m, i) => (
          <ListRow
            key={m.id}
            animateIn
            delay={staggerDelay(i)}
            leading={<IconTile icon="calendar" tone="primary" />}
            title={m.name}
            subtitle={`${meetingDayLabel(m.meetingDate, m.dayOfWeek, lang)} · ${formatTime12h(m.startTime)} – ${formatTime12h(m.endTime)}`}
            trailing={
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  del.mutate(m.id);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Delete meeting"
                style={{
                  width: touchTarget - spacing.md,
                  height: touchTarget - spacing.md,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="trash-outline" size={iconSize.md} color={colors.subtle} />
              </Pressable>
            }
          />
        ))
      )}
    </Screen>
  );
}

function CreateMeetingForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const createMeeting = useCreateMeeting();
  const [name, setName] = useState("");
  const [meetingDate, setMeetingDate] = useState<string | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [touched, setTouched] = useState(false);

  const close = () => {
    setName("");
    setMeetingDate(undefined);
    setStartTime("");
    setEndTime("");
    setTouched(false);
    onDone();
  };

  // "HH:MM" 24-hour validation matching the server schema.
  const timeValid = /^([01]?\d|2[0-3]):[0-5]\d$/.test(startTime.trim());
  const dateValid = meetingDate != null && DATE_ONLY_REGEX.test(meetingDate);
  // End time must be a valid slot AND fall after the start time.
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  const endValid = startMins != null && endMins != null && endMins > startMins;
  const isValid = name.trim().length > 0 && dateValid && timeValid && endValid;

  const submit = () => {
    setTouched(true);
    if (!isValid || meetingDate == null) return;
    createMeeting.mutate(
      {
        name: name.trim(),
        meetingDate,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
      },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          close();
        },
      },
    );
  };

  const errorMsg = createMeeting.error instanceof ApiError ? createMeeting.error.message : null;

  return (
    <AppSheet
      title={t("createMeeting")}
      onClose={close}
      footer={
        <>
          <View style={{ flex: 1 }}>
            <Button title={t("cancel")} variant="outline" onPress={close} />
          </View>
          <View style={{ flex: 1 }}>
            <SubmitButton title={t("save")} loading={createMeeting.isPending} onPress={submit} />
          </View>
        </>
      }
    >
      <Input
        label={t("meetingName")}
        placeholder="Board Meeting"
        icon="bookmark-outline"
        required
        value={name}
        onChangeText={setName}
        error={touched && !name.trim() ? t("required") : undefined}
      />
      <DatePicker
        label={t("date")}
        title={t("date")}
        placeholder={t("selectDate")}
        icon="calendar-outline"
        required
        value={meetingDate}
        onChange={setMeetingDate}
        error={touched && !dateValid ? t("required") : undefined}
      />
      <TimePicker
        label={t("startTime")}
        title={t("startTime")}
        placeholder={t("startTime")}
        icon="time-outline"
        required
        value={startTime || undefined}
        onChange={setStartTime}
        error={touched && !timeValid ? t("required") : undefined}
      />
      <TimePicker
        label={t("endTime")}
        title={t("endTime")}
        placeholder={t("endTime")}
        icon="time-outline"
        required
        value={endTime || undefined}
        onChange={setEndTime}
        error={
          touched && !endValid
            ? endMins != null && startMins != null
              ? t("endBeforeStart")
              : t("required")
            : undefined
        }
      />
      <FormError message={errorMsg} />
    </AppSheet>
  );
}
