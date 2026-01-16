import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FullPageState } from "@/components/FullPageState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Crown, 
  Users, 
  TrendingUp, 
  Trophy, 
  CreditCard, 
  Activity,
  Database,
  Shield,
  Settings,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Mail,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStats {
  totalUsers: number;
  newUsersThisWeek: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  pendingSubscriptions: number;
  totalPredictions: number;
  wonPredictions: number;
  lostPredictions: number;
  pendingPredictions: number;
  totalBundles: number;
  vipBundles: number;
  freeBundles: number;
  totalNewsletterSubscribers: number;
  totalAdmins: number;
}

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isSuperDeveloper, setIsSuperDeveloper] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentSubscriptions, setRecentSubscriptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Only super developers can access this page
    if (session.user.email !== "support@cosmas.dev") {
      navigate("/");
      return;
    }

    setIsSuperDeveloper(true);
    await fetchAllStats();
    setLoading(false);
  };

  const fetchAllStats = async () => {
    setRefreshing(true);
    
    try {
      // Fetch all stats in parallel
      const [
        usersResult,
        subscriptionsResult,
        predictionsResult,
        bundlesResult,
        newsletterResult,
        adminsResult,
        recentUsersResult,
        recentSubsResult
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_at'),
        supabase.from('subscriptions').select('id, status, created_at'),
        supabase.from('predictions').select('id, result'),
        supabase.from('prediction_bundles').select('id, prediction_type'),
        supabase.from('newsletter_subscriptions').select('id').is('unsubscribed_at', null),
        supabase.from('user_roles').select('id').eq('role', 'admin'),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      // Calculate stats
      const users = usersResult.data || [];
      const subscriptions = subscriptionsResult.data || [];
      const predictions = predictionsResult.data || [];
      const bundles = bundlesResult.data || [];
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const newStats: DashboardStats = {
        totalUsers: users.length,
        newUsersThisWeek: users.filter(u => new Date(u.created_at) > oneWeekAgo).length,
        activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
        expiredSubscriptions: subscriptions.filter(s => s.status === 'expired').length,
        pendingSubscriptions: subscriptions.filter(s => s.status === 'pending').length,
        totalPredictions: predictions.length,
        wonPredictions: predictions.filter(p => p.result === 'won').length,
        lostPredictions: predictions.filter(p => p.result === 'lost').length,
        pendingPredictions: predictions.filter(p => p.result === 'pending' || !p.result).length,
        totalBundles: bundles.length,
        vipBundles: bundles.filter(b => b.prediction_type === 'vip').length,
        freeBundles: bundles.filter(b => b.prediction_type === 'free').length,
        totalNewsletterSubscribers: newsletterResult.data?.length || 0,
        totalAdmins: adminsResult.data?.length || 0,
      };

      setStats(newStats);
      setRecentUsers(recentUsersResult.data || []);
      setRecentSubscriptions(recentSubsResult.data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    
    setRefreshing(false);
  };

  if (loading) {
    return (
      <FullPageState
        title="Loading"
        description="Initializing super admin dashboard..."
        variant="loading"
      />
    );
  }

  if (!isSuperDeveloper) {
    return (
      <FullPageState
        title="Access Denied"
        description="This dashboard is restricted to super developers only."
        variant="info"
        action={{ label: "Go Home", to: "/", variant: "outline" }}
      />
    );
  }

  const winRate = stats && stats.wonPredictions + stats.lostPredictions > 0
    ? Math.round((stats.wonPredictions / (stats.wonPredictions + stats.lostPredictions)) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
              <p className="text-muted-foreground">Complete system overview and controls</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchAllStats}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild size="sm">
              <Link to="/admin">
                <Settings className="h-4 w-4 mr-2" />
                Admin Panel
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={Users}
            trend={stats?.newUsersThisWeek || 0}
            trendLabel="new this week"
            color="primary"
          />
          <StatCard
            title="Active Subscriptions"
            value={stats?.activeSubscriptions || 0}
            icon={CreditCard}
            trend={stats?.pendingSubscriptions || 0}
            trendLabel="pending"
            color="success"
          />
          <StatCard
            title="Total Predictions"
            value={stats?.totalPredictions || 0}
            icon={TrendingUp}
            trend={winRate}
            trendLabel="% win rate"
            color="accent"
          />
          <StatCard
            title="Admins"
            value={stats?.totalAdmins || 0}
            icon={Shield}
            color="warning"
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Predictions Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Predictions Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="text-2xl font-bold text-primary">{winRate}%</span>
                  </div>
                  <Progress value={winRate} className="h-3" />
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center p-3 rounded-lg bg-success/10">
                      <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
                      <div className="text-lg font-bold text-success">{stats?.wonPredictions || 0}</div>
                      <div className="text-xs text-muted-foreground">Won</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-destructive/10">
                      <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
                      <div className="text-lg font-bold text-destructive">{stats?.lostPredictions || 0}</div>
                      <div className="text-xs text-muted-foreground">Lost</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                      <div className="text-lg font-bold">{stats?.pendingPredictions || 0}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bundles Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Prediction Bundles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Bundles</span>
                    <span className="text-2xl font-bold">{stats?.totalBundles || 0}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">🆓 Free</Badge>
                      </div>
                      <div className="text-2xl font-bold">{stats?.freeBundles || 0}</div>
                      <div className="text-xs text-muted-foreground">bundles</div>
                    </div>
                    <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-amber-500 text-white">🔒 VIP</Badge>
                      </div>
                      <div className="text-2xl font-bold">{stats?.vipBundles || 0}</div>
                      <div className="text-xs text-muted-foreground">bundles</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subscriptions Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Subscriptions Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-success" />
                        <span className="text-sm">Active</span>
                      </div>
                      <span className="font-bold">{stats?.activeSubscriptions || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-warning" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <span className="font-bold">{stats?.pendingSubscriptions || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-destructive" />
                        <span className="text-sm">Expired</span>
                      </div>
                      <span className="font-bold">{stats?.expiredSubscriptions || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Link to="/admin">
                      <Settings className="h-5 w-5" />
                      <span className="text-xs">Admin Panel</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Link to="/admin/newsletter">
                      <Mail className="h-5 w-5" />
                      <span className="text-xs">Newsletter</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Link to="/leaderboard">
                      <Trophy className="h-5 w-5" />
                      <span className="text-xs">Leaderboard</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Link to="/statistics">
                      <BarChart3 className="h-5 w-5" />
                      <span className="text-xs">Statistics</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-success/30 bg-success/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-success flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Won Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-success">{stats?.wonPredictions || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats && stats.totalPredictions > 0 
                      ? `${Math.round((stats.wonPredictions / stats.totalPredictions) * 100)}% of total`
                      : '0% of total'}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Lost Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-destructive">{stats?.lostPredictions || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats && stats.totalPredictions > 0 
                      ? `${Math.round((stats.lostPredictions / stats.totalPredictions) * 100)}% of total`
                      : '0% of total'}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-warning/30 bg-warning/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-warning flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Pending Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-warning">{stats?.pendingPredictions || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats && stats.totalPredictions > 0 
                      ? `${Math.round((stats.pendingPredictions / stats.totalPredictions) * 100)}% of total`
                      : '0% of total'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Overall prediction accuracy and bundle distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Overall Win Rate</span>
                      <span className="text-sm font-bold text-primary">{winRate}%</span>
                    </div>
                    <Progress value={winRate} className="h-4" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">VIP Bundles</div>
                      <div className="text-2xl font-bold">{stats?.vipBundles || 0}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Free Bundles</div>
                      <div className="text-2xl font-bold">{stats?.freeBundles || 0}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    User Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span>Total Users</span>
                    <span className="text-2xl font-bold">{stats?.totalUsers || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-success" />
                      <span>New This Week</span>
                    </div>
                    <span className="text-xl font-bold text-success">+{stats?.newUsersThisWeek || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span>Newsletter Subscribers</span>
                    <span className="text-xl font-bold">{stats?.totalNewsletterSubscribers || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-500" />
                      <span>Admins</span>
                    </div>
                    <span className="text-xl font-bold">{stats?.totalAdmins || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Recent Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentUsers.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No users yet</p>
                    ) : (
                      recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 rounded border">
                          <div>
                            <div className="font-medium">{user.display_name || 'No name'}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-success/30 bg-success/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-success">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-success">{stats?.activeSubscriptions || 0}</div>
                </CardContent>
              </Card>
              
              <Card className="border-warning/30 bg-warning/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-warning">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-warning">{stats?.pendingSubscriptions || 0}</div>
                </CardContent>
              </Card>
              
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-destructive">Expired</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-destructive">{stats?.expiredSubscriptions || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentSubscriptions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No subscriptions yet</p>
                  ) : (
                    recentSubscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-medium">{sub.payment_email || 'No email'}</div>
                          <div className="text-xs text-muted-foreground">
                            {sub.plan_type} • Expires: {new Date(sub.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge 
                          variant={sub.status === 'active' ? 'default' : sub.status === 'pending' ? 'secondary' : 'destructive'}
                          className={sub.status === 'active' ? 'bg-success' : ''}
                        >
                          {sub.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'accent';
}

function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'primary' }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    accent: 'text-accent bg-accent/10',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend !== undefined && (
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 mr-1 text-success" />
              {trend} {trendLabel}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">{title}</div>
      </CardContent>
    </Card>
  );
}