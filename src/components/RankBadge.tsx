import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap } from "lucide-react";

interface RankBadgeProps {
  rankTier: string;
  xpPoints: number;
  size?: "sm" | "md" | "lg";
  showXP?: boolean;
}

const RANK_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  Bronze: { color: "text-amber-700", bgColor: "bg-amber-100", borderColor: "border-amber-500" },
  Silver: { color: "text-gray-500", bgColor: "bg-gray-100", borderColor: "border-gray-400" },
  Gold: { color: "text-yellow-500", bgColor: "bg-yellow-100", borderColor: "border-yellow-400" },
  Platinum: { color: "text-cyan-600", bgColor: "bg-cyan-100", borderColor: "border-cyan-400" },
  Diamond: { color: "text-blue-400", bgColor: "bg-blue-100", borderColor: "border-blue-400" },
  Master: { color: "text-purple-500", bgColor: "bg-purple-100", borderColor: "border-purple-400" },
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-1",
  lg: "text-base px-3 py-1.5",
};

export const RankBadge = ({ rankTier, xpPoints, size = "sm", showXP = false }: RankBadgeProps) => {
  const config = RANK_CONFIG[rankTier] || RANK_CONFIG.Bronze;

  const badge = (
    <div className={`inline-flex items-center gap-1 rounded-full border ${config.bgColor} ${config.borderColor} ${config.color} ${sizeClasses[size]} font-semibold`}>
      <Zap className={size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      <span>{rankTier}</span>
      {showXP && <span className="opacity-70">({xpPoints} XP)</span>}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{rankTier} Rank - {xpPoints} XP</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const getRankNextMilestone = (xpPoints: number): { nextRank: string; pointsNeeded: number } | null => {
  const milestones = [
    { rank: "Silver", threshold: 100 },
    { rank: "Gold", threshold: 500 },
    { rank: "Platinum", threshold: 1500 },
    { rank: "Diamond", threshold: 5000 },
    { rank: "Master", threshold: 15000 },
  ];

  for (const milestone of milestones) {
    if (xpPoints < milestone.threshold) {
      return { nextRank: milestone.rank, pointsNeeded: milestone.threshold - xpPoints };
    }
  }

  return null;
};
