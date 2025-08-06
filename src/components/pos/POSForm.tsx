import React, { useState, useMemo } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, ShoppingCart } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  available_stock: number; // To keep track of stock at time of adding
}

const posSchema = z.object({
  customer_name: z.string().optional().or(z.literal('')), // Make customer name optional
});

export const POSForm: React.FC = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user?.id;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const form = useForm<z.infer<typeof posSchema>>({
    resolver: zodResolver(posSchema),
    defaultValues: {
      customer_name: '', // Default to empty string
    },
  });

  // Fetch available products
  const { data: products, isLoading: isLoadingProducts, error: productsError } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const handleAddProductToCart = () => {
    if (!selectedProductId || quantity <= 0) {
      showError('Por favor, selecciona un producto y una cantidad válida.');
      return;
    }

    const productToAdd = products?.find(p => p.id === selectedProductId);

    if (!productToAdd) {
      showError('Producto no encontrado.');
      return;
    }

    if (productToAdd.stock < quantity) {
      showError(`No hay suficiente stock para ${productToAdd.name}. Stock disponible: ${productToAdd.stock}`);
      return;
    }

    const existingItemIndex = cart.findIndex(item => item.product_id === selectedProductId);

    if (existingItemIndex > -1) {
      const updatedCart = [...cart];
      const newQuantity = updatedCart[existingItemIndex].quantity + quantity;
      if (productToAdd.stock < newQuantity) {
        showError(`No puedes añadir más de ${productToAdd.stock} unidades de ${productToAdd.name}.`);
        return;
      }
      updatedCart[existingItemIndex].quantity = newQuantity;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          product_id: productToAdd.id,
          name: productToAdd.name,
          price: productToAdd.price,
          quantity: quantity,
          available_stock: productToAdd.stock, // Store initial stock for reference
        },
      ]);
    }

    setSelectedProductId('');
    setQuantity(1);
  };

  const handleRemoveProductFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    form.reset({ customer_name: '' }); // Reset customer name field
    showSuccess('Carrito limpiado.');
  };

  const handleFinalizeSale = async (values: z.infer<typeof posSchema>) => {
    if (!session?.user?.id) {
      showError('No hay sesión de usuario activa.');
      return;
    }

    if (cart.length === 0) {
      showError('El carrito está vacío. Añade productos para realizar una venta.');
      return;
    }

    if (totalAmount <= 0) {
      showError('El monto total de la venta debe ser mayor a $0.');
      return;
    }

    try {
      // 1. Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session.user.id,
          customer_name: values.customer_name || null, // Use optional customer name
          total_amount: totalAmount,
          status: 'completed', // POS sales are typically completed immediately
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
      let allItemsProcessed = true;

      // 2. Insert order items and update product stock
      for (const item of cart) {
        // Insert order item
        const { error: itemError } = await supabase.from('order_items').insert({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_order: item.price,
        });

        if (itemError) {
          console.error(`Supabase error inserting item ${item.name}:`, itemError);
          showError(`Error al añadir el ítem ${item.name} al pedido: ${itemError.message}`);
          allItemsProcessed = false;
          continue;
        }

        // Update product stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: item.available_stock - item.quantity }) // Deduct sold quantity
          .eq('id', item.product_id);

        if (stockError) {
          console.error(`Supabase error updating stock for ${item.name}:`, stockError);
          showError(`Error al actualizar el stock de ${item.name}: ${stockError.message}`);
          allItemsProcessed = false;
          continue;
        }
      }

      if (allItemsProcessed) {
        showSuccess('Venta realizada correctamente y stock actualizado.');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate products to reflect stock changes
        handleClearCart(); // Clear cart after successful sale
      } else {
        showError('La venta se creó, pero hubo problemas con algunos ítems o la actualización de stock. Revisa la consola.');
      }
    } catch (error: any) {
      console.error("Error inesperado durante la venta:", error);
      showError('Ocurrió un error inesperado: ' + error.message);
    }
  };

  if (isLoadingProducts) return <div>Cargando datos del POS...</div>;
  if (productsError) return <div>Error al cargar productos: {productsError.message}</div>;

  const availableProductsForSelection = products?.filter(p => p.stock > 0) || [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Realizar Nueva Venta</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinalizeSale)} className="space-y-6">
            {/* Sección de Nombre del Cliente (Opcional) */}
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre del cliente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sección de Añadir Productos */}
            <div className="space-y-2">
              <FormLabel>Añadir Productos al Carrito</FormLabel>
              <div className="flex gap-2">
                <Select onValueChange={setSelectedProductId} value={selectedProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProductsForSelection.length === 0 ? (
                      <SelectItem value="no-products" disabled>No hay productos disponibles</SelectItem>
                    ) : (
                      availableProductsForSelection.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (${product.price.toFixed(2)}) - Stock: {product.stock}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-24"
                />
                <Button type="button" onClick={handleAddProductToCart} size="icon" disabled={!selectedProductId || availableProductsForSelection.length === 0}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Carrito de Compras */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Carrito de Compras</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unitario</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          El carrito está vacío.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cart.map((item) => (
                        <TableRow key={item.product_id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                          <TableCell>${(item.price * item.quantity).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveProductFromCart(item.product_id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="mt-4 pt-2 border-t flex justify-between items-center font-bold text-lg">
                  <span>Total a Pagar:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClearCart}>
                Limpiar Carrito
              </Button>
              <Button type="submit" disabled={cart.length === 0}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Finalizar Venta
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};