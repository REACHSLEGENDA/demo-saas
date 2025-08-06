import React from 'react';
import { OptionTable } from '@/components/cake-quoter-settings/OptionTable';

const CakeQuoterSettings = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Configuración de Cotizador de Pasteles</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <OptionTable category="sizes" title="Tamaños de Pastel" />
        <OptionTable category="flavors" title="Sabores de Pastel" />
        <OptionTable category="fillings" title="Rellenos" />
        <OptionTable category="coverings" title="Coberturas" />
        <OptionTable category="decorations" title="Decoraciones Adicionales" />
        <OptionTable category="special_options" title="Opciones Especiales" />
      </div>
    </div>
  );
};

export default CakeQuoterSettings;