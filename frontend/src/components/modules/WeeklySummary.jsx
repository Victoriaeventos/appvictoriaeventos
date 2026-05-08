import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, AlertTriangle, FileText, Package, CreditCard, ArrowRight, Users, Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const servicioConfig = {
  asesoria: { label: 'Asesoría personalizada', color: 'bg-yellow-500' },
  coordinacion: { label: 'Coordinación del evento', color: 'bg-green-500' },
  decoracion: { label: 'Proyecto de decoración', color: 'bg-purple-500' },
  decoracion_diseno: { label: 'Decoración y Diseño', color: 'bg-orange-500' },
  carteleria: { label: 'Cartelería y papelería', color: 'bg-rose-500' },
  proveedores: { label: 'Gestión de proveedores', color: 'bg-blue-500' },
};

export const WeeklySummary = ({ eventId, tasks, stats, files = [], suppliers = [], budgetItems = [], event = null }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const normalize = (s) => {
    if (s === 'pending' || s === 'pendiente') return 'pendiente';
    if (s === 'completed' || s === 'completada') return 'completada';
    return s;
  };

  const completedTasks = tasks.filter(t => normalize(t.status) === 'completada');
  const pendingTasks = tasks.filter(t => normalize(t.status) !== 'completada');
  const overdueTasks = pendingTasks.filter(t => t.due_date < todayStr);
  const thisWeekTasks = pendingTasks.filter(t => t.due_date >= todayStr && t.due_date <= nextWeekStr);
  const bloqueos = pendingTasks.filter(t => ['esperando_cliente', 'esperando_proveedor'].includes(normalize(t.status)));

  const archivosPendientes = files.filter(f => (f.file_status || 'pendiente_revision') === 'pendiente_revision');
  const proveedoresPendientes = suppliers.filter(s => s.booking_status === 'pending');
  const pagosPendientes = budgetItems.filter(b => {
    const est = parseFloat(b.estimated_amount || 0);
    const paid = parseFloat(b.paid_amount || 0);
    return (est - paid) > 0;
  });

  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  const top3 = [...pendingTasks]
    .sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2) || (a.due_date || '').localeCompare(b.due_date || ''))
    .slice(0, 3);

  const critical3 = [...overdueTasks, ...thisWeekTasks].slice(0, 3);

  // Progress per service
  const serviceProgress = {};
  tasks.forEach(t => {
    const svc = t.servicio;
    if (!svc) return;
    if (!serviceProgress[svc]) serviceProgress[svc] = { total: 0, completed: 0 };
    serviceProgress[svc].total++;
    if (normalize(t.status) === 'completada') serviceProgress[svc].completed++;
  });

  // Next 3 pending tasks for "Pareja"
  const parejaTasks = pendingTasks
    .filter(t => t.responsible === 'Pareja')
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    .slice(0, 3);

  // PDF Dossier generation
  const generateDossierPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(212, 175, 55);
      doc.text('Victoria Eventos', pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('Informe Semanal', pageWidth / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(event?.title || 'Evento', pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.text(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Divider
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      // Progress
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text('Progreso General', 20, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Tareas completadas: ${completedTasks.length} de ${totalTasks} (${progressPercent}%)`, 25, y);
      y += 6;
      const eventDate = new Date(event?.date);
      const daysLeft = Math.ceil((eventDate - today) / (1000*60*60*24));
      doc.text(`Dias hasta el evento: ${daysLeft >= 0 ? daysLeft : 'Pasado'}`, 25, y);
      y += 12;

      // Tareas de la Pareja
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text('Proximas tareas para la Pareja', 20, y);
      y += 7;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const allParejaTasks = pendingTasks
        .filter(t => t.responsible === 'Pareja')
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 8);

      if (allParejaTasks.length === 0) {
        doc.text('No hay tareas pendientes asignadas a la pareja.', 25, y);
        y += 6;
      } else {
        allParejaTasks.forEach(task => {
          const dateStr = new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
          const svcLabel = servicioConfig[task.servicio]?.label || '';
          const line = `- ${task.title} (${dateStr})${svcLabel ? ' [' + svcLabel + ']' : ''}`;
          const lines = doc.splitTextToSize(line, pageWidth - 50);
          lines.forEach(l => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(l, 25, y);
            y += 5;
          });
        });
      }
      y += 8;

      // Pagos pendientes
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text('Pagos Pendientes', 20, y);
      y += 7;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      const totalEst = budgetItems.reduce((s, b) => s + parseFloat(b.estimated_amount || 0), 0);
      const totalPd = budgetItems.reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);
      doc.text(`Presupuesto total: ${totalEst.toLocaleString('es-ES', {maximumFractionDigits:0})} EUR`, 25, y);
      y += 5;
      doc.text(`Pagado: ${totalPd.toLocaleString('es-ES', {maximumFractionDigits:0})} EUR`, 25, y);
      y += 5;
      doc.text(`Pendiente: ${(totalEst - totalPd).toLocaleString('es-ES', {maximumFractionDigits:0})} EUR`, 25, y);
      y += 8;

      pagosPendientes.slice(0, 6).forEach(b => {
        const rem = parseFloat(b.estimated_amount || 0) - parseFloat(b.paid_amount || 0);
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`- ${b.category || b.description}: ${rem.toLocaleString('es-ES', {maximumFractionDigits:0})} EUR pendiente`, 25, y);
        y += 5;
      });
      y += 8;

      // Proveedores confirmados
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text('Estado de Proveedores', 20, y);
      y += 7;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const confirmed = suppliers.filter(s => s.booking_status === 'confirmed');
      const pending = suppliers.filter(s => s.booking_status === 'pending');
      doc.text(`Confirmados: ${confirmed.length} | Pendientes: ${pending.length}`, 25, y);
      y += 6;
      pending.slice(0, 5).forEach(s => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`- ${s.name} (${s.service_type}) - Pendiente de confirmar`, 25, y);
        y += 5;
      });
      y += 10;

      // Footer
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setDrawColor(212, 175, 55);
      doc.line(20, y, pageWidth - 20, y);
      y += 8;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generado por Victoria Eventos - www.victoriaeventos.com', pageWidth / 2, y, { align: 'center' });

      // Save
      const fileName = `Dossier_${(event?.title || 'Evento').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('Dossier PDF descargado');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  return (
    <div className="space-y-5" data-testid="weekly-summary">
      <h3 className="text-xl font-playfair font-bold">Resumen Semanal</h3>

      {/* Progress */}
      <Card className="border-[#E8DCC4]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Progreso del evento</p>
            <p className="text-lg font-bold text-[#D4AF37]">{progressPercent}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-[#D4AF37] h-2.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Progress per service */}
      {Object.keys(serviceProgress).length > 0 && (
        <Card className="border-[#E8DCC4]" data-testid="service-progress">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Progreso por servicio</p>
            <div className="space-y-3">
              {Object.entries(serviceProgress).map(([svc, data]) => {
                const cfg = servicioConfig[svc];
                const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                return (
                  <div key={svc}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{cfg?.label || svc}</span>
                      <span className="text-xs text-gray-500">{data.completed}/{data.total} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${cfg?.color || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-green-200 bg-green-50/50"><CardContent className="p-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 mb-1" />
          <p className="text-xl font-bold text-green-700">{completedTasks.length}</p>
          <p className="text-[10px] text-green-600">Completadas</p>
        </CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/50"><CardContent className="p-3">
          <Clock className="h-4 w-4 text-amber-600 mb-1" />
          <p className="text-xl font-bold text-amber-700">{thisWeekTasks.length}</p>
          <p className="text-[10px] text-amber-600">Esta semana</p>
        </CardContent></Card>
        <Card className="border-red-200 bg-red-50/50"><CardContent className="p-3">
          <AlertTriangle className="h-4 w-4 text-red-600 mb-1" />
          <p className="text-xl font-bold text-red-700">{overdueTasks.length}</p>
          <p className="text-[10px] text-red-600">Vencidas</p>
        </CardContent></Card>
        <Card className="border-purple-200 bg-purple-50/50"><CardContent className="p-3">
          <FileText className="h-4 w-4 text-purple-600 mb-1" />
          <p className="text-xl font-bold text-purple-700">{archivosPendientes.length}</p>
          <p className="text-[10px] text-purple-600">Arch. pendientes</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 3 Prioridades de la semana */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <ArrowRight className="h-3 w-3 text-[#D4AF37]" /> 3 Prioridades de la Semana
          </h4>
          <div className="space-y-2">
            {top3.map((task, i) => (
              <div key={task.id} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                task.priority === 'alta' ? 'bg-red-50 border border-red-200' : task.priority === 'media' ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'
              }`}>
                <span className="text-xs font-bold text-gray-400">#{i+1}</span>
                <span className="flex-1 truncate">{task.title}</span>
                <span className="text-[10px] text-gray-400">{new Date(task.due_date).toLocaleDateString('es-ES', {day:'numeric', month:'short'})}</span>
              </div>
            ))}
            {top3.length === 0 && <p className="text-xs text-gray-400">Todo completado</p>}
          </div>
        </div>

        {/* 3 Tareas Críticas */}
        <div>
          <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" /> 3 Tareas Críticas
          </h4>
          <div className="space-y-2">
            {critical3.map((task, i) => (
              <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-red-50 border border-red-200">
                <span className="text-xs font-bold text-red-400">#{i+1}</span>
                <span className="flex-1 truncate">{task.title}</span>
                <Badge variant="destructive" className="text-[10px]">{task.due_date < todayStr ? 'Vencida' : 'Urgente'}</Badge>
              </div>
            ))}
            {critical3.length === 0 && <p className="text-xs text-gray-400">Sin tareas críticas</p>}
          </div>
        </div>

        {/* Próximas tareas de la Pareja */}
        <div data-testid="pareja-tasks">
          <h4 className="text-sm font-bold text-[#D4AF37] mb-2 flex items-center gap-2">
            <Users className="h-3 w-3" /> Próximas tareas de la Pareja ({parejaTasks.length})
          </h4>
          <div className="space-y-2">
            {parejaTasks.map((task, i) => {
              const svcCfg = servicioConfig[task.servicio];
              return (
                <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-[#FDF8ED] border border-[#E8DCC4]">
                  <span className="text-xs font-bold text-[#D4AF37]">#{i+1}</span>
                  <span className="flex-1 truncate text-xs">{task.title}</span>
                  {svcCfg && <Badge variant="outline" className="text-[10px]">{svcCfg.label}</Badge>}
                  <span className="text-[10px] text-gray-400">{new Date(task.due_date).toLocaleDateString('es-ES', {day:'numeric', month:'short'})}</span>
                </div>
              );
            })}
            {parejaTasks.length === 0 && <p className="text-xs text-gray-400">Sin tareas pendientes para la pareja</p>}
          </div>
        </div>

        {/* Bloqueos Activos */}
        <div>
          <h4 className="text-sm font-bold text-amber-600 mb-2 flex items-center gap-2">
            <Clock className="h-3 w-3" /> Bloqueos Activos ({bloqueos.length})
          </h4>
          <div className="space-y-2">
            {bloqueos.slice(0, 4).map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-amber-50 border border-amber-200">
                <Circle className="h-3 w-3 text-amber-400 shrink-0" />
                <span className="flex-1 truncate text-xs">{task.title}</span>
                <Badge variant="outline" className="text-[10px] bg-amber-100">{normalize(task.status) === 'esperando_cliente' ? 'Cliente' : 'Proveedor'}</Badge>
              </div>
            ))}
            {bloqueos.length === 0 && <p className="text-xs text-gray-400">Sin bloqueos</p>}
          </div>
        </div>

        {/* Pagos a Revisar */}
        <div>
          <h4 className="text-sm font-bold text-emerald-600 mb-2 flex items-center gap-2">
            <CreditCard className="h-3 w-3" /> Pagos Pendientes ({pagosPendientes.length})
          </h4>
          <div className="space-y-2">
            {pagosPendientes.slice(0, 4).map(b => {
              const remaining = parseFloat(b.estimated_amount || 0) - parseFloat(b.paid_amount || 0);
              return (
                <div key={b.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="flex-1 truncate text-xs">{b.category || b.description}</span>
                  <span className="text-xs font-bold text-emerald-700">{remaining.toLocaleString('es-ES', {maximumFractionDigits:0})}€</span>
                </div>
              );
            })}
            {pagosPendientes.length === 0 && <p className="text-xs text-gray-400">Sin pagos pendientes</p>}
          </div>
        </div>

        {/* Archivos Pendientes */}
        <div>
          <h4 className="text-sm font-bold text-purple-600 mb-2 flex items-center gap-2">
            <FileText className="h-3 w-3" /> Archivos Pendientes ({archivosPendientes.length})
          </h4>
          <div className="space-y-2">
            {archivosPendientes.slice(0, 4).map(f => (
              <div key={f.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-purple-50 border border-purple-200">
                <FileText className="h-3 w-3 text-purple-400 shrink-0" />
                <span className="flex-1 truncate text-xs">{f.file_name}</span>
                <Badge variant="outline" className="text-[10px]">{f.origin === 'email' ? 'Email' : 'Manual'}</Badge>
              </div>
            ))}
            {archivosPendientes.length === 0 && <p className="text-xs text-gray-400">Todo revisado</p>}
          </div>
        </div>

        {/* Seguimiento Proveedores */}
        <div>
          <h4 className="text-sm font-bold text-blue-600 mb-2 flex items-center gap-2">
            <Package className="h-3 w-3" /> Proveedores Pendientes ({proveedoresPendientes.length})
          </h4>
          <div className="space-y-2">
            {proveedoresPendientes.slice(0, 4).map(s => (
              <div key={s.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-blue-50 border border-blue-200">
                <Package className="h-3 w-3 text-blue-400 shrink-0" />
                <span className="flex-1 truncate text-xs">{s.name}</span>
                <Badge variant="outline" className="text-[10px] bg-amber-50">Pendiente</Badge>
              </div>
            ))}
            {proveedoresPendientes.length === 0 && <p className="text-xs text-gray-400">Todos confirmados</p>}
          </div>
        </div>
      </div>

      {/* Dossier PDF section */}
      <Card className="border-[#D4AF37]/30 bg-[#FDF8ED]" data-testid="dossier-section">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-playfair font-bold text-[#D4AF37]">Dossier para el Cliente</h4>
              <p className="text-xs text-gray-500 mt-1">Genera un PDF con el resumen del evento para enviar a la pareja</p>
            </div>
            <Button
              onClick={generateDossierPDF}
              className="bg-[#D4AF37] hover:bg-[#C9A961]"
              data-testid="generate-dossier-btn"
            >
              <Download className="mr-2 h-4 w-4" /> Descargar PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
