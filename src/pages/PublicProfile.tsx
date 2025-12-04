import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Trophy, Target, TrendingUp, Calendar, Eye, Star, Award, Heart, Crown, Flame, Zap } from "lucide-react";
import { format } from "date-fns";
import { UserBadge, SEASONAL_ACHIEVEMENTS, getAchievementConfig } from "@/components/UserBadge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface PublicUserProfile {
  id: string;
  email: string;
  display_name: string | null;
  predictions_viewed: number;
  correct_predictions: number;
  created_at: string;
  featured_achievement: string | null;
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

interface SeasonalAchievement {
  id: string;
  achievement_id: string;
  season_type: string;
  season_start: string;
  season_end: string;
  unlocked_at: string;
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [seasonalAchievements, setSeasonalAchievements] = useState<SeasonalAchievement[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    setLoading(true);
    
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(profileData as PublicUserProfile);
    calculateAchievements(profileData as PublicUserProfile);
    
    // Fetch seasonal achievements
    const { data: seasonalData } = await supabase
      .from('seasonal_achievements')
      .select('*')
      .eq('user_id', userId)
      .gte('season_end', new Date().toISOString())
      .order('unlocked_at', { ascending: false });
    
    if (seasonalData) {
      setSeasonalAchievements(seasonalData as SeasonalAchievement[]);
    }

    setLoading(false);
  };

  const calculateAchievements = (profile: PublicUserProfile) => {
    const successRate = profile.predictions_viewed > 0 
      ? (profile.correct_predictions / profile.predictions_viewed) * 100 
      : 0;

    const achievementsList: Achievement[] = [
      {
        id: 'first_win',
        name: 'First Win',
        description: 'First correct prediction',
        icon: Star,
        requirement: 1,
        unlocked: profile.correct_predictions >= 1,
        progress: Math.min(profile.correct_predictions, 1),
        color: 'text-yellow-500'
      },
      {
        id: 'ten_correct',
        name: '10 Correct',
        description: '10 correct predictions',
        icon: Target,
        requirement: 10,
        unlocked: profile.correct_predictions >= 10,
        progress: Math.min(profile.correct_predictions, 10),
        color: 'text-blue-500'
      },
      {
        id: 'fifty_correct',
        name: '50 Correct',
        description: '50 correct predictions',
        icon: Trophy,
        requirement: 50,
        unlocked: profile.correct_predictions >= 50,
        progress: Math.min(profile.correct_predictions, 50),
        color: 'text-purple-500'
      },
      {
        id: 'success_rate_70',
        name: '70% Rate',
        description: '70% success rate',
        icon: TrendingUp,
        requirement: 70,
        unlocked: successRate >= 70,
        progress: Math.min(successRate, 70),
        color: 'text-green-500'
      },
      {
        id: 'success_rate_80',
        name: '80% Rate',
        description: '80% success rate',
        icon: Award,
        requirement: 80,
        unlocked: successRate >= 80,
        progress: Math.min(successRate, 80),
        color: 'text-emerald-500'
      },
      {
        id: 'hundred_views',
        name: '100 Views',
        description: '100 predictions viewed',
        icon: Eye,
        requirement: 100,
        unlocked: profile.predictions_viewed >= 100,
        progress: Math.min(profile.predictions_viewed, 100),
        color: 'text-indigo-500'
      },
      {
        id: 'dedicated_fan',
        name: 'Dedicated Fan',
        description: '10+ favorites',
        icon: Heart,
        requirement: 10,
        unlocked: false, // Can't determine from profile alone
        progress: 0,
        color: 'text-pink-500'
      },
      {
        id: 'master_predictor',
        name: 'Master',
        description: '100 correct predictions',
        icon: Crown,
        requirement: 100,
        unlocked: profile.correct_predictions >= 100,
        progress: Math.min(profile.correct_predictions, 100),
        color: 'text-amber-500'
      },
    ];

    setAchievements(achievementsList);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-12 pb-12">
                <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">User Not Found</h2>
                <p className="text-muted-foreground mb-6">This user profile doesn't exist or has been removed.</p>
                <Link to="/leaderboard">
                  <Button>View Leaderboard</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const successRate = profile.predictions_viewed > 0 
    ? ((profile.correct_predictions / profile.predictions_viewed) * 100).toFixed(1)
    : '0.0';

  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy');
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const displayName = profile.display_name || profile.email.split('@')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center ring-4 ring-primary/20">
                    <User className="w-12 h-12 text-primary-foreground" />
                  </div>
                  {profile.featured_achievement && (
                    <div className="absolute -bottom-1 -right-1">
                      <UserBadge achievementId={profile.featured_achievement} size="lg" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-foreground">{displayName}</h2>
                    {profile.featured_achievement && (
                      <UserBadge achievementId={profile.featured_achievement} size="md" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Member since {memberSince}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <span>{unlockedAchievements.length} Badges</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-4 pb-4 text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold text-foreground">{profile.correct_predictions}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-4 pb-4 text-center">
                <Eye className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold text-foreground">{profile.predictions_viewed}</p>
                <p className="text-xs text-muted-foreground">Viewed</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-4 pb-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold text-foreground">{successRate}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardContent className="pt-4 pb-4 text-center">
                <Award className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold text-foreground">{unlockedAchievements.length}</p>
                <p className="text-xs text-muted-foreground">Achievements</p>
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        achievement.unlocked 
                          ? 'bg-primary/5 border-primary/20' 
                          : 'bg-muted/20 border-border opacity-50'
                      }`}
                    >
                      <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                        achievement.unlocked ? achievement.color.replace('text-', 'bg-').replace('500', '500/20') : 'bg-muted'
                      }`}>
                        <Icon className={`h-6 w-6 ${achievement.unlocked ? achievement.color : 'text-muted-foreground'}`} />
                      </div>
                      <h4 className="font-medium text-sm text-foreground">{achievement.name}</h4>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      {achievement.unlocked && (
                        <Badge variant="outline" className="mt-2 text-xs bg-primary/10 text-primary border-primary/20">
                          Unlocked
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Seasonal Achievements */}
          {seasonalAchievements.length > 0 && (
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Active Seasonal Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {seasonalAchievements.map((sa) => {
                    const config = getAchievementConfig(sa.achievement_id);
                    const seasonalDef = SEASONAL_ACHIEVEMENTS.find(s => s.id === sa.achievement_id);
                    if (!config || !seasonalDef) return null;
                    
                    const Icon = config.icon;
                    return (
                      <div
                        key={sa.id}
                        className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor}`}>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{config.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Expires {format(new Date(sa.season_end), 'MMM d')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Back to Leaderboard */}
          <div className="text-center">
            <Link to="/leaderboard">
              <Button variant="outline">
                View Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}