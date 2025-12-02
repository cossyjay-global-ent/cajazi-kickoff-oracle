import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Trophy, Target, TrendingUp, Heart, Eye, Award, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  email: string;
  predictions_viewed: number;
  correct_predictions: number;
  created_at: string;
}

interface Prediction {
  id: string;
  match_name: string;
  prediction_text: string;
  odds: number;
  confidence: number;
  match_date: string;
  result: string;
  sport_category: string;
  created_at: string;
}

interface Favorite {
  id: string;
  prediction_id: string;
  favorited_at: string;
  predictions: Prediction;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewedPredictions, setViewedPredictions] = useState<Prediction[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to view your profile");
      navigate("/auth");
    } else {
      setUser(session.user);
    }
    setLoading(false);
  };

  const fetchProfileData = async () => {
    if (!user) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch viewed predictions
    const { data: viewsData } = await supabase
      .from('user_prediction_views')
      .select('prediction_id, viewed_at')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (viewsData && viewsData.length > 0) {
      const predictionIds = viewsData.map(v => v.prediction_id);
      const { data: predictionsData } = await supabase
        .from('predictions')
        .select('*')
        .in('id', predictionIds);
      
      if (predictionsData) {
        setViewedPredictions(predictionsData as Prediction[]);
      }
    }

    // Fetch favorites
    const { data: favoritesData } = await supabase
      .from('user_favorites')
      .select('id, prediction_id, favorited_at')
      .eq('user_id', user.id)
      .order('favorited_at', { ascending: false });

    if (favoritesData && favoritesData.length > 0) {
      const favPredictionIds = favoritesData.map(f => f.prediction_id).filter(Boolean);
      if (favPredictionIds.length > 0) {
        const { data: favPredictionsData } = await supabase
          .from('predictions')
          .select('*')
          .in('id', favPredictionIds);
        
        if (favPredictionsData) {
          const enrichedFavorites = favoritesData.map(fav => ({
            ...fav,
            predictions: favPredictionsData.find(p => p.id === fav.prediction_id)
          })).filter(f => f.predictions);
          
          setFavorites(enrichedFavorites as any);
        }
      }
    }

    // Fetch recent activity (last 5 viewed)
    const { data: activityData } = await supabase
      .from('user_prediction_views')
      .select('viewed_at, prediction_id')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(5);

    if (activityData) {
      setRecentActivity(activityData);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const successRate = profile.predictions_viewed > 0 
    ? ((profile.correct_predictions / profile.predictions_viewed) * 100).toFixed(1)
    : '0.0';

  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Card className="bg-card/80 backdrop-blur border-border mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center ring-4 ring-primary/20">
                  <User className="w-12 h-12 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-foreground mb-2">{user.email}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Member since {memberSince}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      <span>{profile.correct_predictions} Correct Predictions</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-sm">
                      {successRate}% Success Rate
                    </Badge>
                    {parseFloat(successRate) >= 70 && (
                      <Badge variant="default" className="text-sm">
                        <Award className="h-3 w-3 mr-1" />
                        Top Performer
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Eye className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{profile.predictions_viewed}</div>
                  <div className="text-xs text-muted-foreground">Predictions Viewed</div>
                </div>
                <div className="text-center p-4 bg-status-won/10 rounded-lg">
                  <Target className="h-6 w-6 text-status-won mx-auto mb-2" />
                  <div className="text-2xl font-bold text-status-won">{profile.correct_predictions}</div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-primary">{successRate}%</div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
                <div className="text-center p-4 bg-accent/10 rounded-lg">
                  <Heart className="h-6 w-6 text-accent mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{favorites.length}</div>
                  <div className="text-xs text-muted-foreground">Favorites</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different sections */}
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="history">Prediction History</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            {/* Prediction History */}
            <TabsContent value="history">
              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle>Your Prediction History</CardTitle>
                  <CardDescription>Predictions you've viewed recently</CardDescription>
                </CardHeader>
                <CardContent>
                  {viewedPredictions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No predictions viewed yet</p>
                  ) : (
                    <div className="space-y-4">
                      {viewedPredictions.map((prediction) => (
                        <div 
                          key={prediction.id}
                          className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-1">{prediction.match_name}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{prediction.prediction_text}</p>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Odds: {prediction.odds}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {prediction.sport_category || 'Football'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {format(new Date(prediction.match_date), 'MMM dd, yyyy')}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                                prediction.result === 'won' ? 'bg-status-won/10 text-status-won' :
                                prediction.result === 'lost' ? 'bg-status-lost/10 text-status-lost' :
                                'bg-status-pending/10 text-status-pending'
                              }`}>
                                {prediction.result === 'won' ? '✓ Won' :
                                 prediction.result === 'lost' ? '✗ Lost' :
                                 '⏳ Pending'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites */}
            <TabsContent value="favorites">
              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle>Your Favorite Predictions</CardTitle>
                  <CardDescription>Predictions you've marked as favorites</CardDescription>
                </CardHeader>
                <CardContent>
                  {favorites.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No favorites yet</p>
                  ) : (
                    <div className="space-y-4">
                      {favorites.map((favorite) => (
                        <div 
                          key={favorite.id}
                          className="p-4 bg-muted/30 rounded-lg border border-border hover:border-accent transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <Heart className="h-5 w-5 text-accent mt-1 flex-shrink-0" fill="currentColor" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-1">{favorite.predictions.match_name}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{favorite.predictions.prediction_text}</p>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Odds: {favorite.predictions.odds}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {favorite.predictions.sport_category || 'Football'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Added: {format(new Date(favorite.favorited_at), 'MMM dd, yyyy')}
                                </Badge>
                              </div>
                            </div>
                            <div className={`px-3 py-1 rounded text-xs font-semibold flex-shrink-0 ${
                              favorite.predictions.result === 'won' ? 'bg-status-won/10 text-status-won' :
                              favorite.predictions.result === 'lost' ? 'bg-status-lost/10 text-status-lost' :
                              'bg-status-pending/10 text-status-pending'
                            }`}>
                              {favorite.predictions.result === 'won' ? '✓ Won' :
                               favorite.predictions.result === 'lost' ? '✗ Lost' :
                               '⏳ Pending'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recent Activity */}
            <TabsContent value="activity">
              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest interactions with predictions</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No recent activity</p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((activity, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Eye className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-foreground">Viewed a prediction</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.viewed_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
