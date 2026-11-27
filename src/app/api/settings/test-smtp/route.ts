import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { testSmtp } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const to = String(body.to || session.email);
  try { return NextResponse.json(await testSmtp(to)); }
  catch (e: any) { return NextResponse.json({ error: String(e.message || e) }, { status: 400 }); }
}
