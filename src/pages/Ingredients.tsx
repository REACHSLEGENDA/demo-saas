import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { IngredientTable } from '@/components/ingredients/IngredientTable';
import { IngredientForm } from '@/components/ingredients/IngredientForm';

const Ingredients = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any | null>(null); // Type will be defined later

  const handleAddIngredient = () => {
    setEditingIngredient(null);
    setIsFormOpen(true);
  };

  const handleEditIngredient = (ingredient: any) => {
    setEditingIngredient(ingredient);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingIngredient(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Ingredientes</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddIngredient}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Ingrediente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingIngredient ? 'Editar Ingrediente' : 'Añadir Nuevo Ingrediente'}</DialogTitle>
            </DialogHeader>
            <IngredientForm
              initialData={editingIngredient}
              onSuccess={handleFormClose}
              onCancel={handleFormClose}
            />
          </DialogContent>
        </Dialog>
      </div>
      <IngredientTable onEdit={handleEditIngredient} />
    </div>
  );
};

export default Ingredients;