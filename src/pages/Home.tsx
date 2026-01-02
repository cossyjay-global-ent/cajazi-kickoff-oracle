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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome to Cajazi Prediction
          </h2>
          <p className="text-muted-foreground">
            Your ultimate destination for accurate soccer match predictions. We combine statistical
            analysis with expert insights to give you the winning edge.
          </p>
        </div>

        {/* VIP Predictions Section - Only for subscribed users */}
        {hasSubscription && vipPredictions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-6 w-6 text-primary" />
              <h3 className="text-2xl font-bold text-foreground">Your VIP Predictions</h3>
            </div>
            <div className="space-y-4">
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

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-6 w-6 text-muted-foreground" />
            <h3 className="text-2xl font-bold text-foreground">Today's Featured Predictions</h3>
          </div>
          <div className="space-y-4">
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
              <>
                <PredictionCard
                  match="Manchester United vs Liverpool"
                  prediction="1X"
                  odds={2.45}
                  confidence={75}
                />
                <PredictionCard
                  match="Barcelona vs Real Madrid"
                  prediction="Over 2.5"
                  odds={1.85}
                  confidence={82}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
