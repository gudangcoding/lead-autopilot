"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("a@a.com");
  const [password, setPassword] = useState("123");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error || "Login gagal"); return; }
    router.push("/"); router.refresh();
  }

  return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <div className="text-2xl font-semibold text-gray-900">Lead Autopilot</div>
        <p className="text-sm text-gray-500 mt-1">Login untuk mengakses dashboard.</p>
      </div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
      <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm mb-4" />
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm mb-4" />
      {err && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
      <button disabled={busy} className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">{busy?"Memproses...":"Login"}</button>
      <p className="mt-4 text-xs text-gray-500">Demo: <code>a@a.com</code> / <code>123</code> (setelah migrate)</p>
    </form>
  </div>;
}
