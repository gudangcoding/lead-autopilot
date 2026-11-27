import { getPool } from "./db";

export type SettingKey = "smtp" | "ai" | "wa_blast" | "imap" | "marketing_ai" | "discover";

const DEFAULTS: Record<SettingKey, any> = {
  smtp: { host: "", port: 587, secure: false, user: "", pass: "", from: "" },
  ai: { provider: "hcnsec", baseUrl: "https://api.hcnsec.cn/v1", apiKey: "", model: "DeepSeek-V4-Pro" },
  wa_blast: { dryRun: true, dailyLimit: 10, workerUrl: "http://127.0.0.1:3011", messageDelayMs: 3000 },
  imap: { host: "", port: 993, secure: true, user: "", pass: "", mailbox: "INBOX", pollIntervalSec: 60, enabled: false },
  marketing_ai: { autoReplyEmail: false, autoReplyWa: false, followupHours: 48, maxRepliesPerLead: 5, systemPrompt: "Kamu adalah asisten marketing profesional Indonesia. Balas singkat, sopan, membantu, dan fokus pada penjadwalan meeting/demo. Jangan mengarang fakta." },
  discover: { serpApiKey: "", provider: "serpapi" },
};

export async function getSetting<T = any>(key: SettingKey): Promise<T> {
  try {
    const pool = getPool();
    const [rows]: any = await pool.query("SELECT value_json FROM app_settings WHERE `key`=? LIMIT 1", [key]);
    const raw = rows[0]?.value_json;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return { ...DEFAULTS[key], ...(parsed || {}) } as T;
  } catch {
    return { ...DEFAULTS[key] } as T;
  }
}

export async function setSetting(key: SettingKey, value: any) {
  const pool = getPool();
  const merged = { ...DEFAULTS[key], ...(value || {}) };
  await pool.query(
    "INSERT INTO app_settings (`key`, value_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json)",
    [key, JSON.stringify(merged)]
  );
  return merged;
}

export async function getSmtpConfig() {
  const db = await getSetting<any>("smtp");
  return {
    host: db.host || process.env.SMTP_HOST || "",
    port: Number(db.port || process.env.SMTP_PORT || 587),
    secure: typeof db.secure === "boolean" ? db.secure : String(process.env.SMTP_SECURE) === "true",
    user: db.user || process.env.SMTP_USER || "",
    pass: db.pass || process.env.SMTP_PASS || "",
    from: db.from || process.env.SMTP_FROM || "",
  };
}

export async function getAiConfig() {
  const db = await getSetting<any>("ai");
  return {
    baseUrl: db.baseUrl || process.env.HCNSEC_BASE_URL || "https://api.hcnsec.cn/v1",
    apiKey: db.apiKey || process.env.HCNSEC_API_KEY || "",
    model: db.model || process.env.HCNSEC_MODEL || "DeepSeek-V4-Pro",
  };
}

export async function getWaConfig() {
  const db = await getSetting<any>("wa_blast");
  const envDry = process.env.WA_DRY_RUN;
  return {
    dryRun: typeof db.dryRun === "boolean" ? db.dryRun : String(envDry ?? "true") === "true",
    dailyLimit: Math.max(1, Number(db.dailyLimit || 10)),
    workerUrl: db.workerUrl || "http://127.0.0.1:3011",
    messageDelayMs: Math.max(0, Number(db.messageDelayMs || 3000)),
  };
}

export function maskSecret(v?: string) {
  const s = String(v || "");
  if (!s) return "";
  if (s.length <= 6) return "*".repeat(s.length);
  return `${s.slice(0, 3)}***${s.slice(-3)}`;
}


export async function getImapConfig() {
  const db = await getSetting<any>("imap");
  return {
    host: db.host || process.env.IMAP_HOST || "",
    port: Number(db.port || process.env.IMAP_PORT || 993),
    secure: typeof db.secure === "boolean" ? db.secure : String(process.env.IMAP_SECURE ?? "true") === "true",
    user: db.user || process.env.IMAP_USER || "",
    pass: db.pass || process.env.IMAP_PASS || "",
    mailbox: db.mailbox || "INBOX",
    pollIntervalSec: Math.max(15, Number(db.pollIntervalSec || 60)),
    enabled: !!db.enabled,
  };
}

export async function getMarketingAiConfig() {
  return getSetting<any>("marketing_ai");
}


export async function getDiscoverConfig() {
  const db = await getSetting<any>("discover");
  return {
    serpApiKey: db.serpApiKey || process.env.SERPAPI_KEY || "",
    provider: db.provider || "serpapi",
  };
}
