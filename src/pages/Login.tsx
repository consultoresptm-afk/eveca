import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Por favor, complete todos los campos.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Sign In Flow
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) {
          setError(signInErr.message || 'Error de autenticación. Verifique sus credenciales.');
        } else {
          navigate('/');
        }
      } else {
        // Sign Up Flow
        if (!name) {
          setError('El nombre completo es obligatorio.');
          setLoading(false);
          return;
        }

        const { error: signUpErr } = await signUp(email, password, name);
        if (signUpErr) {
          setError(signUpErr.message || 'Error al registrar la cuenta.');
        } else {
          setSuccess('¡Registro realizado con éxito! Su cuenta está en estado PENDIENTE. Por favor solicite la aprobación en la pantalla siguiente.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al procesar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 dashboard-bg">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Banner */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-[#11c46e]/10 text-[#11c46e] rounded-full flex items-center justify-center mb-4 border border-[#11c46e]/20">
            <Building className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Eveca</h2>
          <p className="mt-1 text-sm text-slate-400 font-medium">Jefatura de Sostenibilidad y Control de Efluentes</p>
        </div>

        {/* Auth Card */}
        <div className="dash-card p-8 border border-slate-800">
          <div className="mb-6 flex justify-center gap-4 border-b border-slate-800 pb-4">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
              className={`pb-2 text-sm font-semibold transition-all ${
                isLogin ? 'text-[#00c5dc] border-b-2 border-[#00c5dc]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccess('');
              }}
              className={`pb-2 text-sm font-semibold transition-all ${
                !isLogin ? 'text-[#11c46e] border-b-2 border-[#11c46e]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Registrarse como Nuevo
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-[#ff3d60]/10 border border-[#ff3d60]/20 text-[#ff3d60] p-3 rounded-md text-xs flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#ff3d60]" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-[#11c46e]/10 border border-[#11c46e]/20 text-[#11c46e] p-3 rounded-md text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#11c46e]" />
                <span>{success}</span>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Ej, Wilson Martinez"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="usuario@dominio.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-[#0b0f19] font-bold text-sm transition-all focus:outline-none flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40
                ${isLogin ? 'bg-[#00c5dc] hover:bg-[#00c5dc]/90' : 'bg-[#11c46e] hover:bg-[#11c46e]/90'}
              `}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-slate-900"></div>
                  Procesando...
                </>
              ) : isLogin ? (
                'Iniciar Sesión'
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
