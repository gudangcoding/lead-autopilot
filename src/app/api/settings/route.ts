import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSmtpConfig, getAiConfig, getWaConfig, getImapConfig, getMarketingAiConfig, setSetting, maskSecret } from "@/lib/settings";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [smtp, ai, wa, imap, mai] = await Promise.all([getSmtpConfig(), getAiConfig(), getWaConfig(), getImapConfig(), getMarketingAiConfig()]);
  return NextResponse.json({
    smtp: { ...smtp, pass: maskSecret(smtp.pass), hasPass: !!smtp.pass },
    ai: { ...ai, apiKey: maskSecret(ai.apiKey), hasApiKey: !!ai.apiKey },
    wa_blast: wa,
    imap: { ...imap, pass: maskSecret(imap.pass), hasPass: !!imap.pass },
    marketing_ai: mai,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const key = String(body.key || "");
  if (!["smtp", "ai", "wa_blast", "imap", "marketing_ai"].includes(key)) return NextResponse.json({ error: "invalid key" }, { status: 400 });

  if (key === "smtp") {
    const cur = await getSmtpConfig();
    const pass = body.pass && !String(body.pass).includes("***") ? String(body.pass) : cur.pass;
    await setSetting("smtp", {
      host: String(body.host || ""), port: Number(body.port || 587), secure: !!body.secure,
      user: String(body.user || ""), pass, from: String(body.from || ""),
    });
  }
  if (key === "ai") {
    const cur = await getAiConfig();
    const apiKey = body.apiKey && !String(body.apiKey).includes("***") ? String(body.apiKey) : cur.apiKey;
    await setSetting("ai", {
      provider: "hcnsec", baseUrl: String(body.baseUrl || "https://api.hcnsec.cn/v1"),
      apiKey, model: String(body.model || "DeepSeek-V4-Pro"),
    });
  }
  if (key === "wa_blast") {
    await setSetting("wa_blast", {
      dryRun: !!body.dryRun, dailyLimit: Math.max(1, Number(body.dailyLimit || 10)),
      workerUrl: String(body.workerUrl || "http://127.0.0.1:3011"), messageDelayMs: Math.max(0, Number(body.messageDelayMs || 3000)),
    });
  }
  if (key === "imap") {
    const cur = await getImapConfig();
    const pass = body.pass && !String(body.pass).includes("***") ? String(body.pass) : cur.pass;
    await setSetting("imap", { host: String(body.host||""), port: Number(body.port||993), secure: !!body.secure, user: String(body.user||""), pass, mailbox: String(body.mailbox||"INBOX"), pollIntervalSec: Math.max(15, Number(body.pollIntervalSec||60)), enabled: !!body.enabled });
  }
  if (key === "marketing_ai") {
    await setSetting("marketing_ai", { autoReplyEmail: !!body.autoReplyEmail, autoReplyWa: !!body.autoReplyWa, followupHours: Math.max(1, Number(body.followupHours||48)), maxRepliesPerLead: Math.max(1, Number(body.maxRepliesPerLead||5)), systemPrompt: String(body.systemPrompt||"") });
  }
  return NextResponse.json({ ok: true });
}
