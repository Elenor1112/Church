import React, { useCallback, useRef, useState } from "react";
import { View, Pressable, Modal, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useClaimReward } from "@/features/hooks";
import { ApiError } from "@/lib/api";
import { Text, Button } from "@/components/ui";
import { radius, spacing, iconSize, hairline, screenGutter } from "@/theme/tokens";
import { camera as cam } from "@/theme/camera";

/**
 * Full-screen QR scanner used to verify a member before delivering their set
 * reward. Scans the member's existing QR; the server checks the token resolves
 * to the set's member, then marks the reward claimed (verifiedAt/By recorded).
 *
 * Self-contained native <Modal> — its own window, plain Pressable backdrop, no
 * shared overlay layer (same freeze-free pattern as the rest of the app).
 */
export function SetVerifyScanner({
  visible,
  setId,
  memberName,
  onClose,
  onVerified,
}: {
  visible: boolean;
  setId: string | null;
  memberName: string;
  onClose: () => void;
  onVerified: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const claim = useClaimReward();
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  // Reset the scan lock + error each time the scanner opens.
  React.useEffect(() => {
    if (visible) {
      lockRef.current = false;
      setError(null);
    }
  }, [visible]);

  const onScanned = useCallback(
    ({ data }: { data: string }) => {
      if (lockRef.current || !setId) return;
      lockRef.current = true;
      setError(null);
      claim.mutate(
        { setId, qrToken: data },
        {
          onSuccess: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onVerified();
          },
          onError: (err) => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(err instanceof ApiError ? err.message : t("somethingWrong"));
            // Allow another attempt after a mismatch.
            lockRef.current = false;
          },
        },
      );
    },
    [setId, claim, onVerified, t],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onScanned}
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: spacing.xxxl,
              gap: spacing.lg,
            }}
          >
            <Ionicons name="camera-outline" size={iconSize.xl} color={cam.text} />
            <Text variant="caption" center style={{ color: cam.textMuted, maxWidth: 280 }}>
              {t("cameraPermissionBody")}
            </Text>
            <Button title={t("grantPermission")} fullWidth={false} onPress={requestPermission} />
          </View>
        )}

        {/* Header */}
        <View
          style={{
            position: "absolute",
            top: insets.top + spacing.sm,
            left: screenGutter,
            right: screenGutter,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              backgroundColor: cam.glass,
              borderRadius: radius.pill,
              borderWidth: hairline,
              borderColor: cam.glassBorder,
              padding: spacing.sm,
            }}
          >
            <Ionicons name="close" size={iconSize.lg} color={cam.text} />
          </Pressable>
          <View
            style={{
              flex: 1,
              backgroundColor: cam.glass,
              borderRadius: radius.sm,
              borderWidth: hairline,
              borderColor: cam.glassBorder,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              gap: spacing.xxs,
            }}
          >
            <Text variant="caption" weight="600" style={{ color: cam.text }}>
              {t("scanToVerify")}
            </Text>
            <Text variant="small" numberOfLines={1} style={{ color: cam.textMuted }}>
              {memberName}
            </Text>
          </View>
        </View>

        {/* Scan frame — corner brackets match the main scanner's reticle. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 248, height: 248 }}>
              {(["tl", "tr", "bl", "br"] as const).map((c) => (
                <View
                  key={c}
                  style={{
                    position: "absolute",
                    width: 28,
                    height: 28,
                    borderColor: cam.frame,
                    borderTopWidth: c.startsWith("t") ? 3 : 0,
                    borderBottomWidth: c.startsWith("b") ? 3 : 0,
                    borderLeftWidth: c.endsWith("l") ? 3 : 0,
                    borderRightWidth: c.endsWith("r") ? 3 : 0,
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
            </View>
          </View>
        </View>

        {/* Status footer */}
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + spacing.xxl,
            left: spacing.xxl,
            right: spacing.xxl,
          }}
        >
          {claim.isPending ? (
            <StatusPanel text={t("verifying")} />
          ) : error ? (
            <View
              style={{
                backgroundColor: colors.error,
                borderRadius: radius.sm,
                padding: spacing.md,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Ionicons name="close-circle" size={iconSize.md} color="#FFFFFF" />
              <Text variant="caption" weight="600" style={{ flex: 1, color: "#FFFFFF" }}>
                {error}
              </Text>
            </View>
          ) : (
            <StatusPanel text={t("pointCameraAtQr")} />
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Neutral glass panel for the scanner's idle/working status line. */
function StatusPanel({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: cam.glassStrong,
        borderRadius: radius.sm,
        borderWidth: hairline,
        borderColor: cam.glassBorder,
        padding: spacing.md,
        alignItems: "center",
      }}
    >
      <Text variant="caption" weight="500" style={{ color: cam.text }}>
        {text}
      </Text>
    </View>
  );
}
