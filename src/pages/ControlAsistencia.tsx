// Ubicar en: src/pages/ControlAsistencia.tsx
// Componente React para registrar entrada/salida con evidencia (foto) y observaciones.
import React, { useState } from 'react';
import type { FC } from 'react';
import { uploadEvidence, saveAttendanceRecord, AttendanceType } from '../lib/asistencia';

type Employee = {
  cedula: string;
  nombre: string;
  rol: string;
  incapacitado?: boolean;
};

const EMPLOYEES: { group: string; members: Employee[] }[] = [
  {
    group: 'SUPERVISOR / LÍDER AMBIENTAL',
    members: [
      { nombre: 'JUAN CARLOS FONSECA CHAPARRO', cedula: '1116614314', rol: 'SUPERVISOR' },
    ],
  },
  {
    group: 'OPERARIOS ACTIVOS',
    members: [
      { nombre: 'CORONADO HERNANDEZ OSCAR HIPOLITO', cedula: '86077078', rol: 'OPERARIO' },
      { nombre: 'BARRERA MACEA CARLOS ANDRES', cedula: '1122627039', rol: 'OPERARIO' },
      { nombre: 'RAMIREZ JEAN CARLOS', cedula: '7167017', rol: 'OPERARIO' },
    ],
  },
  {
    group: 'OPERARIO',
    members: [
      { nombre: 'MELO MORALES CARLOS SNEIDER', cedula: '1000221607', rol: 'OPERARIO', incapacitado: true },
    ],
  },
];

export const ControlAsistencia: FC = () => {
  const [selectedCedula, setSelectedCedula] = useState<string>(EMPLOYEES[0].members[0].cedula);
  const [file, setFile] = useState<File | null>(null);
  const [observaciones, setObservaciones] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  function findEmployee(cedula: string): Employee | undefined {
    for (const g of EMPLOYEES) {
      const found = g.members.find((m) => m.cedula === cedula);
      if (found) return found;
    }
    return undefined;
  }

  async function handleSubmit(tipo: AttendanceType) {
    setMessage(null);
    const emp = findEmployee(selectedCedula);
    if (!emp) {
      setMessage('Empleado no seleccionado');
      return;
    }
    if (!file) {
      setMessage('Por favor capture una foto como evidencia');
      return;
    }
    setLoading(true);
    try {
      const photoUrl = await uploadEvidence(emp.cedula, file);
      const record = {
        cedula: emp.cedula,
        nombre: emp.nombre,
        rol: emp.rol,
        tipo,
        observaciones,
        photo_url: photoUrl,
      };
      const saved = await saveAttendanceRecord(record);
      if (saved) {
        setMessage('Registro guardado correctamente');
        setFile(null);
        setObservaciones('');
      } else {
        setMessage('Error al guardar el registro');
      }
    } catch (err) {
      console.error('handleSubmit error', err);
      setMessage('Error inesperado al procesar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-3">Control de Asistencia - Respaldo Manual</h2>

      <label className="block text-sm font-medium text-gray-700">Empleado</label>
      <select
        className="w-full mt-1 mb-3 p-2 border rounded-lg"
        value={selectedCedula}
        onChange={(e) => setSelectedCedula(e.target.value)}
      >
        {EMPLOYEES.map((grp) => (
          <optgroup key={grp.group} label={grp.group}>
            {grp.members.map((m) => (
              <option key={m.cedula} value={m.cedula}>
                {m.nombre} — {m.cedula} {m.incapacitado ? '(Incapacitado)' : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <label className="block text-sm font-medium text-gray-700">Evidencia (foto)</label>
      <input
        className="w-full mt-1 mb-3"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) setFile(f);
        }}
      />

      <label className="block text-sm font-medium text-gray-700">Observaciones</label>
      <textarea
        className="w-full mt-1 p-2 border rounded-lg mb-3"
        rows={3}
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        placeholder="Ej: Falla de biométrico institucional"
      />

      <div className="flex gap-2">
        <button
          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          onClick={() => handleSubmit('entrada')}
          disabled={loading}
        >
          Registrar Entrada
        </button>
        <button
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          onClick={() => handleSubmit('salida')}
          disabled={loading}
        >
          Registrar Salida
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}

      <p className="mt-4 text-xs text-gray-500">Nota: Este módulo actúa como respaldo cuando el sistema biométrico falla.</p>
    </div>
  );
};

export default ControlAsistencia;
