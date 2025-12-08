import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendNotificationEmail, getUserEmail } from "@/hooks/useEmailNotifications";

export const useFollowSystem = (targetUserId: string | null, currentUserId: string | null) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (targetUserId) {
      fetchFollowData();
    }
  }, [targetUserId, currentUserId]);

  const fetchFollowData = async () => {
    if (!targetUserId) return;

    // Get followers count
    const { count: followers } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', targetUserId);

    // Get following count
    const { count: following } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', targetUserId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);

    // Check if current user is following
    if (currentUserId && currentUserId !== targetUserId) {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .maybeSingle();

      setIsFollowing(!!data);
    }
  };

  const toggleFollow = async () => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) return;

    setLoading(true);
    
    if (isFollowing) {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId);

      if (error) {
        toast.error("Failed to unfollow");
      } else {
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        toast.success("Unfollowed");
      }
    } else {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });

      if (error) {
        toast.error("Failed to follow");
      } else {
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success("Following!");
        
        // Send email notification
        const [targetUser, currentUser] = await Promise.all([
          getUserEmail(targetUserId),
          getUserEmail(currentUserId),
        ]);
        
        if (targetUser && currentUser) {
          sendNotificationEmail({
            type: "new_follower",
            recipientEmail: targetUser.email,
            recipientName: targetUser.displayName,
            actorName: currentUser.displayName,
          });
        }
      }
    }

    setLoading(false);
  };

  return {
    isFollowing,
    followersCount,
    followingCount,
    toggleFollow,
    loading,
    refetch: fetchFollowData,
  };
};

export const useUserFollowers = (userId: string | null) => {
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    if (!userId) return;

    const { data: followersData } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', userId);

    const { data: followingData } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);

    setFollowers(followersData?.map(f => f.follower_id) || []);
    setFollowing(followingData?.map(f => f.following_id) || []);
  };

  return { followers, following, refetch: fetchData };
};
