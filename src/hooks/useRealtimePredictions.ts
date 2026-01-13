import { useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useRealtimePredictions = (onUpdate?: () => void) => {
  // Memoize the callback to prevent unnecessary effect re-runs
  const stableCallback = useCallback(() => {
    onUpdate?.();
  }, [onUpdate]);

  useEffect(() => {
    const channel = supabase
      .channel('prediction-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'predictions'
        },
        (payload) => {
          const prediction = payload.new as any;
          
          // Show notification if result changed
          if (prediction.result && prediction.result !== 'pending') {
            let resultText = '🎉 Won!';
            let variant: 'default' | 'destructive' = 'default';
            
            switch (prediction.result) {
              case 'lost':
                resultText = '❌ Lost';
                variant = 'destructive';
                break;
              case 'postponed':
                resultText = '⏸ Postponed';
                break;
              case 'void':
                resultText = '⊘ Void';
                break;
              case 'canceled':
                resultText = '✕ Canceled';
                break;
            }
            
            toast({
              title: `Prediction Result Updated`,
              description: `${prediction.match_name} - ${resultText}`,
              variant,
            });
          }
          
          stableCallback();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prediction_bundles'
        },
        (payload) => {
          const bundle = payload.new as any;
          
          // Show notification if final_status changed
          if (bundle.final_status && bundle.final_status !== 'pending') {
            let resultText = '🎉 Won!';
            let variant: 'default' | 'destructive' = 'default';
            
            switch (bundle.final_status) {
              case 'lost':
                resultText = '❌ Lost';
                variant = 'destructive';
                break;
              case 'postponed':
                resultText = '⏸ Postponed';
                break;
              case 'void':
                resultText = '⊘ Void';
                break;
              case 'canceled':
                resultText = '✕ Canceled';
                break;
            }
            
            toast({
              title: `Bundle Result Updated`,
              description: `${bundle.name} - ${resultText}`,
              variant,
            });
          }
          
          stableCallback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stableCallback]);
};
