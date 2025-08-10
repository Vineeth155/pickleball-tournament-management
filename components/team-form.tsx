"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Team, Category } from "@/lib/types"

interface TeamFormProps {
  onAddTeam: (team: Team) => void
  renderAsForm?: boolean
  matchType?: "Singles" | "Doubles" | "Mixed Doubles"
  category?: Category
}

export default function TeamForm({ onAddTeam, renderAsForm = true, matchType = "Singles", category }: TeamFormProps) {
  const [teamName, setTeamName] = useState("")
  const [player1, setPlayer1] = useState("")
  const [player2, setPlayer2] = useState("")
  const [player1Gender, setPlayer1Gender] = useState<"Male" | "Female">("Male")
  const [player2Gender, setPlayer2Gender] = useState<"Male" | "Female">("Female")
  const [player1SkillLevel, setPlayer1SkillLevel] = useState("")
  const [player2SkillLevel, setPlayer2SkillLevel] = useState("")
  const [player1AgeGroup, setPlayer1AgeGroup] = useState("")
  const [player2AgeGroup, setPlayer2AgeGroup] = useState("")
  const [teamSeed, setTeamSeed] = useState("")
  const [skillLevel, setSkillLevel] = useState("")
  const [ageGroup, setAgeGroup] = useState("")
  const [gender, setGender] = useState<"Men" | "Women" | "Mixed">("Men")

  // Determine match type from category
  const effectiveMatchType = category ? 
    (category.division === "singles" ? "Singles" : 
     category.gender === "mixed" ? "Mixed Doubles" : "Doubles") : matchType

  // Effect to handle category-based prepopulation
  useEffect(() => {
    if (category) {
      // Set age group from category
      setAgeGroup(category.ageGroup || "")
      
      // Set skill level to middle of range if available
      if (category.skillLevel?.min && category.skillLevel?.max) {
        const midSkill = (category.skillLevel.min + category.skillLevel.max) / 2
        setSkillLevel(midSkill.toString())
      }
      
      // Set default player skill levels to category minimum
      if (category.skillLevel?.min) {
        setPlayer1SkillLevel(category.skillLevel.min.toString())
        setPlayer2SkillLevel(category.skillLevel.min.toString())
      }
      
      // Set default player age groups from category
      if (category.ageGroup) {
        setPlayer1AgeGroup(category.ageGroup)
        setPlayer2AgeGroup(category.ageGroup)
      }
      
      // Set gender based on category
      if (category.gender === "Mens") {
        setGender("Men")
        setPlayer1Gender("Male")
        setPlayer2Gender("Male")
      } else if (category.gender === "Womens") {
        setGender("Women")
        setPlayer1Gender("Female")
        setPlayer2Gender("Female")
      } else if (category.gender === "mixed") {
        setGender("Mixed")
        setPlayer1Gender("Male")
        setPlayer2Gender("Female")
      }
    }
  }, [category])

  // Effect to handle mixed doubles logic
  useEffect(() => {
    if (effectiveMatchType === "Mixed Doubles" || category?.gender === "mixed") {
      // Ensure opposite genders for mixed doubles
      if (player1Gender === player2Gender) {
        setPlayer2Gender(player1Gender === "Male" ? "Female" : "Male")
      }
    }
  }, [player1Gender, effectiveMatchType, category])

  // Validation functions
  const validateSkillLevel = (skillLevel: string, playerName: string): string | null => {
    if (!category?.skillLevel?.min || !category?.skillLevel?.max) return null
    
    const skill = parseFloat(skillLevel)
    const min = category.skillLevel.min
    const max = category.skillLevel.max
    
    if (isNaN(skill)) {
      return `${playerName} skill level must be a valid number`
    }
    
    if (skill < min || skill > max) {
      return `${playerName} skill level must be between ${min} and ${max}`
    }
    
    return null
  }

  const validateAgeGroup = (ageGroup: string, playerName: string): string | null => {
    const age = parseInt(ageGroup)
    
    if (isNaN(age) || age < 0) {
      return `${playerName} age must be a valid positive number`
    }
    
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate skill levels and age groups
    const player1SkillError = validateSkillLevel(player1SkillLevel, "Player 1")
    const player2SkillError = effectiveMatchType !== "Singles" ? validateSkillLevel(player2SkillLevel, "Player 2") : null
    const player1AgeError = validateAgeGroup(player1AgeGroup, "Player 1")
    const player2AgeError = effectiveMatchType !== "Singles" ? validateAgeGroup(player2AgeGroup, "Player 2") : null

    if (player1SkillError || player2SkillError || player1AgeError || player2AgeError) {
      alert([player1SkillError, player2SkillError, player1AgeError, player2AgeError]
        .filter(Boolean)
        .join("\n"))
      return
    }

    const newTeam: Team = {
      id: "", // Will be set by parent component
      name: effectiveMatchType === "Singles" ? player1.trim() : teamName.trim(),
      seed: teamSeed ? Number.parseInt(teamSeed) : undefined,
      skillLevel: effectiveMatchType === "Singles" ? player1SkillLevel : undefined,
      ageGroup: effectiveMatchType === "Singles" ? player1AgeGroup : undefined,
      gender: gender || undefined,
    }

    if (effectiveMatchType !== "Singles") {
      newTeam.players = [player1.trim(), player2.trim()]
      // Store player-specific data in the team object (you may need to extend the Team type)
      newTeam.playerDetails = [
        { skillLevel: player1SkillLevel, ageGroup: player1AgeGroup, gender: player1Gender },
        { skillLevel: player2SkillLevel, ageGroup: player2AgeGroup, gender: player2Gender }
      ]
    }

    onAddTeam(newTeam)

    setTeamName("")
    setPlayer1("")
    setPlayer2("")
    setPlayer1SkillLevel("")
    setPlayer2SkillLevel("")
    setPlayer1AgeGroup("")
    setPlayer2AgeGroup("")
    setTeamSeed("")
    setSkillLevel("")
    setAgeGroup("")
  }

  const formContent = (
    <div className="space-y-4">
      {effectiveMatchType !== "Singles" && (
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
        <Label htmlFor="player1">{effectiveMatchType === "Singles" ? "Player Name" : "Player 1 Name"}</Label>
        <Input
          id="player1"
          value={player1}
          onChange={(e) => setPlayer1(e.target.value)}
          placeholder="Enter player name"
        />
        {effectiveMatchType !== "Singles" && (
          <div className="flex gap-4 mt-2">
            <div className="flex-1">
              <Label htmlFor="player1-gender">Gender</Label>
              <Select value={player1Gender} onValueChange={(value: "Male" | "Female") => setPlayer1Gender(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="player1-skill">Skill Level</Label>
              <Input
                id="player1-skill"
                type="number"
                step="0.5"
                min={category?.skillLevel?.min || 0}
                max={category?.skillLevel?.max || 10}
                value={player1SkillLevel}
                onChange={(e) => setPlayer1SkillLevel(e.target.value)}
                placeholder="e.g., 3.5"
              />
              {category?.skillLevel && (
                <p className="text-xs text-muted-foreground">
                  Range: {category.skillLevel.min}-{category.skillLevel.max}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="player1-age">Age</Label>
              <Input
                id="player1-age"
                type="number"
                min="0"
                value={player1AgeGroup}
                onChange={(e) => setPlayer1AgeGroup(e.target.value)}
                placeholder="e.g., 35"
              />
            </div>
          </div>
        )}
      </div>

      {effectiveMatchType !== "Singles" && (
        <div className="space-y-2">
          <Label htmlFor="player2">Player 2 Name</Label>
          <Input
            id="player2"
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            placeholder="Enter player name"
          />
          <div className="flex gap-4 mt-2">
            <div className="flex-1">
              <Label htmlFor="player2-gender">Gender</Label>
              <Select value={player2Gender} onValueChange={(value: "Male" | "Female") => setPlayer2Gender(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="player2-skill">Skill Level</Label>
              <Input
                id="player2-skill"
                type="number"
                step="0.5"
                min={category?.skillLevel?.min || 0}
                max={category?.skillLevel?.max || 10}
                value={player2SkillLevel}
                onChange={(e) => setPlayer2SkillLevel(e.target.value)}
                placeholder="e.g., 3.5"
              />
              {category?.skillLevel && (
                <p className="text-xs text-muted-foreground">
                  Range: {category.skillLevel.min}-{category.skillLevel.max}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="player2-age">Age</Label>
              <Input
                id="player2-age"
                type="number"
                min="0"
                value={player2AgeGroup}
                onChange={(e) => setPlayer2AgeGroup(e.target.value)}
                placeholder="e.g., 35"
              />
            </div>
          </div>
        </div>
      )}

      {effectiveMatchType === "Singles" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="skill-level">Skill Level</Label>
            <Input
              id="skill-level"
              type="number"
              step="0.5"
              min={category?.skillLevel?.min || 0}
              max={category?.skillLevel?.max || 10}
              value={player1SkillLevel}
              onChange={(e) => setPlayer1SkillLevel(e.target.value)}
              placeholder="e.g., 3.5"
            />
            {category?.skillLevel && (
              <p className="text-xs text-muted-foreground">
                Range: {category.skillLevel.min}-{category.skillLevel.max}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="age-group">Age</Label>
            <Input
              id="age-group"
              type="number"
              min="0"
              value={player1AgeGroup}
              onChange={(e) => setPlayer1AgeGroup(e.target.value)}
              placeholder="e.g., 35"
            />
          </div>
        </div>
      )}

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
        disabled={
          effectiveMatchType === "Singles" 
            ? !player1.trim() || !player1SkillLevel || !player1AgeGroup
            : !teamName.trim() || !player1.trim() || !player2.trim() || !player1SkillLevel || !player2SkillLevel || !player1AgeGroup || !player2AgeGroup
        }
      >
        Add {effectiveMatchType === "Singles" ? "Player" : "Team"}
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
