import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const channel = sp.get("channel");
  const status = sp.get("status");
  const service = sp.get("service_type");
  const q = (sp.get("q") || "").trim();
  const limit = Math.min(500, Math.max(1, Number(sp.get("limit") || 200)));
  const where: string[] = [];
  const args: any[] = [];
  if (channel) { where.push("o.channel=?"); args.push(channel); }
  if (status) { where.push("o.status=?"); args.push(status); }
  if (service) { where.push("l.service_type=?"); args.push(service); }
  if (q) { where.push("(l.company_name LIKE ? OR l.email LIKE ? OR l.whatsapp LIKE ? OR l.city LIKE ?)"); args.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`); }
  const sql = `SELECT o.id,o.lead_id,o.channel,o.status,o.provider_message_id,o.error,o.payload,o.created_at,
    l.company_name,l.service_type,l.email,l.whatsapp,l.city,l.contact_role
    FROM outreach_logs o LEFT JOIN leads l ON l.id=o.lead_id
    ${where.length ? "WHERE "+where.join(" AND ") : ""}
    ORDER BY o.id DESC LIMIT ?`;
  args.push(limit);
  try {
    const pool = getPool();
    const [rows]: any = await pool.query(sql, args);
    return NextResponse.json({ logs: rows });
  } catch (e:any) { return NextResponse.json({ logs: [], error: String(e.message||e) }); }
}
