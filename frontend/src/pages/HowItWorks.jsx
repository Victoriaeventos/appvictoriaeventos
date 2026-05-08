import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CheckCircle2, Calendar, Users, CreditCard, MessageSquare, Image, FileText, BarChart3 } from 'lucide-react';

const steps = [
  {
    title: 'Crea tu evento',
    description: 'Empieza creando un nuevo evento desde el dashboard. Selecciona el tipo (Boda, Comunión, Corporativo) y las fechas clave. Se generarán automáticamente las tareas específicas para tu tipo de evento.',
    icon: Calendar,
    color: 'text-[#D4AF37]',
    bg: 'bg-[#D4AF37]/10',
  },
  {
    title: 'Gestiona las tareas',
    description: 'Cada evento tiene un checklist automático organizado por meses. Marca las tareas como completadas, añade notas y sigue el progreso en el timeline visual.',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    title: 'Controla el presupuesto',
    description: 'Añade partidas al presupuesto con estimaciones. Registra pagos parciales y controla cuánto queda pendiente de cada proveedor y concepto.',
    icon: CreditCard,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Organiza proveedores',
    description: 'Usa la lista de proveedores sugeridos o añade los tuyos. Registra precios, pagos a cuenta, estado de reserva y datos de contacto.',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'Comunícate con tu cliente',
    description: 'El módulo de Notas permite enviar mensajes entre planificador y pareja. Comparte notas por WhatsApp o Email directamente desde la app.',
    icon: MessageSquare,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    title: 'Inspírate con IA',
    description: 'Genera imágenes de inspiración con inteligencia artificial. Describe la decoración que imaginas y obtén visualizaciones al instante.',
    icon: Image,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
  {
    title: 'Sube archivos',
    description: 'Comparte documentos importantes: proyectos de decoración, presupuestos en PDF, fotos de referencia en JPG o PNG. Todo organizado por evento.',
    icon: FileText,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  {
    title: 'Sigue el progreso',
    description: 'El dashboard te muestra estadísticas en tiempo real: cuenta atrás, tareas pendientes, pagos próximos y recordatorios automáticos. El resumen semanal te dice qué está hecho y qué falta.',
    icon: BarChart3,
    color: 'text-[#D4AF37]',
    bg: 'bg-[#D4AF37]/10',
  },
];

export default function HowItWorks({ user }) {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] via-white to-[#F5F1E8]">
      {/* Header */}
      <div className="bg-white shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="text-[#D4AF37]"
              data-testid="how-it-works-back-btn"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img 
              src="/logo-victoria.png" 
              alt="Victoria Eventos" 
              className="h-16 object-contain"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-playfair font-bold text-[#D4AF37]">
                Cómo Funciona
              </h1>
              <p className="text-gray-600 font-inter mt-1">
                Guía paso a paso para organizar tu evento perfecto
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === activeStep ? 'bg-[#D4AF37] w-8' : idx < activeStep ? 'bg-[#D4AF37]/40' : 'bg-gray-300'
              }`}
              data-testid={`step-indicator-${idx}`}
            />
          ))}
        </div>

        {/* Active step card */}
        <Card className="border-[#E8DCC4] shadow-elegant mb-8" data-testid="active-step-card">
          <CardContent className="p-8 text-center">
            {(() => {
              const step = steps[activeStep];
              const Icon = step.icon;
              return (
                <>
                  <div className={`w-16 h-16 rounded-full ${step.bg} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`h-8 w-8 ${step.color}`} />
                  </div>
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Paso {activeStep + 1} de {steps.length}</p>
                  <h2 className="text-2xl font-playfair font-bold text-gray-800 mb-4">{step.title}</h2>
                  <p className="text-gray-600 max-w-lg mx-auto leading-relaxed">{step.description}</p>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="border-[#D4AF37] text-[#D4AF37]"
            data-testid="prev-step-btn"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>
          {activeStep < steps.length - 1 ? (
            <Button
              onClick={() => setActiveStep(activeStep + 1)}
              className="bg-[#D4AF37] hover:bg-[#C9A961]"
              data-testid="next-step-btn"
            >
              Siguiente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="bg-[#D4AF37] hover:bg-[#C9A961]"
              data-testid="start-btn"
            >
              Empezar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* All steps grid */}
        <div className="mt-12">
          <h3 className="text-lg font-playfair font-bold text-gray-800 mb-4 text-center">Todos los pasos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-lg border text-center transition-all hover:shadow-md ${
                    idx === activeStep ? 'border-[#D4AF37] bg-[#FAFAF5] shadow-md' : 'border-[#E8DCC4] bg-white'
                  }`}
                  data-testid={`step-card-${idx}`}
                >
                  <Icon className={`h-6 w-6 ${step.color} mx-auto mb-2`} />
                  <p className="text-xs font-medium text-gray-700">{step.title}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
