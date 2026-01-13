import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PredictionCard } from "@/components/PredictionCard";
import { FullPageState } from "@/components/FullPageState";
import { Star, Crown } from "lucide-react";

interface Prediction {
  id: string;
  match_name: string;
  prediction_text: string;
  odds: number;
  confidence: number;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [vipPredictions, setVipPredictions] = useState<Prediction[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchPredictions = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Fetch both in parallel for better performance
    const [freeResult, vipResult] = await Promise.all([
      supabase
        .from('predictions')
        .select('id, match_name, prediction_text, odds, confidence')
        .eq('prediction_type', 'free')
        .order('created_at', { ascending: false })
        .limit(2),
      supabase
        .from('predictions')
        .select('id, match_name, prediction_text, odds, confidence')
        .eq('prediction_type', 'vip')
        .order('created_at', { ascending: false })
        .limit(3)
    ]);

    if (freeResult.data) {
      setPredictions(freeResult.data);
    }

    if (vipResult.data && vipResult.data.length > 0) {
      setVipPredictions(vipResult.data);
      setHasSubscription(true);
    } else {
      setVipPredictions([]);
      setHasSubscription(false);
    }
    
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPredictions();
    }
  }, [user, fetchPredictions]);

  // Memoize rendered prediction cards
  const freePredictionCards = useMemo(() => (
    predictions.map((pred) => (
      <PredictionCard
        key={pred.id}
        match={pred.match_name}
        prediction={pred.prediction_text}
        odds={pred.odds}
        confidence={pred.confidence}
      />
    ))
  ), [predictions]);

  const vipPredictionCards = useMemo(() => (
    vipPredictions.map((pred) => (
      <PredictionCard
        key={pred.id}
        match={pred.match_name}
        prediction={pred.prediction_text}
        odds={pred.odds}
        confidence={pred.confidence}
      />
    ))
  ), [vipPredictions]);

  if (!user) {
    return (
      <FullPageState
        title="Loading"
        description="Checking your session…"
        variant="loading"
      />
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Welcome to Cajazi Prediction
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your ultimate destination for accurate soccer match predictions. We combine statistical
            analysis with expert insights to give you the winning edge.
          </p>
        </div>

        {/* VIP Predictions Section - Only for subscribed users */}
        {hasSubscription && vipPredictions.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">Your VIP Predictions</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {vipPredictionCards}
            </div>
          </div>
        )}

        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Star className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">Today's Featured Predictions</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {isLoading ? (
              <div className="text-center py-8 sm:py-12 bg-card/50 border border-border rounded-xl">
                <p className="text-muted-foreground text-sm sm:text-base">
                  Loading predictions...
                </p>
              </div>
            ) : predictions.length > 0 ? (
              freePredictionCards
            ) : (
              <div className="text-center py-8 sm:py-12 bg-card/50 border border-border rounded-xl">
                <p className="text-muted-foreground text-sm sm:text-base">
                  No predictions available for today. Check back soon!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
