import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  loading: boolean;
  isApproved: boolean; // Add isApproved to the context
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false); // New state for approval status
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('aprobado')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user approval status:", error);
        setIsApproved(false);
      } else if (data) {
        setIsApproved(data.aprobado);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);

      if (currentSession) {
        await fetchUserProfile(currentSession.user.id); // Fetch approval status on session change
        if (location.pathname === '/login' || location.pathname === '/unapproved') {
          navigate('/');
        }
      } else {
        setIsApproved(false); // Reset approval status on sign out
        if (location.pathname !== '/login') {
          navigate('/login');
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
      if (currentSession) {
        await fetchUserProfile(currentSession.user.id); // Fetch approval status on initial load
        if (location.pathname === '/login' || location.pathname === '/unapproved') {
          navigate('/');
        }
      } else if (location.pathname !== '/login') {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <SessionContext.Provider value={{ session, loading, isApproved }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};