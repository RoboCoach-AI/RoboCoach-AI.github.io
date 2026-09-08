"use strict";

// These are the accepted display scores. Video time is the only animation clock.
document.querySelectorAll("[data-tea-curves]").forEach((container) => {
  const video = container.closest(".tea-flow-panel").querySelector("video");
  const colors = ["#1467b8", "#0f766e", "#a45b12"];
  const labels = ["Pick tea bag", "Place tea bag", "Pour water"];
  let charts = [];
  let duration = 0;
  let pending = false;
  let callback = null;
  let pendingStageTime = null;
  const x0 = 42, x1 = 574, top = 18, bottom = 176;
  const x = (time) => x0 + time / duration * (x1 - x0);
  const y = (score) => bottom - score * (bottom - top);
  const draw = (time) => {
    charts.forEach(({ svg, clip, cursor, events, confirmations, status, legend }) => {
      const position = x(Math.min(duration, Math.max(0, time)));
      clip.setAttribute("width", String(position - x0));
      cursor.setAttribute("x1", String(position));
      cursor.setAttribute("x2", String(position));
      svg.dataset.syncTime = String(time);
      events.forEach((event) => event.setAttribute("visibility", time + 0.00001 >= Number(event.dataset.at) ? "visible" : "hidden"));
      const complete = confirmations.filter((point) => time + 0.00001 >= point.time_s).length;
      status.textContent = complete === 3 ? "All stages confirmed" : `S${complete + 1} · ${labels[complete]}`;
      legend.forEach((item, index) => {
        item.classList.toggle("is-active", index === complete);
        item.classList.toggle("is-confirmed", index < complete);
      });
    });
    container.querySelector("[data-tea-clock]").textContent = `${time.toFixed(1)} / ${duration.toFixed(1)} s`;
  };
  const cancel = () => {
    if (callback === null) return;
    cancelAnimationFrame(callback);
    callback = null;
  };
  const schedule = () => {
    if (!charts.length || video.paused || video.ended) return;
    // Sample one continuous media clock at display refresh rate. Mixing discrete
    // frame.mediaTime (5 Hz here) with currentTime makes the cursor jump backward.
    callback = requestAnimationFrame(() => { callback = null; draw(video.currentTime); schedule(); });
  };
  const refresh = () => { cancel(); if (charts.length) draw(video.currentTime); schedule(); };
  const seekWhenReady = () => {
    if (pendingStageTime === null || video.readyState < 1) return;
    video.currentTime = pendingStageTime;
    pendingStageTime = null;
    refresh();
  };
  const seekStage = (time) => {
    pendingStageTime = time;
    prepareVideo(video);
    seekWhenReady();
  };
  video.addEventListener("loadedmetadata", seekWhenReady);
  const load = async () => {
    if (pending || charts.length) return;
    pending = true;
    try {
      const response = await fetch(container.dataset.teaCurves);
      if (!response.ok) throw new Error("Curve data unavailable");
      const data = await response.json();
      duration = data.duration;
      const cards = [...container.querySelectorAll("[data-curve-source]")];
      charts = cards.map((card) => {
        const source = data.sources[card.dataset.curveSource];
        const id = `${container.closest("section").id}-${card.dataset.curveSource}-clip`;
        const grid = [0, 0.25, 0.5, 0.75, 1].map((value) => `<line x1="${x0}" x2="${x1}" y1="${y(value)}" y2="${y(value)}" stroke="${value === data.gate ? '#66716b' : '#e7ebe8'}" ${value === data.gate ? 'stroke-dasharray="5 4"' : ''}/><text x="32" y="${y(value) + 4}" text-anchor="end">${value.toFixed(value % 1 ? 2 : 1)}</text>`).join("");
        const ticks = (duration > 20 ? [0, 10, 20, 30, 40] : [0, 4, 8, 12, 16]).map((time) => `<text x="${x(time)}" y="195" text-anchor="middle">${time}</text>`).join("");
        const traces = [1, 2, 3].map((stage) => {
          const points = source.points.filter((point) => point[1] === stage).map(([time, , score]) => `${x(time)},${y(score)}`).join(" ");
          return points ? `<polyline data-stage="${stage}" points="${points}" fill="none" stroke="${colors[stage - 1]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` : "";
        }).join("");
        // Tint only elapsed time. Each input has its own confirmed boundaries;
        // an unconfirmed pickup stays in S1 for the whole failure rollout.
        const stageStarts = [0, ...source.confirmations.slice(0, 2).map((point) => point.time_s)];
        const elapsedBands = stageStarts.map((start, index) => {
          const end = source.confirmations[index]?.time_s ?? duration;
          return `<rect data-elapsed-stage="${index + 1}" x="${x(start)}" y="${top}" width="${x(end) - x(start)}" height="${bottom - top}" fill="${colors[index]}" fill-opacity="0.075"/>`;
        }).join("");
        const boundaries = source.confirmations.map((point) => `<line data-at="${point.time_s}" data-stage-boundary visibility="hidden" x1="${x(point.time_s)}" x2="${x(point.time_s)}" y1="${top}" y2="${bottom}" stroke="${colors[point.stage - 1]}" stroke-dasharray="3 4" opacity=".65"/>`).join("");
        const markers = source.confirmations.map((point) => `<circle data-at="${point.time_s}" data-confirm-time="${point.time_s}" visibility="hidden" cx="${x(point.time_s)}" cy="${y(point.completion_score)}" r="4.5" fill="white" stroke="${colors[point.stage - 1]}" stroke-width="2"/>`).join("");
        const svg = card.querySelector("svg");
        svg.innerHTML = `<defs><clipPath id="${id}"><rect data-trace-window x="${x0}" y="${top - 5}" width="0" height="${bottom - top + 10}"/></clipPath></defs><g data-elapsed-bands clip-path="url(#${id})">${elapsedBands}</g><g class="tea-chart-axis">${grid}${ticks}<text x="${x1}" y="213" text-anchor="end">Time (s)</text><text x="${x1}" y="${y(data.gate) - 7}" text-anchor="end">Threshold 0.50</text></g>${boundaries}<g clip-path="url(#${id})">${traces}</g><line data-score-cursor x1="${x0}" x2="${x0}" y1="${top}" y2="${bottom}" stroke="#88968e" opacity=".5"/>${markers}`;
        window.roboCoachCurveNavigation({
          svg,
          regions: stageStarts.map((start, index) => ({
            x: x(start), y: top, width: x(source.confirmations[index]?.time_s ?? duration) - x(start), height: bottom - top,
            start, label: `S${index + 1}: ${labels[index]}`, color: colors[index]
          })),
          onSeek: seekStage
        });
        card.querySelectorAll(".tea-chart-legend span").forEach((item, index) => {
          if (index >= stageStarts.length) return;
          item.setAttribute("role", "button");
          item.tabIndex = 0;
          item.setAttribute("aria-label", `Jump to S${index + 1}: ${labels[index]}`);
          item.addEventListener("click", () => seekStage(stageStarts[index]));
          item.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            seekStage(stageStarts[index]);
          });
        });
        return { svg, clip: svg.querySelector("[data-trace-window]"), cursor: svg.querySelector("[data-score-cursor]"), events: [...svg.querySelectorAll("[data-at]")], confirmations: source.confirmations, status: card.querySelector("[data-curve-stage]"), legend: [...card.querySelectorAll(".tea-chart-legend span")] };
      });
      container.dataset.loaded = "true";
      refresh();
    } catch (error) {
      container.querySelector("[data-tea-clock]").textContent = "Curve data unavailable";
      console.error(error);
    } finally { pending = false; }
  };
  video.addEventListener("loadstart", load);
  ["loadedmetadata", "play", "pause", "seeking", "seeked", "ended"].forEach((event) => video.addEventListener(event, refresh));
  if (video.currentSrc) load();
});
