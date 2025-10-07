import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import logo from '../../assets/login-macbook.png';
import { Spinner } from '../ui';

export default function LoginComponent() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.email || !formData.password) {
      setError('Por favor completa todos los campos');
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones');
      toast.error('Debes aceptar los términos y condiciones');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Por favor ingresa un email válido');
      toast.error('Por favor ingresa un email válido');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await login(formData.email, formData.password);
      toast.success('¡Inicio de sesión exitoso!');
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión');
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.email && formData.password && acceptTerms;
  const isButtonDisabled = isSubmitting || !isFormValid;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Columna izquierda */}
        <div className="hidden md:flex flex-col justify-center items-center text-white w-full md:w-1/2 p-10">
          <div className="flex flex-col items-center space-y-3">
            <img src={logo} alt="Logo Suitpress" className="object-contain w-auto h-auto border-none rounded" />
          </div>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-8">
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
            <h1 className="text-3xl font-extrabold mb-6 text-center text-blue-700">Inicia sesión</h1>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2 text-white">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block mb-1 font-medium text-gray-700">Correo electrónico</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 pr-10 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-3 text-sm text-gray-700">
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  id="accept"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-700 focus:ring-2 focus:ring-blue-400 transition-all duration-200 cursor-pointer checked:bg-blue-700 checked:border-blue-700"
                  disabled={isSubmitting}
                />
              </div>
              <label htmlFor="accept" className="select-none leading-5">
                Estoy de acuerdo con las{" "}
                <a
                  href="/politica-privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  políticas de privacidad
                </a>{" "}
                y los{" "}
                <a
                  href="/terminos-uso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  términos de uso
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={isButtonDisabled}
              className={`
                w-full p-3 rounded-lg font-semibold transition shadow flex items-center justify-center space-x-2
                ${isButtonDisabled 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-700 text-white hover:bg-blue-800'
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}