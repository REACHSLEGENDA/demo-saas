import React from 'react';
import { SalesAnalytics } from '@/components/sales/SalesAnalytics';

const SalesManagement = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Gestión de Ventas</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <SalesAnalytics />
      </div>
    </div>
  );
};

export default SalesManagement;