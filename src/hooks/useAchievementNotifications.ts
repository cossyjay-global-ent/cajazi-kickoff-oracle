import { useEffect, useRef } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  color: string;
}

export const useAchievementNotifications = (achievements: Achievement[]) => {
  const previousUnlocked = useRef<Set<string>>(new Set());
  const isInitialized = useRef(false);

  useEffect(() => {
    if (achievements.length === 0) return;

    // Initialize with current unlocked achievements on first load
    if (!isInitialized.current) {
      achievements.forEach((a) => {
        if (a.unlocked) {
          previousUnlocked.current.add(a.id);
        }
      });
      isInitialized.current = true;
      return;
    }

    // Check for newly unlocked achievements
    achievements.forEach((achievement) => {
      if (achievement.unlocked && !previousUnlocked.current.has(achievement.id)) {
        // New achievement unlocked!
        previousUnlocked.current.add(achievement.id);
        
        // Trigger celebration
        triggerCelebration(achievement);
      }
    });
  }, [achievements]);

  const triggerCelebration = (achievement: Achievement) => {
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],
    });

    // Show celebration toast
    toast.success(
      `🎉 Achievement Unlocked: ${achievement.name}!`,
      {
        description: achievement.description,
        duration: 5000,
        className: "achievement-toast",
        style: {
          background: "linear-gradient(135deg, hsl(142 70% 42%), hsl(142 70% 52%))",
          color: "white",
          border: "none",
        },
      }
    );

    // Fire more confetti after a short delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b'],
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b'],
      });
    }, 250);
  };

  return { triggerCelebration };
};
