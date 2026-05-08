import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react';

export const TimelineModule = ({ tasks, event }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getPhaseFromMonths = (monthsLeft) => {
    if (monthsLeft >= 9) return '12-9 meses antes';
    if (monthsLeft >= 6) return '9-6 meses antes';
    if (monthsLeft >= 3) return '6-3 meses antes';
    if (monthsLeft >= 1) return '3-1 meses antes';
    return 'Último mes';
  };

  // Group tasks into timeline phases
  const buildTimeline = () => {
    if (!event?.date || !tasks.length) return [];

    const eventDate = new Date(event.date);
    const phases = {};

    tasks.forEach(task => {
      const taskDate = new Date(task.due_date);
      const monthsDiff = (eventDate.getFullYear() - taskDate.getFullYear()) * 12 + (eventDate.getMonth() - taskDate.getMonth());
      const phase = getPhaseFromMonths(monthsDiff);

      if (!phases[phase]) {
        phases[phase] = { total: 0, completed: 0, overdue: 0, tasks: [] };
      }
      phases[phase].total++;
      if (task.status === 'completed') phases[phase].completed++;
      if (task.status !== 'completed' && taskDate < today) phases[phase].overdue++;
      phases[phase].tasks.push(task);
    });

    const phaseOrder = ['12-9 meses antes', '9-6 meses antes', '6-3 meses antes', '3-1 meses antes', 'Último mes'];
    return phaseOrder.filter(p => phases[p]).map(p => ({ name: p, ...phases[p] }));
  };

  const timeline = buildTimeline();

  if (!timeline.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay tareas para mostrar en el timeline.</p>
      </div>
    );
  }

  // Overall progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Days until event
  const eventDate = new Date(event.date);
  eventDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6" data-testid="timeline-module">
      <h3 className="text-xl font-playfair font-bold">Timeline del Evento</h3>

      {/* Progress bar */}
      <Card className="border-[#E8DCC4]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Progreso General</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{progressPercent}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">Cuenta Atrás</p>
              <p className={`text-2xl font-bold ${daysLeft <= 30 ? 'text-red-600' : daysLeft <= 90 ? 'text-amber-600' : 'text-[#D4AF37]'}`}>
                {daysLeft >= 0 ? `${daysLeft} días` : 'Pasado'}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-[#D4AF37] h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
              data-testid="timeline-progress-bar"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{completedTasks} de {totalTasks} tareas completadas</p>
        </CardContent>
      </Card>

      {/* Timeline phases */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#E8DCC4]" />
        <div className="space-y-6">
          {timeline.map((phase, idx) => {
            const phasePercent = phase.total > 0 ? Math.round((phase.completed / phase.total) * 100) : 0;
            const isComplete = phasePercent === 100;
            const hasOverdue = phase.overdue > 0;

            return (
              <div key={idx} className="relative pl-14" data-testid={`timeline-phase-${idx}`}>
                <div className={`absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isComplete ? 'bg-[#D4AF37] border-[#D4AF37]' : hasOverdue ? 'bg-red-100 border-red-400' : 'bg-white border-[#E8DCC4]'
                }`}>
                  {isComplete ? (
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  ) : hasOverdue ? (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  ) : (
                    <Circle className="h-3 w-3 text-gray-300" />
                  )}
                </div>
                <Card className={`${isComplete ? 'border-[#D4AF37] bg-[#FAFAF5]' : hasOverdue ? 'border-red-200' : 'border-[#E8DCC4]'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-playfair font-semibold text-gray-800">{phase.name}</h4>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isComplete ? 'text-[#D4AF37] bg-[#D4AF37]/10' : hasOverdue ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {phasePercent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                      <div
                        className={`h-1.5 rounded-full transition-all ${isComplete ? 'bg-[#D4AF37]' : hasOverdue ? 'bg-red-400' : 'bg-amber-400'}`}
                        style={{ width: `${phasePercent}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{phase.completed}/{phase.total} tareas</span>
                      {phase.overdue > 0 && (
                        <span className="text-red-500 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {phase.overdue} vencida(s)
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
