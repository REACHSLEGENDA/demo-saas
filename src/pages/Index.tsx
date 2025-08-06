import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const Index = () => {
  const { session, userProfile, isLoading, isAdmin } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Error al cerrar sesión: ' + error.message);
    } else {
      showSuccess('Sesión cerrada correctamente.');
      navigate('/auth');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          Bienvenido a SweetTrack
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          ¡Tu solución para la gestión de pastelerías!
        </p>
        {session && userProfile ? (
          <div className="mt-6 p-4 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-lg text-gray-700 dark:text-gray-200">
              Has iniciado sesión como: <span className="font-semibold">{userProfile.username}</span>
            </p>
            <p className="text-md text-gray-500 dark:text-gray-400">
              Rol: <span className="font-medium capitalize">{userProfile.role}</span>
            </p>
            {isAdmin && (
              <Button onClick={() => navigate('/admin/users')} className="mt-4">
                Ir al Panel de Administración
              </Button>
            )}
            <Button onClick={handleLogout} variant="destructive" className="mt-4 ml-2">
              Cerrar Sesión
            </Button>
          </div>
        ) : (
          <Button onClick={() => navigate('/auth')} className="mt-6">
            Iniciar Sesión
          </Button>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;