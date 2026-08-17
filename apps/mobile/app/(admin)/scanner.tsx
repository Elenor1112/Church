import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import {
  useCategories,
  useScan,
  useScanAdmin,
  useMeetings,
  useTodayCount,
  usePendingCount,
  type ScanResponse,
} from "@/features/hooks";
import { useAttendanceStore } from "@/store/uiStores";
import { usePermissions } from "@/features/permissions";
import { ApiError } from "@/lib/api";
import { Text, Button, Avatar, Badge, EmptyState } from "@/components/ui";
import { AppDialog, useControlledOverlay } from "@/components/overlay";
import { radius, spacing, iconSize, hairline, touchTarget, screenGutter } from "@/theme/tokens";
import { camera as cam } from "@/theme/camera";
import { isAnyMeetingActive, type MeetingWindow } from "@church/shared";

type ScanMode = "members" | "admins";

export default function Scanner() {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const categories = useCategories();
  const scan = useScan();
  const scanAdmin = useScanAdmin();
  const meetings = useMeetings();
  const todayCount = useTodayCount();
  const pendingCount = usePendingCount();
  const perms = usePermissions();
  const selectedCategory = useAttendanceStore((s) => s.selectedCategory);
  const setSelectedCategory = useAttendanceStore((s) => s.setSelectedCategory);

  // Members vs Admins scan mode. Admins mode requires can_scan_admins.
  const [mode, setMode] = useState<ScanMode>("members");
  const isAdminMode = mode === "admins";

  // The scanner is open during any scheduled meeting window (custom meetings
  // plus the always-on default Friday window). Shared with the server.
  const meetingWindows = (meetings.data?.meetings ?? []) as MeetingWindow[];
  const [windowOpen, setWindowOpen] = useState(false);
  const [active, setActive] = useState(true);
  const [result, setResult] = useState<{ data?: ScanResponse; error?: string } | null>(null);
  const lockRef = useRef(false);

  // Re-check the scan window every 30 s so the UI unlocks automatically.
  useEffect(() => {
    const check = () => setWindowOpen(isAnyMeetingActive(meetingWindows, new Date()));
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [meetings.data]);

  // Re-arm scanner each time the tab gains focus.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      lockRef.current = false;
      return () => setActive(false);
    }, []),
  );

  // Members mode cannot scan without a category. Kept as a derived flag so the
  // camera handler, the dimming overlay, and the prompt all agree.
  const canScan = isAdminMode || !!selectedCategory;

  const onScanned = useCallback(
    ({ data }: { data: string }) => {
      if (lockRef.current || !canScan) return;
      lockRef.current = true;
      setActive(false);

      const handlers = {
        onSuccess: (res: ScanResponse) => {
          void Haptics.notificationAsync(
            res.alreadyCheckedInToday
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Success,
          );
          setResult({ data: res });
        },
        onError: (err: unknown) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setResult({ error: err instanceof ApiError ? err.message : t("somethingWrong") });
        },
      };

      if (isAdminMode) {
        scanAdmin.mutate({ qrToken: data }, handlers);
      } else {
        scan.mutate({ qrToken: data, categorySlug: selectedCategory! }, handlers);
      }
    },
    [isAdminMode, selectedCategory, canScan, scan, scanAdmin, t],
  );

  const reset = () => {
    setResult(null);
    lockRef.current = false;
    setActive(true);
  };

  // Scan-result dialog rendered by the global OverlayHost (no native <Modal>).
  // Closing the overlay (button, backdrop, or back) re-arms the scanner.
  useControlledOverlay(
    !!result,
    ({ close }) => (
      <ScanResultContent
        result={result}
        loading={scan.isPending || scanAdmin.isPending}
        onClose={close}
      />
    ),
    { variant: "dialog", onClose: reset },
  );

  if (!windowOpen) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center" }}>
        <EmptyState
          icon="time-outline"
          title={t("scanWindowClosedTitle")}
          subtitle={t("scanWindowClosed")}
        />
      </View>
    );
  }

  if (!permission) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center" }}>
        <EmptyState
          icon="camera-outline"
          title="Camera Permission"
          subtitle="We need camera access to scan member QR codes."
          action={{ label: "Grant Permission", onPress: requestPermission }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {active ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          // Detach entirely when scanning isn't possible, so the camera stops
          // firing this callback on every frame while no category is selected.
          onBarcodeScanned={canScan ? onScanned : undefined}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />
      )}

      <ScanFrame armed={canScan} />

      {/* Top: live counters + mode switch */}
      <View
        style={{
          position: "absolute",
          top: insets.top + spacing.sm,
          left: screenGutter,
          right: screenGutter,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <OverlayStat
            icon="checkmark-done"
            value={todayCount.data?.count ?? 0}
            label={t("todaysCheckins")}
          />
          <OverlayStat
            icon="hourglass-outline"
            value={pendingCount.data?.count ?? 0}
            label={t("pendingApprovals")}
          />
        </View>

        {/* Members / Admins mode toggle — Admins only if permitted. */}
        {perms.canScanAdmins ? (
          <View
            style={{
              flexDirection: "row",
              backgroundColor: cam.glass,
              borderRadius: radius.sm,
              borderWidth: hairline,
              borderColor: cam.glassBorder,
              padding: spacing.xs,
              gap: spacing.xs,
            }}
          >
            {(["members", "admins"] as ScanMode[]).map((m) => {
              const isSel = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setMode(m);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.xs,
                    alignItems: "center",
                    backgroundColor: isSel ? cam.accent : "transparent",
                  }}
                >
                  <Text
                    variant="caption"
                    weight="600"
                    style={{ color: isSel ? cam.onAccent : cam.text }}
                  >
                    {m === "members" ? t("scanMembers") : t("scanAdmins")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Scanning is disabled until a category is picked — say so unmissably,
          otherwise the camera looks live and the operator waits for nothing. */}
      {!canScan ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: cam.scrim,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing.xxxl,
              gap: spacing.md,
            },
          ]}
        >
          <Ionicons name="albums-outline" size={iconSize.xl} color={cam.text} />
          <Text variant="heading" center style={{ color: cam.text }}>
            {t("selectCategory")}
          </Text>
          <Text variant="caption" center style={{ color: cam.textMuted, maxWidth: 280 }}>
            {t("selectCategoryToScan")}
          </Text>
        </Animated.View>
      ) : null}

      {/* Bottom controls: category selector (members) or hint (admins) */}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 100,
          left: 0,
          right: 0,
          gap: spacing.md,
        }}
      >
        {isAdminMode ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.sm,
              alignSelf: "center",
              backgroundColor: cam.glass,
              borderRadius: radius.pill,
              borderWidth: hairline,
              borderColor: cam.glassBorder,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
            }}
          >
            <Ionicons name="shield-checkmark" size={iconSize.sm} color={cam.text} />
            <Text variant="caption" weight="600" style={{ color: cam.text }}>
              {t("scanAdminsHint")}
            </Text>
          </View>
        ) : (
          <>
            <Text
              variant="overline"
              uppercase
              center
              style={{ color: cam.textMuted }}
            >
              {t("selectCategory")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: screenGutter, gap: spacing.sm }}
            >
              {(categories.data?.categories ?? []).map((cat) => {
                const isSel = selectedCategory === cat.slug;
                return (
                  <Pressable
                    key={cat.slug}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedCategory(cat.slug);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSel }}
                    style={{
                      minHeight: touchTarget,
                      justifyContent: "center",
                      paddingHorizontal: spacing.lg,
                      borderRadius: radius.pill,
                      backgroundColor: isSel ? cam.accent : cam.glass,
                      borderWidth: hairline,
                      borderColor: isSel ? cam.accent : cam.glassBorder,
                    }}
                  >
                    <Text
                      variant="caption"
                      weight="600"
                      style={{ color: isSel ? cam.onAccent : cam.text }}
                    >
                      {lang === "ar" ? cat.labelAr : cat.labelEn}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

function OverlayStat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cam.glass,
        borderRadius: radius.sm,
        borderWidth: hairline,
        borderColor: cam.glassBorder,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      <Ionicons name={icon} size={iconSize.md} color={cam.textMuted} />
      <View style={{ flex: 1 }}>
        <Text variant="subheading" tabular style={{ color: cam.text }}>
          {value}
        </Text>
        <Text variant="small" numberOfLines={1} style={{ color: cam.textMuted }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const FRAME_SIZE = 248;
const CORNER = 28;
const CORNER_WEIGHT = 3;

/**
 * Viewfinder reticle. Corner brackets mark the target area and a sweeping line
 * signals the scanner is live; the sweep stops when scanning is disarmed, so
 * "waiting for a category" is visible from the frame alone.
 */
function ScanFrame({ armed }: { armed: boolean }) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!armed) {
      sweep.value = 0;
      return;
    }
    sweep.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [armed, sweep]);

  const lineStyle = useAnimatedStyle(() => ({
    top: `${sweep.value * 88 + 6}%`,
    opacity: armed ? 0.9 : 0,
  }));

  return (
    <View
      style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}
      pointerEvents="none"
    >
      <View style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <View
            key={c}
            style={{
              position: "absolute",
              width: CORNER,
              height: CORNER,
              borderColor: cam.frame,
              borderTopWidth: c.startsWith("t") ? CORNER_WEIGHT : 0,
              borderBottomWidth: c.startsWith("b") ? CORNER_WEIGHT : 0,
              borderLeftWidth: c.endsWith("l") ? CORNER_WEIGHT : 0,
              borderRightWidth: c.endsWith("r") ? CORNER_WEIGHT : 0,
              top: c.startsWith("t") ? 0 : undefined,
              bottom: c.startsWith("b") ? 0 : undefined,
              left: c.endsWith("l") ? 0 : undefined,
              right: c.endsWith("r") ? 0 : undefined,
              borderTopLeftRadius: c === "tl" ? radius.md : 0,
              borderTopRightRadius: c === "tr" ? radius.md : 0,
              borderBottomLeftRadius: c === "bl" ? radius.md : 0,
              borderBottomRightRadius: c === "br" ? radius.md : 0,
            }}
          />
        ))}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: CORNER,
              right: CORNER,
              height: hairline * 2,
              backgroundColor: cam.accent,
            },
            lineStyle,
          ]}
        />
      </View>
    </View>
  );
}

function ScanResultContent({
  result,
  loading,
  onClose,
}: {
  result: { data?: ScanResponse; error?: string } | null;
  loading: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();

  // `result` goes null while the overlay plays its exit animation; hold the last
  // value so the card doesn't blank out mid-close.
  const lastResult = React.useRef(result);
  if (result) lastResult.current = result;
  const shown = result ?? lastResult.current;

  const data = shown?.data;
  const isError = !!shown?.error;
  const already = data?.alreadyCheckedInToday;
  const setDone = data?.setCompleted;

  // Centered dialog rendered by the OverlayHost (no native <Modal>).
  return (
    <AppDialog
      onClose={onClose}
      icon={isError ? { name: "close-circle", tone: "error" } : undefined}
      title={isError ? shown?.error : undefined}
      actions={[{ label: t("scanNext"), onPress: onClose, loading }]}
    >
      {data ? (
        <View style={{ alignItems: "center", gap: spacing.lg }}>
          <Avatar name={data.member.name} uri={data.member.profileImage} size={72} />

          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <Text variant="heading" center numberOfLines={2}>
              {data.member.name}
            </Text>
            <Badge
              label={already ? t("alreadyToday") : t("checkedIn")}
              variant={already ? "warning" : "success"}
              dot
            />
          </View>

          {setDone ? (
            <Badge label={t("setComplete")} variant="primary" />
          ) : null}
        </View>
      ) : null}
    </AppDialog>
  );
}
