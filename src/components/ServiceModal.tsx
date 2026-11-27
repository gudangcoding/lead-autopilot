"use client";
import { useEffect, useState } from "react";

type Svc = { slug?: string; name?: string; description?: string; target_role?: string; default_query?: string };

export function ServiceModal({ open, onClose, onSaved, initial }: { open: boolean; onClose: () => void; onSaved: () => void; initial?: Svc | null }) {
  const [f, setF] = useState<Svc>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) { setF({ slug: initial?.slug || "", name: initial?.name || "", description: initial?.description || "", target_role: initial?.target_role || "", default_query: initial?.default_query || "" }); setErr(""); }
  }, [open, initial]);
  if (!open) return null;
  async function save() {
    if (!f.name?.trim()) { setErr("Nama jasa wajib"); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || "Gagal menyimpan"); return; }
    onSaved(); onClose();
  }
  const I = (p: any) => <input {...p} className={"w-full rounded-lg border border-gray-300 px-3 py-2 text-sm " + (p.className || "")} />;
  const L = ({ c }: { c: string }) => <label className="block text-sm font-medium text-gray-700 mb-1">{c}</label>;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
      <div className="text-lg font-semibold text-gray-900 mb-4">{initial?.slug ? "Edit Jasa" : "Tambah Jasa"}</div>
      <div className="space-y-3">
        <div><L c="Nama jasa" /><I value={f.name||""} onChange={(e:any)=>setF({...f,name:e.target.value})} placeholder="Contoh: Cleaning Service" /></div>
        <div><L c="Target role" /><I value={f.target_role||""} onChange={(e:any)=>setF({...f,target_role:e.target.value})} placeholder="Purchasing / GA / HRD" /></div>
        <div><L c="Default query discover" /><I value={f.default_query||""} onChange={(e:any)=>setF({...f,default_query:e.target.value})} placeholder="kata kunci Google Maps" /></div>
        <div><L c="Deskripsi" /><textarea value={f.description||""} onChange={(e:any)=>setF({...f,description:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px]" /></div>
        {err && <div className="text-sm text-red-600">{err}</div>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">Batal</button>
        <button disabled={busy} onClick={save} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy?"Menyimpan...":"Simpan"}</button>
      </div>
    </div>
  </div>;
}
