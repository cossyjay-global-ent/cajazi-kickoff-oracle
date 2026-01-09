import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Crown, Clock, AlertTriangle } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface SubscriptionDetails {
  id: string;
  plan_type: string;
  status: string;
  expires_at: string;
  started_at: string;
}

interface SubscriptionStatusBadgeProps {
  userId?: string;
  userEmail?: string;
  showDetails?: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  '2_weeks': '2 Weeks',
  '1_month': 'Monthly',
  '6_months': '6 Months',
  '1_year': '1 Year',
};

export const SubscriptionStatusBadge = ({ userId, userEmail, showDetails = true }: SubscriptionStatusBadgeProps) => {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId || userEmail) {
      fetchSubscription();
    } else {
      setLoading(false);
    }
  }, [userId, userEmail]);

  const fetchSubscription = async () => {
    try {
      let data = null;
      const now = new Date().toISOString();
      
      // Try by user_id first - get most recent active subscription
      if (userId) {
        const { data: userSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .gt('expires_at', now)
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = userSub;
      }

      // Fallback to email
      if (!data && userEmail) {
        const { data: emailSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('payment_email', userEmail.toLowerCase())
          .eq('status', 'active')
          .gt('expires_at', now)
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = emailSub;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!subscription) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No active subscription</span>
      </div>
    );
  }

  const expiresAt = new Date(subscription.expires_at);
  const now = new Date();
  const daysRemaining = differenceInDays(expiresAt, now);
  const isExpiringSoon = daysRemaining <= 3 && daysRemaining > 0;
  const isExpired = daysRemaining <= 0;
  const planLabel = PLAN_LABELS[subscription.plan_type] || subscription.plan_type;

  if (!showDetails) {
    return (
      <Badge 
        variant={isExpired ? "destructive" : isExpiringSoon ? "secondary" : "default"}
        className="gap-1"
      >
        <Crown className="h-3 w-3" />
        VIP
      </Badge>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border ${
      isExpired 
        ? 'bg-destructive/10 border-destructive/30' 
        : isExpiringSoon 
          ? 'bg-warning/10 border-warning/30' 
          : 'bg-primary/10 border-primary/30'
    }`}>
      <div className="flex items-center gap-2">
        <Crown className={`h-5 w-5 ${
          isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-primary'
        }`} />
        <Badge 
          variant={isExpired ? "destructive" : isExpiringSoon ? "secondary" : "default"}
          className="font-semibold"
        >
          {planLabel}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        {isExpired ? (
          <span className="text-destructive font-medium">Expired on {format(expiresAt, 'MMM d, yyyy')}</span>
        ) : isExpiringSoon ? (
          <span className="text-warning font-medium">Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</span>
        ) : (
          <span className="text-muted-foreground">
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining • Expires {format(expiresAt, 'MMM d, yyyy')}
          </span>
        )}
      </div>
    </div>
  );
};
