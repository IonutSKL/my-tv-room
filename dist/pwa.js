(() => {
  let installPrompt;
  const button = document.getElementById('install-app');
  const help = document.getElementById('install-help');
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const update = () => { button.hidden = installed(); };
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event; update();
  });
  window.addEventListener('appinstalled', () => { installPrompt = null; button.hidden = true; help.close(); });
  button.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt; installPrompt = null;
      try { await prompt.prompt(); await prompt.userChoice; } catch { help.showModal(); }
    } else help.showModal();
  });
  document.getElementById('close-install-help').addEventListener('click', () => help.close());
  update();
  const connectivity = document.getElementById('connectivity');
  const showConnectivity = () => { connectivity.hidden = navigator.onLine; };
  window.addEventListener('online', showConnectivity); window.addEventListener('offline', showConnectivity); showConnectivity();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        document.getElementById('offline-note').textContent = 'Offline setup is unavailable in this browser. You can still use the app online.';
      });
    });
  }
  // TV remote arrows move focus without starting channels; OK/Enter activates one.
  const channels = [...document.querySelectorAll('.channel')];
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || help.open || event.ctrlKey || event.altKey || event.metaKey) return;
    const index = channels.indexOf(document.activeElement);
    if (index < 0) return;
    let next = index;
    if (['ArrowDown','ArrowRight'].includes(event.key)) next = (index + 1) % channels.length;
    else if (['ArrowUp','ArrowLeft'].includes(event.key)) next = (index - 1 + channels.length) % channels.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = channels.length - 1;
    else return;
    event.preventDefault(); channels[next].focus(); channels[next].scrollIntoView({block:'nearest',inline:'nearest'});
  });
})();
