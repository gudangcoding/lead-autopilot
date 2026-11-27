"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";

type Svc={slug:string;name:string};
export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [f, setF] = useState({ q:"", service_type:"", status:"" });
  const [services,setServices]=useState<Svc[]>([]);
  async function load() {
    const r = await fetch("/api/leads").then(r=>r.json()).catch(()=>({leads:[]}));
    setLeads(r.leads||[]);
  }
  useEffect(()=>{ load(); fetch("/api/services").then(r=>r.json()).then(d=>setServices(d.services||[])).catch(()=>{}); },[]);
  const filtered = leads.filter(l => {
    if (f.service_type && l.service_type !== f.service_type) return false;
    if (f.status && l.status !== f.status) return false;
    if (f.q) {
      const q=f.q.toLowerCase();
      const hay=[l.company_name,l.city,l.email,l.whatsapp,l.contact_role,l.source].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const I = (p:any)=> <input {...p} className={"rounded-lg border border-gray-300 px-3 py-2 text-sm "+(p.className||"")} />;
  const S = (p:any)=> <select {...p} className={"rounded-lg border border-gray-300 px-3 py-2 text-sm "+(p.className||"")} />;
  return <AppShell title="Leads" subtitle="Filter dan pantau status lead hasil import/discover">
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CardTitle>Lead Database</CardTitle><span className="text-sm text-gray-500">{filtered.length}/{leads.length}</span>
        <div className="flex-1"/>
        <I placeholder="Cari company/kota/kontak..." value={f.q} onChange={(e:any)=>setF({...f,q:e.target.value})} className="w-64"/>
        <S value={f.service_type} onChange={(e:any)=>setF({...f,service_type:e.target.value})}><option value="">All Service</option>{services.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}</S>
        <S value={f.status} onChange={(e:any)=>setF({...f,status:e.target.value})}><option value="">All Status</option><option value="new">new</option><option value="sent_email">sent_email</option><option value="sent_wa">sent_wa</option><option value="sent_both">sent_both</option><option value="failed">failed</option><option value="do_not_contact">do_not_contact</option></S>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100 text-left text-gray-500">
          <th className="py-3 pr-3">Company</th><th className="py-3 pr-3">Service</th><th className="py-3 pr-3">Role</th><th className="py-3 pr-3">City</th><th className="py-3 pr-3">WA</th><th className="py-3 pr-3">Email</th><th className="py-3 pr-3">Status</th><th className="py-3">Last Contact</th>
        </tr></thead><tbody>
          {filtered.map(l=><tr key={l.id} className="border-b border-gray-50">
            <td className="py-3 pr-3"><div className="font-medium text-gray-900">{l.company_name}</div><div className="text-xs text-gray-500">{l.source||""}</div></td>
            <td className="py-3 pr-3 text-xs">{l.service_type}</td><td className="py-3 pr-3 text-xs">{l.contact_role||"-"}</td><td className="py-3 pr-3">{l.city||"-"}</td>
            <td className="py-3 pr-3 text-xs">{l.whatsapp||"-"}</td><td className="py-3 pr-3 text-xs">{l.email||"-"}</td>
            <td className="py-3 pr-3"><span className={`rounded-full px-2.5 py-1 text-xs ${String(l.status).startsWith("sent")?"bg-green-50 text-green-700":l.status==="failed"?"bg-red-50 text-red-700":"bg-gray-100 text-gray-700"}`}>{l.status}</span></td>
            <td className="py-3 text-xs text-gray-500">{l.last_contacted_at?new Date(l.last_contacted_at).toLocaleString("id-ID"):"-"}</td>
          </tr>)}
          {!filtered.length && <tr><td className="py-4 text-gray-500" colSpan={8}>Tidak ada data.</td></tr>}
        </tbody></table>
      </div>
    </Card>
  </AppShell>;
}
