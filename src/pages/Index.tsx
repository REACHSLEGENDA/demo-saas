import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Utensils, ShoppingCart, DollarSign } from 'lucide-react';

const Index = () => {
  const { session } = useSession();
  const [userName, setUserName] = useState<string | null>(null); // Changed from firstName to userName
  const [totalIngredientsCount, setTotalIngredientsCount] = useState<number>(0);
  const [productCount, setProductCount] = useState<number>(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, username') // Fetch username as well
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (data) {
          setUserName(data.username || data.first_name || "Usuario"); // Prefer username, then first_name, then default
        }
      }
    };

    const fetchTotalIngredientsCount = async () => {
      if (session?.user?.id) {
        const { count, error } = await supabase
          .from('ingredients')
          .select('*', { count: 'exact' })
          .eq('user_id', session.user.id);

        if (error) {
          console.error("Error fetching total ingredients:", error);
          setTotalIngredientsCount(0);
        } else {
          setTotalIngredientsCount(count || 0);
        }
      }
    };

    const fetchProductCount = async () => {
      if (session?.user?.id) {
        const { count, error } = await supabase
          .from('products')
          .select('*', { count: 'exact' })
          .eq('user_id', session.user.id);

        if (error) {
          console.error("Error fetching product count:", error);
          setProductCount(0);
        } else {
          setProductCount(count || 0);
        }
      }
    };

    const fetchPendingOrdersCount = async () => {
      if (session?.user?.id) {
        const { count, error } = await supabase
          .from('orders')
          .select('*', { count: 'exact' })
          .eq('user_id', session.user.id)
          .eq('status', 'pending');

        if (error) {
          console.error("Error fetching pending orders:", error);
          setPendingOrdersCount(0);
        } else {
          setPendingOrdersCount(count || 0);
        }
      }
    };

    fetchProfile();
    fetchTotalIngredientsCount();
    fetchProductCount();
    fetchPendingOrdersCount();

    // Set up real-time subscription for ingredients
    const ingredientsChannel = supabase
      .channel('public:ingredients')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients', filter: `user_id=eq.${session?.user?.id}` },
        (payload) => {
          console.log('Change received from ingredients!', payload);
          fetchTotalIngredientsCount();
        }
      )
      .subscribe();

    // Set up real-time subscription for products
    const productsChannel = supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${session?.user?.id}` },
        (payload) => {
          console.log('Change received from products!', payload);
          fetchProductCount();
        }
      )
      .subscribe();

    // Set up real-time subscription for orders
    const ordersChannel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${session?.user?.id}` },
        (payload) => {
          console.log('Change received from orders!', payload);
          fetchPendingOrdersCount();
        }
      )
      .subscribe();

    return () => {
      ingredientsChannel.unsubscribe();
      productsChannel.unsubscribe();
      ordersChannel.unsubscribe();
    };
  }, [session]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">
          Bienvenido, {userName || "Usuario"}! {/* Display username */}
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productos Registrados
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-muted-foreground">
              Total de productos en tu inventario
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingredientes
            </CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIngredientsCount}</div>
            <p className="text-xs text-muted-foreground">
              Total de ingredientes registrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos Pendientes
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrdersCount}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos en estado pendiente
            </p>
          </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas Hoy
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              (Funcionalidad próxima)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;