import React, { useState } from "react";
import { View, Pressable, Switch, Alert, ActivityIndicator, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/store/authStore";
import { useUpdateProfile, useMyQr } from "@/features/hooks";
import {
  Screen,
  Card,
  Text,
  Button,
  SubmitButton,
  Input,
  Avatar,
  Badge,
  SectionHeader,
} from "@/components/ui";
import { radius, spacing, hairline, iconSize } from "@/theme/tokens";

export function ProfileScreen() {
  const { colors, isDark, setMode } = useTheme();
  const { t, lang, setLang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Admins/super admins get a scannable QR here (members have a dedicated QR tab).
  const isStaff = user?.role === "admin" || user?.role === "super_admin";

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
    },
  });

  if (!user) return null;
  const fullName = `${user.firstName} ${user.lastName}`;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("changePhoto"), "Photo permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      const dataUrl = `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
      updateProfile.mutate({ profileImage: dataUrl });
    }
  };

  const onSave = handleSubmit((values) => {
    updateProfile.mutate(
      { firstName: values.firstName, lastName: values.lastName, email: values.email || null },
      { onSuccess: () => setEditing(false) },
    );
  });

  const roleLabel =
    user.role === "super_admin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Member";

  return (
    <Screen>
      {/* Identity — sits directly on the background rather than in a card. The
          person is the subject of the screen, not an item listed on it. */}
      <View style={{ alignItems: "center", gap: spacing.lg, paddingVertical: spacing.lg }}>
        <Pressable onPress={pickImage} accessibilityRole="button" accessibilityLabel={t("changePhoto")}>
          <Avatar name={fullName} uri={user.profileImage} size={88} />
          <View
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              backgroundColor: colors.card,
              borderRadius: radius.pill,
              padding: spacing.sm,
              borderWidth: hairline,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="camera" size={iconSize.xs} color={colors.ink} />
          </View>
        </Pressable>

        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <Text variant="title" center>
            {fullName}
          </Text>
          <Badge label={roleLabel} variant={user.role === "member" ? "neutral" : "primary"} />
        </View>

        {isStaff && showQr ? <InlineQr onClose={() => setShowQr(false)} /> : null}
      </View>

      {editing ? (
        <Card animateIn style={{ gap: spacing.lg }}>
          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <Input label={t("firstName")} value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field }) => (
              <Input label={t("lastName")} value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                label={t("email")}
                keyboardType="email-address"
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button
                title={t("cancel")}
                variant="outline"
                onPress={() => {
                  reset();
                  setEditing(false);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SubmitButton title={t("save")} loading={updateProfile.isPending} onPress={onSave} />
            </View>
          </View>
        </Card>
      ) : (
        <>
          <SectionHeader title={t("personalInfo")} />
          <Card animateIn padded={false}>
            <InfoRow icon="call-outline" label={t("phone")} value={user.phone} />
            <Divider />
            <InfoRow icon="calendar-outline" label={t("birthday")} value={user.birthday} />
            {user.email ? (
              <>
                <Divider />
                <InfoRow icon="mail-outline" label={t("email")} value={user.email} />
              </>
            ) : null}
          </Card>

          <View style={{ gap: spacing.md }}>
            {isStaff ? (
              <Button
                title={t("myQrCode")}
                variant="outline"
                leftIcon={<Ionicons name="qr-code-outline" size={iconSize.sm} color={colors.ink} />}
                onPress={() => setShowQr((v) => !v)}
              />
            ) : null}
            <Button
              title={t("editProfile")}
              variant="outline"
              leftIcon={<Ionicons name="create-outline" size={iconSize.sm} color={colors.ink} />}
              onPress={() => setEditing(true)}
            />
          </View>
        </>
      )}

      <SectionHeader title={t("theme")} />
      <Card animateIn padded={false}>
        <SettingRow icon="moon-outline" label={t("darkMode")}>
          <Switch
            value={isDark}
            onValueChange={(v) => setMode(v ? "dark" : "light")}
            accessibilityLabel={t("darkMode")}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
            thumbColor={Platform.OS === "android" ? colors.card : undefined}
            ios_backgroundColor={colors.borderStrong}
          />
        </SettingRow>
        <Divider />
        <SettingRow icon="language-outline" label={t("language")}>
          <Pressable
            onPress={() => setLang(lang === "en" ? "ar" : "en")}
            hitSlop={10}
            accessibilityRole="button"
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}
          >
            <Text variant="caption" tone="primary" weight="600">
              {lang === "en" ? "English" : "العربية"}
            </Text>
            <Ionicons name="swap-horizontal" size={iconSize.sm} color={colors.primary} />
          </Pressable>
        </SettingRow>
      </Card>

      <View style={{ marginTop: spacing.sm }}>
        <Button
          title={t("signOut")}
          variant="outline"
          leftIcon={<Ionicons name="log-out-outline" size={iconSize.sm} color={colors.error} />}
          onPress={() => signOut()}
        />
      </View>
    </Screen>
  );
}

/** Hairline between rows inside a padded={false} Card, inset past the icon. */
function Divider() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: hairline,
        backgroundColor: colors.border,
        marginLeft: spacing.lg + iconSize.md + spacing.md,
      }}
    />
  );
}

/** The staff member's own QR, shown inline below the username on the profile. */
function InlineQr({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data, isLoading } = useMyQr();

  return (
    <View style={{ alignItems: "center", gap: spacing.md, marginTop: spacing.sm }}>
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: radius.md,
          borderWidth: hairline,
          borderColor: colors.border,
          padding: spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 212,
          minWidth: 212,
        }}
      >
        {isLoading || !data ? (
          <ActivityIndicator color={colors.muted} size="large" />
        ) : (
          // Near-black on white regardless of theme: scan reliability is
          // functional, not stylistic.
          <QRCode value={data.qrToken} size={180} color="#15171C" backgroundColor="#FFFFFF" ecl="M" />
        )}
      </View>
      <Text variant="caption" tone="muted" center>
        {t("showToAdmin")}
      </Text>
      <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
        <Text variant="caption" tone="primary" weight="600">
          {t("cancel")}
        </Text>
      </Pressable>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      <Ionicons name={icon} size={iconSize.md} color={colors.subtle} />
      <Text variant="caption" tone="muted" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="caption" weight="500">
        {value}
      </Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 52,
      }}
    >
      <Ionicons name={icon} size={iconSize.md} color={colors.subtle} />
      <Text variant="caption" weight="500" style={{ flex: 1 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
