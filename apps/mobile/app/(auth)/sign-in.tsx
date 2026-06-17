import React from "react";
import { View, KeyboardAvoidingView, Platform, Pressable, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { loginSchema, type LoginInput } from "@church/shared";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useLogin } from "@/features/hooks";
import { ApiError } from "@/lib/api";
import { CrossLogo, Text, Input, Button } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function SignIn() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const login = useLogin();

  const { control, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => router.replace("/") });
  });

  const errorMsg =
    login.error instanceof ApiError ? login.error.message : login.error ? t("somethingWrong") : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 24 }}>
        <Animated.View entering={FadeInUp.duration(400)} style={{ alignItems: "center", gap: 14 }}>
          <CrossLogo size={92} />
          <Text variant="title" center>
            {t("org")}
          </Text>
          <Text tone="muted" center>
            {t("signIn")}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(120)} style={{ gap: 16 }}>
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <Input
                label={t("phone")}
                icon="call-outline"
                keyboardType="phone-pad"
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Input
                label={t("password")}
                icon="lock-closed-outline"
                secure
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          {errorMsg ? (
            <Text tone="error" center>
              {errorMsg}
            </Text>
          ) : null}

          <Button
            title={t("signIn")}
            size="lg"
            loading={login.isPending}
            disabled={formState.isSubmitting}
            onPress={onSubmit}
          />

          <Pressable onPress={() => router.push("/(auth)/register")} style={{ alignSelf: "center", marginTop: 4 }}>
            <Text tone="muted">
              {t("dontHaveAccount")}{" "}
              <Text tone="primary" weight="600">
                {t("createAccount")}
              </Text>
            </Text>
          </Pressable>
        </Animated.View>

        <View style={{ marginTop: 8 }}>
          <LanguageToggle />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
