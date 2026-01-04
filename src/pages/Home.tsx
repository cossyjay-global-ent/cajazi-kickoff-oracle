import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PredictionCard } from "@/components/PredictionCard";
import { Star, Crown } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [vipPredictions, setVipPredictions] = useState<any[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchFeaturedPredictions();
      checkSubscription();
    }
  }, [user]);

  useEffect(() => {
    if (user && hasSubscription) {
      fetchVipPredictions();
    }
  }, [user, hasSubscription]);

  const checkSubscription = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    setHasSubscription(!!data);
  };

  const fetchFeaturedPredictions = async () => {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('prediction_type', 'free')
      .order('created_at', { ascending: false })
      .limit(2);

    if (data) {
      setPredictions(data);
    }
  };

  const fetchVipPredictions = async () => {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('prediction_type', 'vip')
      .order('created_at', { ascending: false })
      .limit(3);

    if (data) {
      setVipPredictions(data);
    }
  };

  if (!user) {
    return null;
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
              {vipPredictions.map((pred) => (
                <PredictionCard
                  key={pred.id}
                  match={pred.match_name}
                  prediction={pred.prediction_text}
                  odds={parseFloat(pred.odds)}
                  confidence={pred.confidence}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Star className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">Today's Featured Predictions</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {predictions.length > 0 ? (
              predictions.map((pred) => (
                <PredictionCard
                  key={pred.id}
                  match={pred.match_name}
                  prediction={pred.prediction_text}
                  odds={parseFloat(pred.odds)}
                  confidence={pred.confidence}
                />
              ))
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
