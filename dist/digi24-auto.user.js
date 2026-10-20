// ==UserScript==
// @name         My TV Room — Digi24 helper
// @namespace    https://my-tv-room.vercel.app/
// @version      1.2.0
// @description  Reject optional Digi24 cookies and start its live player only when requested by My TV Room. May start muted when Chrome requires it.
// @match        https://www.digi24.ro/live/digi24*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';
  if (location.pathname.replace(/\/$/, '') !== '/live/digi24' || window.parent === window) return;
  const ROOM = 'https://my-tv-room.vercel.app';
  let started = false, timer, attempts = 0, busy = false, playClicked = false, settingsClicked = false, rejectClicked = false, readySince = 0, layoutObserver;
  const send = state => window.parent.postMessage({type:'tv-room-digi24-state', state}, ROOM);
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
  function theater() {
    const root = document.getElementById('video-player-live');
    if (!root) return;
    // Keep the player's original DOM ancestry so its event handlers stay intact.
    // Hide every unrelated branch, including recommendations inserted later.
    for (const old of document.querySelectorAll('.tv-room-path')) old.classList.remove('tv-room-path');
    for (let parent = root.parentElement; parent && parent !== document.documentElement; parent = parent.parentElement) {
      parent.classList.add('tv-room-path');
    }
    document.body.classList.add('tv-room-mode');
    if (document.getElementById('tv-room-theater')) return;
    const style = document.createElement('style');
    style.id = 'tv-room-theater';
    style.textContent = `
      html,body.tv-room-mode{margin:0!important;overflow:hidden!important;background:#000!important}
      body.tv-room-mode .tv-room-path,body.tv-room-mode.tv-room-path{
        transform:none!important;filter:none!important;perspective:none!important;
        contain:none!important;isolation:auto!important;overflow:visible!important;
        max-width:none!important;max-height:none!important;
      }
      body.tv-room-mode .tv-room-path > :not(.tv-room-path):not(#video-player-live):not(#onetrust-consent-sdk):not(#tv-room-unmute):not(style):not(script),
      body.tv-room-mode > :not(.tv-room-path):not(#video-player-live):not(#onetrust-consent-sdk):not(#tv-room-unmute):not(style):not(script){display:none!important}
      #video-player-live{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;z-index:2147483000!important;background:#000!important}
      #video-player-live video{object-fit:contain!important}
      #onetrust-consent-sdk{position:relative!important;z-index:2147483646!important}
      .tv-room-unmute{position:fixed;top:18px;right:18px;z-index:2147483647;padding:12px 18px;background:#d7f584;color:#172014;border:0;border-radius:8px;cursor:pointer;font:600 14px system-ui}
    `;
    document.head.append(style);
    let queued = false;
    layoutObserver = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; theater(); });
    });
    layoutObserver.observe(document.body, {childList:true, subtree:true});
    window.addEventListener('pagehide', () => layoutObserver.disconnect(), {once:true});
  }
  function unmuteButton(video) {
    if (document.getElementById('tv-room-unmute')) return;
    const button = document.createElement('button');
    button.id = 'tv-room-unmute'; button.className = 'tv-room-unmute';
    button.textContent = 'Turn sound on';
    button.addEventListener('click', () => { video.muted = false; video.volume = 1; video.play().catch(()=>{}); button.remove(); });
    video.addEventListener('volumechange',()=>{if(!video.muted)button.remove();});
    document.body.append(button);
  }
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      if (++attempts > 60) { clearInterval(timer); send('manual'); return; }
      const settings = document.getElementById('onetrust-pc-btn-handler');
      const banner = document.getElementById('onetrust-banner-sdk');
      const preferences = document.getElementById('onetrust-pc-sdk');
      const reject = preferences?.querySelector('.ot-pc-refuse-all-handler');
      if (visible(reject)) {
        readySince = 0;
        if (!rejectClicked) { rejectClicked = true; reject.click(); send('rejected'); }
        return;
      }
      if (visible(banner)) {
        readySince = 0;
        if (visible(settings) && !settingsClicked) { settingsClicked = true; settings.click(); send('privacy'); }
        return;
      }
      if (visible(preferences)) { readySince = 0; return; }
      const root = document.getElementById('video-player-live');
      const video = root?.querySelector('video');
      if (!video || document.readyState === 'loading') { readySince = 0; return; }
      // Allow consent transitions and the live player's initialization to settle.
      if (!readySince) { readySince = Date.now(); return; }
      if (Date.now() - readySince < 2000) return;
      theater();
      if (!video.paused && video.readyState >= 2) {
        clearInterval(timer); send(video.muted ? 'playing-muted' : 'playing');
        if (video.muted) unmuteButton(video);
        return;
      }
      if (!playClicked) {
        const play = root.querySelector('.jw-icon-display[aria-label="Redare"], .jw-icon-display[aria-label="Play"]');
        if (visible(play)) { playClicked = true; play.click(); }
      }
      try { await video.play(); }
      catch (error) {
        if (error.name === 'NotAllowedError') {
          video.muted = true;
          try { await video.play(); } catch { send('manual'); }
        }
      }
    } finally { busy = false; }
  }
  window.addEventListener('message', event => {
    if (event.origin !== ROOM || event.source !== window.parent || event.data?.type !== 'tv-room-digi24-start') return;
    send('ready');
    if (started) return;
    started = true;
    timer = setInterval(tick, 1000);
    tick();
  });
})();
