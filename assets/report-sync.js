"use strict";

// The video is the only clock: no independent timer or inferred playback speed.
document.querySelectorAll(".evidence").forEach((evidence) => {
  const video = evidence.querySelector("video");
  const chart = evidence.querySelector("svg.progress-chart[data-time-start]");
  if (!video || !chart) return;
  const timeStart = Number(chart.dataset.timeStart);
  const timeEnd = Number(chart.dataset.timeEnd);
  const xStart = Number(chart.dataset.xStart);
  const xEnd = Number(chart.dataset.xEnd);
  const windowRect = chart.querySelector("[data-trace-window]");
  const cursor = chart.querySelector("[data-score-cursor]");
  const markers = [...chart.querySelectorAll("[data-confirm-time]")];
  const bands = [...chart.querySelectorAll("[data-stage-band]")];
  const rows = [...evidence.querySelectorAll(".route-step")];
  const phaseLabels = [...evidence.querySelectorAll(".phase-key > span")];
  const clock = evidence.querySelector("[data-sync-clock]");
  let callback = null;
  const draw = (time) => {
    const fraction = Math.max(0, Math.min(1, (time - timeStart) / (timeEnd - timeStart)));
    const x = xStart + fraction * (xEnd - xStart);
    windowRect.setAttribute("width", String(Math.max(0, x - xStart)));
    cursor.setAttribute("x1", String(x));
    cursor.setAttribute("x2", String(x));
    chart.dataset.syncTime = String(time);
    if (clock) clock.textContent = `${time.toFixed(1)} s`;
    let confirmed = 0;
    markers.forEach((marker) => {
      const reached = time + 0.00001 >= Number(marker.dataset.confirmTime);
      marker.setAttribute("visibility", reached ? "visible" : "hidden");
      if (reached) confirmed += 1;
    });
    const failed = time + 0.00001 >= timeEnd;
    bands.forEach((band, index) => band.setAttribute("opacity", index === confirmed ? "0.42" : "0.15"));
    phaseLabels.forEach((label, index) => label.classList.toggle("is-active", index === confirmed));
    rows.forEach((row, index) => {
      const complete = index < confirmed;
      const timeout = failed && index === confirmed;
      const active = !failed && index === confirmed;
      row.classList.toggle("complete", complete);
      row.classList.toggle("timeout", timeout);
      row.classList.toggle("reached", active);
      row.classList.toggle("pending", !complete && !timeout && !active);
      const status = row.querySelector("[data-route-status]");
      const button = row.querySelector("[data-route-seek]");
      if (active) button?.setAttribute("aria-current", "step");
      else button?.removeAttribute("aria-current");
      if (status) status.textContent = button?.disabled ? "Not reached" : complete ? "RoboMeter confirmed" : timeout ? "First timeout" : active ? "Active" : failed ? "Not reached" : "Pending";
    });
  };
  const cancel = () => {
    if (callback === null) return;
    cancelAnimationFrame(callback);
    callback = null;
  };
  const schedule = () => {
    if (video.paused || video.ended) return;
    // Use only the continuous playback position; discrete frame timestamps
    // differ from currentTime, so alternating between the two causes recoil.
    callback = requestAnimationFrame(() => { callback = null; draw(video.currentTime); schedule(); });
  };
  const refresh = () => { cancel(); draw(video.currentTime); schedule(); };
  ["loadedmetadata", "play", "pause", "seeking", "seeked", "ended"].forEach((event) => video.addEventListener(event, refresh));
  let pendingSeek = null;
  const seekWhenReady = () => {
    if (pendingSeek === null || video.readyState < 1) return;
    video.currentTime = pendingSeek;
    pendingSeek = null;
    refresh();
  };
  video.addEventListener("loadedmetadata", seekWhenReady);
  rows.forEach((row) => {
    const button = row.querySelector("[data-route-seek]");
    button?.addEventListener("click", () => {
      if (button.disabled) return;
      pendingSeek = Number(button.dataset.routeSeek);
      prepareVideo(video);
      seekWhenReady();
      if (window.matchMedia("(max-width: 820px)").matches) {
        video.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
  window.roboCoachCurveNavigation({
    svg: chart,
    regions: bands.map((band, index) => {
      const button = rows[index].querySelector("[data-route-seek]");
      return { x: Number(band.getAttribute("x")), y: 2, width: Number(band.getAttribute("width")), height: 209, start: button.disabled ? NaN : Number(button.dataset.routeSeek), label: `P${index + 1}: ${rows[index].querySelector("strong").textContent}`, color: chart.querySelectorAll("[data-score-traces] polyline")[index]?.getAttribute("stroke") ?? "#0f766e" };
    }),
    onSeek: (time) => {
      pendingSeek = time;
      prepareVideo(video);
      seekWhenReady();
    }
  });
  refresh();
});
