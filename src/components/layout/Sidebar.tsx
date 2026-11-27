"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Send, Settings, Bot, LogOut, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user?: { name?: string; email?: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-gray-200 bg-white">
      <div className="flex h-20 items-center gap-3 border-b border-gray-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white"><Bot size={20} /></div>
        <div>
          <div className="text-lg font-semibold text-gray-900">Lead Autopilot</div>
          <div className="text-xs text-gray-500">Marketing Automation</div>
        </div>
      </div>
      <nav className="p-4">
        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">Menu</p>
        <div className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition", active ? "bg-brand-50 text-brand-600" : "text-gray-700 hover:bg-gray-100")}>
                <Icon size={18} className={active ? "text-brand-500" : "text-gray-500"} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="absolute bottom-0 w-full border-t border-gray-100 p-4 space-y-3">
        <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
          <div className="font-medium text-gray-700 truncate">{user?.name || user?.email || "User"}</div>
          <div className="truncate">{user?.email || ""}</div>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"><LogOut size={16}/>Logout</button>
      </div>
    </aside>
  );
}
