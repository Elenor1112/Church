import React, { useState } from "react";
import { View, Pressable, Switch, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/store/authStore";
import { useUpdateProfile } from "@/features/hooks";
import {
  Screen,
  Card,
  Text,
  Button,
  Input,
  Avatar,
  Badge,
  SectionHeader,
} from "@/components/ui";

export function ProfileScreen() {
  const { colors, isDark, setMode } = useTheme();
  const { t, lang, setLang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);

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
      <Card animateIn style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
        <Pressable onPress={pickImage}>
          <Avatar name={fullName} uri={user.profileImage} size={96} />
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              backgroundColor: colors.primary,
              borderRadius: 999,
              padding: 6,
              borderWidth: 2,
              borderColor: colors.card,
            }}
          >
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
        <Text variant="title">{fullName}</Text>
        <Badge label={roleLabel} variant={user.role === "member" ? "info" : "gold"} />
      </Card>

      {editing ? (
        <Card animateIn style={{ gap: 14 }}>
          <Controller control={control} name="firstName" render={({ field }) => (
            <Input label={t("firstName")} value={field.value} onChangeText={field.onChange} />
          )} />
          <Controller control={control} name="lastName" render={({ field }) => (
            <Input label={t("lastName")} value={field.value} onChangeText={field.onChange} />
          )} />
          <Controller control={control} name="email" render={({ field }) => (
            <Input label={t("email")} keyboardType="email-address" autoCapitalize="none" value={field.value} onChangeText={field.onChange} />
          )} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button title={t("cancel")} variant="outline" onPress={() => { reset(); setEditing(false); }} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={t("save")} loading={updateProfile.isPending} onPress={onSave} />
            </View>
          </View>
        </Card>
      ) : (
        <Card animateIn style={{ gap: 14 }}>
          <InfoRow icon="call-outline" label={t("phone")} value={user.phone} />
          <InfoRow icon="calendar-outline" label={t("birthday")} value={user.birthday} />
          {user.email ? <InfoRow icon="mail-outline" label={t("email")} value={user.email} /> : null}
          <Button title={t("editProfile")} variant="outline" leftIcon={<Ionicons name="create-outline" size={18} color={colors.primary} />} onPress={() => setEditing(true)} />
        </Card>
      )}

      <SectionHeader title={t("theme")} />
      <Card animateIn style={{ gap: 4 }}>
        <Row label={t("darkMode")} icon="moon-outline" color={colors.primary}>
          <Switch value={isDark} onValueChange={(v) => setMode(v ? "dark" : "light")} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
        </Row>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Row label={t("language")} icon="language-outline" color={colors.primary}>
          <Pressable onPress={() => setLang(lang === "en" ? "ar" : "en")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text tone="primary" weight="600">{lang === "en" ? "English" : "العربية"}</Text>
            <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
          </Pressable>
        </Row>
      </Card>

      <Button
        title={t("signOut")}
        variant="danger"
        leftIcon={<Ionicons name="log-out-outline" size={18} color="#fff" />}
        onPress={() => signOut()}
      />
    </Screen>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Ionicons name={icon} size={20} color={colors.muted} />
      <View style={{ flex: 1 }}>
        <Text variant="small" tone="muted">{label}</Text>
        <Text weight="500">{value}</Text>
      </View>
    </View>
  );
}

function Row({ icon, label, color, children }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
      <Ionicons name={icon} size={20} color={color} />
      <Text weight="500" style={{ flex: 1 }}>{label}</Text>
      {children}
    </View>
  );
}
