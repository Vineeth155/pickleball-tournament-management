"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getStoredUser, loadTournamentsFromLocalStorage } from "@/lib/auth"
import TournamentList from "@/components/tournament-list"
import type { User } from "@/lib/types"

export default function TournamentsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Load user from localStorage on initial render
  useEffect(() => {
    if (!hasInitialized) {
      const user = getStoredUser()
      if (user) {
        setCurrentUser(user)
      }

      // Load tournaments from localStorage
      loadTournamentsFromLocalStorage()

      setHasInitialized(true)
    }
  }, [hasInitialized])

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Tournaments</h1>

        {currentUser?.isAdmin && <Button onClick={() => router.push("/create-tournament")}>Create Tournament</Button>}
      </div>

      <TournamentList currentUser={currentUser} />
    </main>
  )
}
