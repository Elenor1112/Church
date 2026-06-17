import React from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";

export default function Index() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Redirect href="/(auth)/sign-in" />;

  // Pending / rejected members get the waiting screen.
  if (user.role === "member" && user.status !== "approved") {
    return <Redirect href="/(auth)/pending" />;
  }

  switch (user.role) {
    case "super_admin":
      return <Redirect href="/(super)/dashboard" />;
    case "admin":
      return <Redirect href="/(admin)/scanner" />;
    default:
      return <Redirect href="/(member)/home" />;
  }
}
