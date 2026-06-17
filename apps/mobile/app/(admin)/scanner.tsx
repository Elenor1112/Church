import React, { useCallback, useRef, useState } from "react";
import { View, Pressable, Modal, ScrollView } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useCategories, useScan, useTodayCount, usePendingCount, type ScanResponse } from "@/features/hooks";
import { useAttendanceStore } from "@/store/uiStores";
import { ApiError } from "@/lib/api";
import { Text, Button, Avatar, Card } from "@/components/ui";
import { radius } from "@/theme/tokens";

export default function Scanner() {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const categories = useCategories();
  const scan = useScan();
  const todayCount = useTodayCount();
  const pendingCount = usePendingCount();
  const selectedCategory = useAttendanceStore((s) => s.selectedCategory);
  const setSelectedCategory = useAttendanceStore((s) => s.setSelectedCategory);

  const [active, setActive] = useState(true);
  const [result, setResult] = useState<{ data?: ScanResponse; error?: string } | null>(null);
  const lockRef = useRef(false);

  // Re-arm scanner each time the tab gains focus.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      lockRef.current = false;
      return () => setActive(false);
    }, []),
  );

  const onScanned = useCallback(
    ({ data }: { data: string }) => {
      if (lockRef.current || !selectedCategory) return;
      lockRef.current = true;
      setActive(false);
      scan.mutate(
        { qrToken: data, categorySlug: selectedCategory },
        {
          onSuccess: (res) => {
            void Haptics.notificationAsync(
              res.alreadyCheckedInToday
                ? Haptics.NotificationFeedbackType.Warning
                : Haptics.NotificationFeedbackType.Success,
            );
            setResult({ data: res });
          },
          onError: (err) => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setResult({ error: err instanceof ApiError ? err.message : t("somethingWrong") });
          },
        },
      );
    },
    [selectedCategory, scan, t],
  );

  const reset = () => {
    setResult(null);
    lockRef.current = false;
    setActive(true);
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 32, gap: 16 }}>
        <Ionicons name="camera-outline" size={64} color={colors.muted} />
        <Text variant="heading" center>Camera Permission</Text>
        <Text tone="muted" center>We need camera access to scan member QR codes.</Text>
        <Button title="Grant Permission" fullWidth={false} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {active ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={onScanned}
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: "#000" }} />
      )}

      {/* Overlay */}
      <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", gap: 12 }}>
        <OverlayStat icon="checkmark-done" value={todayCount.data?.count ?? 0} label={t("todaysCheckins")} />
        <OverlayStat icon="hourglass" value={pendingCount.data?.count ?? 0} label={t("pendingApprovals")} />
      </View>

      <ScanFrame />

      {/* Category selector */}
      <View style={{ position: "absolute", bottom: insets.bottom + 100, left: 0, right: 0, gap: 8 }}>
        <Text tone="inverse" weight="600" center style={{ marginBottom: 4 }}>
          {t("selectCategory")}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {(categories.data?.categories ?? []).map((cat) => {
            const isSel = selectedCategory === cat.slug;
            return (
              <Pressable
                key={cat.slug}
                onPress={() => setSelectedCategory(cat.slug)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: radius.pill,
                  backgroundColor: isSel ? colors.gold : "rgba(255,255,255,0.16)",
                  borderWidth: 1,
                  borderColor: isSel ? colors.gold : "rgba(255,255,255,0.3)",
                }}
              >
                <Text weight="600" style={{ color: isSel ? "#1F2937" : "#fff" }}>
                  {lang === "ar" ? cat.labelAr : cat.labelEn}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {!selectedCategory ? (
          <Text variant="caption" tone="gold" center style={{ marginTop: 4 }}>
            Select a category to enable scanning
          </Text>
        ) : null}
      </View>

      <ScanResultModal
        visible={!!result}
        result={result}
        loading={scan.isPending}
        onClose={reset}
      />
    </View>
  );
}

function OverlayStat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: radius.md, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={22} color="#D4AF37" />
      <View>
        <Text tone="inverse" variant="heading">{value}</Text>
        <Text variant="small" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</Text>
      </View>
    </View>
  );
}

function ScanFrame() {
  const scan = useSharedValue(0);
  React.useEffect(() => {
    scan.value = withRepeat(withTiming(1, { duration: 1800 }), -1, true);
  }, [scan]);
  const lineStyle = useAnimatedStyle(() => ({ top: `${scan.value * 90 + 5}%` }));

  const SIZE = 240;
  return (
    <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
      <View style={{ width: SIZE, height: SIZE, borderRadius: radius.lg, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" }}>
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <View
            key={c}
            style={{
              position: "absolute",
              width: 32,
              height: 32,
              borderColor: "#D4AF37",
              borderTopWidth: c.startsWith("t") ? 4 : 0,
              borderBottomWidth: c.startsWith("b") ? 4 : 0,
              borderLeftWidth: c.endsWith("l") ? 4 : 0,
              borderRightWidth: c.endsWith("r") ? 4 : 0,
              top: c.startsWith("t") ? -2 : undefined,
              bottom: c.startsWith("b") ? -2 : undefined,
              left: c.endsWith("l") ? -2 : undefined,
              right: c.endsWith("r") ? -2 : undefined,
              borderTopLeftRadius: c === "tl" ? radius.lg : 0,
              borderTopRightRadius: c === "tr" ? radius.lg : 0,
              borderBottomLeftRadius: c === "bl" ? radius.lg : 0,
              borderBottomRightRadius: c === "br" ? radius.lg : 0,
            }}
          />
        ))}
        <Animated.View style={[{ position: "absolute", left: 8, right: 8, height: 2, backgroundColor: "#D4AF37" }, lineStyle]} />
      </View>
    </View>
  );
}

function ScanResultModal({
  visible,
  result,
  loading,
  onClose,
}: {
  visible: boolean;
  result: { data?: ScanResponse; error?: string } | null;
  loading: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const data = result?.data;
  const isError = !!result?.error;
  const already = data?.alreadyCheckedInToday;
  const setDone = data?.setCompleted;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 }}>
        <Animated.View entering={FadeIn.duration(200)}>
          <Card style={{ alignItems: "center", gap: 16, paddingVertical: 28 }}>
            {isError ? (
              <>
                <Ionicons name="close-circle" size={72} color={colors.error} />
                <Text variant="heading" center>{result?.error}</Text>
              </>
            ) : data ? (
              <>
                <Avatar name={data.member.name} uri={data.member.profileImage} size={72} />
                <Ionicons
                  name={already ? "time" : "checkmark-circle"}
                  size={48}
                  color={already ? colors.warning : colors.success}
                />
                <Text variant="title" center>{data.member.name}</Text>
                <Text tone={already ? "muted" : "success"} weight="600" center>
                  {already ? t("alreadyToday") : t("checkedIn")}
                </Text>
                {setDone ? (
                  <View style={{ backgroundColor: colors.gold + "22", borderRadius: radius.md, padding: 12, width: "100%" }}>
                    <Text tone="gold" weight="700" center>{t("setComplete")}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
            <Button title="Scan Next" onPress={onClose} loading={loading} />
          </Card>
        </Animated.View>
      </View>
    </Modal>
  );
}
