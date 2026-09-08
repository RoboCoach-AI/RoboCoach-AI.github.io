"use strict";

// Assign media URLs only near the viewport; play only visible videos.
const autoplayVideos = [...document.querySelectorAll("video:not([data-manual-playback])")];
const visibleVideos = new Set();
function prepareVideo(video) {
  if (video.closest("[hidden]")) return;
  if (video.dataset.poster) {
    video.poster = video.dataset.poster;
    delete video.dataset.poster;
  }
  let changed = false;
  [video, ...video.querySelectorAll("source")].forEach((source) => {
    if (!source.dataset.src) return;
    source.src = source.dataset.src;
    delete source.dataset.src;
    changed = true;
  });
  if (changed) {
    video.preload = "metadata";
    video.load();
  }
}
function syncAutoplay(video) {
  if (visibleVideos.has(video) && !document.hidden && !video.closest("[hidden]")) {
    prepareVideo(video);
    video.play()?.catch(() => {}); // A click can start playback if autoplay is blocked.
  } else {
    video.pause();
  }
}
autoplayVideos.forEach((video) => {
  video.controls = false;
  video.autoplay = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = !video.hasAttribute("data-tea-advance");
  video.playsInline = true;
  if (video.getAttribute("aria-hidden") !== "true") {
    video.tabIndex = 0;
    video.title = "Click or press Space to pause or play";
    if (!video.hasAttribute("aria-label")) video.setAttribute("aria-label", "Robot rollout video; click or press Space to pause or play");
    const toggle = () => {
      if (video.paused) {
        prepareVideo(video);
        video.play()?.catch(() => {});
      } else video.pause();
    };
    video.addEventListener("click", toggle);
    video.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggle();
      }
    });
  }
  video.addEventListener("play", () => {
    if (document.hidden || video.closest("[hidden]") || !visibleVideos.has(video)) video.pause();
  });
});
if ("IntersectionObserver" in window) {
  const preloadObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) prepareVideo(target);
    });
  }, { rootMargin: "200px 0px" });
  const playbackObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
      if (isIntersecting && intersectionRatio >= 0.1) visibleVideos.add(target);
      else visibleVideos.delete(target);
      syncAutoplay(target);
    });
  }, { threshold: [0, 0.1] });
  autoplayVideos.forEach((video) => {
    preloadObserver.observe(video);
    playbackObserver.observe(video);
  });
} else {
  const updateVisibility = () => autoplayVideos.forEach((video) => {
    const box = video.getBoundingClientRect();
    if (box.width && box.height && box.bottom > 0 && box.top < window.innerHeight) visibleVideos.add(video);
    else visibleVideos.delete(video);
    syncAutoplay(video);
  });
  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility);
  updateVisibility();
}
document.addEventListener("visibilitychange", () => autoplayVideos.forEach(syncAutoplay));
window.roboCoachMedia = { sync: syncAutoplay };
