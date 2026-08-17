import React, { useState } from "react";
import { View, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import {
  useBirthdays,
  useAbsentMembers,
  usePausedMembers,
  useAlertCounts,
  usePendingSets,
  useCompletedSets,
  useSendAlert,
  useSendAnnouncement,
} from "@/features/hooks";
import { SetVerifyScanner } from "@/features/SetVerifyScanner";
import {
  Screen,
  ScreenHeader,
  SectionHeader,
  Card,
  Text,
  Button,
  SubmitButton,
  Input,
  TextArea,
  Avatar,
  Badge,
  EmptyState,
  SkeletonCard,
  ListRow,
  IconTile,
  FilterChips,
  OptionRow,
} from "@/components/ui";
import { AppSheet, useControlledOverlay } from "@/components/overlay";
import type { AbsentMember, AlertAudience } from "@church/shared";
import { spacing, iconSize, staggerDelay } from "@/theme/tokens";

type Tab = "sets" | "birthdays" | "absences" | "paused" | "broadcast";

export default function Comms() {
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sets");
  const [composer, setComposer] = useState<"alert" | "announcement" | null>(null);
  const composerRef = React.useRef<"alert" | "announcement" | null>(null);
  composerRef.current = composer;

  const tabs: { value: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { value: "sets", icon: "gift-outline", label: t("setNotifications") },
    { value: "birthdays", icon: "balloon-outline", label: t("birthdays") },
    { value: "absences", icon: "person-remove-outline", label: t("absences") },
    { value: "paused", icon: "pause-circle-outline", label: t("pausedMembers") },
    { value: "broadcast", icon: "megaphone-outline", label: t("send") },
  ];

  // ONE overlay, ref-based selection — same pattern as the working polls screen.
  // Two separate useControlledOverlay calls leave a second full-screen layer
  // mounted that intercepts touches over the visible sheet (the freeze).
  useControlledOverlay(
    composer !== null,
    ({ close }) =>
      composerRef.current === "alert" ? (
        <AlertForm onDone={close} />
      ) : (
        <AnnouncementForm onDone={close} />
      ),
    { variant: "sheet", onClose: () => setComposer(null) },
  );

  return (
    <Screen>
      <ScreenHeader title={t("comms")} />

      {/* Polls & Trivia quick-link */}
      <ListRow
        leading={<IconTile icon="stats-chart-outline" tone="neutral" />}
        title={t("pollsTrivia")}
        chevron
        onPress={() => router.push("/(admin)/polls")}
      />

      {/* Horizontally scrollable so five labelled tabs stay on one line instead
          of wrapping into a three-row block that pushes content off-screen. */}
      <FilterChips value={tab} onChange={setTab} options={tabs} scrollable bleed />

      {tab === "sets" && <SetsView />}
      {tab === "birthdays" && <BirthdaysView />}
      {tab === "absences" && <AbsencesView />}
      {tab === "paused" && <PausedView />}
      {tab === "broadcast" && (
        <BroadcastView
          onAlert={() => setComposer("alert")}
          onAnnouncement={() => setComposer("announcement")}
        />
      )}
    </Screen>
  );
}

function SetsView() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const pending = usePendingSets();
  const completed = useCompletedSets();

  // Which pending set is currently being verified by QR scan.
  const [scanning, setScanning] = useState<{ setId: string; memberName: string } | null>(null);

  if (pending.isLoading) return <SkeletonCard />;
  const pendingSets = pending.data?.sets ?? [];
  const completedSets = completed.data?.sets ?? [];

  return (
    <View style={{ gap: spacing.md }}>
      <SetVerifyScanner
        visible={scanning != null}
        setId={scanning?.setId ?? null}
        memberName={scanning?.memberName ?? ""}
        onClose={() => setScanning(null)}
        onVerified={() => {
          setScanning(null);
        }}
      />

      {/* Pending verifications */}
      <SectionHeader title={t("pendingVerifications")} />
      {pendingSets.length === 0 ? (
        <EmptyState icon="gift-outline" title={t("noData")} />
      ) : (
        pendingSets.map((s, i) => (
          <ListRow
            key={s.id}
            animateIn
            delay={staggerDelay(i)}
            leading={<IconTile icon="gift-outline" tone="primary" />}
            title={s.memberName}
            subtitle={t("setCompleted")}
            trailing={
              <Button
                title={t("scanToVerify")}
                variant="secondary"
                size="sm"
                fullWidth={false}
                leftIcon={
                  <Ionicons name="qr-code-outline" size={iconSize.sm} color={colors.primary} />
                }
                onPress={() => {
                  void Haptics.selectionAsync();
                  setScanning({ setId: s.id, memberName: s.memberName });
                }}
              />
            }
          />
        ))
      )}

      {/* Completed / verified */}
      {completedSets.length > 0 ? (
        <>
          <SectionHeader title={t("completed")} />
          {completedSets.map((s, i) => (
            <ListRow
              key={s.id}
              animateIn
              delay={staggerDelay(i)}
              leading={<IconTile icon="checkmark-circle" tone="success" />}
              title={s.memberName}
              subtitle={t("verifiedGiftReceived")}
            />
          ))}
        </>
      ) : null}
    </View>
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
      {items.map((b, i) => (
        <ListRow
          key={b.id}
          animateIn
          delay={staggerDelay(i)}
          leading={<Avatar name={b.name} size={40} />}
          title={b.name}
          subtitle={b.phone}
          meta={`${birthdayLabel(b.birthday)} · ${t("age")} ${b.age}${b.group ? ` · ${t("group")}: ${b.group}` : ""}`}
          trailing={<Badge label={recencyLabel(b.daysAgo)} variant="primary" />}
        />
      ))}
    </>
  );
}

/** Shared row for an absence-derived member (Absences + Paused sections). */
function AbsentMemberRow({
  member,
  paused,
  index,
}: {
  member: AbsentMember;
  paused?: boolean;
  index: number;
}) {
  const { t } = useI18n();
  return (
    <ListRow
      animateIn
      delay={staggerDelay(index)}
      leading={<Avatar name={member.memberName} size={40} />}
      title={member.memberName}
      subtitle={member.phone}
      meta={member.group ? `${t("group")}: ${member.group}` : undefined}
      trailing={
        <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
          <Badge
            label={`${member.totalAbsences} · ${t("totalAbsences")}`}
            variant={paused ? "error" : "warning"}
          />
          {paused ? <Badge label={t("paused")} variant="error" dot /> : null}
        </View>
      }
    />
  );
}

function AbsencesView() {
  const { t } = useI18n();
  const absences = useAbsentMembers();
  if (absences.isLoading)
    return (
      <>
        <SkeletonCard />
        <SkeletonCard />
      </>
    );
  const items = absences.data?.members ?? [];
  if (items.length === 0) return <EmptyState icon="checkmark-circle-outline" title={t("noData")} />;
  return (
    <>
      {items.map((m, i) => (
        <AbsentMemberRow key={m.memberId} member={m} index={i} />
      ))}
    </>
  );
}

function PausedView() {
  const { t } = useI18n();
  const paused = usePausedMembers();
  if (paused.isLoading)
    return (
      <>
        <SkeletonCard />
        <SkeletonCard />
      </>
    );
  const items = paused.data?.members ?? [];
  if (items.length === 0) return <EmptyState icon="pause-circle-outline" title={t("noData")} />;
  return (
    <>
      {items.map((m, i) => (
        <AbsentMemberRow key={m.memberId} member={m} paused index={i} />
      ))}
    </>
  );
}

function BroadcastView({
  onAlert,
  onAnnouncement,
}: {
  onAlert: () => void;
  onAnnouncement: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={{ gap: spacing.md }}>
      <Card animateIn style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <IconTile icon="megaphone-outline" tone="primary" />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text variant="subheading">{t("sendAnnouncement")}</Text>
            <Text variant="caption" tone="muted">
              Posts to every member's home feed and notifications.
            </Text>
          </View>
        </View>
        <Button title={t("sendAnnouncement")} variant="outline" onPress={onAnnouncement} />
      </Card>

      <Card animateIn delay={60} style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <IconTile icon="alert-circle-outline" tone="warning" />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text variant="subheading">{t("sendAlert")}</Text>
            <Text variant="caption" tone="muted">
              Time-sensitive alert with read receipts.
            </Text>
          </View>
        </View>
        <Button title={t("sendAlert")} variant="outline" onPress={onAlert} />
      </Card>
    </View>
  );
}

function AlertForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const sendAlert = useSendAlert();
  const counts = useAlertCounts();
  const [audience, setAudience] = useState<AlertAudience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState(false);

  const close = () => {
    setTitle("");
    setBody("");
    setTouched(false);
    setAudience("all");
    onDone();
  };

  const onError = (err: unknown) => {
    Alert.alert(t("somethingWrong"), err instanceof Error ? err.message : t("somethingWrong"));
  };

  const submit = () => {
    setTouched(true);
    if (!title.trim() || !body.trim()) return;
    sendAlert.mutate({ title, message: body, audience }, { onSuccess: close, onError });
  };

  const audienceOptions: { key: AlertAudience; label: string; count: number | undefined }[] = [
    { key: "all", label: t("allMembers"), count: counts.data?.counts.all },
    { key: "absent_2", label: t("absentTwice"), count: counts.data?.counts.absent_2 },
    { key: "absent_6", label: t("absentSixTimes"), count: counts.data?.counts.absent_6 },
  ];

  return (
    <AppSheet
      title={t("sendAlert")}
      onClose={close}
      footer={
        <>
          <View style={{ flex: 1 }}>
            <Button title={t("cancel")} variant="outline" onPress={close} />
          </View>
          <View style={{ flex: 1 }}>
            <SubmitButton title={t("send")} loading={sendAlert.isPending} onPress={submit} />
          </View>
        </>
      }
    >
      {/* A single-choice audience is a radio group, not a stack of buttons —
          stacked primary buttons made every option look equally actionable. */}
      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" weight="500" tone="muted">
          {t("audience")}
        </Text>
        {audienceOptions.map((opt) => (
          <OptionRow
            key={opt.key}
            label={opt.label}
            state={audience === opt.key ? "selected" : "idle"}
            trailing={counts.isLoading || opt.count === undefined ? "…" : String(opt.count)}
            onPress={() => setAudience(opt.key)}
          />
        ))}
      </View>

      <Input
        label={t("title")}
        value={title}
        onChangeText={setTitle}
        error={touched && !title.trim() ? t("required") : undefined}
      />
      <TextArea
        label={t("message")}
        value={body}
        onChangeText={setBody}
        error={touched && !body.trim() ? t("required") : undefined}
      />
    </AppSheet>
  );
}

type AnnouncementCategory = "trips" | "occasions" | "custom";

function AnnouncementForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const sendAnnouncement = useSendAnnouncement();
  const [category, setCategory] = useState<AnnouncementCategory>("trips");
  const [customTitle, setCustomTitle] = useState("");
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState(false);

  // Trips/Occasions use the preset label as the title; Custom uses the typed value.
  const title = category === "custom" ? customTitle : t(category);

  const close = () => {
    setCategory("trips");
    setCustomTitle("");
    setBody("");
    setTouched(false);
    onDone();
  };

  const onError = (err: unknown) => {
    Alert.alert(t("somethingWrong"), err instanceof Error ? err.message : t("somethingWrong"));
  };

  const submit = () => {
    setTouched(true);
    if (!title.trim() || !body.trim()) return;
    sendAnnouncement.mutate({ title, body, category }, { onSuccess: close, onError });
  };

  const categoryOptions: { key: AnnouncementCategory; label: string }[] = [
    { key: "trips", label: t("trips") },
    { key: "occasions", label: t("occasions") },
    { key: "custom", label: t("custom") },
  ];

  return (
    <AppSheet
      title={t("sendAnnouncement")}
      onClose={close}
      footer={
        <>
          <View style={{ flex: 1 }}>
            <Button title={t("cancel")} variant="outline" onPress={close} />
          </View>
          <View style={{ flex: 1 }}>
            <SubmitButton title={t("send")} loading={sendAnnouncement.isPending} onPress={submit} />
          </View>
        </>
      }
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" weight="500" tone="muted">
          {t("category")}
        </Text>
        {categoryOptions.map((opt) => (
          <OptionRow
            key={opt.key}
            label={opt.label}
            state={category === opt.key ? "selected" : "idle"}
            onPress={() => setCategory(opt.key)}
          />
        ))}
      </View>

      {category === "custom" ? (
        <Input
          label={t("title")}
          value={customTitle}
          onChangeText={setCustomTitle}
          error={touched && !customTitle.trim() ? t("required") : undefined}
        />
      ) : null}
      <TextArea
        label={t("body")}
        value={body}
        onChangeText={setBody}
        error={touched && !body.trim() ? t("required") : undefined}
      />
    </AppSheet>
  );
}
