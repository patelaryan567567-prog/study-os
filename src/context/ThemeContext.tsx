import { createContext, useContext, useEffect, type ReactNode } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * StudyOS is a dark-first application: the light theme was removed entirely and
 * theme switching is disabled. The provider always pins `resolvedTheme` to
 * "dark" so every existing consumer (getTextColor, useThemeText, dark: variants)
 * resolves to the dark palette without further changes.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", "dark");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: "dark",
        setTheme: () => {
          /* Theme switching is disabled — StudyOS is dark-only. */
        },
        resolvedTheme: "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function useThemeText() {
  return {
    text: "text-gray-100",
    textSecondary: "text-gray-400",
    textMuted: "text-gray-500",
    textInverse: "text-gray-900",
    bg: "bg-gray-900",
    bgSecondary: "bg-gray-800",
    border: "border-gray-700",
    isDark: true,
  };
}
