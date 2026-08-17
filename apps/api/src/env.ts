import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("30d"),
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ALLOWED_ORIGINS: z.string().default("*"),
  /**
   * Number of trusted reverse proxies in front of the API (Railway/Fly = 1).
   * The client IP is read this many hops from the RIGHT of x-forwarded-for, so a
   * client-supplied header cannot forge it. 0 disables header trust entirely.
   */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  SEED_SUPERADMIN_PHONE: z.string().default("01000000000"),
  SEED_SUPERADMIN_PASSWORD: z.string().default("ChangeMe@123"),
  SEED_SUPERADMIN_FIRST: z.string().default("Super"),
  SEED_SUPERADMIN_LAST: z.string().default("Admin"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
