const INSTALL_DISMISSED_KEY = 'the-last-garden:install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let booted = false;
let errorShown = false;

export function isBooted(): boolean {
  return booted;
}

export function hideAppLoader(): void {
  booted = true;
  const loader = document.getElementById('app-loader');
  if (!loader || loader.classList.contains('is-hidden')) return;
  loader.classList.add('is-fading');
  window.setTimeout(() => loader.classList.add('is-hidden'), 260);
}

function wireErrorButtons(): void {
  const retryBtn = document.getElementById('app-retry-btn');
  const resetBtn = document.getElementById('app-reset-cache-btn');
  if (retryBtn && !retryBtn.dataset.wired) {
    retryBtn.dataset.wired = '1';
    retryBtn.addEventListener('click', () => window.location.reload());
  }
  if (resetBtn && !resetBtn.dataset.wired) {
    resetBtn.dataset.wired = '1';
    resetBtn.addEventListener('click', async () => {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (err) {
        console.warn('[pwa] cache reset failed', err);
      }
      window.location.reload();
    });
  }
}

export function showBootError(err?: unknown): void {
  if (errorShown) return;
  errorShown = true;
  wireErrorButtons();

  const loader = document.getElementById('app-loader');
  if (loader) loader.classList.add('is-hidden');

  const errorEl = document.getElementById('app-error');
  const msgEl = document.getElementById('app-error-msg');
  if (msgEl && err instanceof Error && err.message) {
    msgEl.textContent = `Das Spiel konnte nicht gestartet werden (${err.message}).`;
  }
  if (errorEl) errorEl.hidden = false;
}

function showPill(options: {
  id: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoHideMs?: number;
}): () => void {
  const root = document.getElementById('pwa-toast-root');
  if (!root) return () => {};

  document.getElementById(options.id)?.remove();

  const pill = document.createElement('div');
  pill.id = options.id;
  pill.className = 'tlg-pill';

  const label = document.createElement('span');
  label.textContent = options.text;
  pill.appendChild(label);

  const remove = () => pill.remove();

  if (options.actionLabel && options.onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = options.actionLabel;
    btn.addEventListener('click', () => {
      options.onAction?.();
      remove();
    });
    pill.appendChild(btn);
  }

  if (options.dismissible) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'tlg-close';
    close.setAttribute('aria-label', 'Schließen');
    close.textContent = '×';
    close.addEventListener('click', () => {
      options.onDismiss?.();
      remove();
    });
    pill.appendChild(close);
  }

  root.appendChild(pill);

  if (options.autoHideMs) {
    window.setTimeout(remove, options.autoHideMs);
  }
  return remove;
}

function isStandaloneMode(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function wasInstallDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function markInstallDismissed(): void {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
  } catch {
    /* ignore storage errors */
  }
}

function setupInstallPrompt(): void {
  if (isStandaloneMode() || wasInstallDismissed()) return;

  let removePill: (() => void) | null = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    const promptEvent = event as BeforeInstallPromptEvent;
    removePill = showPill({
      id: 'pwa-install-pill',
      text: 'Als App installieren',
      actionLabel: 'Installieren',
      dismissible: true,
      onAction: async () => {
        try {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice.outcome === 'dismissed') markInstallDismissed();
        } catch (err) {
          console.warn('[pwa] install prompt failed', err);
        }
      },
      onDismiss: markInstallDismissed,
    });
  });

  window.addEventListener('appinstalled', () => {
    removePill?.();
    removePill = null;
  });
}

function setupConnectivityStatus(): void {
  const notifyOffline = () =>
    showPill({
      id: 'pwa-net-pill',
      text: 'Offline – Spielstand wird lokal gespeichert',
      dismissible: true,
      autoHideMs: 4500,
    });

  const notifyOnline = () =>
    showPill({
      id: 'pwa-net-pill',
      text: 'Wieder online',
      autoHideMs: 2500,
    });

  if (!navigator.onLine) notifyOffline();
  window.addEventListener('offline', notifyOffline);
  window.addEventListener('online', notifyOnline);
}

/** Registers the service worker (production only) and wires the update flow. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let hasController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasController) {
      hasController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const promptUpdate = (worker: ServiceWorker) => {
    showPill({
      id: 'pwa-update-pill',
      text: 'Neue Version verfügbar',
      actionLabel: 'Aktualisieren',
      dismissible: true,
      onAction: () => worker.postMessage({ type: 'SKIP_WAITING' }),
    });
  };

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './', updateViaCache: 'none' })
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) {
          promptUpdate(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(installing);
            }
          });
        });

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            reg.update().catch(() => {});
          }
        });
      })
      .catch((err) => {
        console.warn('[pwa] service worker registration failed', err);
      });
  });
}

export function initPwa(): void {
  wireErrorButtons();
  registerServiceWorker();
  setupInstallPrompt();
  setupConnectivityStatus();
}
