import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listServices, upsertService } from "@/lib/services";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ services: await listServices() });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(()=>({}));
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const svc = await upsertService(body);
  return NextResponse.json({ ok: true, service: svc });
}
