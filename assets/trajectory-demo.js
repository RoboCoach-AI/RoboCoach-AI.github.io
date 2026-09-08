(() => {
  "use strict";
  const root = document.querySelector("[data-trajectory-demo]");
  if (!root) return;
  const $ = (name) => root.querySelector(`[data-trajectory-${name}]`);
  const video = $("video");
  const status = $("status");
  const colors = ["#37c5bb", "#65aaff", "#f8b546"];
  const svgNS = "http://www.w3.org/2000/svg";
  let scenes = [];
  let scene;
  let selected = -1;
  let pendingPlay = false;
  let completed = false;
  let playbackFrame;

  function svgElement(tag, attributes) {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function range() {
    return selected < 0
      ? { label: "Full trajectory", start: 0, end: scene.duration }
      : scene.segments[selected];
  }

  function drawPath() {
    const svg = $("paths");
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${scene.width} ${scene.height}`);
    scene.segments.forEach((segment, index) => {
      const start = scene.nodes[index];
      const end = scene.nodes[index + 1];
      const group = svgElement("g", {
        class: "trajectory-segment", role: "button", tabindex: "0",
        "aria-label": `Play ${segment.label}`, "data-segment": index,
      });
      const title = svgElement("title", {});
      title.textContent = `${segment.label} · ${segment.start.toFixed(2)}–${segment.end.toFixed(2)} s`;
      const d = `M${start.u},${start.v} L${end.u},${end.v}`;
      group.append(title,
        svgElement("path", { d, class: "trajectory-line", stroke: colors[index] }),
        svgElement("path", { d, class: "trajectory-hit" }));
      group.addEventListener("click", () => selectRange(index, true));
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRange(index, true);
        }
      });
      svg.append(group);
    });
    const nodes = svgElement("g", { class: "trajectory-nodes", "aria-hidden": "true" });
    scene.nodes.forEach((point, index) => {
      nodes.append(svgElement("circle", {
        cx: point.u, cy: point.v, r: index === 0 ? 10 : 9,
        fill: index === 0 ? "#172d37" : colors[index - 1],
      }));
      const label = svgElement("text", { x: point.u + 14, y: point.v - 12 });
      label.textContent = point.label;
      nodes.append(label);
    });
    svg.append(nodes);
  }

  function updateSelection() {
    $("ranges").querySelectorAll("button").forEach((button, i) => {
      button.setAttribute("aria-pressed", String(i - 1 === selected));
    });
    $("paths").querySelectorAll(".trajectory-segment").forEach((group, i) => {
      group.classList.toggle("is-selected", selected < 0 || i === selected);
      group.setAttribute("aria-pressed", String(i === selected));
    });
    const current = range();
    $("result-label").textContent = current.label;
    $("detail").textContent = selected < 0
      ? `now → 1 → 2 → target · ${scene.duration.toFixed(1)} s recorded prediction`
      : `${current.label} · ${current.start.toFixed(2)}–${current.end.toFixed(2)} s of the recorded prediction`;
    $("replay").textContent = selected < 0 ? "Replay full ↺" : "Replay segment ↺";
    video.setAttribute("aria-label", `${scene.label}: ${current.label}, recorded CoachWorld prediction`);
  }

  function stopWatch() {
    cancelAnimationFrame(playbackFrame);
  }

  function finishRange() {
    completed = true;
    video.pause();
    stopWatch();
    // Keep the boundary frame visible instead of spilling into the next segment.
    if (selected >= 0 && range().end < scene.duration) video.currentTime = range().end;
    status.textContent = `${range().label} complete. Replay or choose another segment.`;
  }

  function watchPlayback() {
    if (video.paused) return;
    if (selected >= 0 && !video.seeking && video.currentTime >= range().end) {
      finishRange();
      return;
    }
    playbackFrame = requestAnimationFrame(watchPlayback);
  }

  function playVideo() {
    video.play().catch((error) => {
      if (error.name === "NotAllowedError") status.textContent = "Press play on the video to start playback.";
    });
  }

  function selectRange(index, play) {
    video.pause();
    stopWatch();
    selected = index;
    completed = false;
    pendingPlay = play;
    updateSelection();
    status.textContent = play ? `Loading ${range().label}…` : "Click a path segment or Full trajectory to play.";
    if (video.readyState >= 1) {
      video.currentTime = range().start;
      pendingPlay = false;
      if (play) playVideo();
    }
  }

  function selectScene(index, play) {
    video.pause();
    stopWatch();
    scene = scenes[index];
    $("scenes").querySelectorAll("button").forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    $("task").textContent = scene.task;
    $("episode").textContent = `${scene.episode} · head camera`;
    $("seed").src = scene.image;
    $("seed").alt = `${scene.label}, first decoded frame of the recorded prediction`;
    $("depth").textContent = scene.nodes.map((p) => `${p.depth.toFixed(3)} m`).join(" → ");
    $("gripper").textContent = scene.controls[0].path_uv_depth.map((p) => p.gripper.toFixed(2)).join(" → ");
    $("duration").textContent = `${scene.duration.toFixed(1)} s · ${scene.fps} fps · ${scene.inference_steps} inference steps`;
    $("ranges").replaceChildren();
    [{ label: "Full trajectory" }, ...scene.segments].forEach((segment, i) => {
      const button = document.createElement("button");
      button.type = "button";
      if (i > 0) {
        const swatch = document.createElement("span");
        swatch.className = "trajectory-swatch";
        swatch.style.backgroundColor = colors[i - 1];
        swatch.setAttribute("aria-hidden", "true");
        button.append(swatch);
      }
      button.append(segment.label);
      button.addEventListener("click", () => selectRange(i - 1, true));
      $("ranges").append(button);
    });
    drawPath();
    video.poster = scene.image;
    video.src = scene.video;
    video.load();
    selectRange(-1, play);
  }

  $("replay").addEventListener("click", () => selectRange(selected, true));
  video.addEventListener("loadedmetadata", () => {
    video.currentTime = range().start;
    if (pendingPlay) {
      pendingPlay = false;
      playVideo();
    }
  });
  video.addEventListener("play", () => {
    // Native play also replays the selected range after it has finished.
    if (completed || video.currentTime < range().start || video.currentTime >= range().end) {
      video.currentTime = range().start;
    }
    completed = false;
  });
  video.addEventListener("playing", () => {
    status.textContent = `Playing ${range().label}.`;
    stopWatch();
    watchPlayback();
  });
  video.addEventListener("pause", () => {
    stopWatch();
    if (scene && !completed && !video.ended) status.textContent = `Paused · ${range().label}.`;
  });
  video.addEventListener("ended", finishRange);
  video.addEventListener("error", () => {
    status.textContent = "This video could not be loaded. Select another scene or reload the page.";
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) video.pause(); });
  new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) video.pause(); }).observe(root);

  fetch("assets/trajectory-demo/presets.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Recordings: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      scenes = data.scenes;
      if (!scenes.length) throw new Error("No recorded trajectories available.");
      scenes.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = item.label;
        button.addEventListener("click", () => selectScene(index, true));
        $("scenes").append(button);
      });
      selectScene(0, false);
      $("content").hidden = false;
    })
    .catch(() => {
      status.textContent = "The recordings could not be loaded. Serve this folder over HTTP and reload the page.";
    });
})();
