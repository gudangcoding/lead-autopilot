import "dotenv/config";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getImapConfig } from "../src/lib/settings";
import { saveInbound, autoReplyIfEnabled } from "../src/lib/inbox";

async function poll() {
  const cfg = await getImapConfig();
  if (!cfg.enabled || !cfg.host || !cfg.user || !cfg.pass) return;
  const client = new ImapFlow({
    host: cfg.host, port: cfg.port, secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }, logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock(cfg.mailbox || "INBOX");
  try {
    const unseen = await client.search({ seen: false }, { uid: true });
    for (const uid of (unseen || []).slice(-20)) {
      const msg: any = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const parsed = await simpleParser(msg.source);
      const fromObj: any = parsed.from;
      const toObj: any = parsed.to;
      const from = fromObj?.value?.[0]?.address || fromObj?.[0]?.address || msg.envelope?.from?.[0]?.address || "";
      const to = toObj?.value?.[0]?.address || toObj?.[0]?.address || "";
      const subject = parsed.subject || msg.envelope?.subject || "";
      const body = String(parsed.text || parsed.html || "").slice(0, 5000);
      const externalId = parsed.messageId || String(msg.uid);
      const saved = await saveInbound({ channel: "email", from, to, subject, body, externalId, meta: { uid: msg.uid } });
      if (!saved.duplicate) await autoReplyIfEnabled(saved.id);
      await client.messageFlagsAdd(uid, ["\Seen"], { uid: true });
    }
  } finally {
    lock.release();
  }
  await client.logout();
}

async function loop() {
  while (true) {
    try { await poll(); } catch (e) { console.error("[imap]", e); }
    const cfg = await getImapConfig().catch(()=>({pollIntervalSec:60}));
    await new Promise(r => setTimeout(r, Math.max(15, Number(cfg.pollIntervalSec||60)) * 1000));
  }
}

loop();
