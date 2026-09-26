"use strict";

const rolloutTabs = document.querySelector('[data-rollout-tabs]');
if (rolloutTabs) {
  const tabs = [...rolloutTabs.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  function selectTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
      panels[i].querySelectorAll('video').forEach(video => {
        if (!selected) video.pause();
        else window.roboCoachMedia?.sync(video);
      });
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });
  const selectHashPanel = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    const index = target ? panels.findIndex(panel => panel.contains(target)) : -1;
    if (index >= 0) selectTab(index);
  };
  selectTab(0);
  rolloutTabs.hidden = false;
  rolloutTabs.parentElement.classList.add('has-embodiment-tabs');
  selectHashPanel();
  window.addEventListener('hashchange', selectHashPanel);
}

document.querySelectorAll('[data-rollout-carousel]').forEach((row) => {
  const slides = [...row.querySelectorAll('[data-rollout-slide]')];
  const counter = row.querySelector('[data-rollout-count]');
  const narrow = window.matchMedia('(max-width: 760px)');
  let start = 0;
  const pageSize = () => narrow.matches ? 1 : 2;
  function render() {
    const count = pageSize();
    slides.forEach((slide, index) => {
      const shown = Array.from({length: count}, (_, offset) => (start + offset) % slides.length).includes(index);
      const video = slide.querySelector('video');
      if (!shown) video.pause();
      slide.hidden = !shown;
      if (shown) window.roboCoachMedia?.sync(video);
    });
    const end = (start + count - 1) % slides.length + 1;
    counter.textContent = `${start + 1}${count > 1 ? `–${end}` : ''} / ${slides.length}`;
  }
  const advance = (direction) => {
    start = (start + direction * pageSize() + slides.length) % slides.length;
    render();
  };
  row.querySelector('[data-rollout-prev]').addEventListener('click', () => advance(-1));
  row.querySelector('[data-rollout-next]').addEventListener('click', () => advance(1));
  row.querySelector('.rollout-navigation').addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      advance(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  narrow.addEventListener('change', () => {
    start -= start % pageSize();
    render();
  });
  render();
});

// The edited teaser keeps its soundtrack and native controls. Only rollout
// comparisons belong to the site's silent, viewport-based autoplay manager.
const teaserPlayer = document.querySelector('[data-teaser-player]');
if (teaserPlayer) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) teaserPlayer.pause();
  });
  observer.observe(teaserPlayer);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) teaserPlayer.pause();
  });
}
