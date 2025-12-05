import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Users, Trophy, Calendar, TrendingUp, UserX } from "lucide-react";
import { format } from "date-fns";
import { useUserFollowers } from "@/hooks/useFollowSystem";

interface FollowingPrediction {
  id: string;
  match_name: string;
  prediction_text: string;
  odds: number;
  confidence: number;
  match_date: string;
  created_at: string;
  result: string | null;
  sport_category: string | null;
  created_by: string;
  creator_name: string;
}

const Following = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<FollowingPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const { following } = useUserFollowers(currentUserId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
      } else {
        navigate('/auth');
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (following.length > 0) {
      fetchFollowingPredictions();
    } else if (currentUserId && following.length === 0) {
      setLoading(false);
    }
  }, [following, currentUserId]);

  const fetchFollowingPredictions = async () => {
    setLoading(true);
    
    // Fetch predictions from followed users
    const { data: predictionsData, error } = await supabase
      .from('predictions')
      .select('*')
      .in('created_by', following)
      .eq('prediction_type', 'free')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching predictions:', error);
      setLoading(false);
      return;
    }

    // Fetch creator profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', following);

    const profileMap = new Map(
      profiles?.map(p => [p.id, p.display_name || p.email.split('@')[0]]) || []
    );

    const enrichedPredictions: FollowingPrediction[] = (predictionsData || []).map(p => ({
      ...p,
      creator_name: profileMap.get(p.created_by!) || 'Unknown User'
    }));

    setPredictions(enrichedPredictions);
    setLoading(false);
  };

  const getResultBadge = (result: string | null) => {
    if (!result || result === 'pending') {
      return <Badge variant="secondary">Pending</Badge>;
    }
    if (result === 'won') {
      return <Badge className="bg-chart-2 text-white">Won</Badge>;
    }
    return <Badge variant="destructive">Lost</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Following Feed</h1>
          <p className="text-muted-foreground">
            Predictions from users you follow
          </p>
        </div>
      </div>

      {following.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Not following anyone yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start following top predictors to see their predictions here
            </p>
            <Link to="/leaderboard">
              <Button>
                <Trophy className="h-4 w-4 mr-2" />
                View Leaderboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : predictions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No predictions yet</h3>
            <p className="text-muted-foreground text-center">
              Users you follow haven't made any predictions yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {predictions.map((prediction) => (
            <Card key={prediction.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Link 
                    to={`/user/${prediction.created_by}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {prediction.creator_name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(prediction.created_at), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                <CardTitle className="text-lg">{prediction.match_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {prediction.sport_category && (
                    <Badge variant="outline">{prediction.sport_category}</Badge>
                  )}
                  {getResultBadge(prediction.result)}
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <p className="font-medium">{prediction.prediction_text}</p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Odds: {prediction.odds}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(prediction.match_date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-primary font-medium">{prediction.confidence}% confidence</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Following;
