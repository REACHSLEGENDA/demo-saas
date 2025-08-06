import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LogOut } from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-gray-600 dark:text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!session) {
    // This case should ideally be handled by the SessionContextProvider redirect,
    // but as a fallback, we can render nothing or a redirect message.
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 justify-between">
          <div className="md:hidden">
            {/* Mobile sidebar trigger is handled within Sidebar component */}
            <Sidebar />
          </div>
          <h1 className="text-xl font-semibold">SweetTrack Dashboard</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Cerrar sesión</span>
          </Button>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Outlet /> {/* This is where nested routes will render */}
        </main>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default DashboardLayout;