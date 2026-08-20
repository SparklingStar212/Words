import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
// Automatic background update without UI prompts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Periodically check for updates when the page gains focus or mounts
      registration.update();

      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Only reload if the user isn't actively typing or interacting 
      // (or let it apply naturally on their next session launch)
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}