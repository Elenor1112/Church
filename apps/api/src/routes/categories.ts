import { Hono } from "hono";
import { db } from "../db/index";
import { fridayCategories } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/context";

export const categoryRoutes = new Hono<AppEnv>();

categoryRoutes.get("/", requireAuth, async (c) => {
  const rows = await db.select().from(fridayCategories).orderBy(fridayCategories.sortOrder);
  return c.json({
    categories: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      labelAr: r.labelAr,
      labelEn: r.labelEn,
    })),
  });
});
