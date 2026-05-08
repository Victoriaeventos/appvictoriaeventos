import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Register({ setUser }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'pareja',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, formData);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      toast.success('¡Cuenta creada exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrarse');
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
            <p className="text-gray-600 font-inter">Crea tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-gray-700 font-inter">
                Nombre completo
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1 border-[#E8DCC4] focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                placeholder="Tu nombre"
                data-testid="register-name-input"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-700 font-inter">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-1 border-[#E8DCC4] focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                placeholder="tu@email.com"
                data-testid="register-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 font-inter">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="mt-1 border-[#E8DCC4] focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                placeholder="••••••••"
                data-testid="register-password-input"
              />
            </div>

            <div>
              <Label className="text-gray-700 font-inter mb-3 block">Tipo de cuenta</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pareja" id="pareja" data-testid="register-role-pareja" />
                  <Label htmlFor="pareja" className="font-inter cursor-pointer">
                    Pareja
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="planner" id="planner" data-testid="register-role-planner" />
                  <Label htmlFor="planner" className="font-inter cursor-pointer">
                    Planner
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4AF37] hover:bg-[#C9A961] text-white font-inter font-medium py-6 rounded-lg"
              data-testid="register-submit-button"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 font-inter text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link
                to="/login"
                className="text-[#D4AF37] hover:text-[#C9A961] font-medium"
                data-testid="register-login-link"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
