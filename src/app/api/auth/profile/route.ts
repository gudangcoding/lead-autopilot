import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email wajib" }, { status: 400 });
  try {
    const pool = getPool();
    const [dup]: any = await pool.query("SELECT id FROM users WHERE email=? AND id<>? LIMIT 1", [email, session.id]);
    if (dup.length) return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
    await pool.query("UPDATE users SET name=?, email=? WHERE id=?", [name, email, session.id]);
    const user = { id: session.id, name, email };
    await setSessionCookie(user);
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
