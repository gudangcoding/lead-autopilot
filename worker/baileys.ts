import fs from "fs";
import path from "path";
import { saveInbound, autoReplyIfEnabled } from "../src/lib/inbox";
import http from "http";
import dotenv from "dotenv";
// @ts-ignore - no types
import qrcode from "qrcode-terminal";
import pino from "pino";
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";

dotenv.config({ path: ".env.local" });
dotenv.config();

const authDir = path.resolve(process.env.WA_AUTH_DIR || "./data/wa-auth");
const statusPath = path.resolve("./data/wa-status.json");
fs.mkdirSync(authDir, { recursive: true });
fs.mkdirSync(path.dirname(statusPath), { recursive: true });
let sock: any = null;
let status: any = { ready: false, qr: null, updatedAt: null, error: null };

function saveStatus() { fs.writeFileSync(statusPath, JSON.stringify({ ...status, updatedAt: new Date().toISOString() }, null, 2)); }

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, auth: state, logger: pino({ level: "silent" }), printQRInTerminal: false });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
    if (type !== "notify") return;
    for (const m of messages) {
      try {
        if (!m.message || m.key.fromMe) continue;
        const from = (m.key.remoteJid || "").replace(/@s\.whatsapp\.net$/, "");
        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.documentMessage?.caption || "";
        if (!from || !body) continue;
        const saved = await saveInbound({ channel: "whatsapp", from, to: "self", body, externalId: m.key.id || undefined, meta: { jid: m.key.remoteJid } });
        if (!saved.duplicate) await autoReplyIfEnabled(saved.id);
      } catch (e) { console.error("[wa inbound]", e); }
    }
  });
  sock.ev.on("connection.update", (u: any) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) { status.qr = qr; status.ready = false; qrcode.generate(qr, { small: true }); saveStatus(); }
    if (connection === "open") { status.ready = true; status.qr = null; status.error = null; saveStatus(); console.log("WA ready"); }
    if (connection === "close") {
      status.ready = false; saveStatus();
      const code = (lastDisconnect?.error as any)?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) start().catch(console.error);
      else { status.error = "logged out"; saveStatus(); }
    }
  });
}

function normalize(num: string) {
  let n = String(num).replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return n.includes("@s.whatsapp.net") ? n : `${n}@s.whatsapp.net`;
}

http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/status") { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify(status)); }
  if (req.method === "POST" && req.url === "/send") {
    let body = ""; req.on("data", c => body += c); req.on("end", async () => {
      try {
        const { to, text } = JSON.parse(body || "{}");
        if (!status.ready || !sock) throw new Error("WhatsApp not ready");
        const jid = normalize(to);
        const r = await sock.sendMessage(jid, { text });
        res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok: true, id: r?.key?.id }));
      } catch (e:any) { res.writeHead(500, {"Content-Type":"application/json"}); res.end(JSON.stringify({ error: String(e.message||e) })); }
    }); return;
  }
  res.writeHead(404); res.end();
}).listen(3011, "127.0.0.1", () => console.log("WA worker on 127.0.0.1:3011"));

start().catch((e) => { status.error = String(e); saveStatus(); console.error(e); });
