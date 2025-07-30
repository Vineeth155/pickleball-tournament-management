"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Team } from "@/lib/types"

interface TeamFormProps {
  onAddTeam: (team: Team) => void
  renderAsForm?: boolean
  matchType?: "Singles" | "Doubles" | "Mixed Doubles"
}

export default function TeamForm({ onAddTeam, renderAsForm = true, matchType = "Singles" }: TeamFormProps) {
  const [teamName, setTeamName] = useState("")
  const [player1, setPlayer1] = useState("")
  const [player2, setPlayer2] = useState("")
  const [teamSeed, setTeamSeed] = useState("")
  const [skillLevel, setSkillLevel] = useState("")
  const [ageGroup, setAgeGroup] = useState("")
  const [gender, setGender] = useState<"Men" | "Women" | "Mixed">("Men")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // No early return - we'll let the parent validate and disable the add button

    const newTeam: Team = {
      id: "", // Will be set by parent component
      name: matchType === "Singles" ? player1.trim() : teamName.trim(),
      seed: teamSeed ? Number.parseInt(teamSeed) : undefined,
      skillLevel: skillLevel || undefined,
      ageGroup: ageGroup || undefined,
      gender: gender || undefined,
    }

    if (matchType !== "Singles") {
      newTeam.players = [player1.trim(), player2.trim()]
    }

    onAddTeam(newTeam)

    setTeamName("")
    setPlayer1("")
    setPlayer2("")
    setTeamSeed("")
    setSkillLevel("")
    setAgeGroup("")
  }

  const formContent = (
    <div className="space-y-4">
      {matchType !== "Singles" && (
        <div className="space-y-2">
          <Label htmlFor="team-name">Team Name</Label>
          <Input
            id="team-name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name (e.g., Smith/Johnson)"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="player1">{matchType === "Singles" ? "Player Name" : "Player 1 Name"}</Label>
        <Input
          id="player1"
          value={player1}
          onChange={(e) => setPlayer1(e.target.value)}
          placeholder="Enter player name"
        />
      </div>

      {matchType !== "Singles" && (
        <div className="space-y-2">
          <Label htmlFor="player2">Player 2 Name</Label>
          <Input
            id="player2"
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            placeholder="Enter player name"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="skill-level">Skill Level</Label>
          <Select value={skillLevel} onValueChange={setSkillLevel}>
            <SelectTrigger id="skill-level">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2.5">2.5</SelectItem>
              <SelectItem value="3.0">3.0</SelectItem>
              <SelectItem value="3.5">3.5</SelectItem>
              <SelectItem value="4.0">4.0</SelectItem>
              <SelectItem value="4.5">4.5</SelectItem>
              <SelectItem value="5.0">5.0</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="age-group">Age Group</Label>
          <Select value={ageGroup} onValueChange={setAgeGroup}>
            <SelectTrigger id="age-group">
              <SelectValue placeholder="Select age" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="19+">19+</SelectItem>
              <SelectItem value="35+">35+</SelectItem>
              <SelectItem value="50+">50+</SelectItem>
              <SelectItem value="65+">65+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">Gender Category</Label>
        <Select
          value={gender}
          onValueChange={(val) => setGender(val as "Men" | "Women" | "Mixed")}
          disabled={matchType === "Mixed Doubles"}
        >
          <SelectTrigger id="gender">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Men">Men's</SelectItem>
            <SelectItem value="Women">Women's</SelectItem>
            {matchType !== "Mixed Doubles" && <SelectItem value="Mixed">Mixed</SelectItem>}
          </SelectContent>
        </Select>
        {matchType === "Mixed Doubles" && (
          <p className="text-xs text-muted-foreground">Mixed category is automatically selected for Mixed Doubles</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="team-seed">Seed (Optional)</Label>
        <Input
          id="team-seed"
          type="number"
          min="1"
          value={teamSeed}
          onChange={(e) => setTeamSeed(e.target.value)}
          placeholder="Enter seed number (optional)"
        />
        <p className="text-xs text-muted-foreground">Seeds determine team placement in the bracket</p>
      </div>

      <Button
        type={renderAsForm ? "submit" : "button"}
        className="w-full"
        onClick={renderAsForm ? undefined : handleSubmit}
        disabled={matchType === "Singles" ? !player1.trim() : !teamName.trim() || !player1.trim() || !player2.trim()}
      >
        Add {matchType === "Singles" ? "Player" : "Team"}
      </Button>
    </div>
  )

  if (renderAsForm) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {formContent}
      </form>
    )
  }

  return formContent
}
