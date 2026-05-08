import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

import { OverviewModule } from '@/components/modules/OverviewModule';
import { TasksModule } from '@/components/modules/TasksModule';
import { SuppliersModule } from '@/components/modules/SuppliersModule';
import { NotesModule } from '@/components/modules/NotesModule';
import { FilesModule } from '@/components/modules/FilesModule';
import { WeeklySummary } from '@/components/modules/WeeklySummary';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EventDetail({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [editedEvent, setEditedEvent] = useState({});

  const [tasks, setTasks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [predefinedSuppliers, setPredefinedSuppliers] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchEventData();
    fetchPredefinedSuppliers();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const [eventRes, tasksRes, suppliersRes, budgetRes, notesRes, filesRes, statsRes] = await Promise.all([
        axios.get(`${API}/events/${eventId}`),
        axios.get(`${API}/tasks/${eventId}`),
        axios.get(`${API}/suppliers/${eventId}`),
        axios.get(`${API}/budget/${eventId}`),
        axios.get(`${API}/notes/${eventId}`),
        axios.get(`${API}/files/${eventId}`),
        axios.get(`${API}/stats/${eventId}`)
      ]);

      setEvent(eventRes.data);
      setEditedEvent(eventRes.data);
      setTasks(tasksRes.data);
      setSuppliers(suppliersRes.data);
      setBudgetItems(budgetRes.data);
      setNotes(notesRes.data);
      setFiles(filesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Error al cargar el evento');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredefinedSuppliers = async () => {
    try {
      const response = await axios.get(`${API}/suppliers/predefined/list`);
      setPredefinedSuppliers(response.data);
    } catch (error) {
      console.error('Error al cargar proveedores predefinidos');
    }
  };

  const handleUpdateEvent = async () => {
    try {
      await axios.put(`${API}/events/${eventId}`, editedEvent);
      toast.success('Evento actualizado');
      setEditMode(false);
      fetchEventData();
    } catch (error) {
      toast.error('Error al actualizar evento');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Evento no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] via-white to-[#F5F1E8]">
      <div className="bg-white shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-[#D4AF37]"
              data-testid="back-to-dashboard-btn"
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
                {event.title}
              </h1>
              <p className="text-gray-600 font-inter mt-1">
                {new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-2 mb-8 bg-white p-2 rounded-lg shadow-elegant">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white">Resumen</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white">Tareas</TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white">Proveedores</TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white">Notas</TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white">Archivos</TabsTrigger>
            <TabsTrigger value="weekly" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white">Semanal</TabsTrigger>
          </TabsList>

          <div className="bg-white rounded-lg shadow-elegant p-6">
            <TabsContent value="overview" className="mt-0">
              <OverviewModule event={event} editMode={editMode} setEditMode={setEditMode} editedEvent={editedEvent} setEditedEvent={setEditedEvent} handleUpdateEvent={handleUpdateEvent} stats={stats} fetchEventData={fetchEventData} eventId={eventId} tasks={tasks} />
            </TabsContent>
            <TabsContent value="tasks" className="mt-0">
              <TasksModule tasks={tasks} eventId={eventId} fetchEventData={fetchEventData} API={API} suppliers={suppliers} budgetItems={budgetItems} files={files} event={event} />
            </TabsContent>
            <TabsContent value="suppliers" className="mt-0">
              <SuppliersModule suppliers={suppliers} predefinedSuppliers={predefinedSuppliers} eventId={eventId} fetchEventData={fetchEventData} API={API} budgetItems={budgetItems} stats={stats} />
            </TabsContent>
            <TabsContent value="notes" className="mt-0">
              <NotesModule notes={notes} event={event} user={user} eventId={eventId} fetchEventData={fetchEventData} API={API} />
            </TabsContent>
            <TabsContent value="files" className="mt-0">
              <FilesModule files={files} eventId={eventId} fetchEventData={fetchEventData} API={API} />
            </TabsContent>
            <TabsContent value="weekly" className="mt-0">
              <WeeklySummary eventId={eventId} tasks={tasks} stats={stats} files={files} suppliers={suppliers} budgetItems={budgetItems} event={event} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
