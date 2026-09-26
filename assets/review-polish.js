(() => {
  'use strict';
  // Deep links into folded technical explanations still open their destination.
  const revealDestination = (hash) => {
    if (!hash || !hash.startsWith('#')) return;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    let parent = target;
    while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
  };
  document.querySelectorAll('details[data-research-fold]').forEach(details => {
    details.addEventListener('toggle', () => {
      if (details.open) {
        details.querySelectorAll('iframe[data-src]').forEach(frame => {
          frame.src = frame.dataset.src;
          delete frame.dataset.src;
        });
      } else {
        details.querySelectorAll('video').forEach(video => video.pause());
      }
    });
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealDestination(link.getAttribute('href'));
  }, true);
  window.addEventListener('hashchange', () => revealDestination(location.hash));
  revealDestination(location.hash);
  const loopToggle = document.querySelector('[data-chart-loop]');
  if (loopToggle) {
    let playing = true;
    try { playing = localStorage.getItem('coaching-chart-loop') !== 'false'; } catch (_) {}
    const updateChart = () => {
      document.querySelectorAll('.coaching-rounds-image').forEach(image => {
        const theme = image.classList.contains('coaching-rounds-image-dark') ? 'dark' : 'light';
        image.src = `assets/figures/coaching-improvement-${playing ? 'animated' : 'static'}-${theme}.png?v=ci-2`;
      });
      loopToggle.textContent = playing ? 'Pause animation' : 'Play animation';
      loopToggle.setAttribute('aria-pressed', String(playing));
      try { localStorage.setItem('coaching-chart-loop', String(playing)); } catch (_) {}
    };
    loopToggle.addEventListener('click', () => { playing = !playing; updateChart(); });
    updateChart();
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-in-view'); observer.unobserve(entry.target); } });
  },{threshold:.25});
  document.querySelectorAll('.result-comparison').forEach(card => observer.observe(card));
  const scenePicker = document.querySelector('.scene-picker');
  scenePicker?.addEventListener('click', event => {
    const button = event.target.closest('[data-pair-index]');
    if (!button) return;
    const description = button.getAttribute('aria-label') || button.textContent.trim();
    scenePicker.querySelector('[data-current-scene]').textContent = description;
  });
})();
