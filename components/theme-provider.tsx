"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize theme from localStorage
  useEffect(() => {
    if (!isInitialized) {
      const savedTheme = localStorage.getItem("theme") as Theme | null
      if (savedTheme) {
        setTheme(savedTheme)
      }
      setIsInitialized(true)
    }
  }, [isInitialized])

  // Apply theme to document
  useEffect(() => {
    if (isInitialized) {
      const root = window.document.documentElement
      const body = window.document.body

      // Remove previous theme classes
      root.classList.remove("light", "dark")

      // Determine the theme to apply
      let themeToApply = theme

      if (theme === "system") {
        themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      }

      // Apply the theme class
      root.classList.add(themeToApply)

      // Ensure body has the correct background color
      if (themeToApply === "dark") {
        body.classList.add("dark")
        body.classList.remove("light")
      } else {
        body.classList.add("light")
        body.classList.remove("dark")
      }

      // Store the theme in localStorage for persistence
      localStorage.setItem("theme", theme)
    }
  }, [theme, isInitialized])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem("theme", newTheme)
      setTheme(newTheme)
    },
  }

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
