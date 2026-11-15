// Keep existing installations current without clearing their local records.
if ('serviceWorker' in navigator) {
  const serviceWorker = navigator.serviceWorker;
  const wasControlled = Boolean(serviceWorker.controller);
  const CHECK_INTERVAL = 60_000;
  const CHECK_THROTTLE = 15_000;
  const RESUME_THROTTLE = 2_000;
  let lastCheck = -Infinity;
  let checking = false;
  let queuedResume = false;
  let checkTimer = null;
  let reloadTimer = null;
  let reloadPending = false;
  let checkingReload = false;
  let refreshing = false;

  async function checkForUpdate(resume = false) {
    if (navigator.onLine === false) return;
    if (checking) {
      queuedResume ||= resume;
      return;
    }
    const delay = (resume ? RESUME_THROTTLE : CHECK_THROTTLE) - (Date.now() - lastCheck);
    if (delay > 0) {
      if (resume && checkTimer === null) {
        checkTimer = setTimeout(() => {
          checkTimer = null;
          checkForUpdate(true);
        }, delay);
      }
      return;
    }
    if (checkTimer !== null) {
      clearTimeout(checkTimer);
      checkTimer = null;
    }
    lastCheck = Date.now();
    checking = true;
    try {
      const registration = await serviceWorker.getRegistration();
      if (registration) await registration.update();
    } catch {
      // Stay usable offline; online/resume and the next interval retry safely.
    } finally {
      checking = false;
      if (queuedResume) {
        queuedResume = false;
        checkForUpdate(true);
      }
    }
  }

  function scheduleReload() {
    if (!reloadPending || refreshing || reloadTimer !== null) return;
    reloadTimer = setTimeout(() => {
      reloadTimer = null;
      tryReload();
    }, 400);
  }

  async function tryReload() {
    if (!reloadPending || refreshing || checkingReload) return;
    if (document.hidden || document.querySelector('dialog[open]')) {
      scheduleReload();
      return;
    }
    checkingReload = true;
    try {
      const ready = window.__MY_DAY_READY_TO_RELOAD__;
      if (typeof ready !== 'function' || await ready() !== true) return;
      // A dialog can open while the app waits for an IndexedDB write to finish.
      if (document.hidden || document.querySelector('dialog[open]')) return;
      refreshing = true;
      location.reload();
    } catch {
      // A failed or unfinished save must never be discarded by an update.
    } finally {
      checkingReload = false;
      scheduleReload();
    }
  }

  serviceWorker.addEventListener('controllerchange', () => {
    if (!wasControlled) return;
    reloadPending = true;
    tryReload();
  });
  window.addEventListener('online', () => checkForUpdate(true));
  window.addEventListener('pageshow', event => {
    checkForUpdate(event.persisted);
    tryReload();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkForUpdate();
      tryReload();
    }
  });
  setInterval(() => {
    if (!document.hidden) checkForUpdate();
  }, CHECK_INTERVAL);
  checkForUpdate();
}
