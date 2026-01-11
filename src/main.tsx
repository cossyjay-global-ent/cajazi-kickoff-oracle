import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA (production only)
if (import.meta.env.DEV) {
  // Prevent preview/dev blank screens caused by stale Service Worker caches
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }

  if ("caches" in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
} else {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Optionally show a prompt to reload
      if (confirm('New content available. Reload?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
    onRegistered(registration) {
      console.log('Service Worker registered:', registration);
    },
    onRegisterError(error) {
      console.error('Service Worker registration failed:', error);
    },
  });
}

// Apply saved theme on initial load
const savedTheme = localStorage.getItem("theme");
const root = document.documentElement;
if (savedTheme === "dark") {
  root.classList.add("dark");
} else if (savedTheme === "light") {
  root.classList.remove("dark");
} else {
  // System preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.classList.add("dark");
  }
}

createRoot(document.getElementById("root")!).render(<App />);
