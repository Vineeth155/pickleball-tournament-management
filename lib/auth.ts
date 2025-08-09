import type { User } from "./types";

// Track if we've already logged the user info to prevent excessive logging
let hasLoggedUserInfo = false;

export async function authenticateUser(): Promise<boolean> {
  if (typeof window === "undefined") return false; // only runs on client

  const organizerId = localStorage.getItem("organizerId");
  if (!organizerId) return false;

  try {
    const res = await fetch("/api/organizers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizerId }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data.valid === true;
  } catch (err) {
    console.error("Error authenticating user:", err);
    return false;
  }
}

// For client-side auth state management
export function getStoredUser(): string | null {
  if (typeof window === "undefined") return null;

  const userJson = localStorage.getItem("organizerId");
  if (!userJson) return null;
  return userJson;
}

export function storeUser(user: User): void {
  if (typeof window === "undefined") return;
  console.log(`Storing user: ${user} (isAdmin: ${user})`);
  localStorage.setItem("tournament_user", JSON.stringify(user));

  // Reset the logging flag when storing a new user
  hasLoggedUserInfo = false;
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  console.log("Clearing stored user");
  localStorage.removeItem("tournament_user");

  // Reset the logging flag when clearing the user
  hasLoggedUserInfo = false;
}

let hasLoadedTournaments = false;

export async function loadTournamentsFromLocalStorage(): Promise<void> {
  try {
    if (hasLoadedTournaments) return;

    const res = await fetch("/api/tournaments", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch tournaments");

    const tournaments = await res.json();
    console.log("Loaded tournaments from MongoDB:", tournaments.length);

    hasLoadedTournaments = true;
  } catch (error) {
    console.error("Failed to load tournaments from MongoDB", error);
  }
}
