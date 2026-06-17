import type { UserRow } from "../db/schema";

export interface AppVariables {
  user: UserRow;
}

export type AppEnv = { Variables: AppVariables };
