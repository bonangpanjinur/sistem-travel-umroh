import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker with vite-plugin-pwa
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // vite-plugin-pwa automatically registers the service worker
      // This is just for additional error handling
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        console.log("Service Workers registered:", registrations);
      }
    } catch (error) {
      console.warn("Error checking service workers:", error);
    }
  });
}

// Handle chunk load errors (failed to fetch dynamically imported module)
window.addEventListener('error', (event) => {
  if (event.message.includes('Failed to fetch dynamically imported module') || 
      (event.target && (event.target as any).tagName === 'SCRIPT' && (event.target as any).src.includes('/assets/'))) {
    console.warn('Chunk load error detected, reloading page...');
    window.location.reload();
  }
}, true);

createRoot(document.getElementById("root")!).render(<App />);
