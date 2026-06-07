export type Role = 'SUPERADMIN' | 'EDITOR' | 'PENDING';

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  name: string;
  created_at?: string;
}

export interface EffluentLog {
  id: string;
  date: string;
  tk1_pome_in: number;
  tk2_oil_recovered: number;
  tk3_pome_to_biodigester: number;
  notes: string;
  created_by: string;
  created_at?: string;
  profiles?: { name: string };
}

export interface CompostLog {
  id: string;
  date: string;
  tridecanter_cake: number;
  process_sludge: number;
  fiber: number;
  boiler_ashes: number;
  notes: string;
  created_by: string;
  created_at?: string;
  profiles?: { name: string };
}

export interface EnvironmentalLog {
  id: string;
  date: string;
  water_consumption_m3: number;
  energy_consumption_kwh: number;
  hazardous_waste_kg: number;
  solid_waste_kg: number;
  recyclable_waste_kg: number;
  notes: string;
  created_by: string;
  created_at?: string;
  profiles?: { name: string };
}

export interface GreenAreaLog {
  id: string;
  date: string;
  mowed_area_m2: number;
  compost_applied_kg: number;
  trees_planted: number;
  notes: string;
  created_by: string;
  created_at?: string;
  profiles?: { name: string };
}

export interface SustainabilityLog {
  id: string;
  date: string;
  training_hours: number;
  inspections_conducted: number;
  rspo_non_conformities: number;
  social_activities: number;
  notes: string;
  created_by: string;
  created_at?: string;
  profiles?: { name: string };
}
