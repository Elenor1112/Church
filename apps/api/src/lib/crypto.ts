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
    const { sub, role } = decoded as Record<string, unknown>;
    if (typeof sub !== "string" || typeof role !== "string") return null;
    return { sub, role: role as Role };
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
