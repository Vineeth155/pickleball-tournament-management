import type { User } from "./types";

// In a real app, you would use a database and proper authentication
// This is a simple mock for demonstration purposes
const USERS: User[] = [
  {
    id: "1",
    username: "admin",
    password: "admin123", // In a real app, never store plain text passwords
    isAdmin: true,
  },
  {
    id: "2",
    username: "user",
    password: "user123",
    isAdmin: false,
  },
];

// Track if we've already logged the user info to prevent excessive logging
let hasLoggedUserInfo = false;

export function authenticateUser(
  username: string,
  password: string
): User | null {
  console.log(`Authenticating user: ${username}`);
  const user = USERS.find(
    (u) => u.username === username && u.password === password
  );
  console.log(
    `Authentication result:`,
    user ? `Success (isAdmin: ${user.isAdmin})` : "Failed"
  );

  // Reset the logging flag when a new authentication happens
  hasLoggedUserInfo = false;

  return user || null;
}

// For client-side auth state management
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;

  const userJson = localStorage.getItem("tournament_user");
  if (!userJson) return null;

  try {
    const user = JSON.parse(userJson) as User;

    // Only log once to prevent console spam
    if (!hasLoggedUserInfo) {
      console.log(
        `Retrieved stored user: ${user.username} (isAdmin: ${user.isAdmin})`
      );
      hasLoggedUserInfo = true;
    }

    return user;
  } catch (e) {
    console.error("Failed to parse stored user:", e);
    return null;
  }
}

export function storeUser(user: User): void {
  if (typeof window === "undefined") return;
  console.log(`Storing user: ${user.username} (isAdmin: ${user.isAdmin})`);
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
