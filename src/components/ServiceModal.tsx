"use client";
import { useEffect, useState } from "react";

type Svc = { slug?: string; name?: string; description?: string; target_role?: string; default_query?: string };
type K = { id?: number; service_slug?: string|null; title: string; url: string; notes?: string };

export function ServiceModal({ open, onClose, onSaved, initial }: { open: boolean; onClose: () => void; onSaved: () => void; initial?: Svc | null }) {
  const [f, setF] = useState<Svc>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [knowledge, setKnowledge] = useState<K[]>([]);
  const [kForm, setKForm] = useState<K>({ title: "", url: "", notes: "" });
  const [kBusy, setKBusy] = useState(false);
  const slug = f.slug?.trim();

  async function loadKnowledge(serviceSlug?: string) {
    if (!serviceSlug) { setKnowledge([]); return; }
    const j = await fetch(`/api/knowledge?service_slug=${encodeURIComponent(serviceSlug)}`).then(r=>r.json()).catch(()=>({knowledge:[]}));
    const rows = (j.knowledge || []).filter((k:any)=>k.service_slug===serviceSlug);
    setKnowledge(rows);
  }

  useEffect(() => {
    if (open) {
      const next = { slug: initial?.slug || "", name: initial?.name || "", description: initial?.description || "", target_role: initial?.target_role || "", default_query: initial?.default_query || "" };
      setF(next); setErr(""); setKForm({ title:"", url:"", notes:"" });
      loadKnowledge(next.slug || undefined);
    }
  }, [open, initial]);

  if (!open) return null;

  async function saveService() {
    if (!f.name?.trim()) { setErr("Nama jasa wajib"); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || "Gagal menyimpan"); return; }
    const savedSlug = j.service?.slug || f.slug;
    setF(prev => ({ ...prev, slug: savedSlug }));
    onSaved();
    await loadKnowledge(savedSlug);
  }

  async function addKnowledge() {
    if (!slug) return setErr("Simpan jasa dulu sebelum menambah sumber pengetahuan");
    if (!kForm.title.trim() || !kForm.url.trim()) return setErr("Judul dan URL sumber wajib");
    setKBusy(true); setErr("");
    const r = await fetch("/api/knowledge", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ ...kForm, service_slug: slug }) });
    const j = await r.json().catch(()=>({}));
    setKBusy(false);
    if (!r.ok) return setErr(j.error || "Gagal menyimpan sumber");
    setKForm({ title:"", url:"", notes:"" });
    await loadKnowledge(slug);
  }

  async function delKnowledge(id?: number) {
    if (!id) return;
    await fetch(`/api/knowledge?id=${id}`, { method:"DELETE" });
    await loadKnowledge(slug);
  }

  const I = (p: any) => <input {...p} className={"w-full rounded-lg border border-gray-300 px-3 py-2 text-sm " + (p.className || "")} />;
  const L = ({ c }: { c: string }) => <label className="block text-sm font-medium text-gray-700 mb-1">{c}</label>;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="text-lg font-semibold text-gray-900 mb-4">{slug ? "Edit Jasa" : "Tambah Jasa"}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><L c="Nama jasa" /><I value={f.name||""} onChange={(e:any)=>setF({...f,name:e.target.value})} placeholder="Contoh: Cleaning Service" /></div>
        <div><L c="Target role" /><I value={f.target_role||""} onChange={(e:any)=>setF({...f,target_role:e.target.value})} placeholder="Purchasing / GA / HRD" /></div>
        <div className="md:col-span-2"><L c="Default query discover" /><I value={f.default_query||""} onChange={(e:any)=>setF({...f,default_query:e.target.value})} placeholder="kata kunci Google Maps" /></div>
        <div className="md:col-span-2"><L c="Deskripsi" /><textarea value={f.description||""} onChange={(e:any)=>setF({...f,description:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px]" /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">Tutup</button>
        <button disabled={busy} onClick={saveService} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy?"Menyimpan...":"Simpan Jasa"}</button>
      </div>

      <div className="mt-6 border-t pt-5">
        <div className="text-sm font-semibold text-gray-900">Sumber Pengetahuan AI</div>
        <p className="text-xs text-gray-500 mt-1">Sumber ini khusus untuk jasa ini. Bisa website, demo, Google Docs/Drive publik, atau catatan.</p>
        {!slug ? <div className="mt-3 text-sm text-gray-500">Simpan jasa dulu untuk menambah sumber pengetahuan.</div> : <>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><L c="Judul" /><I value={kForm.title} onChange={(e:any)=>setKForm({...kForm,title:e.target.value})} placeholder="Website / Demo / Dokumen" /></div>
            <div><L c="URL" /><I value={kForm.url} onChange={(e:any)=>setKForm({...kForm,url:e.target.value})} placeholder="https://..." /></div>
            <div className="md:col-span-2"><L c="Catatan" /><textarea value={kForm.notes||""} onChange={(e:any)=>setKForm({...kForm,notes:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[70px]" /></div>
          </div>
          <div className="mt-3"><button disabled={kBusy} onClick={addKnowledge} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">{kBusy?"Menyimpan...":"Tambah Sumber"}</button></div>
          <div className="mt-3 space-y-2">{knowledge.map(k=><div key={k.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm"><div><div className="font-medium text-gray-900">{k.title}</div><a href={k.url} target="_blank" rel="noreferrer" className="text-brand-600 break-all">{k.url}</a>{k.notes && <div className="text-xs text-gray-500 mt-1">{k.notes}</div>}</div><button onClick={()=>delKnowledge(k.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">Hapus</button></div>)}{!knowledge.length && <div className="text-sm text-gray-500">Belum ada sumber untuk jasa ini.</div>}</div>
        </>}
      </div>
      {err && <div className="mt-4 text-sm text-red-600">{err}</div>}
    </div>
  </div>;
}
