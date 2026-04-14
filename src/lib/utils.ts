import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts the src URL from an iframe string or returns the string if it's already a URL
 */
export function extractIframeUrl(input: string): string {
  if (!input) return "";
  
  // If it looks like an iframe tag, try to extract the src
  if (input.includes("<iframe") && input.includes("src=")) {
    const match = input.match(/src=["']([^"']+)["']/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return input.trim();
}
