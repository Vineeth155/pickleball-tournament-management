"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getStoredUser, loadTournamentsFromLocalStorage } from "@/lib/auth"
import { getAllTournaments, updateTournament } from "@/lib/tournament-store"
import type { User, Tournament, Team } from "@/lib/types"
import { ArrowLeft, Save, Upload, Users } from "lucide-react"
import TeamForm from "@/components/team-form"
import { useToast } from "@/hooks/use-toast"

export default function EditTournamentPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [startDate, setStartDate] = useState("")
  const [division, setDivision] = useState("")
  const [bulkTeamsText, setBulkTeamsText] = useState("")
  const [bulkTeamsError, setBulkTeamsError] = useState("")

  // Load user and tournament from localStorage on initial render
  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      setCurrentUser(user)
    } else {
      // Redirect non-logged in users
      router.push("/")
      return
    }

    // Redirect non-admin users
    if (user && !user.isAdmin) {
      router.push("/")
      return
    }

    // Load tournaments from localStorage
    loadTournamentsFromLocalStorage()

    // Find tournament by slug
    const slug = params?.tournamentSlug as string
    if (slug) {
      const allTournaments = getAllTournaments()
      const foundTournament = allTournaments.find((t) => t.slug === slug || createSlug(t.name) === slug)

      if (foundTournament) {
        setTournament(foundTournament)
        setName(foundTournament.name)
        setDescription(foundTournament.description || "")
        setLocation(foundTournament.location || "")
        setStartDate(foundTournament.startDate || "")
        setDivision(foundTournament.division || "")
      } else {
        // Tournament not found, redirect to tournaments list
        router.push("/tournaments")
      }
    }
  }, [params, router])

  // Helper function to create a URL-friendly slug
  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
  }

  const handleAddTeam = (team: Team) => {
    if (!tournament) return

    const updatedTournament = {
      ...tournament,
      teams: [...tournament.teams, { ...team, id: Date.now().toString() }],
    }

    updateTournament(updatedTournament)
    setTournament(updatedTournament)

    // Show toast notification
    toast({
      title: "Team Added",
      description: `${team.name} has been added to the tournament.`,
      variant: "success",
    })
  }

  const handleRemoveTeam = (id: string) => {
    if (!tournament) return

    const teamToRemove = tournament.teams.find((team) => team.id === id)
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.filter((team) => team.id !== id),
    }

    updateTournament(updatedTournament)
    setTournament(updatedTournament)

    // Show toast notification
    if (teamToRemove) {
      toast({
        title: "Team Removed",
        description: `${teamToRemove.name} has been removed from the tournament.`,
      })
    }
  }

  const handleSaveBasicInfo = () => {
    if (!tournament) return

    const updatedTournament = {
      ...tournament,
      name,
      description,
      location,
      startDate,
      division,
      slug: createSlug(name),
    }

    updateTournament(updatedTournament)
    setTournament(updatedTournament)

    // Show toast notification
    toast({
      title: "Changes Saved",
      description: "Tournament information has been updated successfully.",
      variant: "success",
    })
  }

  const handleBulkAddTeams = () => {
    if (!tournament || !bulkTeamsText.trim()) return

    try {
      setBulkTeamsError("")

      // Parse the bulk text (expecting format: "Team Name, Player1, Player2, Skill Level")
      const lines = bulkTeamsText.trim().split("\n")
      const newTeams: Team[] = []

      lines.forEach((line, index) => {
        const parts = line.split(",").map((part) => part.trim())

        if (parts.length < 1) {
          throw new Error(`Line ${index + 1}: Invalid format`)
        }

        const matchType = tournament.matchType || "Singles"
        let team: Team

        if (matchType === "Singles") {
          // For singles, expect: "Player Name, Skill Level (optional), Age Group (optional)"
          team = {
            id: `team-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
            name: parts[0],
            skillLevel: parts.length > 1 ? parts[1] : undefined,
            ageGroup: parts.length > 2 ? parts[2] : undefined,
            gender: parts.length > 3 ? (parts[3] as "Men" | "Women" | "Mixed") : "Men",
          }
        } else {
          // For doubles, expect: "Team Name, Player1, Player2, Skill Level (optional), Age Group (optional)"
          if (parts.length < 3) {
            throw new Error(`Line ${index + 1}: For doubles, need at least team name and 2 players`)
          }

          team = {
            id: `team-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
            name: parts[0],
            players: [parts[1], parts[2]],
            skillLevel: parts.length > 3 ? parts[3] : undefined,
            ageGroup: parts.length > 4 ? parts[4] : undefined,
            gender:
              parts.length > 5
                ? (parts[5] as "Men" | "Women" | "Mixed")
                : matchType === "Mixed Doubles"
                  ? "Mixed"
                  : "Men",
          }
        }

        newTeams.push(team)
      })

      // Add the new teams to the tournament
      const updatedTournament = {
        ...tournament,
        teams: [...tournament.teams, ...newTeams],
      }

      updateTournament(updatedTournament)
      setTournament(updatedTournament)
      setBulkTeamsText("")

      // Show toast notification
      toast({
        title: "Teams Added",
        description: `${newTeams.length} teams have been added to the tournament.`,
        variant: "success",
      })
    } catch (error) {
      setBulkTeamsError(error instanceof Error ? error.message : "Invalid format")

      // Show error toast
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid format",
        variant: "destructive",
      })
    }
  }

  if (!tournament || !currentUser?.isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>Loading tournament or checking permissions...</p>
      </div>
    )
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-6" onClick={() => router.push(`/${params?.tournamentSlug}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tournament Details
      </Button>

      <h1 className="text-3xl font-bold mb-8">Edit Tournament: {tournament.name}</h1>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="teams">Manage Teams</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Add Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Information</CardTitle>
              <CardDescription>Edit the basic details of your tournament</CardDescription>
            </CardHeader>
            <CardContent>
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
                  <Label htmlFor="description">Description</Label>
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

                <Button onClick={handleSaveBasicInfo} className="mt-2">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Manage Teams</CardTitle>
              <CardDescription>Add or remove teams from the tournament</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Add New Team</h3>
                  <TeamForm
                    onAddTeam={handleAddTeam}
                    renderAsForm={false}
                    matchType={tournament.matchType || "Singles"}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Team List ({tournament.teams.length})</h3>
                  {tournament.teams.length === 0 ? (
                    <p className="text-muted-foreground">No teams added yet</p>
                  ) : (
                    <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                      {tournament.teams.map((team) => (
                        <li key={team.id} className="flex items-center justify-between border p-3 rounded-md">
                          <div>
                            <p className="font-medium">{team.name}</p>
                            {team.players && team.players.length > 0 && (
                              <p className="text-sm text-muted-foreground">{team.players.join(" / ")}</p>
                            )}
                            {team.skillLevel && (
                              <p className="text-sm text-muted-foreground">Skill: {team.skillLevel}</p>
                            )}
                          </div>
                          <Button variant="destructive" size="sm" onClick={() => handleRemoveTeam(team.id)}>
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Add Teams</CardTitle>
              <CardDescription>Add multiple teams at once by pasting data in CSV format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <h3 className="font-medium mb-2 flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Format Instructions
                  </h3>
                  <p className="text-sm mb-2">Enter one team per line in the following format:</p>
                  {tournament.matchType === "Singles" ? (
                    <p className="text-sm font-mono bg-blue-100 dark:bg-blue-800 p-2 rounded">
                      Player Name, Skill Level (optional), Age Group (optional), Gender (optional)
                    </p>
                  ) : (
                    <p className="text-sm font-mono bg-blue-100 dark:bg-blue-800 p-2 rounded">
                      Team Name, Player1 Name, Player2 Name, Skill Level (optional), Age Group (optional), Gender
                      (optional)
                    </p>
                  )}
                  <p className="text-sm mt-2">
                    Example:{" "}
                    {tournament.matchType === "Singles"
                      ? "John Smith, 4.0, 35+, Men"
                      : "Smith/Johnson, John Smith, Jane Johnson, 4.0, 35+, Mixed"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-teams">Paste Teams Data</Label>
                  <Textarea
                    id="bulk-teams"
                    value={bulkTeamsText}
                    onChange={(e) => setBulkTeamsText(e.target.value)}
                    placeholder={`Enter teams, one per line
Example: ${
                      tournament.matchType === "Singles"
                        ? "John Smith, 4.0, 35+, Men"
                        : "Smith/Johnson, John Smith, Jane Johnson, 4.0, 35+, Mixed"
                    }`}
                    rows={10}
                    className="font-mono"
                  />
                  {bulkTeamsError && <p className="text-sm text-red-500">{bulkTeamsError}</p>}
                </div>

                <Button onClick={handleBulkAddTeams} disabled={!bulkTeamsText.trim()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Add Teams
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
