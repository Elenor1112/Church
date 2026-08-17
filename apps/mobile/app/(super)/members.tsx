import React from "react";
import { Screen, ScreenHeader } from "@/components/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { MemberDirectory } from "@/features/MemberDirectory";

export default function SuperMembers() {
  const { t } = useI18n();
  return (
    <Screen>
      <ScreenHeader title={t("memberCenter")} />
      <MemberDirectory superAdmin />
    </Screen>
  );
}
