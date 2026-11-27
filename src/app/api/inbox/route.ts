import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPool } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const pool = getPool();
    const [rows]: any = await pool.query(
      `SELECT m.*, l.company_name, l.service_type FROM inbox_messages m
       LEFT JOIN leads l ON l.id=m.lead_id
       ORDER BY m.id DESC LIMIT 200`
    );
    return NextResponse.json({ messages: rows });
  } catch (e: any) {
    return NextResponse.json({ messages: [], error: String(e.message || e) });
  }
}
