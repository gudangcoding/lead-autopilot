import { getPool } from "./db";

export interface KnowledgeSource {
  id?: number; service_slug?: string|null; title: string; url: string; notes?: string|null; content_cache?: string|null; cached_at?: any; active?: number|boolean;
}

export async function listKnowledge(serviceSlug?: string) {
  const pool = getPool();
  if (serviceSlug) {
    const [rows]: any = await pool.query("SELECT * FROM knowledge_sources WHERE active=1 AND (service_slug=? OR service_slug IS NULL OR service_slug='') ORDER BY id DESC", [serviceSlug]);
    return rows as KnowledgeSource[];
  }
  const [rows]: any = await pool.query("SELECT * FROM knowledge_sources ORDER BY id DESC");
  return rows as KnowledgeSource[];
}

export async function saveKnowledge(input: KnowledgeSource) {
  const pool = getPool();
  if (input.id) {
    await pool.query("UPDATE knowledge_sources SET service_slug=?, title=?, url=?, notes=?, active=? WHERE id=?", [input.service_slug||null, input.title, input.url, input.notes||null, input.active===false?0:1, input.id]);
    return input.id;
  }
  const [r]: any = await pool.query("INSERT INTO knowledge_sources (service_slug,title,url,notes,active) VALUES (?,?,?,?,1)", [input.service_slug||null, input.title, input.url, input.notes||null]);
  return r.insertId;
}

export async function deleteKnowledge(id: number) {
  const pool = getPool();
  await pool.query("DELETE FROM knowledge_sources WHERE id=?", [id]);
}

function htmlToText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/ +/g, " ").trim();
}

export async function getKnowledgeContext(serviceSlug?: string) {
  let sources: KnowledgeSource[] = [];
  try { sources = await listKnowledge(serviceSlug); } catch { return ""; }
  const out: string[] = [];
  for (const s of sources.slice(0, 5)) {
    let text = s.content_cache || "";
    const stale = !s.cached_at || (Date.now() - new Date(s.cached_at as any).getTime() > 6 * 60 * 60 * 1000);
    if ((!text || stale) && /^https?:\/\//i.test(s.url)) {
      try {
        const res = await fetch(s.url, { cache: "no-store", headers: { "user-agent": "LeadAutopilot/1.0" } });
        const ct = res.headers.get("content-type") || "";
        const raw = await res.text();
        text = ct.includes("html") ? htmlToText(raw) : raw;
        text = text.slice(0, 2500);
        try { await getPool().query("UPDATE knowledge_sources SET content_cache=?, cached_at=NOW() WHERE id=?", [text, s.id]); } catch {}
      } catch {}
    }
    out.push(`- [${s.title}] ${s.url}${s.notes ? `
  Catatan: ${s.notes}` : ""}${text ? `
  Isi ringkas: ${text.slice(0, 900)}` : ""}`);
  }
  return out.join("\n").slice(0, 5000);
}
