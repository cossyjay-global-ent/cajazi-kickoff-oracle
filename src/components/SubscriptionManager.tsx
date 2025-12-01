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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

export const SubscriptionManager = () => {
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [planType, setPlanType] = useState<string>("2_weeks");
  const [expiresAt, setExpiresAt] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsersWithSubscriptions();
  }, []);

  const fetchUsersWithSubscriptions = async () => {
    // Fetch all users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .order('email', { ascending: true });

    if (!profiles) return;

    // Fetch all active subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    // Map subscriptions to users
    const usersWithSubs: UserWithSubscription[] = profiles.map(profile => {
      const sub = subscriptions?.find(s => s.user_id === profile.id);
      return {
        ...profile,
        subscription: sub || null
      };
    });

    setUsers(usersWithSubs);
  };

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
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-foreground">VIP Subscription Management</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Activate Subscription</Button>
          </DialogTrigger>
          <DialogContent>
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
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} {user.subscription ? "(Has Active Sub)" : ""}
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

      <div className="space-y-3">
        {users.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No users found</p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex justify-between items-center p-4 bg-background border border-border rounded-lg"
            >
              <div className="flex-1">
                <div className="font-semibold text-foreground">{user.email}</div>
                {user.subscription ? (
                  <div className="text-sm space-y-1 mt-1">
                    <div className="text-muted-foreground">
                      <span className="text-green-600 dark:text-green-400 font-semibold">● Active VIP</span>
                      {" • "}
                      <span className="capitalize">{user.subscription.plan_type.replace('_', ' ')}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Expires: {new Date(user.subscription.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-1">
                    No active subscription
                  </div>
                )}
              </div>

              {user.subscription && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendSubscription(user.subscription!.id, user.subscription!.expires_at)}
                  >
                    Extend +1mo
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleExpireSubscription(user.subscription!.id)}
                  >
                    Expire
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};