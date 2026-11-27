export type ServiceType = "building_management" | "office_training";

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
