interface MatchCardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "ft" | "scheduled";
  time?: string;
  league?: string;
}

export const MatchCard = ({ homeTeam, awayTeam, homeScore, awayScore, status, time, league }: MatchCardProps) => {
  const getStatusColor = () => {
    return status === "ft" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary";
  };

  const getStatusText = () => {
    return status === "ft" ? "FT" : time || "Scheduled";
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
      {league && (
        <div className="text-xs text-muted-foreground mb-2 font-medium">{league}</div>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-3 flex-1 w-full sm:w-auto">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-xs md:text-sm shrink-0">
            {homeTeam.substring(0, 3).toUpperCase()}
          </div>
          <div className="text-foreground font-medium text-sm md:text-base truncate">{homeTeam}</div>
        </div>

        <div className="flex flex-col items-center gap-2 min-w-[80px] md:min-w-[100px]">
          <div className="text-2xl md:text-3xl font-bold text-foreground">
            {homeScore} - {awayScore}
          </div>
          <div className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end w-full sm:w-auto">
          <div className="text-foreground font-medium text-right text-sm md:text-base truncate">{awayTeam}</div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-xs md:text-sm shrink-0">
            {awayTeam.substring(0, 3).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
};