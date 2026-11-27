import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { discoverLeads } from "@/lib/discover";
import { upsertLeads } from "@/lib/leads";
import { listServices } from "@/lib/services";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const serviceType = String(body.service_type || "building_management");
    const limit = Math.max(1, Math.min(20, Number(body.limit || 10)));
    const services = await listServices();
    const svc = services.find(s=>s.slug===serviceType);
    const query = String(body.query || svc?.default_query || svc?.name || serviceType);
    const leads = await discoverLeads(serviceType, query, limit);
    const upserted = await upsertLeads(leads);
    return NextResponse.json({ ok: true, query, found: leads.length, upserted, leads });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 400 });
  }
}


