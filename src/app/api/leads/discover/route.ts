import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { discoverLeads } from "@/lib/discover";
import { upsertLeads } from "@/lib/leads";
import type { ServiceType } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const serviceType = String(body.service_type || "building_management") as ServiceType;
    const limit = Math.max(1, Math.min(20, Number(body.limit || 10)));
    const query = String(body.query || defaultQuery(serviceType));
    const leads = await discoverLeads(serviceType, query, limit);
    const upserted = await upsertLeads(leads);
    return NextResponse.json({ ok: true, query, found: leads.length, upserted, leads });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 400 });
  }
}

function defaultQuery(s: ServiceType) {
  return s === "building_management"
    ? "pengelola gedung apartemen P3SRS Jakarta"
    : "pabrik kawasan industri MM2100 Cikarang Bekasi";
}
