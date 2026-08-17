import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { customAlphabet } from "nanoid";
import { env } from "../env";
import type { Role } from "@church/shared";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  /** Must match users.token_version, else the session predates a privilege change. */
  tv: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string") return null;
    const { sub, role, tv } = decoded as Record<string, unknown>;
    if (typeof sub !== "string" || typeof role !== "string") return null;
    // Tokens issued before token versioning have no `tv`; treat them as v0 so
    // existing sessions keep working until the next privilege change.
    return { sub, role: role as Role, tv: typeof tv === "number" ? tv : 0 };
  } catch {
    return null;
  }
}

// QR tokens: URL-safe, unguessable, 32 chars.
const qrAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const generateQrToken = customAlphabet(qrAlphabet, 32);

export function newQrToken(): string {
  return generateQrToken();
}
