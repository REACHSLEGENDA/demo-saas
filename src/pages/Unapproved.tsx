import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LogOut } from 'lucide-react';

const Unapproved = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Acceso Denegado</h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Tu cuenta aún no ha sido aprobada por un administrador. Por favor, espera la aprobación para acceder a la aplicación.
        </p>
        <Button onClick={handleLogout} variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};

export default Unapproved;