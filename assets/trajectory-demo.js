(() => {
  "use strict";
  const root = document.querySelector("[data-trajectory-demo]");
  if (!root) return;
  const $ = (name) => root.querySelector(`[data-trajectory-${name}]`);
  const colors = ["#37c5bb", "#65aaff", "#f8b546"];
  const svgNS = "http://www.w3.org/2000/svg";
  let pairs = [], scenes = [];

  function svgElement(tag, attributes) {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function makePlayer(panel) {
    const find = (name) => panel.querySelector(`[data-trajectory-${name}]`);
    const video = find("video"), svg = find("paths"), toggle = find("toggle");
    let scene, marker, frame;
    let selected = -1, completed = false;
    const range = () => selected < 0
      ? { label: "Full path", start: 0, end: scene.duration }
      : scene.segments[selected];

    function updateMarker() {
      if (!scene || !marker) return;
      const position = Math.max(0, Math.min(1, video.currentTime / scene.control_duration)) * scene.segments.length;
      const i = Math.min(Math.floor(position), scene.segments.length - 1), t = position - i;
      const a = scene.nodes[i], b = scene.nodes[i + 1];
      // Match the backend's 3D interpolation before perspective projection.
      const depth = a.depth * (1 - t) + b.depth * t;
      marker.setAttribute("cx", (a.u * a.depth * (1 - t) + b.u * b.depth * t) / depth);
      marker.setAttribute("cy", (a.v * a.depth * (1 - t) + b.v * b.depth * t) / depth);
    }

    function updateSelection() {
      find("ranges").querySelectorAll("button").forEach((button, i) => {
        button.setAttribute("aria-pressed", String(i - 1 === selected));
      });
      svg.querySelectorAll(".trajectory-segment").forEach((group, i) => {
        group.classList.toggle("is-selected", selected < 0 || selected === i);
        group.setAttribute("aria-pressed", String(selected === i));
      });
      find("result-label").textContent = range().label;
      video.setAttribute("aria-label", `${scene.label}: ${range().label}. Click or press Space to pause or play.`);
    }

    function selectRange(index) {
      video.pause();
      selected = index;
      completed = false;
      video.loop = selected < 0;
      updateSelection();
      if (video.readyState >= 1) video.currentTime = range().start;
      window.roboCoachMedia?.sync(video);
    }

    function drawPath() {
      svg.replaceChildren();
      svg.setAttribute("viewBox", `0 0 ${scene.width} ${scene.height}`);
      scene.segments.forEach((segment, index) => {
        const a = scene.nodes[index], b = scene.nodes[index + 1];
        const group = svgElement("g", {
          class: "trajectory-segment", role: "button", tabindex: "0",
          "aria-label": `Play ${segment.label}`,
        });
        const d = `M${a.u},${a.v} L${b.u},${b.v}`;
        const vertical = Math.abs(a.u - b.u) < Math.abs(a.v - b.v);
        const label = svgElement("text", {
          x: Math.max(38, Math.min(scene.width - 38, (a.u + b.u) / 2 + (vertical ? (index === 0 ? -38 : 42) : 0))),
          y: vertical ? (a.v + b.v) / 2 + 5 : (a.v < 48 ? a.v + 30 : a.v - 20),
          class: "trajectory-direction", "text-anchor": "middle",
        });
        label.textContent = segment.label;
        group.append(svgElement("path", { d, class: "trajectory-line", stroke: colors[index] }),
          svgElement("path", { d, class: "trajectory-hit" }), label);
        group.addEventListener("click", () => selectRange(index));
        group.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectRange(index);
          }
        });
        svg.append(group);
      });
      const nodes = svgElement("g", { class: "trajectory-nodes", "aria-hidden": "true" });
      scene.nodes.forEach((point, i) => nodes.append(svgElement("circle", {
        cx: point.u, cy: point.v, r: 7,
        fill: i === 0 ? "#172d37" : colors[i - 1],
      })));
      marker = svgElement("circle", { r: 12, fill: "none", stroke: "white", "stroke-width": 4 });
      nodes.append(marker);
      svg.append(nodes);
      updateMarker();
    }

    function watch() {
      if (video.paused) return;
      updateMarker();
      if (selected >= 0 && !video.seeking && video.currentTime >= range().end) {
        completed = true;
        video.pause();
        video.currentTime = range().end;
        toggle.textContent = "Replay segment ↺";
        return;
      }
      frame = requestAnimationFrame(watch);
    }

    function togglePlayback() {
      if (!scene) return;
      if (video.paused) {
        if (completed) selectRange(selected);
        else window.roboCoachMedia?.sync(video);
      } else video.pause();
    }
    toggle.addEventListener("click", togglePlayback);
    video.addEventListener("click", togglePlayback);
    video.addEventListener("keydown", event => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        togglePlayback();
      }
    });
    video.addEventListener("loadedmetadata", () => {
      if (scene) video.currentTime = range().start;
    });
    video.addEventListener("play", () => {
      if (!scene) return;
      if (completed || video.currentTime < range().start || video.currentTime >= range().end) video.currentTime = range().start;
      completed = false;
    });
    video.addEventListener("playing", () => {
      toggle.textContent = "Pause";
      cancelAnimationFrame(frame);
      watch();
    });
    video.addEventListener("pause", () => {
      cancelAnimationFrame(frame);
      toggle.textContent = completed ? "Replay segment ↺" : "Play";
    });
    video.addEventListener("ended", () => {
      completed = true;
      toggle.textContent = "Replay segment ↺";
    });
    video.addEventListener("seeked", updateMarker);
    video.addEventListener("timeupdate", updateMarker);
    video.addEventListener("error", () => {
      $("status").textContent = "A video could not be loaded. Select another pair or reload the page.";
    });

    return {
      replay: () => selectRange(-1),
      load(next) {
        video.pause();
        cancelAnimationFrame(frame);
        scene = next;
        find("title").textContent = scene.label;
        find("ranges").replaceChildren();
        [{ label: "Full path" }, ...scene.segments].forEach((segment, i) => {
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
          button.addEventListener("click", () => selectRange(i - 1));
          find("ranges").append(button);
        });
        video.poster = scene.image;
        video.removeAttribute("src");
        video.dataset.src = scene.video;
        video.load();
        drawPath();
        selectRange(-1);
      },
    };
  }

  const players = [...root.querySelectorAll("[data-trajectory-panel]")].map(makePlayer);
  function selectPair(index) {
    const pair = pairs[index];
    $("scenes").querySelectorAll("button").forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    $("task").textContent = pair.task;
    players.forEach((player, i) => player.load(scenes.find(scene => scene.id === pair.scenes[i])));
    $("status").textContent = "Click a video to pause or play. Replay both to compare from the start.";
  }
  $("replay").addEventListener("click", () => players.forEach(player => player.replay()));

  fetch("assets/trajectory-demo/presets.json?v=axis-paths-6")
    .then(response => {
      if (!response.ok) throw new Error(`Recordings: ${response.status}`);
      return response.json();
    })
    .then(data => {
      scenes = data.scenes;
      pairs = data.pairs;
      if (!pairs.length) throw new Error("No recorded pairs available.");
      pairs.forEach((pair, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = pair.label;
        button.addEventListener("click", () => selectPair(i));
        $("scenes").append(button);
      });
      selectPair(0);
      $("content").hidden = false;
    })
    .catch(() => { $("status").textContent = "The recordings could not be loaded. Reload the page to try again."; });
})();
