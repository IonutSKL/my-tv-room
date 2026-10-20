// ==UserScript==
// @name         My TV Room — Digi24 helper
// @namespace    https://my-tv-room.vercel.app/
// @version      1.10.0
// @description  Automate Digi24 in My TV Room and supported RD-S channel tabs opened from it. Starts muted automatically; click to enable sound.
// @match        https://www.digi24.ro/live/digi24*
// @match        https://rd-s.live/live/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';
  if (location.hostname === 'rd-s.live') {
    const supportedPaths=["/live/digi-sport-1","/live/pro-tv","/live/antena-1","/live/antena-3-cnn","/live/digi-sport-2","/live/digi-sport-3","/live/digi-sport-4","/live/hbo"];
    if (!supportedPaths.includes(location.pathname.replace(/\/$/,'')) || window.parent !== window) return;
    let active = location.hash === '#tvroom=1';
    try { if(active)sessionStorage.setItem('tv-room-rds:'+location.pathname,'1'); active ||= sessionStorage.getItem('tv-room-rds:'+location.pathname) === '1'; } catch {}
    if (!active) return;
    const visible = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    let busy=false, attempts=0, gateClicked=false, settled=0, fsTried=false, soundEnabled=false;
    function fit(root) {
      for(const e of document.querySelectorAll('.tv-sport-path'))e.classList.remove('tv-sport-path');
      for(let p=root.parentElement;p&&p!==document.documentElement;p=p.parentElement)p.classList.add('tv-sport-path');
      root.classList.add('tv-sport-player'); document.body.classList.add('tv-sport-mode');
      if(document.getElementById('tv-sport-style'))return;
      const style=document.createElement('style');style.id='tv-sport-style';style.textContent=`
        html,body.tv-sport-mode{margin:0!important;overflow:hidden!important;background:#000!important}
        .tv-sport-path{transform:none!important;filter:none!important;contain:none!important;perspective:none!important;overflow:visible!important}
        .tv-sport-path > :not(.tv-sport-path):not(.tv-sport-player):not(.tv-sport-action):not(style):not(script){display:none!important}
        .tv-sport-player{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;margin:0!important;aspect-ratio:auto!important;z-index:2147483000!important;background:#000!important}
        .tv-sport-player .rp__stage{width:100%!important;height:100%!important;aspect-ratio:auto!important}
        .tv-sport-player video{width:100%!important;height:100%!important;object-fit:contain!important}
        .tv-sport-action{position:fixed;top:16px;right:16px;z-index:2147483647;padding:12px 18px;border:0;border-radius:8px;background:#d7f584;color:#172014;font:600 14px system-ui;cursor:pointer}`;
      document.head.append(style);
      let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const current=document.querySelector('.rp__video')?.closest('.rp');if(current)fit(current)})});
      observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
    }
    function action(root,video) {
      if(document.getElementById('tv-sport-action'))return;
      const button=document.createElement('button');button.id='tv-sport-action';button.className='tv-sport-action';
      const label=()=>{button.textContent=(video.muted||video.paused)?'Enable sound':'Fullscreen';button.hidden=!!document.fullscreenElement&&!video.muted&&!video.paused};label();
      const resume=()=>{const current=root.querySelector('video.rp__video')||video;current.muted=!soundEnabled;if(soundEnabled)current.volume=1;return current.play().catch(()=>{label()});};
      button.addEventListener('click',async event=>{
        event.preventDefault();event.stopPropagation();soundEnabled=true;
        // Request fullscreen during the trusted click, then resume after its transition.
        let transition;
        if(!document.fullscreenElement)transition=root.requestFullscreen?.();
        await resume();
        if(transition){try{await transition}catch{}}
        await resume();label();
      });
      document.addEventListener('fullscreenchange',()=>{
        label();
        if(document.fullscreenElement===root){
          // The source may pause its player while rebuilding fullscreen controls.
          setTimeout(()=>{if(document.fullscreenElement===root)resume().then(label)},150);
        }
      });
      for(const name of ['volumechange','play','pause'])video.addEventListener(name,label);
      root.append(button);
    }
    const timer=setInterval(async()=>{
      if(busy)return;busy=true;
      try{
        if(++attempts>80){clearInterval(timer);return;}
        const gate=document.querySelector('button.player-gate');
        if(visible(gate)){
          if(!gateClicked){
            let count=0;try{count=Number(sessionStorage.getItem('tv-room-gate-count'))||0;if(count<2)sessionStorage.setItem('tv-room-gate-count',String(count+1))}catch{}
            if(count<2){gateClicked=true;gate.click();}
          }
          return;
        }
        const video=document.querySelector('video.rp__video'),root=video?.closest('.rp');if(!root)return;
        try{sessionStorage.removeItem('tv-room-gate-count')}catch{}
        if(!settled){settled=Date.now();return;}if(Date.now()-settled<1500)return;
        fit(root);
        if(!video.paused&&video.readyState>=2){
          clearInterval(timer);action(root,video);
          if(!fsTried){fsTried=true;root.requestFullscreen?.().catch(()=>{});}return;
        }
        video.muted=true;
        try{await video.play()}catch(e){if(e.name==='NotAllowedError'){clearInterval(timer);action(root,video)}}
      }finally{busy=false}
    },1000);
    return;
  }

  if (location.pathname.replace(/\/$/, '') !== '/live/digi24' || window.parent === window) return;
  const ROOM = 'https://tv.scarlat.online';
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
    button.textContent = 'Enable sound';
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
      video.muted = true;
      try { await video.play(); }
      catch (error) {
        if (error.name === 'NotAllowedError') {
          clearInterval(timer);
          unmuteButton(video); send('manual');
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
