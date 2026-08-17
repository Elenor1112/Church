import React from "react";
import { View, ActivityIndicator, Image, type ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useProgressDetail } from "@/features/hooks";
import { AppSheet } from "@/components/overlay";
import { Text, ProgressRing, MeterBar, ErrorState, Badge } from "@/components/ui";
import { radius, spacing, hairline, iconSize } from "@/theme/tokens";
import type { CategoryAttendanceDetail } from "@church/shared";

/**
 * Badge artwork per Friday category, keyed by the same stable slugs the home
 * screen uses. A slug with no entry renders without a badge.
 */
const CATEGORY_ICONS: Record<string, ImageSourcePropType> = {
  contemporary_issues: require("../../assets/Artboard 1.png"),
  bible: require("../../assets/Artboard 4.png"),
  spirituality: require("../../assets/Artboard 2.png"),
  saints_lives: require("../../assets/Artboard 3.png"),
  category_a: require("../../assets/The Old Testament and Translations.jpeg"),
  category_b: require("../../assets/Contemporary issues and health education.jpeg"),
  category_c: require("../../assets/Apostolic Sees and Sects.jpeg"),
  category_d: require("../../assets/Apologetics.jpeg"),
};

/**
 * The member's own progress breakdown: how many Fridays they attended in each
 * category, all-time, plus where the current set stands.
 *
 * The home card can only show four ticks — whether the CURRENT set has each
 * category. That resets on every reward claim, so it can't answer "how many
 * Fridays have I actually done in Bible?". This sheet answers exactly that.
 */
export function ProgressDetailSheet({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const { data, isLoading, isError, refetch } = useProgressDetail();

  return (
    <AppSheet title={t("myProgress")} subtitle={t("progressSubtitle")} onClose={onClose} bodyMaxHeightRatio={0.62}>
      {isLoading || !data ? (
        isError ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <View style={{ paddingVertical: spacing.xxl, alignItems: "center" }}>
            <ActivityIndicator color={colors.muted} />
          </View>
        )
      ) : (
        <>
          {/* Summary: current set ring beside the two all-time figures. */}
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: spacing.xl,
              backgroundColor: colors.cardAlt,
              borderRadius: radius.md,
              padding: spacing.lg,
            }}
          >
            <ProgressRing progress={data.completedCount} total={data.total} size={76} />
            <View style={{ flex: 1, gap: spacing.md }}>
              <SummaryLine
                icon="checkmark-done"
                tone={colors.success}
                label={t("allTimeAttendance")}
                value={data.totalAttendance}
              />
              <SummaryLine
                icon="gift"
                tone={colors.primary}
                label={t("completedSets")}
                value={data.completedSets}
              />
            </View>
          </View>

          {data.pendingRewardSetId ? (
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: spacing.sm,
                backgroundColor: colors.primarySurface,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
              }}
            >
              <Ionicons name="gift" size={iconSize.sm} color={colors.primary} />
              <Text variant="caption" tone="primary" weight="600" style={{ flex: 1 }}>
                {t("rewardPending")}
              </Text>
            </View>
          ) : null}

          {/* Per-category counts — the actual answer the member came for. */}
          <View style={{ gap: spacing.lg }}>
            {data.categories.map((cat) => (
              <CategoryRow key={cat.slug} cat={cat} maxCount={maxCount(data.categories)} />
            ))}
          </View>

          {data.categories.some((c) => !c.completedInCurrentSet) ? (
            <Text variant="small" tone="subtle">
              {t("setCompleteHint")}
            </Text>
          ) : null}

          {data.extraCategories.length > 0 ? (
            <>
              <View style={{ height: hairline, backgroundColor: colors.border }} />
              <View style={{ gap: spacing.xs }}>
                <Text variant="overline" tone="muted" uppercase>
                  {t("extraCategories")}
                </Text>
                <Text variant="small" tone="subtle">
                  {t("extraCategoriesHint")}
                </Text>
              </View>
              <View style={{ gap: spacing.lg }}>
                {data.extraCategories.map((cat) => (
                  <CategoryRow key={cat.slug} cat={cat} maxCount={maxCount(data.extraCategories)} />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </AppSheet>
  );
}

/**
 * Bars are scaled against the member's own best category rather than a fixed
 * ceiling, so the comparison between categories stays readable whether they
 * have attended 3 Fridays or 30. Never zero, so the division below is safe.
 */
function maxCount(cats: CategoryAttendanceDetail[]): number {
  return Math.max(1, ...cats.map((c) => c.attendedCount));
}

function SummaryLine({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tone: string;
  label: string;
  value: number;
}) {
  const { isRTL } = useI18n();
  return (
    <View
      style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: spacing.sm }}
    >
      <Ionicons name={icon} size={iconSize.sm} color={tone} />
      <Text variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="subheading" tabular>
        {value}
      </Text>
    </View>
  );
}

/** One category: badge, label, all-time Friday count, and a relative bar. */
function CategoryRow({ cat, maxCount }: { cat: CategoryAttendanceDetail; maxCount: number }) {
  const { colors } = useTheme();
  const { t, lang, isRTL } = useI18n();
  const icon = CATEGORY_ICONS[cat.slug];
  const label = lang === "ar" ? cat.labelAr : cat.labelEn;

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: spacing.sm }}
      >
        {/* The tick mirrors the home card so the two views read as one system. */}
        <Ionicons
          name={cat.completedInCurrentSet ? "checkmark-circle" : "ellipse-outline"}
          size={iconSize.md}
          color={cat.completedInCurrentSet ? colors.success : colors.subtle}
        />
        {icon ? (
          <Image
            source={icon}
            style={{ width: 20, height: 20, opacity: cat.attendedCount > 0 ? 1 : 0.4 }}
            resizeMode="contain"
          />
        ) : null}
        <Text
          variant="caption"
          style={{ flex: 1 }}
          weight={cat.completedInCurrentSet ? "500" : "400"}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text variant="caption" weight="600" tabular>
          {cat.attendedCount}
        </Text>
        <Text variant="small" tone="subtle">
          {t("fridaysAttended")}
        </Text>
      </View>

      <MeterBar
        percent={(cat.attendedCount / maxCount) * 100}
        tone={cat.completedInCurrentSet ? "success" : cat.attendedCount > 0 ? "primary" : "neutral"}
        height={5}
      />

      <View
        style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: spacing.sm }}
      >
        <Text variant="small" tone="subtle" style={{ flex: 1 }} numberOfLines={1}>
          {cat.lastAttendedDate
            ? `${t("lastAttended")}: ${formatDate(cat.lastAttendedDate, lang)}`
            : t("neverAttended")}
        </Text>
        {cat.completedInCurrentSet ? <Badge label={t("inCurrentSet")} variant="success" /> : null}
      </View>
    </View>
  );
}

/** YYYY-MM-DD → a short, locale-appropriate date. */
function formatDate(iso: string, lang: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  // Construct in local time (not `new Date(iso)`, which parses as UTC and can
  // shift the day backwards for members west of GMT).
  return new Date(y, m - 1, d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
