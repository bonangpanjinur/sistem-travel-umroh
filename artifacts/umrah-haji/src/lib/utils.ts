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

/**
 * Converts a Google Maps embed URL to a direct Google Maps search/directions URL
 */
export function getGoogleMapsDirectionsUrl(embedUrl: string): string {
  const url = extractIframeUrl(embedUrl);
  if (!url) return "";
  
  // Try to extract coordinates or place name from the pb parameter
  // The pb parameter is a complex string, but often contains the place name or coordinates
  // For a more reliable way, we can use the search URL if we can't parse it
  
  // If it's already a direct maps URL, return it
  if (url.includes("google.com/maps/search") || url.includes("google.com/maps/place") || url.includes("goo.gl/maps")) {
    return url;
  }

  // If we have the pb parameter, we can try to extract the place name
  const pbMatch = url.match(/!1m18!1m12!([^!]+)!2s([^!]+)!/);
  if (pbMatch && pbMatch[2]) {
    try {
      const placeName = decodeURIComponent(pbMatch[2].replace(/\+/g, " "));
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
    } catch (e) {
      // Fallback
    }
  }

  // Default fallback: just open the embed URL in a new tab (Google will usually handle it)
  // or use a generic search if we can't parse it.
  return url.replace("/embed?", "/search?");
}
