import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

// Define schemas for login forms
const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const Login = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('user'); // Default to user login

  const userLoginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const adminLoginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      // Call the custom login-with-username Edge Function
      const { data, error } = await supabase.functions.invoke('login-with-username', {
        body: {
          username: values.username,
          password: values.password,
        },
      });

      if (error) {
        showError('Error al iniciar sesión: ' + error.message);
        return;
      }

      if (data?.session) {
        // Supabase client will automatically update its session
        showSuccess('Sesión iniciada correctamente.');
        navigate('/'); // Redirect to dashboard
      } else {
        showError('Credenciales inválidas. Por favor, verifica tu nombre de usuario y contraseña.');
      }
    } catch (error: any) {
      console.error('Error inesperado durante el inicio de sesión:', error);
      showError('Ocurrió un error inesperado: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Bienvenido a SweetTrack</CardTitle>
          <CardDescription>Inicia sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="user">Login de Usuario</TabsTrigger>
              <TabsTrigger value="admin">Login de Administrador</TabsTrigger>
            </TabsList>
            <TabsContent value="user" className="mt-4">
              <form onSubmit={userLoginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="user-username">Nombre de Usuario</label>
                  <Input
                    id="user-username"
                    placeholder="Tu nombre de usuario"
                    {...userLoginForm.register('username')}
                  />
                  {userLoginForm.formState.errors.username && (
                    <p className="text-sm font-medium text-destructive">
                      {userLoginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="user-password">Contraseña</label>
                  <Input
                    id="user-password"
                    type="password"
                    placeholder="Tu contraseña"
                    {...userLoginForm.register('password')}
                  />
                  {userLoginForm.formState.errors.password && (
                    <p className="text-sm font-medium text-destructive">
                      {userLoginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Iniciar Sesión
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="admin" className="mt-4">
              <form onSubmit={adminLoginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="admin-username">Nombre de Usuario (Admin)</label>
                  <Input
                    id="admin-username"
                    placeholder="Nombre de usuario de administrador"
                    {...adminLoginForm.register('username')}
                  />
                  {adminLoginForm.formState.errors.username && (
                    <p className="text-sm font-medium text-destructive">
                      {adminLoginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="admin-password">Contraseña (Admin)</label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Contraseña de administrador"
                    {...adminLoginForm.register('password')}
                  />
                  {adminLoginForm.formState.errors.password && (
                    <p className="text-sm font-medium text-destructive">
                      {adminLoginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Iniciar Sesión como Admin
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;