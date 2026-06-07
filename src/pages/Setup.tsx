import React from 'react';

const SQL_SCHEMA = `
-- Crea la tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  role text check (role in ('SUPERADMIN', 'EDITOR', 'PENDING')),
  status text default 'pending',
  access_requested boolean default false,
  access_requested_at timestamp with time zone,
  approval_requested boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Asegura que existan las nuevas columnas para el flujo de aprobación si la tabla ya existía
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_requested boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_requested_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_requested boolean DEFAULT false;

-- Habilita RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Crea política para permitir lectura pública o autenticada
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Tabla de Efluentes (Tanques Australianos)
CREATE TABLE IF NOT EXISTS public.effluents_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  tk1_pome_in numeric default 0,
  tk2_oil_recovered numeric default 0,
  tk3_pome_to_biodigester numeric default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.effluents_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all auth users" ON public.effluents_logs;
CREATE POLICY "Enable read access for all auth users" ON public.effluents_logs FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for auth users" ON public.effluents_logs;
CREATE POLICY "Enable insert for auth users" ON public.effluents_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Tabla de Planta de Compostaje
CREATE TABLE IF NOT EXISTS public.compost_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  tridecanter_cake numeric default 0,
  process_sludge numeric default 0,
  fiber numeric default 0,
  boiler_ashes numeric default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.compost_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all auth users" ON public.compost_logs;
CREATE POLICY "Enable read access for all auth users" ON public.compost_logs FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for auth users" ON public.compost_logs;
CREATE POLICY "Enable insert for auth users" ON public.compost_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Tabla de Gestión Ambiental
CREATE TABLE IF NOT EXISTS public.environmental_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  water_consumption_m3 numeric default 0,
  energy_consumption_kwh numeric default 0,
  hazardous_waste_kg numeric default 0,
  solid_waste_kg numeric default 0,
  recyclable_waste_kg numeric default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.environmental_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all auth users" ON public.environmental_logs;
CREATE POLICY "Enable read access for all auth users" ON public.environmental_logs FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable insert for auth users" ON public.environmental_logs;
CREATE POLICY "Enable insert for auth users" ON public.environmental_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Tabla de Zonas Verdes
CREATE TABLE IF NOT EXISTS public.green_areas_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  mowed_area_m2 numeric default 0,
  compost_applied_kg numeric default 0,
  trees_planted integer default 0,
  photo_before text,
  photo_after text,
  notes text,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.green_areas_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all auth users" ON public.green_areas_logs;
CREATE POLICY "Enable read access for all auth users" ON public.green_areas_logs FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable insert for auth users" ON public.green_areas_logs;
CREATE POLICY "Enable insert for auth users" ON public.green_areas_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Tabla de Sostenibilidad Corporativa
CREATE TABLE IF NOT EXISTS public.sustainability_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  training_hours numeric default 0,
  inspections_conducted integer default 0,
  rspo_non_conformities integer default 0,
  social_activities integer default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.sustainability_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all auth users" ON public.sustainability_logs;
CREATE POLICY "Enable read access for all auth users" ON public.sustainability_logs FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable insert for auth users" ON public.sustainability_logs;
CREATE POLICY "Enable insert for auth users" ON public.sustainability_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Configuración de Storage para fotos de Zonas Verdes
INSERT INTO storage.buckets (id, name, public) VALUES ('green_areas_photos', 'green_areas_photos', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (bucket_id = 'green_areas_photos');

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'green_areas_photos' AND auth.role() = 'authenticated');

-- Tabla de Auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  table_name text not null,
  action text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmins read audit logs" ON public.audit_logs;
CREATE POLICY "Superadmins read audit logs" ON public.audit_logs FOR SELECT USING (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'SUPERADMIN')
);

-- Función de trigger
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  INSERT INTO public.audit_logs (table_name, action, record_id, old_data, new_data, actor_id)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE TG_OP
      WHEN 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE TG_OP
      WHEN 'INSERT' THEN null
      ELSE row_to_json(OLD)
    END,
    CASE TG_OP
      WHEN 'DELETE' THEN null
      ELSE row_to_json(NEW)
    END,
    v_actor_id
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparadores
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_effluents_logs ON public.effluents_logs;
CREATE TRIGGER audit_effluents_logs AFTER INSERT OR UPDATE OR DELETE ON public.effluents_logs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_compost_logs ON public.compost_logs;
CREATE TRIGGER audit_compost_logs AFTER INSERT OR UPDATE OR DELETE ON public.compost_logs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_environmental_logs ON public.environmental_logs;
CREATE TRIGGER audit_environmental_logs AFTER INSERT OR UPDATE OR DELETE ON public.environmental_logs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_green_areas_logs ON public.green_areas_logs;
CREATE TRIGGER audit_green_areas_logs AFTER INSERT OR UPDATE OR DELETE ON public.green_areas_logs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_sustainability_logs ON public.sustainability_logs;
CREATE TRIGGER audit_sustainability_logs AFTER INSERT OR UPDATE OR DELETE ON public.sustainability_logs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Configuración de tiempo real (Realtime) para las tablas de logs
-- Esta configuración es crucial para que el dashboard se actualice en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.effluents_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compost_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.environmental_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.green_areas_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sustainability_logs;
`;

export default function Setup() {
  return (
    <div className="space-y-6">
      <div className="bg-white px-4 py-5 border-b border-gray-200 sm:px-6 rounded-lg shadow-sm">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Configuración Base de Datos (Supabase)</h3>
        <p className="mt-1 text-sm text-gray-500">
          Para que el sistema funcione correctamente, debes ejecutar el siguiente código SQL en tu editor de SQL en Supabase.
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
        <pre className="text-gray-100 text-sm">
          <code>{SQL_SCHEMA}</code>
        </pre>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="ml-3 space-y-2">
            <p className="text-sm text-yellow-700">
              Después de ejecutar este script, no olvides crear un usuario en el panel de Authentication de Supabase con tu email <b>wmartinezm360@gmail.com</b> y luego insertarlo en la tabla de <code>profiles</code> con el rol <code>SUPERADMIN</code>.
            </p>
            <p className="text-sm text-yellow-700 font-medium">
              ⚠️ IMPORTANTE: Para que el registro de usuarios funcione sin problemas, ve a tu panel de Supabase: 
              Authentication &gt; Providers &gt; Email y desactiva la opción "Confirm email".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
