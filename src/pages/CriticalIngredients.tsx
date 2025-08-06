import React from 'react';
import { CriticalIngredientTable } from '@/components/ingredients/CriticalIngredientTable';

const CriticalIngredients = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Ingredientes Críticos</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Aquí puedes ver todos los ingredientes cuyo stock actual está por debajo de su nivel mínimo.
      </p>
      <CriticalIngredientTable />
    </div>
  );
};

export default CriticalIngredients;