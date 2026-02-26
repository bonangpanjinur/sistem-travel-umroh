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

createRoot(document.getElementById("root")!).render(<App />);
