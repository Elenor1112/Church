import React, { useState } from "react";
import {
  View,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useUsers, useSetUserStatus, useCreateUser, useCreateAdmin } from "@/features/hooks";
import { ApiError } from "@/lib/api";
import {
  Text,
  Button,
  SubmitButton,
  Input,
  Select,
  DatePicker,
  Avatar,
  Badge,
  EmptyState,
  SkeletonCard,
  PermissionToggle,
  ListRow,
  FilterChips,
  type SelectOption,
} from "@/components/ui";
import { AREAS } from "@church/shared";

// Area options show both Arabic and English labels together.
const AREA_OPTIONS: SelectOption<(typeof AREAS)[number]["slug"]>[] = AREAS.map((a) => ({
  value: a.slug,
  label: `${a.labelAr} : ${a.labelEn}`,
}));
import { radius, spacing, hairline, iconSize, staggerDelay } from "@/theme/tokens";
import type { PublicUser, Role, UserStatus } from "@church/shared";

interface Props {
  /** Super admins get role filters + create-admin; admins only manage members. */
  superAdmin?: boolean;
}

export function MemberDirectory({ superAdmin = false }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const [status, setStatus] = useState<"all" | UserStatus>(superAdmin ? "all" : "pending");
  const [creator, setCreator] = useState<"member" | "admin" | null>(null);

  const openCreator = (kind: "member" | "admin") => setCreator(kind);

  const { data, isLoading } = useUsers({ role, status, q });
  const setStatusMut = useSetUserStatus();
  const users = data?.users ?? [];

  return (
      <View style={{ gap: spacing.md }}>
        <Input
          icon="search"
          placeholder={t("search")}
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {/* Status filter */}
        <FilterChips
          value={status}
          onChange={(v) => setStatus(v as "all" | UserStatus)}
          scrollable
          bleed
          options={[
            { value: "all", label: t("all") },
            { value: "pending", label: t("pending") },
            { value: "approved", label: t("approved") },
            { value: "rejected", label: t("rejected") },
          ]}
        />

        {superAdmin ? (
          <FilterChips
            value={role}
            onChange={(v) => setRole(v as "all" | Role)}
            scrollable
            bleed
            options={[
              { value: "all", label: t("all") },
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
              { value: "super_admin", label: "Super" },
            ]}
          />
        ) : null}

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button
              title={t("addMember")}
              variant="outline"
              size="sm"
              leftIcon={<Ionicons name="person-add-outline" size={iconSize.sm} color={colors.ink} />}
              onPress={() => openCreator("member")}
            />
          </View>
          {superAdmin ? (
            <View style={{ flex: 1 }}>
              <Button
                title={t("createAdmin")}
                size="sm"
                leftIcon={<Ionicons name="shield-outline" size={iconSize.sm} color={colors.onPrimary} />}
                onPress={() => openCreator("admin")}
              />
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : users.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={t("noData")}
            subtitle={q ? undefined : t("registrationSubtitle")}
          />
        ) : (
          users.map((u, i) => (
            <MemberRow
              key={u.id}
              user={u}
              superAdmin={superAdmin}
              busy={setStatusMut.isPending}
              index={i}
              onStatus={(s) => setStatusMut.mutate({ id: u.id, status: s })}
            />
          ))
        )}

        {/* Self-contained native <Modal> owned by the form itself — its own OS
            window with isolated hit-testing. Not routed through the shared
            OverlayHost. */}
        <CreateUserForm kind={creator} onDone={() => setCreator(null)} />
      </View>
  );
}

function statusVariant(s: UserStatus) {
  return s === "approved" ? "success" : s === "pending" ? "warning" : "error";
}

function MemberRow({
  user,
  superAdmin,
  busy,
  index,
  onStatus,
}: {
  user: PublicUser;
  superAdmin: boolean;
  busy: boolean;
  index: number;
  onStatus: (s: UserStatus) => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const name = `${user.firstName} ${user.lastName}`;

  // Action set depends on current status + role privileges.
  const actions: { label: string; status: UserStatus; tone: "success" | "error" | "muted" }[] = [];
  if (user.status === "pending") {
    actions.push({ label: t("approve"), status: "approved", tone: "success" });
    actions.push({ label: t("reject"), status: "rejected", tone: "error" });
  } else if (user.status === "approved") {
    if (superAdmin) actions.push({ label: t("deactivate"), status: "rejected", tone: "error" });
  } else if (user.status === "rejected") {
    if (superAdmin) actions.push({ label: t("restore"), status: "approved", tone: "success" });
    else actions.push({ label: t("approve"), status: "approved", tone: "success" });
  }

  return (
    <ListRow
      animateIn
      delay={staggerDelay(index)}
      leading={<Avatar name={name} uri={user.profileImage} size={40} />}
      title={name}
      subtitle={user.phone}
      trailing={
        <View style={{ gap: spacing.xs, alignItems: "flex-end" }}>
          <Badge
            label={t(user.status as "pending" | "approved" | "rejected")}
            variant={statusVariant(user.status)}
            dot
          />
          {user.role !== "member" ? (
            <Badge label={user.role === "super_admin" ? "Super" : "Admin"} variant="primary" />
          ) : null}
        </View>
      }
    >
      {actions.length > 0 ? (
        // Actions sit below a divider so they read as operations on the row
        // above rather than as part of its content.
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            borderTopWidth: hairline,
            borderTopColor: colors.border,
            paddingTop: spacing.md,
          }}
        >
          {actions.map((a) => (
            <View key={a.label} style={{ flex: 1 }}>
              <Button
                title={a.label}
                variant={a.tone === "error" ? "danger" : "secondary"}
                size="sm"
                disabled={busy}
                onPress={() => onStatus(a.status)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </ListRow>
  );
}

function CreateUserForm({ kind, onDone }: { kind: "member" | "admin" | null; onDone: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const createUser = useCreateUser();
  const createAdmin = useCreateAdmin();
  // Keep the last non-null kind so the body still renders correctly while the
  // overlay plays its exit animation (during which `kind` goes null).
  const lastKind = React.useRef<"member" | "admin">("member");
  if (kind) lastKind.current = kind;
  const shownKind = kind ?? lastKind.current;
  const [perms, setPerms] = useState({
    can_scan: true,
    can_scan_admins: false,
    can_view_logs: true,
    can_send_messages: false,
    can_generate_reports: false,
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { firstName: "", lastName: "", phone: "", area: undefined, addressDetails: "", birthday: "", password: "" },
  });

  // The form is mounted fresh each time the overlay opens (and unmounted on
  // close) by useControlledOverlay, so it always starts clean — no reset effect
  // needed the way the old persistent <Modal> required.

  const submit = handleSubmit((v) => {
    const done = () => { reset(); onDone(); };
    if (shownKind === "admin") {
      createAdmin.mutate({ ...v, permissions: perms }, { onSuccess: done });
    } else {
      createUser.mutate({ ...v, role: "member", status: "approved" }, { onSuccess: done });
    }
  });

  const pending = createUser.isPending || createAdmin.isPending;
  const mutationError = createUser.error ?? createAdmin.error;
  const errorMsg =
    mutationError instanceof ApiError ? mutationError.message : mutationError ? t("somethingWrong") : null;
  const permMeta: { key: keyof typeof perms; icon: "scan" | "shield-checkmark" | "list" | "chatbubbles" | "bar-chart"; titleKey: "canScan" | "canScanAdmins" | "canViewLogs" | "canSendMessages" | "canGenerateReports" }[] = [
    { key: "can_scan", icon: "scan", titleKey: "canScan" },
    { key: "can_scan_admins", icon: "shield-checkmark", titleKey: "canScanAdmins" },
    { key: "can_view_logs", icon: "list", titleKey: "canViewLogs" },
    { key: "can_send_messages", icon: "chatbubbles", titleKey: "canSendMessages" },
    { key: "can_generate_reports", icon: "bar-chart", titleKey: "canGenerateReports" },
  ];

  const close = () => { reset(); onDone(); };

  // Self-contained native <Modal> — its own OS window with correct, isolated
  // hit-testing (identical concept to <Select>/<DatePicker>, which work). NO
  // shared OverlayHost, NO absoluteFill backdrop overlapping the content, NO
  // box-none, NO Reanimated, NO gesture-handler. The backdrop is a plain
  // Pressable spacer ABOVE the sheet (never over the fields); the sheet is a
  // plain View with a normal ScrollView body.
  // NO `statusBarTranslucent` either: on Android (new arch + keyboard "pan"
  // mode) it offsets the Modal's touch coordinates, so every field in the
  // sheet reads as untappable — the same bug that forced its removal from
  // <Select>/<DatePicker>/<TimePicker>.
  return (
    <Modal
      visible={kind != null}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={sheetStyles.layer}
      >
        {/* Dismiss backdrop — absoluteFill Pressable painted BEHIND the sheet
            (first child). The sheet is a later sibling that paints on top and
            owns its own touches; only the exposed area above the sheet triggers
            dismiss. This is exactly how <Select> is structured, which works. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />

        {/* Sheet — plain View. flexShrink lets it size to content up to 85% of
            the screen; the header/body/footer are non-overlapping flex rows. */}
        <View
          style={{
            flexShrink: 1,
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            borderTopWidth: hairline,
            borderColor: colors.border,
          }}
        >
          {/* Grabber — matches AppSheet so every bottom panel reads the same. */}
          <View
            style={{
              alignSelf: "center",
              width: 36,
              height: 4,
              borderRadius: radius.pill,
              backgroundColor: colors.borderStrong,
              marginTop: spacing.md,
            }}
          />

          <View style={sheetStyles.header}>
            <Text variant="heading">{shownKind === "admin" ? t("createAdmin") : t("addMember")}</Text>
            <Pressable onPress={close} hitSlop={16} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={iconSize.lg} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16, gap: 16 }}
            showsVerticalScrollIndicator={false}
            // "always": every tap reaches the control on the FIRST touch, even
            // while the keyboard is open (with "handled" the first tap is eaten
            // just to dismiss the keyboard → felt like it needed many clicks).
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
          >
            <Controller control={control} name="firstName" render={({ field }) => (<Input label={t("firstName")} value={field.value} onChangeText={field.onChange} />)} />
            <Controller control={control} name="lastName" render={({ field }) => (<Input label={t("lastName")} value={field.value} onChangeText={field.onChange} />)} />
            <Controller control={control} name="phone" render={({ field }) => (<Input label={t("phone")} keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />)} />
            <Controller control={control} name="area" render={({ field }) => (<Select label={t("area")} title={t("selectArea")} placeholder={t("selectArea")} icon="location-outline" value={field.value} options={AREA_OPTIONS} onChange={field.onChange} />)} />
            <Controller control={control} name="addressDetails" render={({ field }) => (<Input label={t("addressDetails")} icon="home-outline" placeholder={t("addressDetailsPlaceholder")} value={field.value} onChangeText={field.onChange} />)} />
            <Controller
              control={control}
              name="birthday"
              rules={{ required: t("required"), pattern: { value: /^\d{4}-\d{2}-\d{2}$/, message: t("required") } }}
              render={({ field }) => (
                <DatePicker
                  label={t("birthday")}
                  title={t("birthday")}
                  placeholder={t("selectDate")}
                  icon="calendar-outline"
                  value={field.value || undefined}
                  onChange={field.onChange}
                  error={errors.birthday?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              rules={{ required: t("required"), minLength: { value: 8, message: t("passwordMin") } }}
              render={({ field }) => (
                <Input label={t("password")} secure value={field.value} onChangeText={field.onChange} error={errors.password?.message} />
              )}
            />

            {shownKind === "admin" ? (
              <View style={{ gap: 8 }}>
                <Text weight="600">{t("permissions")}</Text>
                {permMeta.map((p) => (
                  <PermissionToggle
                    key={p.key}
                    icon={p.icon}
                    title={t(p.titleKey)}
                    description=""
                    value={perms[p.key]}
                    onChange={(val) => setPerms((prev) => ({ ...prev, [p.key]: val }))}
                  />
                ))}
              </View>
            ) : null}

            {errorMsg ? (
              <Text tone="error" center>
                {errorMsg}
              </Text>
            ) : null}
          </ScrollView>

          <View style={[sheetStyles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}><Button title={t("cancel")} variant="outline" onPress={close} /></View>
            <View style={{ flex: 1 }}><SubmitButton title={t("save")} loading={pending} onPress={submit} /></View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  layer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16,18,23,0.45)" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
