import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Edit } from 'lucide-react';

export const GuestsModule = ({ guests, stats, eventId, fetchEventData, API }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [guestForm, setGuestForm] = useState({
    name: '', rsvp: 'pending', companions_count: 0, allergies: '', event_id: eventId
  });

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editingGuest) {
        await axios.put(`${API}/guests/${editingGuest.id}`, guestForm);
        toast.success('Invitado actualizado');
      } else {
        await axios.post(`${API}/guests`, guestForm);
        toast.success('Invitado añadido');
      }
      setDialogOpen(false);
      setEditingGuest(null);
      setGuestForm({ name: '', rsvp: 'pending', companions_count: 0, allergies: '', event_id: eventId });
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
    setGuestForm(guest);
    setDialogOpen(true);
  };

  const handleDelete = async (guestId) => {
    try {
      await axios.delete(`${API}/guests/${guestId}`);
      toast.success('Invitado eliminado');
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-playfair font-bold">Lista de Invitados</h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingGuest(null);
            setGuestForm({ name: '', rsvp: 'pending', companions_count: 0, allergies: '', event_id: eventId });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#D4AF37] hover:bg-[#C9A961]" data-testid="new-guest-btn">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Invitado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-playfair">{editingGuest ? 'Editar Invitado' : 'Añadir Invitado'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={guestForm.name} onChange={(e) => setGuestForm({...guestForm, name: e.target.value})} required />
              </div>
              <div>
                <Label>RSVP</Label>
                <Select value={guestForm.rsvp} onValueChange={(v) => setGuestForm({...guestForm, rsvp: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="declined">No puede asistir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número de acompañantes</Label>
                <Input type="number" min="0" value={guestForm.companions_count} onChange={(e) => setGuestForm({...guestForm, companions_count: parseInt(e.target.value)})} />
              </div>
              <div>
                <Label>Alergias</Label>
                <Textarea value={guestForm.allergies} onChange={(e) => setGuestForm({...guestForm, allergies: e.target.value})} />
              </div>
              <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C9A961]">
                {editingGuest ? 'Actualizar' : 'Añadir'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Invitados</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{stats.guests.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Confirmados</p>
              <p className="text-2xl font-bold text-green-600">{stats.guests.confirmed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-orange-600">{stats.guests.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Asistentes</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{stats.guests.total_attendees}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {guests.map((guest) => (
          <Card key={guest.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{guest.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">Acompañantes: {guest.companions_count}</p>
                  {guest.allergies && (
                    <p className="text-sm text-orange-600 mt-1">Alergias: {guest.allergies}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={guest.rsvp === 'confirmed' ? 'default' : guest.rsvp === 'declined' ? 'destructive' : 'secondary'}>
                    {guest.rsvp === 'confirmed' ? 'Confirmado' : guest.rsvp === 'declined' ? 'No asiste' : 'Pendiente'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(guest)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(guest.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
