import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { env } from "./env";
import { rateLimit } from "./middleware/rateLimit";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { attendanceRoutes } from "./routes/attendance";
import { categoryRoutes } from "./routes/categories";
import { notificationRoutes } from "./routes/notifications";
import { announcementRoutes } from "./routes/announcements";
import { alertRoutes } from "./routes/alerts";
import { commsRoutes } from "./routes/comms";
import { adminRoutes } from "./routes/admins";
import { reportRoutes } from "./routes/reports";
import { memberRoutes } from "./routes/member";
import { pollRoutes } from "./routes/polls";
import { triviaRoutes } from "./routes/trivia";
import { meetingRoutes } from "./routes/meetings";
import type { AppEnv } from "./lib/context";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: env.ALLOWED_ORIGINS === "*" ? "*" : env.ALLOWED_ORIGINS.split(","),
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );
  // Global soft rate limit.
  app.use("*", rateLimit({ windowMs: 60_000, max: 300, keyPrefix: "global" }));

  app.get("/", (c) => c.json({ name: "Church QR Attendance API", status: "ok" }));
  app.get("/health", (c) => c.json({ status: "healthy", time: new Date().toISOString() }));

  app.route("/api/auth", authRoutes);
  app.route("/api/users", userRoutes);
  app.route("/api/attendance", attendanceRoutes);
  app.route("/api/categories", categoryRoutes);
  app.route("/api/notifications", notificationRoutes);
  app.route("/api/announcements", announcementRoutes);
  app.route("/api/alerts", alertRoutes);
  app.route("/api/comms", commsRoutes);
  app.route("/api/admins", adminRoutes);
  app.route("/api/reports", reportRoutes);
  app.route("/api/member", memberRoutes);
  app.route("/api/polls", pollRoutes);
  app.route("/api/trivia", triviaRoutes);
  app.route("/api/meetings", meetingRoutes);

  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      const res = err.getResponse();
      if (res.headers.get("content-type")?.includes("application/json")) return res;
      return c.json({ error: err.message }, err.status);
    }
    console.error("Unhandled error:", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
