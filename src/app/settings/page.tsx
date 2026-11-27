"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";

type Smtp = { host:string; port:number; secure:boolean; user:string; pass:string; from:string; hasPass?:boolean };
type Ai = { baseUrl:string; apiKey:string; model:string; hasApiKey?:boolean };
type Wa = { dryRun:boolean; dailyLimit:number; workerUrl:string; messageDelayMs:number };
type Imap = { host:string; port:number; secure:boolean; user:string; pass:string; mailbox:string; pollIntervalSec:number; enabled:boolean; hasPass?:boolean };
type MAI = { autoReplyEmail:boolean; autoReplyWa:boolean; followupHours:number; maxRepliesPerLead:number; systemPrompt:string };
type User = { email:string; name:string };

export default function SettingsPage() {
  const [smtp,setSmtp]=useState<Smtp>({host:"",port:587,secure:false,user:"",pass:"",from:""});
  const [ai,setAi]=useState<Ai>({baseUrl:"https://api.hcnsec.cn/v1",apiKey:"",model:"DeepSeek-V4-Pro"});
  const [wa,setWa]=useState<Wa>({dryRun:true,dailyLimit:10,workerUrl:"http://127.0.0.1:3011",messageDelayMs:3000});
  const [imap,setImap]=useState<Imap>({host:"",port:993,secure:true,user:"",pass:"",mailbox:"INBOX",pollIntervalSec:60,enabled:false});
  const [mai,setMai]=useState<MAI>({autoReplyEmail:false,autoReplyWa:false,followupHours:48,maxRepliesPerLead:5,systemPrompt:""});
  const [user,setUser]=useState<User>({email:"",name:""});
  const [pw,setPw]=useState({currentPassword:"",newPassword:""});
  const [msg,setMsg]=useState(""); const [busy,setBusy]=useState("");
  const [waStatus,setWaStatus]=useState<any>(null);

  async function load(){
    const [s,u]=await Promise.all([fetch("/api/settings").then(r=>r.json()), fetch("/api/auth/me").then(r=>r.json()).catch(()=>({}))]);
    if(s.smtp) setSmtp(s.smtp); if(s.ai) setAi(s.ai); if(s.wa_blast) setWa(s.wa_blast); if(s.imap) setImap(s.imap); if(s.marketing_ai) setMai(s.marketing_ai);
    if(u.user) setUser(u.user);
  }
  useEffect(()=>{ load(); fetch("/api/settings/test-wa").then(r=>r.json()).then(setWaStatus).catch(()=>{}); },[]);

  async function save(key:string, body:any){ setBusy(key); setMsg(""); const r=await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key,...body})}); const j=await r.json(); setBusy(""); setMsg(r.ok?`${key} tersimpan`: (j.error||"gagal")); if(r.ok) load(); }
  async function test(path:string, body?:any){ setBusy(path); setMsg(""); const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined}); const j=await r.json(); setBusy(""); setMsg(JSON.stringify(j)); }
  async function saveProfile(){ setBusy("profile"); setMsg(""); const r=await fetch("/api/auth/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(user)}); const j=await r.json(); setBusy(""); setMsg(r.ok?"Profil diperbarui":(j.error||"gagal")); }
  async function savePassword(){ setBusy("password"); setMsg(""); const r=await fetch("/api/auth/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(pw)}); const j=await r.json(); setBusy(""); setMsg(r.ok?"Password diperbarui":(j.error||"gagal")); if(r.ok) setPw({currentPassword:"",newPassword:""}); }

  const I = (p:any)=> <input {...p} className={"w-full rounded-lg border border-gray-300 px-3 py-2 text-sm "+(p.className||"")} />;
  const L = ({c}:{c:string})=> <label className="block text-sm font-medium text-gray-700 mb-1">{c}</label>;
  const B = ({onClick,children,kind="primary",disabled}:any)=> <button disabled={disabled||!!busy} onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${kind==="ghost"?"bg-gray-100 text-gray-800":"bg-brand-500 text-white hover:bg-brand-600"}`}>{busy? "..." : children}</button>;

  return <AppShell title="Settings" subtitle="Gateway email, AI provider, WhatsApp blast, dan profil">
    {msg && <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700 whitespace-pre-wrap break-all">{msg}</div>}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card>
        <CardTitle>Email Gateway (SMTP)</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2"><L c="SMTP Host"/><I value={smtp.host} onChange={(e:any)=>setSmtp({...smtp,host:e.target.value})}/></div>
          <div><L c="Port"/><I type="number" value={smtp.port} onChange={(e:any)=>setSmtp({...smtp,port:Number(e.target.value)})}/></div>
          <div className="flex items-end gap-2 pb-2"><input type="checkbox" checked={smtp.secure} onChange={(e:any)=>setSmtp({...smtp,secure:e.target.checked})}/><span className="text-sm text-gray-700">Secure/TLS</span></div>
          <div><L c="User"/><I value={smtp.user} onChange={(e:any)=>setSmtp({...smtp,user:e.target.value})}/></div>
          <div><L c="Password"/><I type="password" value={smtp.pass} onChange={(e:any)=>setSmtp({...smtp,pass:e.target.value})} placeholder={smtp.hasPass?"(tersimpan)":""}/></div>
          <div className="col-span-2"><L c="From"/><I value={smtp.from} onChange={(e:any)=>setSmtp({...smtp,from:e.target.value})} placeholder="Nama <email@domain.com>"/></div>
        </div>
        <div className="mt-4 flex gap-2"><B onClick={()=>save("smtp",smtp)}>Simpan SMTP</B><B kind="ghost" onClick={()=>test("/api/settings/test-smtp",{to:user.email})}>Test SMTP</B></div>
      </Card>

      <Card>
        <CardTitle>AI Provider (HCNSEC/OpenAI-compatible)</CardTitle>
        <div className="mt-4 space-y-3">
          <div><L c="Base URL"/><I value={ai.baseUrl} onChange={(e:any)=>setAi({...ai,baseUrl:e.target.value})}/></div>
          <div><L c="API Key"/><I type="password" value={ai.apiKey} onChange={(e:any)=>setAi({...ai,apiKey:e.target.value})} placeholder={ai.hasApiKey?"(tersimpan)":""}/></div>
          <div><L c="Model"/><I value={ai.model} onChange={(e:any)=>setAi({...ai,model:e.target.value})}/></div>
        </div>
        <div className="mt-4 flex gap-2"><B onClick={()=>save("ai",ai)}>Simpan AI</B><B kind="ghost" onClick={()=>test("/api/settings/test-ai")}>Test AI</B></div>
      </Card>

      <Card>
        <CardTitle>WhatsApp Blast (Baileys)</CardTitle>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={wa.dryRun} onChange={(e:any)=>setWa({...wa,dryRun:e.target.checked})}/> Dry Run (tidak kirim WA nyata)</label>
          <div><L c="Daily Limit / service"/><I type="number" value={wa.dailyLimit} onChange={(e:any)=>setWa({...wa,dailyLimit:Number(e.target.value)})}/></div>
          <div><L c="Worker URL"/><I value={wa.workerUrl} onChange={(e:any)=>setWa({...wa,workerUrl:e.target.value})}/></div>
          <div><L c="Delay antar pesan (ms)"/><I type="number" value={wa.messageDelayMs} onChange={(e:any)=>setWa({...wa,messageDelayMs:Number(e.target.value)})}/></div>
        </div>
        <div className="mt-4 flex gap-2"><B onClick={()=>save("wa_blast",wa)}>Simpan WA</B><B kind="ghost" onClick={async()=>{setBusy("wa"); const j=await fetch("/api/settings/test-wa").then(r=>r.json()); setWaStatus(j); setBusy(""); setMsg(j.ready?"WA ready":j.qr?"QR diterima, scan di bawah":"Status WA diperbarui");}}>Cek Status / QR</B></div>
        {waStatus && <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-medium text-gray-900">Status: {waStatus.ready ? "Connected" : "Not Ready"} {waStatus.dryRun ? "(dry-run)" : ""}</div>
          {waStatus.qrDataUrl ? <div className="mt-3"><img src={waStatus.qrDataUrl} alt="WA QR" className="rounded-lg border border-gray-200 bg-white p-2 w-[280px] h-[280px]"/><p className="mt-2 text-xs text-gray-500">Scan dari WhatsApp &gt; Linked Devices. QR refresh otomatis oleh worker.</p></div> : <p className="mt-2 text-xs text-gray-500">{waStatus.ready?"WhatsApp sudah terhubung.":"QR belum tersedia. Pastikan `lead-wa-worker` jalan di PM2/lokal."}</p>}
        </div>}
        <p className="mt-3 text-xs text-gray-500">Worker: <code>npm run worker:wa</code> / PM2 <code>lead-wa-worker</code>.</p>
      </Card>

      <Card>
        <CardTitle>Email Masuk (IMAP)</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2"><L c="IMAP Host"/><I value={imap.host} onChange={(e:any)=>setImap({...imap,host:e.target.value})} placeholder="imap.gmail.com"/></div>
          <div><L c="Port"/><I type="number" value={imap.port} onChange={(e:any)=>setImap({...imap,port:Number(e.target.value)})}/></div>
          <label className="flex items-end gap-2 pb-2 text-sm text-gray-700"><input type="checkbox" checked={imap.secure} onChange={(e:any)=>setImap({...imap,secure:e.target.checked})}/> Secure</label>
          <div><L c="User"/><I value={imap.user} onChange={(e:any)=>setImap({...imap,user:e.target.value})}/></div>
          <div><L c="Password/App Password"/><I type="password" value={imap.pass} onChange={(e:any)=>setImap({...imap,pass:e.target.value})} placeholder={imap.hasPass?"(tersimpan)":""}/></div>
          <div><L c="Mailbox"/><I value={imap.mailbox} onChange={(e:any)=>setImap({...imap,mailbox:e.target.value})}/></div>
          <div><L c="Poll interval (detik)"/><I type="number" value={imap.pollIntervalSec} onChange={(e:any)=>setImap({...imap,pollIntervalSec:Number(e.target.value)})}/></div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={imap.enabled} onChange={(e:any)=>setImap({...imap,enabled:e.target.checked})}/> Aktifkan baca email masuk</label>
        </div>
        <div className="mt-4 flex gap-2"><B onClick={()=>save("imap",imap)}>Simpan IMAP</B></div>
        <p className="mt-3 text-xs text-gray-500">Worker <code>npm run worker:imap</code> membaca unseen email dan memicu auto-reply AI jika aktif.</p>
      </Card>

      <Card>
        <CardTitle>Marketing AI Auto Reply</CardTitle>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={mai.autoReplyEmail} onChange={(e:any)=>setMai({...mai,autoReplyEmail:e.target.checked})}/> Auto reply email masuk</label>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={mai.autoReplyWa} onChange={(e:any)=>setMai({...mai,autoReplyWa:e.target.checked})}/> Auto reply WhatsApp masuk</label>
          <div><L c="Follow-up hours"/><I type="number" value={mai.followupHours} onChange={(e:any)=>setMai({...mai,followupHours:Number(e.target.value)})}/></div>
          <div><L c="Max replies/lead"/><I type="number" value={mai.maxRepliesPerLead} onChange={(e:any)=>setMai({...mai,maxRepliesPerLead:Number(e.target.value)})}/></div>
          <div><L c="System prompt"/><textarea value={mai.systemPrompt} onChange={(e:any)=>setMai({...mai,systemPrompt:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[96px]"/></div>
        </div>
        <div className="mt-4"><B onClick={()=>save("marketing_ai",mai)}>Simpan Marketing AI</B></div>
      </Card>

      <Card>
        <CardTitle>Profil &amp; Password</CardTitle>
        <div className="mt-4 space-y-3">
          <div><L c="Nama"/><I value={user.name} onChange={(e:any)=>setUser({...user,name:e.target.value})}/></div>
          <div><L c="Email"/><I value={user.email} onChange={(e:any)=>setUser({...user,email:e.target.value})}/></div>
          <div><B onClick={saveProfile}>Simpan Profil</B></div>
          <hr className="border-gray-100"/>
          <div><L c="Password saat ini"/><I type="password" value={pw.currentPassword} onChange={(e:any)=>setPw({...pw,currentPassword:e.target.value})}/></div>
          <div><L c="Password baru"/><I type="password" value={pw.newPassword} onChange={(e:any)=>setPw({...pw,newPassword:e.target.value})}/></div>
          <div><B onClick={savePassword}>Update Password</B></div>
        </div>
      </Card>
    </div>
  </AppShell>;
}
