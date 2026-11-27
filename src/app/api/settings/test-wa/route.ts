import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWaRuntimeStatus } from "@/lib/whatsapp";
import QRCode from "qrcode";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status: any = await getWaRuntimeStatus();
  if (status.qr) { try { status.qrDataUrl = await QRCode.toDataURL(status.qr, { margin: 1, width: 280 }); } catch {} }
  return NextResponse.json(status);
}
