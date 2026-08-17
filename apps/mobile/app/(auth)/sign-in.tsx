import React from "react";
import { View, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { loginSchema, type LoginInput } from "@church/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { useLogin } from "@/features/hooks";
import { ApiError } from "@/lib/api";
import { Text, Input, SubmitButton } from "@/components/ui";
import { AuthLayout } from "@/components/AuthLayout";
import { LanguageToggle } from "@/components/LanguageToggle";
import { FormError } from "@/components/FormError";
import { spacing } from "@/theme/tokens";

export default function SignIn() {
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
    <AuthLayout eyebrow={t("org")} title={t("signIn")} centered footer={<LanguageToggle />}>
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <Input
            label={t("phone")}
            icon="call-outline"
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
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
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <FormError message={errorMsg} />

      <View style={{ gap: spacing.lg, marginTop: spacing.xs }}>
        <SubmitButton
          title={t("signIn")}
          size="lg"
          loading={login.isPending}
          disabled={formState.isSubmitting}
          onPress={onSubmit}
        />

        <Pressable
          onPress={() => router.push("/(auth)/register")}
          hitSlop={8}
          accessibilityRole="link"
          style={{ alignSelf: "center", paddingVertical: spacing.xs }}
        >
          <Text variant="caption" tone="muted">
            {t("dontHaveAccount")}{" "}
            <Text variant="caption" tone="primary" weight="600">
              {t("createAccount")}
            </Text>
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
