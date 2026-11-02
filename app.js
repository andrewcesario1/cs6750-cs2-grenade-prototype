(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const views = {
    rifle: ['assets/survey-route.jpg', 'Dust II Long A, rifle equipped, with an exposed route ahead.'],
    smoke: ['assets/survey-smoke-selected.jpg', 'Dust II Long A, smoke grenade equipped.'],
    used: ['assets/survey-smoke-cloud.jpg', 'Dust II Long A, rifle equipped after using the smoke. A fixed example smoke cloud is visible.']
  };
  Object.values(views).forEach(([src]) => { const image = new Image(); image.src = src; });
  let state;
  let hold4 = false;
  let helpKey = false;
  let helpPointer = false;
  let selectorPointer = false;
  let sceneReady = false;
  const stage = $('stage');
  const announce = message => { $('status').textContent = message; };
  const selectedDesign = () => {
    const value = new URLSearchParams(location.search).get('design');
    return ['a', 'b', 'c'].includes(value) ? value : 'a';
  };

  function render() {
    const sceneState = state.selected === 'smoke' ? 'smoke' : state.smoke ? 'rifle' : 'used';
    const [src, alt] = views[sceneState];
    if ($('scene').getAttribute('src') !== src) {
      sceneReady = false;
      $('scene').src = src;
    }
    $('scene').alt = alt;
    stage.dataset.selected = state.selected;
    stage.dataset.state = sceneState;
    stage.dataset.design = state.design;
    document.title = `CS2 · Prototype ${state.design.toUpperCase()}`;
    document.querySelectorAll('[data-design]').forEach(link => {
      if (link.dataset.design === state.design) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('rifle').setAttribute('aria-pressed', String(state.selected === 'rifle'));
    $('smoke').setAttribute('aria-pressed', String(state.selected === 'smoke'));
    $('smoke').disabled = state.smoke === 0;
    $('smoke-count').textContent = state.smoke;
    $('equipment-state').textContent = state.selected === 'smoke' ? 'Smoke equipped' : 'Rifle equipped';
    $('prompt').hidden = !(state.design === 'b' && state.smoke && !state.dismissed);
    $('help-hint').hidden = !(state.design === 'c' && state.smoke);
    $('help').hidden = !(state.design === 'c' && state.smoke && (helpKey || helpPointer));
    $('help-hint').setAttribute('aria-expanded', String(!$('help').hidden));
    $('selector').hidden = !(hold4 || selectorPointer);
    $('choose-smoke').hidden = state.smoke === 0;
    $('selector-empty').hidden = state.smoke !== 0;
    $('selector-count').textContent = state.smoke;
    const footer = $('inventory-footer');
    footer.classList.toggle('used', state.smoke === 0);
    footer.innerHTML = state.smoke === 0 ? 'Smoke used' : state.selected === 'smoke' ? 'Click scene to throw · <kbd>1</kbd> Rifle' : 'Hold <kbd>4</kbd> to select';
  }

  function clearHeld() {
    hold4 = false; helpKey = false; helpPointer = false; selectorPointer = false;
    render();
  }
  function reset(design = state?.design || selectedDesign()) {
    state = { design, selected: 'rifle', smoke: 1, dismissed: false };
    hold4 = false; helpKey = false; helpPointer = false; selectorPointer = false;
    render();
    announce(`Prototype ${design.toUpperCase()} reset. Rifle equipped. One smoke available.`);
  }
  function equipSmoke() {
    if (!state.smoke) return;
    state.selected = 'smoke'; hold4 = false; selectorPointer = false;
    render(); announce('Smoke equipped.');
  }
  function equipRifle() {
    state.selected = 'rifle'; hold4 = false; selectorPointer = false;
    render(); announce('Rifle equipped.');
  }
  function dismiss() {
    if (state.design !== 'b') return;
    state.dismissed = true; render(); announce('Prompt dismissed.');
  }
  function throwSmoke() {
    if (!sceneReady || !state.smoke || state.selected !== 'smoke' || hold4 || selectorPointer) return;
    state.smoke = 0; state.selected = 'rifle';
    helpKey = false; helpPointer = false;
    render(); announce('Smoke used. Rifle equipped.');
  }

  $('scene').addEventListener('load', () => { sceneReady = true; $('image-error').hidden = true; });
  $('scene').addEventListener('error', () => { sceneReady = false; $('image-error').hidden = false; });
  $('reset').addEventListener('click', () => { reset(); stage.focus({ preventScroll: true }); });
  document.querySelectorAll('[data-design]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(location.href); url.searchParams.set('design', link.dataset.design);
    history.pushState({}, '', url);
    reset(link.dataset.design); stage.focus({ preventScroll: true });
  }));
  window.addEventListener('popstate', () => reset(selectedDesign()));
  $('rifle').addEventListener('click', equipRifle);
  $('smoke').addEventListener('click', () => { selectorPointer = !selectorPointer; hold4 = false; render(); });
  $('choose-smoke').addEventListener('click', equipSmoke);
  $('cancel').addEventListener('click', clearHeld);
  $('dismiss').addEventListener('click', dismiss);
  $('help-hint').addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    helpPointer = true; $('help-hint').setPointerCapture(event.pointerId); render();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => $('help-hint').addEventListener(type, () => { helpPointer = false; render(); }));
  stage.addEventListener('click', event => {
    if (event.target !== stage && event.target !== $('scene')) return;
    stage.focus({ preventScroll: true }); throwSmoke();
  });
  stage.addEventListener('contextmenu', event => event.preventDefault());
  stage.addEventListener('wheel', event => {
    if (!hold4 && !selectorPointer) return;
    event.preventDefault();
    // This scenario carries one grenade. Scrolling retains its only available choice.
  }, { passive: false });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (event.code === 'Digit4') {
      event.preventDefault(); if (event.repeat) return;
      hold4 = true; selectorPointer = false; render();
    } else if (event.code === 'Digit1') {
      event.preventDefault(); equipRifle();
    } else if (event.code === 'Escape') {
      clearHeld();
    } else if (event.code === 'KeyV') {
      if (state.design === 'a') return;
      event.preventDefault();
      if (state.design === 'b') dismiss();
      else { helpKey = true; render(); }
    }
  });
  document.addEventListener('keyup', event => {
    if (event.code === 'Digit4' && hold4) {
      hold4 = false;
      if (state.smoke) equipSmoke(); else render();
    }
    if (event.code === 'KeyV') { helpKey = false; render(); }
  });
  window.addEventListener('blur', clearHeld);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearHeld(); });
  reset();
  sceneReady = $('scene').complete && $('scene').naturalWidth > 0;
  if ($('scene').complete && !$('scene').naturalWidth) $('image-error').hidden = false;
})();
