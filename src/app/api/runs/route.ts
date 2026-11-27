import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPool } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const pool = getPool();
    const [rows]: any = await pool.query("SELECT * FROM daily_runs ORDER BY run_date DESC, id DESC LIMIT 30");
    return NextResponse.json({ runs: rows });
  } catch (e:any) { return NextResponse.json({ runs: [], error: String(e.message||e) }); }
}
