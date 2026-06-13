export type Role = 'SUPERADMIN' | 'EDITOR' | 'PENDING';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  approval_requested: boolean;
  access_requested_at: string | null;
  created_at?: string;
}

export interface EffluentLog {
  id?: string;
  date: string;
  tank: string;
  oil_level?: number;
  recovered_oil?: number;
  ph?: number;
  comments?: string;
  attached_doc_url?: string;
  attached_doc_name?: string;
  created_by?: string;
  created_at?: string;
  pome_input?: number;
  sent_to_biodigester?: boolean;
  biodigester_destination?: string;
  pome_to_biodigester?: number;
}

export interface CompostLog {
  id?: string;
  date: string;
  raw_material_in: number;
  temperature: number;
  humidity: number;
  turned: boolean;
  comments?: string;
  attached_doc_url?: string;
  attached_doc_name?: string;
  created_by?: string;
  created_at?: string;
}

export interface GreenAreaLog {
  id?: string;
  date: string;
  area_name: string;
  maintenance_type: string;
  gardener_company?: string;
  observations?: string;
  attached_doc_url?: string;
  attached_doc_name?: string;
  created_by?: string;
  created_at?: string;
}

export interface SustainabilityIndicator {
  id?: string;
  month: string;
  water_consumption: number;
  energy_consumption: number;
  organic_waste?: number;
  hazardous_waste?: number;
  recyclable_waste?: number;
  ordinary_waste?: number;
  created_by?: string;
  created_at?: string;
}
