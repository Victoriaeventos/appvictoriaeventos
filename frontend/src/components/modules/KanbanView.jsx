import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

const kanbanColumns = [
  { id: 'pendiente', label: 'Pendiente', headerColor: 'bg-gray-500', bgColor: 'bg-gray-50' },
  { id: 'en_proceso', label: 'En proceso', headerColor: 'bg-blue-500', bgColor: 'bg-blue-50/50' },
  { id: 'esperando_cliente', label: 'Esperando cliente', headerColor: 'bg-amber-500', bgColor: 'bg-amber-50/50' },
  { id: 'esperando_proveedor', label: 'Esperando proveedor', headerColor: 'bg-orange-500', bgColor: 'bg-orange-50/50' },
  { id: 'aprobacion_pendiente', label: 'Aprobación', headerColor: 'bg-purple-500', bgColor: 'bg-purple-50/50' },
  { id: 'completada', label: 'Completada', headerColor: 'bg-green-500', bgColor: 'bg-green-50/50' },
];

const priorityDot = {
  alta: 'bg-red-500',
  media: 'bg-amber-400',
  baja: 'bg-green-400',
};

const servicioColors = {
  asesoria: { label: 'Asesoría personalizada', cls: 'bg-yellow-100 text-yellow-800' },
  coordinacion: { label: 'Coordinación del evento', cls: 'bg-green-100 text-green-700' },
  decoracion: { label: 'Proyecto de decoración', cls: 'bg-purple-100 text-purple-700' },
  decoracion_diseno: { label: 'Decoración y Diseño', cls: 'bg-orange-100 text-orange-700' },
  carteleria: { label: 'Cartelería y papelería', cls: 'bg-rose-100 text-rose-700' },
  proveedores: { label: 'Gestión de proveedores', cls: 'bg-blue-100 text-blue-700' },
};

const normalizeStatus = (s) => {
  if (s === 'pending') return 'pendiente';
  if (s === 'in_progress') return 'en_proceso';
  if (s === 'completed') return 'completada';
  return s;
};

export const KanbanView = ({ tasks, onStatusChange, serviceFilter }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = serviceFilter === 'all'
    ? tasks
    : tasks.filter(t => t.servicio === serviceFilter);

  // Group tasks by normalized status
  const grouped = {};
  kanbanColumns.forEach(col => { grouped[col.id] = []; });
  filteredTasks.forEach(t => {
    const status = normalizeStatus(t.status);
    if (grouped[status]) {
      grouped[status].push(t);
    } else {
      grouped['pendiente'].push(t);
    }
  });

  // Sort each column by due_date
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const task = filteredTasks.find(t => t.id === draggableId);
    if (!task) return;
    const currentStatus = normalizeStatus(task.status);
    if (currentStatus === newStatus) return;
    onStatusChange(task, newStatus);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]" data-testid="kanban-board">
        {kanbanColumns.map(col => {
          const colTasks = grouped[col.id] || [];
          return (
            <div key={col.id} className="flex-shrink-0 w-[220px]" data-testid={`kanban-col-${col.id}`}>
              {/* Column header */}
              <div className={`${col.headerColor} text-white rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                <span className="text-xs font-semibold truncate">{col.label}</span>
                <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.5 font-bold">{colTasks.length}</span>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${col.bgColor} rounded-b-lg p-2 min-h-[400px] space-y-2 transition-colors ${
                      snapshot.isDraggingOver ? 'ring-2 ring-[#D4AF37] ring-inset bg-[#FDF8ED]' : ''
                    }`}
                  >
                    {colTasks.map((task, index) => {
                      const svc = servicioColors[task.servicio];
                      const isOverdue = task.due_date < todayStr && col.id !== 'completada';
                      const dot = priorityDot[task.priority] || priorityDot.baja;

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg p-2.5 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-[#D4AF37]' : 'hover:shadow-md'
                              } ${col.id === 'completada' ? 'opacity-70' : ''}`}
                              data-testid={`kanban-card-${task.id}`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${dot}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium leading-tight ${col.id === 'completada' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                    {svc && (
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${svc.cls}`}>{svc.label}</span>
                                    )}
                                    {task.fase && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{task.fase}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className={`text-[10px] ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                                      {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                      {isOverdue && ' !'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 truncate max-w-[60px]">{task.responsible}</span>
                                  </div>
                                  {task.origen === 'automatica' && (
                                    <div className="flex items-center gap-0.5 mt-1">
                                      <Sparkles className="h-2.5 w-2.5 text-[#D4AF37]" />
                                      <span className="text-[9px] text-[#D4AF37]">Auto</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {colTasks.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-[10px] text-gray-300 italic">
                        Arrastra aquí
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
