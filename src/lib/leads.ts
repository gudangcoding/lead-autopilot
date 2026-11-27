import { getPool } from "./db";
import type { LeadInput, ServiceType } from "./types";

export async function upsertLeads(leads: LeadInput[]) {
  const pool = getPool();
  let inserted = 0;
  for (const l of leads) {
    if (!l.company_name || !l.service_type) continue;
    const [r]: any = await pool.query(
      `INSERT INTO leads (service_type,company_name,contact_role,contact_name,address,city,website,whatsapp,email,source)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE contact_role=VALUES(contact_role),contact_name=VALUES(contact_name),address=VALUES(address),
       city=VALUES(city),website=VALUES(website),whatsapp=COALESCE(VALUES(whatsapp),whatsapp),email=COALESCE(VALUES(email),email),source=VALUES(source)`,
      [l.service_type, l.company_name, l.contact_role||null, l.contact_name||null, l.address||null, l.city||null, l.website||null, l.whatsapp||null, l.email||null, l.source||null]
    );
    if (r.affectedRows) inserted++;
  }
  return inserted;
}

export async function pickDailyLeads(serviceType: ServiceType, limit = 10) {
  const pool = getPool();
  const [rows]: any = await pool.query(
    `SELECT * FROM leads WHERE service_type=? AND status='new' AND (email IS NOT NULL OR whatsapp IS NOT NULL)
     ORDER BY created_at ASC LIMIT ?`, [serviceType, limit]
  );
  return rows as any[];
}
