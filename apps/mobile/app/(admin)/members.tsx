import React from "react";
import { Screen, Text } from "@/components/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { MemberDirectory } from "@/features/MemberDirectory";

export default function AdminMembers() {
  const { t } = useI18n();
  console.log("[DIAG-SCREEN] AdminMembers screen RENDERED");
  return (
    <Screen>
      <Text variant="title">{t("members")}</Text>
      <MemberDirectory superAdmin={false} />
    </Screen>
  );
}
