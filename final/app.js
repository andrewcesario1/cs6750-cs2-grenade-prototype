(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const views = {
    rifle: ['assets/survey-route.jpg', 'Dust II Long A with rifle held.'],
    smoke: ['assets/survey-smoke-selected.jpg', 'Dust II Long A with smoke held.'],
    used: ['assets/survey-smoke-cloud.jpg', 'Fixed example after throwing; rifle held and smoke cloud visible.']
  };
  Object.values(views).forEach(([src]) => { const img = new Image(); img.src = src; });
  let selected = 'rifle', count = 1, phase = 'idle', enabled = true;
  let selecting = false, held4 = false;
  let aim = { x: .34, y: .55 }, ready = false, throwTimer, fadeTimer;
  const announce = text => { $('status').textContent = text; };
  const sceneName = () => phase === 'throwing' || selected === 'smoke' ? 'smoke' : count ? 'rifle' : 'used';
  function cue() {
    const available = enabled && count > 0 && phase === 'idle' && ready;
    // This authored region demonstrates contextual help, not live tactical detection.
    const relevant = available && aim.x >= .48 && aim.x <= .65 && aim.y >= .42 && aim.y <= .64;
    $('smoke').classList.toggle('context-cue', relevant);
    $('smoke').setAttribute('aria-description', relevant ? 'Smoke may be relevant to this sightline.' : '');
    stage.dataset.cue = relevant ? 'on' : 'off';
    $('quick-off').hidden = !relevant;
    $('aim').style.left = `${aim.x * 100}%`;
    $('aim').style.top = `${aim.y * 100}%`;
    $('aim').hidden = phase === 'throwing' || selecting;
  }
  function render(animate = true) {
    const name = sceneName(), [src, alt] = views[name];
    if ($('scene').getAttribute('src') !== src) {
      clearTimeout(fadeTimer);
      const previous = $('previous-scene');
      previous.src = $('scene').src;
      previous.classList.remove('fade-away');
      previous.hidden = !animate || !ready;
      // Flush the initial opacity before starting the crossfade on image load.
      if (!previous.hidden) previous.getBoundingClientRect();
      ready = false; $('scene').src = src;
    }
    $('scene').alt = alt;
    stage.dataset.state = phase === 'throwing' ? 'throwing' : name;
    stage.dataset.selected = selected;
    $('rifle').setAttribute('aria-pressed', String(selected === 'rifle'));
    $('smoke').setAttribute('aria-pressed', String(selected === 'smoke'));
    $('rifle').disabled = phase === 'throwing';
    $('smoke').disabled = !count || phase === 'throwing';
    $('smoke-count').textContent = count;
    $('selector-count').textContent = count;
    $('equipment-state').textContent = phase === 'throwing' ? 'Throwing smoke' : selected === 'smoke' ? 'Smoke equipped' : 'Rifle equipped';
    $('selector').hidden = !selecting;
    $('choose-smoke').hidden = !count;
    $('selector-empty').hidden = !!count;
    $('throw').hidden = selected !== 'smoke' || !count || selecting || phase === 'throwing';
    $('inventory-footer').innerHTML = phase === 'throwing' ? 'Throwing smoke…' : !count ? 'Smoke thrown · None left' : selected === 'smoke' ? 'Click to throw · <kbd>1</kbd> to keep' : 'Hold <kbd>4</kbd> to select';
    const label = phase === 'throwing' ? 'Scene: throwing smoke…' : name === 'used' ? 'Scene: smoke thrown' : name === 'smoke' ? 'Scene: smoke selected' : 'Scene: rifle held';
    if ($('scene-status').textContent !== label) $('scene-status').textContent = label;
    cue();
  }
  function clearHeld() { selecting = held4 = false; render(); }
  function reset() {
    clearTimeout(throwTimer); clearTimeout(fadeTimer);
    selected = 'rifle'; count = 1; phase = 'idle'; aim = {x:.34,y:.55};
    selecting = held4 = false;
    $('previous-scene').hidden = true; render(false);
    announce('Scene reset. Rifle held and one smoke available.');
  }
  function equip(item) {
    if (phase === 'throwing' || (item === 'smoke' && !count)) return;
    selected = item; selecting = held4 = false; render(); announce(`${item} equipped`);
  }
  function throwSmoke() {
    if (!ready || !count || selected !== 'smoke' || selecting || phase === 'throwing') return;
    count = 0; phase = 'throwing'; render();
    throwTimer = setTimeout(() => { phase = 'idle'; selected = 'rifle'; render(); announce('Smoke thrown. None left. Rifle equipped.'); }, 900);
  }
  $('scene').addEventListener('load', () => {
    ready = true; $('image-error').hidden = true;
    $('previous-scene').classList.add('fade-away');
    clearTimeout(fadeTimer); fadeTimer = setTimeout(() => { $('previous-scene').hidden = true; },420);
    cue();
  });
  $('scene').addEventListener('error', () => { ready = false; $('image-error').hidden = false; cue(); });
  function setAssistance(value) { enabled=value; $('assistance').value=value?'on':'off'; render(); announce(value?'Assistance on':'Assistance off'); }
  function openSettings() { if(!$('settings').open) $('settings').showModal(); }
  $('settings-open').addEventListener('click', openSettings);
  $('settings-close').addEventListener('click', () => { $('settings').close(); stage.focus(); });
  $('assistance').addEventListener('change', e => setAssistance(e.target.value==='on'));
  $('reset').addEventListener('click', () => { reset(); stage.focus({preventScroll:true}); });
  $('rifle').addEventListener('click', () => equip('rifle'));
  $('smoke').addEventListener('click', () => { selecting = !selecting; held4 = false; render(); });
  $('choose-smoke').addEventListener('click', () => equip('smoke'));
  
  $('throw').addEventListener('click', throwSmoke);
  stage.addEventListener('pointermove', event => {
    if (event.target !== stage && event.target !== $('scene')) return;
    const box = stage.getBoundingClientRect();
    aim = {x:Math.max(0,Math.min(1,(event.clientX-box.x)/box.width)),y:Math.max(0,Math.min(1,(event.clientY-box.y)/box.height))}; cue();
  });
  stage.addEventListener('click', event => { if(event.target !== stage && event.target !== $('scene')) return; stage.focus({preventScroll:true}); throwSmoke(); });
  stage.addEventListener('wheel', event => { if(selecting) event.preventDefault(); }, {passive:false});
  document.addEventListener('keydown', event => {
    if(event.code==='Escape') { if(!$('settings').open) { event.preventDefault(); openSettings(); } return; }
    if($('settings').open) return;
    if(event.code==='KeyK' && !event.ctrlKey && !event.metaKey && !event.altKey) { setAssistance(false); return; }
    if(event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if(event.code.startsWith('Arrow') && (event.target === stage || event.target === document.body)) {
      event.preventDefault();
      aim.x = Math.max(.01,Math.min(.99,aim.x+(event.code==='ArrowRight'?.025:event.code==='ArrowLeft'?-.025:0)));
      aim.y = Math.max(.01,Math.min(.99,aim.y+(event.code==='ArrowDown'?.025:event.code==='ArrowUp'?-.025:0))); cue();
    } else if(event.code==='Digit4') {
      event.preventDefault(); if(event.repeat || phase==='throwing') return; selecting = held4 = true; render();
    } else if(event.code==='Digit1') { event.preventDefault(); equip('rifle'); }
    
  });
  document.addEventListener('keyup', event => {
    if(event.code==='Digit4' && held4) { held4 = selecting = false; if(count) equip('smoke'); else render(); }
  });
  window.addEventListener('blur', clearHeld);
  document.addEventListener('visibilitychange', () => { if(document.hidden) clearHeld(); });
  reset(); ready = $('scene').complete && $('scene').naturalWidth>0; cue();
  if($('scene').complete && !ready) $('image-error').hidden = false;
})();
