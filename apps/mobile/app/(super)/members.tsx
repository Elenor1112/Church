import React from "react";
import { Screen, Text } from "@/components/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { MemberDirectory } from "@/features/MemberDirectory";

export default function SuperMembers() {
  const { t } = useI18n();
  return (
    <Screen>
      <Text variant="title">{t("memberCenter")}</Text>
      <MemberDirectory superAdmin />
    </Screen>
  );
}
