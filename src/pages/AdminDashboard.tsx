import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';

const registerUserSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'usuario'], {
    required_error: 'El rol es requerido',
  }),
});

const AdminDashboard: React.FC = () => {
  const { isAdmin, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof registerUserSchema>>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'usuario',
    },
  });

  React.useEffect(() => {
    if (!isSessionLoading && !isAdmin) {
      showError('Acceso denegado: Solo administradores pueden acceder a esta página.');
      navigate('/');
    }
  }, [isAdmin, isSessionLoading, navigate]);

  const onSubmit = async (values: z.infer<typeof registerUserSchema>) => {
    // Supabase admin.auth.createUser requires an email. We'll use a dummy email
    // and rely on the username for login. The handle_new_user function will
    // correctly set the username and role in the profiles table.
    const dummyEmail = `${values.username}@sweettrack.com`;

    const { data, error } = await supabase.auth.admin.createUser({
      email: dummyEmail,
      password: values.password,
      email_confirm: true, // Automatically confirm email for admin-created users
      user_metadata: {
        username: values.username,
        role: values.role,
      },
    });

    if (error) {
      showError('Error al registrar usuario: ' + error.message);
      console.error('Error registering user:', error);
      return;
    }

    showSuccess(`Usuario '${values.username}' registrado como ${values.role}.`);
    form.reset();
  };

  if (isSessionLoading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Panel de Administración - SweetTrack
        </h2>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Registrar Nuevo Usuario</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de Usuario</FormLabel>
                  <FormControl>
                    <Input placeholder="nuevo_usuario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="usuario">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Registrar Usuario
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AdminDashboard;