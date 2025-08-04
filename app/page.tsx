"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getStoredUser, loadTournamentsFromLocalStorage } from "@/lib/auth";
import type { User } from "@/lib/types";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load user from localStorage on initial render
  useEffect(() => {
    // Only run this effect once on mount
    if (!isLoaded) {
      const user = getStoredUser();
      if (user) {
        setCurrentUser(user);
      }

      // Load tournaments from localStorage
      loadTournamentsFromLocalStorage();

      setIsLoaded(true);
    }
  }, [isLoaded]);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-blue-900 to-blue-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Tournament Bracket Manager
              </h1>
              <p className="text-xl mb-8">
                Create, manage, and participate in tournaments with our
                easy-to-use bracket system.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => router.push("/tournaments")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View Tournaments
                </Button>
                {currentUser ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push("/create-tournament")}
                    className="bg-white text-blue-700 hover:bg-blue-50"
                  >
                    Create Tournament
                  </Button>
                ) : (
                  !currentUser && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => router.push("/login")}
                      className="bg-white text-blue-700 hover:bg-blue-50"
                    >
                      Admin Login
                    </Button>
                  )
                )}
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="relative h-64 md:h-80 w-full">
                <Image
                  src="/placeholder.svg?height=400&width=600"
                  alt="Tournament Bracket"
                  fill
                  className="object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tournament Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Multiple Formats</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Support for single elimination, double elimination, round robin,
                and pool play formats.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Instantly update scores and see bracket progression as matches
                are completed.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Team Management</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Easily add and manage teams with detailed player information and
                seeding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament Types Section */}
      <section className="py-16 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tournament Types
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center">
              <div className="relative h-48 w-full mb-4">
                <Image
                  src="/placeholder.svg?height=300&width=500"
                  alt="Single Elimination"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Single & Double Elimination
              </h3>
              <p className="text-center text-gray-600 dark:text-gray-300">
                Traditional bracket formats for competitive tournaments with
                direct elimination or second chance paths.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative h-48 w-full mb-4">
                <Image
                  src="/placeholder.svg?height=300&width=500"
                  alt="Round Robin"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Round Robin & Pool Play
              </h3>
              <p className="text-center text-gray-600 dark:text-gray-300">
                Formats where each team plays against every other team, with
                optional playoff brackets.
              </p>
            </div>
          </div>
          <div className="text-center mt-12">
            <Button
              size="lg"
              onClick={() => router.push("/tournaments")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Browse Active Tournaments
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
