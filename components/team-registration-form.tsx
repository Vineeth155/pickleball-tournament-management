"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Team, Tournament } from "@/lib/types"

interface TeamRegistrationFormProps {
  tournament: Tournament
  onSubmit: (team: Team) => void
  onCancel: () => void
}

export default function TeamRegistrationForm({ tournament, onSubmit, onCancel }: TeamRegistrationFormProps) {
  const [teamName, setTeamName] = useState("")
  const [player1, setPlayer1] = useState("")
  const [player2, setPlayer2] = useState("")
  const [skillLevel, setSkillLevel] = useState("")
  const [ageGroup, setAgeGroup] = useState("")
  const [gender, setGender] = useState<"Men" | "Women" | "Mixed">("Men")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const matchType = tournament.matchType || "Singles"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newTeam: Team = {
      id: `team-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: matchType === "Singles" ? player1.trim() : teamName.trim(),
      skillLevel: skillLevel || undefined,
      ageGroup: ageGroup || undefined,
      gender: gender || undefined,
      contactEmail: email,
      contactPhone: phone,
    }

    if (matchType !== "Singles") {
      newTeam.players = [player1.trim(), player2.trim()]
    }

    onSubmit(newTeam)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {matchType !== "Singles" && (
        <div className="space-y-2">
          <Label htmlFor="team-name">Team Name</Label>
          <Input
            id="team-name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name (e.g., Smith/Johnson)"
            required
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
          required
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
            required
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
        <Label htmlFor="email">Contact Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter contact email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Contact Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter contact phone"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            matchType === "Singles"
              ? !player1.trim() || !email.trim()
              : !teamName.trim() || !player1.trim() || !player2.trim() || !email.trim()
          }
        >
          Register
        </Button>
      </div>
    </form>
  )
}
