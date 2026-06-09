import { useState, useEffect } from 'react';
import { supabase, testDatabaseConnection } from '../lib/supabase';
import { Database, CheckCircle, XCircle, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

export default function Setup() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'failed'>('testing');
  const [errorMessage, setErrorMessage] = useState('');
  const [verifiedTables, setVerifiedTables] = useState<Record<string, boolean>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const sqlSchema = `-- 1. TABLA DE PERFILES (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  role text default 'PENDING',
  status text default 'pending',
  access_requested boolean default false,
  access_requested_at timestamp with time zone,
  approval_requested boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Asegurar columnas si ya existía la tabla
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_requested boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_requested_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_requested boolean DEFAULT false;

-- Eliminar restricciones de verificación antiguas si existen para evitar violaciones de check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Creación de función SECURITY DEFINER para verificar si es súper administrador sin causar recursión RLS
CREATE OR REPLACE FUNCTION public.is_superadmin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'SUPERADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para profiles
DROP POLICY IF EXISTS "Permitir lectura para todos los autenticados" ON public.profiles;
CREATE POLICY "Permitir lectura para todos los autenticados" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios pueden insertar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden insertar su propio perfil" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Permitir actualizaciones para súper administradores" ON public.profiles;
CREATE POLICY "Permitir actualizaciones para súper administradores" ON public.profiles
  FOR UPDATE TO authenticated USING (
    auth.email() = 'wmartinezm360@gmail.com' OR
    auth.jwt() ->> 'email' = 'wmartinezm360@gmail.com' OR
    public.is_superadmin(auth.uid())
  ) WITH CHECK (
    auth.email() = 'wmartinezm360@gmail.com' OR
    auth.jwt() ->> 'email' = 'wmartinezm360@gmail.com' OR
    public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Permitir eliminación para súper administradores" ON public.profiles;
CREATE POLICY "Permitir eliminación para súper administradores" ON public.profiles
  FOR DELETE TO authenticated USING (
    auth.email() = 'wmartinezm360@gmail.com' OR
    auth.jwt() ->> 'email' = 'wmartinezm360@gmail.com' OR
    public.is_superadmin(auth.uid())
  );

-- Función para crear perfil automáticamente al registrar usuario en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, status, approval_requested, access_requested_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE WHEN new.email = 'wmartinezm360@gmail.com' THEN 'SUPERADMIN' ELSE 'PENDING' END,
    CASE WHEN new.email = 'wmartinezm360@gmail.com' THEN 'approved' ELSE 'pending' END,
    FALSE,
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger asociado a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar/Backfill cualquier usuario que ya esté registrado en de auth.users y no tenga perfil aún
INSERT INTO public.profiles (id, email, name, role, status, approval_requested, access_requested_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  CASE WHEN email = 'wmartinezm360@gmail.com' THEN 'SUPERADMIN' ELSE 'PENDING' END,
  CASE WHEN email = 'wmartinezm360@gmail.com' THEN 'approved' ELSE 'pending' END,
  FALSE,
  NULL
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. TABLA DE EFLUENTES (effluents_logs)
CREATE TABLE IF NOT EXISTS public.effluents_logs (
  id uuid default gen_random_uuid() primary key,
  date timestamp with time zone default now() not null,
  tank text not null, -- 'TK1', 'TK2', 'TK3', 'TK4'
  oil_level numeric,
  recovered_oil numeric,
  ph numeric,
  comments text,
  attached_doc_url text,
  attached_doc_name text,
  pome_input numeric,
  sent_to_biodigester boolean default false,
  biodigester_destination text,
  pome_to_biodigester numeric,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

-- Asegurar columnas si ya existía la tabla
ALTER TABLE public.effluents_logs ADD COLUMN IF NOT EXISTS pome_input numeric;
ALTER TABLE public.effluents_logs ADD COLUMN IF NOT EXISTS sent_to_biodigester boolean DEFAULT false;
ALTER TABLE public.effluents_logs ADD COLUMN IF NOT EXISTS biodigester_destination text;
ALTER TABLE public.effluents_logs ADD COLUMN IF NOT EXISTS pome_to_biodigester numeric;

ALTER TABLE public.effluents_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a autenticados en effluents" ON public.effluents_logs;
CREATE POLICY "Permitir todo a autenticados en effluents" ON public.effluents_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. TABLA DE COMPOSTAJE (compost_logs)
CREATE TABLE IF NOT EXISTS public.compost_logs (
  id uuid default gen_random_uuid() primary key,
  date timestamp with time zone default now() not null,
  raw_material_in numeric,
  temperature numeric,
  humidity numeric,
  turned boolean default false,
  comments text,
  attached_doc_url text,
  attached_doc_name text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

ALTER TABLE public.compost_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a autenticados en compost" ON public.compost_logs;
CREATE POLICY "Permitir todo a autenticados en compost" ON public.compost_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. TABLA DE ÁREAS VERDES (green_areas_logs)
CREATE TABLE IF NOT EXISTS public.green_areas_logs (
  id uuid default gen_random_uuid() primary key,
  date timestamp with time zone default now() not null,
  area_name text not null,
  maintenance_type text not null,
  gardener_company text,
  observations text,
  attached_doc_url text,
  attached_doc_name text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

ALTER TABLE public.green_areas_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a autenticados en green_areas" ON public.green_areas_logs;
CREATE POLICY "Permitir todo a autenticados en green_areas" ON public.green_areas_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. TABLA DE INDICADORES / METAS DE SOSTENIBILIDAD (sustainability_indicators)
CREATE TABLE IF NOT EXISTS public.sustainability_indicators (
  id uuid default gen_random_uuid() primary key,
  month text not null, -- 'YYYY-MM'
  water_consumption numeric,
  energy_consumption numeric,
  organic_waste numeric,
  hazardous_waste numeric,
  recyclable_waste numeric,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

-- Asegurar columnas si ya existía la tabla
ALTER TABLE public.sustainability_indicators ADD COLUMN IF NOT EXISTS organic_waste numeric;
ALTER TABLE public.sustainability_indicators ADD COLUMN IF NOT EXISTS hazardous_waste numeric;
ALTER TABLE public.sustainability_indicators ADD COLUMN IF NOT EXISTS recyclable_waste numeric;

ALTER TABLE public.sustainability_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a autenticados en sustainability_indicators" ON public.sustainability_indicators;
CREATE POLICY "Permitir todo a autenticados en sustainability_indicators" ON public.sustainability_indicators
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. HABILITAR TIEMPO REAL (REALTIME)
-- Ejecute las siguientes líneas en Supabase SQL Editor para ver las actualizaciones en tiempo real en el Dashboard:
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.effluents_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compost_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.green_areas_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sustainability_indicators;`;

  useEffect(() => {
    runDatabaseTests();
  }, []);

  const runDatabaseTests = async () => {
    setIsVerifying(true);
    const result = await testDatabaseConnection();
    if (result.success) {
      setConnectionStatus('success');
      setErrorMessage('');
    } else {
      setConnectionStatus('failed');
      setErrorMessage(result.error || 'No se pudo conectar a la base de datos.');
    }

    // Attempt to probe each table by doing a count select query to verify if it exists
    const tablesToTest = ['profiles', 'effluents_logs', 'compost_logs', 'green_areas_logs', 'sustainability_indicators'];
    const tempVerified: Record<string, boolean> = {};

    for (const table of tablesToTest) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        // If it throws an error that table doesn't exist, we know it's false.
        // Usually, code 'PGRST116' is table not found, or missing schema.
        if (error) {
          // If the error message mentions "does not exist" or code is "42P01"
          if (error.code === '42P01') {
            tempVerified[table] = false;
          } else {
            // Any other error (e.g. auth issue or generic) might mean table exists but RLS/empty
            tempVerified[table] = true;
          }
        } else {
          tempVerified[table] = true;
        }
      } catch (err) {
        tempVerified[table] = false;
      }
    }

    setVerifiedTables(tempVerified);
    setIsVerifying(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-slate-100">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-[#00c5dc]/10 text-[#00c5dc] rounded-lg">
          <Database className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Estado y Configuración de Base de Datos</h1>
          <p className="text-slate-400">Verifique la salud, cree las tablas de Supabase y asegure la integridad de los datos de Eveca S.A.S.</p>
        </div>
      </div>

      {/* Grid columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="dash-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 font-semibold mb-2">Conexión Supabase</h3>
            <div className="flex items-center gap-2 mt-4">
              {connectionStatus === 'testing' && (
                <>
                  <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                  <span className="text-amber-500 font-medium">Probando Conexión...</span>
                </>
              )}
              {connectionStatus === 'success' && (
                <>
                  <CheckCircle className="w-6 h-6 text-[#11c46e]" />
                  <span className="text-[#11c46e] font-medium">¡Conectado con éxito!</span>
                </>
              )}
              {connectionStatus === 'failed' && (
                <>
                  <XCircle className="w-6 h-6 text-[#ff3d60]" />
                  <span className="text-[#ff3d60] font-medium">Error de Configuración</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={runDatabaseTests}
            className="mt-6 flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-xs font-semibold rounded"
          >
            <RefreshCw className="w-4 h-4" /> Re-verificar
          </button>
        </div>

        <div className="dash-card p-6 flex flex-col justify-between md:col-span-2">
          <div>
            <h3 className="text-slate-400 font-semibold mb-4">Verificación de Tablas Físicas</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(verifiedTables).map(([tableName, exists]) => (
                <div key={tableName} className="flex items-center gap-2 bg-[#1a2234] border border-slate-700 px-3 py-2 rounded-lg text-sm">
                  {isVerifying ? (
                    <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
                  ) : exists ? (
                    <CheckCircle className="w-4 h-4 text-[#11c46e]" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#ff3d60]" />
                  )}
                  <span className="font-mono text-xs">{tableName}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Si alguna tabla aparece en rojo, por favor ejecute el script SQL provisto abajo en su consola de Supabase.</span>
          </div>
        </div>
      </div>

      {connectionStatus === 'failed' && (
        <div className="bg-[#ff3d60]/10 border border-[#ff3d60]/20 text-[#ff3d60] p-4 rounded-lg mb-8 text-sm">
          <p className="font-bold flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" /> Detalles del Error de Conexión:
          </p>
          <code className="block bg-black/40 p-2 rounded mt-1 font-mono text-xs">{errorMessage}</code>
          <p className="mt-3">Asegúrese de haber configurado <code className="bg-black/20 p-1 rounded font-mono">VITE_SUPABASE_URL</code> y <code className="bg-black/20 p-1 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> correctamente.</p>
        </div>
      )}

      {/* Script Section */}
      <div className="dash-card p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Script de Inicialización de Base de Datos (SQL)</h2>
            <p className="text-slate-400 text-sm">Ejecute este comando en el editor de SQL en el dashboard de Supabase para estructurar toda la base de datos.</p>
          </div>
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 bg-[#00c5dc] hover:bg-[#00c5dc]/90 text-slate-950 font-bold px-4 py-2 rounded transition-all text-sm active:scale-95"
          >
            {copiedQuery ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedQuery ? '¡Copiado!' : 'Copiar Script'}
          </button>
        </div>

        <div className="relative">
          <pre className="bg-[#070a13] border border-slate-800 rounded-lg p-4 overflow-x-auto text-[#00ffc4] font-mono text-xs max-h-[400px] scrollbar-thin">
            {sqlSchema}
          </pre>
        </div>
      </div>
    </div>
  );
}
