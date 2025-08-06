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

const optionSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, 'El precio no puede ser negativo'),
  ),
});

interface OptionFormProps {
  category: string;
  initialData?: { id: string; name: string; price: number } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const OptionForm: React.FC<OptionFormProps> = ({ category, initialData, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user?.id;

  const form = useForm<z.infer<typeof optionSchema>>({
    resolver: zodResolver(optionSchema),
    defaultValues: {
      name: '',
      price: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        price: initialData.price,
      });
    } else {
      form.reset();
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof optionSchema>) => {
    if (!userId) {
      showError('No hay sesión de usuario activa.');
      return;
    }

    const optionData = {
      ...values,
      category,
      user_id: userId,
    };

    if (initialData) {
      // Update existing option
      const { error } = await supabase
        .from('cake_quoter_options')
        .update(optionData)
        .eq('id', initialData.id)
        .eq('user_id', userId); // Ensure user can only update their own options

      if (error) {
        showError('Error al actualizar la opción: ' + error.message);
      } else {
        showSuccess('Opción actualizada correctamente.');
        queryClient.invalidateQueries({ queryKey: ['cakeQuoterOptions', category, userId] });
        queryClient.invalidateQueries({ queryKey: ['cakeQuoterOptions'] }); // Invalidate all options for the quoter form
        onSuccess();
      }
    } else {
      // Add new option
      const { error } = await supabase.from('cake_quoter_options').insert(optionData);

      if (error) {
        if (error.code === '23505') { // Unique violation error code
          showError('Ya existe una opción con este nombre en esta categoría.');
        } else {
          showError('Error al añadir la opción: ' + error.message);
        }
      } else {
        showSuccess('Opción añadida correctamente.');
        queryClient.invalidateQueries({ queryKey: ['cakeQuoterOptions', category, userId] });
        queryClient.invalidateQueries({ queryKey: ['cakeQuoterOptions'] }); // Invalidate all options for the quoter form
        onSuccess();
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
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
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value)} />
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
            {initialData ? 'Actualizar Opción' : 'Añadir Opción'}
          </Button>
        </div>
      </form>
    </Form>
  );
};