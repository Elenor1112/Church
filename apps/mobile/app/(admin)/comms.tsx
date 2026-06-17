import React, { useState } from "react";
import { View, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useForm, Controller } from "react-hook-form";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import {
  useBirthdays,
  useAbsences,
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
  SectionHeader,
  EmptyState,
  SkeletonCard,
} from "@/components/ui";
import { radius } from "@/theme/tokens";

type Tab = "sets" | "birthdays" | "absences" | "broadcast";

export default function Comms() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("sets");
  const [composer, setComposer] = useState<"alert" | "announcement" | null>(null);

  const tabs: { key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: "sets", icon: "gift", label: t("setNotifications") },
    { key: "birthdays", icon: "balloon", label: t("birthdays") },
    { key: "absences", icon: "person-remove", label: t("absences") },
    { key: "broadcast", icon: "megaphone", label: t("send") },
  ];

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
      {tab === "broadcast" && <BroadcastView onCompose={setComposer} />}

      <ComposerModal type={composer} onClose={() => setComposer(null)} />
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
  return (
    <>
      {items.map((b) => (
        <Card key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar name={b.name} size={42} />
          <View style={{ flex: 1 }}>
            <Text weight="600">{b.name}</Text>
            <Text variant="caption" tone="muted">{b.phone}</Text>
          </View>
          <Badge label={b.monthDay} variant="gold" />
        </Card>
      ))}
    </>
  );
}

function AbsencesView() {
  const { t } = useI18n();
  const absences = useAbsences();
  if (absences.isLoading) return <SkeletonCard />;
  const items = absences.data?.absences ?? [];
  if (items.length === 0) return <EmptyState icon="checkmark-circle-outline" title={t("noData")} />;
  return (
    <>
      {items.map((a) => (
        <Card key={a.id} style={{ gap: 4 }}>
          <Text weight="600">{a.memberName}</Text>
          <Text variant="caption" tone="muted">{a.date}{a.reason ? ` · ${a.reason}` : ""}</Text>
        </Card>
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

function ComposerModal({ type, onClose }: { type: "alert" | "announcement" | null; onClose: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const sendAlert = useSendAlert();
  const sendAnnouncement = useSendAnnouncement();
  const { control, handleSubmit, reset } = useForm({ defaultValues: { title: "", body: "" } });

  const submit = handleSubmit((values) => {
    if (!values.title || !values.body) return;
    const done = () => { reset(); onClose(); };
    if (type === "alert") sendAlert.mutate({ title: values.title, message: values.body }, { onSuccess: done });
    else sendAnnouncement.mutate({ title: values.title, body: values.body }, { onSuccess: done });
  });

  const pending = sendAlert.isPending || sendAnnouncement.isPending;

  return (
    <Modal visible={!!type} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 24, gap: 16 }}>
          <Text variant="heading">{type === "alert" ? t("sendAlert") : t("sendAnnouncement")}</Text>
          <Controller control={control} name="title" render={({ field }) => (
            <Input label={t("title")} value={field.value} onChangeText={field.onChange} />
          )} />
          <Controller control={control} name="body" render={({ field }) => (
            <Input label={type === "alert" ? t("message") : t("body")} value={field.value} onChangeText={field.onChange} multiline numberOfLines={4} style={{ height: 100, textAlignVertical: "top" }} />
          )} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Button title={t("cancel")} variant="outline" onPress={() => { reset(); onClose(); }} /></View>
            <View style={{ flex: 1 }}><Button title={t("send")} loading={pending} onPress={submit} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
