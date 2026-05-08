import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Calendar, LogOut, ArrowRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CoupleDashboard({ user, setUser }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (error) {
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] via-white to-[#F5F1E8]">
      {/* Header */}
      <div className="bg-white shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="/logo-victoria.png" 
                alt="Victoria Eventos" 
                className="h-20 object-contain"
              />
              <div>
                <h1 className="text-2xl font-playfair font-bold text-[#D4AF37]">
                  Victoria Eventos
                </h1>
                <p className="text-gray-600 font-inter mt-1">
                  Bienvenido/a, {user.name}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
              data-testid="couple-logout-button"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-playfair font-bold text-gray-800 mb-8">
          Mi Celebración
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-gray-600 mb-2">
                Aún no tienes eventos asignados
              </p>
              <p className="text-sm text-gray-500">
                Contacta con tu planner para que te asigne a tu evento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="couple-events-list">
            {events.map((event) => (
              <Card
                key={event.id}
                className="card-hover cursor-pointer border-[#E8DCC4] hover:border-[#D4AF37]"
                onClick={() => navigate(`/event/${event.id}`)}
                data-testid={`couple-event-card-${event.id}`}
              >
                <CardHeader>
                  <CardTitle className="font-playfair text-xl text-[#D4AF37]">
                    {event.title}
                  </CardTitle>
                  <CardDescription className="font-inter flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.date).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">
                      {event.event_type}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#D4AF37] hover:text-[#C9A961]"
                    >
                      Ver detalles
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
