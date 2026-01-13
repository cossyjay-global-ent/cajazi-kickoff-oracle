import { useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePredictionTracking = (predictionId: string | null, bundleId: string | null) => {
  useEffect(() => {
    let mounted = true;
    
    const trackView = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted || !session?.user || (!predictionId && !bundleId)) return;

      await supabase
        .from('user_prediction_views')
        .insert({
          user_id: session.user.id,
          prediction_id: predictionId || '',
          bundle_id: bundleId
        });
    };

    trackView();
    
    return () => { mounted = false; };
  }, [predictionId, bundleId]);
};

// Cache session to avoid repeated calls
let cachedSession: { user: { id: string } } | null = null;
let sessionPromise: Promise<any> | null = null;

const getSession = async () => {
  if (cachedSession) return cachedSession;
  if (sessionPromise) return sessionPromise;
  
  sessionPromise = supabase.auth.getSession().then(({ data: { session } }) => {
    cachedSession = session;
    sessionPromise = null;
    return session;
  });
  
  return sessionPromise;
};

// Listen for auth changes to invalidate cache
supabase.auth.onAuthStateChange(() => {
  cachedSession = null;
});

export const useFavoriteToggle = () => {
  const toggleFavorite = useCallback(async (predictionId: string | null, bundleId: string | null) => {
    const session = await getSession();
    
    if (!session?.user) return false;

    // Check if already favorited
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('prediction_id', predictionId || '')
      .eq('bundle_id', bundleId || '')
      .maybeSingle();

    if (existing) {
      // Remove favorite
      await supabase
        .from('user_favorites')
        .delete()
        .eq('id', existing.id);
      return false;
    } else {
      // Add favorite
      await supabase
        .from('user_favorites')
        .insert({
          user_id: session.user.id,
          prediction_id: predictionId,
          bundle_id: bundleId
        });
      return true;
    }
  }, []);

  const checkIsFavorite = useCallback(async (predictionId: string | null, bundleId: string | null) => {
    const session = await getSession();
    
    if (!session?.user) return false;

    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('prediction_id', predictionId || '')
      .eq('bundle_id', bundleId || '')
      .maybeSingle();

    return !!data;
  }, []);

  return useMemo(() => ({ toggleFavorite, checkIsFavorite }), [toggleFavorite, checkIsFavorite]);
};
