import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserWithSubscription {
  id: string;
  email: string;
  subscription?: {
    id: string;
    plan_type: string;
    status: string;
    started_at: string;
    expires_at: string;
  } | null;
}

interface OrphanedSubscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
}

export const SubscriptionManager = () => {
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [orphanedSubscriptions, setOrphanedSubscriptions] = useState<OrphanedSubscription[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [planType, setPlanType] = useState<string>("2_weeks");
  const [expiresAt, setExpiresAt] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchUsersWithSubscriptions();
  }, []);

  const fetchUsersWithSubscriptions = async () => {
    // Fetch all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .order('email', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    if (!profiles) return;

    // Fetch ALL subscriptions (not just active) for comprehensive view
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
    }

    // Map subscriptions to users - get most recent subscription for each user
    const usersWithSubs: UserWithSubscription[] = profiles.map(profile => {
      // Find all subscriptions for this user
      const userSubs = subscriptions?.filter(s => s.user_id === profile.id) || [];
      
      // Get active subscription if any
      const activeSub = userSubs.find(s => 
        s.status === 'active' && 
        new Date(s.expires_at) > new Date()
      );
      
      // If no active, get most recent subscription (could be expired)
      const mostRecentSub = activeSub || (userSubs.length > 0 ? userSubs[0] : null);
      
      return {
        ...profile,
        subscription: mostRecentSub || null
      };
    });

    // Find orphaned subscriptions (subscriptions without matching profiles)
    const profileIds = profiles.map(p => p.id);
    const orphaned = subscriptions?.filter(s => !profileIds.includes(s.user_id)) || [];
    setOrphanedSubscriptions(orphaned);

    setUsers(usersWithSubs);
  };

  const getSubscriptionStatus = (subscription: { status: string; expires_at: string } | null | undefined) => {
    if (!subscription) return 'none';
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    if (subscription.status !== 'active') return 'expired';
    if (expiresAt < now) return 'expired';
    return 'active';
  };

  const filteredUsers = users.filter(user => {
    if (filterStatus === 'all') return true;
    const status = getSubscriptionStatus(user.subscription);
    if (filterStatus === 'active') return status === 'active';
    if (filterStatus === 'none') return status === 'none';
    if (filterStatus === 'expired') return status === 'expired';
    return true;
  });

  const calculateExpiryDate = (planType: string): Date => {
    const now = new Date();
    switch (planType) {
      case "2_weeks":
        return new Date(now.setDate(now.getDate() + 14));
      case "1_month":
        return new Date(now.setMonth(now.getMonth() + 1));
      case "6_months":
        return new Date(now.setMonth(now.getMonth() + 6));
      case "yearly":
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  };

  const handleActivateSubscription = async () => {
    if (!selectedUser || !expiresAt) {
      toast.error("Please select a user and expiry date");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: selectedUser,
          plan_type: planType,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      toast.success("Subscription activated successfully!");
      setDialogOpen(false);
      setSelectedUser("");
      setPlanType("2_weeks");
      setExpiresAt(undefined);
      fetchUsersWithSubscriptions();
    } catch (error: any) {
      console.error("Error activating subscription:", error);
      toast.error(error.message || "Failed to activate subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleExpireSubscription = async (subscriptionId: string) => {
    const confirmed = window.confirm("Are you sure you want to expire this subscription?");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'expired',
          expires_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success("Subscription expired successfully!");
      fetchUsersWithSubscriptions();
    } catch (error: any) {
      console.error("Error expiring subscription:", error);
      toast.error(error.message || "Failed to expire subscription");
    }
  };

  const handleExtendSubscription = async (subscriptionId: string, currentExpiresAt: string) => {
    const newExpiresAt = new Date(currentExpiresAt);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          expires_at: newExpiresAt.toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success("Subscription extended by 1 month!");
      fetchUsersWithSubscriptions();
    } catch (error: any) {
      console.error("Error extending subscription:", error);
      toast.error(error.message || "Failed to extend subscription");
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-foreground">VIP Subscription Management</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">Activate Subscription</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Activate VIP Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <span className="truncate max-w-[200px] inline-block">
                          {user.email}
                        </span>
                        {user.subscription && <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planType">Plan Type</Label>
                <Select 
                  value={planType} 
                  onValueChange={(value) => {
                    setPlanType(value);
                    setExpiresAt(calculateExpiryDate(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2_weeks">2 Weeks</SelectItem>
                    <SelectItem value="1_month">1 Month</SelectItem>
                    <SelectItem value="6_months">6 Months</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expires At</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiresAt && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiresAt ? format(expiresAt, "PPP") : <span>Pick expiry date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={setExpiresAt}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                onClick={handleActivateSubscription} 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Activating..." : "Activate Subscription"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Section */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Label className="text-sm text-muted-foreground w-full mb-1">Filter by status:</Label>
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'none', 'expired'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="text-xs capitalize"
            >
              {status === 'none' ? 'No Subscription' : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Orphaned Subscriptions Warning */}
      {orphanedSubscriptions.length > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm">Orphaned Subscriptions Found</h4>
              <p className="text-xs text-muted-foreground mt-1">
                These subscriptions have no matching registered user. The user may not have signed up yet.
              </p>
              <div className="mt-2 space-y-2">
                {orphanedSubscriptions.map((sub) => (
                  <div key={sub.id} className="text-xs p-2 bg-background rounded border border-border">
                    <div className="font-mono text-muted-foreground truncate">User ID: {sub.user_id.slice(0, 8)}...</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{sub.plan_type.replace('_', ' ')}</Badge>
                      <Badge variant={sub.status === 'active' ? "default" : "secondary"} className="text-xs">
                        {sub.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        Expires: {format(new Date(sub.expires_at), "PP")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User List */}
      <ScrollArea className="h-[400px] sm:h-[500px]">
        <div className="space-y-3 pr-2">
          {filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">
              {filterStatus === 'all' ? 'No users found' : `No users with ${filterStatus} status`}
            </p>
          ) : (
            filteredUsers.map((user) => {
              const status = getSubscriptionStatus(user.subscription);
              return (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 sm:p-4 bg-background border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm sm:text-base truncate">{user.email}</div>
                    {user.subscription ? (
                      <div className="text-xs sm:text-sm space-y-1 mt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {status === 'active' ? (
                            <Badge variant="default" className="bg-success text-success-foreground text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active VIP
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                          <Badge variant="outline" className="capitalize text-xs">
                            {user.subscription.plan_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Expires: {format(new Date(user.subscription.expires_at), "PPP")}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <span className="text-muted-foreground">●</span> No active subscription
                      </div>
                    )}
                  </div>

                  {user.subscription && status === 'active' && (
                    <div className="flex gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleExtendSubscription(user.subscription!.id, user.subscription!.expires_at)}
                      >
                        +1 Month
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleExpireSubscription(user.subscription!.id)}
                      >
                        Expire
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <span>Total Users: <strong className="text-foreground">{users.length}</strong></span>
          <span>Active Subs: <strong className="text-success">{users.filter(u => getSubscriptionStatus(u.subscription) === 'active').length}</strong></span>
          <span>No Sub: <strong className="text-foreground">{users.filter(u => getSubscriptionStatus(u.subscription) === 'none').length}</strong></span>
          <span>Expired: <strong className="text-destructive">{users.filter(u => getSubscriptionStatus(u.subscription) === 'expired').length}</strong></span>
          {orphanedSubscriptions.length > 0 && (
            <span className="col-span-2 sm:col-span-1">Orphaned: <strong className="text-warning">{orphanedSubscriptions.length}</strong></span>
          )}
        </div>
      </div>
    </div>
  );
};