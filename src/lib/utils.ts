export { cn } from "@/utils";

export const getTextColor = (theme: "light" | "dark") => {
  return theme === "dark" ? "text-gray-100" : "text-gray-900";
};

export const getMutedTextColor = (theme: "light" | "dark") => {
  return theme === "dark" ? "text-gray-400" : "text-gray-600";
};

export const getCardBg = (theme: "light" | "dark") => {
  return theme === "dark" ? "bg-gray-800/50" : "bg-white/80";
};

export const getBorderColor = (theme: "light" | "dark") => {
  return theme === "dark" ? "border-gray-700" : "border-gray-200";
};

export const getInputBg = (theme: "light" | "dark") => {
  return theme === "dark" ? "bg-gray-800" : "bg-white";
};
