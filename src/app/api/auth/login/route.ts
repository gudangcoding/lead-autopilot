import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return NextResponse.json({ error: "Email dan password wajib" }, { status: 400 });
  try {
    const pool = getPool();
    const [rows]: any = await pool.query("SELECT id,email,name,password_hash FROM users WHERE email=? LIMIT 1", [email]);
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }
    await setSessionCookie({ id: Number(user.id), email: user.email, name: user.name || "" });
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name || "" } });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e), hint: "Jalankan npm run db:migrate" }, { status: 500 });
  }
}
