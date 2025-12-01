import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Star, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface ViewHistory {
  id: string;
  prediction_id: string;
  bundle_id: string | null;
  viewed_at: string;
  prediction: any;
  bundle: any;
}

interface Favorite {
  id: string;
  prediction_id: string | null;
  bundle_id: string | null;
  favorited_at: string;
  prediction: any;
  bundle: any;
}

export default function History() {
  const [viewHistory, setViewHistory] = useState<ViewHistory[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchFavorites();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_prediction_views')
      .select(`
        *,
        prediction:predictions(*),
        bundle:prediction_bundles(*)
      `)
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(50);

    if (data) {
      setViewHistory(data as ViewHistory[]);
    }
    setLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_favorites')
      .select(`
        *,
        prediction:predictions(*),
        bundle:prediction_bundles(*)
      `)
      .eq('user_id', user.id)
      .order('favorited_at', { ascending: false });

    if (data) {
      setFavorites(data as Favorite[]);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Prediction History</h1>
          <p className="text-muted-foreground">Please login to view your history.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">Prediction History</h1>
        <p className="text-muted-foreground mb-8">Track your viewed predictions and favorites</p>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              View History ({viewHistory.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Favorites ({favorites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {viewHistory.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No viewing history yet. Start exploring predictions!</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {viewHistory.map((item) => (
                  <Card key={item.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Viewed {format(new Date(item.viewed_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        {item.prediction ? (
                          <>
                            <h3 className="font-semibold text-lg text-foreground mb-2">
                              {item.prediction.match_name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                Prediction: <span className="text-foreground font-medium">{item.prediction.prediction_text}</span>
                              </span>
                              <span className="text-muted-foreground">
                                Odds: <span className="text-primary font-bold">{item.prediction.odds}</span>
                              </span>
                              <span className={`font-medium ${
                                item.prediction.result === 'won' ? 'text-green-600' :
                                item.prediction.result === 'lost' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {item.prediction.result?.toUpperCase() || 'PENDING'}
                              </span>
                            </div>
                          </>
                        ) : item.bundle ? (
                          <>
                            <h3 className="font-semibold text-lg text-foreground mb-2">
                              {item.bundle.name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                Total Odds: <span className="text-primary font-bold">{item.bundle.total_odds}</span>
                              </span>
                              <span className={`font-medium ${
                                item.bundle.final_status === 'won' ? 'text-green-600' :
                                item.bundle.final_status === 'lost' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {item.bundle.final_status?.toUpperCase() || 'PENDING'}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {favorites.length === 0 ? (
              <Card className="p-8 text-center">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No favorites yet. Star your favorite predictions!</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {favorites.map((item) => (
                  <Card key={item.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm text-muted-foreground">
                            Favorited {format(new Date(item.favorited_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        {item.prediction ? (
                          <>
                            <h3 className="font-semibold text-lg text-foreground mb-2">
                              {item.prediction.match_name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                Prediction: <span className="text-foreground font-medium">{item.prediction.prediction_text}</span>
                              </span>
                              <span className="text-muted-foreground">
                                Odds: <span className="text-primary font-bold">{item.prediction.odds}</span>
                              </span>
                              <span className={`font-medium ${
                                item.prediction.result === 'won' ? 'text-green-600' :
                                item.prediction.result === 'lost' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {item.prediction.result?.toUpperCase() || 'PENDING'}
                              </span>
                            </div>
                          </>
                        ) : item.bundle ? (
                          <>
                            <h3 className="font-semibold text-lg text-foreground mb-2">
                              {item.bundle.name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                Total Odds: <span className="text-primary font-bold">{item.bundle.total_odds}</span>
                              </span>
                              <span className={`font-medium ${
                                item.bundle.final_status === 'won' ? 'text-green-600' :
                                item.bundle.final_status === 'lost' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {item.bundle.final_status?.toUpperCase() || 'PENDING'}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
