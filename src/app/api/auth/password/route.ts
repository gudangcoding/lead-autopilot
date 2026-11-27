import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const current = String(body.currentPassword || "");
  const next = String(body.newPassword || "");
  if (next.length < 3) return NextResponse.json({ error: "Password baru minimal 3 karakter" }, { status: 400 });
  try {
    const pool = getPool();
    const [rows]: any = await pool.query("SELECT password_hash FROM users WHERE id=? LIMIT 1", [session.id]);
    if (!rows[0] || !verifyPassword(current, rows[0].password_hash)) {
      return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
    }
    await pool.query("UPDATE users SET password_hash=? WHERE id=?", [hashPassword(next), session.id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
