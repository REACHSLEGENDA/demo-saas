import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';

type UserRole = 'admin' | 'standard' | null;

export const useUserRole = () => {
  const { session, loading: sessionLoading } = useSession();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (sessionLoading) return;

      if (session?.user?.id) {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } else if (data) {
          setRole(data.role as UserRole);
        }
        setLoading(false);
      } else {
        setRole(null);
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [session, sessionLoading]);

  return { role, loading };
};