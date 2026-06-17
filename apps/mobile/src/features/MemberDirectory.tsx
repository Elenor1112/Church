import React, { useState } from "react";
import { View, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useUsers, useSetUserStatus, useCreateUser, useCreateAdmin } from "@/features/hooks";
import { useAuthStore } from "@/store/authStore";
import {
  Card,
  Text,
  Button,
  Input,
  Avatar,
  Badge,
  EmptyState,
  SkeletonCard,
  PermissionToggle,
} from "@/components/ui";
import { radius } from "@/theme/tokens";
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

  const { data, isLoading } = useUsers({ role, status, q });
  const setStatusMut = useSetUserStatus();
  const users = data?.users ?? [];

  return (
    <View style={{ gap: 12 }}>
      <Input icon="search" placeholder={t("search")} value={q} onChangeText={setQ} autoCapitalize="none" />

      {/* Status filter */}
      <FilterRow
        value={status}
        onChange={(v) => setStatus(v as "all" | UserStatus)}
        options={[
          { value: "all", label: t("all") },
          { value: "pending", label: t("pending") },
          { value: "approved", label: t("approved") },
          { value: "rejected", label: t("rejected") },
        ]}
      />

      {superAdmin ? (
        <FilterRow
          value={role}
          onChange={(v) => setRole(v as "all" | Role)}
          options={[
            { value: "all", label: t("all") },
            { value: "member", label: "Member" },
            { value: "admin", label: "Admin" },
            { value: "super_admin", label: "Super" },
          ]}
        />
      ) : null}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button
            title={t("addMember")}
            variant="outline"
            size="sm"
            leftIcon={<Ionicons name="person-add-outline" size={16} color={colors.primary} />}
            onPress={() => setCreator("member")}
          />
        </View>
        {superAdmin ? (
          <View style={{ flex: 1 }}>
            <Button
              title={t("createAdmin")}
              size="sm"
              leftIcon={<Ionicons name="shield-outline" size={16} color="#fff" />}
              onPress={() => setCreator("admin")}
            />
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <><SkeletonCard /><SkeletonCard /></>
      ) : users.length === 0 ? (
        <EmptyState icon="people-outline" title={t("noData")} />
      ) : (
        users.map((u) => (
          <MemberRow
            key={u.id}
            user={u}
            superAdmin={superAdmin}
            busy={setStatusMut.isPending}
            onStatus={(s) => setStatusMut.mutate({ id: u.id, status: s })}
          />
        ))
      )}

      <CreateUserModal kind={creator} onClose={() => setCreator(null)} />
    </View>
  );
}

function FilterRow({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: radius.pill,
              backgroundColor: active ? colors.primary : colors.cardAlt,
            }}
          >
            <Text variant="caption" weight="600" style={{ color: active ? "#fff" : colors.muted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
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
  onStatus,
}: {
  user: PublicUser;
  superAdmin: boolean;
  busy: boolean;
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
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={name} uri={user.profileImage} size={44} />
        <View style={{ flex: 1 }}>
          <Text weight="600">{name}</Text>
          <Text variant="caption" tone="muted">{user.phone}</Text>
        </View>
        <View style={{ gap: 4, alignItems: "flex-end" }}>
          <Badge label={t(user.status as "pending" | "approved" | "rejected")} variant={statusVariant(user.status)} />
          {user.role !== "member" ? (
            <Badge label={user.role === "super_admin" ? "Super" : "Admin"} variant="gold" />
          ) : null}
        </View>
      </View>
      {actions.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              disabled={busy}
              onPress={() => onStatus(a.status)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: radius.sm,
                alignItems: "center",
                backgroundColor:
                  a.tone === "success" ? colors.success + "18" : a.tone === "error" ? colors.error + "18" : colors.cardAlt,
              }}
            >
              <Text variant="caption" weight="600" tone={a.tone === "muted" ? "muted" : a.tone}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function CreateUserModal({ kind, onClose }: { kind: "member" | "admin" | null; onClose: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const createUser = useCreateUser();
  const createAdmin = useCreateAdmin();
  const [perms, setPerms] = useState({
    can_scan: true,
    can_view_logs: true,
    can_send_messages: false,
    can_generate_reports: false,
  });

  const { control, handleSubmit, reset } = useForm({
    defaultValues: { firstName: "", lastName: "", phone: "", birthday: "", password: "" },
  });

  const submit = handleSubmit((v) => {
    const done = () => { reset(); onClose(); };
    if (kind === "admin") {
      createAdmin.mutate({ ...v, permissions: perms }, { onSuccess: done });
    } else {
      createUser.mutate({ ...v, role: "member", status: "approved" }, { onSuccess: done });
    }
  });

  const pending = createUser.isPending || createAdmin.isPending;
  const permMeta: { key: keyof typeof perms; icon: "scan" | "list" | "chatbubbles" | "bar-chart"; titleKey: "canScan" | "canViewLogs" | "canSendMessages" | "canGenerateReports" }[] = [
    { key: "can_scan", icon: "scan", titleKey: "canScan" },
    { key: "can_view_logs", icon: "list", titleKey: "canViewLogs" },
    { key: "can_send_messages", icon: "chatbubbles", titleKey: "canSendMessages" },
    { key: "can_generate_reports", icon: "bar-chart", titleKey: "canGenerateReports" },
  ];

  return (
    <Modal visible={!!kind} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 24, gap: 14, maxHeight: "92%" }}>
          <Text variant="heading">{kind === "admin" ? t("createAdmin") : t("addMember")}</Text>
          <Controller control={control} name="firstName" render={({ field }) => (<Input label={t("firstName")} value={field.value} onChangeText={field.onChange} />)} />
          <Controller control={control} name="lastName" render={({ field }) => (<Input label={t("lastName")} value={field.value} onChangeText={field.onChange} />)} />
          <Controller control={control} name="phone" render={({ field }) => (<Input label={t("phone")} keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />)} />
          <Controller control={control} name="birthday" render={({ field }) => (<Input label={t("birthday")} placeholder="1995-06-17" autoCapitalize="none" value={field.value} onChangeText={field.onChange} />)} />
          <Controller control={control} name="password" render={({ field }) => (<Input label={t("password")} secure value={field.value} onChangeText={field.onChange} />)} />

          {kind === "admin" ? (
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

          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <View style={{ flex: 1 }}><Button title={t("cancel")} variant="outline" onPress={() => { reset(); onClose(); }} /></View>
            <View style={{ flex: 1 }}><Button title={t("save")} loading={pending} onPress={submit} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
