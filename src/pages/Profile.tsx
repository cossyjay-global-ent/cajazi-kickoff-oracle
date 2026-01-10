import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Trophy, Target, TrendingUp, Heart, Eye, Award, Calendar, Star, Zap, Crown, Medal, Gift, Flame, Check, Users, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAchievementNotifications } from "@/hooks/useAchievementNotifications";
import { UserBadge, SEASONAL_ACHIEVEMENTS } from "@/components/UserBadge";
import { useFollowSystem } from "@/hooks/useFollowSystem";
import { RankBadge, getRankNextMilestone } from "@/components/RankBadge";

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  predictions_viewed: number;
  correct_predictions: number;
  created_at: string;
  featured_achievement: string | null;
  xp_points: number;
  rank_tier: string;
}

interface SeasonalAchievement {
  id: string;
  achievement_id: string;
  season_type: string;
  season_start: string;
  season_end: string;
  unlocked_at: string;
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

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: any;
  requirement: number;
  unlocked: boolean;
  progress: number;
  color: string;
}

interface PerformanceTrend {
  date: string;
  successRate: number;
  total: number;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewedPredictions, setViewedPredictions] = useState<Prediction[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [performanceTrend, setPerformanceTrend] = useState<PerformanceTrend[]>([]);
  const [seasonalAchievements, setSeasonalAchievements] = useState<SeasonalAchievement[]>([]);
  const [settingFeatured, setSettingFeatured] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const navigate = useNavigate();
  
  // Follow system
  const { followersCount, followingCount } = useFollowSystem(user?.id || null, user?.id || null);
  
  // Track achievement unlocks and show notifications
  useAchievementNotifications(achievements);

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
      setProfile(profileData as UserProfile);
      setDisplayName(profileData.display_name || '');
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

    // Calculate achievements
    calculateAchievements(profileData, viewsData?.length || 0, favoritesData?.length || 0);

    // Calculate performance trend
    await calculatePerformanceTrend();
    
    // Fetch seasonal achievements
    await fetchSeasonalAchievements();
    
    // Check for new seasonal achievements
    await checkSeasonalAchievements(profileData);
  };

  const fetchSeasonalAchievements = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('seasonal_achievements')
      .select('*')
      .eq('user_id', user.id)
      .gte('season_end', new Date().toISOString())
      .order('unlocked_at', { ascending: false });
    
    if (data) {
      setSeasonalAchievements(data as SeasonalAchievement[]);
    }
  };

  const checkSeasonalAchievements = async (profile: UserProfile | null) => {
    if (!user || !profile) return;
    
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Get predictions viewed this week
    const { data: weekViews } = await supabase
      .from('user_prediction_views')
      .select('prediction_id')
      .eq('user_id', user.id)
      .gte('viewed_at', weekStart.toISOString())
      .lte('viewed_at', weekEnd.toISOString());
    
    if (weekViews && weekViews.length >= 5) {
      const predictionIds = weekViews.map(v => v.prediction_id);
      const { data: predictions } = await supabase
        .from('predictions')
        .select('id, result')
        .in('id', predictionIds);
      
      if (predictions) {
        const resolved = predictions.filter(p => p.result !== 'pending');
        const won = predictions.filter(p => p.result === 'won');
        
        // Check Perfect Week (100% success rate, min 5 predictions)
        if (resolved.length >= 5 && won.length === resolved.length) {
          await unlockSeasonalAchievement('perfect_week', 'weekly', weekStart, weekEnd);
        }
        
        // Check Hot Streak (5 correct in a row)
        if (won.length >= 5) {
          await unlockSeasonalAchievement('hot_streak', 'weekly', weekStart, weekEnd);
        }
      }
    }
  };

  const unlockSeasonalAchievement = async (
    achievementId: string, 
    seasonType: string, 
    seasonStart: Date, 
    seasonEnd: Date
  ) => {
    if (!user) return;
    
    // Check if already unlocked this season
    const { data: existing } = await supabase
      .from('seasonal_achievements')
      .select('id')
      .eq('user_id', user.id)
      .eq('achievement_id', achievementId)
      .eq('season_start', seasonStart.toISOString())
      .single();
    
    if (existing) return;
    
    // Insert new seasonal achievement
    const { error } = await supabase
      .from('seasonal_achievements')
      .insert({
        user_id: user.id,
        achievement_id: achievementId,
        season_type: seasonType,
        season_start: seasonStart.toISOString(),
        season_end: seasonEnd.toISOString(),
      });
    
    if (!error) {
      toast.success(`🔥 Seasonal Achievement Unlocked: ${achievementId.replace('_', ' ')}!`);
      await fetchSeasonalAchievements();
    }
  };

  const setFeaturedAchievement = async (achievementId: string | null) => {
    if (!user) return;
    
    setSettingFeatured(true);
    const { error } = await supabase
      .from('profiles')
      .update({ featured_achievement: achievementId })
      .eq('id', user.id);
    
    if (error) {
      toast.error("Failed to update featured badge");
    } else {
      setProfile(prev => prev ? { ...prev, featured_achievement: achievementId } : null);
      toast.success(achievementId ? "Featured badge updated!" : "Featured badge removed");
    }
    setSettingFeatured(false);
  };

  const saveDisplayName = async () => {
    if (!user) return;
    
    const trimmedName = displayName.trim();
    if (trimmedName.length > 50) {
      toast.error("Display name must be 50 characters or less");
      return;
    }
    
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmedName || null })
      .eq('id', user.id);
    
    if (error) {
      toast.error("Failed to update display name");
    } else {
      setProfile(prev => prev ? { ...prev, display_name: trimmedName || null } : null);
      toast.success("Display name updated!");
      setEditingName(false);
    }
    setSavingName(false);
  };

  const calculateAchievements = (profile: UserProfile, viewsCount: number, favoritesCount: number) => {
    const successRate = profile.predictions_viewed > 0 
      ? (profile.correct_predictions / profile.predictions_viewed) * 100 
      : 0;

    const achievementsList: Achievement[] = [
      {
        id: 'first_win',
        name: 'First Win',
        description: 'Your first correct prediction',
        icon: Star,
        requirement: 1,
        unlocked: profile.correct_predictions >= 1,
        progress: Math.min(profile.correct_predictions, 1),
        color: 'text-yellow-500'
      },
      {
        id: 'ten_correct',
        name: '10 Correct Predictions',
        description: 'Made 10 correct predictions',
        icon: Target,
        requirement: 10,
        unlocked: profile.correct_predictions >= 10,
        progress: Math.min(profile.correct_predictions, 10),
        color: 'text-blue-500'
      },
      {
        id: 'fifty_correct',
        name: '50 Correct Predictions',
        description: 'Made 50 correct predictions',
        icon: Trophy,
        requirement: 50,
        unlocked: profile.correct_predictions >= 50,
        progress: Math.min(profile.correct_predictions, 50),
        color: 'text-purple-500'
      },
      {
        id: 'success_rate_70',
        name: '70% Success Rate',
        description: 'Achieved 70% success rate',
        icon: TrendingUp,
        requirement: 70,
        unlocked: successRate >= 70,
        progress: Math.min(successRate, 70),
        color: 'text-green-500'
      },
      {
        id: 'success_rate_80',
        name: '80% Success Rate',
        description: 'Achieved 80% success rate',
        icon: Award,
        requirement: 80,
        unlocked: successRate >= 80,
        progress: Math.min(successRate, 80),
        color: 'text-emerald-500'
      },
      {
        id: 'hundred_views',
        name: '100 Predictions Viewed',
        description: 'Viewed 100 predictions',
        icon: Eye,
        requirement: 100,
        unlocked: profile.predictions_viewed >= 100,
        progress: Math.min(profile.predictions_viewed, 100),
        color: 'text-indigo-500'
      },
      {
        id: 'dedicated_fan',
        name: 'Dedicated Fan',
        description: 'Added 10 favorites',
        icon: Heart,
        requirement: 10,
        unlocked: favoritesCount >= 10,
        progress: Math.min(favoritesCount, 10),
        color: 'text-pink-500'
      },
      {
        id: 'master_predictor',
        name: 'Master Predictor',
        description: 'Made 100 correct predictions',
        icon: Crown,
        requirement: 100,
        unlocked: profile.correct_predictions >= 100,
        progress: Math.min(profile.correct_predictions, 100),
        color: 'text-amber-500'
      },
    ];

    setAchievements(achievementsList);
  };

  const calculatePerformanceTrend = async () => {
    if (!user) return;

    // Get views with their predictions over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: viewsData } = await supabase
      .from('user_prediction_views')
      .select('prediction_id, viewed_at')
      .eq('user_id', user.id)
      .gte('viewed_at', thirtyDaysAgo.toISOString())
      .order('viewed_at', { ascending: true });

    if (viewsData && viewsData.length > 0) {
      const predictionIds = viewsData.map(v => v.prediction_id);
      const { data: predictionsData } = await supabase
        .from('predictions')
        .select('id, result')
        .in('id', predictionIds);

      if (predictionsData) {
        // Group by week
        const weeklyData: { [key: string]: { correct: number; total: number } } = {};
        
        viewsData.forEach(view => {
          const prediction = predictionsData.find(p => p.id === view.prediction_id);
          if (prediction && prediction.result !== 'pending') {
            const weekStart = new Date(view.viewed_at);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
            const weekKey = format(weekStart, 'MMM dd');
            
            if (!weeklyData[weekKey]) {
              weeklyData[weekKey] = { correct: 0, total: 0 };
            }
            
            weeklyData[weekKey].total++;
            if (prediction.result === 'won') {
              weeklyData[weekKey].correct++;
            }
          }
        });

        const trendData: PerformanceTrend[] = Object.entries(weeklyData).map(([date, data]) => ({
          date,
          successRate: data.total > 0 ? (data.correct / data.total) * 100 : 0,
          total: data.total,
        }));

        setPerformanceTrend(trendData);
      }
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Card className="bg-card/80 backdrop-blur border-border mb-6 sm:mb-8">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center ring-4 ring-primary/20">
                    <User className="w-8 h-8 sm:w-12 sm:h-12 text-primary-foreground" />
                  </div>
                  {profile.featured_achievement && (
                    <div className="absolute -bottom-1 -right-1">
                      <UserBadge achievementId={profile.featured_achievement} size="md" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  {/* Display Name Section */}
                  <div className="flex items-center gap-2 mb-1">
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter display name"
                          className="max-w-xs"
                          maxLength={50}
                        />
                        <Button size="sm" onClick={saveDisplayName} disabled={savingName}>
                          {savingName ? "Saving..." : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingName(false);
                          setDisplayName(profile.display_name || '');
                        }}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-xl sm:text-3xl font-bold text-foreground">
                          {profile.display_name || user.email.split('@')[0]}
                        </h2>
                        {profile.featured_achievement && (
                          <UserBadge achievementId={profile.featured_achievement} size="md" />
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setEditingName(true)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{user.email}</p>
                  
                  {/* Follower Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{followersCount}</span>
                      <span className="text-muted-foreground">Followers</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-semibold text-foreground">{followingCount}</span>
                      <span className="text-muted-foreground">Following</span>
                    </div>
                  </div>
                  
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
                    <RankBadge 
                      rankTier={profile.rank_tier || 'Bronze'} 
                      xpPoints={profile.xp_points || 0} 
                      size="md" 
                      showXP={true}
                    />
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
                  {/* Next Rank Progress */}
                  {(() => {
                    const nextMilestone = getRankNextMilestone(profile.xp_points || 0);
                    if (nextMilestone) {
                      return (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {nextMilestone.pointsNeeded} XP to {nextMilestone.nextRank}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
                <div className="text-center p-2 sm:p-4 bg-purple-500/10 rounded-lg">
                  <Zap className="h-4 w-4 sm:h-6 sm:w-6 text-purple-500 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-purple-500">{profile.xp_points || 0}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">XP</div>
                </div>
                <div className="text-center p-2 sm:p-4 bg-muted/30 rounded-lg">
                  <Eye className="h-4 w-4 sm:h-6 sm:w-6 text-primary mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{profile.predictions_viewed}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Viewed</div>
                </div>
                <div className="text-center p-2 sm:p-4 bg-status-won/10 rounded-lg">
                  <Target className="h-4 w-4 sm:h-6 sm:w-6 text-status-won mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-status-won">{profile.correct_predictions}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Correct</div>
                </div>
                <div className="text-center p-2 sm:p-4 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-primary mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-primary">{successRate}%</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Rate</div>
                </div>
                <div className="text-center p-2 sm:p-4 bg-accent/10 rounded-lg col-span-2 sm:col-span-1">
                  <Heart className="h-4 w-4 sm:h-6 sm:w-6 text-accent mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{favorites.length}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Favorites</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Trend Chart */}
          {performanceTrend.length > 0 && (
            <Card className="bg-card/80 backdrop-blur border-border mb-6 sm:mb-8">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Performance Trend
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Success rate over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 10 }}
                      domain={[0, 100]}
                      width={35}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'successRate') return [`${value.toFixed(1)}%`, 'Success Rate'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      name="Success Rate"
                      dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Tracking your prediction accuracy week by week
                </div>
              </CardContent>
            </Card>
          )}

          {/* Achievements Section */}
          <Card className="bg-card/80 backdrop-blur border-border mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Achievements & Badges
              </CardTitle>
              <CardDescription>
                Unlock achievements by reaching milestones • {achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked
                {profile.featured_achievement && (
                  <span className="ml-2">• Featured: <span className="text-primary font-medium">{achievements.find(a => a.id === profile.featured_achievement)?.name}</span></span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  const isFeatured = profile.featured_achievement === achievement.id;
                  return (
                    <div 
                      key={achievement.id}
                      className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        achievement.unlocked 
                          ? isFeatured 
                            ? 'bg-primary/10 border-primary ring-2 ring-primary/50 shadow-lg shadow-primary/30' 
                            : 'bg-primary/5 border-primary shadow-lg shadow-primary/20 hover:ring-2 hover:ring-primary/30' 
                          : 'bg-muted/30 border-border opacity-60'
                      }`}
                      onClick={() => {
                        if (achievement.unlocked && !settingFeatured) {
                          setFeaturedAchievement(isFeatured ? null : achievement.id);
                        }
                      }}
                    >
                      {isFeatured && (
                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      {achievement.unlocked && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Medal className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          achievement.unlocked ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <Icon className={`h-6 w-6 ${achievement.unlocked ? achievement.color : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground">{achievement.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                        </div>
                        {!achievement.unlocked && (
                          <div className="w-full mt-2">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary rounded-full h-2 transition-all"
                                style={{ width: `${(achievement.progress / achievement.requirement) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {achievement.progress}/{achievement.requirement}
                            </p>
                          </div>
                        )}
                        {achievement.unlocked && (
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant={isFeatured ? "default" : "secondary"} className="text-xs">
                              {isFeatured ? (
                                <>
                                  <Star className="h-3 w-3 mr-1" />
                                  Featured
                                </>
                              ) : (
                                <>
                                  <Zap className="h-3 w-3 mr-1" />
                                  Click to feature
                                </>
                              )}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Seasonal Achievements Section */}
          <Card className="bg-card/80 backdrop-blur border-border mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Seasonal Achievements
              </CardTitle>
              <CardDescription>
                Time-limited achievements that reset weekly or monthly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SEASONAL_ACHIEVEMENTS.map((achievement) => {
                  const Icon = achievement.icon;
                  const isUnlocked = seasonalAchievements.some(s => s.achievement_id === achievement.id);
                  return (
                    <div 
                      key={achievement.id}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        isUnlocked 
                          ? 'bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/50 shadow-lg' 
                          : 'bg-muted/30 border-border opacity-70'
                      }`}
                    >
                      {isUnlocked && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center animate-pulse">
                          <Flame className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                          isUnlocked 
                            ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20' 
                            : 'bg-muted'
                        }`}>
                          <Icon className={`h-7 w-7 ${isUnlocked ? achievement.color : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{achievement.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                        </div>
                        <Badge variant={isUnlocked ? "default" : "outline"} className={`text-xs ${isUnlocked ? 'bg-gradient-to-r from-orange-500 to-red-500' : ''}`}>
                          {achievement.type === 'weekly' ? '🔄 Weekly' : '📅 Monthly'}
                        </Badge>
                        {isUnlocked && (
                          <p className="text-xs text-primary font-medium">
                            ✨ Unlocked this {achievement.type === 'weekly' ? 'week' : 'month'}!
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
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
