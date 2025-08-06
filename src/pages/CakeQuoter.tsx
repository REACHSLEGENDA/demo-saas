import React from 'react';
import { CakeQuoterForm } from '@/components/cake-quoter/CakeQuoterForm';

const CakeQuoter = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Cotizador de Pasteles</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <CakeQuoterForm />
      </div>
    </div>
  );
};

export default CakeQuoter;