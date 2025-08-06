import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock_level: number;
}

export const CriticalIngredientTable: React.FC = () => {
  const { data: criticalIngredients, isLoading, error } = useQuery<Ingredient[]>({
    queryKey: ['criticalIngredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .lte('stock', supabase.col('min_stock_level')); // Filter for critical ingredients
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds to keep updated
  });

  if (isLoading) return <div>Cargando ingredientes críticos...</div>;
  if (error) return <div>Error al cargar ingredientes críticos: {error.message}</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead>Stock Actual</TableHead>
            <TableHead>Stock Mínimo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {criticalIngredients?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No hay ingredientes con stock crítico. ¡Todo en orden!
              </TableCell>
            </TableRow>
          ) : (
            criticalIngredients?.map((ingredient) => (
              <TableRow key={ingredient.id} className="bg-red-50/50 dark:bg-red-950/20">
                <TableCell className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  {ingredient.name}
                </TableCell>
                <TableCell>{ingredient.unit}</TableCell>
                <TableCell className="text-destructive font-semibold">{ingredient.stock}</TableCell>
                <TableCell>{ingredient.min_stock_level}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};