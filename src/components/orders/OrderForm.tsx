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
  id?: string; // Optional for new items, present for existing ones
  product_id: string;
  name: string; // Product name
  price: number; // Price at order (price_at_order)
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
  items: z.array(orderItemSchema).optional(),
});

interface OrderFormProps {
  initialData?: any; // For editing existing orders
  onSuccess: () => void;
  onCancel: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  const [selectedProductsForOrder, setSelectedProductsForOrder] = useState<OrderItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);

  // Fetch available products (no stock filter, as orders are 'bajo pedido')
  const { data: availableProducts, isLoading: isLoadingProducts, error: productsError } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing order items when initialData is provided
  const { data: existingOrderItems, isLoading: isLoadingOrderItems, error: orderItemsError } = useQuery<OrderItem[]>({
    queryKey: ['orderItems', initialData?.id],
    queryFn: async () => {
      if (!initialData?.id) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          quantity,
          price_at_order,
          products (
            name
          )
        `)
        .eq('order_id', initialData.id);

      if (error) throw error;
      return data.map(item => ({
        id: item.id,
        product_id: item.product_id,
        name: item.products?.name || 'Producto Desconocido', // Handle case where product might be deleted
        price: item.price_at_order,
        quantity: item.quantity,
      }));
    },
    enabled: !!initialData?.id, // Only run query if initialData.id exists
  });

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_name: '',
      status: 'pending',
    },
  });

  // Calculate total amount dynamically
  const totalAmount = useMemo(() => {
    return selectedProductsForOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedProductsForOrder]);

  useEffect(() => {
    if (initialData) {
      form.reset({
        customer_name: initialData.customer_name || '',
        status: initialData.status,
      });
      if (existingOrderItems) {
        setSelectedProductsForOrder(existingOrderItems);
      }
    } else {
      form.reset();
      setSelectedProductsForOrder([]);
    }
  }, [initialData, form, existingOrderItems]);

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

    const existingItemIndex = selectedProductsForOrder.findIndex(item => item.product_id === currentProductId);

    if (existingItemIndex > -1) {
      const updatedItems = [...selectedProductsForOrder];
      updatedItems[existingItemIndex].quantity += currentQuantity;
      setSelectedProductsForOrder(updatedItems);
    } else {
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

    form.clearErrors('items');
    setCurrentProductId('');
    setCurrentQuantity(1);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProductsForOrder(selectedProductsForOrder.filter(item => item.product_id !== productId));
    // If removing the last product in a NEW order, set an error for 'items'
    if (!initialData && selectedProductsForOrder.length === 1) {
      form.setError('items', { message: 'Debe añadir al menos un producto al pedido.' });
    }
  };

  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    if (!session?.user?.id) {
      showError('No hay sesión de usuario activa.');
      return;
    }

    // Manual validation for selected products: ONLY for new orders
    if (!initialData && selectedProductsForOrder.length === 0) {
      form.setError('items', { message: 'Debe añadir al menos un producto al pedido.' });
      showError('Debe añadir al menos un producto al pedido.');
      return;
    } else {
      form.clearErrors('items');
    }

    if (initialData) {
      // UPDATE existing order
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          customer_name: values.customer_name || null,
          total_amount: totalAmount, // Always recalculate based on current items in form
          status: values.status,
        })
        .eq('id', initialData.id);

      if (orderUpdateError) {
        showError('Error al actualizar el pedido: ' + orderUpdateError.message);
        return;
      }

      // Handle order items update: Delete all existing and re-insert
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', initialData.id);

      if (deleteItemsError) {
        showError('Error al eliminar ítems antiguos del pedido: ' + deleteItemsError.message);
        return;
      }

      let allItemsInserted = true;
      for (const item of selectedProductsForOrder) {
        const { error: itemInsertError } = await supabase.from('order_items').insert({
          order_id: initialData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_order: item.price,
        });

        if (itemInsertError) {
          showError(`Error al añadir el ítem ${item.name}: ${itemInsertError.message}`);
          allItemsInserted = false;
          continue;
        }
      }

      if (allItemsInserted) {
        showSuccess('Pedido actualizado correctamente.');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['orderItems', initialData.id] });
        onSuccess();
      } else {
        showError('El pedido se actualizó, pero hubo problemas con algunos ítems. Revisa la consola para más detalles.');
      }

    } else {
      // Create new order (existing logic)
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

      if (orderError) {
        console.error("Supabase error creating order:", orderError);
        showError('Error al crear el pedido: ' + orderError.message);
        return;
      }
      if (!orderData) {
        console.error("No order data returned after insert.");
        showError('Error al crear el pedido: No se recibieron datos del pedido.');
        return;
      }

      const orderId = orderData.id;
      let allItemsInserted = true;

      for (const item of selectedProductsForOrder) {
        const { error: itemError } = await supabase.from('order_items').insert({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_order: item.price,
        });

        if (itemError) {
          console.error(`Supabase error inserting item ${item.name}:`, itemError);
          showError(`Error al añadir el ítem ${item.name}: ${itemError.message}`);
          allItemsInserted = false;
          continue;
        }
      }

      if (allItemsInserted) {
        showSuccess('Pedido creado correctamente.');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        onSuccess();
      } else {
        showError('El pedido se creó, pero hubo problemas con algunos ítems. Revisa la consola para más detalles.');
      }
    }
  };

  if (isLoadingProducts || isLoadingOrderItems) return <div>Cargando productos/detalles del pedido...</div>;
  if (productsError) return <div>Error al cargar productos: {productsError.message}</div>;
  if (orderItemsError) return <div>Error al cargar detalles del pedido: {orderItemsError.message}</div>;

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
          {form.formState.errors.items && (
            <FormMessage>{form.formState.errors.items.message}</FormMessage>
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