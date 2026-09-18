(() => {
  'use strict';
  const linked = [...document.querySelectorAll('[data-task-link]')];
  let hovered = null;
  let focused = null;
  const draw = () => {
    const task = hovered || focused;
    linked.forEach(node => node.classList.toggle('is-linked', !!task && node.dataset.taskLink === task));
  };
  linked.forEach(node => {
    node.addEventListener('pointerenter', () => { hovered = node.dataset.taskLink; draw(); });
    node.addEventListener('pointerleave', () => { hovered = null; draw(); });
    node.addEventListener('focusin', () => { focused = node.dataset.taskLink; draw(); });
    node.addEventListener('focusout', event => { if (!node.contains(event.relatedTarget)) { focused = null; draw(); } });
  });
})();
