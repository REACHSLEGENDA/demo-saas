import React, { useState } from 'react';
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
import { Edit, Trash2, PlusCircle } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { OptionForm } from './OptionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';

interface Option {
  id: string;
  category: string;
  name: string;
  price: number;
}

interface OptionTableProps {
  category: string;
  title: string;
}

export const OptionTable: React.FC<OptionTableProps> = ({ category, title }) => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user?.id;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<Option | null>(null);

  const { data: options, isLoading, error } = useQuery<Option[]>({
    queryKey: ['cakeQuoterOptions', category, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('cake_quoter_options')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId, // Only run query if userId is available
  });

  const handleAddOption = () => {
    setEditingOption(null);
    setIsFormOpen(true);
  };

  const handleEditOption = (option: Option) => {
    setEditingOption(option);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingOption(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${options?.find(o => o.id === id)?.name}"?`)) {
      return;
    }
    const { error } = await supabase.from('cake_quoter_options').delete().eq('id', id);
    if (error) {
      showError('Error al eliminar la opción: ' + error.message);
    } else {
      showSuccess('Opción eliminada correctamente.');
      queryClient.invalidateQueries({ queryKey: ['cakeQuoterOptions', category, userId] });
      queryClient.invalidateQueries({ queryKey: ['cakeQuoterOptions'] }); // Invalidate all options for the quoter form
    }
  };

  if (isLoading) return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>Cargando opciones...</CardContent></Card>;
  if (error) return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>Error al cargar opciones: {error.message}</CardContent></Card>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddOption} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingOption ? 'Editar Opción' : 'Añadir Nueva Opción'}</DialogTitle>
            </DialogHeader>
            <OptionForm
              category={category}
              initialData={editingOption}
              onSuccess={handleFormClose}
              onCancel={handleFormClose}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No hay opciones registradas para esta categoría.
                  </TableCell>
                </TableRow>
              ) : (
                options?.map((option) => (
                  <TableRow key={option.id}>
                    <TableCell className="font-medium">{option.name}</TableCell>
                    <TableCell>${option.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditOption(option)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(option.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};