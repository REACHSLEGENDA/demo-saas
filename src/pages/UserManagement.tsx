import React from 'react';
import { UserRegistrationForm } from '@/components/users/UserRegistrationForm';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const UserManagement = () => {
  const { role, loading } = useUserRole();

  if (loading) {
    return <div>Cargando permisos...</div>;
  }

  if (role !== 'admin') {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No tienes permisos para acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Gestión de Usuarios</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <UserRegistrationForm />
        {/* Potentially add a user list/table here later */}
      </div>
    </div>
  );
};

export default UserManagement;