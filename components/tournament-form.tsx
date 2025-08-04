"use client";

import type React from "react";

import { useState } from "react";
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
import TeamForm from "@/components/team-form";
import { type Team, TournamentFormat } from "@/lib/types";
import { generateBracket } from "@/lib/bracket-utils";
import { createTournamentInDB } from "@/lib/tournament-store";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { authenticateUser } from "@/lib/auth";

interface TournamentFormProps {
  userId: string;
}

export default function TournamentForm({ userId }: TournamentFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<TournamentFormat>(
    TournamentFormat.ROUND_ROBIN
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [division, setDivision] = useState("");
  const [pointsToWin, setPointsToWin] = useState<number>(11);
  const [winBy, setWinBy] = useState<number>(2);
  const [matchType, setMatchType] = useState<
    "Singles" | "Doubles" | "Mixed Doubles"
  >("Singles");

  // Game configuration for different stages
  const [earlyRoundGames, setEarlyRoundGames] = useState<number>(1);
  const [quarterFinalGames, setQuarterFinalGames] = useState<number>(3);
  const [semiFinalGames, setSemiFinalGames] = useState<number>(3);
  const [finalGames, setFinalGames] = useState<number>(3);

  // Points to win per stage
  const [earlyRoundPoints, setEarlyRoundPoints] = useState<number>(11);
  const [quarterFinalPoints, setQuarterFinalPoints] = useState<number>(11);
  const [semiFinalPoints, setSemiFinalPoints] = useState<number>(11);
  const [finalPoints, setFinalPoints] = useState<number>(11);

  // Pool play configuration
  const [enablePoolPlay, setEnablePoolPlay] = useState<boolean>(true);

  const handleAddTeam = (team: Team) => {
    setTeams((prev) => [...prev, { ...team, id: Date.now().toString() }]);
  };

  const handleRemoveTeam = (id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) return;

    // Generate a new bracket with the current teams
    const tournament = generateBracket(
      teams,
      name,
      format,
      description,
      userId,
      {
        enablePoolPlay: format === TournamentFormat.POOL_PLAY, // Only enable pool play if explicitly selected
        earlyRoundGames,
        quarterFinalGames,
        semiFinalGames,
        finalGames,
        earlyRoundPoints,
        quarterFinalPoints,
        semiFinalPoints,
        finalPoints,
      }
    );

    // Add pickleball-specific settings
    tournament.location = location;
    tournament.startDate = startDate;
    tournament.division = division;
    tournament.pointsToWin = pointsToWin;
    tournament.winBy = winBy;
    tournament.matchType = matchType;

    const validateUser = await authenticateUser();
    validateUser && (await createTournamentInDB(tournament));

    router.push("/tournaments");
  };

  const handleAddDummyTeams = () => {
    setTeams(generateDummyPickleballTeams(16, matchType));
  };

  // Determine if pool play is applicable
  const isPoolPlayApplicable =
    teams.length >= 8 &&
    (format === TournamentFormat.SINGLE_ELIMINATION ||
      format === TournamentFormat.DOUBLE_ELIMINATION);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Pickleball Tournament</CardTitle>
        <CardDescription>
          Set up your tournament details and add teams/players
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
              <Label htmlFor="division">Division</Label>
              <Input
                id="division"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                placeholder="e.g., Men's 4.0 35+"
              />
            </div>

            <div className="space-y-2">
              <Label>Tournament Format</Label>
              <RadioGroup
                value={format}
                onValueChange={(value) => setFormat(value as TournamentFormat)}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={TournamentFormat.ROUND_ROBIN}
                    id="robin"
                  />
                  <Label htmlFor="robin" className="font-normal">
                    Round Robin (recommended for small groups)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={TournamentFormat.DOUBLE_ELIMINATION}
                    id="double"
                  />
                  <Label htmlFor="double" className="font-normal">
                    Double Elimination
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={TournamentFormat.SINGLE_ELIMINATION}
                    id="single"
                  />
                  <Label htmlFor="single" className="font-normal">
                    Single Elimination
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={TournamentFormat.POOL_PLAY}
                    id="pool"
                  />
                  <Label htmlFor="pool" className="font-normal">
                    Pool Play + Playoffs
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {isPoolPlayApplicable && (
              <div className="space-y-2 p-3 border rounded-md bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enablePoolPlay"
                    checked={enablePoolPlay}
                    onChange={(e) => setEnablePoolPlay(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="enablePoolPlay" className="font-medium">
                    Enable Pool Play
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  With 8+ teams, enable pool play to group teams into pools for
                  round-robin play before knockout stage. Teams will be
                  distributed based on seeding to ensure balanced pools.
                </p>
              </div>
            )}

            <Separator className="my-4" />

            <div className="space-y-4">
              <h3 className="text-md font-medium">Match Configuration</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matchType">Match Type</Label>
                  <Select
                    value={matchType}
                    onValueChange={(value) => setMatchType(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select match type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Singles">Singles</SelectItem>
                      <SelectItem value="Doubles">Doubles</SelectItem>
                      <SelectItem value="Mixed Doubles">
                        Mixed Doubles
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pointsToWin">Points to Win</Label>
                  <Select
                    value={pointsToWin.toString()}
                    onValueChange={(value) =>
                      setPointsToWin(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select points" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11 Points</SelectItem>
                      <SelectItem value="15">15 Points</SelectItem>
                      <SelectItem value="21">21 Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="earlyRoundPoints">Early Round Points</Label>
                  <Select
                    value={earlyRoundPoints.toString()}
                    onValueChange={(value) =>
                      setEarlyRoundPoints(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Points" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11 Points</SelectItem>
                      <SelectItem value="13">13 Points</SelectItem>
                      <SelectItem value="15">15 Points</SelectItem>
                      <SelectItem value="21">21 Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quarterFinalPoints">
                    Quarter Final Points
                  </Label>
                  <Select
                    value={quarterFinalPoints.toString()}
                    onValueChange={(value) =>
                      setQuarterFinalPoints(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Points" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11 Points</SelectItem>
                      <SelectItem value="13">13 Points</SelectItem>
                      <SelectItem value="15">15 Points</SelectItem>
                      <SelectItem value="21">21 Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semiFinalPoints">Semi Final Points</Label>
                  <Select
                    value={semiFinalPoints.toString()}
                    onValueChange={(value) =>
                      setSemiFinalPoints(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Points" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11 Points</SelectItem>
                      <SelectItem value="13">13 Points</SelectItem>
                      <SelectItem value="15">15 Points</SelectItem>
                      <SelectItem value="21">21 Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finalPoints">Final Points</Label>
                  <Select
                    value={finalPoints.toString()}
                    onValueChange={(value) =>
                      setFinalPoints(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Points" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11 Points</SelectItem>
                      <SelectItem value="13">13 Points</SelectItem>
                      <SelectItem value="15">15 Points</SelectItem>
                      <SelectItem value="21">21 Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="earlyRoundGames">Early Rounds</Label>
                  <Select
                    value={earlyRoundGames.toString()}
                    onValueChange={(value) =>
                      setEarlyRoundGames(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Games" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Game</SelectItem>
                      <SelectItem value="3">Best of 3</SelectItem>
                      <SelectItem value="5">Best of 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quarterFinalGames">Quarter Finals</Label>
                  <Select
                    value={quarterFinalGames.toString()}
                    onValueChange={(value) =>
                      setQuarterFinalGames(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Games" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Game</SelectItem>
                      <SelectItem value="3">Best of 3</SelectItem>
                      <SelectItem value="5">Best of 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semiFinalGames">Semi Finals</Label>
                  <Select
                    value={semiFinalGames.toString()}
                    onValueChange={(value) =>
                      setSemiFinalGames(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Games" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Game</SelectItem>
                      <SelectItem value="3">Best of 3</SelectItem>
                      <SelectItem value="5">Best of 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finalGames">Finals</Label>
                  <Select
                    value={finalGames.toString()}
                    onValueChange={(value) =>
                      setFinalGames(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Games" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Game</SelectItem>
                      <SelectItem value="3">Best of 3</SelectItem>
                      <SelectItem value="5">Best of 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">
              Add {matchType === "Singles" ? "Players" : "Teams"} (Optional)
            </h3>

            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Note</AlertTitle>
              <AlertDescription>
                Adding teams is optional. You can create the tournament now and
                teams can register later.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <TeamForm
                  onAddTeam={handleAddTeam}
                  renderAsForm={false}
                  matchType={matchType}
                />

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDummyTeams}
                  >
                    Add Dummy {matchType === "Singles" ? "Players" : "Teams"}
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">
                  {matchType === "Singles" ? "Player" : "Team"} List (
                  {teams.length})
                </h4>
                {teams.length === 0 ? (
                  <p className="text-muted-foreground">
                    No {matchType === "Singles" ? "players" : "teams"} added yet
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                    {teams.map((team) => (
                      <li
                        key={team.id}
                        className="flex items-center justify-between border p-3 rounded-md"
                      >
                        <div>
                          <p className="font-medium">{team.name}</p>
                          {team.players && team.players.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {team.players.join(" / ")}
                            </p>
                          )}
                          {team.skillLevel && (
                            <p className="text-sm text-muted-foreground">
                              Skill: {team.skillLevel}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveTeam(team.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Create Tournament</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Helper function to generate dummy pickleball teams
function generateDummyPickleballTeams(
  count: number,
  matchType: "Singles" | "Doubles" | "Mixed Doubles"
): Team[] {
  const playerFirstNames = [
    "John",
    "Sarah",
    "Michael",
    "Emma",
    "David",
    "Lisa",
    "Robert",
    "Jennifer",
    "William",
    "Maria",
    "James",
    "Linda",
    "Thomas",
    "Patricia",
    "Charles",
    "Elizabeth",
    "Daniel",
    "Barbara",
    "Matthew",
    "Susan",
    "Anthony",
    "Jessica",
    "Mark",
    "Mary",
    "Paul",
    "Karen",
    "Steven",
    "Nancy",
    "Andrew",
    "Margaret",
    "Kenneth",
    "Betty",
  ];

  const playerLastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Jones",
    "Brown",
    "Davis",
    "Miller",
    "Wilson",
    "Moore",
    "Taylor",
    "Anderson",
    "Thomas",
    "Jackson",
    "White",
    "Harris",
    "Martin",
    "Thompson",
    "Garcia",
    "Martinez",
    "Robinson",
    "Clark",
    "Rodriguez",
    "Lewis",
    "Lee",
    "Walker",
    "Hall",
    "Allen",
    "Young",
    "Hernandez",
    "King",
    "Wright",
    "Lopez",
  ];

  const skillLevels = ["3.0", "3.5", "4.0", "4.5", "5.0"];
  const ageGroups = ["19+", "35+", "50+", "65+"];

  return Array.from({ length: count }, (_, i) => {
    const skillLevel =
      skillLevels[Math.floor(Math.random() * skillLevels.length)];
    const ageGroup = ageGroups[Math.floor(Math.random() * ageGroups.length)];

    if (matchType === "Singles") {
      const firstName =
        playerFirstNames[Math.floor(Math.random() * playerFirstNames.length)];
      const lastName =
        playerLastNames[Math.floor(Math.random() * playerLastNames.length)];
      const playerName = `${firstName} ${lastName}`;

      return {
        id: (i + 1).toString(),
        name: playerName,
        seed: i + 1,
        skillLevel,
        ageGroup,
        gender: Math.random() > 0.5 ? "Men" : "Women",
      };
    } else {
      // For doubles or mixed doubles
      const player1FirstName =
        playerFirstNames[Math.floor(Math.random() * playerFirstNames.length)];
      const player1LastName =
        playerLastNames[Math.floor(Math.random() * playerLastNames.length)];
      const player2FirstName =
        playerFirstNames[Math.floor(Math.random() * playerFirstNames.length)];
      const player2LastName =
        playerLastNames[Math.floor(Math.random() * playerLastNames.length)];

      const player1 = `${player1FirstName} ${player1LastName}`;
      const player2 = `${player2FirstName} ${player2LastName}`;

      const teamName = `${player1LastName}/${player2LastName}`;
      let gender: "Men" | "Women" | "Mixed" = "Men";

      if (matchType === "Mixed Doubles") {
        gender = "Mixed";
      } else {
        gender = Math.random() > 0.5 ? "Men" : "Women";
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
