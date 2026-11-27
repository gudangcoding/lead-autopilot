export type ServiceType = string;

export interface ServiceDef {
  id?: number;
  slug: string;
  name: string;
  description?: string;
  target_role?: string;
  default_query?: string;
  active?: number | boolean;
}

export interface LeadInput {
  service_type: ServiceType;
  company_name: string;
  contact_role?: string;
  contact_name?: string;
  address?: string;
  city?: string;
  website?: string;
  whatsapp?: string;
  email?: string;
  source?: string;
}
