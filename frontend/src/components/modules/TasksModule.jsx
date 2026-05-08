import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Zap, Filter, Package, CreditCard, FileText, ArrowRight, RotateCcw, Sparkles, LayoutList, Columns3 } from 'lucide-react';
import { KanbanView } from './KanbanView';

const statusOptions = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-gray-100 text-gray-700' },
  { value: 'en_proceso', label: 'En proceso', color: 'bg-blue-100 text-blue-700' },
  { value: 'esperando_cliente', label: 'Esperando cliente', color: 'bg-amber-100 text-amber-700' },
  { value: 'esperando_proveedor', label: 'Esperando proveedor', color: 'bg-orange-100 text-orange-700' },
  { value: 'aprobacion_pendiente', label: 'Aprobación pendiente', color: 'bg-purple-100 text-purple-700' },
  { value: 'completada', label: 'Completada', color: 'bg-green-100 text-green-700' },
];

const statusMap = Object.fromEntries(statusOptions.map(s => [s.value, s]));
statusMap['pending'] = statusMap['pendiente'];
statusMap['in_progress'] = statusMap['en_proceso'];
statusMap['completed'] = statusMap['completada'];

const priorityConfig = {
  alta: { color: 'border-l-4 border-l-red-500', badge: 'bg-red-100 text-red-700', label: 'Alta', dot: 'bg-red-500' },
  media: { color: 'border-l-4 border-l-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'Media', dot: 'bg-amber-400' },
  baja: { color: 'border-l-4 border-l-green-400', badge: 'bg-green-100 text-green-700', label: 'Baja', dot: 'bg-green-400' },
};

const servicioConfig = {
  asesoria: { label: 'Asesoría personalizada', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  coordinacion: { label: 'Coordinación del evento', color: 'bg-green-100 text-green-700 border-green-300' },
  decoracion: { label: 'Proyecto de decoración', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  decoracion_diseno: { label: 'Decoración y Diseño', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  carteleria: { label: 'Cartelería y papelería', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  proveedores: { label: 'Gestión de proveedores', color: 'bg-blue-100 text-blue-700 border-blue-300' },
};

const filters = [
  { key: 'all', label: 'Todas' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'completed', label: 'Completadas' },
  { key: 'overdue', label: 'Vencidas' },
  { key: 'waiting', label: 'Esperando' },
  { key: 'approval', label: 'Aprobaciones' },
];

export const TasksModule = ({ tasks, eventId, fetchEventData, API, suppliers = [], budgetItems = [], files = [], event = null }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [queHagoOpen, setQueHagoOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [serviceFilter, setServiceFilter] = useState('all');
  const [taskForm, setTaskForm] = useState({
    title: '', category: '', due_date: '', responsible: '', status: 'pendiente', notes: '',
    description: '', service: '', task_type: '', next_step: '', requires_approval: false,
    related_supplier_id: null, related_budget_id: null, related_file_id: null,
    event_id: eventId
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await axios.put(`${API}/tasks/${editingTask.id}`, taskForm);
        toast.success('Tarea actualizada');
      } else {
        await axios.post(`${API}/tasks`, taskForm);
        toast.success('Tarea creada');
      }
      setDialogOpen(false);
      setEditingTask(null);
      setTaskForm({ title: '', category: '', due_date: '', responsible: '', status: 'pendiente', notes: '', event_id: eventId });
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setTaskForm({ ...task, status: normalizeStatus(task.status) });
    setDialogOpen(true);
  };

  const normalizeStatus = (s) => {
    if (s === 'pending') return 'pendiente';
    if (s === 'in_progress') return 'en_proceso';
    if (s === 'completed') return 'completada';
    return s;
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await axios.put(`${API}/tasks/${task.id}`, { ...task, status: newStatus, event_id: eventId });
      fetchEventData();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      toast.success('Tarea eliminada');
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/events/${eventId}/generate-tasks`);
      toast.success(res.data.message);
      fetchEventData();
    } catch (error) {
      toast.error('Error al generar tareas');
    } finally {
      setGenerating(false);
    }
  };

  const handleRecalculateDates = async () => {
    try {
      const res = await axios.post(`${API}/events/${eventId}/recalculate-dates`);
      toast.success(res.data.message);
      fetchEventData();
    } catch (error) {
      toast.error('Error al recalcular fechas');
    }
  };

  // Filter logic
  const filteredTasks = tasks.filter(task => {
    const status = normalizeStatus(task.status);
    if (activeFilter === 'today') return task.due_date === todayStr && status !== 'completada';
    if (activeFilter === 'week') return task.due_date >= todayStr && task.due_date <= weekEndStr && status !== 'completada';
    if (activeFilter === 'pending') return status !== 'completada';
    if (activeFilter === 'completed') return status === 'completada';
    if (activeFilter === 'overdue') return task.due_date < todayStr && status !== 'completada';
    if (activeFilter === 'waiting') return status === 'esperando_cliente' || status === 'esperando_proveedor';
    if (activeFilter === 'approval') return status === 'aprobacion_pendiente';
    return true;
  });

  // Sort: alta first, then media, then baja; completed at end
  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aComplete = normalizeStatus(a.status) === 'completada' ? 1 : 0;
    const bComplete = normalizeStatus(b.status) === 'completada' ? 1 : 0;
    if (aComplete !== bComplete) return aComplete - bComplete;
    // Sort by due_date first, then by priority
    const dateCompare = (a.due_date || '').localeCompare(b.due_date || '');
    if (dateCompare !== 0) return dateCompare;
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });

  // Apply service filter for list view
  const displayTasks = serviceFilter === 'all'
    ? sortedTasks
    : sortedTasks.filter(t => t.servicio === serviceFilter);

  // "¿Qué hago hoy?" - top 3 non-completed, sorted by priority
  const queHagoTasks = tasks
    .filter(t => normalizeStatus(t.status) !== 'completada')
    .sort((a, b) => {
      const pOrd = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (pOrd !== 0) return pOrd;
      return (a.due_date || '').localeCompare(b.due_date || '');
    })
    .slice(0, 3);

  // Group by month for display
  const groupTasksByMonth = (taskList) => {
    const grouped = {};
    taskList.forEach(task => {
      if (!task.due_date) return;
      const date = new Date(task.due_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      if (!grouped[monthKey]) grouped[monthKey] = { name: monthName, tasks: [] };
      grouped[monthKey].tasks.push(task);
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const filterCounts = {
    all: tasks.length,
    today: tasks.filter(t => t.due_date === todayStr && normalizeStatus(t.status) !== 'completada').length,
    week: tasks.filter(t => t.due_date >= todayStr && t.due_date <= weekEndStr && normalizeStatus(t.status) !== 'completada').length,
    pending: tasks.filter(t => normalizeStatus(t.status) !== 'completada').length,
    completed: tasks.filter(t => normalizeStatus(t.status) === 'completada').length,
    overdue: tasks.filter(t => t.due_date < todayStr && normalizeStatus(t.status) !== 'completada').length,
    waiting: tasks.filter(t => ['esperando_cliente', 'esperando_proveedor'].includes(normalizeStatus(t.status))).length,
    approval: tasks.filter(t => normalizeStatus(t.status) === 'aprobacion_pendiente').length,
  };

  const autoTaskCount = tasks.filter(t => t.origen === 'automatica').length;

  // Get unique services from tasks for service filter
  const uniqueServices = [...new Set(tasks.map(t => t.servicio).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-xl font-playfair font-bold" data-testid="tasks-title">Checklist de Tareas</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5" data-testid="view-toggle">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="view-list-btn"
            >
              <LayoutList className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="view-kanban-btn"
            >
              <Columns3 className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>
          <Button onClick={() => setQueHagoOpen(true)} variant="outline" className="border-[#D4AF37] text-[#D4AF37]" data-testid="que-hago-btn">
            <Zap className="mr-1 h-4 w-4" /> ¿Qué hago hoy?
          </Button>
          <Button onClick={handleRecalculateDates} variant="outline" size="sm" className="text-xs" data-testid="recalculate-btn">
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Recalcular
          </Button>
          <Button onClick={handleGenerateTasks} variant="outline" size="sm" className="text-xs border-[#D4AF37] text-[#D4AF37]" disabled={generating} data-testid="generate-tasks-btn">
            <Sparkles className="mr-1 h-3.5 w-3.5" /> {generating ? 'Generando...' : 'Regenerar tareas'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingTask(null); setTaskForm({ title: '', category: '', due_date: '', responsible: '', status: 'pendiente', notes: '', description: '', service: '', task_type: '', next_step: '', requires_approval: false, related_supplier_id: null, related_budget_id: null, related_file_id: null, event_id: eventId }); }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4AF37] hover:bg-[#C9A961]" data-testid="new-task-btn">
                <Plus className="mr-1 h-4 w-4" /> Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-playfair">{editingTask ? 'Editar Tarea' : 'Crear Tarea'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrUpdate} className="space-y-3">
                <div><Label>Título</Label><Input value={taskForm.title} onChange={(e) => setTaskForm({...taskForm, title: e.target.value})} required data-testid="task-form-title" /></div>
                <div><Label>Descripción corta</Label><Input value={taskForm.description || ''} onChange={(e) => setTaskForm({...taskForm, description: e.target.value})} placeholder="Descripción breve..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Categoría</Label><Input value={taskForm.category} onChange={(e) => setTaskForm({...taskForm, category: e.target.value})} required /></div>
                  <div><Label>Tipo de tarea</Label><Input value={taskForm.task_type || ''} onChange={(e) => setTaskForm({...taskForm, task_type: e.target.value})} placeholder="Ej: Gestión, Diseño..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fecha límite</Label><Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})} required /></div>
                  <div><Label>Responsable</Label><Input value={taskForm.responsible} onChange={(e) => setTaskForm({...taskForm, responsible: e.target.value})} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Estado</Label>
                    <Select value={taskForm.status} onValueChange={(v) => setTaskForm({...taskForm, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Servicio principal</Label><Input value={taskForm.service || ''} onChange={(e) => setTaskForm({...taskForm, service: e.target.value})} placeholder="Ej: Decoración" /></div>
                </div>
                <div><Label>Próximo paso</Label><Input value={taskForm.next_step || ''} onChange={(e) => setTaskForm({...taskForm, next_step: e.target.value})} placeholder="¿Qué hay que hacer a continuación?" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Proveedor</Label>
                    <Select value={taskForm.related_supplier_id || 'none'} onValueChange={(v) => setTaskForm({...taskForm, related_supplier_id: v === 'none' ? null : v})}>
                      <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguno</SelectItem>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Presupuesto</Label>
                    <Select value={taskForm.related_budget_id || 'none'} onValueChange={(v) => setTaskForm({...taskForm, related_budget_id: v === 'none' ? null : v})}>
                      <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguno</SelectItem>
                        {budgetItems.map(b => <SelectItem key={b.id} value={b.id}>{b.category || b.description}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Archivo</Label>
                    <Select value={taskForm.related_file_id || 'none'} onValueChange={(v) => setTaskForm({...taskForm, related_file_id: v === 'none' ? null : v})}>
                      <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguno</SelectItem>
                        {files.map(f => <SelectItem key={f.id} value={f.id}>{f.file_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Notas internas</Label><Textarea value={taskForm.notes} onChange={(e) => setTaskForm({...taskForm, notes: e.target.value})} placeholder="Notas..." rows={2} /></div>
                <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C9A961]" data-testid="task-form-submit">{editingTask ? 'Actualizar' : 'Crear'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Auto tasks info bar */}
      {autoTaskCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2" data-testid="auto-tasks-info">
          <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span>{autoTaskCount} tareas automáticas generadas por servicios contratados</span>
        </div>
      )}

      {/* Kanban: service filter row */}
      {viewMode === 'kanban' && uniqueServices.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center" data-testid="kanban-service-filter">
          <span className="text-xs text-gray-500 font-medium">Servicio:</span>
          <button
            onClick={() => setServiceFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              serviceFilter === 'all' ? 'bg-[#D4AF37] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#D4AF37]'
            }`}
            data-testid="kanban-filter-all"
          >Todos</button>
          {uniqueServices.map(svc => {
            const cfg = servicioConfig[svc];
            return (
              <button
                key={svc}
                onClick={() => setServiceFilter(svc)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  serviceFilter === svc ? 'bg-[#D4AF37] text-white' : `bg-white text-gray-600 border border-gray-200 hover:border-[#D4AF37]`
                }`}
                data-testid={`kanban-filter-${svc}`}
              >{cfg?.label || svc}</button>
            );
          })}
        </div>
      )}

      {/* List view: filters */}
      {viewMode === 'list' && (
        <>
        <div className="flex flex-wrap gap-2" data-testid="task-filters">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === f.key
                  ? 'bg-[#D4AF37] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-[#D4AF37]'
              }`}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
              {filterCounts[f.key] > 0 && (
                <span className={`ml-1 ${activeFilter === f.key ? 'opacity-80' : 'text-gray-400'}`}>({filterCounts[f.key]})</span>
              )}
            </button>
          ))}
        </div>
        {/* Service filter for List view */}
        {uniqueServices.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center" data-testid="list-service-filter">
            <span className="text-xs text-gray-500 font-medium">Servicio:</span>
            <button
              onClick={() => setServiceFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                serviceFilter === 'all' ? 'bg-[#D4AF37] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#D4AF37]'
              }`}
              data-testid="list-filter-all"
            >Todos</button>
            {uniqueServices.map(svc => {
              const cfg = servicioConfig[svc];
              return (
                <button
                  key={svc}
                  onClick={() => setServiceFilter(svc)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    serviceFilter === svc ? 'bg-[#D4AF37] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#D4AF37]'
                  }`}
                  data-testid={`list-filter-${svc}`}
                >{cfg?.label || svc}</button>
              );
            })}
          </div>
        )}
        </>
      )}

      {/* ¿Qué hago hoy? Dialog */}
      <Dialog open={queHagoOpen} onOpenChange={setQueHagoOpen}>
        <DialogContent className="sm:max-w-md" data-testid="que-hago-dialog">
          <DialogHeader>
            <DialogTitle className="font-playfair text-xl flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#D4AF37]" /> ¿Qué hago hoy?
            </DialogTitle>
            <p className="text-sm text-gray-500">Tus 3 tareas más importantes</p>
          </DialogHeader>
          <div className="space-y-3">
            {queHagoTasks.map((task, idx) => {
              const prio = priorityConfig[task.priority] || priorityConfig.baja;
              const svc = servicioConfig[task.servicio];
              return (
                <div key={task.id} className={`p-4 rounded-lg border-2 ${prio.badge}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg font-bold opacity-50">#{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {svc && <Badge variant="outline" className={`text-[10px] ${svc.color}`}>{svc.label}</Badge>}
                        <span className="text-xs opacity-70">{task.category} · {task.responsible}</span>
                      </div>
                      <p className="text-xs mt-1 opacity-70">{new Date(task.due_date).toLocaleDateString('es-ES', {day:'numeric', month:'long'})}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {queHagoTasks.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Todas las tareas completadas</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <KanbanView
          tasks={tasks}
          onStatusChange={handleStatusChange}
          serviceFilter={serviceFilter}
        />
      )}

      {/* LIST VIEW - Chronological grouped by month */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {groupTasksByMonth(displayTasks).map(([monthKey, { name, tasks: monthTasks }]) => (
            <div key={monthKey}>
              <h4 className="text-base font-playfair font-semibold text-[#D4AF37] mb-3 capitalize" data-testid={`month-group-${monthKey}`}>{name}</h4>
              <div className="space-y-2">
                {monthTasks.map((task) => {
                  const prio = priorityConfig[task.priority] || priorityConfig.baja;
                  const statusInfo = statusMap[normalizeStatus(task.status)] || statusMap.pendiente;
                  const isCompleted = normalizeStatus(task.status) === 'completada';
                  const isPostEvento = task.offset_pct != null && task.offset_pct >= 100;
                  const isOverdue = task.due_date < todayStr && !isCompleted && !isPostEvento;
                  const svc = servicioConfig[task.servicio];

                  return (
                    <Card key={task.id} className={`${prio.color} ${isCompleted ? 'opacity-60' : ''} hover:shadow-sm transition-all`} data-testid={`task-card-${task.id}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${prio.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-500' : ''}`}>{task.title}</h5>
                                <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
                                {isOverdue && <Badge variant="destructive" className="text-[10px]">Vencida</Badge>}
                                {isPostEvento && !isCompleted && <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-600 border-indigo-200">Post-evento</Badge>}
                              </div>
                              {task.description && <p className="text-xs text-gray-600 mt-0.5">{task.description}</p>}
                              {task.entregable && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-purple-600 bg-purple-50 rounded px-2 py-0.5 w-fit">
                                  <FileText className="h-3 w-3" /> {task.entregable}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {svc && <Badge variant="outline" className={`text-[10px] ${svc.color}`}>{svc.label}</Badge>}
                                {task.fase && <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600">{task.fase}</Badge>}
                                <span className="text-xs text-gray-500">{task.category} · {task.responsible} · {new Date(task.due_date).toLocaleDateString('es-ES', {day:'numeric', month:'short'})}</span>
                              </div>
                              {task.disparador && (
                                <p className="text-[10px] text-gray-400 mt-0.5 italic">Disparador: {task.disparador}</p>
                              )}
                              {task.next_step && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-[#D4AF37] font-medium">
                                  <ArrowRight className="h-3 w-3" /> {task.next_step}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {task.related_supplier_id && (() => {
                                  const s = suppliers.find(x => x.id === task.related_supplier_id);
                                  return s ? <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 cursor-pointer"><Package className="h-2.5 w-2.5 mr-1" />{s.name}</Badge> : null;
                                })()}
                                {task.related_budget_id && (() => {
                                  const b = budgetItems.find(x => x.id === task.related_budget_id);
                                  return b ? <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 cursor-pointer"><CreditCard className="h-2.5 w-2.5 mr-1" />{b.category || b.description}</Badge> : null;
                                })()}
                                {task.related_file_id && (() => {
                                  const f = files.find(x => x.id === task.related_file_id);
                                  return f ? <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 cursor-pointer"><FileText className="h-2.5 w-2.5 mr-1" />{f.file_name}</Badge> : null;
                                })()}
                                {task.origen === 'automatica' && (
                                  <Badge variant="outline" className="text-[10px] bg-[#FDF8ED] text-[#D4AF37] border-[#D4AF37]/30"><Sparkles className="h-2.5 w-2.5 mr-1" />Auto</Badge>
                                )}
                              </div>
                              {task.notes && <p className="text-xs text-gray-500 mt-1 italic">{task.notes}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Select
                              value={normalizeStatus(task.status)}
                              onValueChange={(v) => handleStatusChange(task, v)}
                            >
                              <SelectTrigger className="h-7 w-7 p-0 border-0 [&>svg]:hidden" data-testid={`status-select-${task.id}`}>
                                <Filter className="h-3.5 w-3.5 text-gray-400" />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(task)} data-testid={`edit-task-${task.id}`}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(task.id)} data-testid={`delete-task-${task.id}`}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
          {sortedTasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8" data-testid="no-tasks-message">No hay tareas con este filtro</p>
          )}
        </div>
      )}
    </div>
  );
};
