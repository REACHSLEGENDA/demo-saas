import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  username: string | null;
  role: 'admin' | 'usuario' | 'standard' | null; // 'standard' for backward compatibility if needed
}

interface SessionContextType {
  session: Session | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isUser: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          showError('Error al cargar el perfil del usuario.');
          setUserProfile(null);
        } else {
          setUserProfile(profileData as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const fetchProfileOnAuthChange = async () => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching user profile on auth change:', profileError);
            showError('Error al cargar el perfil del usuario.');
            setUserProfile(null);
          } else {
            setUserProfile(profileData as UserProfile);
          }
        };
        fetchProfileOnAuthChange();
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = userProfile?.role === 'admin';
  const isUser = userProfile?.role === 'usuario';

  return (
    <SessionContext.Provider value={{ session, userProfile, isLoading, isAdmin, isUser }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};