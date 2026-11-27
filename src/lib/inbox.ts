import { getPool } from "./db";
import { generateReply } from "./llm";
import { sendEmail } from "./email";
import { sendWhatsApp } from "./whatsapp";
import { getMarketingAiConfig } from "./settings";

export async function findLeadByContact(channel: "email" | "whatsapp", from: string) {
  const pool = getPool();
  const v = String(from || "").trim().toLowerCase();
  if (!v) return null;
  if (channel === "email") {
    const [rows]: any = await pool.query("SELECT * FROM leads WHERE LOWER(email)=? ORDER BY id DESC LIMIT 1", [v]);
    return rows[0] || null;
  }
  const digits = v.replace(/\D/g, "");
  const [rows]: any = await pool.query("SELECT * FROM leads WHERE REPLACE(REPLACE(REPLACE(whatsapp,'+',''),'-',''),' ','') LIKE ? ORDER BY id DESC LIMIT 1", [`%${digits.slice(-10)}%`]);
  return rows[0] || null;
}

export async function saveInbound(msg: { channel: "email"|"whatsapp"; from: string; to?: string; subject?: string; body: string; externalId?: string; meta?: any; }) {
  const pool = getPool();
  if (msg.externalId) {
    const [dup]: any = await pool.query("SELECT id FROM inbox_messages WHERE channel=? AND external_id=? LIMIT 1", [msg.channel, msg.externalId]);
    if (dup.length) return { duplicate: true, id: dup[0].id };
  }
  const lead = await findLeadByContact(msg.channel, msg.from);
  const [r]: any = await pool.query(
    "INSERT INTO inbox_messages (channel,direction,lead_id,from_addr,to_addr,subject,body,external_id,status,meta) VALUES (?,?,?,?,?,?,?,?, 'received',?)",
    [msg.channel, "inbound", lead?.id || null, msg.from, msg.to || null, msg.subject || null, msg.body, msg.externalId || null, JSON.stringify(msg.meta || {})]
  );
  return { duplicate: false, id: r.insertId, lead };
}

export async function autoReplyIfEnabled(inboxId: number) {
  const pool = getPool();
  const [rows]: any = await pool.query("SELECT * FROM inbox_messages WHERE id=? LIMIT 1", [inboxId]);
  const msg = rows[0];
  if (!msg || msg.direction !== "inbound") return { skipped: "not_found" };
  const cfg = await getMarketingAiConfig();
  const enabled = msg.channel === "email" ? !!cfg.autoReplyEmail : !!cfg.autoReplyWa;
  if (!enabled) return { skipped: "disabled" };

  const [leadRows]: any = msg.lead_id ? await pool.query("SELECT * FROM leads WHERE id=? LIMIT 1", [msg.lead_id]) : [[]];
  const lead = leadRows[0] || { company_name: msg.from_addr, contact_role: "Prospek", service_type: "building_management", city: "" };
  const [hist]: any = await pool.query("SELECT direction,body FROM inbox_messages WHERE (lead_id<=>? OR from_addr=?) AND channel=? ORDER BY id DESC LIMIT 6", [msg.lead_id, msg.from_addr, msg.channel]);
  const reply = await generateReply({ lead, inbound: msg.body || "", history: hist.reverse() });

  try {
    if (msg.channel === "email") {
      const subject = msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject || "Penawaran"}`;
      const id = await sendEmail(msg.from_addr, subject, reply);
      await pool.query("INSERT INTO inbox_messages (channel,direction,lead_id,from_addr,to_addr,subject,body,external_id,status,meta) VALUES ('email','outbound',?,?,?,?,?,?,'replied',?)", [msg.lead_id, msg.to_addr, msg.from_addr, subject, reply, id, JSON.stringify({inReplyTo: msg.id})]);
    } else {
      const r: any = await sendWhatsApp(msg.from_addr, reply);
      await pool.query("INSERT INTO inbox_messages (channel,direction,lead_id,from_addr,to_addr,subject,body,external_id,status,meta) VALUES ('whatsapp','outbound',?,NULL,?,NULL,?,? ,?,?)", [msg.lead_id, msg.from_addr, reply, r?.id || null, r?.skipped ? 'ignored' : 'replied', JSON.stringify({inReplyTo: msg.id, skipped: !!r?.skipped})]);
    }
    await pool.query("UPDATE inbox_messages SET status='replied' WHERE id=?", [inboxId]);
    return { ok: true };
  } catch (e: any) {
    await pool.query("UPDATE inbox_messages SET status='failed' WHERE id=?", [inboxId]);
    await pool.query("INSERT INTO inbox_messages (channel,direction,lead_id,from_addr,to_addr,subject,body,status,meta) VALUES (?,'outbound',?,?,?,?,?, 'failed',?)", [msg.channel, msg.lead_id, "system", msg.from_addr, msg.subject || null, String(e.message||e), JSON.stringify({inReplyTo: msg.id})]);
    return { error: String(e.message || e) };
  }
}
