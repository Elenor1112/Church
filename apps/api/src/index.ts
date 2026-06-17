import { serve } from "@hono/node-server";
import { env } from "./env";
import { createApp } from "./app";

const app = createApp();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Church QR Attendance API listening on http://localhost:${info.port}`);
});
