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
let reloadAttempts = 0;
const MAX_RELOAD_ATTEMPTS = 3;

window.addEventListener('error', (event) => {
  const isChunkError = event.message?.includes('Failed to fetch dynamically imported module') || 
      (event.target && (event.target as any).tagName === 'SCRIPT' && (event.target as any).src.includes('/assets/'));
  
  if (isChunkError) {
    reloadAttempts++;
    if (reloadAttempts <= MAX_RELOAD_ATTEMPTS) {
      console.warn(`Chunk load error detected (attempt ${reloadAttempts}/${MAX_RELOAD_ATTEMPTS}), reloading page...`);
      // Add a small delay before reload to avoid rapid reload loops
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      console.error('Max reload attempts reached. Chunk loading failed persistently.');
    }
  }
}, true);

// Also handle promise rejection for dynamic imports
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Failed to fetch dynamically imported module')) {
    console.warn('Unhandled rejection: Chunk load error, reloading page...');
    event.preventDefault();
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
});

// Hide initial loader when React is ready to render
const hideInitialLoader = () => {
  const loader = document.getElementById('initialLoader');
  if (loader) {
    loader.classList.add('hidden');
    // Remove from DOM after transition completes
    setTimeout(() => {
      loader.remove();
    }, 300);
  }
};

// Render app and hide loader
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Hide loader after a brief delay to ensure React has started rendering
setTimeout(hideInitialLoader, 100);
