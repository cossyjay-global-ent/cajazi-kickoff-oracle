import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePredictionTracking = (predictionId: string | null, bundleId: string | null) => {
  useEffect(() => {
    const trackView = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user || (!predictionId && !bundleId)) return;

      await supabase
        .from('user_prediction_views')
        .insert({
          user_id: session.user.id,
          prediction_id: predictionId || '',
          bundle_id: bundleId
        });
    };

    trackView();
  }, [predictionId, bundleId]);
};

export const useFavoriteToggle = () => {
  const toggleFavorite = async (predictionId: string | null, bundleId: string | null) => {
    const { data: { session } } = await supabase.auth.getSession();
    
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
  };

  const checkIsFavorite = async (predictionId: string | null, bundleId: string | null) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) return false;

    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('prediction_id', predictionId || '')
      .eq('bundle_id', bundleId || '')
      .maybeSingle();

    return !!data;
  };

  return { toggleFavorite, checkIsFavorite };
};
