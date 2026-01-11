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
            let resultText = '🎉 Won!';
            let variant = 'default';
            
            if (prediction.result === 'lost') {
              resultText = '❌ Lost';
              variant = 'destructive';
            } else if (prediction.result === 'postponed') {
              resultText = '⏸ Postponed';
              variant = 'default';
            } else if (prediction.result === 'void') {
              resultText = '⊘ Void';
              variant = 'default';
            } else if (prediction.result === 'canceled') {
              resultText = '✕ Canceled';
              variant = 'default';
            }
            
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
            let resultText = '🎉 Won!';
            let variant = 'default';
            
            if (bundle.final_status === 'lost') {
              resultText = '❌ Lost';
              variant = 'destructive';
            } else if (bundle.final_status === 'postponed') {
              resultText = '⏸ Postponed';
              variant = 'default';
            } else if (bundle.final_status === 'void') {
              resultText = '⊘ Void';
              variant = 'default';
            } else if (bundle.final_status === 'canceled') {
              resultText = '✕ Canceled';
              variant = 'default';
            }
            
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
