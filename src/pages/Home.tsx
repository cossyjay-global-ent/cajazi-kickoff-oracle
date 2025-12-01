import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PredictionCard } from "@/components/PredictionCard";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
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
    }
  }, [user]);

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

        <div className="mb-6">
          <h3 className="text-2xl font-bold text-foreground mb-4">Today's Featured Predictions</h3>
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