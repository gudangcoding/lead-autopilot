import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: ".env.local" });
dotenv.config();

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const sql = fs.readFileSync(path.join(process.cwd(), "scripts/schema.sql"), "utf8");
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    multipleStatements: true,
  });
  const db = process.env.MYSQL_DATABASE || "lead_autopilot";
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${db}\``);
  await conn.query(sql);

  const seedEmail = "a@a.com";
  const [rows]: any = await conn.query("SELECT id FROM users WHERE email=? LIMIT 1", [seedEmail]);
  if (!rows.length) {
    await conn.query("INSERT INTO users (email,name,password_hash) VALUES (?,?,?)", [seedEmail, "Admin", hashPassword("123")]);
    console.log("seeded user", seedEmail);
  }

  const defaults: [string, any][] = [
    ["smtp", { host: process.env.SMTP_HOST || "", port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE) === "true", user: process.env.SMTP_USER || "", pass: process.env.SMTP_PASS || "", from: process.env.SMTP_FROM || "" }],
    ["ai", { provider: "hcnsec", baseUrl: process.env.HCNSEC_BASE_URL || "https://api.hcnsec.cn/v1", apiKey: process.env.HCNSEC_API_KEY || "", model: process.env.HCNSEC_MODEL || "DeepSeek-V4-Pro" }],
    ["wa_blast", { dryRun: String(process.env.WA_DRY_RUN ?? "true") === "true", dailyLimit: 10, workerUrl: "http://127.0.0.1:3011", messageDelayMs: 3000 }],
    ["imap", { host: "", port: 993, secure: true, user: "", pass: "", mailbox: "INBOX", pollIntervalSec: 60, enabled: false }],
    ["marketing_ai", { autoReplyEmail: false, autoReplyWa: false, followupHours: 48, maxRepliesPerLead: 5, systemPrompt: "Kamu adalah asisten marketing profesional Indonesia. Balas singkat, sopan, membantu, dan fokus pada penjadwalan meeting/demo. Jangan mengarang fakta." }],
  ];
  for (const [key, value] of defaults) {
    await conn.query("INSERT IGNORE INTO app_settings (`key`, value_json) VALUES (?, ?)", [key, JSON.stringify(value)]);
  }

  await conn.end();
  console.log("migrated", db);
}

main().catch((e) => { console.error(e); process.exit(1); });
