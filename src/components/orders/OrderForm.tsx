import React, { useEffect, useState, useMemo } from 'react';
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
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';

// Define Product type for fetching
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

// Define OrderItem type for form state
interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

const orderItemSchema = z.object({
  product_id: z.string().min(1, 'Producto requerido'),
  quantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  ),
});

const orderSchema = z.object({
  customer_name: z.string().optional().or(z.literal('')),
  status: z.enum(['pending', 'completed', 'cancelled'], {
    required_error: 'El estado es requerido',
  }),
  items: z.array(orderItemSchema).min(1, 'Debe añadir al menos un producto al pedido.'),
});

interface OrderFormProps {
  initialData?: any; // For editing existing orders, though item editing will be complex
  onSuccess: () => void;
  onCancel: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  const [selectedProductsForOrder, setSelectedProductsForOrder] = useState<OrderItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);

  // Fetch available products (removed stock filter)
  const { data: availableProducts, isLoading: isLoadingProducts, error: productsError } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_name: '',
      status: 'pending',
      items: [],
    },
  });

  // Calculate total amount dynamically
  const totalAmount = useMemo(() => {
    return selectedProductsForOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedProductsForOrder]);

  useEffect(() => {
    // When editing an existing order, populate the form with its items
    // NOTE: This initialData handling for items is simplified.
    // A full implementation for editing order items would be more complex,
    // involving fetching existing order_items and managing their state.
    if (initialData) {
      form.reset({
        customer_name: initialData.customer_name || '',
        status: initialData.status,
        items: [], // We won't pre-populate items for editing for now to keep it simple
      });
      // If you need to edit items, you'd fetch them here and set setSelectedProductsForOrder
    } else {
      form.reset();
      setSelectedProductsForOrder([]);
    }
  }, [initialData, form]);

  const handleAddProduct = () => {
    if (!currentProductId || currentQuantity <= 0) {
      showError('Por favor, selecciona un producto y una cantidad válida.');
      return;
    }

    const productToAdd = availableProducts?.find(p => p.id === currentProductId);

    if (!productToAdd) {
      showError('Producto no encontrado.');
      return;
    }

    // Removed stock check as per new requirement: "no descuentes nada del stock"
    // if (currentQuantity > productToAdd.stock) {
    //   showError(`No hay suficiente stock para ${productToAdd.name}. Stock disponible: ${productToAdd.stock}`);
    //   return;
    // }

    const existingItemIndex = selectedProductsForOrder.findIndex(item => item.product_id === currentProductId);

    if (existingItemIndex > -1) {
      // Update quantity if product already exists in the list
      const updatedItems = [...selectedProductsForOrder];
      updatedItems[existingItemIndex].quantity += currentQuantity;
      setSelectedProductsForOrder(updatedItems);
    } else {
      // Add new product to the list
      setSelectedProductsForOrder([
        ...selectedProductsForOrder,
        {
          product_id: productToAdd.id,
          name: productToAdd.name,
          price: productToAdd.price,
          quantity: currentQuantity,
        },
      ]);
    }

    // Reset product selection and quantity
    setCurrentProductId('');
    setCurrentQuantity(1);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProductsForOrder(selectedProductsForOrder.filter(item => item.product_id !== productId));
  };

  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    if (!session?.user?.id) {
      showError('No hay sesión de usuario activa.');
      return;
    }

    if (selectedProductsForOrder.length === 0) {
      showError('Debe añadir al menos un producto al pedido.');
      return;
    }

    // 1. Create the order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: session.user.id,
        customer_name: values.customer_name || null,
        total_amount: totalAmount,
        status: values.status,
      })
      .select()
      .single();

    if (orderError || !orderData) {
      showError('Error al crear el pedido: ' + (orderError?.message || 'Desconocido'));
      return;
    }

    const orderId = orderData.id;
    let allItemsInserted = true;

    // 2. Insert order items (stock update logic removed)
    for (const item of selectedProductsForOrder) {
      // Insert into order_items
      const { error: itemError } = await supabase.from('order_items').insert({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_order: item.price,
      });

      if (itemError) {
        showError(`Error al añadir el ítem ${item.name}: ${itemError.message}`);
        allItemsInserted = false;
        // Consider rolling back the order here if this is critical
        continue;
      }
      // Stock update logic removed as per user request
    }

    if (allItemsInserted) {
      showSuccess('Pedido creado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // No need to invalidate products query for stock changes
      onSuccess();
    } else {
      showError('El pedido se creó, pero hubo problemas con algunos ítems.');
      // You might want to implement more robust error handling/rollback here
    }
  };

  if (isLoadingProducts) return <div>Cargando productos disponibles...</div>;
  if (productsError) return <div>Error al cargar productos: {productsError.message}</div>;

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

        <div className="space-y-2">
          <FormLabel>Productos del Pedido</FormLabel>
          <div className="flex gap-2">
            <Select onValueChange={setCurrentProductId} value={currentProductId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (${product.price.toFixed(2)}) - Stock: {product.stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Cantidad"
              value={currentQuantity}
              onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
              min="1"
              className="w-24"
            />
            <Button type="button" onClick={handleAddProduct} size="icon">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          {selectedProductsForOrder.length === 0 && (
            <p className="text-sm text-muted-foreground">Añade productos al pedido.</p>
          )}
          <ul className="space-y-2">
            {selectedProductsForOrder.map((item) => (
              <li key={item.product_id} className="flex items-center justify-between rounded-md border p-2">
                <span>
                  {item.name} x {item.quantity} (${(item.price * item.quantity).toFixed(2)})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveProduct(item.product_id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
          {form.formState.errors.items && (
            <FormMessage>{form.formState.errors.items.message}</FormMessage>
          )}
        </div>

        <FormItem>
          <FormLabel>Monto Total</FormLabel>
          <FormControl>
            <Input value={`$${totalAmount.toFixed(2)}`} readOnly className="font-bold text-lg" />
          </FormControl>
        </FormItem>

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