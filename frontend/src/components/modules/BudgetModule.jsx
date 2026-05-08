import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit } from 'lucide-react';

export const BudgetModule = ({ budgetItems, stats, eventId, fetchEventData, API }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);
  const [itemForm, setItemForm] = useState({
    category: '', description: '', estimated_amount: 0, paid_amount: 0, status: 'pending', event_id: eventId
  });
  const [paymentForm, setPaymentForm] = useState({
    budget_item_id: '', amount: 0, payment_date: '', notes: '', event_id: eventId
  });

  const handleCreateOrUpdateItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${API}/budget/${editingItem.id}`, itemForm);
        toast.success('Partida actualizada');
      } else {
        await axios.post(`${API}/budget`, itemForm);
        toast.success('Partida añadida');
      }
      setDialogOpen(false);
      setEditingItem(null);
      setItemForm({ category: '', description: '', estimated_amount: 0, paid_amount: 0, status: 'pending', event_id: eventId });
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/payments`, paymentForm);
      toast.success('Pago registrado');
      setPaymentDialogOpen(false);
      setPaymentForm({ budget_item_id: '', amount: 0, payment_date: '', notes: '', event_id: eventId });
      fetchEventData();
    } catch (error) {
      toast.error('Error al registrar pago');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setItemForm(item);
    setDialogOpen(true);
  };

  const handleDelete = async (itemId) => {
    try {
      await axios.delete(`${API}/budget/${itemId}`);
      toast.success('Partida eliminada');
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const openPaymentDialog = (item) => {
    setSelectedItemForPayment(item);
    setPaymentForm({
      budget_item_id: item.id,
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
      event_id: eventId
    });
    setPaymentDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-playfair font-bold">Presupuesto</h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setItemForm({ category: '', description: '', estimated_amount: 0, paid_amount: 0, status: 'pending', event_id: eventId });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#D4AF37] hover:bg-[#C9A961]" data-testid="new-budget-btn">
              <Plus className="mr-2 h-4 w-4" /> Nueva Partida
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-playfair">{editingItem ? 'Editar Partida' : 'Nueva Partida'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrUpdateItem} className="space-y-4">
              <div>
                <Label>Categoría</Label>
                <Input value={itemForm.category} onChange={(e) => setItemForm({...itemForm, category: e.target.value})} required />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input value={itemForm.description} onChange={(e) => setItemForm({...itemForm, description: e.target.value})} required />
              </div>
              <div>
                <Label>Presupuesto estimado (€)</Label>
                <Input type="number" min="0" step="0.01" value={itemForm.estimated_amount} onChange={(e) => setItemForm({...itemForm, estimated_amount: parseFloat(e.target.value)})} required />
              </div>
              <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C9A961]">
                {editingItem ? 'Actualizar' : 'Añadir'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-playfair">Registrar Pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePayment} className="space-y-4">
            <div>
              <Label>Partida</Label>
              <p className="text-sm text-gray-600">{selectedItemForPayment?.description}</p>
            </div>
            <div>
              <Label>Importe (€)</Label>
              <Input type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value)})} required />
            </div>
            <div>
              <Label>Fecha del pago</Label>
              <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})} required />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})} placeholder="Ej: Señal, Pago final..." />
            </div>
            <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C9A961]">
              Registrar Pago
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Presupuesto Total</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{stats.budget.total_estimated.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Pagado</p>
              <p className="text-2xl font-bold text-green-600">{stats.budget.total_paid.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Pendiente</p>
              <p className="text-2xl font-bold text-orange-600">{stats.budget.remaining.toFixed(2)}€</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {budgetItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{item.category}</h4>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span>Presupuesto: <strong>{item.estimated_amount.toFixed(2)}€</strong></span>
                    <span>Pagado: <strong className="text-green-600">{item.paid_amount.toFixed(2)}€</strong></span>
                    <span>Pendiente: <strong className="text-orange-600">{(item.estimated_amount - item.paid_amount).toFixed(2)}€</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPaymentDialog(item)}
                    className="text-[#D4AF37] border-[#D4AF37]"
                    data-testid={`payment-btn-${item.id}`}
                  >
                    € Pago
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
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
