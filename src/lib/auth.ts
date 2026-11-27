import crypto from "crypto";
import { cookies } from "next/headers";
import { getPool } from "./db";

const COOKIE = "la_session";
const SECRET = process.env.AUTH_SECRET || process.env.CRON_SECRET || "lead-autopilot-dev-secret-change-me";

export interface SessionUser { id: number; email: string; name: string; }

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}
function sign(value: string) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = String(stored || "").split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  try { return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex")); }
  catch { return false; }
}

export function createSessionToken(user: SessionUser) {
  const payload = b64url(JSON.stringify({ ...user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string | null): SessionUser | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch { return null; }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || Date.now() > data.exp) return null;
    return { id: Number(data.id), email: String(data.email), name: String(data.name || "") };
  } catch { return null; }
}

export async function getSession(): Promise<SessionUser | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session) return null;
  try {
    const pool = getPool();
    const [rows]: any = await pool.query("SELECT id,email,name FROM users WHERE id=? LIMIT 1", [session.id]);
    if (!rows[0]) return null;
    return { id: Number(rows[0].id), email: rows[0].email, name: rows[0].name || "" };
  } catch { return session; }
}

export async function setSessionCookie(user: SessionUser) {
  const c = await cookies();
  c.set(COOKIE, createSessionToken(user), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 24 * 60 * 60 });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

export function requireApiSession(session: SessionUser | null) {
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
