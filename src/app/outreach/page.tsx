"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";

type Svc={slug:string;name:string};
export default function OutreachPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ q:"", channel:"", status:"", service_type:"" });
  const [services,setServices]=useState<Svc[]>([]);

  async function load() {
    const qs = new URLSearchParams(Object.entries(f).filter(([,v])=>v) as any).toString();
    const [l, r] = await Promise.all([
      fetch(`/api/logs?${qs}`).then(r=>r.json()).catch(e=>({error:String(e)})),
      fetch("/api/runs").then(r=>r.json()).catch(()=>({runs:[]}))
    ]);
    setLogs(l.logs||[]); setRuns(r.runs||[]); setErr(l.error||"");
  }
  useEffect(()=>{ load(); fetch("/api/services").then(r=>r.json()).then(d=>setServices(d.services||[])).catch(()=>{}); },[]);

  const I = (p:any)=> <input {...p} className={"rounded-lg border border-gray-300 px-3 py-2 text-sm "+(p.className||"")} />;
  const S = (p:any)=> <select {...p} className={"rounded-lg border border-gray-300 px-3 py-2 text-sm "+(p.className||"")} />;

  return <AppShell title="Outreach" subtitle="Riwayat pengiriman email & WhatsApp, hasil run harian">
    <Card className="mb-6">
      <CardTitle>Daily Runs</CardTitle>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100 text-left text-gray-500">
          <th className="py-2 pr-3">Tanggal</th><th className="py-2 pr-3">Service</th><th className="py-2 pr-3">Selected</th><th className="py-2 pr-3">Email</th><th className="py-2 pr-3">WA</th><th className="py-2 pr-3">Status</th><th className="py-2">Error</th>
        </tr></thead><tbody>
          {runs.map(r=><tr key={r.id} className="border-b border-gray-50"><td className="py-2 pr-3">{String(r.run_date).slice(0,10)}</td><td className="py-2 pr-3">{r.service_type}</td><td className="py-2 pr-3">{r.selected_count}</td><td className="py-2 pr-3">{r.email_sent}</td><td className="py-2 pr-3">{r.wa_sent}</td><td className="py-2 pr-3">{r.status}</td><td className="py-2 text-xs text-red-600">{r.error||""}</td></tr>)}
          {!runs.length && <tr><td className="py-3 text-gray-500" colSpan={7}>Belum ada run.</td></tr>}
        </tbody></table>
      </div>
    </Card>

    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CardTitle>Outreach Logs</CardTitle>
        <div className="flex-1"/>
        <I placeholder="Cari company/email/wa/kota" value={f.q} onChange={(e:any)=>setF({...f,q:e.target.value})} className="w-64"/>
        <S value={f.channel} onChange={(e:any)=>setF({...f,channel:e.target.value})}><option value="">All Channel</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></S>
        <S value={f.status} onChange={(e:any)=>setF({...f,status:e.target.value})}><option value="">All Status</option><option value="sent">sent</option><option value="failed">failed</option><option value="skipped">skipped</option></S>
        <S value={f.service_type} onChange={(e:any)=>setF({...f,service_type:e.target.value})}><option value="">All Service</option>{services.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}</S>
        <button onClick={load} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">Filter</button>
      </div>
      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100 text-left text-gray-500">
          <th className="py-2 pr-3">Waktu</th><th className="py-2 pr-3">Company</th><th className="py-2 pr-3">Service</th><th className="py-2 pr-3">Channel</th><th className="py-2 pr-3">Target</th><th className="py-2 pr-3">Status</th><th className="py-2">Detail</th>
        </tr></thead><tbody>
          {logs.map(l=><tr key={l.id} className="border-b border-gray-50 align-top">
            <td className="py-2 pr-3 text-xs text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString("id-ID")}</td>
            <td className="py-2 pr-3"><div className="font-medium text-gray-900">{l.company_name||"-"}</div><div className="text-xs text-gray-500">{l.city||""}</div></td>
            <td className="py-2 pr-3 text-xs">{l.service_type||"-"}</td>
            <td className="py-2 pr-3">{l.channel}</td>
            <td className="py-2 pr-3 text-xs">{l.channel==="email"?l.email:l.whatsapp}</td>
            <td className="py-2 pr-3"><span className={`rounded-full px-2.5 py-1 text-xs ${l.status==="sent"?"bg-green-50 text-green-700":l.status==="failed"?"bg-red-50 text-red-700":"bg-gray-100 text-gray-700"}`}>{l.status}</span></td>
            <td className="py-2 text-xs text-gray-600 max-w-md whitespace-pre-wrap break-all">{l.error || l.provider_message_id || ""}</td>
          </tr>)}
          {!logs.length && <tr><td className="py-3 text-gray-500" colSpan={7}>Belum ada log. Jalankan Run Now / scheduler.</td></tr>}
        </tbody></table>
      </div>
    </Card>
  </AppShell>;
}
