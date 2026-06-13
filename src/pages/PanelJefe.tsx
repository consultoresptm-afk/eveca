// Ubicar en: src/pages/PanelJefe.tsx
// Panel para visualizar registros de asistencia en tiempo real (miniaturas, hora, tipo y observaciones).
import React, { useEffect, useState } from 'react';
import type { FC } from 'react';
import { getRecordsByDate } from '../lib/asistencia';
import type { AttendanceRecord } from '../lib/asistencia';

export const PanelJefe: FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function load() {
    setLoading(true);
    const data = await getRecordsByDate();
    setRecords(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // Para auditoría en tiempo real podríamos usar polling o websockets.
    const iv = setInterval(() => void load(), 30_000);
    return () => clearInterval(iv);
  }, []);

  function formatTime(iso?: string) {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Panel de Auditoría - Registros del Día</h2>
        <button
          className="bg-indigo-600 text-white px-3 py-2 rounded-md"
          onClick={() => void load()}
          disabled={loading}
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <p>Cargando registros...</p>
      ) : records.length === 0 ? (
        <p>No hay registros para el día.</p>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li key={r.id ?? `${r.cedula}-${r.created_at}`} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {r.photo_url ? (
                  // Thumbnail
                  // Nota: si storage es privado, el URL debe ser generado mediante signed url.
                  <img src={r.photo_url} alt={`Evidencia ${r.cedula}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Sin foto</div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="font-medium">{r.nombre}</div>
                    <div className="text-xs text-gray-500">C.C. {r.cedula} • {r.rol} {r.nombre.includes('MELO MORALES') ? '(Incapacitado)' : ''}</div>
                  </div>
                  <div className="text-sm text-gray-600">{formatTime(r.created_at)}</div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${r.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {r.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                    </span>
                    <span className="ml-3 text-sm text-gray-600">{r.observaciones ?? ''}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PanelJefe;
