import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, CreditCard } from 'lucide-react';

export const SuppliersModule = ({ suppliers, predefinedSuppliers, eventId, fetchEventData, API, budgetItems = [], stats }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingBudgetItem, setEditingBudgetItem] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);

  const [supplierForm, setSupplierForm] = useState({
    name: '', service_type: '', contact: '', booking_status: 'pending', notes: '', price: 0, advance_payment: 0, event_id: eventId
  });
  const [budgetForm, setBudgetForm] = useState({
    category: '', description: '', estimated_amount: 0, paid_amount: 0, status: 'pending', event_id: eventId
  });
  const [paymentForm, setPaymentForm] = useState({
    budget_item_id: '', amount: 0, payment_date: '', notes: '', event_id: eventId
  });

  // Supplier CRUD
  const handleCreateOrUpdateSupplier = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await axios.put(`${API}/suppliers/${editingSupplier.id}`, supplierForm);
        toast.success('Proveedor actualizado');
      } else {
        await axios.post(`${API}/suppliers`, supplierForm);
        toast.success('Proveedor añadido');
      }
      setDialogOpen(false);
      setEditingSupplier(null);
      setSupplierForm({ name: '', service_type: '', contact: '', booking_status: 'pending', notes: '', price: 0, advance_payment: 0, event_id: eventId });
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm(supplier);
    setDialogOpen(true);
  };

  const handleDeleteSupplier = async (supplierId) => {
    try {
      await axios.delete(`${API}/suppliers/${supplierId}`);
      toast.success('Proveedor eliminado');
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const addPredefinedSupplier = (supplier) => {
    setSupplierForm({
      name: supplier.name, service_type: supplier.service_type, contact: '',
      booking_status: 'pending', notes: '', price: 0, advance_payment: 0, event_id: eventId
    });
    setDialogOpen(true);
  };

  // Budget CRUD
  const handleCreateOrUpdateBudget = async (e) => {
    e.preventDefault();
    try {
      if (editingBudgetItem) {
        await axios.put(`${API}/budget/${editingBudgetItem.id}`, budgetForm);
        toast.success('Partida actualizada');
      } else {
        await axios.post(`${API}/budget`, budgetForm);
        toast.success('Partida añadida');
      }
      setBudgetDialogOpen(false);
      setEditingBudgetItem(null);
      setBudgetForm({ category: '', description: '', estimated_amount: 0, paid_amount: 0, status: 'pending', event_id: eventId });
      fetchEventData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const handleEditBudget = (item) => {
    setEditingBudgetItem(item);
    setBudgetForm(item);
    setBudgetDialogOpen(true);
  };

  const handleDeleteBudget = async (itemId) => {
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
    setPaymentForm({ budget_item_id: item.id, amount: 0, payment_date: new Date().toISOString().split('T')[0], notes: '', event_id: eventId });
    setPaymentDialogOpen(true);
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/payments`, paymentForm);
      toast.success('Pago registrado');
      setPaymentDialogOpen(false);
      fetchEventData();
    } catch (error) {
      toast.error('Error al registrar pago');
    }
  };

  const budgetEstimated = budgetItems.reduce((sum, b) => sum + (parseFloat(b.estimated_amount) || 0), 0);
  const budgetPaid = budgetItems.reduce((sum, b) => sum + (parseFloat(b.paid_amount) || 0), 0);
  const supplierEstimated = suppliers.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const supplierPaid = suppliers.reduce((sum, s) => sum + (parseFloat(s.advance_payment) || 0), 0);
  const totalEstimated = budgetEstimated + supplierEstimated;
  const totalPaid = budgetPaid + supplierPaid;
  const totalPending = totalEstimated - totalPaid;

  return (
    <div className="space-y-6">
      {/* ===== PRESUPUESTO SECTION ===== */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-playfair font-bold" data-testid="budget-title">Presupuesto</h3>
          <Dialog open={budgetDialogOpen} onOpenChange={(open) => {
            setBudgetDialogOpen(open);
            if (!open) { setEditingBudgetItem(null); setBudgetForm({ category: '', description: '', estimated_amount: 0, paid_amount: 0, status: 'pending', event_id: eventId }); }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#D4AF37] text-[#D4AF37]" data-testid="new-budget-btn">
                <Plus className="mr-1 h-4 w-4" /> Nueva Partida
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-playfair">{editingBudgetItem ? 'Editar Partida' : 'Nueva Partida'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrUpdateBudget} className="space-y-4">
                <div><Label>Categoría</Label><Input value={budgetForm.category} onChange={(e) => setBudgetForm({...budgetForm, category: e.target.value})} required /></div>
                <div><Label>Descripción</Label><Input value={budgetForm.description} onChange={(e) => setBudgetForm({...budgetForm, description: e.target.value})} required /></div>
                <div><Label>Presupuesto estimado (€)</Label><Input type="number" min="0" step="0.01" value={budgetForm.estimated_amount} onChange={(e) => setBudgetForm({...budgetForm, estimated_amount: parseFloat(e.target.value) || 0})} required /></div>
                <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C9A961]">{editingBudgetItem ? 'Actualizar' : 'Añadir'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget totals */}
        <div className="grid grid-cols-3 gap-3 mb-4" data-testid="budget-totals">
          <Card className="border-[#E8DCC4]"><CardContent className="p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold text-[#D4AF37]">{totalEstimated.toLocaleString('es-ES', {maximumFractionDigits:0})}€</p>
          </CardContent></Card>
          <Card className="border-green-200 bg-green-50/30"><CardContent className="p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Pagado</p>
            <p className="text-lg font-bold text-green-600">{totalPaid.toLocaleString('es-ES', {maximumFractionDigits:0})}€</p>
          </CardContent></Card>
          <Card className="border-orange-200 bg-orange-50/30"><CardContent className="p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Pendiente</p>
            <p className="text-lg font-bold text-orange-600">{totalPending.toLocaleString('es-ES', {maximumFractionDigits:0})}€</p>
          </CardContent></Card>
        </div>

        {/* Budget items */}
        {budgetItems.length > 0 && (
          <div className="space-y-2 mb-6">
            {budgetItems.map((item) => (
              <Card key={item.id} className="border-gray-100">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-sm">{item.category}</h5>
                        <span className="text-xs text-gray-400">- {item.description}</span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs">
                        <span>Estimado: <strong>{parseFloat(item.estimated_amount).toLocaleString('es-ES', {maximumFractionDigits:0})}€</strong></span>
                        <span className="text-green-600">Pagado: <strong>{parseFloat(item.paid_amount).toLocaleString('es-ES', {maximumFractionDigits:0})}€</strong></span>
                        <span className="text-orange-600">Pendiente: <strong>{(parseFloat(item.estimated_amount) - parseFloat(item.paid_amount)).toLocaleString('es-ES', {maximumFractionDigits:0})}€</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => openPaymentDialog(item)} className="text-[#D4AF37] border-[#D4AF37] h-7 text-xs px-2" data-testid={`payment-btn-${item.id}`}>
                        <CreditCard className="h-3 w-3 mr-1" /> Pago
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditBudget(item)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteBudget(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-playfair">Registrar Pago</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div><Label>Partida</Label><p className="text-sm text-gray-600">{selectedItemForPayment?.description}</p></div>
              <div><Label>Importe (€)</Label><Input type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} required /></div>
              <div><Label>Fecha del pago</Label><Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})} required /></div>
              <div><Label>Notas</Label><Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})} placeholder="Ej: Señal, Pago final..." /></div>
              <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C9A961]">Registrar Pago</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <hr className="border-[#E8DCC4]" />

      {/* ===== PROVEEDORES SECTION ===== */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-playfair font-bold" data-testid="suppliers-title">Proveedores</h3>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingSupplier(null); setSupplierForm({ name: '', service_type: '', contact: '', booking_status: 'pending', notes: '', price: 0, advance_payment: 0, event_id: eventId }); }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4AF37] hover:bg-[#C9A961]" data-testid="new-supplier-btn">
                <Plus className="mr-1 h-4 w-4" /> Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-playfair">{editingSupplier ? 'Editar Proveedor' : 'Añadir Proveedor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrUpdateSupplier} className="space-y-4">
                <div><Label>Nombre</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} required /></div>
                <div><Label>Tipo de servicio</Label><Input value={supplierForm.service_type} onChange={(e) => setSupplierForm({...supplierForm, service_type: e.target.value})} required /></div>
                <div><Label>Contacto</Label><Input value={supplierForm.contact} onChange={(e) => setSupplierForm({...supplierForm, contact: e.target.value})} required placeholder="Email o teléfono" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Precio (€)</Label><Input type="number" min="0" step="0.01" value={supplierForm.price} onChange={(e) => setSupplierForm({...supplierForm, price: parseFloat(e.target.value) || 0})} /></div>
                  <div><Label>Dinero a cuenta (€)</Label><Input type="number" min="0" step="0.01" value={supplierForm.advance_payment} onChange={(e) => setSupplierForm({...supplierForm, advance_payment: parseFloat(e.target.value) || 0})} /></div>
                </div>
                <div><Label>Estado de reserva</Label>
                  <Select value={supplierForm.booking_status} onValueChange={(v) => setSupplierForm({...supplierForm, booking_status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Notas</Label><Textarea value={supplierForm.notes} onChange={(e) => setSupplierForm({...supplierForm, notes: e.target.value})} /></div>
                <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C9A961]">{editingSupplier ? 'Actualizar' : 'Añadir'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {predefinedSuppliers.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="py-3"><CardTitle className="text-sm font-playfair">Proveedores Sugeridos</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {predefinedSuppliers.map((supplier, idx) => (
                  <Button key={idx} variant="outline" size="sm" onClick={() => addPredefinedSupplier(supplier)} className="text-left justify-start text-xs">
                    <Plus className="h-3 w-3 mr-1" />{supplier.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {suppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-sm">{supplier.name}</h5>
                      <Badge variant={supplier.booking_status === 'confirmed' ? 'default' : supplier.booking_status === 'cancelled' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {supplier.booking_status === 'confirmed' ? 'Confirmado' : supplier.booking_status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{supplier.service_type} · {supplier.contact}</p>
                    {supplier.price > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        Precio: <strong>{supplier.price.toLocaleString('es-ES', {maximumFractionDigits:0})}€</strong>
                        {supplier.advance_payment > 0 && (
                          <span className="ml-2 text-green-600">A cuenta: <strong>{supplier.advance_payment.toLocaleString('es-ES', {maximumFractionDigits:0})}€</strong></span>
                        )}
                      </p>
                    )}
                    {supplier.notes && <p className="text-xs text-gray-400 mt-1 italic">{supplier.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditSupplier(supplier)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteSupplier(supplier.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {suppliers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay proveedores</p>}
        </div>
      </div>
    </div>
  );
};
