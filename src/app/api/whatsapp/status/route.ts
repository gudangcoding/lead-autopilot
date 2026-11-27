import { NextResponse } from "next/server";
import { getWaRuntimeStatus } from "@/lib/whatsapp";
import QRCode from "qrcode";

export async function GET(){
  const status: any = await getWaRuntimeStatus();
  if (status.qr) {
    try { status.qrDataUrl = await QRCode.toDataURL(status.qr, { margin: 1, width: 280 }); } catch {}
  }
  return NextResponse.json(status);
}
