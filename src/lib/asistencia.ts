// Ubicar en: src/lib/asistencia.ts
// Funciones de persistencia y tipos para el módulo de Control de Asistencia.
import { supabase } from './supabase';

export type AttendanceType = 'entrada' | 'salida';

export interface AttendanceRecord {
  id?: string;
  cedula: string;
  nombre: string;
  rol: string;
  tipo: AttendanceType;
  observaciones?: string;
  photo_url?: string | null;
  created_at?: string; // ISO
}

/** Sube la evidencia (foto) al storage de Supabase y devuelve la URL pública o null en fallo. */
export async function uploadEvidence(cedula: string, file: File): Promise<string | null> {
  try {
    if (!file) return null;
    const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${cedula}_${Date.now()}.${ext}`;

    // Intentamos subir a Supabase Storage en un bucket llamado 'asistencia'.
    // Si no existe o no hay credenciales, capturamos el error y devolvemos null.
    if (typeof supabase === 'undefined' || !supabase) {
      // Fallback en entorno sin Supabase (p.ej. desarrollo local).
      return URL.createObjectURL(file);
    }

    const { data, error } = await supabase.storage.from('asistencia').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

    if (error) {
      console.warn('uploadEvidence supabase error', error.message);
      // Fallback temporal a URL local del blob
      return URL.createObjectURL(file);
    }

    // Obtener URL pública
    const { data: publicData } = supabase.storage.from('asistencia').getPublicUrl(data.path);
    return publicData?.publicUrl ?? null;
  } catch (err) {
    console.error('uploadEvidence error', err);
    return null;
  }
}

/** Inserta un registro de asistencia en la tabla `attendance`. */
export async function saveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord | null> {
  try {
    if (typeof supabase === 'undefined' || !supabase) {
      console.info('saveAttendanceRecord - simulación', record);
      return { ...record, id: `${Date.now()}`, created_at: new Date().toISOString() };
    }

    const { data, error } = await supabase.from<AttendanceRecord>('attendance').insert(record).select().single();
    if (error) {
      console.warn('saveAttendanceRecord supabase error', error.message);
      return null;
    }
    return data ?? null;
  } catch (err) {
    console.error('saveAttendanceRecord error', err);
    return null;
  }
}

/** Recupera los registros de una fecha (ISO YYYY-MM-DD) o del día actual si no se pasa fecha. */
export async function getRecordsByDate(dateISO?: string): Promise<AttendanceRecord[]> {
  try {
    // Construir rango de fechas en ISO para filtrar por created_at.
    // Usar objetos Date con zona local y luego convertir a ISO para
    // obtener el rango UTC correcto asociado al día local seleccionado.
    const base = dateISO
      ? // dateISO esperado en formato YYYY-MM-DD o ISO; descomponemos para evitar diferencias de parsing
        (() => {
          const parts = dateISO.split('T')[0].split('-').map((p) => parseInt(p, 10));
          if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
            const [y, m, d] = parts;
            return new Date(y, m - 1, d);
          }
          return new Date(dateISO);
        })()
      : new Date();

    const yyyy = base.getFullYear();
    const mm = base.getMonth(); // 0-based
    const dd = base.getDate();
    const startDate = new Date(yyyy, mm, dd, 0, 0, 0, 0);
    const endDate = new Date(yyyy, mm, dd, 23, 59, 59, 999);
    const start = startDate.toISOString();
    const end = endDate.toISOString();

    if (typeof supabase === 'undefined' || !supabase) {
      // En simulación retornamos vacío
      return [];
    }

    const { data, error } = await supabase
      .from<AttendanceRecord>('attendance')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getRecordsByDate supabase error', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('getRecordsByDate error', err);
    return [];
  }
}
