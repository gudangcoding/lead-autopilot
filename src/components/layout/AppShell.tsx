"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const [user, setUser] = useState<any>(null);
  useEffect(()=>{ fetch("/api/auth/me").then(r=>r.json()).then(d=>setUser(d.user||null)).catch(()=>{}); },[]);
  return (
    <div className="min-h-screen">
      <Sidebar user={user} />
      <div className="ml-[280px]">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-6 lg:px-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
            <div className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600">{user?.email || "..."}</div>
          </div>
        </header>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
