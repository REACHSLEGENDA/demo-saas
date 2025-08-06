import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Utensils, ShoppingCart, DollarSign } from 'lucide-react'; // Removed AlertTriangle icon

const Index = () => {
  const { session } = useSession();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [totalIngredientsCount, setTotalIngredientsCount] = useState<number>(0);
  const [productCount, setProductCount] = useState<number>(0);
  // const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0); // Placeholder for future feature
  // const [todaySales, setTodaySales] = useState<number>(0); // Placeholder for future feature

  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (data) {
          setFirstName(data.first_name);
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

    fetchProfile();
    fetchTotalIngredientsCount();
    fetchProductCount();

    // Set up real-time subscription for ingredients
    const ingredientsChannel = supabase
      .channel('public:ingredients')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients', filter: `user_id=eq.${session?.user?.id}` },
        (payload) => {
          console.log('Change received from ingredients!', payload);
          fetchTotalIngredientsCount(); // Re-fetch total ingredients on any change
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
          fetchProductCount(); // Re-fetch product count on any change
        }
      )
      .subscribe();

    return () => {
      ingredientsChannel.unsubscribe();
      productsChannel.unsubscribe();
    };
  }, [session]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">
          Bienvenido, {firstName || session?.user?.email || "Usuario"}!
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
            <div className="text-2xl font-bold">0</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground">
              (Funcionalidad próxima)
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
            <div className="text-2xl font-bold">$0.00</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground">
              (Funcionalidad próxima)
            </p>
          </CardContent>
        </Card>
      </div>
      {/* You can add more dashboard content here */}
    </div>
  );
};

export default Index;