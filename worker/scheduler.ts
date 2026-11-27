import "dotenv/config";
import cron from "node-cron";
import { getPool } from "../src/lib/db";
import { pickDailyLeads, upsertLeads } from "../src/lib/leads";
import { generateOutreach } from "../src/lib/llm";
import { sendEmail } from "../src/lib/email";
import { sendWhatsApp } from "../src/lib/whatsapp";
import { getWaConfig, getDiscoverConfig } from "../src/lib/settings";
import { discoverLeads } from "../src/lib/discover";
import { listServices } from "../src/lib/services";

async function runDaily() {
  const pool = getPool();
  const waCfg = await getWaConfig().catch(()=>({dailyLimit:10,messageDelayMs:3000}));
  const discoverCfg = await getDiscoverConfig().catch(()=>({autoDiscover:false,discoverLimitPerService:10,defaultLocation:"Indonesia"}));
  const services = (await listServices()).filter(s=>s.active!==0 && s.active!==false);
  for (const svc of services) {
    const service = svc.slug;
    const runDate = new Date().toISOString().slice(0,10);
    await pool.query(`INSERT INTO daily_runs (run_date,service_type,status) VALUES (?,?, 'running') ON DUPLICATE KEY UPDATE status='running', error=NULL`, [runDate, service]).catch(()=>{});
    let emailSent=0, waSent=0, selected=0, discovered=0;
    try {
      if (discoverCfg.autoDiscover && svc.default_query) {
        const q = `${svc.default_query} ${discoverCfg.defaultLocation || ""}`.trim();
        try {
          const found = await discoverLeads(service, q, Number(discoverCfg.discoverLimitPerService||10));
          discovered = await upsertLeads(found);
          console.log("[scheduler] discover", service, {query:q, found: found.length, upserted: discovered});
        } catch(e:any) {
          console.error("[scheduler] discover failed", service, e?.message||e);
        }
      }
      const leads = await pickDailyLeads(service as any, Number(waCfg.dailyLimit||10));
      selected = leads.length;
      for (const lead of leads) {
        const msg = await generateOutreach(lead);
        let sentEmail=false, sentWa=false;
        if (lead.email) {
          try { const id=await sendEmail(lead.email, msg.subject, msg.email); await pool.query(`INSERT INTO outreach_logs (lead_id,channel,status,provider_message_id,payload) VALUES (?,?,?,?,?)`, [lead.id,'email','sent',id,JSON.stringify({subject:msg.subject})]); sentEmail=true; emailSent++; }
          catch(e:any){ await pool.query(`INSERT INTO outreach_logs (lead_id,channel,status,error) VALUES (?,?, 'failed',?)`, [lead.id,'email',String(e.message||e)]); }
        }
        if (lead.whatsapp) {
          try { const r:any=await sendWhatsApp(lead.whatsapp, msg.whatsapp); await pool.query(`INSERT INTO outreach_logs (lead_id,channel,status,provider_message_id,payload) VALUES (?,?,?,?,?)`, [lead.id,'whatsapp',r?.skipped?'skipped':'sent',r?.id||null,JSON.stringify({text:msg.whatsapp})]); if(!r?.skipped){ sentWa=true; waSent++; } }
          catch(e:any){ await pool.query(`INSERT INTO outreach_logs (lead_id,channel,status,error) VALUES (?,?, 'failed',?)`, [lead.id,'whatsapp',String(e.message||e)]); }
        }
        const status = sentEmail && sentWa ? 'sent_both' : sentEmail ? 'sent_email' : sentWa ? 'sent_wa' : 'failed';
        await pool.query(`UPDATE leads SET status=?, last_contacted_at=NOW() WHERE id=?`, [status, lead.id]);
        await new Promise(r=>setTimeout(r, Number(waCfg.messageDelayMs||1000)));
      }
      await pool.query(`UPDATE daily_runs SET selected_count=?,email_sent=?,wa_sent=?,status='done' WHERE run_date=? AND service_type=?`, [selected,emailSent,waSent,runDate,service]);
      console.log("[scheduler] done", service, {selected,discovered,emailSent,waSent});
    } catch(e:any) {
      console.error("[scheduler]", service, e);
      await pool.query(`UPDATE daily_runs SET status='failed', error=? WHERE run_date=? AND service_type=?`, [String(e.message||e), runDate, service]).catch(()=>{});
    }
  }
}

console.log("[scheduler] started. daily 08:00 Asia/Jakarta");
cron.schedule("0 8 * * *", () => { runDaily().catch(console.error); }, { timezone: "Asia/Jakarta" });
// optional: run once on startup if RUN_DAILY_ON_START=true
if (String(process.env.RUN_DAILY_ON_START) === "true") runDaily().catch(console.error);
