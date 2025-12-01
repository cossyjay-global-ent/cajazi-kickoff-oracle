import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

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
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground">Please login to view your profile.</p>
        </div>
      </div>
    );
  }

  const successRate = profile?.predictions_viewed > 0 
    ? Math.round((profile.correct_predictions / profile.predictions_viewed) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-8 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{user.email}</h2>
              <p className="text-muted-foreground">Member Status</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {profile?.predictions_viewed || 0}
              </div>
              <div className="text-sm text-muted-foreground">Predictions Viewed</div>
            </div>
            <div className="bg-background border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {profile?.correct_predictions || 0}
              </div>
              <div className="text-sm text-muted-foreground">Correct Predictions</div>
            </div>
            <div className="bg-background border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {successRate}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-xl font-bold text-foreground mb-4">Account Settings</h3>
          <p className="text-muted-foreground">
            Manage your account settings and preferences. View your prediction history and track your success rate.
          </p>
        </div>
      </div>
    </div>
  );
}