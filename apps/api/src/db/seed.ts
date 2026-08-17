import { eq } from "drizzle-orm";
import { env } from "../env";
import { db } from "./index";
import { fridayCategories, users, qrCodes, meetings } from "./schema";
import { hashPassword, newQrToken } from "../lib/crypto";
import { FRIDAY_CATEGORIES, DEFAULT_MEETING } from "@church/shared";

async function seedCategories() {
  for (let i = 0; i < FRIDAY_CATEGORIES.length; i++) {
    const c = FRIDAY_CATEGORIES[i]!;
    await db
      .insert(fridayCategories)
      .values({ slug: c.slug, labelAr: c.labelAr, labelEn: c.labelEn, sortOrder: i })
      .onConflictDoNothing({ target: fridayCategories.slug });
  }
  console.log(`✅ Seeded ${FRIDAY_CATEGORIES.length} Friday categories.`);
}

async function seedSuperAdmin() {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, env.SEED_SUPERADMIN_PHONE))
    .limit(1);

  if (existing.length > 0) {
    console.log("ℹ️  Super admin already exists, skipping.");
    return;
  }

  const passwordHash = await hashPassword(env.SEED_SUPERADMIN_PASSWORD);
  const [admin] = await db
    .insert(users)
    .values({
      firstName: env.SEED_SUPERADMIN_FIRST,
      lastName: env.SEED_SUPERADMIN_LAST,
      phone: env.SEED_SUPERADMIN_PHONE,
      birthday: "1990-01-01",
      passwordHash,
      role: "super_admin",
      status: "approved",
    })
    .returning({ id: users.id });

  if (admin) {
    await db.insert(qrCodes).values({ userId: admin.id, qrToken: newQrToken() });
  }

  console.log(
    `✅ Created super admin — phone: ${env.SEED_SUPERADMIN_PHONE}, password: ${env.SEED_SUPERADMIN_PASSWORD}`,
  );
  console.log("⚠️  Change this password immediately after first login.");
}

/**
 * The default Friday window is a real row, not an implicit fallback — so a super
 * admin can edit or delete it and actually close the scanner.
 */
async function seedDefaultMeeting() {
  const existing = await db.select({ id: meetings.id }).from(meetings).limit(1);
  if (existing.length > 0) {
    console.log("ℹ️  Meetings already exist, skipping default meeting.");
    return;
  }
  await db.insert(meetings).values({
    name: DEFAULT_MEETING.name,
    meetingDate: null, // recurring weekly
    dayOfWeek: DEFAULT_MEETING.dayOfWeek,
    startTime: DEFAULT_MEETING.startTime,
    endTime: DEFAULT_MEETING.endTime,
  });
  console.log("✅ Seeded default Friday meeting.");
}

async function main() {
  console.log("⏳ Seeding database...");
  await seedCategories();
  await seedSuperAdmin();
  await seedDefaultMeeting();
  console.log("✅ Seed complete.");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
