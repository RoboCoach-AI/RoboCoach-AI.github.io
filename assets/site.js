const header = document.querySelector("[data-site-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
const filterButtons = document.querySelectorAll("[data-rollout-filter]");
const rolloutCards = document.querySelectorAll("[data-rollout]");
const hardwareFilterButtons = document.querySelectorAll("[data-hardware-filter]");
const hardwareVideoGroups = document.querySelectorAll("[data-hardware-group]");
const copyButton = document.querySelector("[data-copy-citation]");
const readingProgress = document.querySelector("[data-reading-progress]");

const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const observedSections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function syncHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
  if (readingProgress) readingProgress.style.transform = `scaleX(${progress})`;
}

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

navToggle?.addEventListener("click", () => {
  const isOpen = siteNav?.classList.toggle("is-open") ?? false;
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav?.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLAnchorElement)) return;
  siteNav.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.rolloutFilter;

    filterButtons.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("is-active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });

    rolloutCards.forEach((card) => {
      const visible = card.dataset.rollout === filter;
      card.hidden = !visible;
      if (!visible) card.querySelectorAll("video").forEach((video) => video.pause());
    });
  });
});

hardwareFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.hardwareFilter;

    hardwareFilterButtons.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("is-active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });

    hardwareVideoGroups.forEach((group) => {
      const visible = group.dataset.hardwareGroup === filter;
      group.hidden = !visible;
      if (!visible) group.querySelectorAll("video").forEach((video) => video.pause());
    });
  });
});

copyButton?.addEventListener("click", async () => {
  const citation = document.querySelector("#citation code")?.textContent?.trim();
  if (!citation) return;

  try {
    await navigator.clipboard.writeText(citation);
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy citation";
    }, 1600);
  } catch {
    copyButton.textContent = "Select text to copy";
  }
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const current = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!current) return;
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${current.target.id}`);
    });
  },
  { rootMargin: "-18% 0px -64%", threshold: [0.05, 0.3] },
);

observedSections.forEach((section) => sectionObserver.observe(section));

const revealSections = [...document.querySelectorAll("main > .section")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionItems = [...document.querySelectorAll(
  ".overview-stage, .platform-card, .rollout-card, .generalization-rollout, .section-generalization .composition-strip article, .composition-results article, .round-card",
)];

motionItems.forEach((item) => {
  const siblings = [...(item.parentElement?.children ?? [])].filter((candidate) => motionItems.includes(candidate));
  const siblingIndex = Math.max(0, siblings.indexOf(item));
  item.classList.add("motion-item");
  item.style.setProperty("--motion-delay", `${Math.min(siblingIndex, 4) * 65}ms`);
});

if (!reducedMotion && motionItems.length > 0) {
  document.documentElement.classList.add("motion-ready");
  const motionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in-view");
        motionObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -5%", threshold: 0.1 },
  );
  motionItems.forEach((item) => motionObserver.observe(item));
} else {
  motionItems.forEach((item) => item.classList.add("is-in-view"));
}

revealSections.forEach((section) => {
  section.classList.add("section-reveal");
  [...section.children].forEach((child, index) => {
    child.classList.add("section-reveal-item");
    child.style.setProperty("--reveal-order", String(Math.min(index, 4)));
  });
});

function revealHashTarget() {
  const target = window.location.hash
    ? document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
    : null;
  if (target?.classList.contains("section-reveal")) target.classList.add("is-visible");
}

revealHashTarget();
window.addEventListener("hashchange", revealHashTarget);
window.addEventListener("load", revealHashTarget, { once: true });

if (reducedMotion) {
  revealSections.forEach((section) => section.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  revealSections.forEach((section) => {
    if (!section.classList.contains("is-visible")) revealObserver.observe(section);
  });
}

document.documentElement.classList.add("reveal-ready");

const returnSectionId = new URLSearchParams(window.location.search).get("returnTo");
let returnPositionRestored = false;

function restoreReturnPosition() {
  if (!returnSectionId || returnPositionRestored) return;
  const section = document.getElementById(returnSectionId);
  if (!section) return;

  returnPositionRestored = true;
  requestAnimationFrame(() => {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    section.scrollIntoView({ block: "start" });
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("returnTo");
    cleanUrl.hash = "";
    history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  });
}

window.addEventListener("load", restoreReturnPosition, { once: true });

document.querySelectorAll("iframe[data-auto-height]").forEach((frame) => {
  let observer;

  const syncFrameHeight = () => {
    try {
      const frameDocument = frame.contentDocument;
      if (!frameDocument) return;
      const height = Math.ceil(frameDocument.documentElement.scrollHeight);
      if (height > 0) frame.style.height = `${height}px`;
    } catch {
      // Keep the CSS fallback height if the frame is no longer same-origin.
    }
  };

  frame.addEventListener("load", () => {
    observer?.disconnect();
    syncFrameHeight();
    restoreReturnPosition();
    const frameBody = frame.contentDocument?.body;
    if (!frameBody || !("ResizeObserver" in window)) return;
    observer = new ResizeObserver(syncFrameHeight);
    observer.observe(frameBody);
  });

  window.addEventListener("resize", syncFrameHeight, { passive: true });
});

document.querySelectorAll("[data-judge-sync]").forEach((demo) => {
  const video = demo.querySelector("[data-judge-video]");
  const timeLabel = demo.querySelector("[data-judge-time]");
  const traces = [...demo.querySelectorAll(".judge-progress-trace")];
  const stages = [...demo.querySelectorAll("[data-judge-stage]")];
  const result = document.querySelector("[data-judge-result]");
  const rolloutDuration = Number(demo.dataset.judgeDuration);
  const timeoutTime = Math.max(...stages.map((stage) => Number(stage.dataset.end)));
  let animationFrame;

  if (!(video instanceof HTMLVideoElement)) return;

  const clampUnit = (value) => Math.max(0, Math.min(1, value));

  const syncJudgeTrace = () => {
    const time = video.currentTime;
    if (timeLabel) timeLabel.textContent = Math.min(time, rolloutDuration).toFixed(1);

    traces.forEach((trace) => {
      const start = Number(trace.dataset.start);
      const end = Number(trace.dataset.end);
      const progress = clampUnit((time - start) / (end - start));
      const length = trace.getTotalLength();
      trace.style.visibility = progress > 0 ? "visible" : "hidden";
      trace.style.strokeDasharray = `${length} ${length}`;
      trace.style.strokeDashoffset = String(length * (1 - progress));
    });

    stages.forEach((stage) => {
      const start = Number(stage.dataset.start);
      const end = Number(stage.dataset.end);
      const active = time >= start && time < end;
      const resolved = time >= end;
      const timeout = resolved && stage.dataset.result === "First timeout";
      const status = stage.querySelector("em");

      stage.classList.toggle("is-active", active);
      stage.classList.toggle("is-confirmed", resolved && !timeout);
      stage.classList.toggle("is-timeout", timeout);
      if (status) status.textContent = active ? "Active" : resolved ? stage.dataset.result : "Pending";
    });

    result?.classList.toggle("is-visible", time >= timeoutTime);
  };

  const tickJudgeTrace = () => {
    syncJudgeTrace();
    if (!video.paused && !video.ended) animationFrame = requestAnimationFrame(tickJudgeTrace);
  };

  video.addEventListener("play", () => {
    cancelAnimationFrame(animationFrame);
    tickJudgeTrace();
  });
  video.addEventListener("pause", syncJudgeTrace);
  video.addEventListener("seeking", syncJudgeTrace);
  video.addEventListener("loadedmetadata", syncJudgeTrace);
  video.addEventListener("timeupdate", syncJudgeTrace);
  syncJudgeTrace();
});
