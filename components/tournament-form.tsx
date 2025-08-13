"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { type Team, TournamentFormat, Category, Tournament } from "@/lib/types";
import { createTournamentInDB, updateTournamentInDB } from "@/lib/tournament-store";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { authenticateUser } from "@/lib/auth";

// Add Team Interface Component
interface AddTeamInterfaceProps {
  category: Category;
  onAddTeam: (team: Team) => void;
}

function AddTeamInterface({ category, onAddTeam }: AddTeamInterfaceProps) {
  const [teamName, setTeamName] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [player1SkillLevel, setPlayer1SkillLevel] = useState("");
  const [player2SkillLevel, setPlayer2SkillLevel] = useState("");
  const [player1AgeGroup, setPlayer1AgeGroup] = useState("");
  const [player2AgeGroup, setPlayer2AgeGroup] = useState("");
  const [teamSeed, setTeamSeed] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [player1Gender, setPlayer1Gender] = useState<"Male" | "Female">("Male");
  const [player2Gender, setPlayer2Gender] = useState<"Female" | "Male">("Female");

  // Determine match type from category
  const isSingles = category.division === "singles";
  const isMixedCategory = category.gender === "mixed";

  // Effect to handle category-based prepopulation
  useEffect(() => {
    if (category) {
      // Set age group from category
      setAgeGroup(category.ageGroup || "");
      
      // Set skill level to middle of range if available
      if (category.skillLevel?.min && category.skillLevel?.max) {
        const midSkill = (category.skillLevel.min + category.skillLevel.max) / 2;
        setSkillLevel(midSkill.toString());
      }
      
      // Set default player skill levels to category minimum
      if (category.skillLevel?.min) {
        setPlayer1SkillLevel(category.skillLevel.min.toString());
        setPlayer2SkillLevel(category.skillLevel.min.toString());
      }
      
      // Set default player age groups from category
      if (category.ageGroup) {
        setPlayer1AgeGroup(category.ageGroup);
        setPlayer2AgeGroup(category.ageGroup);
      }
      
      // Set player genders based on category
      if (category.gender === "Mens") {
        setPlayer1Gender("Male");
        setPlayer2Gender("Male");
      } else if (category.gender === "Womens") {
        setPlayer1Gender("Female");
        setPlayer2Gender("Female");
      } else if (category.gender === "mixed") {
        setPlayer1Gender("Male");
        setPlayer2Gender("Female");
      }
    }
  }, [category]);

  // Effect to handle mixed gender logic - ensure opposite genders
  useEffect(() => {
    if (isMixedCategory && !isSingles) {
      if (player1Gender === player2Gender) {
        setPlayer2Gender(player1Gender === "Male" ? "Female" : "Male");
      }
    }
  }, [player1Gender, isMixedCategory, isSingles]);

  const handleAddTeam = () => {
    if (!player1.trim()) {
      alert("Please enter player name");
      return;
    }

    if (!isSingles && !player2.trim()) {
      alert("Please enter both player names for doubles");
      return;
    }

    const newTeam: Team = {
      id: "", // Will be set by parent component
      name: isSingles ? player1.trim() : teamName.trim() || `${player1.trim()}/${player2.trim()}`,
      seed: teamSeed ? Number.parseInt(teamSeed) : undefined,
      skillLevel: isSingles ? player1SkillLevel : skillLevel,
      ageGroup: isSingles ? player1AgeGroup : ageGroup,
    };

    if (!isSingles) {
      newTeam.players = [player1.trim(), player2.trim()];
      newTeam.playerDetails = [
        { skillLevel: player1SkillLevel, ageGroup: player1AgeGroup, gender: player1Gender },
        { skillLevel: player2SkillLevel, ageGroup: player2AgeGroup, gender: player2Gender }
      ];
    } else {
      // For singles, add player details
      newTeam.playerDetails = [
        { skillLevel: player1SkillLevel, ageGroup: player1AgeGroup, gender: player1Gender }
      ];
    }

    onAddTeam(newTeam);

    // Reset form
    setTeamName("");
    setPlayer1("");
    setPlayer2("");
    setPlayer1SkillLevel("");
    setPlayer2SkillLevel("");
    setPlayer1AgeGroup("");
    setPlayer2AgeGroup("");
    setTeamSeed("");
    setSkillLevel("");
    setAgeGroup("");
    // Reset genders to defaults
    if (category.gender === "Mens") {
      setPlayer1Gender("Male");
      setPlayer2Gender("Male");
    } else if (category.gender === "Womens") {
      setPlayer1Gender("Female");
      setPlayer2Gender("Female");
    } else if (category.gender === "mixed") {
      setPlayer1Gender("Male");
      setPlayer2Gender("Female");
    }
  };

  return (
    <div className="space-y-4">
      {!isSingles && (
        <div className="space-y-2">
          <Label htmlFor="team-name">Team Name (Optional)</Label>
          <Input
            id="team-name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name (e.g., Smith/Johnson)"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="player1">{isSingles ? "Player Name" : "Player 1 Name"}</Label>
        <Input
          id="player1"
          value={player1}
          onChange={(e) => setPlayer1(e.target.value)}
          placeholder="Enter player name"
        />
        {isSingles && (
          <div className="mt-2">
            <Label htmlFor="player1-gender-singles">Gender</Label>
            {isMixedCategory ? (
              <Select value={player1Gender} onValueChange={(value: "Male" | "Female") => setPlayer1Gender(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="player1-gender-singles"
                value={player1Gender}
                disabled
                className="bg-slate-100 dark:bg-slate-700"
              />
            )}
          </div>
        )}
        {!isSingles && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div>
              <Label htmlFor="player1-skill">Skill Level</Label>
              <Input
                id="player1-skill"
                value={player1SkillLevel}
                onChange={(e) => setPlayer1SkillLevel(e.target.value)}
                placeholder="e.g., 3.5"
              />
            </div>
            <div>
              <Label htmlFor="player1-age">Age Group</Label>
              <Input
                id="player1-age"
                value={player1AgeGroup}
                onChange={(e) => setPlayer1AgeGroup(e.target.value)}
                placeholder="e.g., 35+"
              />
            </div>
            <div>
              <Label htmlFor="player1-gender">Gender</Label>
              {isMixedCategory ? (
                <Select value={player1Gender} onValueChange={(value: "Male" | "Female") => setPlayer1Gender(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="player1-gender"
                  value={player1Gender}
                  disabled
                  className="bg-slate-100 dark:bg-slate-700"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {!isSingles && (
        <div className="space-y-2">
          <Label htmlFor="player2">Player 2 Name</Label>
          <Input
            id="player2"
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            placeholder="Enter player name"
          />
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div>
              <Label htmlFor="player2-skill">Skill Level</Label>
              <Input
                id="player2-skill"
                value={player2SkillLevel}
                onChange={(e) => setPlayer2SkillLevel(e.target.value)}
                placeholder="e.g., 3.5"
              />
            </div>
            <div>
              <Label htmlFor="player2-age">Age Group</Label>
              <Input
                id="player2-age"
                value={player2AgeGroup}
                onChange={(e) => setPlayer2AgeGroup(e.target.value)}
                placeholder="e.g., 35+"
              />
            </div>
            <div>
              <Label htmlFor="player2-gender">Gender</Label>
              {isMixedCategory ? (
                <Select value={player2Gender} onValueChange={(value: "Male" | "Female") => setPlayer2Gender(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="player2-gender"
                  value={player2Gender}
                  disabled
                  className="bg-slate-100 dark:bg-slate-700"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {!isSingles && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="team-skill">Team Skill Level</Label>
            <Input
              id="team-skill"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              placeholder="e.g., 4.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-age">Team Age Group</Label>
            <Input
              id="team-age"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              placeholder="e.g., 35+"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="team-seed">Seed (Optional)</Label>
        <Input
          id="team-seed"
          value={teamSeed}
          onChange={(e) => setTeamSeed(e.target.value)}
          placeholder="e.g., 1"
          type="number"
        />
      </div>

      <Button
        type="button"
        onClick={handleAddTeam}
        className="w-full"
      >
        Add Team
      </Button>
    </div>
  );
}

interface TournamentFormProps {
  userId: string;
  tournament?: Tournament;
  isEditing?: boolean;
}

export default function TournamentForm({ userId, tournament, isEditing = false }: TournamentFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryGender, setCategoryGender] = useState<"Mens" | "Womens" | "mixed" | undefined>("Mens");
  const [categoryDivision, setCategoryDivision] = useState<"singles" | "doubles" | undefined>("singles");
  const [categoryMaxSkillLevel, setCategoryMaxSkillLevel] = useState(8.0);
  const [categoryMinSkillLevel, setCategoryMinSkillLevel] = useState(2.0);
  const [categoryAgeGroup, setCategoryAgeGroup] = useState("");
  const [categorySeedingMethod, setCategorySeedingMethod] = useState("Random");
  const [categoryFormat, setCategoryFormat] = useState<TournamentFormat>(TournamentFormat.ROUND_ROBIN);
  
  // Game configuration for different stages - now per category
  const [earlyRoundGames, setEarlyRoundGames] = useState<number>(1);
  const [quarterFinalGames, setQuarterFinalGames] = useState<number>(3);
  const [semiFinalGames, setSemiFinalGames] = useState<number>(3);
  const [finalGames, setFinalGames] = useState<number>(3);

  // Points to win per stage - now per category
  const [earlyRoundPoints, setEarlyRoundPoints] = useState<number>(11);
  const [quarterFinalPoints, setQuarterFinalPoints] = useState<number>(11);
  const [semiFinalPoints, setSemiFinalPoints] = useState<number>(11);
  const [finalPoints, setFinalPoints] = useState<number>(11);

  // Pool play configuration - now per category
  const [numberOfPools, setNumberOfPools] = useState<number>(4);
  
  // Track which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Effect to populate form with existing tournament data when editing
  useEffect(() => {
    if (isEditing && tournament) {
      setName(tournament.name);
      setDescription(tournament.description || "");
      setLocation(tournament.location || "");
      setStartDate(tournament.startDate || "");
      setCategories(tournament.categories || []);
    }
  }, [isEditing, tournament]);

  // Effect to handle mixed gender logic
  useEffect(() => {
    if (categoryGender === "mixed") {
      setCategoryDivision("doubles");
    }
  }, [categoryGender]);

  const handleAddTeam = (team: Team, categoryId: string) => {
    // Add team to the specified category
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, teams: [...(cat.teams || []), { ...team, id: Date.now().toString() }] }
        : cat
    ));
  };

  const handleAddCategory = (category: Category) => {
    if (!category.gender || !category.division || !category.seedingMethod) {
      alert("Please fill in all required category fields");
      return;
    }
    
    // Add tournament configuration to the category
    const categoryWithConfig = {
      ...category,
      format: categoryFormat,
      earlyRoundGames,
      quarterFinalGames,
      semiFinalGames,
      finalGames,
      earlyRoundPoints,
      quarterFinalPoints,
      semiFinalPoints,
      finalPoints,
      numberOfPools: categoryFormat === TournamentFormat.POOL_PLAY ? numberOfPools : undefined,
      teams: [],
      matches: [],
      pools: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };
    
    setCategories((prev) => [...prev, categoryWithConfig]);
  };

  const resetCategoryFields = () => {
    setCategoryGender(undefined);
    setCategoryDivision(undefined);
    setCategoryMaxSkillLevel(8.0);
    setCategoryMinSkillLevel(2.0);
    setCategoryAgeGroup("");
    setCategorySeedingMethod("");
    // Reset match configuration to defaults
    setEarlyRoundGames(1);
    setQuarterFinalGames(3);
    setSemiFinalGames(3);
    setFinalGames(3);
    setEarlyRoundPoints(11);
    setQuarterFinalPoints(11);
    setSemiFinalPoints(11);
    setFinalPoints(11);
    setNumberOfPools(4);
  };

  const handleRemoveCategory = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    // Remove from expanded categories if it was expanded
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleRemoveTeam = (categoryId: string, teamId: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, teams: (cat.teams || []).filter(team => team.id !== teamId) }
        : cat
    ));
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) return;

    if (categories.length === 0) {
      alert("Please add at least one category before creating the tournament");
      return;
    }

    if (isEditing && tournament) {
      // Update existing tournament
      const updatedTournament = {
        ...tournament,
        name,
        description,
        categories: categories,
        location,
        startDate,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        updatedAt: new Date(),
        updatedBy: userId,
      };

      const validateUser = await authenticateUser();
      if (validateUser) {
        await updateTournamentInDB(updatedTournament);
        router.push(`/tournaments/${tournament.slug || tournament.id}`);
      }
    } else {
      // Create new tournament
      const newTournament = {
        id: `tournament-${Date.now()}`,
        name,
        description,
        categories: categories,
        organizerId: userId,
        createdAt: Date.now(),
        totalRounds: 0, // Will be calculated based on category matches
        totalWinnerRounds: 0,
        createdBy: userId,
        location,
        startDate,
        endDate: "",
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        isStarted: false,
        knockoutBracketPopulated: false,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      const validateUser = await authenticateUser();
      if (validateUser) {
        await createTournamentInDB(newTournament);
        router.push("/tournaments");
      }
    }
  };

  const handleAddDummyTeams = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    const dummyTeams = generateDummyPickleballTeams(16, category);
    
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, teams: [...(cat.teams || []), ...dummyTeams] }
        : cat
    ));
  };

  // Get total teams across all categories
  const totalTeams = categories.reduce((total, cat) => total + (cat.teams?.length || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Pickleball Tournament' : 'Create New Pickleball Tournament'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update your tournament details and manage categories with teams/players' : 'Set up your tournament details and add categories with teams/players'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter tournament name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter tournament description"
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter venue location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categories">Categories</Label>

              <div className="space-y-6 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                <h4 className="text-md font-medium">Category Configuration</h4>
                
                <div className="space-y-2 flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[120px] space-y-1">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={categoryGender || ""} onValueChange={(value: "Mens" | "Womens" | "mixed") => setCategoryGender(value)}>
                      <SelectTrigger><SelectValue placeholder="Select gender"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mens">Mens</SelectItem>
                        <SelectItem value="Womens">Womens</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[120px] space-y-1">
                    <Label htmlFor="division">Division</Label>
                    <Select 
                      value={categoryDivision || ""} 
                      onValueChange={(value: "singles" | "doubles") => setCategoryDivision(value)}
                      disabled={categoryGender === "mixed"}
                    >
                      <SelectTrigger><SelectValue placeholder="Select division"/></SelectTrigger>
                      <SelectContent>
                        {categoryGender !== "mixed" && <SelectItem value="singles">Singles</SelectItem>}
                        <SelectItem value="doubles">Doubles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[100px] space-y-2">
                    <Label htmlFor="minRating">Min rating</Label>
                    <Input
                      id="minRating"
                      value={categoryMinSkillLevel}
                      onChange={(e) => setCategoryMinSkillLevel(Math.max(parseFloat(e.target.value) || 0, 2.0))}
                      placeholder="e.g., 2.0"
                    />
                  </div>

                  <div className="w-[100px] space-y-2">
                    <Label htmlFor="maxRating">Max rating</Label>
                    <Input
                      id="maxRating"
                      value={categoryMaxSkillLevel}
                      onChange={(e) => setCategoryMaxSkillLevel(Math.min(parseFloat(e.target.value) || 0, 8.0))}
                      placeholder="e.g., 8.0"
                    />
                  </div>

                  <div className="flex-1 min-w-[140px] space-y-1">
                    <Label htmlFor="ageGroup">Age Group</Label>
                    <Input
                      id="ageGroup"
                      value={categoryAgeGroup}
                      onChange={(e) => setCategoryAgeGroup(e.target.value == "" ? "Open" : e.target.value)}
                      placeholder="e.g., 35+"
                    />
                  </div>

                  <div className="flex-1 min-w-[160px] space-y-1">
                    <Label htmlFor="format">Tournament Format</Label>
                    <Select value={categoryFormat} onValueChange={(value) => {
                      const newFormat = value as TournamentFormat;
                      setCategoryFormat(newFormat);
                      // Reset pools to 0 if format is not pool play
                      if (newFormat !== TournamentFormat.POOL_PLAY) {
                        setNumberOfPools(0);
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select format"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TournamentFormat.ROUND_ROBIN}>Round Robin</SelectItem>
                        <SelectItem value={TournamentFormat.DOUBLE_ELIMINATION}>Double Elimination</SelectItem>
                        <SelectItem value={TournamentFormat.SINGLE_ELIMINATION}>Single Elimination</SelectItem>
                        <SelectItem value={TournamentFormat.POOL_PLAY}>Pool Play + Playoffs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {categoryFormat === TournamentFormat.POOL_PLAY && (
                    <div className="w-[140px] space-y-1">
                      <Label htmlFor="numberOfPools">Number of Pools</Label>
                      <Select value={numberOfPools.toString()} onValueChange={(value) => setNumberOfPools(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Pools</SelectItem>
                          <SelectItem value="3">3 Pools</SelectItem>
                          <SelectItem value="4">4 Pools</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex-1 min-w-[160px] space-y-1">
                    <Label htmlFor="seedingMethod">Seeding Method</Label>
                    <Select value={categorySeedingMethod} onValueChange={setCategorySeedingMethod}>
                      <SelectTrigger><SelectValue placeholder="seeding"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Random">Random</SelectItem>
                        <SelectItem value="Ranking_Based">Ranking Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      if (categoryGender && categoryDivision && categorySeedingMethod) {
                        handleAddCategory({
                          id: Date.now().toString(),
                          gender: categoryGender,
                          division: categoryDivision,
                          skillLevel: { min: categoryMinSkillLevel, max: categoryMaxSkillLevel },
                          ageGroup: categoryAgeGroup || "Open",
                          seedingMethod: categorySeedingMethod as any,
                          format: categoryFormat,
                        });
                      }
                      resetCategoryFields();
                    }}
                  >
                    Add
                  </Button>
                </div>



                <div className="space-y-4 p-4 border rounded-md bg-white dark:bg-slate-800">
                  <h5 className="text-sm font-medium">Match Configuration</h5>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="earlyRoundGames">Early Round Games</Label>
                      <Select value={earlyRoundGames.toString()} onValueChange={(value) => setEarlyRoundGames(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Game</SelectItem>
                          <SelectItem value="2">2 Games</SelectItem>
                          <SelectItem value="3">3 Games</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quarterFinalGames">Quarter Final Games</Label>
                      <Select value={quarterFinalGames.toString()} onValueChange={(value) => setQuarterFinalGames(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Game</SelectItem>
                          <SelectItem value="2">2 Games</SelectItem>
                          <SelectItem value="3">3 Games</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="semiFinalGames">Semi Final Games</Label>
                      <Select value={semiFinalGames.toString()} onValueChange={(value) => setSemiFinalGames(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Game</SelectItem>
                          <SelectItem value="2">2 Games</SelectItem>
                          <SelectItem value="3">3 Games</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="finalGames">Final Games</Label>
                      <Select value={finalGames.toString()} onValueChange={(value) => setFinalGames(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Game</SelectItem>
                          <SelectItem value="2">2 Games</SelectItem>
                          <SelectItem value="3">3 Games</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="earlyRoundPoints">Early Round Points</Label>
                      <Select value={earlyRoundPoints.toString()} onValueChange={(value) => setEarlyRoundPoints(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="11">11 Points</SelectItem>
                          <SelectItem value="15">15 Points</SelectItem>
                          <SelectItem value="21">21 Points</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quarterFinalPoints">Quarter Final Points</Label>
                      <Select value={quarterFinalPoints.toString()} onValueChange={(value) => setQuarterFinalPoints(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="11">11 Points</SelectItem>
                          <SelectItem value="15">15 Points</SelectItem>
                          <SelectItem value="21">21 Points</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="semiFinalPoints">Semi Final Points</Label>
                      <Select value={semiFinalPoints.toString()} onValueChange={(value) => setSemiFinalPoints(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="11">11 Points</SelectItem>
                          <SelectItem value="15">15 Points</SelectItem>
                          <SelectItem value="21">21 Points</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="finalPoints">Final Points</Label>
                      <Select value={finalPoints.toString()} onValueChange={(value) => setFinalPoints(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="11">11 Points</SelectItem>
                          <SelectItem value="15">15 Points</SelectItem>
                          <SelectItem value="21">21 Points</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Categories Display - moved to bottom of Categories section */}
              {categories.length > 0 && (
                <div className="space-y-4 p-4 border rounded-md bg-white dark:bg-slate-800">
                  <h5 className="text-sm font-medium">Added Categories</h5>
                  
                  <div className="space-y-4">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="border rounded-md bg-slate-50 dark:bg-slate-700"
                      >
                        {/* Category Header */}
                        <div className="flex items-center justify-between p-3 border-b">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">
                                {category.gender} {category.division}
                              </span>
                              <span className="text-slate-500">
                                ({category.skillLevel?.min || 'N/A'}-{category.skillLevel?.max || 'N/A'})
                              </span>
                              {category.ageGroup && (
                                <span className="text-slate-500">
                                  • {category.ageGroup}
                                </span>
                              )}
                              <span className="text-slate-500">
                                • {category.format}
                              </span>
                              {category.format === TournamentFormat.POOL_PLAY && category.numberOfPools && (
                                <span className="text-slate-500">
                                  • {category.numberOfPools} pools
                                </span>
                              )}
                              <span className="text-slate-500">
                                • {category.seedingMethod}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {category.teams?.length || 0} teams • 
                              Early: {category.earlyRoundGames} games to {category.earlyRoundPoints} • 
                              QF: {category.quarterFinalGames} games to {category.quarterFinalPoints} • 
                              SF: {category.semiFinalGames} games to {category.semiFinalPoints} • 
                              Final: {category.finalGames} games to {category.finalPoints}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleCategoryExpansion(category.id)}
                            >
                              {expandedCategories.has(category.id) ? 'Hide Teams' : 'Manage Teams'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddDummyTeams(category.id)}
                            >
                              Add 16 Teams
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveCategory(category.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>

                        {/* Expandable Teams Section */}
                        {expandedCategories.has(category.id) && (
                          <div className="p-4 space-y-4">
                            {/* Add Team Interface */}
                            <div className="border rounded-md p-4 bg-white dark:bg-slate-800">
                              <h6 className="text-sm font-medium mb-3">Add New Team</h6>
                              <AddTeamInterface 
                                category={category}
                                onAddTeam={(team) => handleAddTeam(team, category.id)}
                              />
                            </div>

                            {/* Teams List */}
                            {category.teams && category.teams.length > 0 && (
                              <div className="border rounded-md p-4 bg-white dark:bg-slate-800">
                                <h6 className="text-sm font-medium mb-3">Registered Teams ({category.teams.length})</h6>
                                <div className="space-y-2">
                                  {category.teams.map((team) => (
                                    <div
                                      key={team.id}
                                      className="flex items-center justify-between p-2 border rounded bg-slate-50 dark:bg-slate-600"
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{team.name}</div>
                                        {team.players && team.players.length > 0 && (
                                          <div className="text-xs text-slate-500">
                                            Players: {team.players.join(', ')}
                                          </div>
                                        )}
                                        <div className="text-xs text-slate-500">
                                          Skill: {team.skillLevel || 'N/A'} • 
                                          Age: {team.ageGroup || 'N/A'}
                                          {team.playerDetails && team.playerDetails.length > 0 && (
                                            <>
                                              {team.playerDetails.map((player, index) => (
                                                <span key={index}>
                                                  {index === 0 ? ' • ' : ', '}
                                                  {player.gender || 'N/A'}
                                                </span>
                                              ))}
                                            </>
                                          )}
                                          {team.seed && ` • Seed: ${team.seed}`}
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRemoveTeam(category.id, team.id)}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* No Teams Message */}
                            {(!category.teams || category.teams.length === 0) && (
                              <div className="text-center py-4 text-slate-500">
                                No teams registered yet. Add teams above or use "Add 16 Teams" for quick setup.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          

          <div className="flex justify-end">
            <Button type="submit">{isEditing ? 'Update Tournament' : 'Create Tournament'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Helper function to generate dummy pickleball teams
function generateDummyPickleballTeams(
  count: number,
  category: Category
): Team[] {
  const playerFirstNames = [
    "John", "Sarah", "Michael", "Emma", "David", "Lisa", "Robert", "Jennifer",
    "William", "Maria", "James", "Linda", "Thomas", "Patricia", "Charles", "Elizabeth",
    "Daniel", "Barbara", "Matthew", "Susan", "Anthony", "Jessica", "Mark", "Mary",
    "Paul", "Karen", "Steven", "Nancy", "Andrew", "Margaret", "Kenneth", "Betty",
  ];

  const playerLastNames = [
    "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson",
    "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin",
    "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee",
    "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez",
  ];

  const skillLevels = ["3.0", "3.5", "4.0", "4.5", "5.0"];
  const ageGroups = ["19+", "35+", "50+", "65+"];

  return Array.from({ length: count }, (_, i) => {
    const skillLevel = skillLevels[Math.floor(Math.random() * skillLevels.length)];
    const ageGroup = ageGroups[Math.floor(Math.random() * ageGroups.length)];

    if (category.division === "singles") {
      const firstName = playerFirstNames[Math.floor(Math.random() * playerFirstNames.length)];
      const lastName = playerLastNames[Math.floor(Math.random() * playerLastNames.length)];
      const playerName = `${firstName} ${lastName}`;

      return {
        id: (i + 1).toString(),
        name: playerName,
        seed: i + 1,
        skillLevel,
        ageGroup,
        gender: category.gender === "Mens" ? "Men" : category.gender === "Womens" ? "Women" : "Mixed",
      };
    } else {
      // For doubles
      const player1FirstName = playerFirstNames[Math.floor(Math.random() * playerFirstNames.length)];
      const player1LastName = playerLastNames[Math.floor(Math.random() * playerLastNames.length)];
      const player2FirstName = playerFirstNames[Math.floor(Math.random() * playerFirstNames.length)];
      const player2LastName = playerLastNames[Math.floor(Math.random() * playerLastNames.length)];

      const player1 = `${player1FirstName} ${player1LastName}`;
      const player2 = `${player2FirstName} ${player2LastName}`;

      const teamName = `${player1LastName}/${player2LastName}`;
      let gender: "Men" | "Women" | "Mixed" = "Men";

      if (category.gender === "mixed") {
        gender = "Mixed";
      } else if (category.gender === "Womens") {
        gender = "Women";
      }

      return {
        id: (i + 1).toString(),
        name: teamName,
        players: [player1, player2],
        seed: i + 1,
        skillLevel,
        ageGroup,
        gender,
      };
    }
  });
}
