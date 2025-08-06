import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale

interface Order {
  id: string;
  customer_name?: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

interface OrderTableProps {
  onEdit: (order: Order) => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({ onEdit }) => {
  const queryClient = useQueryClient();

  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      return;
    }
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      showError('Error al eliminar el pedido: ' + error.message);
    } else {
      showSuccess('Pedido eliminado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    let classes = "px-2.5 py-0.5 rounded-full text-xs font-medium";
    let text = "";
    switch (status) {
      case 'pending':
        classes += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
        text = "Pendiente";
        break;
      case 'completed':
        classes += " bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        text = "Completado";
        break;
      case 'cancelled':
        classes += " bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
        text = "Cancelado";
        break;
      default:
        classes += " bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
        text = status;
    }
    return <span className={classes}>{text}</span>;
  };

  if (isLoading) return <div>Cargando pedidos...</div>;
  if (error) return <div>Error al cargar pedidos: {error.message}</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Monto Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No hay pedidos registrados.
              </TableCell>
            </TableRow>
          ) : (
            orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                <TableCell>{order.customer_name || 'N/A'}</TableCell>
                <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(order)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(order.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};