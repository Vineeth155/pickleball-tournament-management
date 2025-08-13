import { Trophy, Crown } from "lucide-react";
import type { Match, Team } from "@/lib/types";

interface MatchWinnerIndicatorProps {
  match: Match;
  team1: Team | null;
  team2: Team | null;
  compact?: boolean;
}

export function MatchWinnerIndicator({ 
  match, 
  team1, 
  team2, 
  compact = false 
}: MatchWinnerIndicatorProps) {
  // Only show if match is completed
  if (!match.completed) {
    return null;
  }

  // Check if match is tied
  const isTied = match.winnerId === "tied";
  
  // If not tied and no winner, don't show anything
  if (!isTied && !match.winnerId) {
    return null;
  }

  if (isTied) {
    // Show tie indicator
    if (compact) {
      return (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white dark:border-gray-800 flex items-center gap-1">
            <span>🤝</span>
            TIE
          </div>
        </div>
      );
    }

    return (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg border-2 border-white dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤝</span>
            <span>MATCH TIED</span>
          </div>
          <div className="text-xs opacity-75 text-center mt-1">
            {match.team1Score} - {match.team2Score}
          </div>
        </div>
      </div>
    );
  }

  // Show winner indicator
  const winner = match.winnerId === match.team1Id ? team1 : team2;
  const winnerName = winner?.name || "Unknown Team";

  if (compact) {
    // Compact version for tight bracket layouts
    return (
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white dark:border-gray-800 flex items-center gap-1">
          <Crown className="h-3 w-3" />
          {winnerName}
        </div>
      </div>
    );
  }

  // Full version with more details
  return (
    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg border-2 border-white dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-200" />
          <span>{winnerName}</span>
          <span className="text-xs opacity-90">WINS</span>
        </div>
        <div className="text-xs opacity-75 text-center mt-1">
          {match.team1Score} - {match.team2Score}
        </div>
      </div>
    </div>
  );
}
