import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, PlusCircle, Cake } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';

interface QuoterOption {
  id: string;
  category: string;
  name: string;
  price: number;
}

// Esquema de validación con Zod
const quoterSchema = z.object({
  size: z.string().min(1, 'El tamaño es requerido'),
  flavor: z.string().min(1, 'El sabor es requerido'),
  customer_name: z.string().optional().or(z.literal('')),
});

interface QuoteItem {
  type: 'size' | 'flavor' | 'filling' | 'covering' | 'decoration' | 'special_option';
  value: string;
  label: string;
  price: number;
}

export const CakeQuoterForm: React.FC = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user?.id;

  const form = useForm<z.infer<typeof quoterSchema>>({
    resolver: zodResolver(quoterSchema),
    defaultValues: {
      size: '',
      flavor: '',
      customer_name: '',
    },
  });

  const [selectedFillings, setSelectedFillings] = useState<QuoteItem[]>([]);
  const [selectedCoverings, setSelectedCoverings] = useState<QuoteItem[]>([]);
  const [selectedDecorations, setSelectedDecorations] = useState<QuoteItem[]>([]);
  const [selectedSpecialOptions, setSelectedSpecialOptions] = useState<QuoteItem[]>([]);

  const [currentFillingId, setCurrentFillingId] = useState<string>('');
  const [currentCoveringId, setCurrentCoveringId] = useState<string>('');
  const [currentDecorationId, setCurrentDecorationId] = useState<string>('');
  const [currentSpecialOptionId, setCurrentSpecialOptionId] = useState<string>('');

  // Fetch all options dynamically
  const { data: allOptions, isLoading: isLoadingOptions, error: optionsError } = useQuery<QuoterOption[]>({
    queryKey: ['cakeQuoterOptions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('cake_quoter_options')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const getOptionsByCategory = (category: string) => {
    return allOptions?.filter(option => option.category === category) || [];
  };

  const sizes = getOptionsByCategory('sizes');
  const flavors = getOptionsByCategory('flavors');
  const fillings = getOptionsByCategory('fillings');
  const coverings = getOptionsByCategory('coverings');
  const decorations = getOptionsByCategory('decorations');
  const specialOptions = getOptionsByCategory('special_options');

  const selectedSize = form.watch('size');
  const selectedFlavor = form.watch('flavor');

  // Cálculo del desglose y precio total en tiempo real
  const quoteBreakdown = useMemo(() => {
    const breakdown: QuoteItem[] = [];
    let currentTotal = 0;

    const sizeOption = sizes.find(s => s.id === selectedSize);
    if (sizeOption) {
      breakdown.push({ type: 'size', value: sizeOption.id, label: sizeOption.name, price: sizeOption.price });
      currentTotal += sizeOption.price;
    }

    const flavorOption = flavors.find(f => f.id === selectedFlavor);
    if (flavorOption) {
      breakdown.push({ type: 'flavor', value: flavorOption.id, label: flavorOption.name, price: flavorOption.price });
      currentTotal += flavorOption.price;
    }

    selectedFillings.forEach(item => {
      breakdown.push(item);
      currentTotal += item.price;
    });

    selectedCoverings.forEach(item => {
      breakdown.push(item);
      currentTotal += item.price;
    });

    selectedDecorations.forEach(item => {
      breakdown.push(item);
      currentTotal += item.price;
    });

    selectedSpecialOptions.forEach(item => {
      breakdown.push(item);
      currentTotal += item.price;
    });

    return { breakdown, total: currentTotal };
  }, [selectedSize, selectedFlavor, selectedFillings, selectedCoverings, selectedDecorations, selectedSpecialOptions, sizes, flavors]);

  const handleAddOption = (
    currentId: string,
    optionsList: QuoterOption[],
    setSelectedItems: React.Dispatch<React.SetStateAction<QuoteItem[]>>,
    type: QuoteItem['type'],
    errorMessage: string
  ) => {
    if (!currentId) {
      showError(errorMessage);
      return;
    }
    const optionToAdd = optionsList.find(o => o.id === currentId);
    if (optionToAdd && !setSelectedItems.arguments[0].some((item: QuoteItem) => item.value === currentId)) {
      setSelectedItems(prev => [...prev, { type, value: optionToAdd.id, label: optionToAdd.name, price: optionToAdd.price }]);
    } else if (optionToAdd) {
      showError('Esta opción ya ha sido añadida.');
    }
  };

  const handleRemoveOption = (
    value: string,
    setSelectedItems: React.Dispatch<React.SetStateAction<QuoteItem[]>>
  ) => {
    setSelectedItems(prev => prev.filter(item => item.value !== value));
  };

  const handleClearForm = () => {
    form.reset();
    setSelectedFillings([]);
    setSelectedCoverings([]);
    setSelectedDecorations([]);
    setSelectedSpecialOptions([]);
    setCurrentFillingId('');
    setCurrentCoveringId('');
    setCurrentDecorationId('');
    setCurrentSpecialOptionId('');
    showSuccess('Formulario de cotización limpiado.');
  };

  const handleAddToOrders = async (values: z.infer<typeof quoterSchema>) => {
    if (!session?.user?.id) {
      showError('No hay sesión de usuario activa.');
      return;
    }

    if (!selectedSize || !selectedFlavor) {
      showError('Por favor, selecciona un tamaño y un sabor para la cotización.');
      return;
    }

    if (selectedFillings.length === 0 && fillings.length > 0) {
      showError('Por favor, añade al menos un relleno.');
      return;
    }

    const customerName = values.customer_name || 'Cliente de Cotización';
    const totalAmount = quoteBreakdown.total;

    if (totalAmount <= 0) {
      showError('El monto total de la cotización debe ser mayor a $0.');
      return;
    }

    try {
      // 1. Crear el pedido en la tabla 'orders'
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session.user.id,
          customer_name: customerName,
          total_amount: totalAmount,
          status: 'pending', // Estado por defecto para cotizaciones convertidas en pedidos
        })
        .select()
        .single();

      if (orderError) {
        console.error("Error de Supabase al crear el pedido desde la cotización:", orderError);
        showError('Error al crear el pedido desde la cotización: ' + orderError.message);
        return;
      }
      if (!orderData) {
        console.error("No se recibieron datos del pedido después de la inserción desde la cotización.");
        showError('Error al crear el pedido: No se recibieron datos del pedido.');
        return;
      }

      const orderId = orderData.id;

      // 2. Insertar el ítem de pedido con los detalles de la cotización
      const { error: itemError } = await supabase.from('order_items').insert({
        order_id: orderId,
        product_id: '00000000-0000-0000-0000-000000000001', // UUID fijo para "Pastel Personalizado"
        quantity: 1,
        price_at_order: totalAmount,
        quote_details: quoteBreakdown.breakdown, // Almacenar el desglose detallado
      });

      if (itemError) {
        console.error("Error de Supabase al insertar el ítem de pedido para la cotización:", itemError);
        showError('Error al añadir el ítem de cotización al pedido: ' + itemError.message);
        // Opcionalmente, eliminar el pedido creado si falla la inserción del ítem
        await supabase.from('orders').delete().eq('id', orderId);
        return;
      }

      showSuccess('Cotización añadida a pedidos correctamente.');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      handleClearForm(); // Limpiar el formulario después de añadir con éxito
    } catch (error: any) {
      console.error("Error inesperado durante la conversión de cotización a pedido:", error);
      showError('Ocurrió un error inesperado: ' + error.message);
    }
  };

  if (isLoadingOptions) return <div>Cargando opciones de cotización...</div>;
  if (optionsError) return <div>Error al cargar opciones de cotización: {optionsError.message}</div>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Crea tu Pastel Personalizado</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddToOrders)} className="space-y-6">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej. Juan Pérez" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tamaño del Pastel</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tamaño" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sizes.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name} (${option.price.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="flavor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sabor del Pastel</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un sabor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {flavors.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name} (${option.price.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sección de Rellenos */}
            <div className="space-y-2">
              <FormLabel>Rellenos</FormLabel>
              <div className="flex gap-2">
                <Select onValueChange={setCurrentFillingId} value={currentFillingId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Añadir relleno" />
                  </SelectTrigger>
                  <SelectContent>
                    {fillings.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} (${option.price.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={() => handleAddOption(currentFillingId, fillings, setSelectedFillings, 'filling', 'Por favor, selecciona un relleno.')} size="icon">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              {selectedFillings.length === 0 && fillings.length > 0 && (
                <p className="text-sm text-muted-foreground">Añade al menos un relleno.</p>
              )}
              <ul className="space-y-2">
                {selectedFillings.map((item) => (
                  <li key={item.value} className="flex items-center justify-between rounded-md border p-2">
                    <span>{item.label} (${item.price.toFixed(2)})</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(item.value, setSelectedFillings)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sección de Coberturas */}
            <div className="space-y-2">
              <FormLabel>Coberturas</FormLabel>
              <div className="flex gap-2">
                <Select onValueChange={setCurrentCoveringId} value={currentCoveringId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Añadir cobertura" />
                  </SelectTrigger>
                  <SelectContent>
                    {coverings.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} (${option.price.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={() => handleAddOption(currentCoveringId, coverings, setSelectedCoverings, 'covering', 'Por favor, selecciona una cobertura.')} size="icon">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-2">
                {selectedCoverings.map((item) => (
                  <li key={item.value} className="flex items-center justify-between rounded-md border p-2">
                    <span>{item.label} (${item.price.toFixed(2)})</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(item.value, setSelectedCoverings)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sección de Decoraciones */}
            <div className="space-y-2">
              <FormLabel>Decoraciones Adicionales (Opcional)</FormLabel>
              <div className="flex gap-2">
                <Select onValueChange={setCurrentDecorationId} value={currentDecorationId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Añadir decoración" />
                  </SelectTrigger>
                  <SelectContent>
                    {decorations.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} (${option.price.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={() => handleAddOption(currentDecorationId, decorations, setSelectedDecorations, 'decoration', 'Por favor, selecciona una decoración.')} size="icon">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-2">
                {selectedDecorations.map((item) => (
                  <li key={item.value} className="flex items-center justify-between rounded-md border p-2">
                    <span>{item.label} (${item.price.toFixed(2)})</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(item.value, setSelectedDecorations)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sección de Opciones Especiales */}
            <div className="space-y-2">
              <FormLabel>Opciones Especiales (Opcional)</FormLabel>
              <div className="flex gap-2">
                <Select onValueChange={setCurrentSpecialOptionId} value={currentSpecialOptionId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Añadir opción especial" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} (${option.price.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={() => handleAddOption(currentSpecialOptionId, specialOptions, setSelectedSpecialOptions, 'special_option', 'Por favor, selecciona una opción especial.')} size="icon">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-2">
                {selectedSpecialOptions.map((item) => (
                  <li key={item.value} className="flex items-center justify-between rounded-md border p-2">
                    <span>{item.label} (${item.price.toFixed(2)})</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(item.value, setSelectedSpecialOptions)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Desglose de Precios */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Desglose de Cotización</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {quoteBreakdown.breakdown.length === 0 ? (
                    <li className="text-muted-foreground">Selecciona opciones para ver el desglose.</li>
                  ) : (
                    quoteBreakdown.breakdown.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{item.label}</span>
                        <span>${item.price.toFixed(2)}</span>
                      </li>
                    ))
                  )}
                </ul>
                <div className="mt-4 pt-2 border-t flex justify-between items-center font-bold text-lg">
                  <span>Total Estimado:</span>
                  <span>${quoteBreakdown.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClearForm}>
                Limpiar Formulario
              </Button>
              <Button type="submit">
                <Cake className="mr-2 h-4 w-4" />
                Añadir a Pedidos
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};