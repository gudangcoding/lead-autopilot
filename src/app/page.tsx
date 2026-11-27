"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
export const dynamic = "force-dynamic";
import { Card, CardTitle } from "@/components/ui/Card";
import { Building2, GraduationCap, Send, MessageSquare, Mail, Search } from "lucide-react";

type Lead = { id:number; service_type:string; company_name:string; contact_role?:string; city?:string; whatsapp?:string; email?:string; status:string };
type Svc = { slug:string; name:string; active?:number|boolean };

export default function Page() {
  const [file, setFile] = useState<File|null>(null);
  const [services, setServices] = useState<Svc[]>([]);
  const [service, setService] = useState("");
  const [newSvc, setNewSvc] = useState("");
  const [msg, setMsg] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [wa, setWa] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [l, w, sv] = await Promise.all([fetch("/api/leads").then(r=>r.json()).catch(()=>({leads:[]})), fetch("/api/whatsapp/status").then(r=>r.json()).catch(()=>null), fetch("/api/services").then(r=>r.json()).catch(()=>({services:[]}))]);
    setLeads(l.leads||[]); setWa(w);
    const svcs = (sv.services||[]).filter((x:any)=>x.active!==0 && x.active!==false);
    setServices(svcs); if(!service && svcs[0]) setService(svcs[0].slug);
  }
  useEffect(()=>{ refresh(); }, []);

  async function upload() {
    if (!file) return; setBusy(true); setMsg("");
    const fd = new FormData(); fd.append("file", file); fd.append("service_type", service);
    const j = await fetch("/api/leads/import", { method:"POST", body:fd }).then(r=>r.json());
    setMsg(JSON.stringify(j,null,2)); setBusy(false); refresh();
  }
  async function discover() {
    setBusy(true); setMsg("");
    const j = await fetch("/api/leads/discover", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({service_type:service, limit:10}) }).then(r=>r.json());
    setMsg(JSON.stringify(j,null,2)); setBusy(false); refresh();
  }
  async function runNow() {
    setBusy(true); setMsg("");
    const j = await fetch("/api/run/daily", { method:"POST", headers:{"Content-Type":"application/json","x-cron-secret":""}, body:JSON.stringify({limit:10}) }).then(r=>r.json());
    setMsg(JSON.stringify(j,null,2)); setBusy(false); refresh();
  }

  const sent = leads.filter(l=>String(l.status).startsWith("sent")).length;
  const svcStats = services.slice(0,2).map(s=>({name:s.name, count: leads.filter(l=>l.service_type===s.slug).length}));

  return <AppShell title="Dashboard" subtitle="Otomasi cari lead & kirim outreach harian per jasa">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
      {svcStats.map((s,i)=><Stat key={s.name} icon={i===0?<Building2 className="text-brand-500"/>:<GraduationCap className="text-brand-500"/>} label={s.name} value={s.count} />)}
      <Stat icon={<Send className="text-brand-500"/>} label="Sent/Processed" value={sent} />
      <Stat icon={<MessageSquare className={wa?.ready?"text-success-500":"text-warning-500"}/>} label="WhatsApp" value={wa?.ready?"Ready":"Not Ready"} />
    </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 mb-6">
      <Card className="xl:col-span-2">
        <CardTitle>1. Sumber Lead</CardTitle>
        <p className="text-sm text-gray-500 mt-1 mb-4">Auto-discover via SerpAPI/Google Maps, atau import CSV/XLSX.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Jasa</label>
            <select value={service} onChange={e=>setService(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              {services.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
            <div className="mt-2 flex gap-2"><input value={newSvc} onChange={e=>setNewSvc(e.target.value)} placeholder="Tambah jasa custom..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"/><button onClick={async()=>{if(!newSvc.trim())return; setBusy(true); await fetch('/api/services',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newSvc.trim()})}); setNewSvc(''); await refresh(); setBusy(false);}} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium">Tambah</button></div>
          </div>
          <div className="flex items-end">
            <button disabled={busy} onClick={discover} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"><Search size={16}/>Auto Discover 10</button>
          </div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Atau import CSV/XLSX</label>
          <div className="flex gap-3">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={e=>setFile(e.target.files?.[0]||null)} className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2.5 file:text-sm file:font-medium"/>
            <button disabled={busy||!file} onClick={upload} className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">Import</button>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>2. Outreach Harian</CardTitle>
        <p className="text-sm text-gray-500 mt-1 mb-4">Pilih 10 lead baru per jasa, generate pesan, kirim email & WA.</p>
        <button disabled={busy} onClick={runNow} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"><Send size={16}/>Run Now</button>
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs text-gray-600 space-y-2">
          <div className="flex items-center gap-2"><Mail size={14}/> SMTP: cek di Settings</div>
          <div className="flex items-center gap-2"><MessageSquare size={14}/> Baileys: {wa?.ready?"connected":"not ready"}</div>
          {wa?.qrDataUrl && <div className="pt-2"><img src={wa.qrDataUrl} alt="WA QR" className="w-36 h-36 rounded border bg-white p-1"/><div className="mt-1 text-[11px] text-gray-500">Scan QR di Settings/WA Linked Devices</div></div>}
        </div>
      </Card>
    </div>

    {msg && <Card className="mb-6"><CardTitle>Result</CardTitle><pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-gray-900 p-4 text-xs text-gray-100">{msg}</pre></Card>}

    <Card>
      <div className="flex items-center justify-between mb-4"><CardTitle>Leads Terbaru</CardTitle><span className="text-sm text-gray-500">{leads.length} rows</span></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-left text-gray-500"><th className="py-3 pr-3 font-medium">Company</th><th className="py-3 pr-3 font-medium">Service</th><th className="py-3 pr-3 font-medium">Target</th><th className="py-3 pr-3 font-medium">Contact</th><th className="py-3 font-medium">Status</th></tr></thead>
          <tbody>{leads.slice(0,20).map(l=><tr key={l.id} className="border-b border-gray-50">
            <td className="py-3 pr-3"><div className="font-medium text-gray-900">{l.company_name}</div><div className="text-xs text-gray-500">{l.city||"-"}</div></td>
            <td className="py-3 pr-3 text-gray-600">{services.find(s=>s.slug===l.service_type)?.name || l.service_type}</td>
            <td className="py-3 pr-3 text-gray-600">{l.contact_role||"-"}</td>
            <td className="py-3 pr-3 text-xs text-gray-600">{l.whatsapp||l.email||"-"}</td>
            <td className="py-3"><span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{l.status}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>
  </AppShell>;
}

function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:any}) {
  return <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p></div><div className="rounded-xl bg-brand-50 p-3">{icon}</div></div></Card>;
}
