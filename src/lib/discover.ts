import type { LeadInput, ServiceType } from "./types";

export interface DiscoverProvider {
  discover(query: string, limit: number, serviceType: ServiceType): Promise<LeadInput[]>;
}

export class SerpApiProvider implements DiscoverProvider {
  constructor(private apiKey: string) {}
  async discover(query: string, limit: number, serviceType: ServiceType): Promise<LeadInput[]> {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_maps");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "search");
    url.searchParams.set("hl", "id");
    url.searchParams.set("gl", "id");
    url.searchParams.set("api_key", this.apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    const results = data.local_results || data.place_results ? [data.place_results] : [];
    const items = (data.local_results || results).slice(0, limit);
    return items.map((r: any) => ({
      service_type: serviceType,
      company_name: String(r.title || "").trim(),
      contact_role: serviceType === "building_management" ? "Pengadaan / GA / Building Management" : "GA / HRD / Training / Purchasing",
      address: r.address || r.address_line || undefined,
      city: extractCity(r.address),
      website: r.website || undefined,
      whatsapp: r.phone || undefined,
      email: undefined,
      source: `serpapi:google_maps:${query}`,
    })).filter((l: LeadInput) => l.company_name);
  }
}

function extractCity(addr?: string) {
  if (!addr) return undefined;
  const parts = String(addr).split(",").map(s => s.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

export function getDiscoverProvider(): DiscoverProvider {
  const key = process.env.SERPAPI_KEY;
  if (key) return new SerpApiProvider(key);
  throw new Error("No discover provider configured. Set SERPAPI_KEY for Google Maps discovery, or import CSV/XLSX.");
}

export async function discoverLeads(serviceType: ServiceType, query: string, limit = 10) {
  const provider = getDiscoverProvider();
  return provider.discover(query, limit, serviceType);
}
