import React, { useEffect, useState } from "react";
import { View, Pressable, Share, Image, type ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useMemberHome } from "@/features/hooks";
import {
  Screen,
  ScreenHeader,
  Card,
  Text,
  Avatar,
  StatCard,
  ProgressRing,
  SectionHeader,
  SkeletonCard,
  ErrorState,
  EmptyState,
  ListRow,
  IconTile,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { useControlledOverlay } from "@/components/overlay";
import { ProgressDetailSheet } from "@/features/ProgressDetailSheet";
import { radius, spacing, hairline, iconSize, duration, staggerDelay } from "@/theme/tokens";
import { meetingDayLabel, formatTime12h } from "@church/shared";

// Small badge image per Friday category, keyed by stable slug (language-independent).
// A slug with no entry here (free) simply renders without a badge — add its
// artwork to this map once the category has a real icon.
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

function greeting(t: (k: "goodMorning" | "goodAfternoon" | "goodEvening") => string) {
  const h = new Date().getHours();
  if (h < 12) return t("goodMorning");
  if (h < 18) return t("goodAfternoon");
  return t("goodEvening");
}

// True when today's month/day matches the member's birthday (year-agnostic).
// `birthday` is the YYYY-MM-DD captured at registration.
function isBirthdayToday(birthday: string | undefined): boolean {
  if (!birthday) return false;
  const [, mm, dd] = birthday.split("-");
  if (!mm || !dd) return false;
  const now = new Date();
  const todayMonth = String(now.getMonth() + 1).padStart(2, "0");
  const todayDay = String(now.getDate()).padStart(2, "0");
  return mm === todayMonth && dd === todayDay;
}

// Once-per-year guard so the banner shows the first time the member opens the app
// on their birthday, not on every screen focus that day or every year.
const birthdaySeenKey = (userId: string, year: number) => `birthday.seen.${userId}.${year}`;

// How long the birthday banner stays on screen before it animates away.
const BIRTHDAY_BANNER_MS = 4500;

// DEV-ONLY testing bypass: when true, the birthday banner shows on every launch,
// ignoring the once-per-year "seen" flag. Keep false for normal behavior.
const FORCE_BIRTHDAY_POPUP = __DEV__ && false;

export default function MemberHome() {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch, isRefetching } = useMemberHome();

  // Birthday animation: on the member's birthday, a celebratory banner animates
  // in over the Friday meeting card, then disappears on its own. Shown once per
  // year (first app open that day); the DEV flag forces it for testing.
  const [showBirthday, setShowBirthday] = useState(false);
  useEffect(() => {
    if (!user || !isBirthdayToday(user.birthday)) return;
    const key = birthdaySeenKey(user.id, new Date().getFullYear());
    let cancelled = false;
    void (async () => {
      const seen = await AsyncStorage.getItem(key);
      if (cancelled || (seen && !FORCE_BIRTHDAY_POPUP)) return;
      setShowBirthday(true);
      void AsyncStorage.setItem(key, "1");
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-hide the banner after it has had a moment on screen.
  useEffect(() => {
    if (!showBirthday) return;
    const id = setTimeout(() => setShowBirthday(false), BIRTHDAY_BANNER_MS);
    return () => clearTimeout(id);
  }, [showBirthday]);

  // Full per-category progress breakdown, opened from the Current Set card.
  const [showProgress, setShowProgress] = useState(false);
  useControlledOverlay(showProgress, ({ close }) => <ProgressDetailSheet onClose={close} />, {
    variant: "sheet",
    onClose: () => setShowProgress(false),
  });

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <ScreenHeader
        overline={greeting(t)}
        title={user?.firstName ?? ""}
        leading={
          <Avatar name={`${user?.firstName} ${user?.lastName}`} uri={user?.profileImage} size={48} />
        }
      />

      {isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : isError || !data ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          {/* Verse of the day — the one editorial moment on the screen. Emphasis
              comes from type size and a tinted surface, not from a saturated
              gradient competing with every card below it. */}
          <Animated.View entering={FadeInDown.duration(duration.base)}>
            <View
              style={{
                backgroundColor: colors.primarySurface,
                borderRadius: radius.md,
                borderWidth: hairline,
                borderColor: colors.border,
                padding: spacing.xl,
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text variant="overline" tone="primary" uppercase>
                  {t("verseOfTheDay")}
                </Text>
                <Ionicons name="book-outline" size={iconSize.sm} color={colors.primary} />
              </View>

              <Text variant="heading" weight="500" style={{ lineHeight: 28 }}>
                {lang === "ar" ? data.verse.ar : data.verse.en}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: spacing.xs,
                }}
              >
                <Text variant="caption" tone="primary" weight="600">
                  {lang === "ar" ? data.verse.refAr : data.verse.refEn}
                </Text>
                <Pressable
                  onPress={() =>
                    Share.share({
                      message: `"${lang === "ar" ? data.verse.ar : data.verse.en}" — ${lang === "ar" ? data.verse.refAr : data.verse.refEn}`,
                    })
                  }
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("share")}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}
                >
                  <Ionicons name="share-outline" size={iconSize.sm} color={colors.muted} />
                  <Text variant="caption" tone="muted">
                    {t("share")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Friday meeting reminder — birthday banner animates in over it. */}
          <View style={{ position: "relative" }}>
            <ListRow
              animateIn
              delay={60}
              leading={<IconTile icon="calendar" tone="primary" />}
              title={lang === "ar" ? data.meeting.titleAr : data.meeting.titleEn}
              subtitle={`${t("everyFriday")} · ${data.meeting.time}`}
            />

            {showBirthday ? (
              <Animated.View
                entering={ZoomIn.springify().damping(15)}
                exiting={FadeOut.duration(400)}
                pointerEvents="none"
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.lg,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                    overflow: "hidden",
                  }}
                >
                  <Animated.Text entering={FadeIn.delay(150)} style={{ fontSize: 28 }}>
                    🎂
                  </Animated.Text>
                  <Animated.View entering={FadeIn.delay(200)} style={{ flex: 1, gap: spacing.xxs }}>
                    <Text variant="overline" tone="inverse" uppercase style={{ opacity: 0.8 }}>
                      {t("happyBirthday")}
                    </Text>
                    <Text variant="subheading" tone="inverse" numberOfLines={1}>
                      {user?.firstName} 🎉
                    </Text>
                  </Animated.View>
                  <Text style={{ fontSize: 22 }}>🎈</Text>
                </View>
              </Animated.View>
            ) : null}
          </View>

          {/* Scheduled meetings (read-only). Guard against older API payloads
              that don't include `meetings` yet (before redeploy). */}
          {(data.meetings ?? []).length > 0 ? (
            <>
              <SectionHeader title={t("meetings")} />
              {(data.meetings ?? []).map((m, i) => (
                <ListRow
                  key={m.id}
                  animateIn
                  delay={staggerDelay(i, 70)}
                  leading={<IconTile icon="calendar-outline" tone="neutral" />}
                  title={m.name}
                  subtitle={`${meetingDayLabel(m.meetingDate, m.dayOfWeek, lang)} · ${formatTime12h(m.startTime)} – ${formatTime12h(m.endTime)}`}
                />
              ))}
            </>
          ) : null}

          {/* Stats */}
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <StatCard
              icon="checkmark-done"
              label={t("totalAttendance")}
              value={data.attendanceCount}
              accent="success"
              delay={80}
            />
            <StatCard
              icon="gift"
              label={t("completedSets")}
              value={data.completedSets}
              accent="primary"
              delay={120}
            />
          </View>

          {/* Current set progress — tapping opens the full per-category
              breakdown (how many Fridays attended in each category). */}
          <SectionHeader title={t("currentSet")} />
          <Card animateIn delay={140} style={{ padding: 0, overflow: "hidden" }}>
            <Pressable
              onPress={() => setShowProgress(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t("currentSet")} — ${t("tapForDetails")}`}
              style={({ pressed }) => ({
                padding: spacing.xl,
                gap: spacing.md,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xl }}>
                <ProgressRing progress={data.progress.completedCount} total={data.progress.total} />
                <View style={{ flex: 1, gap: spacing.md }}>
                  {data.progress.categories.map((cat) => {
                    const icon = CATEGORY_ICONS[cat.slug];
                    return (
                      <View
                        key={cat.slug}
                        style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
                      >
                        <Ionicons
                          name={cat.completed ? "checkmark-circle" : "ellipse-outline"}
                          size={iconSize.md}
                          color={cat.completed ? colors.success : colors.subtle}
                        />
                        {icon ? (
                          <Image
                            source={icon}
                            style={{ width: 20, height: 20, opacity: cat.completed ? 1 : 0.4 }}
                            resizeMode="contain"
                          />
                        ) : null}
                        <Text
                          variant="caption"
                          style={{ flex: 1 }}
                          weight={cat.completed ? "500" : "400"}
                          tone={cat.completed ? "ink" : "muted"}
                          numberOfLines={1}
                        >
                          {lang === "ar" ? cat.labelAr : cat.labelEn}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Affordance: without this the card looks purely informational. */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.xs,
                }}
              >
                <Text variant="small" tone="primary" weight="600">
                  {t("tapForDetails")}
                </Text>
                <Ionicons name="chevron-forward" size={iconSize.xs} color={colors.primary} />
              </View>
            </Pressable>
          </Card>

          {/* Announcements, grouped by category */}
          <AnnouncementSection
            title={t("trips")}
            items={data.announcements.filter((a) => a.category === "trips")}
          />
          <AnnouncementSection
            title={t("occasions")}
            items={data.announcements.filter((a) => a.category === "occasions")}
          />
          <AnnouncementSection
            title={t("announcements")}
            items={data.announcements.filter((a) => a.category === "custom")}
            emptyTitle={t("noAnnouncements")}
          />
        </>
      )}
    </Screen>
  );
}

type HomeAnnouncement = { id: string; title: string; body: string; createdAt: string };

/**
 * One announcement category group. Trips/Occasions stay hidden when empty to
 * avoid clutter; the main Announcements group passes `emptyTitle` so it always
 * shows (with an empty state) and never disappears entirely.
 */
function AnnouncementSection({
  title,
  items,
  emptyTitle,
}: {
  title: string;
  items: HomeAnnouncement[];
  emptyTitle?: string;
}) {
  if (items.length === 0 && !emptyTitle) return null;
  return (
    <>
      <SectionHeader title={title} />
      {items.length === 0 ? (
        <EmptyState icon="megaphone-outline" title={emptyTitle!} />
      ) : (
        items.map((a, i) => (
          <Card key={a.id} animateIn delay={staggerDelay(i, 160)} style={{ gap: spacing.sm }}>
            <Text variant="subheading">{a.title}</Text>
            <Text variant="caption" tone="muted" numberOfLines={3}>
              {a.body}
            </Text>
          </Card>
        ))
      )}
    </>
  );
}
