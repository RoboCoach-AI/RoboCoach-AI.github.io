"use strict";

window.roboCoachCurveNavigation = ({ svg, regions, onSeek, shade = false }) => {
  svg.setAttribute("role", "group");
  const namespace = "http://www.w3.org/2000/svg";
  const layer = document.createElementNS(namespace, "g");
  layer.setAttribute("data-curve-navigation", "");
  layer.setAttribute("role", "group");
  layer.setAttribute("aria-label", "Jump to a stage");
  const backgrounds = document.createElementNS(namespace, "g");
  backgrounds.setAttribute("aria-hidden", "true");
  regions.forEach(({ x, y, width, height, start, label, color }) => {
    if (!(width > 0) || !Number.isFinite(start)) return;
    const hit = document.createElementNS(namespace, "rect");
    Object.entries({ x, y, width, height, role: "button", tabindex: 0, "aria-label": `Jump to ${label}`, "data-curve-seek": start, class: "curve-stage-hit" }).forEach(([key, value]) => hit.setAttribute(key, String(value)));
    hit.style.setProperty("--stage-color", color);
    const title = document.createElementNS(namespace, "title");
    title.textContent = `${label} · ${start.toFixed(1)} s`;
    hit.append(title);
    const activate = () => onSeek(start);
    hit.addEventListener("click", activate);
    hit.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate();
    });
    layer.append(hit);
    if (shade) {
      const background = document.createElementNS(namespace, "rect");
      Object.entries({ x, y: 22, width, height: 194, fill: color, "fill-opacity": 0.055 }).forEach(([key, value]) => background.setAttribute(key, String(value)));
      backgrounds.append(background);
    }
  });
  if (shade) svg.prepend(backgrounds);
  svg.append(layer);
};
