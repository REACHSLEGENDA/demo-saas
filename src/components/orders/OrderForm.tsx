import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const orderSchema = z.object({
  customer_name: z.string().min(1, 'El nombre del cliente es requerido').optional().or(z.literal('')),
  total_amount: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, 'El monto total no puede ser negativo'),
  ),
  status: z.enum(['pending', 'completed', 'cancelled'], {
    required_error: 'El estado es requerido',
  }),
});

interface OrderFormProps {
  initialData?: any; // Type will be defined later
  onSuccess: () => void;
  onCancel: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_name: '',
      total_amount: 0,
      status: 'pending',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        customer_name: initialData.customer_name || '',
        total_amount: initialData.total_amount,
        status: initialData.status,
      });
    } else {
      form.reset();
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    if (!session?.user?.id) {
      showError('No hay sesión de usuario activa.');
      return;
    }

    const orderData = {
      ...values,
      user_id: session.user.id,
    };

    if (initialData) {
      // Update existing order
      const { error } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', initialData.id);

      if (error) {
        showError('Error al actualizar el pedido: ' + error.message);
      } else {
        showSuccess('Pedido actualizado correctamente.');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        onSuccess();
      }
    } else {
      // Add new order
      const { error } = await supabase.from('orders').insert(orderData);

      if (error) {
        showError('Error al añadir el pedido: ' + error.message);
      } else {
        showSuccess('Pedido añadido correctamente.');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        onSuccess();
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customer_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Cliente (Opcional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="total_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto Total</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? 'Actualizar Pedido' : 'Añadir Pedido'}
          </Button>
        </div>
      </form>
    </Form>
  );
};