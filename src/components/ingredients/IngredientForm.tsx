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

const ingredientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  unit: z.string().min(1, 'La unidad es requerida'),
  stock: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, 'El stock no puede ser negativo'),
  ),
  min_stock_level: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, 'El nivel mínimo de stock no puede ser negativo'),
  ).optional(),
});

interface IngredientFormProps {
  initialData?: any; // Type will be defined later
  onSuccess: () => void;
  onCancel: () => void;
}

export const IngredientForm: React.FC<IngredientFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  const form = useForm<z.infer<typeof ingredientSchema>>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: '',
      unit: '',
      stock: 0,
      min_stock_level: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        unit: initialData.unit,
        stock: initialData.stock,
        min_stock_level: initialData.min_stock_level || 0,
      });
    } else {
      form.reset();
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof ingredientSchema>) => {
    if (!session?.user?.id) {
      showError('No hay sesión de usuario activa.');
      return;
    }

    const ingredientData = {
      ...values,
      user_id: session.user.id,
    };

    if (initialData) {
      // Update existing ingredient
      const { error } = await supabase
        .from('ingredients')
        .update(ingredientData)
        .eq('id', initialData.id);

      if (error) {
        showError('Error al actualizar el ingrediente: ' + error.message);
      } else {
        showSuccess('Ingrediente actualizado correctamente.');
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        onSuccess();
      }
    } else {
      // Add new ingredient
      const { error } = await supabase.from('ingredients').insert(ingredientData);

      if (error) {
        showError('Error al añadir el ingrediente: ' + error.message);
      } else {
        showSuccess('Ingrediente añadido correctamente.');
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
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
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidad</FormLabel>
              <FormControl>
                <Input {...field} placeholder="ej. kg, gramos, litros, unidades" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Actual</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="min_stock_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nivel Mínimo de Stock</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(e.target.value)} />
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
            {initialData ? 'Actualizar Ingrediente' : 'Añadir Ingrediente'}
          </Button>
        </div>
      </form>
    </Form>
  );
};