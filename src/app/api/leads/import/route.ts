import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";
import { upsertLeads } from "@/lib/leads";
import type { LeadInput, ServiceType } from "@/lib/types";

function normalizeRow(r: any, serviceType: ServiceType): LeadInput {
  const g = (k: string[]) => k.map(x => r[x]).find(v => v !== undefined && v !== null && String(v).trim() !== "");
  return {
    service_type: serviceType,
    company_name: String(g(["company_name","nama perusahaan","nama_perusahaan","nama","company"]) || "").trim(),
    contact_role: String(g(["contact_role","kontak","jabatan target","pic role"]) || "").trim() || undefined,
    contact_name: String(g(["contact_name","pic","nama kontak"]) || "").trim() || undefined,
    address: String(g(["address","alamat"]) || "").trim() || undefined,
    city: String(g(["city","kota","kawasan/kota"]) || "").trim() || undefined,
    website: String(g(["website","web"]) || "").trim() || undefined,
    whatsapp: String(g(["whatsapp","wa","telepon","phone","whatsapp/telepon"]) || "").trim() || undefined,
    email: String(g(["email","e-mail"]) || "").trim() || undefined,
    source: String(g(["source","catatan/sumber","catatan"]) || "").trim() || undefined,
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const serviceType = String(form.get("service_type") || "building_management") as ServiceType;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  let rows: any[] = [];
  if (file.name.toLowerCase().endsWith(".csv")) {
    rows = parse(buf, { columns: true, skip_empty_lines: true, bom: true });
  } else {
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  const leads = rows.map((r) => normalizeRow(r, serviceType)).filter(l => l.company_name);
  const count = await upsertLeads(leads);
  return NextResponse.json({ ok: true, received: rows.length, upserted: count });
}
