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
  const chart = demo.querySelector(".judge-progress-chart");
  const traceWindow = chart.querySelector("[data-judge-trace-window]");
  const cursor = chart.querySelector("[data-judge-cursor]");
  const confirmations = [...chart.querySelectorAll("[data-judge-confirm-time]")];
  const plotStart = Number(chart.dataset.timeStart);
  const plotEnd = Number(chart.dataset.timeEnd);
  const stages = [...demo.querySelectorAll("[data-judge-stage]")];
  const result = document.querySelector("[data-judge-result]");
  const rolloutDuration = Number(demo.dataset.judgeDuration);
  const timeoutTime = Math.max(...stages.map((stage) => Number(stage.dataset.end)));
  const excerptEnd = Number(demo.dataset.judgeExcerptEnd ?? timeoutTime);
  let animationFrame = null;

  if (!(video instanceof HTMLVideoElement)) return;

  const clampUnit = (value) => Math.max(0, Math.min(1, value));

  const syncJudgeTrace = () => {
    const time = video.currentTime;
    if (timeLabel) timeLabel.textContent = Math.min(time, rolloutDuration).toFixed(1);

    // Reveal by the time axis, not path length. Dash-length animation both
    // distorts timing and truncates scaled paths with non-scaling strokes.
    const width = 542 * clampUnit((time - plotStart) / (plotEnd - plotStart));
    traceWindow.setAttribute("width", String(width));
    cursor.setAttribute("x1", String(42 + width));
    cursor.setAttribute("x2", String(42 + width));
    cursor.setAttribute("visibility", time <= plotEnd ? "visible" : "hidden");
    chart.dataset.syncTime = String(time);
    confirmations.forEach((marker) => marker.setAttribute("visibility", time + 0.00001 >= Number(marker.dataset.judgeConfirmTime) ? "visible" : "hidden"));

    stages.forEach((stage) => {
      const start = Number(stage.dataset.start);
      const end = Number(stage.dataset.end);
      // A shortened video does not move the recorded timeout earlier.
      const unconfirmedAtCut = end > rolloutDuration && time >= excerptEnd;
      const active = time >= start && time < end && !unconfirmedAtCut;
      const resolved = time >= end;
      const timeout = resolved && stage.dataset.result === "First timeout";
      const status = stage.querySelector("em");

      const button = stage.querySelector("[data-judge-seek]");
      if (active) button?.setAttribute("aria-current", "step");
      else button?.removeAttribute("aria-current");
      stage.classList.toggle("is-active", active);
      stage.classList.toggle("is-confirmed", resolved && !timeout);
      stage.classList.toggle("is-timeout", timeout || unconfirmedAtCut);
      if (status) status.textContent = unconfirmedAtCut ? "Unconfirmed" : active ? "Active" : resolved ? stage.dataset.result : "Pending";
    });

    result?.classList.toggle("is-visible", time >= Math.min(timeoutTime, excerptEnd));
  };

  const tickJudgeTrace = () => {
    animationFrame = null;
    syncJudgeTrace();
    if (!video.paused && !video.ended) animationFrame = requestAnimationFrame(tickJudgeTrace);
  };

  const refreshJudgeTrace = () => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    tickJudgeTrace();
  };
  ["play", "pause", "seeking", "seeked", "loadedmetadata", "ended"].forEach((event) => video.addEventListener(event, refreshJudgeTrace));
  let pendingStageTime = null;
  const seekToStage = () => {
    if (pendingStageTime === null || video.readyState < 1) return;
    video.currentTime = pendingStageTime;
    pendingStageTime = null;
    refreshJudgeTrace();
  };
  video.addEventListener("loadedmetadata", seekToStage);
  stages.forEach((stage) => {
    stage.querySelector("[data-judge-seek]")?.addEventListener("click", () => {
      pendingStageTime = Number(stage.dataset.start);
      prepareVideo(video);
      seekToStage();
    });
  });
  const stageColors = ["#2166ac", "#1b9e77", "#7570b3", "#b78600", "#c31d75", "#d55e00"];
  window.roboCoachCurveNavigation({
    svg: chart,
    shade: true,
    regions: stages.map((stage, index) => {
      const start = Number(stage.dataset.start);
      const left = 42 + 542 * clampUnit((start - plotStart) / (plotEnd - plotStart));
      const right = 42 + 542 * clampUnit((Number(stage.dataset.end) - plotStart) / (plotEnd - plotStart));
      return { x: left, y: 2, width: right - left, height: 214, start, label: `P${index + 1}: ${stage.querySelector("strong").textContent}`, color: stageColors[index] };
    }),
    onSeek: (time) => {
      pendingStageTime = time;
      prepareVideo(video);
      seekToStage();
    }
  });
  syncJudgeTrace();
});

const teaButtons = [...document.querySelectorAll("[data-tea-case]")];
const teaPanels = [...document.querySelectorAll("[data-tea-panel]")];
const teaModules = [...document.querySelectorAll("[data-tea-module]")];
const teaModuleDetails = {
  route: {
    title: "Route · Expert dispatch",
    description: "Split the tea-making task into pickup, placement, and pouring. Dispatch the matching expert for each active subtask in that order."
  },
  imagine: {
    title: "Imagine · CoachWorld",
    description: "Roll the routed experts forward in CoachWorld. The right-hand video shows the predicted execution alongside the real-world rollout on the left."
  },
  diagnose: {
    title: "Diagnose · RoboMeter",
    description: "Score the active subtask from the observed video prefix. In the failure example, S1 never confirms, localizing the problem to tea-bag pickup."
  },
  improve: {
    title: "Improve · Targeted coaching",
    description: "Use the unresolved pickup stage to request targeted demonstrations, update the selected expert, and re-evaluate the task."
  }
};
function selectTeaModule(name) {
  const detail = teaModuleDetails[name];
  if (!detail) return;
  teaModules.forEach((button) => {
    const selected = button.dataset.teaModule === name;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const title = document.querySelector("[data-tea-module-title]");
  const description = document.querySelector("[data-tea-module-description]");
  if (title) title.textContent = detail.title;
  if (description) description.textContent = detail.description;
}
function selectTeaChapter(chapter) {
  teaButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.teaCase === chapter)));
  teaPanels.forEach((panel) => {
    panel.hidden = panel.dataset.teaPanel !== chapter;
    panel.querySelectorAll("video").forEach((video) => {
      if (panel.hidden) video.pause();
      else {
        if (video.ended) video.currentTime = 0;
        window.roboCoachMedia?.sync(video);
      }
    });
  });
  selectTeaModule({ route: "route", failure: "diagnose", collection: "improve", success: "imagine" }[chapter]);
}
teaButtons.forEach((button) => button.addEventListener("click", () => selectTeaChapter(button.dataset.teaCase)));
document.querySelectorAll("[data-tea-advance]").forEach((video) => {
  video.addEventListener("ended", () => {
    if (!video.closest("[hidden]")) selectTeaChapter(video.dataset.teaAdvance);
  });
});

teaModules.forEach((button) => button.addEventListener("click", () => {
  const name = button.dataset.teaModule;
  if (name === "route") selectTeaChapter("route");
  else if (name === "improve") selectTeaChapter("collection");
  else if (["imagine", "diagnose"].includes(name) && document.querySelector('[data-tea-panel="collection"]:not([hidden]), [data-tea-panel="route"]:not([hidden])')) {
    selectTeaChapter("failure");
  }
  selectTeaModule(name);
}));

const teaRouteSteps = [
  { task: "Pick up the tea bag", expert: "Pick expert", next: "Next in the plan: place the tea bag in the cup." },
  { task: "Place the tea bag in the cup", expert: "Placement expert", next: "Next in the plan: pour water into the cup." },
  { task: "Pour water into the cup", expert: "Pouring expert", next: "This is the final subtask in the plan." }
];
const teaRouteButtons = [...document.querySelectorAll("[data-tea-route-step]")];
teaRouteButtons.forEach((button) => button.addEventListener("click", () => {
  const step = teaRouteSteps[Number(button.dataset.teaRouteStep)];
  teaRouteButtons.forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
  document.querySelector("[data-tea-route-task]").textContent = step.task;
  document.querySelector("[data-tea-route-expert]").textContent = step.expert;
  document.querySelector("[data-tea-route-next]").textContent = step.next;
}));
document.querySelectorAll("[data-tea-continue], [data-tea-back]").forEach((button) => button.addEventListener("click", () => {
  const chapter = button.dataset.teaContinue ?? button.dataset.teaBack;
  const panel = teaPanels.find((candidate) => candidate.dataset.teaPanel === chapter);
  if (!panel) return;
  selectTeaChapter(chapter);
  panel.tabIndex = -1;
  panel.focus({ preventScroll: true });
  panel.scrollIntoView({ block: "start" });
}));

// Overview entries open the matching case-study module and chapter.
function activateOverviewModule(name, moveFocus = false) {
  const target = teaModules.find((button) => button.dataset.teaModule === name);
  if (!target) return;
  selectTeaChapter({ route: "route", imagine: "failure", diagnose: "failure", improve: "collection" }[name]);
  selectTeaModule(name);
  if (moveFocus) target.focus({ preventScroll: true });
}
document.querySelectorAll("[data-overview-module]").forEach((link) => link.addEventListener("click", (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  activateOverviewModule(link.dataset.overviewModule, true);
}));
const activateOverviewHash = () => {
  if (location.hash.startsWith("#tea-module-")) activateOverviewModule(location.hash.slice("#tea-module-".length));
};
window.addEventListener("hashchange", activateOverviewHash);
activateOverviewHash();

// Offer expansion only when the prompt exceeds one line at its current width.
const hardwarePromptRefreshers = [];
document.querySelectorAll('.hardware-task-prompt').forEach((prompt) => {
  const text = prompt.querySelector('.hardware-prompt-text');
  const toggle = prompt.querySelector('.hardware-prompt-toggle');
  if (!text || !toggle) return;
  prompt.classList.add('is-collapsible');
  const setExpanded = (expanded) => {
    prompt.classList.toggle('is-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Collapse prompt' : 'Expand prompt');
  };
  const refresh = () => {
    if (!text.clientWidth) return;
    const overflows = text.scrollHeight > parseFloat(getComputedStyle(text).lineHeight) + 1;
    toggle.hidden = !overflows;
    prompt.classList.toggle('has-overflow', overflows);
    if (!overflows) setExpanded(false);
  };
  toggle.addEventListener('click', () => {
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
  });
  text.addEventListener('click', () => {
    if (!toggle.hidden) toggle.click();
  });
  new ResizeObserver(refresh).observe(text);
  hardwarePromptRefreshers.push(refresh);
  refresh();
});
document.fonts.ready.then(() => hardwarePromptRefreshers.forEach((refresh) => refresh()));

// Each subtask seeks within its own current 1x rollout.
document.querySelectorAll('[data-hardware-task]').forEach((card) => {
  const video = card.querySelector('video');
  const buttons = [...card.querySelectorAll('[data-subtask-start]')];
  let pendingTime = null;
  const syncStage = () => {
    const time = pendingTime ?? video.currentTime;
    let active = 0;
    buttons.forEach((button, index) => {
      if (Number(button.dataset.subtaskStart) <= time + 0.001) active = index;
    });
    buttons.forEach((button, index) => {
      if (index === active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  };
  const applySeek = () => {
    if (pendingTime === null || video.readyState < 1) return;
    video.currentTime = Math.min(pendingTime, Math.max(0, video.duration - 0.001));
    pendingTime = null;
    syncStage();
    video.play()?.catch(() => {});
  };
  buttons.forEach((button) => button.addEventListener('click', () => {
    pendingTime = Number(button.dataset.subtaskStart);
    prepareVideo(video);
    syncStage();
    applySeek();
    const bounds = video.getBoundingClientRect();
    if (bounds.top < 80 || bounds.bottom > innerHeight) {
      video.scrollIntoView({ block:'center', behavior:'smooth' });
    }
  }));
  video.addEventListener('loadedmetadata', applySeek);
  ['timeupdate', 'seeked', 'loadedmetadata'].forEach((event) => video.addEventListener(event, syncStage));
  syncStage();
});
