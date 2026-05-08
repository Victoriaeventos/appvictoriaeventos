import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Circle, Edit, Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const API = `${API_BASE}/api`;

export const OverviewModule = ({ event, editMode, setEditMode, editedEvent, setEditedEvent, handleUpdateEvent, stats, fetchEventData, eventId, tasks = [] }) => {
  const [recalcDialogOpen, setRecalcDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const prevDatesRef = useRef({ date: event?.date, contract_date: event?.contract_date });

  const handleSave = async () => {
    const datesChanged = (
      prevDatesRef.current.date !== editedEvent.date ||
      prevDatesRef.current.contract_date !== editedEvent.contract_date
    );

    await handleUpdateEvent();
    prevDatesRef.current = { date: editedEvent.date, contract_date: editedEvent.contract_date };

    if (datesChanged) {
      setRecalcDialogOpen(true);
    }
  };

  const handleRecalculate = async () => {
    try {
      const eid = eventId || event?.id;
      const res = await axios.post(`${API}/events/${eid}/recalculate-dates`);
      toast.success(res.data.message);
      setRecalcDialogOpen(false);
      if (fetchEventData) fetchEventData();
    } catch (error) {
      toast.error('Error al recalcular fechas');
    }
  };

  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      const eid = eventId || event?.id;
      const res = await axios.post(`${API}/events/${eid}/generate-tasks`);
      toast.success(res.data.message);
      if (fetchEventData) fetchEventData();
    } catch (error) {
      toast.error('Error al generar tareas');
    } finally {
      setGenerating(false);
    }
  };

  const hasAnyService = event && (
    event.service_asesoria || event.service_coordinacion || event.service_decoracion ||
    event.service_proveedores || event.service_carteleria
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-playfair font-bold text-[#D4AF37]">Resumen del Evento</h3>
        <div className="flex items-center gap-2">
          {hasAnyService && (
            <Button
              onClick={handleGenerateTasks}
              variant="outline"
              size="sm"
              className="border-[#D4AF37] text-[#D4AF37]"
              disabled={generating}
              data-testid="overview-generate-tasks-btn"
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {generating ? 'Generando...' : 'Generar tareas'}
            </Button>
          )}
          <Button
            onClick={() => {
              if (editMode) {
                handleSave();
              } else {
                setEditMode(true);
              }
            }}
            variant={editMode ? "default" : "outline"}
            className={editMode ? "bg-[#D4AF37] hover:bg-[#C9A961]" : ""}
            data-testid="overview-edit-btn"
          >
            <Edit className="mr-2 h-4 w-4" />
            {editMode ? 'Guardar Cambios' : 'Editar Información'}
          </Button>
        </div>
      </div>

      {/* Recalculate dates dialog */}
      <Dialog open={recalcDialogOpen} onOpenChange={setRecalcDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="recalc-dialog">
          <DialogHeader>
            <DialogTitle className="font-playfair flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-[#D4AF37]" /> Fechas actualizadas
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Las fechas del evento han cambiado. ¿Deseas recalcular las fechas límite de las tareas automáticas?
          </p>
          <p className="text-xs text-gray-400">Solo se modificarán las tareas generadas automáticamente. Las tareas manuales no se verán afectadas.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRecalcDialogOpen(false)} data-testid="recalc-cancel">No, mantener</Button>
            <Button className="bg-[#D4AF37] hover:bg-[#C9A961]" onClick={handleRecalculate} data-testid="recalc-confirm">
              <RotateCcw className="mr-1 h-4 w-4" /> Sí, recalcular
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-playfair">Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Fecha de Contratación</Label>
              {editMode ? (
                <Input
                  type="date"
                  value={editedEvent.contract_date || ''}
                  onChange={(e) => setEditedEvent({...editedEvent, contract_date: e.target.value})}
                  data-testid="contract-date-input"
                />
              ) : (
                <p className="text-gray-700">
                  {event?.contract_date ? new Date(event.contract_date).toLocaleDateString('es-ES') : 'No especificado'}
                </p>
              )}
            </div>
            <div>
              <Label>Fecha del Evento</Label>
              {editMode ? (
                <Input
                  type="date"
                  value={editedEvent.date || ''}
                  onChange={(e) => setEditedEvent({...editedEvent, date: e.target.value})}
                  data-testid="event-date-input"
                />
              ) : (
                <p className="text-gray-700">
                  {event?.date ? new Date(event.date).toLocaleDateString('es-ES') : 'No especificado'}
                </p>
              )}
            </div>
            <div>
              <Label>Tipo de Ceremonia</Label>
              {editMode ? (
                <Select
                  value={editedEvent.ceremony_type || 'civil'}
                  onValueChange={(v) => setEditedEvent({...editedEvent, ceremony_type: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">Civil</SelectItem>
                    <SelectItem value="religiosa">Religiosa</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-gray-700 capitalize">{event?.ceremony_type || 'Civil'}</p>
              )}
            </div>
            <div>
              <Label>Lugar del Evento</Label>
              {editMode ? (
                <Input
                  value={editedEvent.location || ''}
                  onChange={(e) => setEditedEvent({...editedEvent, location: e.target.value})}
                  placeholder="Ej: Finca El Jardín, Madrid"
                />
              ) : (
                <p className="text-gray-700">{event?.location || 'No especificado'}</p>
              )}
            </div>
            <div>
              <Label>Teléfono</Label>
              {editMode ? (
                <Input
                  value={editedEvent.client_phone || ''}
                  onChange={(e) => setEditedEvent({...editedEvent, client_phone: e.target.value})}
                  placeholder="+34 600 000 000"
                />
              ) : (
                <p className="text-gray-700">{event?.client_phone || 'No especificado'}</p>
              )}
            </div>
            <div>
              <Label>Email</Label>
              {editMode ? (
                <Input
                  type="email"
                  value={editedEvent.client_email || ''}
                  onChange={(e) => setEditedEvent({...editedEvent, client_email: e.target.value})}
                  placeholder="cliente@email.com"
                />
              ) : (
                <p className="text-gray-700">{event?.client_email || 'No especificado'}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Label className="text-base font-semibold mb-3 block">Servicios Contratados</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'service_asesoria', label: 'Asesoría personalizada' },
                { key: 'service_coordinacion', label: 'Coordinación del evento' },
                { key: 'service_decoracion', label: 'Proyecto de decoración' },
                { key: 'service_decoracion_diseno', label: 'Decoración y Diseño' },
                { key: 'service_proveedores', label: 'Gestión de proveedores' },
                { key: 'service_carteleria', label: 'Diseño de cartelería y papelería' },
              ].map((service) => (
                <div key={service.key} className="flex items-center space-x-2">
                  {editMode ? (
                    <>
                      <Checkbox
                        checked={editedEvent[service.key] || false}
                        onCheckedChange={(checked) => setEditedEvent({...editedEvent, [service.key]: checked})}
                        data-testid={`service-checkbox-${service.key}`}
                      />
                      <label className="text-sm">{service.label}</label>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      {event?.[service.key] ? (
                        <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300" />
                      )}
                      <span className={event?.[service.key] ? 'text-gray-700' : 'text-gray-400'}>
                        {service.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <>
          {/* Progress bar + Countdown */}
          <Card className="border-[#E8DCC4]" data-testid="overview-progress">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Progreso General</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">{stats.tasks.completion_rate.toFixed(0)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600">Cuenta Atrás</p>
                  {(() => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const eventDate = new Date(event?.date); eventDate.setHours(0,0,0,0);
                    const daysLeft = Math.ceil((eventDate - today) / (1000*60*60*24));
                    return (
                      <p className={`text-2xl font-bold ${daysLeft <= 30 ? 'text-red-600' : daysLeft <= 90 ? 'text-amber-600' : 'text-[#D4AF37]'}`}>
                        {daysLeft >= 0 ? `${daysLeft} días` : 'Pasado'}
                      </p>
                    );
                  })()}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-[#D4AF37] h-3 rounded-full transition-all duration-500" style={{ width: `${stats.tasks.completion_rate}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{stats.tasks.completed} de {stats.tasks.total} tareas completadas</p>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-[#E8DCC4]">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Presupuesto</p>
                <p className="text-lg font-bold text-[#D4AF37]">{stats.budget.total_estimated.toLocaleString('es-ES', {maximumFractionDigits:0})}€</p>
                <div className="flex gap-3 mt-1 text-xs">
                  <span className="text-green-600">Pagado: {stats.budget.total_paid.toLocaleString('es-ES', {maximumFractionDigits:0})}€</span>
                  <span className="text-orange-600">Pendiente: {stats.budget.remaining.toLocaleString('es-ES', {maximumFractionDigits:0})}€</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#E8DCC4]">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Tareas</p>
                <p className="text-lg font-bold text-[#D4AF37]">{stats.tasks.total}</p>
                <div className="flex gap-3 mt-1 text-xs">
                  <span className="text-green-600">Completadas: {stats.tasks.completed}</span>
                  <span className="text-gray-500">Pendientes: {stats.tasks.pending}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
