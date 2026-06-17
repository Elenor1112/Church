import React from "react";
import { View, KeyboardAvoidingView, Platform, Pressable, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { registerSchema, type RegisterInput } from "@church/shared";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useRegister } from "@/features/hooks";
import { ApiError } from "@/lib/api";
import { CrossLogo, Text, Input, Button } from "@/components/ui";

export default function Register() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const register = useRegister();

  const { control, handleSubmit } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      birthday: "",
      spousePhone: undefined,
      email: undefined,
      password: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    register.mutate(values, { onSuccess: () => router.replace("/") });
  });

  const errorMsg =
    register.error instanceof ApiError
      ? register.error.message
      : register.error
        ? t("somethingWrong")
        : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingTop: 60, paddingBottom: 48 }}>
        <Animated.View entering={FadeInUp.duration(400)} style={{ alignItems: "center", gap: 12 }}>
          <CrossLogo size={80} />
          <Text variant="caption" tone="primary" weight="600" center>
            {t("org")}
          </Text>
          <Text variant="title" center>
            {t("registration")}
          </Text>
          <Text tone="muted" center>
            {t("registrationSubtitle")}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(120)} style={{ gap: 14 }}>
          <Controller
            control={control}
            name="firstName"
            render={({ field, fieldState }) => (
              <Input label={t("firstName")} icon="person-outline" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field, fieldState }) => (
              <Input label={t("lastName")} icon="person-outline" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <Input label={t("phone")} icon="call-outline" keyboardType="phone-pad" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="birthday"
            render={({ field, fieldState }) => (
              <Input label={t("birthday")} icon="calendar-outline" placeholder="1995-06-17" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="spousePhone"
            render={({ field, fieldState }) => (
              <Input label={t("spousePhone")} icon="call-outline" keyboardType="phone-pad" autoCapitalize="none" value={field.value ?? ""} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input label={t("email")} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" value={field.value ?? ""} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Input label={t("password")} icon="lock-closed-outline" secure value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />

          {errorMsg ? (
            <Text tone="error" center>
              {errorMsg}
            </Text>
          ) : null}

          <Button title={t("createAccount")} size="lg" loading={register.isPending} onPress={onSubmit} />

          <Pressable onPress={() => router.back()} style={{ alignSelf: "center", marginTop: 4 }}>
            <Text tone="primary" weight="600">
              {t("backToSignIn")}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
