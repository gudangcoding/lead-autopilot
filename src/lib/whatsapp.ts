import fs from "fs";
import path from "path";
import { getWaConfig } from "./settings";

const STATUS_PATH = path.join(process.cwd(), "data", "wa-status.json");

export function getWaStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS_PATH, "utf8")); }
  catch { return { ready: false, qr: null, updatedAt: null }; }
}

export async function sendWhatsApp(to: string, text: string) {
  const cfg = await getWaConfig();
  if (cfg.dryRun) return { skipped: true, id: "dry-run" };
  const res = await fetch(`${cfg.workerUrl.replace(/\/$/, "")}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, text }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getWaRuntimeStatus() {
  const cfg = await getWaConfig();
  const local = getWaStatus();
  try {
    const res = await fetch(`${cfg.workerUrl.replace(/\/$/, "")}/status`, { cache: "no-store" });
    if (res.ok) return { ...await res.json(), dryRun: cfg.dryRun, workerUrl: cfg.workerUrl };
  } catch {}
  return { ...local, dryRun: cfg.dryRun, workerUrl: cfg.workerUrl };
}
