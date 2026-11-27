import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { pickDailyLeads, upsertLeads } from "@/lib/leads";
import { generateOutreach } from "@/lib/llm";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { getSession } from "@/lib/auth";
import { getWaConfig, getDiscoverConfig } from "@/lib/settings";
import { discoverLeads } from "@/lib/discover";
import { listServices } from "@/lib/services";



export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const session = await getSession();
  const cronOk = process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
  if (!session && !cronOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const waCfg = await getWaConfig().catch(()=>({dailyLimit:10,messageDelayMs:3000}));
  const discoverCfg = await getDiscoverConfig().catch(()=>({autoDiscover:false,discoverLimitPerService:10,defaultLocation:"Indonesia"}));
  const limit = Math.max(1, Math.min(50, Number(body.limit || waCfg.dailyLimit || 10)));
  const allServices = (await listServices()).filter(s=>s.active!==0 && s.active!==false);
  const services = body.service_type ? allServices.filter(s=>s.slug===String(body.service_type)) : allServices;
  const pool = getPool();
  const summary: any[] = [];

  for (const svc of services) {
    const service = svc.slug;
    const runDate = new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO daily_runs (run_date,service_type,status) VALUES (?,?, 'running')
       ON DUPLICATE KEY UPDATE status='running', error=NULL`, [runDate, service]
    ).catch(() => {});
    let emailSent = 0, waSent = 0, selected = 0, discovered = 0, err: any = null;
    try {
      const shouldDiscover = body.discover === true || (body.discover !== false && discoverCfg.autoDiscover);
      if (shouldDiscover && svc.default_query) {
        const q = `${svc.default_query} ${discoverCfg.defaultLocation || ""}`.trim();
        try { discovered = await upsertLeads(await discoverLeads(service, q, Number(body.discoverLimit || discoverCfg.discoverLimitPerService || 10))); } catch(e:any) { console.error("[daily] discover", service, e?.message||e); }
      }
      const leads = await pickDailyLeads(service, limit);
      selected = leads.length;
      for (const lead of leads) {
        const msg = await generateOutreach(lead);
        await new Promise(r=>setTimeout(r, Number((waCfg as any).messageDelayMs||0)));
        let sentEmail = false, sentWa = false;
        if (lead.email) {
          try {
            const id = await sendEmail(lead.email, msg.subject, msg.email);
            await pool.query(`INSERT INTO outreach_logs (lead_id,channel,status,provider_message_id,payload) VALUES (?,?,?,?,?)`, [lead.id,'email','sent',id,JSON.stringify({subject:msg.subject})]);
            sentEmail = true; emailSent++;
          } catch (e:any) {
            await pool.query(`INSERT INTO outreach_logs (lead_id,channel,status,error) VALUES (?,?, 'failed',?)`, [lead.id,'email',String(e.message||e)]);
          }
        }
        if (lead.whatsapp) {
          try {
            const r: any = await sendWhatsApp(lead.whatsapp, msg.whatsapp);
            await pool.query(`INSERT INTO outreach_logs (lead_id,channel,status,provider_message_id,payload) VALUES (?,?,?,?,?)`, [lead.id,'whatsapp',r?.skipped?'skipped':'sent',r?.id||null,JSON.stringify({text:msg.whatsapp})]);
            if (!r?.skipped) { sentWa = true; waSent++; }
          } catch (e:any) {
            await pool.query(`INSERT INTO outreach_logs (lead_id,channel,status,error) VALUES (?,?, 'failed',?)`, [lead.id,'whatsapp',String(e.message||e)]);
          }
        }
        const status = sentEmail && sentWa ? 'sent_both' : sentEmail ? 'sent_email' : sentWa ? 'sent_wa' : 'failed';
        await pool.query(`UPDATE leads SET status=?, last_contacted_at=NOW() WHERE id=?`, [status, lead.id]);
      }
      await pool.query(`UPDATE daily_runs SET selected_count=?,email_sent=?,wa_sent=?,status='done' WHERE run_date=? AND service_type=?`, [selected,emailSent,waSent,runDate,service]);
    } catch (e:any) {
      err = String(e.message || e);
      await pool.query(`UPDATE daily_runs SET status='failed', error=? WHERE run_date=? AND service_type=?`, [err, runDate, service]);
    }
    summary.push({ service, selected, discovered, emailSent, waSent, error: err });
  }
  return NextResponse.json({ ok: true, summary });
}
