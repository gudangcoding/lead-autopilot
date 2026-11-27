import { getPool } from "./db";
import type { ServiceDef } from "./types";

const DEFAULTS: ServiceDef[] = [
  { slug:"building_management", name:"Building Management / P3SRS", description:"Aplikasi manajemen gedung/apartemen/P3SRS/PPPSRS", target_role:"Pengadaan / Bendahara / GA", default_query:"pengelola gedung apartemen P3SRS Jakarta", active:1 },
  { slug:"office_training", name:"Training MS Office/Excel", description:"Training Microsoft Office/Excel untuk pabrik/perkantoran", target_role:"GA / HRD / Training / Purchasing", default_query:"pabrik kawasan industri MM2100 Cikarang Bekasi", active:1 },
];

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "service";
}

export async function listServices(): Promise<ServiceDef[]> {
  try {
    const pool = getPool();
    const [rows]: any = await pool.query("SELECT slug,name,description,target_role,default_query,active FROM services ORDER BY id ASC");
    if (rows.length) return rows;
  } catch {}
  return DEFAULTS;
}

export async function upsertService(input: Partial<ServiceDef> & { name: string }) {
  const pool = getPool();
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  await pool.query(
    "INSERT INTO services (slug,name,description,target_role,default_query,active) VALUES (?,?,?,?,?,1) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),target_role=VALUES(target_role),default_query=VALUES(default_query),active=1",
    [slug, input.name, input.description||null, input.target_role||null, input.default_query||null]
  );
  return { slug };
}
