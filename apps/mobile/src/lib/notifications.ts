import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/** Request permission, get the Expo push token, and register it with the API. */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (tokenData.data) {
      await api.post("/api/users/me/push-token", { token: tokenData.data }).catch(() => {});
    }
  } catch {
    // Push is best-effort; never block the app.
  }
}
