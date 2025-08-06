import React from 'react';
import { POSForm } from '@/components/pos/POSForm';

const POS = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Punto de Venta</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <POSForm />
      </div>
    </div>
  );
};

export default POS;