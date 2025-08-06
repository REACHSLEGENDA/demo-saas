import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Utensils, ShoppingCart, DollarSign } from 'lucide-react'; // Import icons

const Index = () => {
  const { session } = useSession();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [criticalIngredientsCount, setCriticalIngredientsCount] = useState<number>(0);

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

    const fetchCriticalIngredients = async () => {
      if (session?.user?.id) {
        const { count, error } = await supabase
          .from('ingredients')
          .select('*', { count: 'exact' })
          .eq('user_id', session.user.id)
          .lte('stock', supabase.col('min_stock_level'));

        if (error) {
          console.error("Error fetching critical ingredients:", error);
          setCriticalIngredientsCount(0);
        } else {
          setCriticalIngredientsCount(count || 0);
        }
      }
    };

    fetchProfile();
    fetchCriticalIngredients();

    // Set up real-time subscription for ingredients
    const channel = supabase
      .channel('public:ingredients')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients', filter: `user_id=eq.${session?.user?.id}` },
        (payload) => {
          console.log('Change received!', payload);
          // Re-fetch critical ingredients on any change to the ingredients table
          fetchCriticalIngredients();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
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
              Productos en Stock
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,350</div>
            <p className="text-xs text-muted-foreground">
              +20.1% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingredientes Críticos
            </CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalIngredientsCount}</div>
            <p className="text-xs text-muted-foreground">
              Ingredientes con bajo stock
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
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +5 desde la semana pasada
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
            <div className="text-2xl font-bold">$1,234.50</div>
            <p className="text-xs text-muted-foreground">
              +10% desde ayer
            </p>
          </CardContent>
        </Card>
      </div>
      {/* You can add more dashboard content here */}
    </div>
  );
};

export default Index;