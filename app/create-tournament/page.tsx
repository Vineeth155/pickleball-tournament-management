"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getStoredUser } from "@/lib/auth"
import TournamentForm from "@/components/tournament-form"
import type { User } from "@/lib/types"
import { ArrowLeft } from "lucide-react"

export default function CreateTournamentPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  // Load user from localStorage on initial render
  useEffect(() => {
    if (!hasCheckedAuth) {
      const user = getStoredUser()
      setCurrentUser(user)
      setIsLoading(false)
      setHasCheckedAuth(true)
    }
  }, [hasCheckedAuth])

  // Separate effect for redirection to avoid race conditions
  useEffect(() => {
    // Only redirect after we've loaded the user and checked auth
    if (!isLoading && hasCheckedAuth) {
      if (!currentUser) {
        console.log("No user found, redirecting to home")
        router.push("/")
      } else if (!currentUser.isAdmin) {
        console.log("User is not admin, redirecting to tournaments")
        router.push("/tournaments")
      }
    }
  }, [currentUser, isLoading, router, hasCheckedAuth])

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>Checking permissions...</p>
      </div>
    )
  }

  if (!currentUser || !currentUser.isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>You need admin permissions to access this page.</p>
      </div>
    )
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/tournaments")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tournaments
      </Button>

      <h1 className="text-3xl font-bold mb-8">Create New Tournament</h1>

      <TournamentForm userId={currentUser.id} />
    </main>
  )
}
