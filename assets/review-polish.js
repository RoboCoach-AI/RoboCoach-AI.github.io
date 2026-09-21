(() => {
  'use strict';
  // Deep links into folded technical explanations still open their destination.
  const revealDestination = (hash) => {
    if (!hash || !hash.startsWith('#')) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    let parent = target?.parentElement;
    while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealDestination(link.getAttribute('href'));
  }, true);
  window.addEventListener('hashchange', () => revealDestination(location.hash));
  revealDestination(location.hash);

  const chartRoot = document.querySelector('[data-coaching-chart] .coaching-chart');
  if (chartRoot) {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const node = (tag, attributes = {}, text = '') => {
      const element = document.createElementNS(svgNamespace, tag);
      Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
      if (text) element.textContent = text;
      return element;
    };
    const seriesMeta = {
      uniform: { label: 'Single VLA + Uniform', marker: 'circle' },
      targeted: { label: 'Single VLA + WM-targeted', marker: 'circle' },
      random: { label: 'Modular + Random', marker: 'square' },
      ours: { label: 'RoboCoach (ours)', marker: 'diamond' },
    };
    const panels = [
      {
        title: '(a) LIBERO-Long', x: 118, yMin: 60, yMax: 80, yTicks: [60, 65, 70, 75, 80], xTicks: [0, 100, 200, 300],
        series: { uniform: [66, 66.7, 66.2, 66.8], targeted: [66, 68, 66.6, 67.5], random: [66, 68, 69.1, 68.2], ours: [66, 69.5, 70.5, 71.2] },
      },
      {
        title: '(b) RoboTwin 2.0', x: 550, yMin: 40, yMax: 80, yTicks: [40, 50, 60, 70, 80], xTicks: [0, 100, 200, 300],
        series: { uniform: [58.5, 58.5, 57.5, 59.2], targeted: [58.5, 55, 56.5, 55], random: [58.5, 59, 56, 55], ours: [58.5, 64, 65.2, 68] },
      },
      {
        title: '(c) Franka', x: 982, yMin: 0, yMax: 100, yTicks: [0, 20, 40, 60, 80, 100], xTicks: [0, 50, 100, 150],
        series: { uniform: [13.3, 15, 20, 30], ours: [13.3, 46, 68.3, 75] },
      },
      {
        title: '(d) AgileX', x: 1414, yMin: 0, yMax: 100, yTicks: [0, 20, 40, 60, 80, 100], xTicks: [0, 50, 100, 150],
        series: { uniform: [40, 48.8, 46.2, 47.5], ours: [40, 72.5, 83.8, 83.8] },
      },
    ];
    const svg = node('svg', { class: 'coaching-chart-svg', viewBox: '0 0 1800 510', 'aria-hidden': 'true' });
    const definitions = node('defs');
    svg.append(definitions);
    const legend = node('g', { class: 'chart-legend' });
    legend.append(node('rect', { class: 'chart-legend-frame', x: 482, y: 8, width: 840, height: 82 }));
    [
      ['uniform', 500, 34], ['random', 960, 34],
      ['targeted', 500, 72], ['ours', 960, 72],
    ].forEach(([key, x, y]) => {
      legend.append(node('line', { class: `chart-series chart-series-${key}`, x1: x, x2: x + 58, y1: y, y2: y }));
      const marker = seriesMeta[key].marker;
      if (marker === 'square') legend.append(node('rect', { class: `chart-marker chart-marker-${key}`, x: x + 24, y: y - 6, width: 12, height: 12 }));
      else if (marker === 'diamond') legend.append(node('rect', { class: `chart-marker chart-marker-${key}`, x: x + 23, y: y - 7, width: 14, height: 14, transform: `rotate(45 ${x + 30} ${y})` }));
      else legend.append(node('circle', { class: `chart-marker chart-marker-${key}`, cx: x + 30, cy: y, r: 6 }));
      legend.append(node('text', { class: `chart-legend-text${key === 'ours' ? ' chart-legend-ours' : ''}`, x: x + 76, y: y + 7 }, seriesMeta[key].label));
    });
    svg.append(legend);
    svg.append(node('text', { class: 'chart-axis-label chart-y-label', x: 28, y: 282, transform: 'rotate(-90 28 282)' }, 'Success rate (%)'));
    svg.append(node('text', { class: 'chart-axis-label chart-x-label', x: 900, y: 498, 'text-anchor': 'middle' }, 'Cumulative coaching demonstrations'));

    const plotTop = 142;
    const plotBottom = 414;
    const plotHeight = plotBottom - plotTop;
    const plotWidth = 326;
    panels.forEach((panel, panelIndex) => {
      const group = node('g', { class: 'chart-panel' });
      group.append(node('text', { class: 'chart-panel-title', x: panel.x + plotWidth / 2, y: 120, 'text-anchor': 'middle' }, panel.title));
      const yPosition = value => plotBottom - ((value - panel.yMin) / (panel.yMax - panel.yMin)) * plotHeight;
      panel.yTicks.forEach(tick => {
        const y = yPosition(tick);
        group.append(node('line', { class: 'chart-grid-line', x1: panel.x, x2: panel.x + plotWidth, y1: y, y2: y }));
        group.append(node('text', { class: 'chart-tick-label', x: panel.x - 12, y: y + 6, 'text-anchor': 'end' }, String(tick)));
      });
      panel.xTicks.forEach((tick, tickIndex) => {
        const x = panel.x + (tickIndex / (panel.xTicks.length - 1)) * plotWidth;
        group.append(node('line', { class: 'chart-grid-line', x1: x, x2: x, y1: plotTop, y2: plotBottom }));
        group.append(node('text', { class: 'chart-tick-label', x, y: plotBottom + 27, 'text-anchor': 'middle' }, String(tick)));
      });
      group.append(node('path', { class: 'chart-axis-frame', d: `M${panel.x} ${plotTop}V${plotBottom}H${panel.x + plotWidth}V${plotTop}Z` }));
      Object.entries(panel.series).forEach(([key, values], seriesIndex) => {
        const points = values.map((value, pointIndex) => ({
          x: panel.x + (pointIndex / (values.length - 1)) * plotWidth,
          y: yPosition(value),
        }));
        const maskId = `chart-reveal-${panelIndex}-${key}`;
        const mask = node('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: panel.x - 10, y: plotTop - 12, width: plotWidth + 20, height: plotHeight + 24 });
        mask.append(node('rect', {
          class: 'chart-line-reveal',
          x: panel.x - 10,
          y: plotTop - 12,
          width: plotWidth + 20,
          height: plotHeight + 24,
          fill: '#fff',
          style: `--series-delay:${seriesIndex * 0.06 + panelIndex * 0.025}s`,
        }));
        definitions.append(mask);
        group.append(node('path', {
          class: `chart-line chart-series chart-series-${key}`,
          d: points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '),
          mask: `url(#${maskId})`,
        }));
        points.forEach((point, pointIndex) => {
          const common = { class: `chart-point chart-marker chart-marker-${key}`, style: `--point-delay:${0.2 + pointIndex * 0.58 + seriesIndex * 0.045}s` };
          const marker = seriesMeta[key].marker;
          if (marker === 'square') group.append(node('rect', { ...common, x: point.x - 6, y: point.y - 6, width: 12, height: 12 }));
          else if (marker === 'diamond') group.append(node('polygon', { ...common, points: `${point.x},${point.y - 9} ${point.x + 9},${point.y} ${point.x},${point.y + 9} ${point.x - 9},${point.y}` }));
          else group.append(node('circle', { ...common, cx: point.x, cy: point.y, r: 6 }));
        });
      });
      svg.append(group);
    });
    chartRoot.append(svg);
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-in-view'); observer.unobserve(entry.target); } });
  },{threshold:.25});
  document.querySelectorAll('.result-comparison, [data-coaching-chart]').forEach(card => observer.observe(card));
  const scenePicker = document.querySelector('.scene-picker');
  scenePicker?.addEventListener('click', event => {
    const button = event.target.closest('[data-pair-index]');
    if (!button) return;
    const description = button.getAttribute('aria-label') || button.textContent.trim();
    scenePicker.querySelector('[data-current-scene]').textContent = description;
  });
})();
