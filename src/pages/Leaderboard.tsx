import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Crown, Star, Target, Award, TrendingUp, Eye, Heart, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserBadge } from "@/components/UserBadge";
import { RankBadge } from "@/components/RankBadge";

interface LeaderboardUser {
  id: string;
  email: string;
  display_name: string | null;
  predictions_viewed: number;
  correct_predictions: number;
  success_rate: number;
  unlocked_badges: number;
  featured_achievement: string | null;
  rank: number;
  xp_points: number;
  rank_tier: string;
}

interface Achievement {
  id: string;
  name: string;
  icon: any;
  requirement: number;
  color: string;
}

const ACHIEVEMENTS_LIST: Achievement[] = [
  { id: 'first_win', name: 'First Win', icon: Star, requirement: 1, color: 'text-yellow-500' },
  { id: 'ten_correct', name: '10 Correct', icon: Target, requirement: 10, color: 'text-blue-500' },
  { id: 'fifty_correct', name: '50 Correct', icon: Trophy, requirement: 50, color: 'text-purple-500' },
  { id: 'success_rate_70', name: '70% Rate', icon: TrendingUp, requirement: 70, color: 'text-green-500' },
  { id: 'success_rate_80', name: '80% Rate', icon: Award, requirement: 80, color: 'text-emerald-500' },
  { id: 'hundred_views', name: '100 Views', icon: Eye, requirement: 100, color: 'text-indigo-500' },
  { id: 'dedicated_fan', name: 'Dedicated Fan', icon: Heart, requirement: 10, color: 'text-pink-500' },
  { id: 'master_predictor', name: 'Master', icon: Crown, requirement: 100, color: 'text-amber-500' },
];

export default function Leaderboard() {
  const [topPerformers, setTopPerformers] = useState<LeaderboardUser[]>([]);
  const [topAchievers, setTopAchievers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to view the leaderboard");
      navigate("/auth");
      return;
    }
    setCurrentUserId(session.user.id);
    await fetchLeaderboards();
    setLoading(false);
  };

  const calculateUnlockedBadges = async (profile: any): Promise<number> => {
    let count = 0;
    const successRate = profile.predictions_viewed > 0 
      ? (profile.correct_predictions / profile.predictions_viewed) * 100 
      : 0;

    // Get favorites count for the user
    const { count: favoritesCount } = await supabase
      .from('user_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    // Check each achievement
    if (profile.correct_predictions >= 1) count++; // first_win
    if (profile.correct_predictions >= 10) count++; // ten_correct
    if (profile.correct_predictions >= 50) count++; // fifty_correct
    if (successRate >= 70) count++; // success_rate_70
    if (successRate >= 80) count++; // success_rate_80
    if (profile.predictions_viewed >= 100) count++; // hundred_views
    if ((favoritesCount || 0) >= 10) count++; // dedicated_fan
    if (profile.correct_predictions >= 100) count++; // master_predictor

    return count;
  };

  const fetchLeaderboards = async () => {
    // Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('correct_predictions', { ascending: false });

    if (!profiles) return;

    // Calculate badges and success rates for each user
    const usersWithStats: LeaderboardUser[] = await Promise.all(
      profiles.map(async (profile, index) => {
        const successRate = profile.predictions_viewed > 0 
          ? (profile.correct_predictions / profile.predictions_viewed) * 100 
          : 0;
        
        const unlockedBadges = await calculateUnlockedBadges(profile);

        return {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name || null,
          predictions_viewed: profile.predictions_viewed || 0,
          correct_predictions: profile.correct_predictions || 0,
          success_rate: successRate,
          unlocked_badges: unlockedBadges,
          featured_achievement: profile.featured_achievement || null,
          rank: index + 1,
          xp_points: profile.xp_points || 0,
          rank_tier: profile.rank_tier || 'Bronze',
        };
      })
    );

    // Top performers by success rate (min 5 predictions)
    const performers = [...usersWithStats]
      .filter(u => u.predictions_viewed >= 5)
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 10)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    // Top achievers by badges
    const achievers = [...usersWithStats]
      .sort((a, b) => {
        if (b.unlocked_badges !== a.unlocked_badges) {
          return b.unlocked_badges - a.unlocked_badges;
        }
        return b.correct_predictions - a.correct_predictions;
      })
      .slice(0, 10)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    setTopPerformers(performers);
    setTopAchievers(achievers);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/30";
      default:
        return "bg-card border-border";
    }
  };

  const getDisplayName = (user: LeaderboardUser) => {
    if (user.display_name) return user.display_name;
    const [name] = user.email.split('@');
    if (name.length <= 3) return name;
    return `${name.slice(0, 3)}***`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Leaderboard</h1>
            <p className="text-muted-foreground">See how you rank among other predictors</p>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-4 text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{topPerformers.length + topAchievers.length}</div>
                <div className="text-xs text-muted-foreground">Active Users</div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-4 text-center">
                <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {topPerformers[0]?.success_rate.toFixed(1) || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Top Success Rate</div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-4 text-center">
                <Medal className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {topAchievers[0]?.unlocked_badges || 0}
                </div>
                <div className="text-xs text-muted-foreground">Most Badges</div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-4 text-center">
                <Star className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{ACHIEVEMENTS_LIST.length}</div>
                <div className="text-xs text-muted-foreground">Total Badges</div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Tabs */}
          <Tabs defaultValue="performers" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="performers" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Performers
              </TabsTrigger>
              <TabsTrigger value="achievers" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Top Achievers
              </TabsTrigger>
            </TabsList>

            {/* Top Performers Tab */}
            <TabsContent value="performers">
              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Top Performers by Success Rate
                  </CardTitle>
                  <CardDescription>Users with the highest prediction accuracy (minimum 5 predictions)</CardDescription>
                </CardHeader>
                <CardContent>
                  {topPerformers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No users with enough predictions yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topPerformers.map((user) => (
                        <Link
                          key={user.id}
                          to={`/user/${user.id}`}
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:scale-[1.01] cursor-pointer ${getRankStyles(user.rank)} ${
                            user.id === currentUserId ? 'ring-2 ring-primary' : ''
                          }`}
                        >
                          <div className="w-10 flex justify-center">
                            {getRankIcon(user.rank)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground truncate">
                                {getDisplayName(user)}
                              </p>
                              {user.featured_achievement && (
                                <UserBadge achievementId={user.featured_achievement} size="sm" />
                              )}
                              <RankBadge rankTier={user.rank_tier} xpPoints={user.xp_points} size="sm" />
                              {user.id === currentUserId && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {user.correct_predictions} correct / {user.predictions_viewed} viewed
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {user.success_rate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Success Rate</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Top Achievers Tab */}
            <TabsContent value="achievers">
              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Top Achievers by Badges
                  </CardTitle>
                  <CardDescription>Users with the most unlocked achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  {topAchievers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No users with badges yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topAchievers.map((user) => (
                        <Link
                          key={user.id}
                          to={`/user/${user.id}`}
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:scale-[1.01] cursor-pointer ${getRankStyles(user.rank)} ${
                            user.id === currentUserId ? 'ring-2 ring-primary' : ''
                          }`}
                        >
                          <div className="w-10 flex justify-center">
                            {getRankIcon(user.rank)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground truncate">
                                {getDisplayName(user)}
                              </p>
                              {user.featured_achievement && (
                                <UserBadge achievementId={user.featured_achievement} size="sm" />
                              )}
                              <RankBadge rankTier={user.rank_tier} xpPoints={user.xp_points} size="sm" />
                              {user.id === currentUserId && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ACHIEVEMENTS_LIST.slice(0, user.unlocked_badges).map((achievement) => {
                                const Icon = achievement.icon;
                                return (
                                  <div
                                    key={achievement.id}
                                    className={`w-6 h-6 rounded-full bg-muted flex items-center justify-center ${achievement.color}`}
                                    title={achievement.name}
                                  >
                                    <Icon className="h-3 w-3" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {user.unlocked_badges}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              / {ACHIEVEMENTS_LIST.length} Badges
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Available Badges */}
          <Card className="bg-card/80 backdrop-blur border-border mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Available Badges
              </CardTitle>
              <CardDescription>All achievements you can unlock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ACHIEVEMENTS_LIST.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div
                      key={achievement.id}
                      className="p-4 rounded-lg bg-muted/30 border border-border text-center"
                    >
                      <div className={`w-12 h-12 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center ${achievement.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className="font-medium text-foreground text-sm">{achievement.name}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
