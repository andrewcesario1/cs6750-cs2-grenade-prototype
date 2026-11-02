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
  let throwTimer;
  let transitionTimer;
  const stage = $('stage');
  const announce = (message, detail = '') => {
    $('status').textContent = [message, detail].filter(Boolean).join('. ');
  };
  const selectedDesign = () => {
    const value = new URLSearchParams(location.search).get('design');
    return ['a', 'b', 'c'].includes(value) ? value : 'a';
  };

  function render(animateScene = true) {
    const throwing = state.phase === 'throwing';
    const sceneState = throwing || state.selected === 'smoke' ? 'smoke' : state.smoke ? 'rifle' : 'used';
    const [src, alt] = views[sceneState];
    if ($('scene').getAttribute('src') !== src) {
      clearTimeout(transitionTimer);
      const previous = $('previous-scene');
      previous.src = $('scene').src;
      previous.classList.remove('fade-away');
      previous.hidden = !animateScene || !sceneReady;
      if (!previous.hidden) previous.getBoundingClientRect();
      sceneReady = false;
      $('scene').src = src;
    }
    $('scene').alt = alt;
    stage.dataset.selected = state.selected;
    stage.dataset.state = throwing ? 'throwing' : sceneState;
    stage.dataset.design = state.design;
    document.title = `CS2 · Prototype ${state.design.toUpperCase()}`;
    document.querySelectorAll('[data-design]').forEach(link => {
      if (link.dataset.design === state.design) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('rifle').setAttribute('aria-pressed', String(state.selected === 'rifle'));
    $('smoke').setAttribute('aria-pressed', String(state.selected === 'smoke'));
    $('smoke').disabled = state.smoke === 0 || throwing;
    $('rifle').disabled = throwing;
    $('smoke-count').textContent = state.smoke;
    $('equipment-state').textContent = throwing ? 'Throwing smoke' : state.selected === 'smoke' ? 'Smoke equipped' : 'Rifle equipped';
    $('throw').hidden = state.selected !== 'smoke' || throwing || !state.smoke || hold4 || selectorPointer;
    const sceneLabel = throwing ? 'Scene: throwing smoke…' : sceneState === 'used' ? 'Scene: smoke thrown' : sceneState === 'smoke' ? 'Scene: smoke selected' : 'Scene: rifle held';
    if ($('scene-status').textContent !== sceneLabel) $('scene-status').textContent = sceneLabel;
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
    footer.innerHTML = throwing ? 'Throwing smoke…' : state.smoke === 0 ? 'Smoke thrown · None left' : state.selected === 'smoke' ? 'Click to throw · <kbd>1</kbd> to keep' : 'Hold <kbd>4</kbd> to select';
  }

  function clearHeld() {
    const wasSelecting = hold4 || selectorPointer;
    hold4 = false; helpKey = false; helpPointer = false; selectorPointer = false;
    render();
    if (wasSelecting) announce('Selection cancelled', state.selected === 'smoke' ? 'Smoke still equipped' : 'Rifle still equipped');
  }
  function reset(design = state?.design || selectedDesign()) {
    const firstLoad = !state;
    clearTimeout(throwTimer); clearTimeout(transitionTimer);
    $('previous-scene').hidden = true;
    state = { design, selected: 'rifle', smoke: 1, dismissed: false, phase: 'idle' };
    hold4 = false; helpKey = false; helpPointer = false; selectorPointer = false;
    render(false);
    if (!firstLoad) announce('Scene reset', 'Rifle equipped · 1 smoke available');
  }
  function equipSmoke() {
    if (!state.smoke || state.phase === 'throwing') return;
    state.selected = 'smoke'; hold4 = false; selectorPointer = false;
    render(); announce('Smoke equipped', 'Click to throw · Press 1 to keep it', 0);
  }
  function equipRifle() {
    if (state.phase === 'throwing') return;
    state.selected = 'rifle'; hold4 = false; selectorPointer = false;
    render(); announce('Rifle equipped', state.smoke ? 'Smoke kept · 1 available' : 'No smoke remaining');
  }
  function dismiss() {
    if (state.design !== 'b' || !state.smoke || state.phase === 'throwing') return;
    if (state.dismissed) return;
    state.dismissed = true; render(); announce('Prompt dismissed', 'Your equipment is unchanged');
  }
  function throwSmoke() {
    if (!sceneReady || !state.smoke || state.phase === 'throwing' || state.selected !== 'smoke' || hold4 || selectorPointer) return;
    state.smoke = 0; state.phase = 'throwing';
    helpKey = false; helpPointer = false;
    render(); announce('Throwing smoke…', 'Smoke released · 0 remaining', 0);
    throwTimer = setTimeout(() => {
      state.phase = 'idle'; state.selected = 'rifle';
      render(); announce('Smoke thrown', '1 → 0 smoke · Rifle re-equipped', 4500);
    }, 900);
  }

  $('scene').addEventListener('load', () => {
    sceneReady = true; $('image-error').hidden = true;
    $('previous-scene').classList.add('fade-away');
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => { $('previous-scene').hidden = true; }, 420);
  });
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
  $('smoke').addEventListener('click', () => {
    selectorPointer = !selectorPointer; hold4 = false; render();
    if (selectorPointer) announce('Choose a grenade', 'Choose Smoke below · Esc to cancel', 0);
    else announce('Selection cancelled', state.selected === 'smoke' ? 'Smoke still equipped' : 'Rifle still equipped');
  });
  $('choose-smoke').addEventListener('click', equipSmoke);
  $('cancel').addEventListener('click', () => { clearHeld(); announce('Selection cancelled', state.selected === 'smoke' ? 'Smoke still equipped' : 'Rifle still equipped'); });
  $('throw').addEventListener('click', throwSmoke);
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
      if (state.phase === 'throwing') return;
      hold4 = true; selectorPointer = false; render();
      announce(state.smoke ? 'Choose a grenade' : 'No grenades left', state.smoke ? 'Release 4 to equip smoke · Esc to cancel' : 'Reset to try again', 0);
    } else if (event.code === 'Digit1') {
      event.preventDefault(); equipRifle();
    } else if (event.code === 'Escape') {
      const wasSelecting = hold4 || selectorPointer;
      clearHeld();
      if (wasSelecting) announce('Selection cancelled', state.selected === 'smoke' ? 'Smoke still equipped' : 'Rifle still equipped');
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
      if (state.smoke) equipSmoke(); else { render(); announce('No grenades left', 'Reset to try again'); }
    }
    if (event.code === 'KeyV') { helpKey = false; render(); }
  });
  window.addEventListener('blur', clearHeld);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearHeld(); });
  reset();
  sceneReady = $('scene').complete && $('scene').naturalWidth > 0;
  if ($('scene').complete && !$('scene').naturalWidth) $('image-error').hidden = false;
})();
