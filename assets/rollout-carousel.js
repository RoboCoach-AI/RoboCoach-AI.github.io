"use strict";

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
