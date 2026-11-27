"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";

export default function InboxPage() {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ q:"", channel:"", direction:"" });
  async function load() {
    const r = await fetch("/api/inbox").then(r=>r.json()).catch(e=>({error:String(e)}));
    if (r.error) setErr(r.error); setMsgs(r.messages||[]);
  }
  useEffect(()=>{ load(); const t=setInterval(load, 15000); return ()=>clearInterval(t); },[]);
  const filtered = msgs.filter(m => {
    if (f.channel && m.channel !== f.channel) return false;
    if (f.direction && m.direction !== f.direction) return false;
    if (f.q) { const q=f.q.toLowerCase(); if (![m.company_name,m.from_addr,m.to_addr,m.subject,m.body].join(" ").toLowerCase().includes(q)) return false; }
    return true;
  });
  const I = (p:any)=> <input {...p} className={"rounded-lg border border-gray-300 px-3 py-2 text-sm "+(p.className||"")} />;
  const S = (p:any)=> <select {...p} className={"rounded-lg border border-gray-300 px-3 py-2 text-sm "+(p.className||"")} />;
  return <AppShell title="Inbox" subtitle="Email & WhatsApp masuk/keluar, balasan AI marketing">
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CardTitle>Inbox Messages</CardTitle><span className="text-sm text-gray-500">{filtered.length}/{msgs.length}</span>
        <div className="flex-1"/>
        <I placeholder="Cari pesan/lead..." value={f.q} onChange={(e:any)=>setF({...f,q:e.target.value})} className="w-56"/>
        <S value={f.channel} onChange={(e:any)=>setF({...f,channel:e.target.value})}><option value="">All Channel</option><option value="email">email</option><option value="whatsapp">whatsapp</option></S>
        <S value={f.direction} onChange={(e:any)=>setF({...f,direction:e.target.value})}><option value="">All Direction</option><option value="inbound">inbound</option><option value="outbound">outbound</option></S>
        <button onClick={load} className="rounded-lg bg-gray-100 px-3 py-2 text-sm">Refresh</button>
      </div>
      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100 text-left text-gray-500">
          <th className="py-3 pr-3">Waktu</th><th className="py-3 pr-3">Channel</th><th className="py-3 pr-3">Arah</th><th className="py-3 pr-3">Lead/From</th><th className="py-3 pr-3">Isi</th><th className="py-3">Status</th>
        </tr></thead><tbody>
          {filtered.map(m=><tr key={m.id} className="border-b border-gray-50 align-top">
            <td className="py-3 pr-3 text-xs text-gray-500 whitespace-nowrap">{new Date(m.created_at).toLocaleString("id-ID")}</td>
            <td className="py-3 pr-3">{m.channel}</td>
            <td className="py-3 pr-3"><span className={`rounded-full px-2 py-0.5 text-xs ${m.direction==="inbound"?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-700"}`}>{m.direction}</span></td>
            <td className="py-3 pr-3"><div className="font-medium text-gray-900">{m.company_name||m.from_addr||"-"}</div><div className="text-xs text-gray-500">{m.from_addr||""}{m.to_addr?` → ${m.to_addr}`:""}</div></td>
            <td className="py-3 pr-3 max-w-xl"><div className="text-xs text-gray-500">{m.subject||""}</div><div className="whitespace-pre-wrap text-gray-700">{String(m.body||"").slice(0,400)}</div></td>
            <td className="py-3"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">{m.status}</span></td>
          </tr>)}
          {!filtered.length && <tr><td className="py-4 text-gray-500" colSpan={6}>Belum ada pesan.</td></tr>}
        </tbody></table>
      </div>
    </Card>
  </AppShell>;
}
