import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const profileSchema = z.object({
  first_name: z.string().optional().or(z.literal('')),
  last_name: z.string().optional().or(z.literal('')),
  avatar_url: z.string().url('URL de imagen inválida').optional().or(z.literal('')),
});

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export const ProfileSettingsForm: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id;

  const { data: profile, isLoading, error } = useQuery<Profile>({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !sessionLoading,
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      avatar_url: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!userId) {
      showError('No hay sesión de usuario activa.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: values.first_name || null,
        last_name: values.last_name || null,
        avatar_url: values.avatar_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      showError('Error al actualizar el perfil: ' + error.message);
    } else {
      showSuccess('Perfil actualizado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
    }
  };

  if (isLoading || sessionLoading) return <Card><CardHeader><CardTitle>Configuración de Perfil</CardTitle></CardHeader><CardContent>Cargando perfil...</CardContent></Card>;
  if (error) return <Card><CardHeader><CardTitle>Configuración de Perfil</CardTitle></CardHeader><CardContent>Error al cargar el perfil: {error.message}</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatar_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de Avatar</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};