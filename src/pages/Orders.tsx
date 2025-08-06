import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { OrderTable } from '@/components/orders/OrderTable';
import { OrderForm } from '@/components/orders/OrderForm';

const Orders = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null); // Type will be defined later

  const handleAddOrder = () => {
    setEditingOrder(null);
    setIsFormOpen(true);
  };

  const handleEditOrder = (order: any) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingOrder(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Pedidos</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddOrder}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Editar Pedido' : 'Añadir Nuevo Pedido'}</DialogTitle>
            </DialogHeader>
            <OrderForm
              initialData={editingOrder}
              onSuccess={handleFormClose}
              onCancel={handleFormClose}
            />
          </DialogContent>
        </Dialog>
      </div>
      <OrderTable onEdit={handleEditOrder} />
    </div>
  );
};

export default Orders;