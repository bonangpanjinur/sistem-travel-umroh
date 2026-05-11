import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for push notifications
// Skip when running inside an iframe or on Lovable preview hosts
// to avoid stale-cache and navigation issues in the editor.
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator) {
  if (isInIframe || isPreviewHost) {
    // Cleanup any previously-registered SW so the preview is never wedged
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}));
    }).catch(() => {});
  } else {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("SW registered:", registration.scope);
      } catch (error) {
        console.warn("SW registration failed:", error);
      }
    });
  }
}

// Handle chunk load errors (failed to fetch dynamically imported module)
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
    
    // If we reloaded less than 30 seconds ago, don't reload again automatically
    // This prevents the infinite "looping error" the user reported
    if (lastReload && (now - parseInt(lastReload)) < 30000) {
      console.error('Persistent chunk loading error detected. Stopping auto-reload to prevent infinite loop.');
      
      // Show a user-friendly message or UI overlay
      const loader = document.getElementById('initialLoader');
      if (loader) {
        const loaderText = loader.querySelector('.loader-text');
        if (loaderText) {
          loaderText.innerHTML = 'UPDATE TERDETEKSI<br/><button onclick="sessionStorage.removeItem(\'last-chunk-reload\'); window.location.reload();" style="margin-top:10px;padding:5px 10px;background:#059669;color:white;border:none;border-radius:4px;cursor:pointer;font-size:10px;">MUAT ULANG</button>';
        }
      }
      return;
    }

    sessionStorage.setItem('last-chunk-reload', now.toString());
    console.warn('Chunk load error or MIME mismatch detected, reloading page to fetch latest version...');
    
    // Clear service worker cache if possible - wrap in try-catch to prevent extension messaging errors
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      } catch (swError) {
        console.warn('Service worker messaging failed:', swError);
      }
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

// Hide loader after React has started rendering using requestAnimationFrame
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(hideInitialLoader);
  });
} else {
  requestAnimationFrame(hideInitialLoader);
}
