import React, { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button'; // Importar el componente Button

const Login = () => {
  const [currentView, setCurrentView] = useState<'sign_in' | 'sign_up'>('sign_in');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Bienvenido a SweetTrack</CardTitle>
          <CardDescription>
            {currentView === 'sign_in' ? 'Inicia sesión para continuar' : 'Regístrate para crear una cuenta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6 space-x-4">
            <Button
              variant={currentView === 'sign_in' ? 'default' : 'outline'}
              onClick={() => setCurrentView('sign_in')}
            >
              Iniciar Sesión
            </Button>
            <Button
              variant={currentView === 'sign_up' ? 'default' : 'outline'}
              onClick={() => setCurrentView('sign_up')}
            >
              Registrarse
            </Button>
          </div>

          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="light"
            view={currentView} // Controla la vista actual
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  email_input_placeholder: 'Tu correo electrónico',
                  password_input_placeholder: 'Tu contraseña',
                  button_label: 'Iniciar sesión',
                  social_provider_text: 'Iniciar sesión con {{provider}}',
                  link_text: '', // Oculta el enlace "Ya tienes una cuenta? Inicia sesión"
                },
                sign_up: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  email_input_placeholder: 'Tu correo electrónico',
                  password_input_placeholder: 'Tu contraseña',
                  button_label: 'Registrarse',
                  social_provider_text: 'Registrarse con {{provider}}',
                  link_text: '', // Oculta el enlace "No tienes una cuenta? Regístrate"
                },
                forgotten_password: {
                  email_label: 'Correo electrónico',
                  password_reset_button_label: 'Enviar instrucciones de restablecimiento',
                  link_text: '¿Olvidaste tu contraseña?',
                },
                update_password: {
                  password_label: 'Nueva contraseña',
                  password_input_placeholder: 'Tu nueva contraseña',
                  button_label: 'Actualizar contraseña',
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;