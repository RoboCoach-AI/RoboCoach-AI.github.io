(() => {
  'use strict';
  const root = document.querySelector('#ridi-walkthrough');
  if (!root) return;
  const section = root.closest('#teabag-diagnostics');
  const toggle = root.querySelector('[data-ridi-toggle]');
  const stateText = root.querySelector('[data-ridi-state]');
  const captionLabel = root.querySelector('[data-ridi-caption-label]');
  const caption = root.querySelector('[data-ridi-caption]');
  const speed = root.querySelector('[data-ridi-speed]');
  const videos = [...root.querySelectorAll('video')];
  const stages = [...root.querySelectorAll('[data-ridi-stage]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phases = {
    route: {chapter:'route',stage:'route',label:'Route',seconds:8,
      text:'The router receives the task and current observation, then dispatches the Pick expert for the first unfinished subtask.'},
    imagine: {chapter:'failure',stage:'imagine',label:'Imagine',rate:1,
      text:'The expert acts inside CoachWorld. Predicted observations feed its next action, while the progress judge scores the active pickup stage.'},
    diagnose: {chapter:'failure',stage:'diagnose',label:'Diagnose',seconds:4,
      text:'Pickup never reaches the completion threshold in this trial. The first-timeout diagnosis identifies the pickup subtask–expert pair.'},
    collect: {chapter:'collection',stage:'improve',label:'Collect data',rate:1,
      text:'The diagnosis becomes a focused request: collect additional demonstrations of tea-bag pickup.'},
    update: {chapter:'collection',stage:'improve',label:'Update',seconds:4,
      text:'Update only the Pick expert’s LoRA. The placement and pouring experts remain unchanged.'},
    reevaluate: {chapter:'success',stage:'improve',label:'Re-evaluate',rate:2,
      text:'Run the same task with the updated expert library. Judge-confirmed completion returns control to the router for the next subtask.'},
    complete: {chapter:'success',stage:'improve',label:'Task completed',
      text:'Pickup, placement, and pouring complete the tea-making task. The recorded progress traces remain available for inspection.'}
  };
  let phase = 'route', mode = 'armed', elapsed = 0, visible = false;
  let transition = null, frame = null, last = null, resetVideo = null;
  let manualVideo = null;
  const activeVideo = () => root.querySelector(`#tea-${phases[phase].chapter} video`);
  const active = () => mode === 'playing' && visible && !document.hidden;

  function status() {
    const running = active();
    root.classList.toggle('tour-paused',!running && mode !== 'manual');
    root.classList.toggle('is-manual',mode === 'manual');
    toggle.textContent = mode === 'playing' ? 'Pause walkthrough' : mode === 'paused' ? 'Resume walkthrough' : mode === 'complete' ? 'Replay walkthrough' : 'Play walkthrough';
    toggle.setAttribute('aria-pressed',String(mode === 'playing'));
    stateText.textContent = mode === 'armed' ? (reduced ? 'Play or explore individual chapters' : 'Starts when this case comes into view') : mode === 'manual' ? 'Manual exploration' : mode === 'complete' ? 'Walkthrough complete · Explore or replay' : !visible || document.hidden ? 'Paused outside the viewport' : mode === 'paused' ? 'Paused · Inspect the evidence' : 'Playing · '+phases[phase].label;
    root.querySelectorAll('.interaction-arcs').forEach(svg => {
      if (running && phase === 'imagine' && !reduced) svg.unpauseAnimations?.();
      else svg.pauseAnimations?.();
    });
    const current = activeVideo();
    videos.forEach(video => {
      const play = running && !transition && video === current && !!phases[phase].rate;
      if (!play && mode !== 'manual') video.pause();
      else if (play && video.paused && video.readyState >= 2 && !video.ended) video.play()?.catch(() => {
        mode = 'paused'; status();
      });
    });
  }

  function setRail(progress=0) {
    const index = ['route','imagine','diagnose','improve'].indexOf(phases[phase].stage);
    stages.forEach((stage,i) => {
      stage.classList.toggle('is-current',i === index && phase !== 'complete');
      stage.classList.toggle('is-complete',i < index || phase === 'complete');
      stage.style.setProperty('--phase-progress',i < index || phase === 'complete' ? '1' : i === index ? String(progress) : '0');
    });
  }

  function enter(next, restartMedia=false) {
    const previousChapter = phases[phase].chapter;
    phase = next;
    elapsed = 0;
    root.dataset.ridiPhase = phase;
    root.dataset.routeReveal = '0';
    root.classList.remove('route-dispatched','is-switching');
    if (previousChapter !== phases[phase].chapter || restartMedia) selectTeaChapter(phases[phase].chapter);
    selectTeaModule(phases[phase].stage);
    captionLabel.textContent = phases[phase].label;
    caption.textContent = phases[phase].text;
    speed.textContent = phases[phase].rate === 2 ? '2× playback' : '';
    const updateLabel = root.querySelector('[data-update-status]');
    updateLabel.textContent = phase === 'update' ? 'Updating selected LoRA' : 'Selected for update';
    if (phase === 'route') root.querySelector('[data-tea-route-step="0"]').click();
    const video = activeVideo();
    if (video) {
      video.loop = false;
      video.playbackRate = phases[phase].rate || 1;
      if (previousChapter !== phases[phase].chapter || restartMedia) {
        resetVideo = video;
        prepareVideo(video);
        if (video.readyState >= 1) { video.currentTime = 0; resetVideo = null; }
      }
    }
    setRail();
    if (phase === 'complete') { mode = 'complete'; setRail(1); }
    status();
  }

  function queue(next) {
    if (transition || mode !== 'playing') return;
    transition = {next,remaining:reduced ? 0 : .24};
    root.classList.add('is-switching');
    videos.forEach(video => video.pause());
  }

  function tick(now) {
    frame = null;
    const dt = last === null ? 0 : Math.min(.1,(now-last)/1000);
    last = now;
    if (active()) {
      if (transition) {
        transition.remaining -= dt;
        if (transition.remaining <= 0) { const next = transition.next; transition = null; enter(next); }
      } else {
        const config = phases[phase];
        if (config.seconds) {
          elapsed += dt;
          setRail(Math.min(1,elapsed/config.seconds));
          if (phase === 'route') {
            root.dataset.routeReveal = String(Math.max(0,Math.min(3,Math.floor((elapsed-.6)/.8))));
            root.classList.toggle('route-dispatched',elapsed >= 4.2);
          }
          if (phase === 'update' && elapsed >= 2.6) root.querySelector('[data-update-status]').textContent = 'Selected LoRA updated';
          if (elapsed >= config.seconds) queue({route:'imagine',diagnose:'collect',update:'reevaluate'}[phase]);
        } else if (config.rate) {
          const video = activeVideo();
          if (video?.duration) setRail(Math.min(1,video.currentTime/video.duration));
        }
      }
    }
    if (active()) frame = requestAnimationFrame(tick);
  }

  function schedule() {
    if (frame === null && active()) { last = null; frame = requestAnimationFrame(tick); }
  }
  function start() {
    mode = 'playing'; transition = null;
    root.classList.remove('is-manual');
    enter('route',true); schedule();
  }
  function pause() { mode = 'paused'; status(); }
  function resume() { mode = 'playing'; status(); schedule(); }
  toggle.addEventListener('click',() => {
    if (mode === 'playing') pause();
    else if (mode === 'paused') resume();
    else start();
  });
  root.querySelector('[data-ridi-restart]').addEventListener('click',start);

  function explore() {
    mode = 'manual'; transition = null; resetVideo = null;
    root.classList.remove('is-switching');
    videos.forEach(video => video.pause());
    setTimeout(() => {
      const panel = root.querySelector('.tea-flow-panel:not([hidden])');
      const chapter = panel.dataset.teaPanel;
      phase = {route:'route',failure:'imagine',collection:'collect',success:'reevaluate'}[chapter];
      root.dataset.ridiPhase = phase;
      root.dataset.routeReveal = '3'; root.classList.add('route-dispatched');
      captionLabel.textContent = phases[phase].label;
      caption.textContent = phases[phase].text;
      speed.textContent = '';
      setRail();
      manualVideo = panel.querySelector('video');
      if (manualVideo) {
        manualVideo.loop = true; manualVideo.playbackRate = 1;
        prepareVideo(manualVideo);
        if (manualVideo.ended) manualVideo.currentTime = 0;
        if (visible && !document.hidden) manualVideo.play()?.catch(()=>{});
      }
      status();
    },0);
  }
  // Real user navigation cancels the automatic sequence; scripted dispatch does not.
  section.addEventListener('click',event => {
    if (!event.isTrusted) return;
    if (event.target.closest('[data-tea-case],[data-tea-route-step],[data-tea-module],[data-tea-continue],[data-tea-back],.tea-chart-legend [role="button"],.tea-live-curves svg')) explore();
  },true);
  section.addEventListener('keydown',event => {
    if (!event.isTrusted || !['Enter',' '].includes(event.key)) return;
    if (event.target.closest('.tea-live-curves')) explore();
  },true);
  document.querySelectorAll('[data-overview-module]').forEach(link=>link.addEventListener('click',explore));
  videos.forEach(video => {
    video.muted = true; video.defaultMuted = true; video.playsInline = true; video.controls = false;
    video.tabIndex = 0;
    video.title = 'Click or press Space to pause or resume';
    const toggleVideo = () => {
      if (mode === 'playing') pause();
      else if (mode === 'paused') resume();
      else if (video.paused) { manualVideo=video; prepareVideo(video); video.play()?.catch(()=>{}); }
      else video.pause();
    };
    video.addEventListener('click',toggleVideo);
    video.addEventListener('keydown',event => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggleVideo(); }
    });
    video.addEventListener('loadedmetadata',()=>{
      if (resetVideo === video) { video.currentTime=0; resetVideo=null; }
    });
    video.addEventListener('canplay',()=>{ if (mode !== 'manual') status(); });
    video.addEventListener('ended',()=>{
      if (mode !== 'playing' || video !== activeVideo()) return;
      queue({imagine:'diagnose',collect:'update',reevaluate:'complete'}[phase]);
      schedule();
    });
    video.addEventListener('error',()=>{
      if (mode !== 'playing' || video !== activeVideo()) return;
      pause(); stateText.textContent='Video unavailable · Retry or select another chapter';
    });
  });

  function visibility() {
    const box = root.getBoundingClientRect();
    const available = Math.max(0,Math.min(box.bottom,innerHeight)-Math.max(box.top,80));
    const next = available >= Math.min(box.height,Math.max(1,innerHeight-80))*.55;
    if (next === visible) return;
    visible = next;
    if (mode === 'armed' && visible && !reduced) start();
    else if (mode === 'manual') {
      if (!visible) videos.forEach(video=>video.pause());
    } else { status(); schedule(); }
  }
  let visibilityFrame = null;
  const updateVisibility = () => {
    if (visibilityFrame !== null) return;
    visibilityFrame=requestAnimationFrame(()=>{visibilityFrame=null;visibility();});
  };
  window.addEventListener('scroll',updateVisibility,{passive:true});
  window.addEventListener('resize',updateVisibility,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden) videos.forEach(video=>video.pause());
    else if (mode === 'manual' && visible && manualVideo) manualVideo.play()?.catch(()=>{});
    status(); schedule();
  });
  root.dataset.ridiPhase='route';
  status(); visibility();
})();
