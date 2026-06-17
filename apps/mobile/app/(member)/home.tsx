import React from "react";
import { View, Pressable, Share } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useMemberHome } from "@/features/hooks";
import {
  Screen,
  Card,
  Text,
  Avatar,
  StatCard,
  ProgressRing,
  SectionHeader,
  SkeletonCard,
  ErrorState,
  EmptyState,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { radius } from "@/theme/tokens";

function greeting(t: (k: "goodMorning" | "goodAfternoon" | "goodEvening") => string) {
  const h = new Date().getHours();
  if (h < 12) return t("goodMorning");
  if (h < 18) return t("goodAfternoon");
  return t("goodEvening");
}

export default function MemberHome() {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch, isRefetching } = useMemberHome();

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      {/* Greeting */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <Avatar name={`${user?.firstName} ${user?.lastName}`} uri={user?.profileImage} size={52} />
        <View style={{ flex: 1 }}>
          <Text tone="muted" variant="caption">
            {greeting(t)} ✨
          </Text>
          <Text variant="heading">{user?.firstName}</Text>
        </View>
      </View>

      {isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : isError || !data ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          {/* Verse of the day */}
          <Animated.View entering={FadeInDown.duration(300)}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: radius.lg, padding: 22, gap: 14 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="caption" tone="inverse" weight="600" style={{ opacity: 0.9 }}>
                  {t("verseOfTheDay")}
                </Text>
                <Ionicons name="book-outline" size={18} color="#fff" style={{ opacity: 0.9 }} />
              </View>
              <Text tone="inverse" style={{ fontSize: 18, lineHeight: 28, fontWeight: "500" }}>
                “{lang === "ar" ? data.verse.ar : data.verse.en}”
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text tone="gold" weight="700">
                  {lang === "ar" ? data.verse.refAr : data.verse.refEn}
                </Text>
                <Pressable
                  onPress={() =>
                    Share.share({
                      message: `"${lang === "ar" ? data.verse.ar : data.verse.en}" — ${lang === "ar" ? data.verse.refAr : data.verse.refEn}`,
                    })
                  }
                  hitSlop={10}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Ionicons name="share-outline" size={16} color="#fff" />
                  <Text tone="inverse" variant="caption">
                    {t("share")}
                  </Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Friday meeting reminder */}
          <Card animateIn delay={60} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: colors.gold + "22",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="calendar" size={24} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="600">{lang === "ar" ? data.meeting.titleAr : data.meeting.titleEn}</Text>
              <Text variant="caption" tone="muted">
                {t("everyFriday")} · {data.meeting.time}
              </Text>
            </View>
          </Card>

          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard icon="checkmark-done" label={t("totalAttendance")} value={data.attendanceCount} accent="success" delay={80} />
            <StatCard icon="gift" label={t("completedSets")} value={data.completedSets} accent="gold" delay={120} />
          </View>

          {/* Current set progress */}
          <SectionHeader title={t("currentSet")} />
          <Card animateIn delay={140} style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <ProgressRing progress={data.progress.completedCount} total={data.progress.total} />
            <View style={{ flex: 1, gap: 8 }}>
              {data.progress.categories.map((cat) => (
                <View key={cat.slug} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons
                    name={cat.completed ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={cat.completed ? colors.success : colors.muted}
                  />
                  <Text variant="caption" style={{ flex: 1 }} tone={cat.completed ? "ink" : "muted"}>
                    {lang === "ar" ? cat.labelAr : cat.labelEn}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Announcements */}
          <SectionHeader title={t("announcements")} />
          {data.announcements.length === 0 ? (
            <EmptyState icon="megaphone-outline" title={t("noAnnouncements")} />
          ) : (
            data.announcements.map((a, i) => (
              <Card key={a.id} animateIn delay={160 + i * 40} style={{ gap: 6 }}>
                <Text weight="600">{a.title}</Text>
                <Text variant="caption" tone="muted" numberOfLines={3}>
                  {a.body}
                </Text>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
