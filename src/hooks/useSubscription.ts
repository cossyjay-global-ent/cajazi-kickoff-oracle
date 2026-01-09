import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Subscription {
  id: string;
  user_id: string | null;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
  payment_email?: string | null;
  registration_status?: string | null;
}

export const useSubscription = (userId?: string, userEmail?: string) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (userId || userEmail) {
        await checkSubscription();
      } else {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, userEmail]);

  const checkSubscription = async () => {
    if (!userId && !userEmail) {
      setLoading(false);
      return;
    }

    try {
      // First try to find subscription by user_id (linked subscription)
      if (userId) {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (!error && data) {
          setHasSubscription(true);
          setSubscription(data);
          setLoading(false);
          return;
        }
      }

      // Fallback: check by email for subscriptions that haven't been linked yet
      if (userEmail) {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('payment_email', userEmail.toLowerCase())
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (!error && data) {
          // If found by email but not linked, trigger linking by updating the subscription
          if (!data.user_id && userId) {
            await supabase
              .from('subscriptions')
              .update({ user_id: userId, registration_status: 'registered' })
              .eq('id', data.id);
          }
          
          setHasSubscription(true);
          setSubscription(data);
          setLoading(false);
          return;
        }
      }

      // No active subscription found
      setHasSubscription(false);
      setSubscription(null);
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
