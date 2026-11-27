import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { testAiConnection } from "@/lib/llm";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try { return NextResponse.json(await testAiConnection()); }
  catch (e: any) { return NextResponse.json({ error: String(e.message || e) }, { status: 400 }); }
}
