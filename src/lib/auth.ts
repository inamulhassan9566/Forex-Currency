import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "./db";

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || "forex-fallback-secret-2026-production";
const COOKIE_NAME = "forex_session";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    },
    AUTH_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get current authenticated user from cookie or authorization header
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    // Verify user still exists and is ACTIVE in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
