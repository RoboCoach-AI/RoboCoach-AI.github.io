(() => {
  "use strict";
  let theme = "light";

  function apply(next) {
    theme = next === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll("link[data-theme-style]").forEach(link => {
      link.media = link.dataset.themeStyle === theme ? "all" : "not all";
    });
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.content = theme;
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      const label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
      button.setAttribute("aria-label", label);
      button.title = label;
    });
    document.querySelectorAll("iframe").forEach(frame => {
      try { frame.contentWindow.RoboCoachTheme?.apply(theme); } catch {}
    });
  }

  window.RoboCoachTheme = { apply };
  apply(theme);
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      button.addEventListener("click", () => apply(theme === "light" ? "dark" : "light"));
    });
    document.querySelectorAll("iframe").forEach(frame => {
      frame.addEventListener("load", () => {
        try { frame.contentWindow.RoboCoachTheme?.apply(theme); } catch {}
      });
    });
    apply(theme);
  });
})();
