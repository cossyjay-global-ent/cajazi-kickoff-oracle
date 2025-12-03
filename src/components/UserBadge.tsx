import { Star, Target, Trophy, TrendingUp, Award, Eye, Heart, Crown, Flame, Calendar, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UserBadgeProps {
  achievementId: string | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

const ACHIEVEMENT_CONFIG: Record<string, { name: string; icon: any; color: string; bgColor: string }> = {
  first_win: { name: "First Win", icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-500/20" },
  ten_correct: { name: "10 Correct", icon: Target, color: "text-blue-500", bgColor: "bg-blue-500/20" },
  fifty_correct: { name: "50 Correct", icon: Trophy, color: "text-purple-500", bgColor: "bg-purple-500/20" },
  success_rate_70: { name: "70% Rate", icon: TrendingUp, color: "text-green-500", bgColor: "bg-green-500/20" },
  success_rate_80: { name: "80% Rate", icon: Award, color: "text-emerald-500", bgColor: "bg-emerald-500/20" },
  hundred_views: { name: "100 Views", icon: Eye, color: "text-indigo-500", bgColor: "bg-indigo-500/20" },
  dedicated_fan: { name: "Dedicated Fan", icon: Heart, color: "text-pink-500", bgColor: "bg-pink-500/20" },
  master_predictor: { name: "Master", icon: Crown, color: "text-amber-500", bgColor: "bg-amber-500/20" },
  // Seasonal achievements
  perfect_week: { name: "Perfect Week", icon: Flame, color: "text-orange-500", bgColor: "bg-orange-500/20" },
  monthly_champion: { name: "Monthly Champion", icon: Calendar, color: "text-cyan-500", bgColor: "bg-cyan-500/20" },
  hot_streak: { name: "Hot Streak", icon: Zap, color: "text-red-500", bgColor: "bg-red-500/20" },
};

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export const UserBadge = ({ achievementId, size = "sm", showTooltip = true }: UserBadgeProps) => {
  if (!achievementId || !ACHIEVEMENT_CONFIG[achievementId]) {
    return null;
  }

  const config = ACHIEVEMENT_CONFIG[achievementId];
  const Icon = config.icon;

  const badge = (
    <div
      className={`${sizeClasses[size]} rounded-full ${config.bgColor} flex items-center justify-center ${config.color} ring-2 ring-current/20 animate-scale-in`}
    >
      <Icon className={iconSizeClasses[size]} />
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{config.name}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const getAchievementConfig = (achievementId: string) => {
  return ACHIEVEMENT_CONFIG[achievementId] || null;
};

export const SEASONAL_ACHIEVEMENTS = [
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: '100% success rate in a week (min 5 predictions)',
    icon: Flame,
    color: 'text-orange-500',
    type: 'weekly',
    requirement: { minPredictions: 5, successRate: 100 },
  },
  {
    id: 'hot_streak',
    name: 'Hot Streak',
    description: '5 correct predictions in a row this week',
    icon: Zap,
    color: 'text-red-500',
    type: 'weekly',
    requirement: { streak: 5 },
  },
  {
    id: 'monthly_champion',
    name: 'Monthly Champion',
    description: 'Top performer of the month (min 20 predictions)',
    icon: Calendar,
    color: 'text-cyan-500',
    type: 'monthly',
    requirement: { minPredictions: 20, topPerformer: true },
  },
];
