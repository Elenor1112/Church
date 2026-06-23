import React, { useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useForm, Controller } from "react-hook-form";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import {
  useBirthdays,
  useAbsentMembers,
  usePausedMembers,
  useAlertCounts,
  usePendingSets,
  useClaimReward,
  useSendAlert,
  useSendAnnouncement,
} from "@/features/hooks";
import {
  Screen,
  Card,
  Text,
  Button,
  Input,
  Avatar,
  Badge,
  EmptyState,
  SkeletonCard,
} from "@/components/ui";
import { AppSheet, useControlledOverlay } from "@/components/overlay";
import type { AbsentMember, AlertAudience } from "@church/shared";
import { radius } from "@/theme/tokens";

type Tab = "sets" | "birthdays" | "absences" | "paused" | "broadcast";

export default function Comms() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("sets");
  const [composer, setComposer] = useState<"alert" | "announcement" | null>(null);

  const tabs: { key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: "sets", icon: "gift", label: t("setNotifications") },
    { key: "birthdays", icon: "balloon", label: t("birthdays") },
    { key: "absences", icon: "person-remove", label: t("absences") },
    { key: "paused", icon: "pause-circle", label: t("pausedMembers") },
    { key: "broadcast", icon: "megaphone", label: t("send") },
  ];

  // Compose-sheet driven by the global overlay host (no native <Modal>). The
  // host renders above the tab bar; closing the overlay clears `composer`.
  useControlledOverlay(
    composer != null,
    ({ close }) => <ComposerForm type={composer} onDone={close} />,
    { variant: "sheet", onClose: () => setComposer(null) },
  );

  return (
    <Screen>
      <Text variant="title">{t("comms")}</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {tabs.map((tb) => {
          const active = tab === tb.key;
          return (
            <Pressable
              key={tb.key}
              onPress={() => setTab(tb.key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.primary : colors.cardAlt,
              }}
            >
              <Ionicons name={tb.icon} size={16} color={active ? "#fff" : colors.muted} />
              <Text variant="caption" weight="600" style={{ color: active ? "#fff" : colors.muted }}>
                {tb.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "sets" && <SetsView />}
      {tab === "birthdays" && <BirthdaysView />}
      {tab === "absences" && <AbsencesView />}
      {tab === "paused" && <PausedView />}
      {tab === "broadcast" && <BroadcastView onCompose={setComposer} />}
    </Screen>
  );
}

function SetsView() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const pending = usePendingSets();
  const claim = useClaimReward();
  if (pending.isLoading) return <SkeletonCard />;
  const sets = pending.data?.sets ?? [];
  if (sets.length === 0) return <EmptyState icon="gift-outline" title={t("noData")} />;
  return (
    <>
      {sets.map((s) => (
        <Card key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.gold + "22", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="gift" size={22} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text weight="600">{s.memberName}</Text>
            <Text variant="caption" tone="muted">Completed a set 🎁</Text>
          </View>
          <Pressable
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              claim.mutate(s.id);
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.success + "18", paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill }}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text variant="caption" weight="600" tone="success">{t("giftDelivered")}</Text>
          </Pressable>
        </Card>
      ))}
    </>
  );
}

function BirthdaysView() {
  const { t } = useI18n();
  const birthdays = useBirthdays();
  if (birthdays.isLoading) return <SkeletonCard />;
  const items = birthdays.data?.birthdays ?? [];
  if (items.length === 0) return <EmptyState icon="balloon-outline" title={t("noData")} />;

  // "Today" / "Yesterday" / "N days ago" from the server-computed offset.
  const recencyLabel = (daysAgo: number) =>
    daysAgo <= 0 ? t("today") : daysAgo === 1 ? t("yesterday") : `${daysAgo} ${t("daysAgo")}`;

  // Birthday as a localized day/month (year omitted — the cohort is anniversaries).
  const birthdayLabel = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" });

  return (
    <>
      {items.map((b) => (
        <Card key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar name={b.name} size={42} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text weight="600">{b.name}</Text>
            <Text variant="caption" tone="muted">{b.phone}</Text>
            <Text variant="small" tone="muted">
              {birthdayLabel(b.birthday)} · {t("age")} {b.age}
              {b.group ? ` · ${t("group")}: ${b.group}` : ""}
            </Text>
          </View>
          <Badge label={recencyLabel(b.daysAgo)} variant="gold" />
        </Card>
      ))}
    </>
  );
}

/** Shared card for an absence-derived member (Absences + Paused sections). */
function AbsentMemberCard({ member, paused }: { member: AbsentMember; paused?: boolean }) {
  const { t } = useI18n();
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Avatar name={member.memberName} size={42} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="600">{member.memberName}</Text>
        <Text variant="caption" tone="muted">{member.phone}</Text>
        {member.group ? (
          <Text variant="small" tone="muted">{t("group")}: {member.group}</Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Badge
          label={`${member.totalAbsences} · ${t("totalAbsences")}`}
          variant={paused ? "error" : "warning"}
        />
        {paused ? <Badge label={t("paused")} variant="error" /> : null}
      </View>
    </Card>
  );
}

function AbsencesView() {
  const { t } = useI18n();
  const absences = useAbsentMembers();
  if (absences.isLoading) return <><SkeletonCard /><SkeletonCard /></>;
  const items = absences.data?.members ?? [];
  if (items.length === 0) return <EmptyState icon="checkmark-circle-outline" title={t("noData")} />;
  return (
    <>
      {items.map((m) => (
        <AbsentMemberCard key={m.memberId} member={m} />
      ))}
    </>
  );
}

function PausedView() {
  const { t } = useI18n();
  const paused = usePausedMembers();
  if (paused.isLoading) return <><SkeletonCard /><SkeletonCard /></>;
  const items = paused.data?.members ?? [];
  if (items.length === 0) return <EmptyState icon="pause-circle-outline" title={t("noData")} />;
  return (
    <>
      {items.map((m) => (
        <AbsentMemberCard key={m.memberId} member={m} paused />
      ))}
    </>
  );
}

function BroadcastView({ onCompose }: { onCompose: (t: "alert" | "announcement") => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="megaphone" size={22} color={colors.primary} />
          <Text weight="600" style={{ flex: 1 }}>{t("sendAnnouncement")}</Text>
        </View>
        <Text variant="caption" tone="muted">Posts to every member's home feed and notifications.</Text>
        <Button title={t("sendAnnouncement")} variant="outline" onPress={() => onCompose("announcement")} />
      </Card>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="alert-circle" size={22} color={colors.warning} />
          <Text weight="600" style={{ flex: 1 }}>{t("sendAlert")}</Text>
        </View>
        <Text variant="caption" tone="muted">Time-sensitive alert with read receipts.</Text>
        <Button title={t("sendAlert")} variant="outline" onPress={() => onCompose("alert")} />
      </Card>
    </View>
  );
}

function ComposerForm({ type, onDone }: { type: "alert" | "announcement" | null; onDone: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const sendAlert = useSendAlert();
  const sendAnnouncement = useSendAnnouncement();
  const counts = useAlertCounts();
  const [audience, setAudience] = useState<AlertAudience>("all");
  const { control, handleSubmit, reset } = useForm({ defaultValues: { title: "", body: "" } });

  // `type` momentarily goes null while the overlay plays its exit animation;
  // keep the last real value so the sheet doesn't blank out mid-close.
  const lastType = React.useRef<"alert" | "announcement">("announcement");
  if (type) lastType.current = type;
  const shownType = type ?? lastType.current;

  const close = () => { reset(); setAudience("all"); onDone(); };

  // Surface send failures instead of letting the button spin forever.
  const onError = (err: unknown) => {
    const message = err instanceof Error ? err.message : t("somethingWrong");
    Alert.alert(t("somethingWrong"), message);
  };

  const submit = handleSubmit((values) => {
    if (!values.title || !values.body) return;
    if (shownType === "alert")
      sendAlert.mutate(
        { title: values.title, message: values.body, audience },
        { onSuccess: close, onError },
      );
    else
      sendAnnouncement.mutate(
        { title: values.title, body: values.body },
        { onSuccess: close, onError },
      );
  });

  const pending = sendAlert.isPending || sendAnnouncement.isPending;

  const audienceOptions: { key: AlertAudience; label: string; count: number | undefined }[] = [
    { key: "all", label: t("allMembers"), count: counts.data?.counts.all },
    { key: "absent_2", label: t("absentTwice"), count: counts.data?.counts.absent_2 },
    { key: "absent_6", label: t("absentSixTimes"), count: counts.data?.counts.absent_6 },
  ];

  // Rendered inside the global OverlayHost as a bottom sheet — no native
  // <Modal>, so there's no separate native window and no Fabric re-measure
  // freeze. AppSheet handles the header/scroll-body/footer layout; the host
  // handles the backdrop, slide-up animation, and backdrop/back dismissal.
  return (
    <AppSheet
      title={shownType === "alert" ? t("sendAlert") : t("sendAnnouncement")}
      onClose={close}
      footer={
        <>
          <View style={{ flex: 1 }}><Button title={t("cancel")} variant="outline" onPress={close} /></View>
          <View style={{ flex: 1 }}><Button title={t("send")} loading={pending} onPress={submit} /></View>
        </>
      }
    >
      {shownType === "alert" ? (
        <View style={{ gap: 8 }}>
          <Text variant="caption" weight="600" tone="muted">{t("audience")}</Text>
          {audienceOptions.map((opt) => {
            const active = audience === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setAudience(opt.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary + "12" : colors.cardAlt,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={active ? colors.primary : colors.muted}
                  />
                  <Text weight="600" style={{ color: active ? colors.primary : colors.ink }}>
                    {opt.label}
                  </Text>
                </View>
                <Badge
                  label={counts.isLoading || opt.count === undefined ? "…" : String(opt.count)}
                  variant={active ? "info" : "neutral"}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Controller control={control} name="title" render={({ field }) => (
        <Input label={t("title")} value={field.value} onChangeText={field.onChange} />
      )} />
      <Controller control={control} name="body" render={({ field }) => (
        <Input label={shownType === "alert" ? t("message") : t("body")} value={field.value} onChangeText={field.onChange} multiline numberOfLines={4} style={{ height: 100, textAlignVertical: "top" }} />
      )} />
    </AppSheet>
  );
}
