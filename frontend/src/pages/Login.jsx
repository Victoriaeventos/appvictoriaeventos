import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      toast.success('¡Bienvenido/a!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] via-white to-[#F5F1E8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-elegant p-8 fade-in">
          <div className="text-center mb-8">
            <img 
              src="/logo-victoria.png" 
              alt="Victoria Eventos" 
              className="h-48 mx-auto mb-4 object-contain"
            />
            <p className="text-gray-600 font-inter">Inicia sesión en tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-gray-700 font-inter">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 border-[#E8DCC4] focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                placeholder="tu@email.com"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 font-inter">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 border-[#E8DCC4] focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                placeholder="••••••••"
                data-testid="login-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4AF37] hover:bg-[#C9A961] text-white font-inter font-medium py-6 rounded-lg transition-all duration-200"
              data-testid="login-submit-button"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 font-inter text-sm">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="text-[#D4AF37] hover:text-[#C9A961] font-medium"
                data-testid="login-register-link"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
