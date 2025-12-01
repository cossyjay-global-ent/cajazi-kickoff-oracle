import { useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Livescore() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Mock matches data organized by date
  const getMatchesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Return matches based on selected date
    if (dateStr === today) {
      return [
        {
          homeTeam: "Manchester United",
          awayTeam: "Liverpool",
          homeScore: 2,
          awayScore: 1,
          status: "ft" as const,
          league: "Premier League",
        },
        {
          homeTeam: "Barcelona",
          awayTeam: "Real Madrid",
          homeScore: 3,
          awayScore: 2,
          status: "ft" as const,
          league: "La Liga",
        },
        {
          homeTeam: "Bayern Munich",
          awayTeam: "Dortmund",
          homeScore: 1,
          awayScore: 1,
          status: "ft" as const,
          league: "Bundesliga",
        },
        {
          homeTeam: "PSG",
          awayTeam: "Marseille",
          homeScore: 0,
          awayScore: 0,
          status: "scheduled" as const,
          time: "20:00",
          league: "Ligue 1",
        },
      ];
    }
    
    // Mock data for previous dates
    return [
      {
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        homeScore: 2,
        awayScore: 0,
        status: "ft" as const,
        league: "Premier League",
      },
      {
        homeTeam: "AC Milan",
        awayTeam: "Inter Milan",
        homeScore: 1,
        awayScore: 2,
        status: "ft" as const,
        league: "Serie A",
      },
    ];
  };

  const matches = getMatchesForDate(selectedDate);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Match Results</h2>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {matches.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {matches.map((match, index) => (
              <MatchCard key={index} {...match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">No matches found for this date</p>
          </div>
        )}
      </div>
    </div>
  );
}