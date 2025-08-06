import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';

const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { session, isLoading: isSessionLoading } = useSession();
  const [activeTab, setActiveTab] = useState('user');

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  React.useEffect(() => {
    if (!isSessionLoading && session) {
      // If already logged in, redirect to home
      navigate('/');
    }
  }, [session, isSessionLoading, navigate]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    // Step 1: Get user's email by username using the Supabase function
    const { data: emailData, error: emailError } = await supabase.rpc('get_user_email_by_username', {
      p_username: values.username,
    });

    if (emailError || !emailData) {
      showError('Nombre de usuario o contraseña incorrectos.');
      console.error('Error fetching email by username:', emailError);
      return;
    }

    const userEmail = emailData;

    // Step 2: Sign in with the retrieved email and provided password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: values.password,
    });

    if (signInError) {
      showError('Nombre de usuario o contraseña incorrectos.');
      console.error('Error signing in:', signInError);
      return;
    }

    // Step 3: Verify user role after successful sign-in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Error al obtener la información del usuario.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      showError('Error al verificar el rol del usuario.');
      console.error('Error fetching profile for role check:', profileError);
      await supabase.auth.signOut(); // Sign out if role cannot be determined
      return;
    }

    if (activeTab === 'admin' && profile.role !== 'admin') {
      showError('Acceso denegado: Solo administradores pueden iniciar sesión aquí.');
      await supabase.auth.signOut(); // Sign out if not an admin
      return;
    }

    if (activeTab === 'user' && profile.role !== 'usuario') {
      showError('Acceso denegado: Solo usuarios pueden iniciar sesión aquí.');
      await supabase.auth.signOut(); // Sign out if not a regular user
      return;
    }

    showSuccess('Inicio de sesión exitoso.');
    navigate('/');
  };

  if (isSessionLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Bienvenido a SweetTrack
        </h2>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">Login de Usuario</TabsTrigger>
            <TabsTrigger value="admin">Login de Administrador</TabsTrigger>
          </TabsList>
          <TabsContent value="user">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de Usuario</FormLabel>
                      <FormControl>
                        <Input placeholder="tu_usuario" {...field} />
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
                <Button type="submit" className="w-full">
                  Iniciar Sesión como Usuario
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="admin">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de Usuario</FormLabel>
                      <FormControl>
                        <Input placeholder="admin_usuario" {...field} />
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
                <Button type="submit" className="w-full">
                  Iniciar Sesión como Administrador
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;