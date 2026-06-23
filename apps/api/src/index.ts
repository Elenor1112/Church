import { serve } from "@hono/node-server";
import { env } from "./env";
import { createApp } from "./app";

const app = createApp();

serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`🚀 Church QR Attendance API listening on http://0.0.0.0:${info.port}`);
  console.log(`📱 Access from mobile on same network: http://192.168.1.9:${info.port}`);
});
