import type { UserRow } from "../db/schema";
import type { PublicUser, AdminPermissions } from "@church/shared";
import { adminPermissions as permsTable } from "../db/schema";

type PermsRow = typeof permsTable.$inferSelect;

/** Strip secrets and normalize timestamps for transport. */
export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    area: row.area,
    addressDetails: row.addressDetails,
    birthday: row.birthday,
    spousePhone: row.spousePhone,
    email: row.email,
    profileImage: row.profileImage,
    role: row.role,
    status: row.status,
    completedSets: row.completedSets,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPermissions(row: PermsRow | null | undefined): AdminPermissions | null {
  if (!row) return null;
  return {
    can_scan: row.canScan,
    can_scan_admins: row.canScanAdmins,
    can_view_logs: row.canViewLogs,
    can_send_messages: row.canSendMessages,
    can_generate_reports: row.canGenerateReports,
  };
}
