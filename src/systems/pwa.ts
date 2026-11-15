/** Registers the app-shell service worker (public/sw.js). Production only: a caching SW in dev serves stale code. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((err) => {
      console.warn('[pwa] service worker registration failed', err);
    });
  });
}
