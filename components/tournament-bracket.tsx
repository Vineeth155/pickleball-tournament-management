"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  type Tournament,
  type Match,
} from "@/lib/types";
import CategoryBracket from "@/components/category-bracket";

interface TournamentBracketProps {
  tournament: Tournament;
  onUpdateMatch: (matchId: string, updatedMatch: Partial<Match>) => void;
  currentUser: string | null;
}

export default function TournamentBracket({
  tournament,
  onUpdateMatch,
  currentUser,
}: TournamentBracketProps) {
  // Each category has its own bracket
  const categories = tournament.categories;
  
  // Debug logging
  console.log("TournamentBracket render:", {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    categoriesCount: categories?.length || 0,
    categories: categories?.map(cat => ({
      id: cat.id,
      gender: cat.gender,
      division: cat.division,
      format: cat.format,
      totalRounds: cat.totalRounds,
      teamsCount: cat.teams?.length || 0,
      matchesCount: cat.matches?.length || 0
    }))
  });
  
  // State for active category
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories && categories.length > 0 ? categories[0].id : null
  );

  // Render category brackets
  if (!categories || categories.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No categories found for this tournament.</p>
        <div className="mt-4 p-4 bg-gray-100 rounded text-left">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(tournament, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // If only one category, show it directly
  if (categories.length === 1) {
    return (
      <CategoryBracket
        category={categories[0]}
                          tournamentId={tournament.id}
        onUpdateMatch={onUpdateMatch}
        currentUser={currentUser}
      />
    );
  }

  // Multiple categories - show tabs
  return (
    <div className="space-y-8">


      <Tabs value={activeCategory || ""} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.gender} {category.division}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id}>
            <CategoryBracket
              category={category}
              tournamentId={tournament.id}
              onUpdateMatch={onUpdateMatch}
              currentUser={currentUser}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
