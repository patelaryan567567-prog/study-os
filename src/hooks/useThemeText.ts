import { useTheme } from "@/context/ThemeContext";

export function useThemeText() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return {
    text: isDark ? "text-gray-100" : "text-gray-900",
    textSecondary: isDark ? "text-gray-400" : "text-gray-600",
    textMuted: isDark ? "text-gray-500" : "text-gray-400",
    textInverse: isDark ? "text-gray-900" : "text-gray-100",
    bg: isDark ? "bg-gray-900" : "bg-white",
    bgSecondary: isDark ? "bg-gray-800" : "bg-gray-50",
    border: isDark ? "border-gray-700" : "border-gray-200",
    isDark,
  };
}
