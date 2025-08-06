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

const customerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  correo: z.string().email('Correo inválido').optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
});

interface CustomerFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      nombre: '',
      correo: '',
      telefono: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        nombre: initialData.nombre,
        correo: initialData.correo || '',
        telefono: initialData.telefono || '',
      });
    } else {
      form.reset();
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof customerSchema>) => {
    if (!session?.user?.id) {
      showError('No hay sesión de usuario activa.');
      return;
    }

    const customerData = {
      ...values,
      user_id: session.user.id,
    };

    if (initialData) {
      // Update existing customer
      const { error } = await supabase
        .from('clientes')
        .update(customerData)
        .eq('id', initialData.id);

      if (error) {
        showError('Error al actualizar el cliente: ' + error.message);
      } else {
        showSuccess('Cliente actualizado correctamente.');
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        onSuccess();
      }
    } else {
      // Add new customer
      const { error } = await supabase.from('clientes').insert(customerData);

      if (error) {
        showError('Error al añadir el cliente: ' + error.message);
      } else {
        showSuccess('Cliente añadido correctamente.');
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        onSuccess();
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="correo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico (Opcional)</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono (Opcional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? 'Actualizar Cliente' : 'Añadir Cliente'}
          </Button>
        </div>
      </form>
    </Form>
  );
};