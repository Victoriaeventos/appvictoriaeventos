import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Calendar, LogOut, Plus, ArrowRight, Trash2, CheckCircle2, 
  Clock, AlertTriangle, TrendingUp, Bell, CreditCard, HelpCircle,
  Zap, Lock, ThumbsUp, Euro, Target, FileText
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const priorityConfig = {
  alta: { color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Alta' },
  media: { color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Media' },
  baja: { color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', label: 'Baja' },
};

const statusLabels = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  esperando_cliente: 'Esperando cliente',
  esperando_proveedor: 'Esperando proveedor',
  aprobacion_pendiente: 'Aprobación pend.',
  completada: 'Completada',
  pending: 'Pendiente',
  completed: 'Completada',
};

function CommandTask({ task, onClick }) {
  const prio = priorityConfig[task.priority] || priorityConfig.baja;
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${prio.color}`}
      onClick={() => onClick(task.event_id)}
      data-testid={`cmd-task-${task.id}`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${prio.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs opacity-70 truncate">{task.event_title} · {new Date(task.due_date).toLocaleDateString('es-ES', {day:'numeric', month:'short'})}</p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">{statusLabels[task.status] || task.status}</Badge>
    </div>
  );
}

function CommandSection({ icon, title, children, count, color = 'text-gray-800', testId }) {
  if (!count) return null;
  return (
    <div data-testid={testId}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-playfair font-bold text-base" style={{color: 'inherit'}}>{title}</h3>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function PlannerDashboard({ user, setUser }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [commandCenter, setCommandCenter] = useState(null);
  const [queHagoOpen, setQueHagoOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '', date: '', contract_date: '', event_type: 'boda', status: 'pending',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
    fetchStats();
    fetchCommandCenter();
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

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) { console.error(error); }
  };

  const fetchCommandCenter = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/command-center`);
      setCommandCenter(response.data);
    } catch (error) { console.error(error); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/events`, newEvent);
      toast.success('Evento creado correctamente');
      setDialogOpen(false);
      setNewEvent({ title: '', date: '', contract_date: '', event_type: 'boda', status: 'pending' });
      fetchEvents(); fetchStats(); fetchCommandCenter();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear evento');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const handleDeleteEvent = async (eventId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await axios.delete(`${API}/events/${eventToDelete}`);
      toast.success('Evento eliminado');
      setDeleteDialogOpen(false); setEventToDelete(null);
      fetchEvents(); fetchStats(); fetchCommandCenter();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
      setDeleteDialogOpen(false); setEventToDelete(null);
    }
  };

  const getDaysUntilEvent = (dateStr) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
  };

  const getCountdownColor = (days) => {
    if (days <= 7) return 'text-red-600 bg-red-50';
    if (days <= 30) return 'text-amber-600 bg-amber-50';
    if (days <= 90) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] via-white to-[#F5F1E8]">
      {/* Header */}
      <div className="bg-white shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/logo-victoria.png" alt="Victoria Eventos" className="h-16 object-contain" />
              <div>
                <h1 className="text-xl font-playfair font-bold text-[#D4AF37]">Victoria Eventos</h1>
                <p className="text-gray-600 font-inter text-sm">Bienvenido/a, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/como-funciona')} variant="outline" size="sm" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white" data-testid="how-it-works-btn">
                <HelpCircle className="mr-1 h-4 w-4" /> Cómo Funciona
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white" data-testid="planner-logout-button">
                <LogOut className="mr-1 h-4 w-4" /> Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Strip */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6" data-testid="dashboard-stats-panel">
            <Card className="border-[#E8DCC4]"><CardContent className="p-3 text-center">
              <Calendar className="h-4 w-4 text-[#D4AF37] mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{stats.total_events}</p>
              <p className="text-[10px] text-gray-500">Eventos</p>
            </CardContent></Card>
            <Card className="border-[#E8DCC4]"><CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 text-[#D4AF37] mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{stats.upcoming_events}</p>
              <p className="text-[10px] text-gray-500">Próximos</p>
            </CardContent></Card>
            <Card className="border-[#E8DCC4]"><CardContent className="p-3 text-center">
              <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{stats.completed_tasks}<span className="text-xs text-gray-400">/{stats.total_tasks}</span></p>
              <p className="text-[10px] text-gray-500">Tareas</p>
            </CardContent></Card>
            <Card className="border-[#E8DCC4]"><CardContent className="p-3 text-center">
              <AlertTriangle className="h-4 w-4 text-red-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{stats.overdue_tasks}</p>
              <p className="text-[10px] text-gray-500">Vencidas</p>
            </CardContent></Card>
            <Card className="border-[#E8DCC4]"><CardContent className="p-3 text-center">
              <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{stats.nearest_countdown ?? '-'}</p>
              <p className="text-[10px] text-gray-500">Días Próx.</p>
            </CardContent></Card>
            <Card className="border-[#E8DCC4]"><CardContent className="p-3 text-center">
              <CreditCard className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{stats.total_pending_payments?.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€</p>
              <p className="text-[10px] text-gray-500">Pagos Pend.</p>
            </CardContent></Card>
          </div>
        )}

        {/* COMMAND CENTER */}
        {commandCenter && (
          <div className="mb-8 space-y-6">
            {/* ¿QUÉ HAGO HOY? Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-playfair font-bold text-gray-800 flex items-center gap-2">
                <Target className="h-5 w-5 text-[#D4AF37]" /> Centro de Mando
              </h2>
              {commandCenter.que_hago_hoy?.length > 0 && (
                <Button onClick={() => setQueHagoOpen(true)} className="bg-[#D4AF37] hover:bg-[#C9A961] shadow-md" data-testid="que-hago-hoy-btn">
                  <Zap className="mr-2 h-4 w-4" /> ¿Qué hago hoy?
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* HOY TENGO QUE HACER ESTO */}
              <Card className="border-red-200 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" /> HOY TENGO QUE HACER ESTO
                    {commandCenter.hoy?.length > 0 && <Badge variant="destructive" className="text-[10px]">{commandCenter.hoy.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {commandCenter.hoy?.length > 0 ? (
                    <div className="space-y-2">
                      {commandCenter.hoy.map(task => (
                        <CommandTask key={task.id} task={task} onClick={(eid) => navigate(`/event/${eid}`)} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-4 text-center">Todo al día</p>
                  )}
                </CardContent>
              </Card>

              {/* BLOQUEOS POR CLIENTE */}
              <Card className="border-amber-200 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700">
                    <Lock className="h-4 w-4" /> BLOQUEOS POR CLIENTE
                    {commandCenter.bloqueos_cliente?.length > 0 && <Badge className="bg-amber-500 text-[10px]">{commandCenter.bloqueos_cliente.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {commandCenter.bloqueos_cliente?.length > 0 ? (
                    <div className="space-y-2">
                      {commandCenter.bloqueos_cliente.map(task => (
                        <CommandTask key={task.id} task={task} onClick={(eid) => navigate(`/event/${eid}`)} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-4 text-center">Sin bloqueos</p>
                  )}
                </CardContent>
              </Card>

              {/* BLOQUEOS POR PROVEEDOR */}
              <Card className="border-orange-200 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-700">
                    <Lock className="h-4 w-4" /> BLOQUEOS POR PROVEEDOR
                    {commandCenter.bloqueos_proveedor?.length > 0 && <Badge className="bg-orange-500 text-[10px]">{commandCenter.bloqueos_proveedor.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {commandCenter.bloqueos_proveedor?.length > 0 ? (
                    <div className="space-y-2">
                      {commandCenter.bloqueos_proveedor.map(task => (
                        <CommandTask key={task.id} task={task} onClick={(eid) => navigate(`/event/${eid}`)} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-4 text-center">Sin bloqueos</p>
                  )}
                </CardContent>
              </Card>

              {/* APROBACIONES PENDIENTES */}
              <Card className="border-blue-200 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700">
                    <ThumbsUp className="h-4 w-4" /> APROBACIONES PENDIENTES
                    {commandCenter.aprobaciones?.length > 0 && <Badge className="bg-blue-500 text-[10px]">{commandCenter.aprobaciones.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {commandCenter.aprobaciones?.length > 0 ? (
                    <div className="space-y-2">
                      {commandCenter.aprobaciones.map(task => (
                        <CommandTask key={task.id} task={task} onClick={(eid) => navigate(`/event/${eid}`)} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-4 text-center">Sin aprobaciones pendientes</p>
                  )}
                </CardContent>
              </Card>

              {/* PAGOS A REVISAR */}
              <Card className="border-emerald-200 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700">
                    <Euro className="h-4 w-4" /> PAGOS A REVISAR
                    {commandCenter.pagos_revisar?.length > 0 && <Badge className="bg-emerald-500 text-[10px]">{commandCenter.pagos_revisar.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {commandCenter.pagos_revisar?.length > 0 ? (
                    <div className="space-y-2">
                      {commandCenter.pagos_revisar.map(pago => (
                        <div key={pago.id} className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50 cursor-pointer hover:shadow-sm transition-all"
                          onClick={() => navigate(`/event/${pago.event_id}`)} data-testid={`pago-${pago.id}`}>
                          <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-emerald-800 truncate">{pago.description || pago.category}</p>
                            <p className="text-xs text-emerald-600">{pago.event_title}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-700">{pago.remaining.toLocaleString('es-ES', {maximumFractionDigits: 0})}€</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-4 text-center">Sin pagos pendientes</p>
                  )}
                </CardContent>
              </Card>

              {/* ARCHIVOS PENDIENTES DE REVISIÓN */}
              <Card className="border-purple-200 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-700">
                    <FileText className="h-4 w-4" /> ARCHIVOS PENDIENTES
                    {commandCenter.archivos_pendientes?.length > 0 && <Badge className="bg-purple-500 text-[10px]">{commandCenter.archivos_pendientes.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {commandCenter.archivos_pendientes?.length > 0 ? (
                    <div className="space-y-2">
                      {commandCenter.archivos_pendientes.map(archivo => (
                        <div key={archivo.id} className="flex items-center gap-3 p-3 rounded-lg border border-purple-200 bg-purple-50 cursor-pointer hover:shadow-sm transition-all"
                          onClick={() => navigate(`/event/${archivo.event_id}`)} data-testid={`archivo-${archivo.id}`}>
                          <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-purple-800 truncate">{archivo.file_name}</p>
                            <p className="text-xs text-purple-600">{archivo.event_title}{archivo.origin === 'email' ? ' · Email' : ''}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600">Revisar</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-4 text-center">Sin archivos pendientes</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ¿Qué hago hoy? Dialog */}
        <Dialog open={queHagoOpen} onOpenChange={setQueHagoOpen}>
          <DialogContent className="sm:max-w-md" data-testid="que-hago-hoy-dialog">
            <DialogHeader>
              <DialogTitle className="font-playfair text-xl flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#D4AF37]" /> ¿Qué hago hoy?
              </DialogTitle>
              <p className="text-sm text-gray-500">Tus 3 tareas más importantes ahora mismo</p>
            </DialogHeader>
            <div className="space-y-3">
              {commandCenter?.que_hago_hoy?.map((task, idx) => {
                const prio = priorityConfig[task.priority] || priorityConfig.baja;
                return (
                  <div key={task.id} className={`p-4 rounded-lg border-2 ${prio.color}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg font-bold opacity-50">#{idx + 1}</span>
                      <div className="flex-1">
                        <p className="font-semibold">{task.title}</p>
                        <p className="text-xs mt-1 opacity-70">{task.event_title} · {task.category}</p>
                        <p className="text-xs mt-1 opacity-70">{new Date(task.due_date).toLocaleDateString('es-ES', {day:'numeric', month:'long'})}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Events Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-playfair font-bold text-gray-800">Mis Eventos</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4AF37] hover:bg-[#C9A961] text-white" data-testid="planner-create-event-button">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-playfair text-2xl text-[#D4AF37]">Crear Nuevo Evento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título del evento</Label>
                  <Input id="title" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required placeholder="Boda de María y Juan" data-testid="planner-event-title-input" />
                </div>
                <div>
                  <Label htmlFor="contract_date">Fecha de contratación</Label>
                  <Input id="contract_date" type="date" value={newEvent.contract_date} onChange={(e) => setNewEvent({ ...newEvent, contract_date: e.target.value })} required data-testid="planner-event-contract-date-input" />
                </div>
                <div>
                  <Label htmlFor="date">Fecha del evento</Label>
                  <Input id="date" type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} required data-testid="planner-event-date-input" />
                </div>
                <div>
                  <Label htmlFor="type">Tipo de evento</Label>
                  <Select value={newEvent.event_type} onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}>
                    <SelectTrigger data-testid="planner-event-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boda">Boda</SelectItem>
                      <SelectItem value="comunion">Comunión</SelectItem>
                      <SelectItem value="corporativo">Corporativo</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C9A961]" data-testid="planner-event-submit-button">Crear Evento</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12"><p className="text-gray-600">Cargando eventos...</p></div>
        ) : events.length === 0 ? (
          <Card className="text-center py-12"><CardContent>
            <p className="text-gray-600 mb-4">No tienes eventos todavía</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-[#D4AF37] hover:bg-[#C9A961]">Crear tu primer evento</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="planner-events-list">
            {events.map((event) => {
              const daysLeft = getDaysUntilEvent(event.date);
              const countdownColor = getCountdownColor(daysLeft);
              return (
                <Card key={event.id} className="card-hover border-[#E8DCC4] hover:border-[#D4AF37] relative" data-testid={`planner-event-card-${event.id}`}>
                  <div className="absolute top-2 right-2 z-50">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteEvent(event.id, e); }} onMouseDown={(e) => { e.stopPropagation(); }} className="hover:bg-red-50 bg-white/80 backdrop-blur-sm shadow-sm" data-testid={`delete-event-${event.id}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="cursor-pointer pt-8" onClick={() => navigate(`/event/${event.id}`)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-playfair text-lg text-[#D4AF37]">{event.title}</CardTitle>
                      <CardDescription className="font-inter flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 capitalize">{event.event_type}</span>
                          {daysLeft >= 0 ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${countdownColor}`} data-testid={`countdown-${event.id}`}>
                              {daysLeft === 0 ? 'Hoy' : `${daysLeft}d`}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-gray-500 bg-gray-100">Pasado</span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-[#D4AF37] hover:text-[#C9A961] text-xs">
                          Ver <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-playfair text-xl">¿Eliminar este evento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán todos los datos del evento.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
