import React from "react";
import { View, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { registerSchema, type RegisterInput, AREAS } from "@church/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { useRegister } from "@/features/hooks";
import { ApiError } from "@/lib/api";
import { Text, Input, Select, SubmitButton, type SelectOption } from "@/components/ui";
import { AuthLayout } from "@/components/AuthLayout";
import { FormError } from "@/components/FormError";
import { spacing } from "@/theme/tokens";

// Area options show both Arabic and English labels together.
const AREA_OPTIONS: SelectOption<(typeof AREAS)[number]["slug"]>[] = AREAS.map((a) => ({
  value: a.slug,
  label: `${a.labelAr} : ${a.labelEn}`,
  sublabel: undefined,
}));

/**
 * Groups related fields under a quiet heading. A 9-field flat form reads as a
 * wall; three labelled groups of ~3 give the eye somewhere to rest and make
 * progress feel measurable.
 */
function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.lg }}>
      <Text variant="overline" tone="muted" uppercase>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function Register() {
  const { t } = useI18n();
  const router = useRouter();
  const register = useRegister();

  const { control, handleSubmit } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      area: undefined,
      addressDetails: "",
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
    <AuthLayout
      eyebrow={t("org")}
      title={t("registration")}
      subtitle={t("registrationSubtitle")}
    >
      <FieldGroup title={t("personalInfo")}>
        <Controller
          control={control}
          name="firstName"
          render={({ field, fieldState }) => (
            <Input
              label={t("firstName")}
              icon="person-outline"
              autoComplete="given-name"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field, fieldState }) => (
            <Input
              label={t("lastName")}
              icon="person-outline"
              autoComplete="family-name"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="birthday"
          render={({ field, fieldState }) => (
            <Input
              label={t("birthday")}
              icon="calendar-outline"
              placeholder="1995-06-17"
              autoCapitalize="none"
              hint="YYYY-MM-DD"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </FieldGroup>

      <FieldGroup title={t("contact")}>
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
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="spousePhone"
          render={({ field, fieldState }) => (
            <Input
              label={t("spousePhone")}
              icon="call-outline"
              keyboardType="phone-pad"
              autoCapitalize="none"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label={t("email")}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </FieldGroup>

      <FieldGroup title={t("address")}>
        <Controller
          control={control}
          name="area"
          render={({ field, fieldState }) => (
            <Select
              label={t("area")}
              title={t("selectArea")}
              placeholder={t("selectArea")}
              icon="location-outline"
              value={field.value}
              options={AREA_OPTIONS}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="addressDetails"
          render={({ field, fieldState }) => (
            <Input
              label={t("addressDetails")}
              icon="home-outline"
              placeholder={t("addressDetailsPlaceholder")}
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </FieldGroup>

      <FieldGroup title={t("security")}>
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Input
              label={t("password")}
              icon="lock-closed-outline"
              secure
              autoComplete="new-password"
              hint={t("passwordMin")}
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </FieldGroup>

      <FormError message={errorMsg} />

      <View style={{ gap: spacing.lg, marginTop: spacing.xs }}>
        <SubmitButton
          title={t("createAccount")}
          size="lg"
          loading={register.isPending}
          onPress={onSubmit}
        />

        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="link"
          style={{ alignSelf: "center", paddingVertical: spacing.xs }}
        >
          <Text variant="caption" tone="primary" weight="600">
            {t("backToSignIn")}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
