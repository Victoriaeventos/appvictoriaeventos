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
import { Upload, FileText, Trash2, Edit, Eye, Download, Mail, FolderOpen } from 'lucide-react';

const fileCategories = [
  { value: 'documentacion_cliente', label: 'Documentación cliente' },
  { value: 'listado_invitados', label: 'Listado invitados' },
  { value: 'confirmaciones', label: 'Confirmaciones' },
  { value: 'menus_alergias', label: 'Menús y alergias' },
  { value: 'seating_plan', label: 'Seating plan' },
  { value: 'proyecto_decoracion', label: 'Proyecto de decoración' },
  { value: 'carteleria', label: 'Cartelería' },
  { value: 'contratos', label: 'Contratos' },
  { value: 'facturas', label: 'Facturas' },
  { value: 'proveedores', label: 'Proveedores' },
  { value: 'otros', label: 'Otros' },
];

const fileStatuses = [
  { value: 'pendiente_revision', label: 'Pendiente revisión', color: 'bg-amber-100 text-amber-700' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-blue-100 text-blue-700' },
  { value: 'final', label: 'Final', color: 'bg-green-100 text-green-700' },
];

const originOptions = [
  { value: 'email', label: 'Recibido por email' },
  { value: 'manual', label: 'Subido manualmente' },
  { value: 'pendiente_revisar', label: 'Pendiente de revisar' },
];

const categoryMap = Object.fromEntries(fileCategories.map(c => [c.value, c.label]));
const statusMap = Object.fromEntries(fileStatuses.map(s => [s.value, s]));
const originMap = Object.fromEntries(originOptions.map(o => [o.value, o.label]));

const categoryFilters = [{ value: 'all', label: 'Todas' }, ...fileCategories];
const statusFilters = [{ value: 'all', label: 'Todos' }, ...fileStatuses];

export const FilesModule = ({ files, eventId, fetchEventData, API }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [fileForm, setFileForm] = useState({
    file_name: '', file_type: 'otros', file_base64: '', notes: '', category: 'otros',
    description: '', service_related: '', version: 1, file_status: 'pendiente_revision',
    origin: 'manual', event_id: eventId
  });
  const [editForm, setEditForm] = useState({});

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF, JPG y PNG');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setFileForm({ ...fileForm, file_name: file.name, file_base64: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/files`, { ...fileForm, file_type: fileForm.category });
      toast.success('Archivo subido correctamente');
      setDialogOpen(false);
      resetForm();
      fetchEventData();
    } catch (error) {
      toast.error('Error al subir archivo');
    }
  };

  const handleUpdateFile = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/files/${editingFile.id}`, editForm);
      toast.success('Archivo actualizado');
      setEditDialogOpen(false);
      setEditingFile(null);
      fetchEventData();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await axios.delete(`${API}/files/${fileId}`);
      toast.success('Archivo eliminado');
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const openEdit = (file) => {
    setEditingFile(file);
    setEditForm({
      category: file.category || file.file_type || 'otros',
      description: file.description || '',
      notes: file.notes || '',
      file_status: file.file_status || 'pendiente_revision',
      origin: file.origin || 'manual',
      version: file.version || 1,
      service_related: file.service_related || '',
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFileForm({
      file_name: '', file_type: 'otros', file_base64: '', notes: '', category: 'otros',
      description: '', service_related: '', version: 1, file_status: 'pendiente_revision',
      origin: 'manual', event_id: eventId
    });
  };

  const downloadFile = (file) => {
    try {
      let mimeType = 'application/pdf';
      const fileName = file.file_name.toLowerCase();
      if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (fileName.endsWith('.png')) mimeType = 'image/png';
      const link = document.createElement('a');
      link.href = `data:${mimeType};base64,${file.file_base64}`;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { toast.error('Error al descargar'); }
  };

  const filteredFiles = files.filter(f => {
    const cat = f.category || f.file_type || 'otros';
    const st = f.file_status || 'pendiente_revision';
    if (filterCategory !== 'all' && cat !== filterCategory) return false;
    if (filterStatus !== 'all' && st !== filterStatus) return false;
    return true;
  });

  const pendingCount = files.filter(f => (f.file_status || 'pendiente_revision') === 'pendiente_revision').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-xl font-playfair font-bold">Centro Documental</h3>
          <p className="text-xs text-gray-500 mt-1">Sube archivos recibidos por email o manualmente. Gestiona versiones y estados.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#D4AF37] hover:bg-[#C9A961]" data-testid="upload-file-btn">
              <Upload className="mr-2 h-4 w-4" /> Subir Archivo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-playfair">Subir Archivo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-3">
              <div><Label>Categoría</Label>
                <Select value={fileForm.category} onValueChange={(v) => setFileForm({...fileForm, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{fileCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Archivo (PDF, JPG, PNG)</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} required />
                {fileForm.file_name && <p className="text-xs text-gray-500 mt-1">{fileForm.file_name}</p>}
              </div>
              <div><Label>Descripción</Label><Input value={fileForm.description} onChange={(e) => setFileForm({...fileForm, description: e.target.value})} placeholder="Descripción breve del archivo" /></div>
              <div><Label>Origen</Label>
                <Select value={fileForm.origin} onValueChange={(v) => setFileForm({...fileForm, origin: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{originOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Estado</Label>
                <Select value={fileForm.file_status} onValueChange={(v) => setFileForm({...fileForm, file_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{fileStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Servicio relacionado (opcional)</Label><Input value={fileForm.service_related} onChange={(e) => setFileForm({...fileForm, service_related: e.target.value})} placeholder="Ej: Decoración, Catering..." /></div>
              <div><Label>Notas</Label><Textarea value={fileForm.notes} onChange={(e) => setFileForm({...fileForm, notes: e.target.value})} placeholder="Notas adicionales..." rows={2} /></div>
              <Button type="submit" disabled={!fileForm.file_base64} className="w-full bg-[#D4AF37] hover:bg-[#C9A961]">Subir Archivo</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-gray-400" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{categoryFilters.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-400" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{statusFilters.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {pendingCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{pendingCount} pendientes de revisión</Badge>}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-playfair">Editar Archivo</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateFile} className="space-y-3">
            <div><Label>Categoría</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({...editForm, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{fileCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Estado</Label>
              <Select value={editForm.file_status} onValueChange={(v) => setEditForm({...editForm, file_status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{fileStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Origen</Label>
              <Select value={editForm.origin} onValueChange={(v) => setEditForm({...editForm, origin: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{originOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descripción</Label><Input value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} /></div>
            <div><Label>Servicio relacionado</Label><Input value={editForm.service_related} onChange={(e) => setEditForm({...editForm, service_related: e.target.value})} /></div>
            <div><Label>Versión</Label><Input type="number" min="1" value={editForm.version} onChange={(e) => setEditForm({...editForm, version: parseInt(e.target.value)})} /></div>
            <div><Label>Notas</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({...editForm, notes: e.target.value})} rows={2} /></div>
            <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C9A961]">Guardar Cambios</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* File List */}
      <div className="space-y-2">
        {filteredFiles.map((file) => {
          const cat = file.category || file.file_type || 'otros';
          const st = file.file_status || 'pendiente_revision';
          const statusInfo = statusMap[st] || statusMap.pendiente_revision;
          const originLabel = originMap[file.origin] || 'Manual';
          return (
            <Card key={file.id} className={`hover:shadow-sm transition-all ${st === 'pendiente_revision' ? 'border-l-4 border-l-amber-400' : st === 'final' ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-blue-400'}`} data-testid={`file-card-${file.id}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className={`h-8 w-8 shrink-0 ${file.file_name?.endsWith('.pdf') ? 'text-red-500' : 'text-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm truncate">{file.file_name}</h4>
                        <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        <Badge variant="outline" className="text-[10px] bg-gray-50">{categoryMap[cat] || cat}</Badge>
                        {file.version > 1 && <Badge variant="outline" className="text-[10px]">v{file.version}</Badge>}
                      </div>
                      {file.description && <p className="text-xs text-gray-600 mt-1">{file.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                        {file.origin === 'email' && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>}
                        {file.service_related && <span>{file.service_related}</span>}
                        {file.notes && <span className="italic">{file.notes}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => downloadFile(file)} title="Descargar">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(file)} title="Editar">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(file.id)} title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredFiles.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No hay archivos con estos filtros</p>}
      </div>
    </div>
  );
};
