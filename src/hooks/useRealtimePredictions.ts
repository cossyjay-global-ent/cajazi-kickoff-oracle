import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useRealtimePredictions = (onUpdate?: () => void) => {
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
          console.log('Prediction updated:', payload);
          
          const prediction = payload.new as any;
          
          // Show notification if result changed
          if (prediction.result && prediction.result !== 'pending') {
            const resultText = prediction.result === 'won' ? '🎉 Won!' : '❌ Lost';
            const variant = prediction.result === 'won' ? 'default' : 'destructive';
            
            toast({
              title: `Prediction Result Updated`,
              description: `${prediction.match_name} - ${resultText}`,
              variant: variant as any,
            });
          }
          
          if (onUpdate) {
            onUpdate();
          }
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
          console.log('Bundle updated:', payload);
          
          const bundle = payload.new as any;
          
          // Show notification if final_status changed
          if (bundle.final_status && bundle.final_status !== 'pending') {
            const resultText = bundle.final_status === 'won' ? '🎉 Won!' : '❌ Lost';
            const variant = bundle.final_status === 'won' ? 'default' : 'destructive';
            
            toast({
              title: `Bundle Result Updated`,
              description: `${bundle.name} - ${resultText}`,
              variant: variant as any,
            });
          }
          
          if (onUpdate) {
            onUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
};
