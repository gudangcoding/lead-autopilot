import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPool } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const pool = getPool();
    const [rows]: any = await pool.query(
      "SELECT id,service_type,company_name,contact_role,city,website,whatsapp,email,status,last_contacted_at FROM leads ORDER BY id DESC LIMIT 200"
    );
    return NextResponse.json({ leads: rows });
  } catch (e: any) {
    return NextResponse.json({ leads: [], error: String(e.message || e), hint: "Cek MYSQL_* di .env.local lalu jalankan npm run db:migrate" });
  }
}
