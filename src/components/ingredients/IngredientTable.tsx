import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock_level: number;
}

interface IngredientTableProps {
  onEdit: (ingredient: Ingredient) => void;
}

export const IngredientTable: React.FC<IngredientTableProps> = ({ onEdit }) => {
  const queryClient = useQueryClient();

  const { data: ingredients, isLoading, error } = useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ingredients').select('*');
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este ingrediente?')) {
      return;
    }
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) {
      showError('Error al eliminar el ingrediente: ' + error.message);
    } else {
      showSuccess('Ingrediente eliminado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    }
  };

  if (isLoading) return <div>Cargando ingredientes...</div>;
  if (error) return <div>Error al cargar ingredientes: {error.message}</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Stock Mínimo</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredients?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No hay ingredientes registrados.
              </TableCell>
            </TableRow>
          ) : (
            ingredients?.map((ingredient) => (
              <TableRow key={ingredient.id}>
                <TableCell className="font-medium">{ingredient.name}</TableCell>
                <TableCell>{ingredient.unit}</TableCell>
                <TableCell>{ingredient.stock}</TableCell>
                <TableCell>{ingredient.min_stock_level}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(ingredient)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ingredient.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};