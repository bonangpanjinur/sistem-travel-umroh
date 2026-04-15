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
  // Detect chunk loading errors and MIME type errors (loading HTML instead of JS)
  const isChunkError = 
    event.message?.includes('Failed to fetch dynamically imported module') || 
    event.message?.includes('Expected a JavaScript-or-Wasm module script') ||
    (event.target && (event.target as any).tagName === 'SCRIPT' && (event.target as any).src.includes('/assets/'));
  
  if (isChunkError) {
    // Check if we've already reloaded recently to prevent infinite loops
    const lastReload = sessionStorage.getItem('last-chunk-reload');
    const now = Date.now();
    
    // If we reloaded less than 10 seconds ago, don't reload again automatically
    if (lastReload && (now - parseInt(lastReload)) < 10000) {
      console.error('Persistent chunk loading error detected. Manual refresh may be required.');
      return;
    }

    sessionStorage.setItem('last-chunk-reload', now.toString());
    console.warn('Chunk load error or MIME mismatch detected, reloading page to fetch latest version...');
    
    // Clear service worker cache if possible
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }

    setTimeout(() => {
      window.location.reload();
    }, 1000);
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
    // Remove loading state from body to enable scrolling
    document.body.classList.remove('loading-state');
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
