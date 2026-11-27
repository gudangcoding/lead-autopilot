import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listKnowledge, saveKnowledge, deleteKnowledge } from "@/lib/knowledge";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const service = req.nextUrl.searchParams.get("service_slug") || undefined;
  try { return NextResponse.json({ knowledge: await listKnowledge(service) }); }
  catch (e:any) { return NextResponse.json({ knowledge: [], error: String(e.message||e) }); }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(()=>({}));
  if (!body.title || !body.url) return NextResponse.json({ error: "title dan url wajib" }, { status: 400 });
  const id = await saveKnowledge(body);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteKnowledge(id);
  return NextResponse.json({ ok: true });
}
