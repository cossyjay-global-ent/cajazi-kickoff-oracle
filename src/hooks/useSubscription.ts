import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
}

export const useSubscription = (userId?: string) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const checkSubscription = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error('Error checking subscription:', error);
        setHasSubscription(false);
        setSubscription(null);
      } else {
        setHasSubscription(!!data);
        setSubscription(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setHasSubscription(false);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    setLoading(true);
    checkSubscription();
  };

  return {
    subscription,
    hasSubscription,
    loading,
    refetch
  };
};
