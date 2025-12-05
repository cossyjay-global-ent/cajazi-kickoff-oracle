import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Users, Trophy, Calendar, TrendingUp, UserX, Filter, Star, UserPlus, Shield } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useUserFollowers, useFollowSystem } from "@/hooks/useFollowSystem";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface RecommendedUser {
  id: string;
  display_name: string | null;
  email: string;
  correct_predictions: number;
  total_predictions: number;
  success_rate: number;
  isAdmin: boolean;
}

const Following = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<FollowingPrediction[]>([]);
  const [filteredPredictions, setFilteredPredictions] = useState<FollowingPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const { following, refetch: refetchFollowing } = useUserFollowers(currentUserId);

  // Filters
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sportCategories, setSportCategories] = useState<string[]>([]);

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
    if (currentUserId) {
      fetchRecommendedUsers();
    }
  }, [currentUserId, following]);

  useEffect(() => {
    if (following.length > 0) {
      fetchFollowingPredictions();
    } else if (currentUserId && following.length === 0) {
      setLoading(false);
    }
  }, [following, currentUserId]);

  useEffect(() => {
    applyFilters();
  }, [predictions, sportFilter, resultFilter, dateFilter]);

  const fetchRecommendedUsers = async () => {
    setLoadingRecommended(true);
    
    // Fetch all profiles with their prediction counts
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email, correct_predictions')
      .neq('id', currentUserId || '');

    if (!profiles) {
      setLoadingRecommended(false);
      return;
    }

    // Check which users are admins
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    // Get prediction counts for each user
    const userIds = profiles.map(p => p.id);
    const { data: predictionCounts } = await supabase
      .from('predictions')
      .select('created_by')
      .in('created_by', userIds);

    const countMap = new Map<string, number>();
    predictionCounts?.forEach(p => {
      if (p.created_by) {
        countMap.set(p.created_by, (countMap.get(p.created_by) || 0) + 1);
      }
    });

    const usersWithStats: RecommendedUser[] = profiles
      .map(p => {
        const totalPredictions = countMap.get(p.id) || 0;
        const correctPredictions = p.correct_predictions || 0;
        const successRate = totalPredictions > 0 
          ? Math.round((correctPredictions / totalPredictions) * 100) 
          : 0;
        return {
          id: p.id,
          display_name: p.display_name,
          email: p.email,
          correct_predictions: correctPredictions,
          total_predictions: totalPredictions,
          success_rate: successRate,
          isAdmin: adminUserIds.has(p.id),
        };
      })
      .filter(u => !following.includes(u.id) && u.total_predictions > 0)
      .sort((a, b) => b.success_rate - a.success_rate || b.correct_predictions - a.correct_predictions)
      .slice(0, 6);

    setRecommendedUsers(usersWithStats);
    setLoadingRecommended(false);
  };

  const fetchFollowingPredictions = async () => {
    setLoading(true);
    
    const { data: predictionsData, error } = await supabase
      .from('predictions')
      .select('*')
      .in('created_by', following)
      .eq('prediction_type', 'free')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching predictions:', error);
      setLoading(false);
      return;
    }

    // Get unique sport categories
    const categories = [...new Set(predictionsData?.map(p => p.sport_category).filter(Boolean) as string[])];
    setSportCategories(categories);

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

  const applyFilters = () => {
    let filtered = [...predictions];

    // Sport category filter
    if (sportFilter !== "all") {
      filtered = filtered.filter(p => p.sport_category === sportFilter);
    }

    // Result filter
    if (resultFilter !== "all") {
      filtered = filtered.filter(p => {
        if (resultFilter === "pending") return !p.result || p.result === "pending";
        return p.result === resultFilter;
      });
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;
      
      switch (dateFilter) {
        case "today":
          startDate = startOfDay(now);
          break;
        case "week":
          startDate = subDays(now, 7);
          break;
        case "month":
          startDate = subDays(now, 30);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(p => new Date(p.created_at) >= startDate);
    }

    setFilteredPredictions(filtered);
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

  const DiscoverSection = () => (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Discover Top Predictors
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingRecommended ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : recommendedUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No more users to recommend
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedUsers.map((user) => (
              <UserRecommendCard 
                key={user.id} 
                user={user} 
                currentUserId={currentUserId}
                onFollow={refetchFollowing}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading && following.length > 0) {
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

      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="feed">My Feed</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
        </TabsList>

        <TabsContent value="discover">
          <DiscoverSection />
        </TabsContent>

        <TabsContent value="feed">
          {/* Filters */}
          {predictions.length > 0 && (
            <Card className="mb-6">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Filters</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select value={sportFilter} onValueChange={setSportFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sport Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sports</SelectItem>
                      {sportCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={resultFilter} onValueChange={setResultFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Results</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

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
          ) : filteredPredictions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No predictions match your filters</h3>
                <p className="text-muted-foreground text-center">
                  Try adjusting the filters to see more predictions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPredictions.map((prediction) => (
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Separate component for user recommendation card
const UserRecommendCard = ({ 
  user, 
  currentUserId, 
  onFollow 
}: { 
  user: RecommendedUser; 
  currentUserId: string | null;
  onFollow: () => void;
}) => {
  const { toggleFollow, loading, isFollowing } = useFollowSystem(user.id, currentUserId);

  const handleFollow = async () => {
    await toggleFollow();
    onFollow();
  };

  const displayName = user.display_name || user.email.split('@')[0];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <Link to={`/user/${user.id}`} className="hover:underline">
            <div className="flex items-center gap-2">
              <span className="font-medium">{displayName}</span>
              {user.isAdmin && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              )}
            </div>
          </Link>
          <Button
            size="sm"
            variant={isFollowing ? "outline" : "default"}
            onClick={handleFollow}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : isFollowing ? (
              "Following"
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Follow
              </>
            )}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted/50 rounded p-2">
            <span className="text-muted-foreground">Success Rate</span>
            <p className="font-semibold text-chart-2">{user.success_rate}%</p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <span className="text-muted-foreground">Predictions</span>
            <p className="font-semibold">{user.total_predictions}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Following;
