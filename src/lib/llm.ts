import type { LeadInput } from "./types";
import { getAiConfig, getMarketingAiConfig } from "./settings";

export async function generateOutreach(lead: LeadInput) {
  const cfg = await getAiConfig();
  if (!cfg.apiKey) return fallback(lead);
  const prompt = `Buat pesan prospek singkat Bahasa Indonesia.
Jasa: ${lead.service_type === "building_management" ? "aplikasi manajemen gedung/apartemen/P3SRS" : "training Microsoft Office/Excel untuk pabrik/perkantoran"}.
Perusahaan: ${lead.company_name}
Kontak target: ${lead.contact_role || "Pengadaan/GA/HRD"}
Kota: ${lead.city || "-"}
Kembalikan JSON valid: {"subject":"...","email":"...","whatsapp":"..."}. Email 80-140 kata, WA <= 500 karakter, sopan, ada CTA singkat, jangan mengarang fakta.`;
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], temperature: 0.4 }),
  });
  if (!res.ok) return fallback(lead);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
    if (json.email && json.whatsapp) return { subject: json.subject || defaultSubject(lead), email: json.email, whatsapp: json.whatsapp };
  } catch {}
  return fallback(lead);
}

export async function testAiConnection() {
  const cfg = await getAiConfig();
  if (!cfg.apiKey) throw new Error("API key AI belum dikonfigurasi");
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: "Balas JSON: {\"ok\":true}" }], temperature: 0 }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return { ok: true, model: cfg.model, sample: text.slice(0, 300) };
}

function defaultSubject(lead: LeadInput) {
  return lead.service_type === "building_management"
    ? `Solusi Manajemen Gedung untuk ${lead.company_name}`
    : `Training Microsoft Office/Excel untuk ${lead.company_name}`;
}

function fallback(lead: LeadInput) {
  const service = lead.service_type === "building_management" ? "aplikasi manajemen gedung/apartemen" : "training Microsoft Office/Excel";
  const subject = defaultSubject(lead);
  const email = `Yth. Tim ${lead.contact_role || "Pengadaan/GA/HRD"} ${lead.company_name},\n\nPerkenalkan, kami menyediakan ${service} yang dapat membantu operasional harian menjadi lebih rapi dan efisien. Kami ingin menawarkan sesi perkenalan singkat 15-20 menit untuk memahami kebutuhan ${lead.company_name}${lead.city ? ` di ${lead.city}` : ""} dan menyiapkan proposal yang sesuai.\n\nJika berkenan, mohon informasikan waktu yang nyaman untuk kami hubungi lebih lanjut.\n\nHormat kami,\nTim Sales`;
  const whatsapp = `Halo Tim ${lead.contact_role || "Pengadaan/GA/HRD"} ${lead.company_name}, kami menawarkan ${service}. Boleh kami jadwalkan perkenalan singkat 15 menit untuk bahas kebutuhan Anda? Terima kasih.`;
  return { subject, email, whatsapp };
}


export async function generateReply(args: { lead: any; inbound: string; history?: {direction:string;body:string}[] }) {
  const ai = await getAiConfig();
  const m = await getMarketingAiConfig();
  if (!ai.apiKey) return fallbackReply(args.lead, args.inbound);
  const hist = (args.history || []).map((h) => `${h.direction}: ${h.body}`).join("\n").slice(0, 3000);
  const prompt = `Balas pesan masuk prospek.\nPerusahaan: ${args.lead.company_name || "-"}\nJasa: ${args.lead.service_type || "-"}\nKota: ${args.lead.city || "-"}\nRiwayat:\n${hist}\nPesan masuk:\n${args.inbound}\n\nTulis balasan saja dalam Bahasa Indonesia, singkat, sopan, bantu jawab, dan tawarkan langkah lanjut (call/demo/jadwal). Jangan mengarang fakta.`;
  const res = await fetch(`${ai.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ai.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: ai.model, messages: [{ role: "system", content: m.systemPrompt || "Asisten marketing." }, { role: "user", content: prompt }], temperature: 0.4 }),
  });
  if (!res.ok) return fallbackReply(args.lead, args.inbound);
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || fallbackReply(args.lead, args.inbound)).trim();
}

function fallbackReply(lead:any, inbound:string) {
  return `Terima kasih atas pesan Anda${lead?.company_name ? ` dari ${lead.company_name}` : ""}. Kami dapat membantu menjelaskan solusi kami dan menyesuaikan dengan kebutuhan Anda. Boleh kami jadwalkan sesi singkat 15 menit untuk membahas kebutuhan lebih detail? Mohon informasikan waktu yang nyaman.`;
}