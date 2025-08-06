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

interface Customer {
  id: string;
  nombre: string;
  correo?: string;
  telefono?: string;
}

interface CustomerTableProps {
  onEdit: (customer: Customer) => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({ onEdit }) => {
  const queryClient = useQueryClient();

  const { data: customers, isLoading, error } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      return;
    }
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) {
      showError('Error al eliminar el cliente: ' + error.message);
    } else {
      showSuccess('Cliente eliminado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  };

  if (isLoading) return <div>Cargando clientes...</div>;
  if (error) return <div>Error al cargar clientes: {error.message}</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No hay clientes registrados.
              </TableCell>
            </TableRow>
          ) : (
            customers?.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.nombre}</TableCell>
                <TableCell>{customer.correo || 'N/A'}</TableCell>
                <TableCell>{customer.telefono || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(customer)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
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